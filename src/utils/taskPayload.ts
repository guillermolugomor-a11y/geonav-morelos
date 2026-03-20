import { Poligono, Tarea } from '../types';

export interface TaskPayloadInput {
  userId: string;
  polygonId: number;
  instruccion: string;
  tipoCapa?: string;
  fechaLimite?: string | null;
  selectedManzana?: { manzana?: string | number; seccion?: string | number } | null;
  selectedSection?: { id?: string | number } | null;
  poligono?: Poligono | null;
  status?: Tarea['status'];
  scheduledAt?: string | null;    // fecha ISO para programación
  autoActivate?: boolean;           // activar automáticamente
}

const nullableString = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildTaskPayload = ({
  userId,
  polygonId,
  instruccion,
  tipoCapa = 'padron',
  fechaLimite,
  selectedManzana,
  selectedSection,
  poligono,
  status,
  scheduledAt,
  autoActivate = false,
}: TaskPayloadInput) => {
  const seccion =
    selectedManzana?.seccion ??
    selectedSection?.id ??
    poligono?.metadata?.seccion ??
    null;

  const manzana =
    selectedManzana?.manzana ??
    poligono?.metadata?.manzana ??
    null;

  // Determinar el status: si hay fecha de programación futura → 'programada', sino 'pendiente'
  const resolvedStatus: Tarea['status'] = status ??
    (scheduledAt && new Date(scheduledAt) > new Date() ? 'programada' : 'pendiente');

  // Convertir hora local México (CST = UTC-6) a UTC antes de guardar en Supabase.
  // Es inteligente: solo aplica el offset si el string parece venir de un input datetime-local (sin zona horaria).
  const toMexicoUTC = (localStr: string | null | undefined): string | null => {
    if (!localStr) return null;
    
    // Si ya es un ISO completo (trae Z o un offset + / - después de la T), no hacer nada
    const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(localStr);
    if (hasTimezone) return localStr;

    // Si tiene 'T' pero no timezone, asumimos que es datetime-local (Hora de México)
    if (localStr.includes('T')) {
      try {
        // Normalizar para que tenga segundos pero no milisegundos ni doble zona
        let normalized = localStr.split('.')[0];
        const timePart = normalized.split('T')[1];
        const timeSegments = timePart.split(':');
        
        if (timeSegments.length === 2) {
          normalized = `${normalized}:00`;
        }
        
        const withOffset = `${normalized}-06:00`;
        const date = new Date(withOffset);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch (e) {
        return null;
      }
    }
    
    return localStr;
  };

  return {
    polygon_id: polygonId,
    user_id: userId,
    instruccion: instruccion.trim(),
    status: resolvedStatus,
    tipo_capa: tipoCapa,
    fecha_limite: nullableString(fechaLimite),
    seccion: seccion ? String(seccion) : null,
    manzana: manzana ? String(manzana) : null,
    clave_seccion: seccion ? String(seccion) : null,
    clave_manzana: manzana ? String(manzana) : null,
    scheduled_at: toMexicoUTC(scheduledAt),
    auto_activate: autoActivate,
  };
};


export const buildBatchTaskPayloads = (base: Omit<TaskPayloadInput, 'userId'>, userIds: string[]) => {
  return userIds.map((userId) => buildTaskPayload({ ...base, userId }));
};
