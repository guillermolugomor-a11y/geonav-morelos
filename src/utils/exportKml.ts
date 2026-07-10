import { Poligono, Tarea, UsuarioPerfil } from '../types';
import { TEAM_HEX_COLORS } from './teamColors';
import { getMunicipioBySeccion } from '../constants/seccionesMunicipios';

// KML color format: aabbggrr (alpha, blue, green, red)
function hexToKmlColor(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [alpha, b, g, r].map(n => n.toString(16).padStart(2, '0')).join('');
}

function ringToKml(ring: number[][]): string {
  return ring.map(([lon, lat]) => `${lon},${lat},0`).join(' ');
}

function geomToKml(geom: any): string {
  if (!geom) return '';
  if (geom.type === 'Polygon') {
    return (
      `<Polygon><outerBoundaryIs><LinearRing>` +
      `<coordinates>${ringToKml(geom.coordinates[0])}</coordinates>` +
      `</LinearRing></outerBoundaryIs></Polygon>`
    );
  }
  if (geom.type === 'MultiPolygon') {
    const parts = (geom.coordinates as number[][][][]).map(poly =>
      `<Polygon><outerBoundaryIs><LinearRing>` +
      `<coordinates>${ringToKml(poly[0])}</coordinates>` +
      `</LinearRing></outerBoundaryIs></Polygon>`
    );
    return `<MultiGeometry>${parts.join('')}</MultiGeometry>`;
  }
  return '';
}

// Average of outer ring vertices — fast, accurate enough for electoral sections
function computeCentroid(geom: any): [number, number] | null {
  if (!geom) return null;
  let ring: number[][] = [];
  if (geom.type === 'Polygon') {
    ring = geom.coordinates[0];
  } else if (geom.type === 'MultiPolygon') {
    // Pick the ring with most vertices (usually the largest polygon)
    for (const poly of geom.coordinates as number[][][][]) {
      if (poly[0].length > ring.length) ring = poly[0];
    }
  }
  if (ring.length === 0) return null;
  const n = ring.length;
  return [
    ring.reduce((s, c) => s + c[0], 0) / n,
    ring.reduce((s, c) => s + c[1], 0) / n,
  ];
}

function pinPlacemark(name: string, lon: number, lat: number, pinStyleId: string): string {
  return (
    `<Placemark>` +
      `<name>${name}</name>` +
      `<styleUrl>#${pinStyleId}</styleUrl>` +
      `<Point><coordinates>${lon},${lat},0</coordinates></Point>` +
    `</Placemark>`
  );
}

function buildPinStyle(id: string, kmlColor: string): string {
  return (
    `<Style id="${id}">` +
      `<IconStyle>` +
        `<color>${kmlColor}</color>` +
        `<scale>0.9</scale>` +
        `<Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>` +
      `</IconStyle>` +
      `<LabelStyle><scale>0.75</scale></LabelStyle>` +
    `</Style>`
  );
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  programada: 'Programada',
};

export function exportTareasKml(
  tareas: Tarea[],
  poligonos: Poligono[],
  manzanasPadron: any[],
  usuarios: UsuarioPerfil[],
  userIdFilter?: string,
  includeCentroids = false,
  filename = 'asignaciones_territoriales.kml'
): void {
  // ── Lookup maps ──────────────────────────────────────────────────────────────
  const polygonMap = new Map<number, Poligono>();
  poligonos.forEach(p => polygonMap.set(p.id, p));

  const manzanaMap = new Map<number, any>();
  manzanasPadron.forEach(m => manzanaMap.set(Number(m.id), m));

  // Index: seccionId → sorted manzanas (by rank_near, ascending)
  const sectionManzanasMap = new Map<number, any[]>();
  manzanasPadron.forEach(m => {
    const secId = Number(m.seccion);
    if (!sectionManzanasMap.has(secId)) sectionManzanasMap.set(secId, []);
    sectionManzanasMap.get(secId)!.push(m);
  });
  sectionManzanasMap.forEach(list =>
    list.sort((a, b) => (a.rank_near ?? 99) - (b.rank_near ?? 99))
  );

  const userMap = new Map<string, UsuarioPerfil>();
  usuarios.forEach(u => userMap.set(u.id, u));

  // Same color assignment as PadronLayer (non-admins, alphabetical)
  const userColorMap = new Map<string, string>();
  usuarios
    .filter(u => u.rol !== 'admin')
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-MX', { sensitivity: 'base' }))
    .forEach((u, idx) => userColorMap.set(u.id, TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length]));

  // ── Filter & group ────────────────────────────────────────────────────────────
  const sourceTareas = userIdFilter
    ? tareas.filter(t => t.user_id === userIdFilter)
    : tareas;

  const tasksByUser = new Map<string, Tarea[]>();
  sourceTareas.forEach(t => {
    if (!tasksByUser.has(t.user_id)) tasksByUser.set(t.user_id, []);
    tasksByUser.get(t.user_id)!.push(t);
  });

  // ── Styles (3 per user: section polygon, manzana polygon, pin) ───────────────
  const styleBlocks: string[] = [];

  userColorMap.forEach((hex, userId) => {
    const lineColor  = hexToKmlColor(hex, 0xff);
    const polyFill   = hexToKmlColor(hex, 0x55); // section fill — 33 % opacity
    const mzFill     = hexToKmlColor(hex, 0x28); // manzana fill — 16 % opacity
    const mzLine     = hexToKmlColor(hex, 0xaa); // manzana border — 67 % opacity
    const pinColor   = hexToKmlColor(hex, 0xff);

    styleBlocks.push(
      `<Style id="s-${userId}"><LineStyle><color>${lineColor}</color><width>2</width></LineStyle><PolyStyle><color>${polyFill}</color></PolyStyle></Style>`,
      `<Style id="mz-${userId}"><LineStyle><color>${mzLine}</color><width>1</width></LineStyle><PolyStyle><color>${mzFill}</color></PolyStyle></Style>`,
      buildPinStyle(`pin-${userId}`, pinColor)
    );
  });

  // Fallback default styles
  styleBlocks.push(
    `<Style id="s-default"><LineStyle><color>ff808080</color><width>2</width></LineStyle><PolyStyle><color>55808080</color></PolyStyle></Style>`,
    `<Style id="mz-default"><LineStyle><color>aa808080</color><width>1</width></LineStyle><PolyStyle><color>28808080</color></PolyStyle></Style>`,
    buildPinStyle('pin-default', 'ff808080')
  );

  // ── Folders per user ──────────────────────────────────────────────────────────
  const folderBlocks: string[] = [];

  tasksByUser.forEach((userTareas, userId) => {
    const hasColor   = userColorMap.has(userId);
    const polyStyle  = hasColor ? `s-${userId}`   : 's-default';
    const mzStyle    = hasColor ? `mz-${userId}`  : 'mz-default';
    const pinStyle   = hasColor ? `pin-${userId}` : 'pin-default';
    const userName   = userMap.get(userId)?.nombre ?? 'Sin asignar';

    const placemarks: string[] = [];

    userTareas.forEach(tarea => {
      const isManzana = ['manzana', 'manzanas'].includes(tarea.tipo_capa);
      let geom: any;
      let label: string;
      let seccionId: number | null = null;

      if (isManzana) {
        const mzRecord = manzanaMap.get(Number(tarea.polygon_id));
        geom = mzRecord?.geom;
        const seccionNum = mzRecord?.seccion ?? tarea.seccion;
        const manzanaNum = mzRecord?.manzana ?? tarea.manzana;
        label = seccionNum && manzanaNum
          ? `Manzana ${manzanaNum} · Secc. ${seccionNum}`
          : `Manzana ${tarea.polygon_id}`;
      } else {
        const poligono = polygonMap.get(tarea.polygon_id);
        geom      = poligono?.geom;
        label     = poligono?.nombre ?? `Sección ${tarea.polygon_id}`;
        seccionId = tarea.polygon_id;
      }

      const kmlGeom = geomToKml(geom);
      if (!kmlGeom) return;

      const centroid = computeCentroid(geom);

      const desc = [
        `Estado: ${STATUS_LABELS[tarea.status] ?? tarea.status}`,
        tarea.instruccion     ? `Instrucción: ${tarea.instruccion}` : null,
        tarea.fecha_operacion ? `Fecha operación: ${tarea.fecha_operacion}` : null,
      ].filter(Boolean).join('&#10;');

      // Polygon
      placemarks.push(
        `<Placemark>` +
          `<name>${label}</name>` +
          `<description><![CDATA[${desc}]]></description>` +
          `<styleUrl>#${polyStyle}</styleUrl>` +
          kmlGeom +
        `</Placemark>`
      );

      if (centroid && includeCentroids) {
        placemarks.push(pinPlacemark(`${label} — centroide`, centroid[0], centroid[1], pinStyle));
      }

      // Manzanas of this section (flat, right after the section polygon)
      if (!isManzana && seccionId !== null) {
        (sectionManzanasMap.get(seccionId) ?? []).forEach(m => {
          const mzGeom = geomToKml(m.geom);
          if (!mzGeom) return;
          const mzLabel = `Manzana ${m.manzana} · Secc. ${m.seccion}`;
          placemarks.push(
            `<Placemark>` +
              `<name>${mzLabel}</name>` +
              `<styleUrl>#${mzStyle}</styleUrl>` +
              mzGeom +
            `</Placemark>`
          );
          const mzCentroid = computeCentroid(m.geom);
          if (mzCentroid && includeCentroids) {
            placemarks.push(pinPlacemark(`${mzLabel} — centroide`, mzCentroid[0], mzCentroid[1], pinStyle));
          }
        });
      }
    });

    if (placemarks.length === 0) return;

    folderBlocks.push(
      `<Folder>` +
        `<name>${userName}</name>` +
        `<description>${userTareas.length} asignación${userTareas.length !== 1 ? 'es' : ''}</description>` +
        placemarks.join('') +
      `</Folder>`
    );
  });

  // ── Assemble & download ───────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const kml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2">\n` +
    `<Document>\n` +
    `<name>Asignaciones Territoriales — ${today}</name>\n` +
    `<description>Exportado desde GeoNav Morelos</description>\n` +
    styleBlocks.join('\n') + '\n' +
    folderBlocks.join('\n') + '\n' +
    `</Document>\n</kml>`;

  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Quote if the value contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(',');
}

export function exportTareasCsv(
  tareas: Tarea[],
  poligonos: Poligono[],
  manzanasPadron: any[],
  usuarios: UsuarioPerfil[],
  userIdFilter?: string,
  filename = 'asignaciones_territoriales.csv'
): void {
  // ── Lookup maps (same logic as KML) ──────────────────────────────────────────
  const polygonMap = new Map<number, Poligono>();
  poligonos.forEach(p => polygonMap.set(p.id, p));

  const manzanaMap = new Map<number, any>();
  manzanasPadron.forEach(m => manzanaMap.set(Number(m.id), m));

  const sectionManzanasMap = new Map<number, any[]>();
  manzanasPadron.forEach(m => {
    const secId = Number(m.seccion);
    if (!sectionManzanasMap.has(secId)) sectionManzanasMap.set(secId, []);
    sectionManzanasMap.get(secId)!.push(m);
  });
  sectionManzanasMap.forEach(list =>
    list.sort((a, b) => (a.rank_near ?? 99) - (b.rank_near ?? 99))
  );

  const userMap = new Map<string, UsuarioPerfil>();
  usuarios.forEach(u => userMap.set(u.id, u));

  const sourceTareas = userIdFilter
    ? tareas.filter(t => t.user_id === userIdFilter)
    : tareas;

  // ── Build rows ────────────────────────────────────────────────────────────────
  const HEADER = [
    'Operativo', 'Tipo', 'Municipio', 'Sección', 'Manzana', 'Nombre',
    'Estado', 'Instrucción', 'Fecha Operación',
    'Centroide Longitud', 'Centroide Latitud',
  ];

  const rows: string[] = [csvRow(HEADER)];

  sourceTareas.forEach(tarea => {
    const userName  = userMap.get(tarea.user_id)?.nombre ?? tarea.user_id;
    const status    = STATUS_LABELS[tarea.status] ?? tarea.status;
    const isManzana = ['manzana', 'manzanas'].includes(tarea.tipo_capa);

    if (isManzana) {
      // ── Manzana task ──────────────────────────────────────────────────────────
      const mzRecord  = manzanaMap.get(Number(tarea.polygon_id));
      const geom      = mzRecord?.geom;
      const seccionNum = mzRecord?.seccion ?? tarea.seccion ?? '';
      const manzanaNum = mzRecord?.manzana ?? tarea.manzana ?? '';
      const label     = seccionNum && manzanaNum
        ? `Manzana ${manzanaNum} · Secc. ${seccionNum}`
        : `Manzana ${tarea.polygon_id}`;
      const centroid  = computeCentroid(geom);

      rows.push(csvRow([
        userName, 'Manzana', getMunicipioBySeccion(seccionNum), seccionNum, manzanaNum, label,
        status, tarea.instruccion, tarea.fecha_operacion ?? '',
        centroid?.[0] ?? '', centroid?.[1] ?? '',
      ]));
    } else {
      // ── Section task ──────────────────────────────────────────────────────────
      const poligono  = polygonMap.get(tarea.polygon_id);
      const geom      = poligono?.geom;
      const label     = poligono?.nombre ?? `Sección ${tarea.polygon_id}`;
      const centroid  = computeCentroid(geom);

      rows.push(csvRow([
        userName, 'Sección', getMunicipioBySeccion(tarea.polygon_id), tarea.polygon_id, '', label,
        status, tarea.instruccion, tarea.fecha_operacion ?? '',
        centroid?.[0] ?? '', centroid?.[1] ?? '',
      ]));

      // Manzanas of this section
      (sectionManzanasMap.get(tarea.polygon_id) ?? []).forEach(m => {
        const mzLabel   = `Manzana ${m.manzana} · Secc. ${m.seccion}`;
        const mzCentroid = computeCentroid(m.geom);
        rows.push(csvRow([
          userName, 'Manzana', getMunicipioBySeccion(m.seccion), m.seccion, m.manzana, mzLabel,
          '', '', '',
          mzCentroid?.[0] ?? '', mzCentroid?.[1] ?? '',
        ]));
      });
    }
  });

  // UTF-8 BOM so Excel opens it correctly with accented characters
  const csv  = '﻿' + rows.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
