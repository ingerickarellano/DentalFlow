// Base de datos completa para DentalFlow Manager

// ==================== SISTEMA DE USUARIOS Y MEMBRESÍAS ====================

export interface Usuario {
  id: string;
  username: string;
  password: string;
  nombre: string;
  email: string;
  telefono: string;
  laboratorio: string;
  role: 'admin' | 'tecnico' | 'cliente';
  fechaRegistro: string;
  activo: boolean;
}

export interface Membresia {
  id: string;
  usuarioId: string;
  tipo: 'gratuita' | 'basica' | 'premium' | 'empresarial';
  precio: number;
  duracionDias: number;
  fechaInicio: string;
  fechaFin: string;
  estado: 'activa' | 'expirada' | 'cancelada';
  limiteClinicas: number;
  limiteDentistas: number;
  caracteristicas: string[];
}

export interface Pago {
  id: string;
  usuarioId: string;
  membresiaId: string;
  monto: number;
  moneda: string;
  fechaPago: string;
  metodo: 'tarjeta' | 'transferencia' | 'paypal';
  estado: 'completado' | 'pendiente' | 'fallido';
  referencia: string;
}

// ==================== SISTEMA DENTAL ORIGINAL ====================

export interface Clinica {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  usuarioId?: string;
}

export interface Dentista {
  id: string;
  clinicaId: string;
  nombre: string;
  especialidad: string;
  telefono: string;
  email: string;
  usuarioId?: string;
}

export interface Servicio {
  id: string;
  categoria: string;
  nombre: string;
  precioBase: number;
  activo: boolean;
  usuarioId?: string;
}

export interface Laboratorista {
  id: string;
  nombre: string;
  especialidad: string;
  telefono: string;
  email: string;
  activo: boolean;
  usuarioId?: string;
}

export interface ServicioTrabajo {
  servicioId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Trabajo {
  id: string;
  clinicaId: string;
  dentistaId: string;
  laboratoristaId?: string;
  paciente: string;
  servicios: ServicioTrabajo[];
  fechaRecibido: string;
  fechaEntrega: string;
  estado: 'pendiente' | 'produccion' | 'terminado' | 'entregado';
  precioTotal: number;
  observaciones?: string;
  usuarioId?: string;
}

// ==================== DATOS DEL SISTEMA ====================

// Planes de membresía disponibles
export const planesMembresia = [
  {
    id: 'gratuita',
    nombre: 'Plan Gratuito',
    precio: 0,
    duracionDias: 30,
    limiteClinicas: 1,
    limiteDentistas: 2,
    caracteristicas: [
      'Hasta 1 clínica',
      'Hasta 2 dentistas',
      'Gestión básica de trabajos',
      'Soporte por email'
    ]
  },
  {
    id: 'basica',
    nombre: 'Plan Básica',
    precio: 49,
    duracionDias: 30,
    limiteClinicas: 3,
    limiteDentistas: 10,
    caracteristicas: [
      'Hasta 3 clínicas',
      'Hasta 10 dentistas',
      'Gestión completa de trabajos',
      'Reportes básicos',
      'Soporte prioritario'
    ]
  },
  {
    id: 'premium',
    nombre: 'Plan Premium',
    precio: 99,
    duracionDias: 30,
    limiteClinicas: 10,
    limiteDentistas: 30,
    caracteristicas: [
      'Hasta 10 clínicas',
      'Hasta 30 dentistas',
      'Gestión avanzada',
      'Reportes detallados',
      'Soporte 24/7',
      'Backup automático'
    ]
  },
  {
    id: 'empresarial',
    nombre: 'Plan Empresarial',
    precio: 199,
    duracionDias: 30,
    limiteClinicas: 100,
    limiteDentistas: 200,
    caracteristicas: [
      'Clínicas ilimitadas',
      'Dentistas ilimitados',
      'Todas las funciones premium',
      'API personalizada',
      'Soporte dedicado',
      'Entrenamiento incluido'
    ]
  }
];

// Usuarios del sistema
export const usuarios: Usuario[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    nombre: 'Administrador Sistema',
    email: 'admin@dentalflow.com',
    telefono: '+1234567890',
    laboratorio: 'DentalFlow',
    role: 'admin',
    fechaRegistro: '2024-01-01',
    activo: true
  },
  {
    id: '2',
    username: 'tecnodentille',
    password: 'tecno2024',
    nombre: 'Tecnodentille Admin',
    email: 'admin@tecnodentille.com',
    telefono: '+1234567891',
    laboratorio: 'Tecnodentille',
    role: 'cliente',
    fechaRegistro: '2024-01-15',
    activo: true
  },
  {
    id: '3',
    username: 'tecnico',
    password: 'tecnico123',
    nombre: 'Técnico Dental',
    email: 'tecnico@dentalflow.com',
    telefono: '+1234567892',
    laboratorio: 'DentalFlow',
    role: 'tecnico',
    fechaRegistro: '2024-01-01',
    activo: true
  }
];

// Membresías activas
export const membresias: Membresia[] = [
  {
    id: 'm1',
    usuarioId: '2',
    tipo: 'premium',
    precio: 99,
    duracionDias: 30,
    fechaInicio: '2024-01-15',
    fechaFin: '2024-02-14',
    estado: 'activa',
    limiteClinicas: 10,
    limiteDentistas: 30,
    caracteristicas: ['Gestión avanzada', 'Reportes detallados', 'Soporte 24/7']
  }
];

// Pagos realizados
export const pagos: Pago[] = [
  {
    id: 'p1',
    usuarioId: '2',
    membresiaId: 'm1',
    monto: 99,
    moneda: 'USD',
    fechaPago: '2024-01-15',
    metodo: 'tarjeta',
    estado: 'completado',
    referencia: 'TXN-001'
  }
];

// ==================== DATOS DENTALES ORIGINALES ====================

export const categorias = {
  fija: '🦷 Prótesis Fija',
  removible: '👄 Prótesis Removible',
  implantes: '⚡ Implantes',
  ortodoncia: '🎯 Ortodoncia',
  reparaciones: '🔧 Reparaciones y Otros'
};

// Clínicas (ahora asociadas a usuarios)
export const clinicas: Clinica[] = [
  {
    id: '1',
    nombre: 'Clínica Dental Smile',
    direccion: 'Av. Principal 123, Ciudad',
    telefono: '555-0101',
    email: 'info@smiledental.com',
    usuarioId: '2'
  },
  {
    id: '2',
    nombre: 'Centro Odontológico Moderno',
    direccion: 'Calle Secundaria 456, Ciudad',
    telefono: '555-0102',
    email: 'contacto@modernodental.com',
    usuarioId: '2'
  },
  {
    id: '3',
    nombre: 'Clínica Dental Ejemplo',
    direccion: 'Av. Demo 789, Ciudad',
    telefono: '555-0103',
    email: 'info@demo.com'
  }
];

// Dentistas (ahora asociados a usuarios)
export const dentistas: Dentista[] = [
  {
    id: '1',
    clinicaId: '1',
    nombre: 'Dr. Carlos Rodríguez',
    especialidad: 'Ortodoncia',
    telefono: '555-0201',
    email: 'carlos@smiledental.com',
    usuarioId: '2'
  },
  {
    id: '2',
    clinicaId: '1',
    nombre: 'Dra. María González',
    especialidad: 'Endodoncia',
    telefono: '555-0202',
    email: 'maria@smiledental.com',
    usuarioId: '2'
  },
  {
    id: '3',
    clinicaId: '2',
    nombre: 'Dr. Roberto Sánchez',
    especialidad: 'Implantes',
    telefono: '555-0203',
    email: 'roberto@modernodental.com',
    usuarioId: '2'
  },
  {
    id: '4',
    clinicaId: '3',
    nombre: 'Dr. Ejemplo Sistema',
    especialidad: 'General',
    telefono: '555-0204',
    email: 'doctor@sistema.com'
  }
];

// Servicios (mezcla de servicios del sistema y personalizados)
export const servicios: Servicio[] = [
  {
    id: 'f1',
    categoria: 'fija',
    nombre: 'Corona Metal Porcelana',
    precioBase: 150,
    activo: true
  },
  {
    id: 'f2',
    categoria: 'fija',
    nombre: 'Corona de Zirconio',
    precioBase: 250,
    activo: true
  },
  {
    id: 'r1',
    categoria: 'removible',
    nombre: 'Prótesis Acrílica Completa',
    precioBase: 200,
    activo: true
  },
  {
    id: 'i1',
    categoria: 'implantes',
    nombre: 'Corona sobre Implante',
    precioBase: 400,
    activo: true
  },
  {
    id: 'tecno1',
    categoria: 'implantes',
    nombre: 'Implante Dental Premium con Zirconio',
    precioBase: 600,
    activo: true,
    usuarioId: '2'
  },
  {
    id: 'tecno2',
    categoria: 'fija',
    nombre: 'Carilla de Porcelana Premium',
    precioBase: 300,
    activo: true,
    usuarioId: '2'
  }
];

// Laboratoristas
export const laboratoristas: Laboratorista[] = [
  {
    id: 'lab1',
    nombre: 'Juan Pérez',
    especialidad: 'Prótesis Fija',
    telefono: '555-0301',
    email: 'juan@laboratorio.com',
    activo: true,
    usuarioId: '2'
  },
  {
    id: 'lab2',
    nombre: 'Ana López',
    especialidad: 'Prótesis Removible',
    telefono: '555-0302',
    email: 'ana@laboratorio.com',
    activo: true,
    usuarioId: '2'
  },
  {
    id: 'lab3',
    nombre: 'Carlos Martínez',
    especialidad: 'Implantes',
    telefono: '555-0303',
    email: 'carlos@laboratorio.com',
    activo: true
  }
];

// Trabajos
export const trabajos: Trabajo[] = [
  {
    id: 't1',
    clinicaId: '1',
    dentistaId: '1',
    laboratoristaId: 'lab1',
    paciente: 'Roberto García',
    servicios: [
      {
        servicioId: 'f2',
        cantidad: 1,
        precioUnitario: 250
      }
    ],
    fechaRecibido: '2024-01-15',
    fechaEntrega: '2024-01-22',
    estado: 'terminado',
    precioTotal: 250,
    observaciones: 'Pieza 11',
    usuarioId: '2'
  },
  {
    id: 't2',
    clinicaId: '1',
    dentistaId: '2',
    laboratoristaId: 'lab2',
    paciente: 'Laura Martínez',
    servicios: [
      {
        servicioId: 'r1',
        cantidad: 1,
        precioUnitario: 200
      }
    ],
    fechaRecibido: '2024-01-16',
    fechaEntrega: '2024-01-23',
    estado: 'produccion',
    precioTotal: 200,
    usuarioId: '2'
  }
];

// Configuración del sistema
export const settings = {
  taxNatural: 0,
  taxJuridica: 0
};

// ==================== FUNCIONES DEL SISTEMA ====================

// Funciones para usuarios y membresías
export const crearUsuario = (usuarioData: Omit<Usuario, 'id' | 'fechaRegistro' | 'activo'>) => {
  const nuevoUsuario: Usuario = {
    ...usuarioData,
    id: 'u' + (usuarios.length + 1),
    fechaRegistro: new Date().toISOString().split('T')[0],
    activo: true
  };
  usuarios.push(nuevoUsuario);
  return nuevoUsuario;
};

export const activarMembresia = (usuarioId: string, tipoMembresia: string, datosPago: any) => {
  const plan = planesMembresia.find(p => p.id === tipoMembresia);
  if (!plan) throw new Error('Plan no encontrado');

  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setDate(fechaFin.getDate() + plan.duracionDias);

  const nuevaMembresia: Membresia = {
    id: 'm' + (membresias.length + 1),
    usuarioId,
    tipo: plan.id as any,
    precio: plan.precio,
    duracionDias: plan.duracionDias,
    fechaInicio: fechaInicio.toISOString().split('T')[0],
    fechaFin: fechaFin.toISOString().split('T')[0],
    estado: 'activa',
    limiteClinicas: plan.limiteClinicas,
    limiteDentistas: plan.limiteDentistas,
    caracteristicas: plan.caracteristicas
  };

  const nuevoPago: Pago = {
    id: 'p' + (pagos.length + 1),
    usuarioId,
    membresiaId: nuevaMembresia.id,
    monto: plan.precio,
    moneda: 'USD',
    fechaPago: new Date().toISOString().split('T')[0],
    metodo: datosPago.metodo,
    estado: 'completado',
    referencia: 'TXN-' + Date.now()
  };

  membresias.push(nuevaMembresia);
  pagos.push(nuevoPago);

  return { membresia: nuevaMembresia, pago: nuevoPago };
};

export const obtenerMembresiaActiva = (usuarioId: string) => {
  return membresias.find(m => 
    m.usuarioId === usuarioId && 
    m.estado === 'activa' && 
    new Date(m.fechaFin) >= new Date()
  );
};

export const verificarLimitesMembresia = (usuarioId: string) => {
  const membresia = obtenerMembresiaActiva(usuarioId);
  if (!membresia) return { puedeOperar: false, motivo: 'No tiene membresía activa' };

  const clinicasUsuario = clinicas.filter(c => c.usuarioId === usuarioId).length;
  const dentistasUsuario = dentistas.filter(d => d.usuarioId === usuarioId).length;

  if (clinicasUsuario >= membresia.limiteClinicas) {
    return { puedeOperar: false, motivo: 'Límite de clínicas alcanzado' };
  }

  if (dentistasUsuario >= membresia.limiteDentistas) {
    return { puedeOperar: false, motivo: 'Límite de dentistas alcanzado' };
  }

  return { puedeOperar: true, limites: membresia };
};

// Funciones para filtrar datos por usuario
export const obtenerClinicasUsuario = (usuarioId: string) => {
  if (usuarioId === '1') return clinicas;
  return clinicas.filter(c => !c.usuarioId || c.usuarioId === usuarioId);
};

export const obtenerDentistasUsuario = (usuarioId: string) => {
  if (usuarioId === '1') return dentistas;
  return dentistas.filter(d => !d.usuarioId || d.usuarioId === usuarioId);
};

export const obtenerServiciosUsuario = (usuarioId: string) => {
  if (usuarioId === '1') return servicios;
  return servicios.filter(s => !s.usuarioId || s.usuarioId === usuarioId);
};

export const obtenerLaboratoristasUsuario = (usuarioId: string) => {
  if (usuarioId === '1') return laboratoristas;
  return laboratoristas.filter(l => !l.usuarioId || l.usuarioId === usuarioId);
};

export const obtenerTrabajosUsuario = (usuarioId: string) => {
  if (usuarioId === '1') return trabajos;
  return trabajos.filter(t => t.usuarioId === usuarioId);
};

// Funciones originales para Laboratoristas
export const agregarLaboratorista = (laboratorista: Omit<Laboratorista, 'id'>) => {
  const nuevoLaboratorista: Laboratorista = {
    ...laboratorista,
    id: 'lab' + (laboratoristas.length + 1)
  };
  laboratoristas.push(nuevoLaboratorista);
  return nuevoLaboratorista;
};

export const actualizarLaboratorista = (id: string, datos: Partial<Laboratorista>) => {
  const index = laboratoristas.findIndex(l => l.id === id);
  if (index !== -1) {
    laboratoristas[index] = { ...laboratoristas[index], ...datos };
  }
};

export const eliminarLaboratorista = (id: string) => {
  const index = laboratoristas.findIndex(l => l.id === id);
  if (index !== -1) {
    laboratoristas.splice(index, 1);
  }
};

export const toggleActivoLaboratorista = (id: string) => {
  const index = laboratoristas.findIndex(l => l.id === id);
  if (index !== -1) {
    laboratoristas[index].activo = !laboratoristas[index].activo;
  }
};

// Funciones originales para Servicios
export const agregarServicio = (servicio: Omit<Servicio, 'id'>) => {
  const nuevoServicio: Servicio = {
    ...servicio,
    id: 's' + (servicios.length + 1)
  };
  servicios.push(nuevoServicio);
  return nuevoServicio;
};

export const actualizarServicio = (id: string, datos: Partial<Servicio>) => {
  const index = servicios.findIndex(s => s.id === id);
  if (index !== -1) {
    servicios[index] = { ...servicios[index], ...datos };
  }
};

export const eliminarServicio = (id: string) => {
  const index = servicios.findIndex(s => s.id === id);
  if (index !== -1) {
    servicios.splice(index, 1);
  }
};

export const toggleActivoServicio = (id: string) => {
  const index = servicios.findIndex(s => s.id === id);
  if (index !== -1) {
    servicios[index].activo = !servicios[index].activo;
  }
};

// Función para inicializar datos de demo para nuevos usuarios
export const inicializarDatosDemo = (usuarioId: string, laboratorioNombre: string) => {
  const nuevaClinica: Clinica = {
    id: 'demo-' + Date.now(),
    nombre: `${laboratorioNombre} - Clínica Principal`,
    direccion: 'Dirección de ejemplo, Ciudad',
    telefono: '555-0000',
    email: `contacto@${laboratorioNombre.toLowerCase().replace(/\s+/g, '')}.com`,
    usuarioId: usuarioId
  };
  clinicas.push(nuevaClinica);

  const nuevoDentista: Dentista = {
    id: 'demo-dent-' + Date.now(),
    clinicaId: nuevaClinica.id,
    nombre: 'Dr. Ejemplo Demo',
    especialidad: 'Odontología General',
    telefono: '555-0001',
    email: `doctor@${laboratorioNombre.toLowerCase().replace(/\s+/g, '')}.com`,
    usuarioId: usuarioId
  };
  dentistas.push(nuevoDentista);

  return { clinica: nuevaClinica, dentista: nuevoDentista };
};

// ==================== FUNCIONES PARA EL PANEL DE ADMINISTRACIÓN ====================

export const toggleActivoUsuario = (usuarioId: string) => {
  const index = usuarios.findIndex(u => u.id === usuarioId);
  if (index !== -1) {
    usuarios[index].activo = !usuarios[index].activo;
  }
};

export const eliminarUsuario = (usuarioId: string) => {
  const index = usuarios.findIndex(u => u.id === usuarioId);
  if (index !== -1) {
    usuarios.splice(index, 1);
    
    // Eliminar membresías asociadas
    const indexMembresia = membresias.findIndex(m => m.usuarioId === usuarioId);
    if (indexMembresia !== -1) {
      membresias.splice(indexMembresia, 1);
    }
    
    // Eliminar pagos asociados
    const pagosUsuario = pagos.filter(p => p.usuarioId === usuarioId);
    pagosUsuario.forEach(pago => {
      const indexPago = pagos.findIndex(p => p.id === pago.id);
      if (indexPago !== -1) {
        pagos.splice(indexPago, 1);
      }
    });

    // Eliminar datos dentales asociados
    const clinicasUsuario = clinicas.filter(c => c.usuarioId === usuarioId);
    clinicasUsuario.forEach(clinica => {
      const indexClinica = clinicas.findIndex(c => c.id === clinica.id);
      if (indexClinica !== -1) {
        clinicas.splice(indexClinica, 1);
      }
    });

    const dentistasUsuario = dentistas.filter(d => d.usuarioId === usuarioId);
    dentistasUsuario.forEach(dentista => {
      const indexDentista = dentistas.findIndex(d => d.id === dentista.id);
      if (indexDentista !== -1) {
        dentistas.splice(indexDentista, 1);
      }
    });

    const serviciosUsuario = servicios.filter(s => s.usuarioId === usuarioId);
    serviciosUsuario.forEach(servicio => {
      const indexServicio = servicios.findIndex(s => s.id === servicio.id);
      if (indexServicio !== -1) {
        servicios.splice(indexServicio, 1);
      }
    });

    const laboratoristasUsuario = laboratoristas.filter(l => l.usuarioId === usuarioId);
    laboratoristasUsuario.forEach(laboratorista => {
      const indexLaboratorista = laboratoristas.findIndex(l => l.id === laboratorista.id);
      if (indexLaboratorista !== -1) {
        laboratoristas.splice(indexLaboratorista, 1);
      }
    });

    const trabajosUsuario = trabajos.filter(t => t.usuarioId === usuarioId);
    trabajosUsuario.forEach(trabajo => {
      const indexTrabajo = trabajos.findIndex(t => t.id === trabajo.id);
      if (indexTrabajo !== -1) {
        trabajos.splice(indexTrabajo, 1);
      }
    });
  }
};

export const actualizarMembresia = (membresiaId: string, datos: Partial<Membresia>) => {
  const index = membresias.findIndex(m => m.id === membresiaId);
  if (index !== -1) {
    membresias[index] = { ...membresias[index], ...datos };
  }
};

export const extenderMembresia = (membresiaId: string, diasExtras: number) => {
  const index = membresias.findIndex(m => m.id === membresiaId);
  if (index !== -1) {
    const fechaFin = new Date(membresias[index].fechaFin);
    fechaFin.setDate(fechaFin.getDate() + diasExtras);
    membresias[index].fechaFin = fechaFin.toISOString().split('T')[0];
  }
};

export const cambiarPlanMembresia = (usuarioId: string, nuevoPlanId: string) => {
  const plan = planesMembresia.find(p => p.id === nuevoPlanId);
  if (!plan) throw new Error('Plan no encontrado');

  const index = membresias.findIndex(m => m.usuarioId === usuarioId);
  if (index !== -1) {
    membresias[index].tipo = plan.id as any;
    membresias[index].precio = plan.precio;
    membresias[index].limiteClinicas = plan.limiteClinicas;
    membresias[index].limiteDentistas = plan.limiteDentistas;
    membresias[index].caracteristicas = plan.caracteristicas;
  }
};

export const obtenerEstadisticasSistema = () => {
  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter(u => u.activo).length;
  const totalMembresias = membresias.length;
  const membresiasActivas = membresias.filter(m => m.estado === 'activa').length;
  const ingresosTotales = pagos.filter(p => p.estado === 'completado').reduce((sum, p) => sum + p.monto, 0);
  const totalTrabajos = trabajos.length;
  const trabajosPendientes = trabajos.filter(t => t.estado === 'pendiente').length;
  const trabajosProduccion = trabajos.filter(t => t.estado === 'produccion').length;
  const trabajosTerminados = trabajos.filter(t => t.estado === 'terminado').length;

  const distribucionPlanes = planesMembresia.map(plan => ({
    plan: plan.nombre,
    cantidad: membresias.filter(m => m.tipo === plan.id).length
  }));

  return {
    totalUsuarios,
    usuariosActivos,
    totalMembresias,
    membresiasActivas,
    ingresosTotales,
    totalTrabajos,
    trabajosPendientes,
    trabajosProduccion,
    trabajosTerminados,
    distribucionPlanes
  };
};

export const obtenerUsuariosConMembresia = () => {
  return usuarios.map(usuario => {
    const membresia = obtenerMembresiaActiva(usuario.id);
    const estadisticas = {
      clinicas: clinicas.filter(c => c.usuarioId === usuario.id).length,
      dentistas: dentistas.filter(d => d.usuarioId === usuario.id).length,
      trabajos: trabajos.filter(t => t.usuarioId === usuario.id).length,
      servicios: servicios.filter(s => s.usuarioId === usuario.id).length
    };

    return {
      ...usuario,
      membresia,
      estadisticas
    };
  });
};

export const obtenerPagosRecientes = (limite: number = 10) => {
  return pagos
    .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
    .slice(0, limite)
    .map(pago => {
      const usuario = usuarios.find(u => u.id === pago.usuarioId);
      const membresia = membresias.find(m => m.id === pago.membresiaId);
      
      return {
        ...pago,
        usuarioNombre: usuario?.nombre,
        usuarioLaboratorio: usuario?.laboratorio,
        planMembresia: membresia?.tipo
      };
    });
};

// Función para verificar y actualizar estados de membresías expiradas
export const actualizarEstadosMembresias = () => {
  const hoy = new Date();
  
  membresias.forEach(membresia => {
    const fechaFin = new Date(membresia.fechaFin);
    if (fechaFin < hoy && membresia.estado === 'activa') {
      membresia.estado = 'expirada';
    }
  });
};

// Inicializar la verificación de membresías expiradas
actualizarEstadosMembresias();