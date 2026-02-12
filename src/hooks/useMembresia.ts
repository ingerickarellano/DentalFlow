import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface MembresiaInfo {
  plan: string;
  fecha_expiracion: string | null;
  suscripcion_activa: boolean;
  dias_restantes: number;
  estaActiva: boolean;
  esGratuita: boolean;
  cargando: boolean;
}

export const useMembresia = (userId: string | undefined) => {
  const [membresia, setMembresia] = useState<MembresiaInfo>({
    plan: 'gratuita',
    fecha_expiracion: null,
    suscripcion_activa: false,
    dias_restantes: 0,
    estaActiva: false,
    esGratuita: true,
    cargando: true
  });

  useEffect(() => {
    if (!userId) {
      setMembresia(prev => ({ ...prev, cargando: false }));
      return;
    }

    const cargarMembresia = async () => {
      try {
        const { data, error } = await supabase
          .from('perfiles_usuarios')
          .select('plan, fecha_expiracion, suscripcion_activa')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Calcular días restantes
          let dias = 0;
          if (data.fecha_expiracion) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const expiracion = new Date(data.fecha_expiracion);
            expiracion.setHours(0, 0, 0, 0);
            dias = Math.ceil((expiracion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          }

          const suscripcionActiva = data.suscripcion_activa || false;
          const diasRestantes = dias > 0 ? dias : 0;
          const estaActiva = suscripcionActiva && diasRestantes > 0;
          const esGratuita = data.plan === 'gratuita';

          setMembresia({
            plan: data.plan || 'gratuita',
            fecha_expiracion: data.fecha_expiracion,
            suscripcion_activa: suscripcionActiva,
            dias_restantes: diasRestantes,
            estaActiva,
            esGratuita,
            cargando: false
          });
        } else {
          // No hay perfil -> asumimos prueba gratuita activa por 30 días
          const hoy = new Date();
          const expiracion = new Date();
          expiracion.setDate(hoy.getDate() + 30);

          setMembresia({
            plan: 'gratuita',
            fecha_expiracion: expiracion.toISOString().split('T')[0],
            suscripcion_activa: true,
            dias_restantes: 30,
            estaActiva: true,
            esGratuita: true,
            cargando: false
          });
        }
      } catch (error) {
        console.error('Error en useMembresia:', error);
        setMembresia(prev => ({ ...prev, cargando: false }));
      }
    };

    cargarMembresia();
  }, [userId]);

  return membresia;
};