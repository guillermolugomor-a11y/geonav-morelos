# Arquitectura y Lógica del Sistema - I.E.S.M.

## 1. Descripción General del Sistema
I.E.S.M. es una aplicación web (Single Page Application) diseñada para la gestión, asignación y visualización de tareas en campo basadas en polígonos geográficos (Secciones, Manzanas, Localidades). Permite a los administradores asignar zonas de trabajo a operativos, y a estos últimos visualizar sus áreas asignadas en un mapa interactivo.

## 2. Arquitectura Tecnológica
*   **Frontend:** React 18+ con Vite.
*   **Lenguaje:** TypeScript (estrictamente tipado).
*   **Estilos:** Tailwind CSS.
*   **Mapas:** Leaflet (`react-leaflet`) para renderizado geoespacial.
*   **Backend as a Service (BaaS):** Supabase (PostgreSQL, Auth, RLS).
*   **Animaciones:** `motion/react` (Framer Motion).
*   **Iconos:** `lucide-react`.
*   **Componentes Compartidos:** `NotificationIndicator` para alertas estandarizadas.

## 3. Modelo de Datos (Base de Datos)

El sistema opera principalmente con tres entidades:

1.  **`usuarios_perfil`**: Almacena los metadatos de los usuarios registrados.
    *   `id` (UUID): Llave primaria, vinculada a `auth.users`.
    *   `nombre` (String): Nombre completo del usuario.
    *   `rol` (Enum): `admin` o `field_worker`.
    *   `email` (String): Correo electrónico.
    *   `last_login` (Timestamp): Última conexión registrada (Sync vía Auth Trigger).
    *   `created_at` (Timestamp).

2.  **`poligonos_geojson`**: Almacena la cartografía.
    *   `id` (Integer): Llave primaria.
    *   `nombre` (String): Nombre descriptivo.
    *   `municipio` (String): Municipio al que pertenece.
    *   `tipo` (String): 'Sección', 'Manzana' o 'Manzana Completa'.
    *   `metadata` (JSONB): Datos electorales (sección, distrito, promotor, etc.).
    *   `geom` (JSONB / Geometry): Coordenadas del polígono en formato GeoJSON.

3.  **`tareas`**: Relaciona usuarios con polígonos y define el trabajo a realizar.
    *   `id` (UUID): Llave primaria.
    *   `user_id` (UUID): Llave foránea a `usuarios_perfil.id`.
    *   `polygon_id` (Integer): Llave foránea a `poligonos_geojson.id`.
    *   `tipo_capa` (String): Tipo de capa asignada.
    *   `instruccion` (Text): Descripción de la tarea.
    *   `status` (Enum): `pendiente`, `en_progreso`, `completada`.
    *   `created_at` (TimestampTZ): Generada automáticamente al crear.
    *   `updated_at` (TimestampTZ): Actualizada vía trigger en cada UPDATE.
    *   `fecha_limite` (TimestampTZ, opcional).
    *   `comentarios_usuario` (Text, opcional).

4.  **`notificaciones` [REFORZADO]**: Sistema de alertas en tiempo real.
    *   `id` (UUID): Llave primaria.
    *   `user_id` (UUID): Destinatario.
    *   `titulo` / `mensaje` (Text): Contenido legible.
    *   `tipo` (String): `task_assigned`, `status_changed` o `new_comment`.
    *   `leida` (Boolean): Estado de la notificación.
    *   `metadata` (JSONB): Referencias a la tarea, ID del actor y estados.

5.  **`tarea_historial` [NUEVO]**: Registro detallado de cada acción sobre una tarea.
    *   `id` (UUID): Llave primaria.
    *   `tarea_id` (UUID): FK a `tareas.id`.
    *   `user_id` (UUID): FK a `usuarios_perfil.id`.
    *   `mensaje` (Text): Descripción del avance o cambio.
    *   `tipo` (String): `avance`, `cambio_estado` o `sistema`.
    *   `estado_snapshot` (String): Estado en ese momento.

## 4. Flujo de Autenticación y Permisos

1.  **Login:** El usuario se autentica usando Supabase Auth (Email/Password).
2.  **Sincronización de Perfil:** Al iniciar sesión, se consulta la tabla `usuarios_perfil` para obtener el `rol` del usuario.
3.  **Autorización (Frontend):** 
    *   Si el rol es `admin`, se muestra el panel de administración (`AdminPanel`) y se permite ver todas las tareas en el mapa.
    *   Si el rol es `field_worker`, solo se muestra el mapa y las tareas asignadas a su `user_id`.
4.  **Autorización (Backend - RLS):** 
    *   *Regla de Oro:* El frontend **nunca** es la fuente de verdad para la seguridad.
    *   Supabase Row Level Security (RLS) debe estar configurado para que la tabla `tareas` solo devuelva registros si `auth.uid() == user_id` O si el usuario tiene rol `admin` en `usuarios_perfil`.

## 5. Lógica de Negocio y Reglas del Sistema

*   **Asignación de Tareas:** Solo los administradores pueden crear, editar o eliminar tareas.
*   **Visualización en Mapa:**
    *   Los polígonos asignados (con tareas no completadas) se resaltan en color **rojo**.
    *   Los polígonos no asignados mantienen su color por defecto (transparente para secciones, ámbar/púrpura para manzanas).
    *   Un usuario normal (`field_worker`) **solo** verá resaltados en rojo los polígonos que le han sido asignados a él.
    *   Un administrador verá resaltados en rojo **todos** los polígonos que tengan una asignación activa (sin importar el usuario).
*   **Búsqueda Espacial:** El sistema permite buscar polígonos por número de sección (ej. `188`) o por sección-manzana (ej. `188-5`). El mapa hará un "fly-to" (acercamiento animado) al polígono encontrado.
*   **Notificaciones en Tiempo Real [REFORZADO]:** 
    *   **Centralización:** Los disparadores (Triggers) de notificación para administradores residen en la tabla `tarea_historial`. Esto garantiza que tanto un cambio de estado como un simple comentario ("avance") generen una alerta.
    *   **Asignación:** Las notificaciones para trabajadores se disparan al insertar una nueva fila en `tareas`.
    *   **Robustez:** Uso de `lower(trim(rol)) = 'admin'` en SQL para evitar fallos por inconsistencia de datos.
    *   **Canales:** El frontend usa canales únicos por usuario (`notifications-${userId}`) vía Supabase Realtime.
    *   **Bidireccional:** El disparador `notify_parties_on_history_entry` (v6) asegura que tanto admins como trabajadores reciban alertas según quién actúe.
    *   **Limpieza de Datos:** `taskService.ts` centraliza la transformación de datos mediante `mapTareas` para asegurar compatibilidad de campos (`user_id` vs `usuario_id`).

## 6. Deuda Técnica y Áreas de Mejora (Roadmap a Producción)

1.  **Optimización de Carga Espacial:** Completada mediante el uso de **Vector Tiles (MVT)** servidos desde Express.
2.  **Manejo de Roles:** Implementar *Custom JWT Claims* para mayor seguridad.
3.  **Manejo de Estado Global**: Migrado a **Zustand** para mayor eficiencia y escalabilidad.
