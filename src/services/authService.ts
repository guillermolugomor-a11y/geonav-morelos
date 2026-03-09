import { supabase } from '../lib/supabaseClient';
import { UsuarioPerfil } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Asegura que exista un perfil en `usuarios_perfil` para el usuario autenticado.
   * Si no existe, lo crea. Si existe pero le falta el email o necesita ser admin, lo actualiza.
   */
  async ensurePerfil(user: any): Promise<UsuarioPerfil | null> {
    const { data: existing } = await supabase
      .from('usuarios_perfil')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      const adminEmails = [
        'guillermo.lugo.mor@gmail.com',
        'guillermo.lugo@morelos.gob.mx',
        'daniel.sotelo@morelos.gob.mx'
      ];
      const shouldBeAdmin = adminEmails.includes(user.email);
      const needsEmailUpdate = !existing.email && user.email;

      if ((shouldBeAdmin && existing.rol !== 'admin') || needsEmailUpdate) {
        const { data: updated } = await supabase
          .from('usuarios_perfil')
          .update({
            rol: shouldBeAdmin ? 'admin' : existing.rol,
            email: user.email // Ensure email is stored
          })
          .eq('id', user.id)
          .select()
          .single();
        return updated || existing;
      }
      return existing;
    }

    // Create default profile if not exists
    const adminEmails = [
      'guillermo.lugo.mor@gmail.com',
      'guillermo.lugo@morelos.gob.mx',
      'daniel.sotelo@morelos.gob.mx'
    ];
    const isAdmin = adminEmails.includes(user.email);

    const { data, error } = await supabase
      .from('usuarios_perfil')
      .insert([
        {
          id: user.id,
          email: user.email,
          nombre: user.email.split('@')[0],
          rol: isAdmin ? 'admin' : 'field_worker'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }
    return data;
  }
};

