import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface DespachosProps {
  onBack?: () => void;
}

interface Trabajo {
  id: string;
  paciente: string;
  clinica_id: string;
  estado: string;
  precio_total: number;
  fecha_recibido: string;
  fecha_entrega_estimada: string;
  servicios: Array<{
    servicio_id: string;
    nombre: string;
    cantidad: number;
  }>;
}

interface Clinica {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

interface Despacho {
  id: string;
  trabajo_id: string;
  usuario_id: string;
  receptor_nombre: string;
  receptor_telefono: string;
  receptor_firma: string | null;
  observaciones: string | null;
  estado_despacho: 'pendiente' | 'en_ruta' | 'entregado' | 'rechazado';
  fecha_despacho: string;
  fecha_entrega: string | null;
  entregado_por: string | null;
  created_at: string;
  trabajo?: Trabajo;
  clinica?: Clinica;
}

const Despachos: React.FC<DespachosProps> = ({ onBack }) => {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [trabajosPendientes, setTrabajosPendientes] = useState<Trabajo[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para el formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);
  const [formData, setFormData] = useState({
    receptor_nombre: '',
    receptor_telefono: '',
    observaciones: '',
    entregado_por: ''
  });
  const [firmaData, setFirmaData] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  
  // Referencia para el canvas de firma
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay usuario autenticado');
        return;
      }

      // Cargar datos en paralelo
      const [trabajosRes, clinicasRes, despachosRes] = await Promise.all([
        // Trabajos terminados pero no despachados
        supabase
          .from('trabajos')
          .select('*')
          .eq('usuario_id', user.id)
          .eq('estado', 'terminado')
          .order('fecha_recibido', { ascending: false }),
        
        // Clínicas
        supabase
          .from('clinicas')
          .select('*')
          .eq('usuario_id', user.id),
        
        // Despachos existentes
        supabase
          .from('despachos')
          .select('*, trabajo:trabajos(*)')
          .eq('usuario_id', user.id)
          .order('fecha_despacho', { ascending: false })
      ]);

      if (trabajosRes.error) throw trabajosRes.error;
      if (clinicasRes.error) throw clinicasRes.error;
      if (despachosRes.error) throw despachosRes.error;

      // Filtrar trabajos que no están ya despachados
      const trabajosDespachados = despachosRes.data?.map(d => d.trabajo_id) || [];
      const trabajosPendientesFiltrados = trabajosRes.data?.filter(
        t => !trabajosDespachados.includes(t.id)
      ) || [];

      // Enriquecer despachos con información de clínicas
      const despachosConClinicas = await Promise.all(
        (despachosRes.data || []).map(async (despacho: any) => {
          if (despacho.trabajo) {
            const clinicaRes = await supabase
              .from('clinicas')
              .select('*')
              .eq('id', despacho.trabajo.clinica_id)
              .single();
            
            return {
              ...despacho,
              clinica: clinicaRes.data || null
            };
          }
          return despacho;
        })
      );

      setTrabajosPendientes(trabajosPendientesFiltrados);
      setClinicas(clinicasRes.data || []);
      setDespachos(despachosConClinicas);

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const iniciarDespacho = (trabajo: Trabajo) => {
    setTrabajoSeleccionado(trabajo);
    setFormData({
      receptor_nombre: '',
      receptor_telefono: '',
      observaciones: '',
      entregado_por: ''
    });
    setFirmaData(null);
    limpiarFirma();
    setMostrarFormulario(true);
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
      }
    }
  };

  const iniciarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setFirmando(true);
    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      drawing = true;
      const rect = canvas.getBoundingClientRect();
      
      let clientX, clientY;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      
      lastX = clientX - rect.left;
      lastY = clientY - rect.top;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing || !ctx) return;
      
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      
      let clientX, clientY;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      
      const currentX = clientX - rect.left;
      const currentY = clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      lastX = currentX;
      lastY = currentY;
    };

    const stopDrawing = () => {
      drawing = false;
      // Guardar la firma como data URL
      if (canvas) {
        setFirmaData(canvas.toDataURL());
      }
    };

    // Eventos de mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Eventos táctiles
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e);
    });
    canvas.addEventListener('touchend', stopDrawing);

    // Guardar referencia para limpiar
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  };

  const guardarDespacho = async () => {
    if (!trabajoSeleccionado) return;
    
    if (!formData.receptor_nombre.trim() || !formData.receptor_telefono.trim()) {
      setError('El nombre y teléfono del receptor son obligatorios');
      return;
    }

    try {
      setSubiendo(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay usuario autenticado');
        return;
      }

      // Crear el registro de despacho
      const despachoData = {
        trabajo_id: trabajoSeleccionado.id,
        usuario_id: user.id,
        receptor_nombre: formData.receptor_nombre.trim(),
        receptor_telefono: formData.receptor_telefono.trim(),
        receptor_firma: firmaData,
        observaciones: formData.observaciones.trim() || null,
        estado_despacho: 'entregado' as const,
        fecha_entrega: new Date().toISOString(),
        entregado_por: formData.entregado_por.trim() || user.email || 'Sistema'
      };

      const { error: despachoError } = await supabase
        .from('despachos')
        .insert([despachoData]);

      if (despachoError) throw despachoError;

      // Actualizar estado del trabajo a "entregado"
      const { error: trabajoError } = await supabase
        .from('trabajos')
        .update({ estado: 'entregado' })
        .eq('id', trabajoSeleccionado.id)
        .eq('usuario_id', user.id);

      if (trabajoError) throw trabajoError;

      alert('✅ Despacho registrado exitosamente');
      setMostrarFormulario(false);
      await cargarDatos();

    } catch (error: any) {
      console.error('Error guardando despacho:', error);
      setError(error.message);
    } finally {
      setSubiendo(false);
    }
  };

  const filtrarDespachos = () => {
    if (estadoFiltro === 'todos') return despachos;
    return despachos.filter(d => d.estado_despacho === estadoFiltro);
  };

  const obtenerTextoEstadoDespacho = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '🕒 Pendiente';
      case 'en_ruta': return '🚚 En Ruta';
      case 'entregado': return '✅ Entregado';
      case 'rechazado': return '❌ Rechazado';
      default: return estado;
    }
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '#f59e0b';
      case 'en_ruta': return '#3b82f6';
      case 'entregado': return '#10b981';
      case 'rechazado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Estilos
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
      marginBottom: '30px',
      flexWrap: 'wrap' as const,
      gap: '15px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0'
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    primaryButton: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    secondaryButton: {
      padding: '8px 16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '25px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      textAlign: 'center' as const,
      border: '1px solid #e0e0e0'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '8px 0'
    },
    statLabel: {
      fontSize: '14px',
      color: '#64748b',
      fontWeight: '500'
    },
    filters: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      marginBottom: '25px',
      border: '1px solid #e0e0e0'
    },
    filterButtons: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '10px'
    },
    filterButton: {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      color: '#495057',
      cursor: 'pointer',
      fontSize: '14px'
    },
    filterButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      borderColor: '#3b82f6'
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '25px'
    },
    section: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      border: '1px solid #e0e0e0'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 15px 0',
      paddingBottom: '10px',
      borderBottom: '2px solid #e2e8f0'
    },
    lista: {
      maxHeight: '400px',
      overflowY: 'auto' as const
    },
    itemCard: {
      padding: '15px',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      marginBottom: '10px',
      backgroundColor: '#f8fafc'
    },
    itemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px'
    },
    itemTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0'
    },
    itemMeta: {
      fontSize: '12px',
      color: '#64748b',
      margin: '5px 0'
    },
    estadoBadge: {
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500'
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '8px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflowY: 'auto' as const
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1e293b',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#64748b',
      padding: '0'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box' as const
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const
    },
    firmaContainer: {
      border: '2px dashed #d1d5db',
      borderRadius: '8px',
      padding: '15px',
      textAlign: 'center' as const,
      marginBottom: '20px'
    },
    firmaCanvas: {
      border: '1px solid #d1d5db',
      backgroundColor: 'white',
      cursor: 'crosshair'
    },
    firmaInstructions: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '10px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '25px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: '#f8f9fa',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    submitButton: {
      padding: '10px 20px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    loadingText: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#64748b',
      fontSize: '16px'
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: '#64748b'
    },
    errorText: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '14px'
    }
  };

  // Inicializar el canvas cuando se monta el componente
  useEffect(() => {
    if (canvasRef.current && mostrarFormulario) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [mostrarFormulario]);

  if (cargando) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>Cargando despachos...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button style={styles.backButton} onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>📦 Gestión de Despachos</h1>
        </div>
      </div>

      {error && <div style={styles.errorText}>❌ {error}</div>}

      {/* Estadísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Despachos</div>
          <div style={styles.statNumber}>{despachos.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Entregados</div>
          <div style={styles.statNumber}>
            {despachos.filter(d => d.estado_despacho === 'entregado').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pendientes de Despacho</div>
          <div style={styles.statNumber}>{trabajosPendientes.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>En Ruta</div>
          <div style={styles.statNumber}>
            {despachos.filter(d => d.estado_despacho === 'en_ruta').length}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filters}>
        <div style={styles.filterButtons}>
          <button
            style={{
              ...styles.filterButton,
              ...(estadoFiltro === 'todos' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEstadoFiltro('todos')}
          >
            Todos los Despachos
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(estadoFiltro === 'entregado' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEstadoFiltro('entregado')}
          >
            ✅ Entregados
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(estadoFiltro === 'en_ruta' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEstadoFiltro('en_ruta')}
          >
            🚚 En Ruta
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(estadoFiltro === 'pendiente' ? styles.filterButtonActive : {})
            }}
            onClick={() => setEstadoFiltro('pendiente')}
          >
            🕒 Pendientes
          </button>
        </div>
      </div>

      {/* Grid de dos columnas */}
      <div style={styles.gridContainer}>
        {/* Columna izquierda: Trabajos pendientes de despacho */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            Trabajos Terminados para Despachar ({trabajosPendientes.length})
          </h3>
          <div style={styles.lista}>
            {trabajosPendientes.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No hay trabajos pendientes de despacho</p>
              </div>
            ) : (
              trabajosPendientes.map(trabajo => {
                const clinica = clinicas.find(c => c.id === trabajo.clinica_id);
                
                return (
                  <div key={trabajo.id} style={styles.itemCard}>
                    <div style={styles.itemHeader}>
                      <h4 style={styles.itemTitle}>{trabajo.paciente}</h4>
                      <button
                        style={styles.primaryButton}
                        onClick={() => iniciarDespacho(trabajo)}
                      >
                        📦 Despachar
                      </button>
                    </div>
                    <div style={styles.itemMeta}>
                      <div><strong>Clínica:</strong> {clinica?.nombre || 'N/A'}</div>
                      <div><strong>Servicios:</strong> {trabajo.servicios.length}</div>
                      <div><strong>Recibido:</strong> {formatearFecha(trabajo.fecha_recibido)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna derecha: Historial de despachos */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            Historial de Despachos ({filtrarDespachos().length})
          </h3>
          <div style={styles.lista}>
            {filtrarDespachos().length === 0 ? (
              <div style={styles.emptyState}>
                <p>No hay despachos registrados</p>
              </div>
            ) : (
              filtrarDespachos().map(despacho => (
                <div key={despacho.id} style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <h4 style={styles.itemTitle}>
                      {despacho.trabajo?.paciente || 'Paciente no disponible'}
                    </h4>
                    <span
                      style={{
                        ...styles.estadoBadge,
                        backgroundColor: obtenerColorEstado(despacho.estado_despacho),
                        color: 'white'
                      }}
                    >
                      {obtenerTextoEstadoDespacho(despacho.estado_despacho)}
                    </span>
                  </div>
                  <div style={styles.itemMeta}>
                    <div><strong>Receptor:</strong> {despacho.receptor_nombre}</div>
                    <div><strong>Teléfono:</strong> {despacho.receptor_telefono}</div>
                    <div><strong>Clínica:</strong> {despacho.clinica?.nombre || 'N/A'}</div>
                    <div><strong>Entregado por:</strong> {despacho.entregado_por || 'N/A'}</div>
                    <div><strong>Fecha entrega:</strong> {formatearFecha(despacho.fecha_entrega || despacho.created_at)}</div>
                    {despacho.observaciones && (
                      <div><strong>Observaciones:</strong> {despacho.observaciones}</div>
                    )}
                    {despacho.receptor_firma && (
                      <div style={{ marginTop: '10px' }}>
                        <strong>Firma:</strong> 
                        <div style={{ marginTop: '5px' }}>
                          <img 
                            src={despacho.receptor_firma} 
                            alt="Firma del receptor" 
                            style={{ maxWidth: '150px', border: '1px solid #ddd', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de formulario de despacho */}
      {mostrarFormulario && trabajoSeleccionado && (
        <div style={styles.modalOverlay} onClick={() => setMostrarFormulario(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                📦 Registrar Despacho
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => setMostrarFormulario(false)}
              >
                ×
              </button>
            </div>

            {error && <div style={styles.errorText}>{error}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Paciente</label>
              <input
                type="text"
                style={styles.input}
                value={trabajoSeleccionado.paciente}
                disabled
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Clínica</label>
              <input
                type="text"
                style={styles.input}
                value={clinicas.find(c => c.id === trabajoSeleccionado.clinica_id)?.nombre || 'N/A'}
                disabled
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre del Receptor *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.receptor_nombre}
                onChange={(e) => setFormData({...formData, receptor_nombre: e.target.value})}
                placeholder="Ingrese nombre completo del receptor"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Teléfono del Receptor *</label>
              <input
                type="tel"
                style={styles.input}
                value={formData.receptor_telefono}
                onChange={(e) => setFormData({...formData, receptor_telefono: e.target.value})}
                placeholder="+56 9 1234 5678"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Entregado por</label>
              <input
                type="text"
                style={styles.input}
                value={formData.entregado_por}
                onChange={(e) => setFormData({...formData, entregado_por: e.target.value})}
                placeholder="Nombre de quien entrega"
              />
            </div>

            {/* Área de firma */}
            <div style={styles.firmaContainer}>
              <label style={styles.label}>Firma del Receptor</label>
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                style={styles.firmaCanvas}
                onMouseDown={() => iniciarFirma()}
                onTouchStart={() => iniciarFirma()}
              />
              <div style={styles.firmaInstructions}>
                <p>Firme en el área de arriba usando el mouse o el dedo (en dispositivos táctiles)</p>
                <button
                  style={{...styles.secondaryButton, marginTop: '10px'}}
                  onClick={limpiarFirma}
                >
                  🗑️ Limpiar Firma
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Observaciones / Sugerencias</label>
              <textarea
                style={styles.textarea}
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Ingrese observaciones, sugerencias o comentarios del receptor..."
              />
            </div>

            <div style={styles.buttonGroup}>
              <button 
                style={styles.cancelButton}
                onClick={() => setMostrarFormulario(false)}
                disabled={subiendo}
              >
                Cancelar
              </button>
              <button 
                style={styles.submitButton}
                onClick={guardarDespacho}
                disabled={subiendo || !formData.receptor_nombre || !formData.receptor_telefono}
              >
                {subiendo ? 'Registrando...' : '✅ Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Despachos;