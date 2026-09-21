import { UsuarioPerfil } from '../types';
import { getMunicipioBySeccion } from '../constants/seccionesMunicipios';

export interface CsvRow {
  line: number; // número de línea en el archivo (1 = encabezado)
  operativo: string;
  tipo: string;
  municipio: string;
  seccion: string;
  manzana: string;
  encuestas: string;
  instruccion: string;
  fechaLimite: string;
}

export interface CsvValidatedRow extends CsvRow {
  errors: string[];
  // Solo presentes si la fila es válida
  userId?: string;
  polygonId?: number;
  tipoCapa?: 'padron' | 'manzana';
  seccionNum?: number;
  manzanaNum?: number | null;
  metaEncuestas?: number;
  fechaLimiteISO?: string | null;
}

export interface CsvParseResult {
  rows: CsvRow[];
  headerError: string | null;
}

export const CSV_TEMPLATE_HEADERS = [
  'Operativo', 'Tipo', 'Municipio', 'Sección', 'Manzana', 'Total de encuestas', 'Instrucción', 'Fecha límite',
];

export const CSV_TEMPLATE_EXAMPLE = [
  'Equipo 1,Sección,Temixco,621,,10,Levantamiento de encuestas en la sección asignada,2026-09-30',
  'Equipo 1,Manzana,Temixco,622,15,5,Levantamiento de encuestas en la manzana asignada,',
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Divide el texto CSV en filas de celdas (soporta comillas, comas/; como separador y saltos dentro de comillas). */
const splitCsv = (text: string): string[][] => {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
};

const HEADER_ALIASES: Record<keyof Omit<CsvRow, 'line'>, string[]> = {
  operativo: ['operativo', 'equipo', 'usuario'],
  tipo: ['tipo'],
  municipio: ['municipio'],
  seccion: ['seccion'],
  manzana: ['manzana'],
  encuestas: ['total de encuestas', 'encuestas', 'meta'],
  instruccion: ['instruccion', 'instrucciones'],
  fechaLimite: ['fecha limite', 'vencimiento'],
};

const REQUIRED_FIELDS: Array<keyof typeof HEADER_ALIASES> = ['operativo', 'seccion', 'encuestas', 'instruccion'];

export const parseCsv = (text: string): CsvParseResult => {
  const table = splitCsv(text).filter(r => r.some(c => c.trim() !== ''));
  if (table.length === 0) return { rows: [], headerError: 'El archivo está vacío.' };

  const headers = table[0].map(normalize);
  const colIndex = {} as Record<keyof typeof HEADER_ALIASES, number>;
  (Object.keys(HEADER_ALIASES) as Array<keyof typeof HEADER_ALIASES>).forEach(field => {
    colIndex[field] = headers.findIndex(h => HEADER_ALIASES[field].includes(h));
  });

  const missing = REQUIRED_FIELDS.filter(f => colIndex[f] < 0);
  if (missing.length > 0) {
    const labels: Record<string, string> = {
      operativo: 'Operativo', seccion: 'Sección', encuestas: 'Total de encuestas', instruccion: 'Instrucción',
    };
    return { rows: [], headerError: `Faltan columnas obligatorias: ${missing.map(f => labels[f]).join(', ')}.` };
  }

  const get = (r: string[], field: keyof typeof HEADER_ALIASES) =>
    colIndex[field] >= 0 ? (r[colIndex[field]] ?? '').trim() : '';

  const rows: CsvRow[] = table.slice(1).map((r, i) => ({
    line: i + 2,
    operativo: get(r, 'operativo'),
    tipo: get(r, 'tipo'),
    municipio: get(r, 'municipio'),
    seccion: get(r, 'seccion'),
    manzana: get(r, 'manzana'),
    encuestas: get(r, 'encuestas'),
    instruccion: get(r, 'instruccion'),
    fechaLimite: get(r, 'fechaLimite'),
  }));

  return { rows, headerError: null };
};

const parseFecha = (value: string): string | null | undefined => {
  if (!value) return null;
  let m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let y: string, mo: string, d: string;
  if (m) { [, y, mo, d] = m; }
  else {
    m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return undefined;
    [, d, mo, y] = m;
  }
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00`);
  if (isNaN(date.getTime()) || date.getMonth() + 1 !== Number(mo)) return undefined;
  return iso;
};

export interface CsvValidationContext {
  usuarios: UsuarioPerfil[];
  seccionesIds: Set<number>;
  manzanas: Array<{ id: number | string; seccion: number | string; manzana: number | string }>;
  seccionesOcupadas: Map<number, { userName: string }>;
}

export const validateCsvRows = (rows: CsvRow[], ctx: CsvValidationContext): CsvValidatedRow[] => {
  const usersByName = new Map<string, UsuarioPerfil>();
  ctx.usuarios.forEach(u => usersByName.set(normalize(u.nombre), u));

  const manzanaIndex = new Map<string, number>();
  ctx.manzanas.forEach(m => manzanaIndex.set(`${Number(m.seccion)}-${Number(m.manzana)}`, Number(m.id)));

  const seen = new Set<string>();

  return rows.map(row => {
    const errors: string[] = [];
    const out: CsvValidatedRow = { ...row, errors };

    // Operativo
    const user = usersByName.get(normalize(row.operativo));
    if (!row.operativo) errors.push('Falta el operativo');
    else if (!user) errors.push(`Operativo "${row.operativo}" no existe`);

    // Tipo
    const tipoNorm = normalize(row.tipo);
    let tipoCapa: 'padron' | 'manzana' = 'padron';
    if (tipoNorm === 'manzana') tipoCapa = 'manzana';
    else if (tipoNorm !== '' && tipoNorm !== 'seccion') errors.push(`Tipo "${row.tipo}" no válido (Sección o Manzana)`);

    // Sección
    const seccionNum = Number(row.seccion);
    const seccionOk = /^\d+$/.test(row.seccion) && ctx.seccionesIds.has(seccionNum);
    if (!row.seccion) errors.push('Falta la sección');
    else if (!seccionOk) errors.push(`Sección ${row.seccion} no existe`);

    // Municipio (validación cruzada)
    if (seccionOk && row.municipio) {
      const real = getMunicipioBySeccion(seccionNum);
      if (real && normalize(real) !== normalize(row.municipio)) {
        errors.push(`La sección ${seccionNum} pertenece a ${real}, no a ${row.municipio}`);
      }
    }

    // Manzana / polygon_id
    let polygonId: number | undefined = seccionOk ? seccionNum : undefined;
    let manzanaNum: number | null = null;
    if (tipoCapa === 'manzana') {
      if (!/^\d+$/.test(row.manzana)) {
        errors.push('Tipo Manzana requiere el número de manzana');
        polygonId = undefined;
      } else if (seccionOk) {
        manzanaNum = Number(row.manzana);
        const mzId = manzanaIndex.get(`${seccionNum}-${manzanaNum}`);
        if (mzId === undefined) {
          errors.push(`Manzana ${manzanaNum} no existe en la sección ${seccionNum}`);
          polygonId = undefined;
        } else {
          polygonId = mzId;
        }
      }
    }

    // Sección ya en trabajo (mismo criterio que la asignación manual)
    if (seccionOk) {
      const ocupada = ctx.seccionesOcupadas.get(seccionNum);
      if (ocupada) errors.push(`Sección ${seccionNum} ya está en trabajo (${ocupada.userName})`);
    }

    // Duplicado dentro del mismo archivo
    if (seccionOk) {
      const key = `${seccionNum}-${manzanaNum ?? ''}`;
      if (seen.has(key)) errors.push('Sección repetida en el archivo');
      seen.add(key);
    }

    // Total de encuestas
    let metaEncuestas: number | undefined;
    if (!/^\d+$/.test(row.encuestas)) errors.push('Total de encuestas debe ser un número entero');
    else metaEncuestas = Number(row.encuestas);

    // Instrucción
    if (!row.instruccion) errors.push('Falta la instrucción');

    // Fecha límite (opcional)
    const fecha = parseFecha(row.fechaLimite);
    if (fecha === undefined) errors.push(`Fecha límite "${row.fechaLimite}" no válida (AAAA-MM-DD)`);

    if (errors.length === 0 && user && polygonId !== undefined && metaEncuestas !== undefined) {
      out.userId = user.id;
      out.polygonId = polygonId;
      out.tipoCapa = tipoCapa;
      out.seccionNum = seccionNum;
      out.manzanaNum = manzanaNum;
      out.metaEncuestas = metaEncuestas;
      out.fechaLimiteISO = fecha ?? null;
    }
    return out;
  });
};

export const buildCsvTemplate = (): string =>
  '﻿' + [CSV_TEMPLATE_HEADERS.join(','), ...CSV_TEMPLATE_EXAMPLE].join('\r\n') + '\r\n';
