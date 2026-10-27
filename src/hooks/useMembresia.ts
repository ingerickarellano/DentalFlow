import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ============================================
// MEMBRESÍA DEL LABORATORIO
// El plan pertenece al laboratorio (no a la persona) y se lee con la función
// mi_membresia() de la base. Planes: 'gratuito' | 'profesional' | 'enterprise'.
// Plan vencido o laboratorio suspendido = solo lectura (la base no deja crear
// registros nuevos, pero sí avanzar los trabajos en curso).
// ============================================

export type PlanId = 'gratuito' | 'profesional' | 'enterprise';

export interface MembresiaInfo {
  plan: PlanId;
  planNombre: string;
  planSolicitado: PlanId | null;
  fecha_expiracion: string | null;
  suscripcion_activa: boolean;
  dias_restantes: number;
  estaActiva: boolean;
  soloLectura: boolean;
  suspendido: boolean;
  esGratuita: boolean;
  limiteClinicas: number | null; // null = ilimitado
  clinicas: number;
  limiteTrabajosMes: number | null; // null = ilimitado
  trabajosMes: number;              // trabajos creados en el mes actual
  precioMensual: number;            // precio actual del plan (CLP)
  laboratorioId: string | null;
  laboratorio: string;
  rol: string;
  cargando: boolean;
}

export const NOMBRES_PLAN: Record<PlanId, string> = {
  gratuito: 'Prueba Gratuita',
  profesional: 'Profesional',
  enterprise: 'Enterprise'
};

export const nombrePlan = (plan: string | null | undefined): string =>
  NOMBRES_PLAN[(plan || 'gratuito') as PlanId] || plan || 'Prueba Gratuita';

const ESTADO_INICIAL: MembresiaInfo = {
  plan: 'gratuito',
  planNombre: NOMBRES_PLAN.gratuito,
  planSolicitado: null,
  fecha_expiracion: null,
  suscripcion_activa: false,
  dias_restantes: 0,
  estaActiva: false,
  soloLectura: false,
  suspendido: false,
  esGratuita: true,
  limiteClinicas: 3,
  clinicas: 0,
  limiteTrabajosMes: 10,
  trabajosMes: 0,
  precioMensual: 0,
  laboratorioId: null,
  laboratorio: '',
  rol: '',
  cargando: true
};

export const useMembresia = (userId: string | undefined) => {
  const [membresia, setMembresia] = useState<MembresiaInfo>(ESTADO_INICIAL);

  useEffect(() => {
    if (!userId) {
      setMembresia(prev => ({ ...prev, cargando: false }));
      return;
    }

    let activo = true;

    const cargarMembresia = async () => {
      try {
        const { data, error } = await supabase.rpc('mi_membresia');
        if (error) throw error;
        if (!activo) return;

        const fila = Array.isArray(data) ? data[0] : data;

        if (!fila) {
          // Sin laboratorio asociado (por ejemplo, super administrador de la plataforma)
          setMembresia({ ...ESTADO_INICIAL, soloLectura: false, limiteClinicas: null, limiteTrabajosMes: null, cargando: false });
          return;
        }

        const plan = (fila.plan || 'gratuito') as PlanId;
        setMembresia({
          plan,
          planNombre: nombrePlan(plan),
          planSolicitado: (fila.plan_solicitado || null) as PlanId | null,
          fecha_expiracion: fila.fecha_vencimiento,
          suscripcion_activa: !!fila.vigente,
          dias_restantes: fila.dias_restantes ?? 0,
          estaActiva: !!fila.vigente,
          soloLectura: !!fila.solo_lectura,
          suspendido: fila.estado === 'suspendido',
          esGratuita: plan === 'gratuito',
          limiteClinicas: fila.limite_clinicas ?? null,
          clinicas: fila.clinicas ?? 0,
          limiteTrabajosMes: fila.limite_trabajos_mes ?? null,
          trabajosMes: fila.trabajos_mes ?? 0,
          precioMensual: Number(fila.precio_mensual) || 0,
          laboratorioId: fila.laboratorio_id,
          laboratorio: fila.laboratorio || '',
          rol: fila.rol || '',
          cargando: false
        });
      } catch (error) {
        console.error('Error en useMembresia:', error);
        if (activo) setMembresia(prev => ({ ...prev, cargando: false }));
      }
    };

    cargarMembresia();
    return () => { activo = false; };
  }, [userId]);

  return membresia;
};
