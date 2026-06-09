# I.E.S.M. - Documentación Maestra del Sistema (v4.0 - I.E.S.M. Era)

Este documento es el activo intelectual más importante del proyecto. Ha sido diseñado para permitir la reconstrucción, auditoría y escalabilidad del sistema **I.E.S.M.** mediante ingeniería inversa de su arquitectura actual.

---

## 1. 📌 Visión General del Sistema
*   **Propósito:** Gestión estratégica y monitoreo de despliegue territorial para el **Instituto de Estudios Sociales de Morelos (I.E.S.M.)**.
*   **Institucionalidad:** Brandbook 2024-2030 integrado (`--color-primary: #620041`).
*   **Tipo de usuarios:** 
    *   **Administradores:** Coordinan zonas, asignan tareas (Individuales/Colaborativas) e interactúan con el personal (Monitor Editorial y Asignación de Tareas).
    *   **Operativos:** Visualizan su ruta de trabajo y documentan avances con historial sincronizado.

---

## 2. 🏗️ Arquitectura del Sistema
Arquitectura **Híbrida de Tiempo Real, Alto Rendimiento Espacial y Cache-First**:

*   **Frontend:** React 18 (Vite) + **Zustand**. Interfaz **"Digital Curator Premium"**: Glassmorphism, desenfoques de fondo (`backdrop-blur`) y tipografía institucional.
*   **Performance (Caching):** Implementación de `fetchWithCache` (utilizando el **Cache API** nativo) para activos críticos como GeoJSON masivos.
*   **Gestión de Cargas Cartográficas (Claves Dinámicas):** Las capas de React Leaflet (`PadronLayer` y `NearManzanasLayer`) se renderizan utilizando una clave de estado que incluye el `selectedMunicipio` actual, forzando la reconstrucción y limpieza completa de caché en el mapa al cambiar de municipio.
*   **Responsividad:** Estrategia **Mobile-First Refined**: Padding dinámico (`p-4` vs `p-8`), escalamiento de fuentes y `BottomNav` flotante civic-shadow.
*   **Backend:**
    *   **Supabase:** Auth, PostgreSQL/PostGIS y Webhooks de tiempo real.
    *   **Express Server:** Middleware para **Vector Tiles (MVT)** y CRON Scheduler.

---

## 3. 🗄️ Modelo de Datos (CRÍTICO)

### `usuarios_perfil`
*   **Propósito:** Identidad y rol extendido.
*   **Campos clave:** `id`, `nombre`, `rol` (`admin`|`field_worker`), `last_login`.

### `tareas`
*   **Novedad v3.0/v4.0:** Conexión estricta con `tarea_colaboradores` y prop-sync entre `AdminPanel` y `TaskAssignmentForm`.
*   **Campos clave:** `status`, `user_id` (Dueño/Lead), `is_collaborative`, `polygon_id`.

### `tarea_historial`
*   **Propósito:** Auditoría y Chat. Alimenta las notificaciones push institucionales.

### Catálogo de Municipios (`seccionesMunicipios.ts`)
*   **Propósito:** Mapeo estático y estructurado de secciones electorales de la primera etapa a sus respectivos municipios: Cuernavaca, Jiutepec, Cuautla, Ayala, Temixco y Yautepec. Evita la necesidad de importar librerías pesadas de procesamiento de Excel en tiempo de ejecución en el cliente.

---

## 4. 🔄 Flujos del Sistema

1.  **Filtrado por Municipio (Mapa y Gestión):**
    *   **Mapa Principal:** Selector "Municipio a visualizar" en la barra de herramientas. Controla la visibilidad de las secciones/manzanas en el mapa. Al cambiar de municipio, las secciones anteriores se limpian de inmediato.
    *   **Sincronización de Búsqueda:** La búsqueda manual de una sección asocia geográficamente la sección con su municipio y selecciona automáticamente ese municipio en el dropdown del mapa.
    *   **Módulo de Gestión:** Selector "Municipio de trabajo" para supervisores. Filtra la lista de secciones para la asignación y limpia selecciones cruzadas automáticamente.
2.  **Cálculo de Secciones Cercanas (Top 9 Haversine):**
    *   Al seleccionar una sección en Gestión de Tareas, el sistema calcula geodésicamente las **9 secciones más cercanas** pertenecientes al **mismo municipio** utilizando la **Fórmula de Haversine** (distancia en metros/kilómetros sobre la superficie terrestre).
3.  **Asignación Inteligente:** Selección de operativos con visualización de **Carga de Trabajo (Workload)** en tiempo real (Badges Verde/Amarillo/Rojo).
4.  **Detección de Duplicidad:** Alerta proactiva al intentar asignar zonas ya ocupadas.
5.  **Validación Administrativa:** Flujo de Aprobación/Rechazo de tareas completadas con retroalimentación instantánea al trabajador.

---

## 5. 🗺️ Lógica GIS y MVT

*   **Vector Tiles:** Para capas masivas (Manzanas), servidas vía PBF (`ST_AsMVT`).
*   **GeoJSON Cache:** Las capas de secciones se sirven con cabeceras de cache-control e hidratación vía `fetchWithCache.ts`.
*   **Fórmula Haversine:** Reemplaza el cálculo euclidiano estándar para evitar distorsiones cartográficas en coordenadas decimales, logrando una precisión óptima en metros y kilómetros.

---

## 6. 🔐 Seguridad y RLS

*   **RLS (Supabase):** Políticas granulares para que los trabajadores solo accedan a sus tareas (asociadas por `user_id` o `collaborator_ids`) y los admins tengan visibilidad total.
*   **Regla de Oro:** La seguridad reside en la base de datos, el cliente solo refleja el estado autorizado.

---

## 7. 🚀 Reconstrucción Dinámica

1.  **Esquema:** Correr migraciones SQL en Supabase (Inc. Colaboración e Historial).
2.  **Server:** Levantar `server.ts` para habilitar MVT en puerto especificado.
3.  **Frontend:** `npm run dev` configurando credenciales de Supabase.

---

## 8. 💡 Roadmap de Innovación
*   **Offline First:** Sincronización robusta sin conexión.
*   **IA Analítica:** Predicción de rezago basada en tendencias históricas.

---

## 💥 Prompt Reducido Maestro v4.0

"Arquitecto: I.E.S.M. v4.0 Digital Curator. Stack: React/Zustand + Supabase/PostGIS + Express MVT + Cache API. Tech: fetchWithCache, Key-Based Map Refresh (Municipios Dynamic Clean). Features: Filtro por Municipio (Mapa y Gestión), Búsqueda Sincronizada, Secciones Cercanas (Top 9 Haversine en metros/km dentro del mismo municipio), Asignación Colaborativa, Workload Viz, Duplicity Alert, Historial Timeline. DB: usuarios_perfil, tareas (is_collaborative), tarea_historial (shared stats/audit), seccionesMunicipios (Catálogo estático)."
