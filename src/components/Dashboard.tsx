import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { useMembresia } from '../hooks/useMembresia';

interface DashboardUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  laboratorio?: string;
  telefono?: string;
}

interface DashboardProps {
  user: DashboardUser;
  onLogout: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const membresia = useMembresia(user.id);

  // Estados para búsqueda y resultados
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [resultados, setResultados] = useState<{
    pacientes: any[];
    clinicas: any[];
    trabajos: any[];
  }>({
    pacientes: [],
    clinicas: [],
    trabajos: []
  });

  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    totalClinicas: 0,
    totalDentistas: 0,
    totalTrabajos: 0,
    trabajosPendientes: 0,
    trabajosProduccion: 0,
    trabajosTerminados: 0
  });

  // Estados UI
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredResultado, setHoveredResultado] = useState<string | null>(null);
  const [cargandoEstadisticas, setCargandoEstadisticas] = useState(true);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // ============================================
  // 1. CARGA DE ESTADÍSTICAS
  // ============================================
  const cargarEstadisticas = useCallback(async () => {
    try {
      setCargandoEstadisticas(true);
      const esAdmin = user.rol === 'admin';

      if (esAdmin) {
        const [
          { count: clinicasCount },
          { count: dentistasCount },
          { count: trabajosCount },
          { count: trabajosPendientes },
          { count: trabajosProduccion },
          { count: trabajosTerminados }
        ] = await Promise.all([
          supabase.from('clinicas').select('*', { count: 'exact', head: true }),
          supabase.from('dentistas').select('*', { count: 'exact', head: true }),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('estado', 'produccion'),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('estado', 'terminado')
        ]);

        setEstadisticas({
          totalClinicas: clinicasCount || 0,
          totalDentistas: dentistasCount || 0,
          totalTrabajos: trabajosCount || 0,
          trabajosPendientes: trabajosPendientes || 0,
          trabajosProduccion: trabajosProduccion || 0,
          trabajosTerminados: trabajosTerminados || 0
        });
      } else {
        const [
          { count: clinicasCount },
          { count: dentistasCount },
          { count: trabajosCount },
          { count: trabajosPendientes },
          { count: trabajosProduccion },
          { count: trabajosTerminados }
        ] = await Promise.all([
          supabase.from('clinicas').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
          supabase.from('dentistas').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id).eq('estado', 'pendiente'),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id).eq('estado', 'produccion'),
          supabase.from('trabajos').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id).eq('estado', 'terminado')
        ]);

        setEstadisticas({
          totalClinicas: clinicasCount || 0,
          totalDentistas: dentistasCount || 0,
          totalTrabajos: trabajosCount || 0,
          trabajosPendientes: trabajosPendientes || 0,
          trabajosProduccion: trabajosProduccion || 0,
          trabajosTerminados: trabajosTerminados || 0
        });
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setCargandoEstadisticas(false);
    }
  }, [user.id, user.rol]);

  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  // ============================================
  // 2. BÚSQUEDA (completa)
  // ============================================
  const handleBuscar = async (termino: string) => {
    setTerminoBusqueda(termino);
    setCargandoBusqueda(true);

    if (!termino.trim()) {
      setResultados({ pacientes: [], clinicas: [], trabajos: [] });
      setCargandoBusqueda(false);
      return;
    }

    const terminoLower = termino.toLowerCase();

    try {
      const esAdmin = user.rol === 'admin';

      const queryClinicas = supabase
        .from('clinicas')
        .select('*')
        .or(`nombre.ilike.%${terminoLower}%,email.ilike.%${terminoLower}%,telefono.ilike.%${terminoLower}%`)
        .limit(10);

      if (!esAdmin) {
        queryClinicas.eq('usuario_id', user.id);
      }

      const { data: clinicasData } = await queryClinicas;

      const queryTrabajos = supabase
        .from('trabajos')
        .select(`
          *,
          clinicas (nombre, direccion),
          dentistas (nombre, especialidad),
          laboratoristas (nombre)
        `)
        .or(`paciente.ilike.%${terminoLower}%,estado.ilike.%${terminoLower}%`)
        .limit(20);

      if (!esAdmin) {
        queryTrabajos.eq('usuario_id', user.id);
      }

      const { data: trabajosData } = await queryTrabajos;

      const pacientesEncontrados = trabajosData?.filter(t => 
        t.paciente.toLowerCase().includes(terminoLower)
      ) || [];

      const trabajosEncontrados = trabajosData?.filter(t => 
        t.estado.toLowerCase().includes(terminoLower) ||
        (t.paciente.toLowerCase().includes(terminoLower) && 
         !pacientesEncontrados.some(p => p.id === t.id))
      ) || [];

      setResultados({
        clinicas: clinicasData || [],
        pacientes: pacientesEncontrados.map((p: any) => ({
          ...p,
          tipo: 'paciente',
          clinica: p.clinicas?.nombre || 'Sin clínica',
          dentista: p.dentistas?.nombre || 'Sin dentista',
          laboratorista: p.laboratoristas?.nombre || 'No asignado',
          direccionClinica: p.clinicas?.direccion || ''
        })),
        trabajos: trabajosEncontrados.map((t: any) => ({
          ...t,
          tipo: 'trabajo',
          clinica: t.clinicas?.nombre || 'Sin clínica',
          dentista: t.dentistas?.nombre || 'Sin dentista',
          laboratorista: t.laboratoristas?.nombre || 'No asignado'
        }))
      });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setResultados({ pacientes: [], clinicas: [], trabajos: [] });
    } finally {
      setCargandoBusqueda(false);
    }
  };

  // ============================================
  // 3. LOGOUT
  // ============================================
const handleLogout = async () => {
  if (cerrandoSesion) return;
  if (!window.confirm('¿Estás seguro de que quieres cerrar sesión?')) return;
  try {
    setCerrandoSesion(true);
    await onLogout();
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
  } finally {
    setCerrandoSesion(false);
  }
};

  // ============================================
  // 4. UTILIDADES
  // ============================================
  const getBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { ...styles.badge, ...styles.badgePendiente };
      case 'produccion':
        return { ...styles.badge, ...styles.badgeProduccion };
      case 'terminado':
        return { ...styles.badge, ...styles.badgeTerminado };
      case 'entregado':
        return { ...styles.badge, ...styles.badgeEntregado };
      default:
        return { ...styles.badge, ...styles.badgePendiente };
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'produccion': return 'En Producción';
      case 'terminado': return 'Terminado';
      case 'entregado': return 'Entregado';
      default: return estado;
    }
  };

  const handleResultadoClick = (tipo: string, item: any) => {
    // Si la membresía no está activa y no es admin, no permitir navegación
    if (!membresia.estaActiva && user.rol !== 'admin') {
      alert('Tu membresía no está activa. Renueva para acceder a esta sección.');
      return;
    }
    if (tipo === 'paciente' || tipo === 'trabajo') {
      navigate('/trabajos');
    } else if (tipo === 'clinica') {
      navigate('/clinicas');
    }
  };

  const handleModuleClick = (path: string, moduleId: string) => {
    // Solo Mi Membresía está habilitado si la membresía no está activa (y no es admin)
    if (user.rol !== 'admin' && !membresia.estaActiva && moduleId !== 'mi-membresia') {
      alert('Tu membresía no está activa. Renueva para acceder a este módulo.');
      return;
    }
    navigate(path);
  };

  // ============================================
  // 5. MÓDULOS
  // ============================================
  const modulesAdmin = [
    { id: 'control-pagos', icon: '💳', title: 'Control de Pagos Manual', description: 'Registra y gestiona pagos de membresías de forma manual.', path: '/control-pagos' },
    { id: 'clinicas', icon: '🏥', title: 'Clínicas y Dentistas', description: 'Gestiona todas las clínicas dentales y odontólogos del sistema.', path: '/clinicas' },
    { id: 'crear-trabajo', icon: '📋', title: 'Crear Lista de Trabajo', description: 'Crea nuevos trabajos seleccionando clínica, dentista y servicios.', path: '/crear-trabajo' },
    { id: 'trabajos-proceso', icon: '🔧', title: 'Trabajos en Proceso', description: 'Control y seguimiento de todos los trabajos dentales en producción.', path: '/trabajos' },
    { id: 'laboratoristas', icon: '👨‍🔧', title: 'Laboratoristas', description: 'Gestiona todos los técnicos y laboratoristas del sistema.', path: '/laboratoristas' },
    { id: 'precios', icon: '💰', title: 'Lista de Precios', description: 'Configura precios base y personalizados por clínica/dentista.', path: '/precios' },
    { id: 'mi-membresia', icon: '⏳', title: 'Mi Membresía', description: 'Consulta tu plan actual y días restantes.', path: '/mi-membresia' },
    { id: 'reportes', icon: '📊', title: 'Reportes', description: 'Genera reportes de trabajos, ingresos y productividad.', path: '/reportes' },
    { id: 'admin', icon: '👑', title: 'Panel de Administración', description: 'Gestiona usuarios, membresías y ve estadísticas del sistema.', path: '/admin' },
    { id: 'opciones-cuenta', icon: '⚙️', title: 'Opciones del Sistema', description: 'Configura la información general del sistema y parámetros.', path: '/configuracion' },
    { id: 'entregas', icon: '📦', title: 'Registro de Entregas', description: 'Escanea códigos QR para registrar entregas de trabajos.', path: '/entregas' }
  ];

  const modulesCliente = [
    { id: 'clinicas', icon: '🏥', title: 'Mis Clínicas y Dentistas', description: 'Gestiona tus clínicas dentales y odontólogos asociados.', path: '/clinicas' },
    { id: 'crear-trabajo', icon: '📋', title: 'Crear Lista de Trabajo', description: 'Crea nuevos trabajos seleccionando clínica, dentista y servicios.', path: '/crear-trabajo' },
    { id: 'trabajos-proceso', icon: '🔧', title: 'Mis Trabajos en Proceso', description: 'Control y seguimiento de tus trabajos dentales en producción.', path: '/trabajos' },
    { id: 'laboratoristas', icon: '👨‍🔧', title: 'Mis Laboratoristas', description: 'Gestiona los técnicos y laboratoristas de tu laboratorio.', path: '/laboratoristas' },
    { id: 'precios', icon: '💰', title: 'Mi Lista de Precios', description: 'Configura tus precios base y personalizados.', path: '/precios' },
    { id: 'reportes', icon: '📊', title: 'Mis Reportes', description: 'Genera reportes de tus trabajos, ingresos y productividad.', path: '/reportes' },
    { id: 'opciones-cuenta', icon: '⚙️', title: 'Opciones de la Cuenta', description: 'Configura la información de tu laboratorio, logo y porcentajes.', path: '/configuracion' },
    { id: 'entregas', icon: '📦', title: 'Registro de Entregas', description: 'Escanea códigos QR para registrar entregas de trabajos.', path: '/entregas' },
    { id: 'mi-membresia', icon: '⏳', title: 'Mi Membresía', description: 'Consulta tu plan actual, días restantes y renueva tu suscripción.', path: '/mi-membresia' }
  ];

  const modules = user.rol === 'admin' ? modulesAdmin : modulesCliente;

  // ============================================
  // 6. ESTILOS COMPLETOS (ICONOS MEJORADOS)
  // ============================================
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    mainContent: {
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    welcomeSection: {
      backgroundColor: 'white',
      padding: '2.5rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem',
      position: 'relative' as const
    },
    welcomeTitle: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '0.5rem',
      color: '#1e293b'
    },
    welcomeSubtitle: {
      fontSize: '1.125rem',
      color: '#64748b',
      marginBottom: '2rem',
      lineHeight: '1.6'
    },
    adminBadge: {
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '0.25rem 0.75rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginLeft: '0.75rem',
      letterSpacing: '0.5px'
    },
    subscriptionCard: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    subscriptionItem: {
      backgroundColor: '#f1f5f9',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0'
    },
    subscriptionLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontWeight: '500',
      textTransform: 'uppercase' as const,
      marginBottom: '0.5rem',
      letterSpacing: '0.5px'
    },
    subscriptionValue: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    planBadge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    planActive: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    planInactive: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    daysBadge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginLeft: '0.5rem'
    },
    searchContainer: {
      marginBottom: '2rem',
      position: 'relative' as const
    },
    searchInput: {
      width: '100%',
      padding: '1rem 1.5rem',
      paddingLeft: '3rem',
      border: '1px solid #cbd5e1',
      borderRadius: '0.75rem',
      fontSize: '1rem',
      boxSizing: 'border-box' as const,
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s'
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#64748b',
      fontSize: '1.25rem'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1.5rem',
      marginBottom: '3rem'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      textAlign: 'center' as const,
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    statNumber: {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: '#3b82f6',
      marginBottom: '0.5rem'
    },
    statLabel: {
      fontSize: '0.95rem',
      color: '#64748b',
      fontWeight: '500'
    },
    modulesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '3rem'
    },
    moduleCard: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative' as const,
      borderLeft: '4px solid #3b82f6'
    },
    moduleCardDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed',
      borderLeft: '4px solid #94a3b8',
      filter: 'grayscale(20%)',
      backgroundColor: '#f9fafb'
    },
    // ✅ ICONOS MEJORADOS - VERSIÓN SÓLIDA CON SOMBRA
    moduleIcon: {
      fontSize: '2.2rem',
      marginBottom: '1rem',
      color: '#3b82f6',
      filter: 'drop-shadow(0 4px 3px rgba(0,0,0,0.07))',
      transition: 'all 0.2s ease'
    },
    moduleIconDisabled: {
      fontSize: '2.2rem',
      marginBottom: '1rem',
      color: '#94a3b8',
      filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.03))',
      opacity: 0.8,
      transition: 'all 0.2s ease'
    },
    moduleTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      marginBottom: '0.75rem',
      color: '#1e293b'
    },
    moduleDescription: {
      color: '#64748b',
      lineHeight: '1.6',
      marginBottom: '1.5rem',
      fontSize: '0.95rem'
    },
    moduleButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.625rem 1.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    moduleButtonDisabled: {
      backgroundColor: '#94a3b8',
      cursor: 'not-allowed',
      opacity: 0.7
    },
    // ✅ CANDADO ELEGANTE
    lockOverlay: {
      position: 'absolute' as const,
      top: '0.75rem',
      right: '0.75rem',
      fontSize: '1.2rem',
      color: '#94a3b8',
      backgroundColor: 'white',
      padding: '0.25rem',
      borderRadius: '9999px',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
      zIndex: 10
    },
    resultadosContainer: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      padding: '2rem',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    },
    resultadoTitle: {
      fontSize: '1.5rem',
      fontWeight: '600',
      marginBottom: '1.5rem',
      color: '#1e293b'
    },
    resultadoSection: {
      marginBottom: '2rem'
    },
    resultadoSectionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      marginBottom: '1rem',
      color: '#475569',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    resultadoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1rem'
    },
    resultadoItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    resultadoItemHover: {
      backgroundColor: '#f1f5f9',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    badge: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginLeft: '0.5rem'
    },
    badgePendiente: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    badgeProduccion: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    badgeTerminado: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    badgeEntregado: {
      backgroundColor: '#e5e7eb',
      color: '#374151'
    },
    loadingIndicator: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '3rem'
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '3rem',
      color: '#64748b'
    }
  };

  // ============================================
  // 7. RENDERIZADO
  // ============================================
  const esAdmin = user.rol === 'admin';
  const membresiaActiva = membresia.estaActiva;
  const mostrarBusquedaYEstadisticas = esAdmin || membresiaActiva;

  return (
    <div style={styles.container}>
      <Header
        user={user}
        onLogout={handleLogout}
        cerrandoSesion={cerrandoSesion}
        showTitle
        title="Dashboard - DentalFlow Manager"
      />

      <main style={styles.mainContent}>
        {/* Welcome Section - siempre visible */}
        <section style={styles.welcomeSection}>
          <h1 style={styles.welcomeTitle}>
            ¡Bienvenido de nuevo, {user.nombre}!
            {esAdmin && <span style={styles.adminBadge}>ADMINISTRADOR</span>}
          </h1>
          <p style={styles.welcomeSubtitle}>
            {esAdmin
              ? 'Sistema de gestión completo - Modo Administrador'
              : `Gestión completa de tu laboratorio dental ${user.laboratorio ? `- ${user.laboratorio}` : ''}`
            }
          </p>

          {/* Subscription Info - siempre visible */}
          <div style={styles.subscriptionCard}>
            <div style={styles.subscriptionItem}>
              <div style={styles.subscriptionLabel}>Plan Actual</div>
              <div style={styles.subscriptionValue}>
                {membresia.cargando ? 'Cargando...' : (() => {
                  switch (membresia.plan) {
                    case 'gratuita': return 'Prueba Gratuita';
                    case 'profesional': return 'Profesional';
                    case 'empresarial': return 'Empresarial';
                    default: return membresia.plan;
                  }
                })()}
                {!membresia.cargando && (
                  <span style={{
                    ...styles.planBadge,
                    ...(membresiaActiva ? styles.planActive : styles.planInactive)
                  }}>
                    {membresiaActiva ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.subscriptionItem}>
              <div style={styles.subscriptionLabel}>Días Restantes</div>
              <div style={styles.subscriptionValue}>
                {membresia.cargando ? '...' : `${membresia.dias_restantes} días`}
                {!membresia.cargando && membresia.dias_restantes > 0 && (
                  <span style={{
                    ...styles.daysBadge,
                    backgroundColor: membresia.dias_restantes > 7 ? '#10b981' : membresia.dias_restantes > 3 ? '#f59e0b' : '#ef4444',
                    color: 'white'
                  }}>
                    {membresia.dias_restantes > 7 ? '✔ OK' : membresia.dias_restantes > 3 ? '⚠ PRONTO' : '⚠ VENCE PRONTO'}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.subscriptionItem}>
              <div style={styles.subscriptionLabel}>Email</div>
              <div style={styles.subscriptionValue}>{user.email}</div>
            </div>

            {user.telefono && (
              <div style={styles.subscriptionItem}>
                <div style={styles.subscriptionLabel}>Teléfono</div>
                <div style={styles.subscriptionValue}>📞 {user.telefono}</div>
              </div>
            )}
          </div>

          {/* Search - solo visible para admin o membresía activa */}
          {mostrarBusquedaYEstadisticas && (
            <div style={styles.searchContainer}>
              <div style={styles.searchIcon}>🔍</div>
              <input
                type="text"
                style={styles.searchInput}
                placeholder="Buscar pacientes, clínicas, trabajos, servicios..."
                value={terminoBusqueda}
                onChange={(e) => handleBuscar(e.target.value)}
                onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'}
                onBlur={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
              />
            </div>
          )}
        </section>

        {/* Stats Grid - solo visible para admin o membresía activa */}
        {mostrarBusquedaYEstadisticas && (
          <div style={styles.statsGrid}>
            <div
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
              }}
            >
              <div style={styles.statNumber}>
                {cargandoEstadisticas ? '...' : estadisticas.totalClinicas}
              </div>
              <div style={styles.statLabel}>Clínicas</div>
            </div>
            <div
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
              }}
            >
              <div style={styles.statNumber}>
                {cargandoEstadisticas ? '...' : estadisticas.totalDentistas}
              </div>
              <div style={styles.statLabel}>Dentistas</div>
            </div>
            <div
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
              }}
            >
              <div style={styles.statNumber}>
                {cargandoEstadisticas ? '...' : estadisticas.totalTrabajos}
              </div>
              <div style={styles.statLabel}>Total Trabajos</div>
            </div>
            <div
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ ...styles.statNumber, color: '#ef4444' }}>
                {cargandoEstadisticas ? '...' : estadisticas.trabajosPendientes}
              </div>
              <div style={styles.statLabel}>Trabajos Pendientes</div>
            </div>
          </div>
        )}

        {/* Search Results - solo visible si hay búsqueda y está permitido */}
        {mostrarBusquedaYEstadisticas && terminoBusqueda.trim() && (
          <div style={styles.resultadosContainer}>
            <h3 style={styles.resultadoTitle}>
              Resultados para: "{terminoBusqueda}"
              {cargandoBusqueda && (
                <span style={{ color: '#64748b', fontSize: '0.875rem', marginLeft: '1rem' }}>
                  Buscando...
                </span>
              )}
            </h3>

            {/* Clínicas */}
            {!cargandoBusqueda && resultados.clinicas.length > 0 && (
              <div style={styles.resultadoSection}>
                <h4 style={styles.resultadoSectionTitle}>
                  <span>🏥</span>
                  Clínicas ({resultados.clinicas.length})
                </h4>
                <div style={styles.resultadoGrid}>
                  {resultados.clinicas.map((clinica: any, index: number) => (
                    <div
                      key={`clinica-${index}`}
                      style={{
                        ...styles.resultadoItem,
                        ...(hoveredResultado === `clinica-${index}` ? styles.resultadoItemHover : {})
                      }}
                      onMouseEnter={() => setHoveredResultado(`clinica-${index}`)}
                      onMouseLeave={() => setHoveredResultado(null)}
                      onClick={() => handleResultadoClick('clinica', clinica)}
                    >
                      <div>
                        <strong>{clinica.nombre}</strong>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        {clinica.direccion}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        {clinica.telefono} • {clinica.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pacientes */}
            {!cargandoBusqueda && resultados.pacientes.length > 0 && (
              <div style={styles.resultadoSection}>
                <h4 style={styles.resultadoSectionTitle}>
                  <span>👤</span>
                  Pacientes ({resultados.pacientes.length})
                </h4>
                <div style={styles.resultadoGrid}>
                  {resultados.pacientes.map((paciente: any, index: number) => (
                    <div
                      key={`paciente-${index}`}
                      style={{
                        ...styles.resultadoItem,
                        ...(hoveredResultado === `paciente-${index}` ? styles.resultadoItemHover : {})
                      }}
                      onMouseEnter={() => setHoveredResultado(`paciente-${index}`)}
                      onMouseLeave={() => setHoveredResultado(null)}
                      onClick={() => handleResultadoClick('paciente', paciente)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong>{paciente.paciente}</strong>
                        <span style={getBadgeStyle(paciente.estado)}>
                          {getEstadoText(paciente.estado)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        {paciente.clinica} • {paciente.dentista}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        ${paciente.precio_total || 0}
                        {paciente.laboratorista && ` • 👨‍🔧 ${paciente.laboratorista}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trabajos */}
            {!cargandoBusqueda && resultados.trabajos.length > 0 && (
              <div style={styles.resultadoSection}>
                <h4 style={styles.resultadoSectionTitle}>
                  <span>🔧</span>
                  Trabajos ({resultados.trabajos.length})
                </h4>
                <div style={styles.resultadoGrid}>
                  {resultados.trabajos.map((trabajo: any, index: number) => (
                    <div
                      key={`trabajo-${index}`}
                      style={{
                        ...styles.resultadoItem,
                        ...(hoveredResultado === `trabajo-${index}` ? styles.resultadoItemHover : {})
                      }}
                      onMouseEnter={() => setHoveredResultado(`trabajo-${index}`)}
                      onMouseLeave={() => setHoveredResultado(null)}
                      onClick={() => handleResultadoClick('trabajo', trabajo)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong>{trabajo.paciente}</strong>
                        <span style={getBadgeStyle(trabajo.estado)}>
                          {getEstadoText(trabajo.estado)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                        {trabajo.clinica} • {trabajo.dentista}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        Laboratorista: {trabajo.laboratorista} • ${trabajo.precio_total || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!cargandoBusqueda && resultados.pacientes.length === 0 &&
              resultados.clinicas.length === 0 &&
              resultados.trabajos.length === 0 && (
                <div style={styles.emptyState}>
                  No se encontraron resultados para "{terminoBusqueda}"
                </div>
              )}
          </div>
        )}

        {/* Modules Grid - SIEMPRE visible, con estados habilitado/deshabilitado */}
        {!terminoBusqueda.trim() && (
          <>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '2rem',
              color: '#1e293b'
            }}>
              {esAdmin ? 'Módulos del Sistema' : (membresiaActiva ? 'Módulos del Sistema' : 'Acceso Restringido')}
            </h2>

            <div style={styles.modulesGrid}>
              {modules.map(module => {
                const deshabilitado = !esAdmin && !membresiaActiva && module.id !== 'mi-membresia';

                return (
                  <div
                    key={module.id}
                    style={{
                      ...styles.moduleCard,
                      ...(deshabilitado ? styles.moduleCardDisabled : {}),
                      ...(hoveredCard === module.id && !deshabilitado ? {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      } : {})
                    }}
                    onMouseEnter={() => !deshabilitado && setHoveredCard(module.id)}
                    onMouseLeave={() => !deshabilitado && setHoveredCard(null)}
                    onClick={() => !deshabilitado && handleModuleClick(module.path, module.id)}
                  >
                    <div style={{
                      ...styles.moduleIcon,
                      ...(deshabilitado ? styles.moduleIconDisabled : {})
                    }}>
                      {module.icon}
                    </div>
                    <h3 style={styles.moduleTitle}>{module.title}</h3>
                    <p style={styles.moduleDescription}>{module.description}</p>
                    {deshabilitado && (
                      <div style={styles.lockOverlay}>🔒</div>
                    )}
                    <button
                      style={{
                        ...styles.moduleButton,
                        ...(deshabilitado ? styles.moduleButtonDisabled : {})
                      }}
                      disabled={deshabilitado}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!deshabilitado) handleModuleClick(module.path, module.id);
                      }}
                      onMouseEnter={(e) => {
                        if (!deshabilitado) e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        if (!deshabilitado) e.currentTarget.style.backgroundColor = '#3b82f6';
                      }}
                    >
                      {module.id === 'mi-membresia' && 'Ver Membresía'}
                      {module.id === 'clinicas' && (esAdmin ? 'Gestionar Clínicas' : 'Mis Clínicas')}
                      {module.id === 'crear-trabajo' && 'Crear Trabajo'}
                      {module.id === 'trabajos-proceso' && (esAdmin ? 'Ver Trabajos' : 'Mis Trabajos')}
                      {module.id === 'laboratoristas' && (esAdmin ? 'Gestionar Técnicos' : 'Mis Laboratoristas')}
                      {module.id === 'precios' && (esAdmin ? 'Gestionar Precios' : 'Mis Precios')}
                      {module.id === 'reportes' && (esAdmin ? 'Ver Reportes' : 'Mis Reportes')}
                      {module.id === 'admin' && 'Panel de Admin'}
                      {module.id === 'opciones-cuenta' && (esAdmin ? 'Configurar Sistema' : 'Configurar Cuenta')}
                      {module.id === 'control-pagos' && 'Gestionar Pagos'}
                      {module.id === 'entregas' && 'Registrar Entregas'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Mensaje adicional para clientes con membresía inactiva */}
            {!esAdmin && !membresiaActiva && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginTop: '1rem',
                textAlign: 'center' as const
              }}>
                <p style={{ margin: 0, color: '#92400e', fontSize: '1rem' }}>
                  ⚠️ Tu membresía no está activa. Solo puedes acceder al módulo "Mi Membresía" para renovar.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;