import { supabase } from '../lib/supabaseClient';
import { UsuarioPerfil } from '../types';

export const userService = {
  /**
   * Obtiene el perfil de un usuario específico.
   */
  async getPerfil(userId: string): Promise<UsuarioPerfil | null> {
    const { data, error } = await supabase
      .from('usuarios_perfil')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  /**
   * Actualiza los datos del perfil del usuario.
   */
  async updatePerfil(userId: string, updates: Partial<UsuarioPerfil>): Promise<UsuarioPerfil | null> {
    const safeUpdates = { ...updates };
    delete safeUpdates.rol;
    delete safeUpdates.email;
    delete safeUpdates.id;
    delete safeUpdates.created_at;

    const { data, error } = await supabase
      .from('usuarios_perfil')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    return data;
  },

  /**
   * Obtiene todos los usuarios registrados en el sistema.
   */
  async getUsuarios(): Promise<UsuarioPerfil[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios_perfil')
        .select('id, nombre, email, rol, created_at')
        .order('nombre');
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Unexpected error in getUsuarios:', error);
      throw error;
    }
  },

  /**
   * Obtiene la lista de usuarios asignables (Personal de Campo).
   */
  async getAssignableUsers(): Promise<UsuarioPerfil[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios_perfil')
        .select('id, nombre, email, rol, created_at')
        .in('rol', ['field_worker', 'campo', 'admin'])
        .order('nombre');
      
      if (error) {
        console.error('Error fetching assignable users:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Unexpected error in getAssignableUsers:', error);
      throw error;
    }
  }
};
