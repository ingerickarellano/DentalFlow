import React, { useState, useEffect } from 'react';
import { 
  usuarios, 
  membresias, 
  pagos, 
  clinicas, 
  dentistas, 
  trabajos,
  planesMembresia,
  eliminarUsuario,
  toggleActivoUsuario,
  actualizarMembresia
} from '../data/database';

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [vistaActiva, setVistaActiva] = useState<'clientes' | 'membresias' | 'pagos' | 'estadisticas'>('clientes');
  const [busqueda, setBusqueda] = useState('');

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: 'bold'
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      marginRight: '0.5rem'
    },
    nav: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      flexWrap: 'wrap' as const
    },
    navButton: {
      padding: '0.75rem 1.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      backgroundColor: 'white',
      color: '#374151',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    navButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb'
    },
    searchContainer: {
      marginBottom: '2rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    },
    searchInput: {
      padding: '0.75rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      minWidth: '300px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center' as const
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#2563eb',
      margin: '0.5rem 0'
    },
    statLabel: {
      color: '#64748b',
      fontSize: '0.875rem'
    },
    table: {
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    tableHeader: {
      backgroundColor: '#f8fafc',
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'grid',
      alignItems: 'center',
      fontWeight: '600',
      color: '#374151'
    },
    tableRow: {
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'grid',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    },
    tableRowHover: {
      backgroundColor: '#f8fafc'
    },
    badge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      display: 'inline-block'
    },
    badgeActive: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    badgeWarning: {
  backgroundColor: '#fef3c7',
  color: '#d97706',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
},
    badgeInactive: {
      backgroundColor: '#fef2f2',
      color: '#991b1b'
    },
    badgePremium: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    badgeBasic: {
      backgroundColor: '#f0f9ff',
      color: '#0369a1'
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.5rem'
    },
    button: {
      padding: '0.375rem 0.75rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    buttonPrimary: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    buttonDanger: {
      backgroundColor: '#dc2626',
      color: 'white'
    },
    buttonSuccess: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    buttonWarning: {
      backgroundColor: '#f59e0b',
      color: 'white'
    },
    modal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.5rem',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    formGroup: {
      marginBottom: '1rem'
    },
    label: {
      display: 'block',
      color: '#374151',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem'
    },
    select: {
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      backgroundColor: 'white'
    }
    
  };

  // Estadísticas del sistema
  const estadisticas = {
    totalUsuarios: usuarios.length,
    usuariosActivos: usuarios.filter(u => u.activo).length,
    totalMembresias: membresias.length,
    membresiasActivas: membresias.filter(m => m.estado === 'activa').length,
    ingresosTotales: pagos.filter(p => p.estado === 'completado').reduce((sum, p) => sum + p.monto, 0),
    totalTrabajos: trabajos.length
  };

  // Filtrar datos según búsqueda
  const usuariosFiltrados = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.laboratorio.toLowerCase().includes(busqueda.toLowerCase())
  );

  const membresiasFiltradas = membresias.filter(m => {
    const usuario = usuarios.find(u => u.id === m.usuarioId);
    return usuario?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
           usuario?.email.toLowerCase().includes(busqueda.toLowerCase());
  });

  const pagosFiltrados = pagos.filter(p => {
    const usuario = usuarios.find(u => u.id === p.usuarioId);
    return usuario?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
           p.referencia.toLowerCase().includes(busqueda.toLowerCase());
  });

  // Funciones de gestión
  const handleToggleActivo = (usuarioId: string) => {
    toggleActivoUsuario(usuarioId);
    // Forzar re-render
    setVistaActiva(vistaActiva);
  };

  const handleEliminarUsuario = (usuarioId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      eliminarUsuario(usuarioId);
      setVistaActiva(vistaActiva);
    }
  };

  const calcularDiasRestantes = (fechaFin: string) => {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diffTime = fin.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const obtenerUsuario = (usuarioId: string) => {
    return usuarios.find(u => u.id === usuarioId);
  };

  const obtenerMembresiaUsuario = (usuarioId: string) => {
    return membresias.find(m => m.usuarioId === usuarioId);
  };

  const obtenerEstadisticasUsuario = (usuarioId: string) => {
    const clinicasUsuario = clinicas.filter(c => c.usuarioId === usuarioId).length;
    const dentistasUsuario = dentistas.filter(d => d.usuarioId === usuarioId).length;
    const trabajosUsuario = trabajos.filter(t => t.usuarioId === usuarioId).length;
    
    return { clinicasUsuario, dentistasUsuario, trabajosUsuario };
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button style={styles.backButton} onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>👑 Panel de Administración</h1>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Usuarios</div>
          <div style={styles.statNumber}>{estadisticas.totalUsuarios}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Membresías Activas</div>
          <div style={{...styles.statNumber, color: '#10b981'}}>{estadisticas.membresiasActivas}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Ingresos Totales</div>
          <div style={{...styles.statNumber, color: '#8b5cf6'}}>${estadisticas.ingresosTotales}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Trabajos Activos</div>
          <div style={{...styles.statNumber, color: '#f59e0b'}}>{estadisticas.totalTrabajos}</div>
        </div>
      </div>

      {/* Navegación */}
      <div style={styles.nav}>
        <button
          style={vistaActiva === 'clientes' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
          onClick={() => setVistaActiva('clientes')}
        >
          👥 Clientes ({usuarios.filter(u => u.role === 'cliente').length})
        </button>
        <button
          style={vistaActiva === 'membresias' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
          onClick={() => setVistaActiva('membresias')}
        >
          🎫 Membresías ({membresias.length})
        </button>
        <button
          style={vistaActiva === 'pagos' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
          onClick={() => setVistaActiva('pagos')}
        >
          💳 Pagos ({pagos.length})
        </button>
        <button
          style={vistaActiva === 'estadisticas' ? {...styles.navButton, ...styles.navButtonActive} : styles.navButton}
          onClick={() => setVistaActiva('estadisticas')}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar por nombre, email o laboratorio..."
          style={styles.searchInput}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <span style={{color: '#64748b', fontSize: '0.875rem'}}>
          {vistaActiva === 'clientes' && `${usuariosFiltrados.length} usuarios encontrados`}
          {vistaActiva === 'membresias' && `${membresiasFiltradas.length} membresías encontradas`}
          {vistaActiva === 'pagos' && `${pagosFiltrados.length} pagos encontrados`}
        </span>
      </div>

      {/* VISTA: CLIENTES */}
      {vistaActiva === 'clientes' && (
        <div style={styles.table}>
          <div style={{
            ...styles.tableHeader,
            gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr 0.5fr'
          }}>
            <div>Usuario</div>
            <div>Laboratorio</div>
            <div>Membresía</div>
            <div>Estadísticas</div>
            <div>Estado</div>
            <div>Acciones</div>
          </div>

          {usuariosFiltrados
            .filter(u => u.role === 'cliente') // Solo mostrar clientes, no admin/tecnico
            .map(usuario => {
              const membresia = obtenerMembresiaUsuario(usuario.id);
              const stats = obtenerEstadisticasUsuario(usuario.id);
              
              return (
                <div 
                  key={usuario.id}
                  style={{
                    ...styles.tableRow,
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr 0.5fr'
                  }}
                >
                  <div>
                    <div style={{fontWeight: '600'}}>{usuario.nombre}</div>
                    <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                      {usuario.email}
                    </div>
                    <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                      Registro: {new Date(usuario.fechaRegistro).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{fontWeight: '500'}}>{usuario.laboratorio}</div>
                    <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                      {usuario.telefono}
                    </div>
                  </div>
                  
                  <div>
                    {membresia ? (
                      <>
                        <span style={{
                          ...styles.badge,
                          ...(membresia.tipo === 'premium' ? styles.badgePremium : 
                              membresia.tipo === 'basica' ? styles.badgeBasic : {})
                        }}>
                          {membresia.tipo.toUpperCase()}
                        </span>
                        <div style={{fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem'}}>
                          Vence en {calcularDiasRestantes(membresia.fechaFin)} días
                        </div>
                      </>
                    ) : (
                      <span style={{...styles.badge, backgroundColor: '#f1f5f9', color: '#64748b'}}>
                        SIN MEMBRESÍA
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <div style={{fontSize: '0.875rem'}}>
                      🏥 {stats.clinicasUsuario} clínicas
                    </div>
                    <div style={{fontSize: '0.875rem'}}>
                      👨‍⚕️ {stats.dentistasUsuario} dentistas
                    </div>
                    <div style={{fontSize: '0.875rem'}}>
                      📋 {stats.trabajosUsuario} trabajos
                    </div>
                  </div>
                  
                  <div>
                    <span style={{
                      ...styles.badge,
                      ...(usuario.activo ? styles.badgeActive : styles.badgeInactive)
                    }}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <div style={styles.buttonGroup}>
                    <button
                      style={{
                        ...styles.button,
                        ...(usuario.activo ? styles.buttonWarning : styles.buttonSuccess)
                      }}
                      onClick={() => handleToggleActivo(usuario.id)}
                    >
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      style={{...styles.button, ...styles.buttonDanger}}
                      onClick={() => handleEliminarUsuario(usuario.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* VISTA: MEMBRESÍAS */}
      {vistaActiva === 'membresias' && (
        <div style={styles.table}>
          <div style={{
            ...styles.tableHeader,
            gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr 0.5fr'
          }}>
            <div>Usuario</div>
            <div>Plan</div>
            <div>Vigencia</div>
            <div>Límites</div>
            <div>Estado</div>
            <div>Precio</div>
          </div>

          {membresiasFiltradas.map(membresia => {
            const usuario = obtenerUsuario(membresia.usuarioId);
            const diasRestantes = calcularDiasRestantes(membresia.fechaFin);
            
            return (
              <div 
                key={membresia.id}
                style={{
                  ...styles.tableRow,
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr 0.5fr'
                }}
              >
                <div>
                  <div style={{fontWeight: '600'}}>{usuario?.nombre}</div>
                  <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                    {usuario?.laboratorio}
                  </div>
                </div>
                
                <div>
                  <div style={{fontWeight: '500'}}>
                    {membresia.tipo.charAt(0).toUpperCase() + membresia.tipo.slice(1)}
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                    {membresia.duracionDias} días
                  </div>
                </div>
                
                <div>
                  <div style={{fontSize: '0.875rem'}}>
                    Inicio: {new Date(membresia.fechaInicio).toLocaleDateString()}
                  </div>
                  <div style={{fontSize: '0.875rem'}}>
                    Fin: {new Date(membresia.fechaFin).toLocaleDateString()}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: diasRestantes < 7 ? '#dc2626' : '#16a34a'
                  }}>
                    {diasRestantes} días restantes
                  </div>
                </div>
                
                <div>
                  <div style={{fontSize: '0.875rem'}}>
                    🏥 {membresia.limiteClinicas} clínicas
                  </div>
                  <div style={{fontSize: '0.875rem'}}>
                    👨‍⚕️ {membresia.limiteDentistas} dentistas
                  </div>
                </div>
                
                <div>
                  <span style={{
                    ...styles.badge,
                    ...(membresia.estado === 'activa' ? styles.badgeActive : 
                        membresia.estado === 'expirada' ? styles.badgeInactive : {})
                  }}>
                    {membresia.estado}
                  </span>
                </div>
                
                <div style={{fontWeight: '600', color: '#059669'}}>
                  ${membresia.precio}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA: PAGOS */}
      {vistaActiva === 'pagos' && (
        <div style={styles.table}>
          <div style={{
            ...styles.tableHeader,
            gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr 0.5fr'
          }}>
            <div>Usuario</div>
            <div>Referencia</div>
            <div>Fecha</div>
            <div>Método</div>
            <div>Estado</div>
            <div>Monto</div>
          </div>

          {pagosFiltrados.map(pago => {
            const usuario = obtenerUsuario(pago.usuarioId);
            const membresia = membresias.find(m => m.id === pago.membresiaId);
            
            return (
              <div 
                key={pago.id}
                style={{
                  ...styles.tableRow,
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr 0.5fr'
                }}
              >
                <div>
                  <div style={{fontWeight: '600'}}>{usuario?.nombre}</div>
                  <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                    {membresia?.tipo.toUpperCase()}
                  </div>
                </div>
                
                <div style={{fontFamily: 'monospace', fontWeight: '500'}}>
                  {pago.referencia}
                </div>
                
                <div>
                  {new Date(pago.fechaPago).toLocaleDateString()}
                  <div style={{fontSize: '0.75rem', color: '#64748b'}}>
                    {new Date(pago.fechaPago).toLocaleTimeString()}
                  </div>
                </div>
                
                <div>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: '#f8fafc',
                    color: '#374151'
                  }}>
                    {pago.metodo.toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <span style={{
                    ...styles.badge,
                    ...(pago.estado === 'completado' ? styles.badgeActive : 
                        pago.estado === 'pendiente' ? styles.badgeWarning : styles.badgeInactive)
                  }}>
                    {pago.estado}
                  </span>
                </div>
                
                <div style={{
                  fontWeight: '600',
                  color: pago.estado === 'completado' ? '#059669' : '#6b7280'
                }}>
                  ${pago.monto} {pago.moneda}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA: ESTADÍSTICAS */}
      {vistaActiva === 'estadisticas' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          {/* Estadísticas de Planes */}
          <div style={styles.statCard}>
            <h3 style={{marginBottom: '1rem', color: '#1e293b'}}>Distribución de Planes</h3>
            {planesMembresia.map(plan => {
              const count = membresias.filter(m => m.tipo === plan.id).length;
              return (
                <div key={plan.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.375rem'
                }}>
                  <span>{plan.nombre}</span>
                  <span style={{fontWeight: '600', color: '#2563eb'}}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Ingresos Mensuales */}
          <div style={styles.statCard}>
            <h3 style={{marginBottom: '1rem', color: '#1e293b'}}>Ingresos Mensuales</h3>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#059669', textAlign: 'center'}}>
              ${estadisticas.ingresosTotales}
            </div>
            <div style={{textAlign: 'center', color: '#64748b', marginTop: '0.5rem'}}>
              Total histórico
            </div>
          </div>

          {/* Usuarios por Estado */}
          <div style={styles.statCard}>
            <h3 style={{marginBottom: '1rem', color: '#1e293b'}}>Estado de Usuarios</h3>
            <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a'}}>
                  {estadisticas.usuariosActivos}
                </div>
                <div style={{fontSize: '0.875rem', color: '#64748b'}}>Activos</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626'}}>
                  {estadisticas.totalUsuarios - estadisticas.usuariosActivos}
                </div>
                <div style={{fontSize: '0.875rem', color: '#64748b'}}>Inactivos</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;