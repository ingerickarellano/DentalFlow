import { supabase } from '../lib/supabase';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  laboratorio: string;
  rut?: string;
  telefono?: string;
  rol: 'admin' | 'usuario';
}

export class AuthService {
  static async registrarUsuario(email: string, password: string, nombre: string, laboratorio: string) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Crear registro en tabla usuarios
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .insert([
        {
          id: authData.user?.id,
          email,
          nombre,
          laboratorio,
          rol: 'usuario'
        }
      ])
      .select()
      .single();

    if (userError) throw userError;

    // Crear suscripción de prueba por 1 semana
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 7);

    const { error: subError } = await supabase
      .from('suscripciones')
      .insert([
        {
          usuario_id: authData.user?.id,
          plan_id: 'prueba_gratuita',
          fecha_expiracion: fechaExpiracion.toISOString(),
          estado: 'activa',
          metodo_pago: 'prueba'
        }
      ]);

    if (subError) throw subError;

    return userData;
  }

  static async iniciarSesion(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) throw userError;

    // Verificar suscripción activa
    const { data: suscripcion, error: subError } = await supabase
      .from('suscripciones')
      .select('*')
      .eq('usuario_id', data.user.id)
      .eq('estado', 'activa')
      .gte('fecha_expiracion', new Date().toISOString())
      .single();

    if (subError || !suscripcion) {
      throw new Error('No tienes una suscripción activa');
    }

    return {
      user: userData,
      session: data.session
    };
  }

  static async cerrarSesion() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async obtenerUsuarioActual() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return null;

    return userData;
  }

  static async verificarSuscripcionActiva(usuarioId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('suscripciones')
      .select('fecha_expiracion')
      .eq('usuario_id', usuarioId)
      .eq('estado', 'activa')
      .gte('fecha_expiracion', new Date().toISOString())
      .single();

    return !!data && !error;
  }
}