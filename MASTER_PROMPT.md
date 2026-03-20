# GeoNav Morelos - Master Prompt & Documentación del Sistema

Este documento contiene la consolidación de toda la lógica, reglas de negocio, arquitectura y decisiones técnicas del proyecto **GeoNav Morelos**. Su objetivo es servir como "Master Prompt" para cualquier IA o desarrollador que trabaje en el proyecto en el futuro, garantizando consistencia y evitando la acumulación de deuda técnica.

---

## 1. Visión General del Producto
**GeoNav Morelos** es una plataforma web para la gestión territorial y asignación de tareas de campo. Permite a coordinadores (administradores) visualizar cartografía electoral (secciones y manzanas), asignar zonas de trabajo a promotores, y permite a los promotores ver sus asignaciones en un mapa interactivo.

---

## 2. Arquitectura Base
*   **Frontend:** React 18+ (Vite), TypeScript, Tailwind CSS.
*   **Mapas:** Leaflet (`react-leaflet`) para renderizado de GeoJSON.
*   **Backend / Base de Datos:** Supabase (PostgreSQL con extensión PostGIS).
*   **Autenticación:** Supabase Auth (Email/Password).
*   **Seguridad:** Row Level Security (RLS) en PostgreSQL.

---

## 3. Modelo de Datos (Esquema Principal)

### `usuarios_perfil`
Tabla que extiende la información de `auth.users`.
*   `id` (UUID): FK a `auth.users.id`.
*   `nombre` (String): Nombre del usuario.
*   `rol` (String): `'admin'` o `'field_worker'`.
*   `email` (String): Correo electrónico.

### `poligonos_geojson`
Tabla espacial que almacena la cartografía.
*   `id` (Integer): Identificador único.
*   `tipo` (String): `'Sección'`, `'Manzana'`, `'Manzana Completa'`.
*   `metadata` (JSONB): Propiedades electorales (`seccion`, `manzana`, `localidad`, `promotor`, etc.).
*   `geom` (Geometry/JSONB): Coordenadas del polígono.

### `tareas`
Tabla transaccional que vincula usuarios con polígonos.
*   `id` (UUID): Identificador único.
*   `user_id` (UUID): FK a `usuarios_perfil.id`.
*   `polygon_id` (Integer): FK a `poligonos_geojson.id`.
*   `status` (String): `'pendiente'`, `'en_progreso'`, `'completada'`.
*   `instruccion` (Text): Descripción del trabajo.
*   `created_at` (TimestampTZ): Fecha de asignación (automática).
*   `updated_at` (TimestampTZ): Fecha de última modificación (vía Trigger).

### `notificaciones` [REFORZADO]
Tabla para alertas en tiempo real.
*   `user_id` (UUID): Destinatario de la alerta.
*   `titulo` / `mensaje` (Text): Contenido de la notificación.
*   `tipo` (String): `'task_assigned'`, `'status_changed'`, `'new_comment'`.
*   `leida` (Boolean): Estado de lectura.
*   `metadata` (JSONB): Datos extra (ID de tarea, nuevos estados, ID del actor, etc.).

### `tarea_historial` [NUEVO]
Tabla que registra el rastro de auditoría y avances de cada tarea.
*   `id` (UUID): Identificador único.
*   `tarea_id` (UUID): FK a `tareas.id`.
*   `user_id` (UUID): FK a `usuarios_perfil.id` (quien realiza la acción).
*   `mensaje` (Text): Contenido del avance o descripción del cambio.
*   `estado_snapshot` (String): Estado de la tarea al momento del registro.
*   `tipo` (String): `'avance'`, `'cambio_estado'`, `'sistema'`.
*   `created_at` (TimestampTZ): Fecha del registro.

---

## 4. Reglas de Negocio y Lógica del Sistema

### 4.1. Autenticación y Roles
*   **Regla 1:** Todo usuario debe tener un registro en `usuarios_perfil` vinculado a su `auth.uid()`.
*   **Regla 2 (Deuda Técnica Actual):** Los roles de administrador se están asignando parcialmente en el frontend (`adminEmails` en `Dashboard.tsx` y `authService.ts`). **Solución Futura:** Migrar a *Custom JWT Claims* o gestionar los roles exclusivamente vía base de datos y Triggers.
*   **Regla 3:** La seguridad real reside en las políticas RLS de Supabase, no en el ocultamiento de componentes en React.

### 4.2. Gestión de Tareas (Admin)
*   **Regla 4:** Solo los usuarios con rol `'admin'` pueden crear, editar, eliminar o listar todas las tareas.
*   **Regla 5:** Al asignar una tarea, el polígono cambia su estado visual en el mapa para todos los usuarios (se marca en rojo).
*   **Regla 14 [NUEVA]:** Los administradores pueden agregar seguimientos ("avances") directamente desde la barra lateral del mapa (`PolygonSidebar.tsx`), permitiendo una supervisión activa sin cambiar de vista.

### 4.3. Visualización de Mapas (Field Worker)
*   **Regla 6:** Un `field_worker` solo puede ver en el mapa los polígonos que le han sido asignados (resaltados en rojo). Los demás polígonos mantienen su color base (transparente, ámbar o púrpura).
*   **Regla 7 (Optimización Implementada):** Para evitar cuellos de botella en el renderizado de Leaflet, los polígonos se agrupan en objetos `FeatureCollection` en lugar de renderizar cientos de componentes `<GeoJSON>` individuales.

### 4.4. Búsqueda Espacial
*   **Regla 8:** El buscador permite buscar por "Sección" (ej. `188`) o por "Sección-Manzana" (ej. `188-5`).
*   **Regla 9:** Al encontrar un polígono, el mapa realiza un *flyToBounds* (acercamiento animado) y selecciona el polígono automáticamente.

### 4.5. Sistema de Notificaciones (Real-time) [REFORZADO]
*   **Regla 10 (Centralización):** Las notificaciones para administradores se disparan vía Triggers en la tabla `tarea_historial`. Esto asegura que tanto un cambio de estado como un simple comentario ("avance") generen una alerta.
*   **Regla 11:** Los trabajadores reciben una alerta automática cuando se les inserta una nueva tarea en la tabla `tareas` (evento `AFTER INSERT`).
*   **Regla 12 (Bidireccional):** El sistema usa el disparador `notify_parties_on_history_entry` (v6) para alertar tanto a admins como a trabajadores asignados.
*   **Regla 13:** El frontend usa `NotificationProvider` con canales únicos por usuario (`notifications-${userId}`) para garantizar que cada usuario reciba solo sus alertas de forma eficiente.
*   **Regla 15 [NUEVA]:** Los datos de tareas deben transformarse siempre mediante `taskService.mapTareas` para asegurar la paridad entre `user_id` y `usuario_id`, evitando errores de visualización.

---

## 5. Deuda Técnica Identificada (Roadmap)

Cualquier desarrollo futuro debe priorizar la resolución de estos puntos antes de agregar nuevas funcionalidades complejas:

1.  **Carga Espacial Masiva:** `poligonosService.getPoligonos()` descarga toda la tabla. **Solución:** Implementar carga por *Bounding Box* enviando los límites del mapa a Supabase y filtrando con `ST_Intersects`.
2.  **Estado Global:** El estado de la aplicación (`usuarios`, `poligonos`, `tareas`) se maneja localmente en los componentes, causando *prop drilling* y recargas innecesarias. **Solución:** Implementar `React Query` para caché de servidor o `Zustand` para estado global.
3.  **Manejo de Errores Silenciosos:** Las políticas RLS pueden devolver arreglos vacíos `[]` en lugar de errores si un usuario no tiene permisos.
4.  **Hardcoding de Administradores:** Eliminar el arreglo `adminEmails` del código fuente (Prioridad Alta).

---

## 6. Instrucciones para la IA (System Prompt)

Cuando actúes como asistente de código en este proyecto, DEBES:
1.  **Leer este documento (`MASTER_PROMPT.md`)** antes de proponer cambios arquitectónicos.
2.  **No proponer parches rápidos (Quick Fixes):** Si un error se debe a una falla estructural (ej. RLS, carga masiva), debes proponer la solución estructural.
3.  **Mantener el tipado estricto:** Usa las interfaces definidas en `src/types.ts`. No uses `any` a menos que sea estrictamente necesario (ej. respuestas crudas de APIs de terceros).
4.  **Optimizar Leaflet:** Nunca uses `.map()` para iterar componentes `<GeoJSON>`. Usa siempre `FeatureCollection`.
