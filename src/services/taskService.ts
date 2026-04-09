import { supabase } from '../lib/supabaseClient';
import { Tarea, TareaHistorial } from '../types';
import { buildTaskPayload } from '../utils/taskPayload';
import { debugError, debugLog } from '../utils/debug';

const TASK_SELECTOR = `
  *,
  tarea_colaboradores!left(user_id)
`;

const mapTarea = (tarea: any): Tarea | null => {
  if (!tarea) return null;
  // Asegurar consistencia entre usuario_id y user_id
  const userId = tarea.user_id || tarea.usuario_id;
  if (userId) {
    tarea.user_id = userId;
    tarea.usuario_id = userId;
  }
  if (tarea.tarea_colaboradores && Array.isArray(tarea.tarea_colaboradores)) {
    tarea.collaborator_ids = tarea.tarea_colaboradores.map((c: any) => c.user_id);
  }
  return tarea as Tarea;
};

const mapTareas = (data: any[] | null): Tarea[] => {
  if (!data) return [];
  return data.map(mapTarea).filter((t): t is Tarea => t !== null);
};

export const taskService = {
  async getTareas(usuarioId: string): Promise<Tarea[]> {
    try {
      /**
       * ROOT CAUSE FIX: La consulta previa usaba un .or() manual con joins que fallaba
       * en Postgrest para muchos-a-muchos. 
       * Ahora confiamos en RLS para los operativos (que ya filtra lo que pueden ver)
       * y aplicamos un filtro explícito que funciona tanto para dueños como colaboradores.
       */
      const { data, error, status } = await supabase
        .from('tareas')
        .select(TASK_SELECTOR)
        .or(`user_id.eq.${usuarioId},is_collaborative.is.true`) // El RLS de tareas filtrará el acceso real
        .neq('status', 'programada')
        .order('created_at', { ascending: false });

      if (error) {
        debugError(`Error Supabase (Status ${status}) al obtener tareas:`, error.message, error);
        return [];
      }

      // IMPORTANTE: El filtro .or anterior es amplio, pero RLS garantiza la seguridad.
      // Aquí hacemos un filtrado fino en JS para asegurar que si se pidió un usuario específico, 
      // solo devolvamos las tareas relevantes para ese usuario (Dueño o Colaborador).
      const mapped = mapTareas(data);
      return mapped.filter(t => 
        t.user_id === usuarioId || 
        (t.collaborator_ids && t.collaborator_ids.includes(usuarioId))
      );
    } catch (err) {
      debugError('Error inesperado al obtener tareas:', err);
      return [];
    }
  },

  async getTareasByPoligono(poligonoId: number, usuarioId?: string): Promise<Tarea[]> {
    try {
      let query = supabase
        .from('tareas')
        .select(TASK_SELECTOR)
        .eq('polygon_id', poligonoId)
        .neq('status', 'programada');

      if (usuarioId) {
        // Al igual que en getTareas, permitimos ver si es dueño O si es colectiva 
        // (RLS filtrará las colectivas donde no participe)
        query = query.or(`user_id.eq.${usuarioId},is_collaborative.is.true`);
      }

      const { data, error, status } = await query;

      if (error) {
        debugError(`Error Supabase (Status ${status}) al obtener tareas del polígono:`, error.message, error);
        return [];
      }

      const mapped = mapTareas(data);
      if (usuarioId) {
        return mapped.filter(t => 
          t.user_id === usuarioId || 
          (t.collaborator_ids && t.collaborator_ids.includes(usuarioId))
        );
      }
      return mapped;
    } catch (err) {
      debugError('Error inesperado al obtener tareas del polígono:', err);
      return [];
    }
  },

  async getAllTareas(): Promise<{ data: Tarea[]; error: any }> {
    try {
      const { data, error, status } = await supabase
        .from('tareas')
        .select(TASK_SELECTOR)
        .order('created_at', { ascending: false });

      if (error) {
        debugError(`Error Supabase (Status ${status}) al obtener todas las tareas:`, error.message, error);
        return { data: [], error };
      }

      return {
        data: mapTareas(data),
        error: null
      };
    } catch (err) {
      debugError('Error inesperado al obtener todas las tareas:', err);
      return { data: [], error: err };
    }
  },

  async asignarTarea(tarea: any, adminId?: string): Promise<{ data: Tarea | null; error: any }> {
    const normalized = buildTaskPayload({
      userId: tarea.user_id,
      polygonId: Number(tarea.polygon_id),
      instruccion: tarea.instruccion || tarea.instrucciones || '',
      tipoCapa: tarea.tipo_capa || 'padron',
      fechaLimite: tarea.fecha_limite || null,
      selectedManzana: tarea.manzana ? { manzana: tarea.manzana, seccion: tarea.seccion } : tarea.selectedManzana,
      selectedSection: tarea.seccion ? { id: tarea.seccion } : tarea.selectedSection,
      status: tarea.status || undefined,
      scheduledAt: tarea.scheduled_at || null,
      autoActivate: tarea.auto_activate ?? false,
    });

    const payload = {
      polygon_id: normalized.polygon_id,
      user_id: normalized.user_id,
      instruccion: normalized.instruccion,
      status: normalized.status,
      tipo_capa: normalized.tipo_capa,
      fecha_limite: normalized.fecha_limite,
      seccion: normalized.seccion,
      manzana: normalized.manzana,
      clave_seccion: normalized.clave_seccion,
      clave_manzana: normalized.clave_manzana,
      scheduled_at: normalized.scheduled_at ?? null,
      auto_activate: normalized.auto_activate ?? false,
    };

    if (!payload.instruccion) {
      return { data: null, error: { message: 'La instrucción es obligatoria' } };
    }

    debugLog('Intentando insertar tarea en Supabase:', payload);

    try {
      const { data, error, status } = await supabase
        .from('tareas')
        .insert([payload])
        .select('*')
        .single();

      if (error) {
        debugError(`Error Supabase (Status ${status}) al insertar tarea:`, error.message, error);
        return { data: null, error };
      }

      // Registro automático en el historial tras la asignación
      if (data) {
        await this.addTareaHistorial({
          tarea_id: data.id,
          user_id: adminId || payload.user_id, // Usamos el ID del administrador si está disponible
          mensaje: `Tarea asignada con instrucciones: "${payload.instruccion}"`,
          estado_snapshot: payload.status,
          tipo: 'sistema'
        });
      }

      return { data: mapTarea(data as Tarea | null), error: null };
    } catch (err) {
      debugError('Error inesperado al insertar tarea:', err);
      return { data: null, error: err };
    }
  },

  async asignarTareasMasivas(payloads: any[], adminId?: string): Promise<{ data: Tarea[]; error: any }> {
    if (!payloads.length) {
      return { data: [], error: null };
    }

    try {
      const cleanPayloads = payloads.map((payload) => ({
        polygon_id: Number(payload.polygon_id),
        user_id: payload.user_id,
        instruccion: payload.instruccion,
        status: payload.status || 'pendiente',
        tipo_capa: payload.tipo_capa || 'padron',
        fecha_limite: payload.fecha_limite || null,
        seccion: payload.seccion || null,
        manzana: payload.manzana || null,
        clave_seccion: payload.clave_seccion || payload.seccion || null,
        clave_manzana: payload.clave_manzana || payload.manzana || null
      }));

      const { data, error } = await supabase
        .from('tareas')
        .insert(cleanPayloads)
        .select('*');

      if (!error && data) {
        // Registro masivo inicial en el historial
        const historyEntries = data.map(tarea => ({
          tarea_id: tarea.id,
          user_id: adminId || tarea.user_id,
          mensaje: `Tarea asignada masivamente`,
          estado_snapshot: tarea.status,
          tipo: 'sistema'
        }));
        
        await supabase.from('tarea_historial').insert(historyEntries);
      }

      return {
        data: mapTareas(data),
        error
      };
    } catch (err) {
      debugError('Error inesperado al insertar tareas masivas:', err);
      return { data: [], error: err };
    }
  },

  async asignarTareaColaborativa(tarea: any, userIds: string[], adminId?: string): Promise<{ data: Tarea | null; error: any }> {
    if (!userIds.length) return { data: null, error: { message: 'Se requiere al menos un usuario' } };

    try {
      // 1. Crear la tarea principal vinculada al primer usuario (o el admin como "lead")
      const normalized = buildTaskPayload({
        userId: userIds[0],
        polygonId: Number(tarea.polygon_id),
        instruccion: tarea.instruccion || '',
        tipoCapa: tarea.tipo_capa || 'padron',
        fechaLimite: tarea.fecha_limite || null,
        status: tarea.status || undefined,
        scheduledAt: tarea.scheduled_at || null,
        autoActivate: tarea.auto_activate ?? false,
      });

      const payload = {
        ...normalized,
        is_collaborative: true
      };

      const { data: newTask, error: taskError } = await supabase
        .from('tareas')
        .insert([payload])
        .select('*')
        .single();

      if (taskError || !newTask) throw taskError;

      // 2. Insertar colaboradores (todos los seleccionados)
      const colaboradores = userIds.map(uid => ({
        tarea_id: newTask.id,
        user_id: uid
      }));

      const { error: colabError } = await supabase
        .from('tarea_colaboradores')
        .insert(colaboradores);

      if (colabError) debugError('Error al insertar colaboradores:', colabError);

      // 3. Registrar en historial
      await this.addTareaHistorial({
        tarea_id: newTask.id,
        user_id: adminId || userIds[0],
        mensaje: `Tarea COLABORATIVA asignada a ${userIds.length} personas: "${payload.instruccion}"`,
        estado_snapshot: newTask.status,
        tipo: 'sistema'
      });

      return { data: mapTarea(newTask), error: null };
    } catch (err) {
      debugError('Error inesperado en asignarTareaColaborativa:', err);
      return { data: null, error: err };
    }
  },

  async getTareaHistorial(tareaId: string): Promise<TareaHistorial[]> {
    try {
      const { data, error, status } = await supabase
        .from('tarea_historial')
        .select(`
          *,
          perfil:usuarios_perfil(nombre)
        `)
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: false });

      if (error) {
        debugError(`Error Supabase (Status ${status}) al obtener historial:`, error.message, error);
        return [];
      }

      return data as TareaHistorial[];
    } catch (err) {
      debugError('Error inesperado al obtener historial de tarea:', err);
      return [];
    }
  },

  async addTareaHistorial(entry: Omit<TareaHistorial, 'id' | 'created_at'>): Promise<{ data: TareaHistorial | null; error: any }> {
    try {
      const { data, error, status } = await supabase
        .from('tarea_historial')
        .insert([entry])
        .select('*')
        .single();

      if (error) {
        debugError(`Error Supabase (Status ${status}) al insertar en historial:`, error.message, error);
      }

      return { data: data as TareaHistorial, error };
    } catch (err) {
      debugError('Error inesperado al insertar en historial:', err);
      return { data: null, error: err };
    }
  },

  async updateTareaStatus(
    tareaId: string, 
    status: Tarea['status'], 
    comentarios?: string, 
    userId?: string,
    evidenciaUrl?: string,
    evidenciaUrls?: string[]
  ): Promise<boolean> {
    const updates: any = { status, comentarios_usuario: comentarios };
    if (evidenciaUrl !== undefined) {
      updates.evidencia_url = evidenciaUrl;
    }
    if (evidenciaUrls !== undefined) {
      updates.evidencia_urls = evidenciaUrls;
    }

    const { error } = await supabase
      .from('tareas')
      .update(updates)
      .eq('id', tareaId);

    if (error) {
      debugError('Error al actualizar tarea:', error);
      return false;
    }

    if (comentarios && userId) {
      const hasEvidence = (evidenciaUrl && evidenciaUrl.length > 0) || (evidenciaUrls && evidenciaUrls.length > 0);
      await this.addTareaHistorial({
        tarea_id: tareaId,
        user_id: userId,
        mensaje: hasEvidence 
          ? `${comentarios} (Evidencia fotográfica adjunta)` 
          : comentarios,
        estado_snapshot: status,
        tipo: 'avance'
      });
    } else if (userId) {
       await this.addTareaHistorial({
        tarea_id: tareaId,
        user_id: userId,
        mensaje: evidenciaUrl 
          ? `La tarea cambió de estado a "${status}" y se adjuntó evidencia.` 
          : `La tarea cambió de estado a "${status}"`,
        estado_snapshot: status,
        tipo: 'cambio_estado'
      });
    }

    return true;
  },

  async deleteTarea(tareaId: string): Promise<{ error: any }> {
    const { error } = await supabase.from('tareas').delete().eq('id', tareaId);
    return { error };
  },

  async updateTarea(tarea_id: string, updates: Partial<Tarea>, adminId?: string): Promise<{ data: Tarea | null; error: any }> {
    try {
      // Primero obtenemos el estado actual para comparar
      const { data: currentTask } = await supabase.from('tareas').select('status, instruccion').eq('id', tarea_id).single();

      const { data, error } = await supabase
        .from('tareas')
        .update(updates)
        .eq('id', tarea_id)
        .select('*')
        .single();

      if (!error && data && adminId) {
        // Si hay cambios relevantes, registrarlos en el historial
        const changes = [];
        if (updates.status && updates.status !== currentTask?.status) {
          changes.push(`Estado cambiado a "${updates.status}"`);
        }
        if (updates.instruccion && updates.instruccion !== currentTask?.instruccion) {
          changes.push(`Instrucciones actualizadas`);
        }

        if (changes.length > 0) {
          await this.addTareaHistorial({
            tarea_id,
            user_id: adminId,
            mensaje: `Administrador actualizó la tarea: ${changes.join(', ')}`,
            estado_snapshot: data.status,
            tipo: 'sistema'
          });
        }
      }

      return { data: mapTarea(data as Tarea | null), error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Activa las tareas programadas cuya fecha/hora ya llegó.
   * Usado por el scheduler automático.
   * NOTA: En modo cliente (anon key) solo activa las accesibles por RLS.
   * Para bypass completo usar el script scheduler.ts con service_role key.
   */
  async activateScheduledTasks(): Promise<{ activadas: number; error: any }> {
    try {
      const ahora = new Date().toISOString();

      const { data: tareas, error: fetchError } = await supabase
        .from('tareas')
        .select('id, user_id, scheduled_at')
        .eq('status', 'programada')
        .eq('auto_activate', true)
        .lte('scheduled_at', ahora)
        .limit(50);

      if (fetchError || !tareas?.length) {
        return { activadas: 0, error: fetchError };
      }

      const ids = tareas.map((t: any) => t.id);

      const { error: updateError } = await supabase
        .from('tareas')
        .update({ status: 'pendiente' })
        .in('id', ids);

      if (!updateError) {
        const historial = tareas.map((t: any) => ({
          tarea_id: t.id,
          user_id: t.user_id,
          mensaje: `Tarea activada automáticamente (programada para ${new Date(t.scheduled_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })})`,
          estado_snapshot: 'pendiente',
          tipo: 'sistema'
        }));
        await supabase.from('tarea_historial').insert(historial);
      }

      return { activadas: ids.length, error: updateError };
    } catch (err) {
      return { activadas: 0, error: err };
    }
  }
};
