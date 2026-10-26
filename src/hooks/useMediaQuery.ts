import { useEffect, useState } from 'react';

// ============================================
// useMediaQuery: true mientras la consulta CSS se cumpla.
// Ej: const esMovil = useMediaQuery('(max-width: 1023px)');
// Se actualiza en vivo al rotar el teléfono o cambiar el tamaño de la ventana.
// ============================================
export const useMediaQuery = (query: string): boolean => {
  const obtener = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [coincide, setCoincide] = useState<boolean>(obtener);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const alCambiar = () => setCoincide(mql.matches);
    alCambiar();
    if (mql.addEventListener) mql.addEventListener('change', alCambiar);
    else mql.addListener(alCambiar);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', alCambiar);
      else mql.removeListener(alCambiar);
    };
  }, [query]);

  return coincide;
};

// Puntos de corte comunes del sitio
export const BREAKPOINTS = {
  movil: '(max-width: 639px)',
  tablet: '(max-width: 1023px)'
};
