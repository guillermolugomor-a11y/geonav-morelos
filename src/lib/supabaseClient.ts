import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación estructural de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '🚨 ERROR CRÍTICO: Faltan las credenciales de Supabase.\n' +
    'Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno.'
  );
} else if (!supabaseUrl.startsWith('https://')) {
  console.error(
    '🚨 ERROR CRÍTICO: La URL de Supabase es inválida.\n' +
    `Debe comenzar con "https://". Valor actual: "${supabaseUrl}"`
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

