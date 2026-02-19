import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURACIÓN PARA CREATE REACT APP
// ============================================

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ============================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ============================================
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR CRÍTICO: Variables de entorno de Supabase faltantes.');
  console.error('Asegúrate de tener REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en tu .env.local');
}

// ============================================
// CLIENTE SUPABASE — SE CREA UNA SOLA VEZ
// ============================================
export const supabase = createClient(
  supabaseUrl || 'https://default-placeholder.supabase.co',
  supabaseAnonKey || 'default-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: localStorage,
      storageKey: 'supabase.auth.token'
    },
    global: {
      headers: {
        'X-Client-Info': 'dentalflow-manager'
      }
    }
  }
);

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Verifica el estado actual de la sesión
 */
export const verificarSesion = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error obteniendo sesión:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error en verificarSesion:', error);
    return null;
  }
};

/**
 * Prueba de conexión a Supabase
 */
export const testConexionSupabase = async () => {
  try {
    const { error } = await supabase
      .from('clinicas')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Error de conexión:', error);
      return { success: false, error: error.message };
    }

    const { data: { session } } = await supabase.auth.getSession();
    return { success: true, session };
  } catch (error: any) {
    console.error('Error en test de conexión:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Función para debug completo — llama manualmente si necesitas depurar
 */
export const debugSupabaseCompleto = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Sesión:', session ? 'Activa' : 'Inactiva');
  console.log('Usuario:', session?.user?.email || 'Ninguno');
  const token = localStorage.getItem('supabase.auth.token');
  console.log('Token almacenado:', token ? 'Sí' : 'No');
  const test = await testConexionSupabase();
  console.log('Conexión:', test.success ? 'OK' : 'Falló');
  return { session, test };
};