import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface TrabajosProcesoProps {
  onBack?: () => void;
}

interface Trabajo {
  id: string;
  paciente: string;
  clinica_id: string;
  dentista_id: string;
  laboratorista_id: string;
  servicios: Array<{
    servicio_id: string;
    nombre: string;
    precio: number;
    cantidad: number;
  }>;
  estado: 'pendiente' | 'en_produccion' | 'completado' | 'entregado';
  precio_total: number;
  fecha_creacion: string;
  fecha_entrega_estimada?: string;
  observaciones?: string;
}

const TrabajosProceso: React.FC<TrabajosProcesoProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Nuevos estados para filtros
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => {
    cargarTrabajos();
  }, []);

  const cargarTrabajos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('trabajos')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setTrabajos(data || []);
    } catch (error) {
      console.error('Error cargando trabajos:', error);
      alert('Error al cargar los trabajos');
    } finally {
      setCargando(false);
    }
  };

  // Filtrar trabajos según los criterios
  const trabajosFiltrados = trabajos.filter(trabajo => {
    const fechaTrabajo = new Date(trabajo.fecha_creacion);
    
    // Filtro por fecha específica
    if (filtroFecha) {
      const coincideFecha = fechaTrabajo.toISOString().split('T')[0] === filtroFecha;
      if (!coincideFecha) return false;
    }
    
    // Filtro por mes
    if (filtroMes) {
      const fechaFiltro = new Date(filtroMes);
      const coincideMes = fechaTrabajo.getMonth() === fechaFiltro.getMonth() &&
                         fechaTrabajo.getFullYear() === fechaFiltro.getFullYear();
      if (!coincideMes) return false;
    }
    
    // Filtro por estado
    if (filtroEstado && trabajo.estado !== filtroEstado) {
      return false;
    }
    
    return true;
  });

  const iniciarProduccion = async (trabajoId: string) => {
    try {
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: 'en_produccion' })
        .eq('id', trabajoId);

      if (error) throw error;
      
      // Actualizar la lista
      setTrabajos(prev => prev.map(t => 
        t.id === trabajoId ? { ...t, estado: 'en_produccion' } : t
      ));
      
      alert('Producción iniciada correctamente');
    } catch (error) {
      console.error('Error iniciando producción:', error);
      alert('Error al iniciar la producción');
    }
  };

  const terminarProduccion = async (trabajoId: string) => {
    try {
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: 'completado' })
        .eq('id', trabajoId);

      if (error) throw error;
      
      // Actualizar la lista
      setTrabajos(prev => prev.map(t => 
        t.id === trabajoId ? { ...t, estado: 'completado' } : t
      ));
      
      alert('Producción terminada correctamente');
    } catch (error) {
      console.error('Error terminando producción:', error);
      alert('Error al terminar la producción');
    }
  };

  const generarInformeMensual = () => {
    if (!filtroMes) {
      alert('Selecciona un mes para generar el informe');
      return;
    }

    const trabajosMensuales = trabajos.filter(trabajo => {
      const fechaTrabajo = new Date(trabajo.fecha_creacion);
      const fechaFiltro = new Date(filtroMes);
      return fechaTrabajo.getMonth() === fechaFiltro.getMonth() &&
             fechaTrabajo.getFullYear() === fechaFiltro.getFullYear();
    });

    if (trabajosMensuales.length === 0) {
      alert('No hay trabajos para el mes seleccionado');
      return;
    }

    // Preparar datos para el Excel
    const reporteData = trabajosMensuales.map(trabajo => ({
      'Fecha': new Date(trabajo.fecha_creacion).toLocaleDateString('es-ES'),
      'Paciente': trabajo.paciente,
      'Estado': getEstadoTexto(trabajo.estado),
      'Servicios': trabajo.servicios.map(s => s.nombre).join(', '),
      'Precio Total': `$${trabajo.precio_total.toFixed(2)}`,
      'Observaciones': trabajo.observaciones || 'Ninguna'
    }));

    // Calcular totales
    const totalIngresos = trabajosMensuales.reduce((sum, trabajo) => sum + trabajo.precio_total, 0);
    const trabajosCompletados = trabajosMensuales.filter(t => t.estado === 'completado').length;
    const trabajosEnProceso = trabajosMensuales.filter(t => t.estado === 'en_produccion').length;

    // Agregar resumen
    reporteData.push(
  {
    'Fecha': '',
    'Paciente': '',
    'Estado': '',
    'Servicios': '',
    'Precio Total': '',
    'Observaciones': ''
  },
  {
    'Fecha': 'RESUMEN MENSUAL',
    'Paciente': '',
    'Estado': '',
    'Servicios': '',
    'Precio Total': '',
    'Observaciones': ''
  },
  {
    'Fecha': 'Total de Trabajos',
    'Paciente': trabajosMensuales.length.toString(),
    'Estado': '',
    'Servicios': '',
    'Precio Total': '',
    'Observaciones': ''
  },
  {
    'Fecha': 'Trabajos Completados',
    'Paciente': trabajosCompletados.toString(),
    'Estado': '',
    'Servicios': '',
    'Precio Total': '',
    'Observaciones': ''
  },
  {
    'Fecha': 'Trabajos en Proceso',
    'Paciente': trabajosEnProceso.toString(),
    'Estado': '',
    'Servicios': '',
    'Precio Total': '',
    'Observaciones': ''
  },
  {
    'Fecha': 'Total de Ingresos',
    'Paciente': '',
    'Estado': '',
    'Servicios': '',
    'Precio Total': `$${totalIngresos.toFixed(2)}`,
    'Observaciones': ''
  }
);

    // Crear y descargar Excel
    const ws = XLSX.utils.json_to_sheet(reporteData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe Mensual');
    
    const nombreArchivo = `informe-mensual-${filtroMes}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    
    alert(`Informe mensual generado: ${nombreArchivo}`);
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_produccion': return 'En Producción';
      case 'completado': return 'Completado';
      case 'entregado': return 'Entregado';
      default: return estado;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '#f59e0b'; // amber-500
      case 'en_produccion': return '#3b82f6'; // blue-500
      case 'completado': return '#10b981'; // green-500
      case 'entregado': return '#6b7280'; // gray-500
      default: return '#6b7280';
    }
  };

  const handleVolver = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/dashboard');
    }
  };

  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroMes('');
    setFiltroEstado('');
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px'
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#6b7280',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    title: {
      margin: 0,
      color: '#1f2937',
      fontSize: '24px',
      fontWeight: 'bold'
    },
    filtrosContainer: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '12px',
      alignItems: 'flex-end'
    },
    filtroGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151'
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px'
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    botonFiltro: {
      padding: '8px 16px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    botonLimpiar: {
      padding: '8px 16px',
      backgroundColor: '#6b7280',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    botonInforme: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    trabajoItem: {
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '12px',
      borderLeft: '4px solid #3b82f6'
    },
    trabajoHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px'
    },
    pacienteNombre: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: 0
    },
    estadoBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontWeight: '600'
    },
    trabajoInfo: {
      color: '#6b7280',
      marginBottom: '4px',
      fontSize: '14px'
    },
    serviciosList: {
      marginTop: '8px',
      paddingLeft: '16px'
    },
    servicioItem: {
      color: '#4b5563',
      fontSize: '14px',
      marginBottom: '2px'
    },
    accionesContainer: {
      marginTop: '12px',
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap' as const
    },
    botonAccion: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600'
    },
    loadingText: {
      textAlign: 'center' as const,
      color: '#6b7280',
      padding: '40px'
    },
    sinResultados: {
      textAlign: 'center' as const,
      color: '#6b7280',
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '8px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={handleVolver}
            style={styles.backButton}
          >
            ← Volver
          </button>
          <h1 style={styles.title}>Trabajos en Proceso</h1>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filtrosContainer}>
        <div style={styles.filtroGroup}>
          <label style={styles.label}>Filtrar por fecha:</label>
          <input
            type="date"
            style={styles.input}
            value={filtroFecha}
            onChange={(e) => {
              setFiltroFecha(e.target.value);
              setFiltroMes('');
            }}
          />
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.label}>Filtrar por mes:</label>
          <input
            type="month"
            style={styles.input}
            value={filtroMes}
            onChange={(e) => {
              setFiltroMes(e.target.value);
              setFiltroFecha('');
            }}
          />
        </div>

        <div style={styles.filtroGroup}>
          <label style={styles.label}>Filtrar por estado:</label>
          <select
            style={styles.select}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_produccion">En Producción</option>
            <option value="completado">Completado</option>
            <option value="entregado">Entregado</option>
          </select>
        </div>

        <button 
          onClick={limpiarFiltros}
          style={styles.botonLimpiar}
        >
          Limpiar Filtros
        </button>

        {filtroMes && (
          <button 
            onClick={generarInformeMensual}
            style={styles.botonInforme}
          >
            📊 Generar Informe Mensual
          </button>
        )}
      </div>

      {/* Lista de trabajos */}
      {cargando ? (
        <div style={styles.loadingText}>Cargando trabajos...</div>
      ) : trabajosFiltrados.length === 0 ? (
        <div style={styles.sinResultados}>
          {filtroFecha || filtroMes || filtroEstado 
            ? 'No hay trabajos que coincidan con los filtros aplicados'
            : 'No hay trabajos en proceso'
          }
        </div>
      ) : (
        <div>
          {trabajosFiltrados.map((trabajo) => (
            <div key={trabajo.id} style={styles.trabajoItem}>
              <div style={styles.trabajoHeader}>
                <h3 style={styles.pacienteNombre}>{trabajo.paciente}</h3>
                <span 
                  style={{
                    ...styles.estadoBadge,
                    backgroundColor: getEstadoColor(trabajo.estado)
                  }}
                >
                  {getEstadoTexto(trabajo.estado)}
                </span>
              </div>

              <div style={styles.trabajoInfo}>
                📅 Creado: {new Date(trabajo.fecha_creacion).toLocaleDateString('es-ES')}
              </div>
              
              {trabajo.fecha_entrega_estimada && (
                <div style={styles.trabajoInfo}>
                  🎯 Entrega estimada: {new Date(trabajo.fecha_entrega_estimada).toLocaleDateString('es-ES')}
                </div>
              )}

              <div style={styles.trabajoInfo}>
                💰 Precio total: ${trabajo.precio_total.toFixed(2)}
              </div>

              {trabajo.observaciones && (
                <div style={styles.trabajoInfo}>
                  📝 Observaciones: {trabajo.observaciones}
                </div>
              )}

              <div style={styles.serviciosList}>
                <strong>Servicios:</strong>
                {trabajo.servicios.map((servicio, index) => (
                  <div key={index} style={styles.servicioItem}>
                    • {servicio.nombre} (${servicio.precio.toFixed(2)})
                  </div>
                ))}
              </div>

              <div style={styles.accionesContainer}>
                {trabajo.estado === 'pendiente' && (
                  <button 
                    onClick={() => iniciarProduccion(trabajo.id)}
                    style={{
                      ...styles.botonAccion,
                      backgroundColor: '#3b82f6',
                      color: 'white'
                    }}
                  >
                    Iniciar Producción
                  </button>
                )}
                
                {trabajo.estado === 'en_produccion' && (
                  <button 
                    onClick={() => terminarProduccion(trabajo.id)}
                    style={{
                      ...styles.botonAccion,
                      backgroundColor: '#10b981',
                      color: 'white'
                    }}
                  >
                    Terminar Producción
                  </button>
                )}
                
                {trabajo.estado === 'completado' && (
                  <span style={{
                    padding: '6px 12px',
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    ✅ Completado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrabajosProceso;