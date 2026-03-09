import { supabase } from '../lib/supabaseClient';
import { Tarea, Poligono } from '../types';

export const taskService = {
  /**
   * Obtiene las tareas asignadas a un usuario
   */
  async getTareas(usuarioId: string): Promise<Tarea[]> {
    console.log('Consultando tareas para usuarioId:', usuarioId);
    try {
      const { data, error, status } = await supabase
        .from('tareas')
        .select('*')
        .eq('user_id', usuarioId);

      if (error) {
        console.error(`Error Supabase (Status ${status}) al obtener tareas:`, error.message, error);
        return [];
      }

      console.log('Tareas encontradas para el usuario:', data?.length || 0, data);
      return data || [];
    } catch (err) {
      console.error('Error inesperado al obtener tareas:', err);
      return [];
    }
  },

  /**
   * Obtiene las tareas de un polígono específico, opcionalmente filtradas por usuario
   */
  async getTareasByPoligono(poligonoId: number, usuarioId?: string): Promise<Tarea[]> {
    try {
      let query = supabase
        .from('tareas')
        .select('*')
        .eq('polygon_id', poligonoId);

      if (usuarioId) {
        query = query.eq('user_id', usuarioId);
      }

      const { data, error, status } = await query;

      if (error) {
        console.error(`Error Supabase (Status ${status}) al obtener tareas del polígono:`, error.message, error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error inesperado al obtener tareas del polígono:', err);
      return [];
    }
  },

  /**
   * Obtiene todas las tareas (Solo Admin).
   */
  async getAllTareas(): Promise<{ data: Tarea[], error: any }> {
    try {
      const { data, error, status } = await supabase
        .from('tareas')
        .select('*');

      if (error) {
        console.error(`Error Supabase (Status ${status}) al obtener todas las tareas:`, error.message, error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (err) {
      console.error('Error inesperado al obtener todas las tareas:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Asigna una nueva tarea a un usuario (Solo Admin)
   */
  async asignarTarea(tarea: any): Promise<{ data: Tarea | null, error: any }> {
    // Mapeamos los campos para que coincidan exactamente con la base de datos
    const payload = {
      polygon_id: tarea.polygon_id,
      user_id: tarea.user_id,
      instruccion: tarea.instruccion || tarea.instrucciones || '',
      status: tarea.status || 'pendiente',
      tipo_capa: tarea.tipo_capa || 'secciones',
      fecha_limite: tarea.fecha_limite || null
    };

    // Aseguramos que instruccion no sea null
    if (!payload.instruccion) {
      console.error('Error: La instrucción no puede ser null');
      return { data: null, error: { message: 'La instrucción es obligatoria' } };
    }

    console.log('Intentando insertar tarea en Supabase:', payload);

    try {
      const { data, error, status } = await supabase
        .from('tareas')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error(`Error Supabase (Status ${status}) al insertar tarea:`, error.message, error);
      } else {
        console.log('Tarea insertada con éxito:', data);
        // Map usuario_id to user_id just in case the backend uses 'usuario_id' but our frontend expects 'user_id'
        if (data && 'usuario_id' in data && !('user_id' in data)) {
          data.user_id = data.usuario_id;
        }
      }

      return { data, error };
    } catch (err) {
      console.error('Error inesperado al insertar tarea:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Actualiza el estado de una tarea
   */
  async updateTareaStatus(tareaId: string, status: Tarea['status'], comentarios?: string): Promise<boolean> {
    const { error } = await supabase
      .from('tareas')
      .update({ status, comentarios_usuario: comentarios })
      .eq('id', tareaId);

    if (error) {
      console.error('Error al actualizar tarea:', error);
      return false;
    }

    return true;
  },

  /**
   * Elimina una tarea (Solo Admin)
   */
  async deleteTarea(tareaId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('tareas')
      .delete()
      .eq('id', tareaId);

    return { error };
  },

  /**
   * Actualiza una tarea existente (Solo Admin)
   */
  async updateTarea(tareaId: string, updates: Partial<Tarea>): Promise<{ data: Tarea | null, error: any }> {
    const { data, error } = await supabase
      .from('tareas')
      .update(updates)
      .eq('id', tareaId)
      .select()
      .single();

    return { data, error };
  }
};
