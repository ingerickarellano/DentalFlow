import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PlanId } from './useMembresia';

// ============================================
// PLANES: precio mensual (CLP) y límites, leídos de la tabla "planes".
// Los precios los cambia el super admin desde el Panel de Administración.
// ============================================
export interface Plan {
  id: PlanId;
  nombre: string;
  precio_mensual: number;
  limite_clinicas: number | null;
  limite_trabajos_mes: number | null;
  orden: number;
}

export const usePlanes = () => {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    const { data, error } = await supabase.from('planes').select('*').order('orden');
    if (error) console.error('Error cargando planes:', error);
    setPlanes(((data || []) as any[]).map(p => ({ ...p, precio_mensual: Number(p.precio_mensual) || 0 })));
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const plan = useCallback((id: string) => planes.find(p => p.id === id), [planes]);
  return { planes, plan, cargando, recargar: cargar };
};

// $8.000 (pesos chilenos, sin decimales)
export const formatearCLP = (monto: number | null | undefined): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(monto) || 0);

// Quita el código que la base de datos pone delante de sus mensajes (LIMITE_PLAN: ...)
export const mensajeBD = (error: any, porDefecto: string): string => {
  const texto = String(error?.message || '');
  return /^[A-Z_]+:\s*/.test(texto) ? texto.replace(/^[A-Z_]+:\s*/, '') : porDefecto;
};
