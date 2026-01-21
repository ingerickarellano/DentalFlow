import { supabase } from '../lib/supabase';

export interface Clinica {
  id: string;
  usuario_id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  creado_en: string;
}

export class ClinicasService {
  static async obtenerClinicas(usuarioId: string): Promise<Clinica[]> {
    const { data, error } = await supabase
      .from('clinicas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async crearClinica(usuarioId: string, clinicaData: Omit<Clinica, 'id' | 'usuario_id' | 'creado_en'>) {
    const { data, error } = await supabase
      .from('clinicas')
      .insert([{ ...clinicaData, usuario_id: usuarioId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async actualizarClinica(id: string, clinicaData: Partial<Clinica>) {
    const { data, error } = await supabase
      .from('clinicas')
      .update(clinicaData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async eliminarClinica(id: string) {
    const { error } = await supabase
      .from('clinicas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}