import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURACIÓN PARA CREATE REACT APP
// ============================================

// OBTENER VARIABLES DE ENTORNO
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// ============================================
// VALIDACIÓN CRÍTICA - NO ELIMINAR
// ============================================
console.log('🔧 ============================================');
console.log('🔧 CONFIGURACIÓN SUPABASE - DEBUG');
console.log('🔧 ============================================');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 REACT_APP_SUPABASE_URL:', supabaseUrl ? '✅ DEFINIDA' : '❌ NO DEFINIDA');
console.log('🔧 REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ DEFINIDA' : '❌ NO DEFINIDA');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ============================================');
  console.error('❌ ERROR CRÍTICO: Variables de entorno faltantes');
  console.error('❌ ============================================');
  console.error('❌ Asegúrate de tener un archivo .env.local en la raíz con:');
  console.error('❌ REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('❌ REACT_APP_SUPABASE_ANON_KEY=tu_clave_anon_aquí');
  console.error('❌ ============================================');
  
  // En desarrollo, mostrar alerta clara
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    setTimeout(() => {
      alert(`
🚨 ERROR DE CONFIGURACIÓN SUPABASE

Variables de entorno faltantes:

1. REACT_APP_SUPABASE_URL
2. REACT_APP_SUPABASE_ANON_KEY

Crea un archivo .env.local en la raíz del proyecto con:

REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu_clave_anon_aquí

Después, reinicia el servidor:
1. Ctrl+C (detener)
2. npm start
      `);
    }, 1000);
  }
}

// ============================================
// CONFIGURACIÓN SIMPLIFICADA Y FUNCIONAL
// ============================================
export const supabase = createClient(
  supabaseUrl || 'https://default-placeholder.supabase.co',
  supabaseAnonKey || 'default-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // IMPORTANTE: false para CRA
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
      console.error('❌ Error obteniendo sesión:', error);
      return null;
    }
    
    console.log('🔍 Estado de sesión:', session ? '✅ Activa' : '❌ Inactiva');
    
    if (session && session.user) {
      console.log('👤 Usuario:', session.user.email);
      
      // CORRECCIÓN: Verificar si expires_at existe antes de usarlo
      if (session.expires_at) {
        console.log('⏰ Expira en:', new Date(session.expires_at * 1000).toLocaleString());
      } else {
        console.log('⏰ No hay fecha de expiración definida');
      }
    }
    
    return session;
  } catch (error) {
    console.error('💥 Error en verificarSesion:', error);
    return null;
  }
};

/**
 * Prueba de conexión a Supabase
 */
export const testConexionSupabase = async () => {
  try {
    console.log('🧪 Probando conexión a Supabase...');
    
    // Test 1: Conexión básica
    const { error } = await supabase
      .from('clinicas')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error de conexión:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Conexión exitosa. Tabla clinicas accesible.');
    
    // Test 2: Verificar autenticación
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Autenticación configurada. Sesión:', session ? 'Activa' : 'Inactiva');
    
    return { success: true, session };
  } catch (error: any) {
    console.error('💥 Error en test de conexión:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Función para debug completo
 */
export const debugSupabaseCompleto = async () => {
  console.group('🔍 DEBUG SUPABASE COMPLETO');
  
  // 1. Configuración
  console.log('1. Configuración:');
  console.log('- URL:', supabaseUrl?.substring(0, 30) + '...');
  console.log('- Key length:', supabaseAnonKey?.length || 0);
  console.log('- Storage key:', 'supabase.auth.token');
  
  // 2. Sesión actual
  const { data: { session } } = await supabase.auth.getSession();
  console.log('2. Sesión actual:');
  console.log('- Estado:', session ? '✅ Activa' : '❌ Inactiva');
  console.log('- Usuario:', session?.user?.email || 'Ninguno');
  
  // 3. Token en localStorage
  console.log('3. LocalStorage:');
  const token = localStorage.getItem('supabase.auth.token');
  console.log('- Token almacenado:', token ? '✅ Sí' : '❌ No');
  
  // 4. Test de conexión
  console.log('4. Test de conexión:');
  const test = await testConexionSupabase();
  console.log('- Resultado:', test.success ? '✅ OK' : '❌ Falló');
  
  console.groupEnd();
  
  return { session, test };
};

// ============================================
// INICIALIZACIÓN AUTOMÁTICA (solo en desarrollo)
// ============================================
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Ejecutar debug automáticamente
  setTimeout(() => {
    console.log('🚀 Inicializando debug de Supabase...');
    debugSupabaseCompleto().catch(console.error);
  }, 2000);
}