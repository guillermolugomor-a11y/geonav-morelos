import { Poligono, Tarea } from '../types';

export interface TaskLocationParts {
  seccion: string | null;
  manzana: string | null;
  label: string;
  detail?: string;
}

const asDisplayValue = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim();
};

export const getTaskLocationParts = (task: Partial<Tarea>, poligono?: Poligono | null): TaskLocationParts => {
  const seccion =
    asDisplayValue(task.seccion) ??
    asDisplayValue(task.clave_seccion) ??
    asDisplayValue(poligono?.metadata?.seccion);

  const manzana =
    asDisplayValue(task.manzana) ??
    asDisplayValue(task.clave_manzana) ??
    asDisplayValue(poligono?.metadata?.manzana);

  if (seccion && manzana) {
    return {
      seccion,
      manzana,
      label: `Sección ${seccion} · Manzana ${manzana}`,
      detail: `S:${seccion} · Mz:${manzana}`
    };
  }

  if (seccion) {
    return {
      seccion,
      manzana: null,
      label: `Sección ${seccion}`,
      detail: `S:${seccion}`
    };
  }

  if (manzana) {
    return {
      seccion: null,
      manzana,
      label: `Manzana ${manzana}`,
      detail: `Mz:${manzana}`
    };
  }

  if (task.polygon_id) {
    return {
      seccion: null,
      manzana: null,
      label: `Polígono ${task.polygon_id}`,
      detail: `ID:${task.polygon_id}`
    };
  }

  return {
    seccion: null,
    manzana: null,
    label: 'Sin referencia geográfica'
  };
};

export const formatTaskLocation = (task: Partial<Tarea>, poligono?: Poligono | null) => {
  return getTaskLocationParts(task, poligono).label;
};
