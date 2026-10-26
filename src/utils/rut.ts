// ============================================
// UTILIDADES DE RUT CHILENO
// Misma regla que las funciones normalizar_rut() y rut_valido() de la base.
// ============================================

/** "12.345.678-k" | "12345678k" -> "12345678-K". Vacío -> null. */
export const normalizarRut = (valor: string | null | undefined): string | null => {
  const limpio = (valor || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!limpio) return null;
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/^0+/, '');
  return `${cuerpo}-${limpio.slice(-1)}`;
};

/** Valida el dígito verificador (módulo 11). Acepta cualquier formato. */
export const validarRut = (valor: string | null | undefined): boolean => {
  const rut = normalizarRut(valor);
  if (!rut || !/^[1-9][0-9]{0,7}-[0-9K]$/.test(rut)) return false;
  const [cuerpo, dv] = rut.split('-');
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
};

/** "12345678-K" -> "12.345.678-K" (para mostrar). Si no se puede, devuelve el valor tal cual. */
export const formatearRut = (valor: string | null | undefined): string => {
  const rut = normalizarRut(valor);
  if (!rut || !rut.includes('-')) return valor || '';
  const [cuerpo, dv] = rut.split('-');
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
};
