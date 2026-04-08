
import { createClient } from '@supabase/supabase-api';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function check() {
  const { data } = await supabase.from('usuarios_perfil').select('*');
  console.log(data);
}
check();
