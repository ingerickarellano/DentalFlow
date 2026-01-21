export const verificarSuscripcionActiva = (): boolean => {
  const suscripcionData = localStorage.getItem('dentalflow-suscripcion');
  
  if (!suscripcionData) {
    return false; // No hay suscripción
  }

  const suscripcion = JSON.parse(suscripcionData);
  const fechaExpiracion = new Date(suscripcion.fechaExpiracion);
  const hoy = new Date();

  return fechaExpiracion > hoy && suscripcion.estado === 'activa';
};

export const obtenerDiasRestantes = (): number => {
  const suscripcionData = localStorage.getItem('dentalflow-suscripcion');
  
  if (!suscripcionData) return 0;

  const suscripcion = JSON.parse(suscripcionData);
  const fechaExpiracion = new Date(suscripcion.fechaExpiracion);
  const hoy = new Date();
  
  return Math.ceil((fechaExpiracion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

export const redirigirASuscripcion = (navigate: any) => {
  if (!verificarSuscripcionActiva()) {
    navigate('/suscripciones');
    return true;
  }
  return false;
};