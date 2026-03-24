# GeoNav Morelos - Documentación Maestra del Sistema (v2.0)

Este documento es el activo intelectual más importante del proyecto. Ha sido diseñado para permitir la reconstrucción, auditoría y escalabilidad del sistema **GeoNav Morelos** mediante ingeniería inversa de su arquitectura actual.

---

## 1. 📌 Visión General del Sistema
*   **Propósito:** Gestionar y supervisar el despliegue de personal en territorio mediante cartografía electoral precisa.
*   **Problema que resuelve:** La dificultad de coordinar brigadas de campo, asignar zonas específicas (secciones/manzanas) y medir el avance real con evidencia geográfica y chat en tiempo real.
*   **Tipo de usuarios:** 
    *   **Administradores:** Coordinan zonas, asignan tareas y auditan el rendimiento.
    *   **Personal de Campo (Promotores):** Visualizan su ruta de trabajo y reportan avances desde el territorio.

---

## 2. 🏗️ Arquitectura del Sistema
El sistema utiliza una arquitectura **Híbrida de Tiempo Real y Alto Rendimiento Espacial**:

*   **Frontend:** React 18 (Vite) con **Zustand** para el estado global. La interfaz es mobile-first y utiliza **Framer Motion** para transiciones premium.
*   **Backend (Micro-servicios):**
    *   **Supabase (BaaS):** Gestiona la autenticación, base de datos relacional/espacial y el canal de notificaciones en tiempo real (Websockets).
    *   **Express Server (`server.ts`):** Actúa como middleware para servir **Vector Tiles (MVT)** optimizados directamente desde PostGIS y ejecutar el **Scheduler** de tareas programadas.
*   **Base de Datos:** PostgreSQL con **PostGIS**. Las geometrías se almacenan en formato binario (`wkb_geometry`) para máxima eficiencia.

---

## 3. 🗄️ Modelo de Datos (CRÍTICO)

### `usuarios_perfil`
*   **Propósito:** Almacena la identidad y el rol extendido.
*   **Campos clave:** `id` (UUID), `nombre` (Text), `rol` (`admin`|`field_worker`), `email` (Text).
*   **Relación:** 1:1 con `auth.users`.

### `poligonos_geojson` (y tablas GIS auxiliares)
*   **Propósito:** Almacena la cartografía (Secciones, Manzanas).
*   **Campos clave:** `geom` (Geometry), `tipo` (Sección/Manzana/Padron), `metadata` (JSONB con datos electorales).

### `tareas`
*   **Propósito:** La unidad de trabajo asignada.
*   **Campos clave:** `status` (pendiente/en_progreso/completada), `scheduled_at` (activación futura), `user_id` (asignado).

### `tarea_historial`
*   **Propósito:** Chat y auditoría de cambios.
*   **Campos clave:** `mensaje` (Avance), `tipo` (avance/cambio_estado/sistema).
*   **Relación:** N:1 con `tareas`.

---

## 4. 🔄 Flujos del Sistema

1.  **Login:** Basado en Supabase Auth. El sistema detecta el email y redirige según el rol (Admin -> Monitor, Campo -> Mapa Personal).
2.  **Asignación de Tareas:** El admin selecciona un polígono en el mapa -> Abre Sidebar -> Selecciona Usuario -> Define Instrucción. Esto dispara una notificación instantánea.
3.  **Monitoreo (Monitor View):** Lista tabulada de todas las tareas activas con filtros por estado del personal.
4.  **Estadísticas de Éxito:** Cálculo dinámico de eficiencia por usuario (`completadas` / `totales`).

---

## 5. 🗺️ Lógica GIS (MUY IMPORTANTE)

*   **Importación:** El sistema está diseñado para recibir datos de **QGIS** mediante `shp2pgsql` o carga masiva de GeoJSON a tablas PostgreSQL.
*   **Jerarquía Espacial:** 
    *   **Secciones (Polígonos Padre):** Nivel macro.
    *   **Manzanas (Polígonos Hijos):** Nivel micro donde se realiza el trabajo.
*   **Visualización Optimizada:** Para capas densas (Manzanas), el frontend no carga GeoJSON pesado; en su lugar, solicita **Vector Tiles** al servidor Express, que responde con fragmentos binarios PBF (`ST_AsMVT`), permitiendo zoom infinito y fluidez.
*   **Geofencing Implícito:** Las capturas de avance registran el `estado_snapshot` de la tarea para auditoría.

---

## 6. 🔐 Roles y Permisos

*   **Administrador:** Acceso total. Puede ver todo el estado físico del estado. Gestiona el "Rendimiento".
*   **Campo (Field Worker):** Visión restringida. El mapa solo muestra sus manzanas asignadas en color resaltado. No tiene acceso al panel de gestión de otros usuarios.
*   **Seguridad:** Implementada vía **Row Level Security (RLS)** en Supabase, donde las políticas filtran por `auth.uid()`.

---

## 7. ⚙️ Lógica de Negocio
*   **KPI de Eficiencia:** `(Completado * 100) / Total`. Color rojo si < 30%, amarillo < 70%, verde >= 70%.
*   **Scheduler:** El servidor Express verifica cada 60 segundos tareas con `scheduled_at <= NOW()` y las activa (cambia status a `pendiente`).
*   **Notificaciones Bidireccionales:** Cualquier inserción en `tarea_historial` notifica tanto al creador como al responsable.

---

## 8. 🧨 Problemas Detectados
1.  **Hardcoding de Roles:** Algunos roles se detectan por email en el frontend. Riesgo de bypass si no se migra a Custom Claims.
2.  **Carga Inicial:** `poligonosService` carga muchos datos al inicio; se debe migrar el 100% a MVT.
3.  **Dependencia de Servidor:** Si el `server.ts` cae, los Vector Tiles y el Scheduler fallan (aunque el resto del sistema Supabase siga vivo).

---

## 9. 🚀 Reconstrucción del Sistema (Paso a Paso)

1.  **Base de Datos:**
    *   Activar extensión `postgis`.
    *   Crear tablas `usuarios_perfil`, `tareas`, `tarea_historial` y `notificaciones`.
    *   Aplicar SQL de Triggers para notificaciones y actualización de timestamps.
2.  **GIS:**
    *   Cargar capas de manzanas y secciones desde QGIS a Postgres.
    *   Crear índices espaciales `GIST` en la columna `geom`.
3.  **Backend:**
    *   Configurar Supabase con políticas RLS (ver `supabase/migrations`).
    *   Desplegar `server.ts` con acceso a `DATABASE_URL` para MVT.
4.  **Frontend:**
    *   Configurar variables `.env` (URL y Anon Key).
    *   Ejecutar `npm install` y `npm run dev`.

---

## 10. 💡 Mejoras Propuestas
*   **Custom JWT Claims:** Seguridad de nivel bancario para roles.
*   **Modo Offline:** Cachear manzanas en IndexedDB para zonas sin señal.
*   **Integración Mapbox:** Para capas base satelitales más rápidas.

---

## 💥 Prompt Reducido Inteligente

"Arquitecto: Reconstruye GeoNav Morelos. Stack: React (Vite/Zustand) + Supabase (PostGIS/Realtime) + Express (MVT Tiles/Scheduler). DB: tablas usuarios_perfil, tareas (con scheduled_at), tarea_historial (chat/audit) y notificaciones (triggers). GIS: Capas de Secciones/Manzanas en Postgres; servir via ST_AsMVT. UI: Dashboard Admin (Monitor/Estadísticas KPIs) y Mapa Campo (RLS filter). Notificaciones Websocket. Mobile-first premium design."
