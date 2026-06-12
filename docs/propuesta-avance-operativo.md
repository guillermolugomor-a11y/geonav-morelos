# Propuesta Funcional — Seguimiento de Entrevistas y Avance Territorial
**GeoNav Morelos · v1.1 → v1.2**
**Fecha:** 2026-06-09

---

## 1. Diagnóstico del Sistema Actual

Antes de proponer, es útil entender qué existe hoy:

| Capa | Estado actual | Brecha |
|---|---|---|
| `Tarea` | Tiene `status`, `seccion`, `polygon_id` | No tiene campos de entrevistas |
| `TareaHistorial` | Registra cambios de estado y comentarios | No captura cantidades |
| `UserStatsView` | Mide eficiencia por usuario (% de tareas completadas) | No mide entrevistas ni cobertura territorial |
| Mapa | Muestra secciones y manzanas por asignación | No colorea por avance de entrevistas |

---

## 2. Arquitectura de Datos Propuesta

### 2A. Nuevas columnas en la tabla `tareas` (Supabase)

Solo se agregan **2 columnas enteras** a la tabla existente. Esto es lo mínimo necesario:

```
tareas
├── entrevistas_programadas   INTEGER  DEFAULT NULL
└── entrevistas_realizadas    INTEGER  DEFAULT NULL
```

Ningún campo nuevo de tabla es obligatorio. Las tareas que no tengan meta de entrevistas simplemente tendrán `NULL` y el sistema las ignora en los cálculos de entrevistas.

### 2B. Tabla nueva (opcional, Fase 2)

Para los **puntos geográficos de entrevista individual** se necesitaría una tabla separada:

```
entrevista_puntos
├── id             UUID  PK
├── tarea_id       UUID  FK → tareas.id
├── lat            NUMERIC
├── lng            NUMERIC
├── registrado_en  TIMESTAMPTZ
└── user_id        UUID  FK → usuarios_perfil.id
```

> **Recomendación:** La Fase 1 (tablero + colores de sección) no requiere esta tabla. Se puede implementar usando los `seccion`/`polygon_id` existentes. La tabla de puntos es Fase 2 únicamente si se quiere ver los pines individuales en el mapa.

### 2C. Tipos TypeScript — extensión mínima de `Tarea`

```ts
// src/types.ts — agregar a la interfaz Tarea existente:
entrevistas_programadas?: number | null;
entrevistas_realizadas?: number | null;
```

---

## 3. Flujo Operativo Propuesto

```
ADMINISTRADOR                          TRABAJADOR DE CAMPO
─────────────                          ─────────────────────
1. Crea tarea en Gestión
   └── ingresa instrucción
   └── ingresa "Meta de entrevistas"
       (entrevistas_programadas)

2. Tarea asignada ──────────────────► 3. Trabajador la ve en "Mis Tareas"
                                          └── ve la meta: "50 entrevistas"

                                       4. Al reportar avance (botón Editar):
                                          └── cambia status
                                          └── escribe comentario
                                          └── ingresa "Entrevistas realizadas"
                                              (campo nuevo en el formulario)
                                          └── sube evidencia fotográfica
                                          └── guarda → historial registra número

5. Monitor muestra en tiempo real ◄── El dato fluye a Supabase
   └── % cumplimiento por sección
   └── mapa actualizado con colores
   └── tablero "Avance Operativo"
```

---

## 4. Mockup — Tablero de Avance Operativo

### Recomendación de ubicación: **Opción 3 — Nuevo módulo "Avance Operativo"**

**Justificación:** Monitor (granular, tarea por tarea) y Estadísticas (rendimiento por persona) ya tienen propósitos definidos. El avance territorial es una dimensión completamente distinta — es estratégica, no operativa. Un módulo propio evita contaminar las vistas existentes y da espacio para los tres grupos de indicadores.

Esto agregaría un **quinto tab** para administradores:
`Mapa | Gestión | Monitor | Avance | Estadísticas | Usuarios`

---

### Mockup — Vista de escritorio (1440px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AVANCE OPERATIVO                                              Semana 23/2026│
│  Instituto Morelense de Estudios Sociodemográficos                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CUMPLIMIENTO ESTATAL                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  ENTREVISTAS │  │  SECCIONES   │  │  MUNICIPIOS  │  │  OPERATIVOS  │    │
│  │  PROGRAMADAS │  │  INICIADAS   │  │  CON AVANCE  │  │  ACTIVOS     │    │
│  │              │  │              │  │              │  │              │    │
│  │    1,200     │  │   45 / 68    │  │   8 / 11     │  │   12 / 15    │    │
│  │              │  │              │  │              │  │              │    │
│  │ REALIZADAS   │  │ COMPLETADAS  │  │  SIN AVANCE  │  │  EN REZAGO   │    │
│  │    847       │  │   23         │  │   3          │  │   2          │    │
│  │              │  │              │  │              │  │              │    │
│  │  ████████░░  │  │  ████████░░  │  │  ████████░░  │  │  ██████████  │    │
│  │    70.6 %    │  │    66.2 %    │  │    72.7 %    │  │    80.0 %    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
├────────────────────────────────────┬────────────────────────────────────────┤
│  AVANCE POR MUNICIPIO              │  AVANCE POR SUPERVISOR                 │
│                                    │                                         │
│  Cuernavaca          ████████  82% │  Juan M.       ████████████  96%       │
│  Jiutepec            ███████░  71% │  Rosa H.       ████████░░░  80%        │
│  Temixco             █████░░░  54% │  Pedro G.      ██████░░░░░  62%        │
│  Xochitepec          ████░░░░  43% │  Ana L.        █████░░░░░░  50%        │
│  Emiliano Zapata     ███░░░░░  30% │  Carlos V.     ██░░░░░░░░░  23% ⚠️    │
│  Puente de Ixtla     █░░░░░░░  12% │                                         │
│                                    │                                         │
│  [Ver todos]                       │  [Ver todos]                            │
└────────────────────────────────────┴────────────────────────────────────────┘
```

### Mockup — Vista móvil (360px)

```
┌─────────────────────────┐
│  Avance Operativo  🗂️   │
├─────────────────────────┤
│  Estado: Morelos        │
│  ┌───────────────────┐  │
│  │ Entrevistas        │  │
│  │ 847 / 1,200   70% │  │
│  │ ████████████░░░░  │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Secciones          │  │
│  │ 45 / 68       66% │  │
│  │ ████████████░░░░  │  │
│  └───────────────────┘  │
│                          │
│  POR MUNICIPIO    ▼      │
│  Cuernavaca  ████  82%  │
│  Jiutepec    ███░  71%  │
│  Temixco     ██░░  54%  │
│  [+6 más]               │
└─────────────────────────┘
```

---

## 5. Flujo de Captura — Formulario del Trabajador

El trabajador ve y edita esto en "Mis Tareas → Reportar Avance":

```
┌────────────────────────────────────┐
│  REPORTAR AVANCE                 X │
├────────────────────────────────────┤
│  "Instrucción actual"              │
│  Levantamiento sección 045...      │
├────────────────────────────────────┤
│  CAMBIAR ESTADO                    │
│  ┌──────────────────────────────┐  │
│  │ En Progreso              ▾   │  │
│  └──────────────────────────────┘  │
│                                    │
│  ENTREVISTAS  ← CAMPO NUEVO       │
│  Meta:  50                         │
│  ┌──────────────────────────────┐  │
│  │ Realizadas hoy: [  35  ] ▲▼  │  │
│  └──────────────────────────────┘  │
│  35 de 50 · 70% cumplido          │
│  ████████████████░░░░░░░░░░        │
│                                    │
│  NUEVO AVANCE                      │
│  ┌──────────────────────────────┐  │
│  │ Escribe una actualización... │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Regresar]          [Guardar →]   │
└────────────────────────────────────┘
```

> El campo "Realizadas hoy" es **acumulativo**: si el trabajador ingresa 35 hoy y mañana 45, el sistema guarda el nuevo valor como total actualizado (no suma — reemplaza). Esto simplifica el modelo de datos y evita inconsistencias.

---

## 6. Propuesta de Visualización Cartográfica

### Paleta de colores por sección (capa de progreso)

Se colorea la capa de secciones existente usando el porcentaje de avance de entrevistas:

| Estado | Color | Condición |
|---|---|---|
| Sin iniciar | Gris claro `#e0d8d0` | `entrevistas_realizadas = 0` o sin tarea |
| Iniciada · bajo | Amarillo `#f59e0b` | 1–49% de cumplimiento |
| Iniciada · medio | Azul `#3b82f6` | 50–79% de cumplimiento |
| Completada | Verde `#10b981` | ≥ 80% de cumplimiento |
| Sin meta asignada | Azul grisáceo `#94a3b8` | Tiene tarea pero sin `entrevistas_programadas` |

Esta paleta es **independiente** de la paleta de ranking de manzanas (`#dc2626` → `#10b981`) que ya existe en `NearManzanasLayer`, evitando confusión visual.

### Mockup de la leyenda en mapa

```
┌──────────────────────────┐
│  Cobertura de Entrevistas │
├──────────────────────────┤
│  ▓ Sin iniciar            │
│  ▓ Bajo (1–49%)           │
│  ▓ Medio (50–79%)         │
│  ▓ Completado (≥80%)      │
│  ▓ Sin meta asignada      │
├──────────────────────────┤
│  Secciones: 45/68         │
│  Entrevistas: 847/1,200   │
└──────────────────────────┘
```

### Control de capas — propuesta de activación

En `RoutingSidebar` (botones de capas) se agregaría un tercer botón:

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Secciones│  │ Manzanas │  │ Avance   │
│  (padron)│  │ (near)   │  │ Entrevistas│
└──────────┘  └──────────┘  └──────────┘
```

### Puntos de entrevista individual (Fase 2)

Los pines se mostrarían como marcadores pequeños (`◉ 4px`) en las coordenadas registradas. **No hay líneas ni rutas.** Solo puntos de presencia.

```
  [Sección 045]
  ·  ·   ·
    · ·
  ·   ·  ·
  ·      ←── Puntos individuales de entrevista
     ·
```

---

## 7. Indicadores — Fuente de cálculo

Cada indicador se puede calcular desde los datos existentes más los dos nuevos campos:

| Indicador | Fuente |
|---|---|
| Entrevistas programadas | `SUM(tareas.entrevistas_programadas)` |
| Entrevistas realizadas | `SUM(tareas.entrevistas_realizadas)` |
| % avance entrevistas | `realizadas / programadas × 100` |
| Secciones iniciadas | `COUNT(DISTINCT seccion) WHERE realizadas > 0` |
| Secciones completadas | `COUNT(DISTINCT seccion) WHERE cumplimiento ≥ 80%` |
| Municipios con avance | Se deriva de `seccion` usando el mapa `SECCIONES_POR_MUNICIPIO` que ya existe en el código |
| Cumplimiento por supervisor | Agrupando tareas por `user_id` |

> El mapa `SECCIONES_POR_MUNICIPIO` (`src/constants/seccionesMunicipios.ts`) ya existe en el sistema y mapea sección → municipio. No se necesita ninguna columna nueva para calcular avance por municipio.

---

## 8. Beneficios Operativos

1. **Sin rediseño de la base de datos** — Solo 2 columnas nuevas en la tabla existente.
2. **Sin ruptura de flujo existente** — Las tareas sin meta de entrevistas siguen funcionando igual.
3. **Cálculo instantáneo** — Todo se deriva de datos ya presentes; no hay procesamiento batch.
4. **Reutilización** — El módulo de Avance Operativo consume los mismos datos que Monitor y Estadísticas, sin nuevos endpoints.
5. **Escalable** — La tabla de puntos individuales (Fase 2) puede añadirse sin modificar Fase 1.

---

## 9. Hoja de Ruta de Implementación

| Fase | Alcance | Complejidad | Impacto |
|---|---|---|---|
| **Fase 1A** | Columnas en BD + campos en formulario del trabajador | Baja | Alta |
| **Fase 1B** | Módulo "Avance Operativo" con tablero de KPIs | Media | Alta |
| **Fase 1C** | Capa de cobertura en mapa (colores por sección) | Media | Alta |
| **Fase 2** | Tabla de puntos individuales + pines en mapa | Media | Media |

Las Fases 1A, 1B y 1C son independientes entre sí y pueden desarrollarse en paralelo o en el orden que se prefiera.

---

*Documento generado el 2026-06-09. Con base en esta propuesta se validará el alcance final y posteriormente se autorizará el desarrollo.*
