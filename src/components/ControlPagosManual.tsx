import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface UsuarioInfo {
  nombre: string;
  email: string;
}

interface PagoManual {
  id: string;
  user_id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia: string;
  estado: string;
  comprobante_url?: string;
  observaciones?: string;
  usuario?: UsuarioInfo;
}

const ControlPagosManual: React.FC = () => {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState<PagoManual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  
  // Estados para el formulario de nuevo pago
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarPagos = async () => {
    try {
      setCargando(true);
      let query = supabase
        .from('pagos_manuales')
        .select(`
          *,
          usuario:perfiles_usuarios(nombre, email)
        `)
        .order('fecha_pago', { ascending: false });

      // Aplicar filtros
      if (filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado);
      }

      if (fechaInicio) {
        query = query.gte('fecha_pago', fechaInicio.toISOString());
      }

      if (fechaFin) {
        // Ajustar la fecha fin para incluir todo el día
        const fechaFinAjustada = new Date(fechaFin);
        fechaFinAjustada.setHours(23, 59, 59);
        query = query.lte('fecha_pago', fechaFinAjustada.toISOString());
      }

      if (busqueda) {
        query = query.or(`referencia.ilike.%${busqueda}%,observaciones.ilike.%${busqueda}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPagos(data || []);
    } catch (error) {
      console.error('Error cargando pagos:', error);
      alert('Error al cargar los pagos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPagos();
  }, [filtroEstado, fechaInicio, fechaFin, busqueda]);

  const handleAprobarPago = async (id: string) => {
    if (window.confirm('¿Estás seguro de aprobar este pago?')) {
      try {
        const { error } = await supabase
          .from('pagos_manuales')
          .update({ estado: 'aprobado' })
          .eq('id', id);

        if (error) throw error;

        cargarPagos();
        alert('Pago aprobado correctamente');
      } catch (error) {
        console.error('Error aprobando pago:', error);
        alert('Error al aprobar el pago');
      }
    }
  };

  const handleRechazarPago = async (id: string) => {
    if (window.confirm('¿Estás seguro de rechazar este pago?')) {
      try {
        const { error } = await supabase
          .from('pagos_manuales')
          .update({ estado: 'rechazado' })
          .eq('id', id);

        if (error) throw error;

        cargarPagos();
        alert('Pago rechazado correctamente');
      } catch (error) {
        console.error('Error rechazando pago:', error);
        alert('Error al rechazar el pago');
      }
    }
  };

  const handleEliminarPago = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este pago?')) {
      try {
        const { error } = await supabase
          .from('pagos_manuales')
          .delete()
          .eq('id', id);

        if (error) throw error;

        cargarPagos();
        alert('Pago eliminado correctamente');
      } catch (error) {
        console.error('Error eliminando pago:', error);
        alert('Error al eliminar el pago');
      }
    }
  };

  const handleSubmitPago = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usuarioId.trim()) {
      alert('El ID de usuario es requerido');
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    try {
      setEnviando(true);

      let comprobanteUrl = '';
      if (comprobanteFile) {
        // Subir comprobante a Supabase Storage
        const fileExt = comprobanteFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2)}.${fileExt}`;
        const filePath = `comprobantes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pagos')
          .upload(filePath, comprobanteFile);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('pagos')
          .getPublicUrl(filePath);

        comprobanteUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('pagos_manuales')
        .insert({
          user_id: usuarioId,
          monto: parseFloat(monto),
          fecha_pago: new Date().toISOString(),
          metodo_pago: metodoPago,
          referencia: referencia || `MANUAL-${Date.now()}`,
          estado: 'pendiente',
          comprobante_url: comprobanteUrl || null,
          observaciones
        });

      if (error) throw error;

      alert('Pago manual registrado correctamente');
      setMostrarFormulario(false);
      resetFormulario();
      cargarPagos();
    } catch (error) {
      console.error('Error registrando pago:', error);
      alert('Error al registrar el pago');
    } finally {
      setEnviando(false);
    }
  };

  const resetFormulario = () => {
    setUsuarioId('');
    setMonto('');
    setMetodoPago('transferencia');
    setReferencia('');
    setObservaciones('');
    setComprobanteFile(null);
  };

  const getEstadoStyles = (estado: string) => {
    switch (estado) {
      case 'aprobado': return { backgroundColor: '#10b981', color: 'white' };
      case 'pendiente': return { backgroundColor: '#f59e0b', color: 'white' };
      case 'rechazado': return { backgroundColor: '#ef4444', color: 'white' };
      default: return { backgroundColor: '#9ca3af', color: 'white' };
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resetFiltros = () => {
    setFiltroEstado('todos');
    setBusqueda('');
    setFechaInicio(null);
    setFechaFin(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← Volver al Dashboard
        </button>
        <h1 style={styles.title}>Control de Pagos Manuales</h1>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div>
            <label style={styles.filterLabel}>Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={styles.select}
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Fecha Inicio</label>
            <DatePicker
              selected={fechaInicio}
              onChange={(date: Date | null) => setFechaInicio(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona fecha"
              className="date-picker-input"
              wrapperClassName="date-picker-wrapper"
            />
          </div>

          <div>
            <label style={styles.filterLabel}>Fecha Fin</label>
            <DatePicker
              selected={fechaFin}
              onChange={(date: Date | null) => setFechaFin(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecciona fecha"
              className="date-picker-input"
              wrapperClassName="date-picker-wrapper"
            />
          </div>

          <div>
            <label style={styles.filterLabel}>Buscar por referencia</label>
            <input
              type="text"
              placeholder="Referencia o observaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.filterActions}>
          <button onClick={() => cargarPagos()} style={styles.filterButton}>
            🔍 Aplicar Filtros
          </button>
          <button onClick={resetFiltros} style={styles.resetButton}>
            🔄 Limpiar Filtros
          </button>
          <button onClick={() => setMostrarFormulario(true)} style={styles.newPaymentButton}>
            ➕ Registrar Pago Manual
          </button>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>Pagos Registrados</h3>
          <div style={styles.tableStats}>
            <span style={styles.stat}>
              Total: {pagos.length} pagos
            </span>
            <span style={styles.stat}>
              Pendientes: {pagos.filter(p => p.estado === 'pendiente').length}
            </span>
          </div>
        </div>
        
        {cargando ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Cargando pagos...</p>
          </div>
        ) : pagos.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p>No se encontraron pagos con los filtros actuales</p>
            <button onClick={resetFiltros} style={styles.resetFiltersButton}>
              Ver todos los pagos
            </button>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Usuario</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Método</th>
                  <th style={styles.th}>Referencia</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userInfo}>
                        <div style={styles.userAvatar}>
                          {pago.usuario?.nombre?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <strong>{pago.usuario?.nombre || 'Usuario no encontrado'}</strong>
                          <div style={styles.userEmail}>{pago.usuario?.email || 'Sin email'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong style={styles.monto}>${pago.monto.toFixed(2)}</strong>
                    </td>
                    <td style={styles.td}>
                      <div>{formatFecha(pago.fecha_pago)}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.metodoBadge}>
                        {pago.metodo_pago}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.referenceContainer}>
                        <code style={styles.reference}>{pago.referencia}</code>
                        {pago.comprobante_url && (
                          <a 
                            href={pago.comprobante_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={styles.comprobanteLink}
                          >
                            📎 Ver comprobante
                          </a>
                        )}
                        {pago.observaciones && (
                          <div style={styles.observaciones}>{pago.observaciones}</div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{...styles.estadoBadge, ...getEstadoStyles(pago.estado)}}>
                        {pago.estado.toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.acciones}>
                        {pago.estado === 'pendiente' && (
                          <>
                            <button
                              onClick={() => handleAprobarPago(pago.id)}
                              style={{...styles.actionButton, ...styles.aprobarButton}}
                              title="Aprobar pago"
                            >
                              ✅ Aprobar
                            </button>
                            <button
                              onClick={() => handleRechazarPago(pago.id)}
                              style={{...styles.actionButton, ...styles.rechazarButton}}
                              title="Rechazar pago"
                            >
                              ❌ Rechazar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEliminarPago(pago.id)}
                          style={{...styles.actionButton, ...styles.eliminarButton}}
                          title="Eliminar pago"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para nuevo pago */}
      {mostrarFormulario && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>Registrar Pago Manual</h3>
              <button onClick={() => setMostrarFormulario(false)} style={styles.modalClose}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitPago} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ID del Usuario *</label>
                  <input
                    type="text"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    placeholder="ID del usuario en Supabase"
                    style={styles.input}
                    required
                  />
                  <small style={styles.hint}>
                    Puedes obtenerlo desde la tabla perfiles_usuarios en Supabase
                  </small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    style={styles.input}
                    required
                  />
                  <small style={styles.hint}>Ej: 49.99 para plan Profesional</small>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Método de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    style={styles.select}
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                    <option value="paypal">PayPal</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Referencia (opcional)</label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Número de referencia, voucher, etc."
                    style={styles.input}
                  />
                  <small style={styles.hint}>Déjalo vacío para generar automáticamente</small>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Observaciones (opcional)</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales sobre el pago..."
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Comprobante (opcional)</label>
                <div style={styles.fileUpload}>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                    style={styles.fileInput}
                    id="comprobante"
                  />
                  <label htmlFor="comprobante" style={styles.fileButton}>
                    📁 Seleccionar archivo
                  </label>
                  {comprobanteFile && (
                    <div style={styles.fileInfo}>
                      <span style={styles.fileName}>{comprobanteFile.name}</span>
                      <span style={styles.fileSize}>
                        {(comprobanteFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </div>
                <small style={styles.hint}>
                  Formatos aceptados: imágenes, PDF, Word (máx. 10MB)
                </small>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormulario(false);
                    resetFormulario();
                  }}
                  style={styles.cancelButton}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !usuarioId.trim() || !monto}
                  style={styles.submitButton}
                >
                  {enviando ? (
                    <>
                      <span style={styles.spinnerSmall}></span>
                      Registrando...
                    </>
                  ) : (
                    '✅ Registrar Pago'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .date-picker-wrapper {
          width: 100%;
        }
        
        .date-picker-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 1rem;
          box-sizing: border-box;
        }
        
        .react-datepicker-wrapper {
          width: 100%;
        }
        
        .react-datepicker__input-container {
          width: 100%;
        }
        
        .react-datepicker__input-container input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 1rem;
          box-sizing: border-box;
        }
        
        .react-datepicker-popper {
          z-index: 1001;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, sans-serif"
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    color: '#374151',
    marginRight: '1rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f1f5f9'
    }
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '2rem',
    border: '1px solid #e2e8f0'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  filterLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.875rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    boxSizing: 'border-box' as const,
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  filterActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const
  },
  filterButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#2563eb',
      transform: 'translateY(-1px)'
    }
  },
  resetButton: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    padding: '0.75rem 1.5rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#e2e8f0'
    }
  },
  newPaymentButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-1px)'
    }
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  tableTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: 0,
    color: '#1e293b'
  },
  tableStats: {
    display: 'flex',
    gap: '1.5rem'
  },
  stat: {
    backgroundColor: '#f8fafc',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500'
  },
  loading: {
    padding: '3rem',
    textAlign: 'center' as const,
    color: '#64748b',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  spinnerSmall: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: '0.5rem',
    verticalAlign: 'middle'
  },
  emptyState: {
    padding: '4rem 2rem',
    textAlign: 'center' as const,
    color: '#9ca3af'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  resetFiltersButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '1rem'
  },
  tableContainer: {
    overflowX: 'auto' as const
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '800px'
  },
  th: {
    padding: '1rem',
    textAlign: 'left' as const,
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: '600',
    fontSize: '0.875rem',
    backgroundColor: '#f9fafb'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#f9fafb'
    }
  },
  td: {
    padding: '1rem',
    verticalAlign: 'top' as const
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem'
  },
  monto: {
    color: '#10b981',
    fontSize: '1.125rem',
    fontWeight: '600'
  },
  metodoBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  referenceContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  reference: {
    backgroundColor: '#f3f4f6',
    padding: '0.375rem 0.75rem',
    borderRadius: '0.375rem',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: '0.875rem',
    color: '#374151'
  },
  comprobanteLink: {
    color: '#3b82f6',
    fontSize: '0.875rem',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    }
  },
  observaciones: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: '1.4'
  },
  estadoBadge: {
    display: 'inline-block',
    padding: '0.375rem 0.875rem',
    borderRadius: '1rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  acciones: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    minWidth: '120px'
  },
  actionButton: {
    padding: '0.5rem 0.75rem',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.8125rem',
    transition: 'all 0.2s',
    textAlign: 'left' as const,
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  },
  aprobarButton: {
    backgroundColor: '#10b981',
    color: 'white',
    '&:hover': {
      backgroundColor: '#059669'
    }
  },
  rechazarButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    '&:hover': {
      backgroundColor: '#dc2626'
    }
  },
  eliminarButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    '&:hover': {
      backgroundColor: '#4b5563'
    }
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  modalHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky' as const,
    top: 0,
    backgroundColor: 'white',
    zIndex: 10
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    color: '#6b7280',
    lineHeight: '1',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f3f4f6'
    }
  },
  form: {
    padding: '1.5rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.95rem'
  },
  hint: {
    display: 'block',
    marginTop: '0.375rem',
    color: '#6b7280',
    fontSize: '0.8125rem'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
    minHeight: '100px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  fileUpload: {
    marginTop: '0.5rem'
  },
  fileInput: {
    display: 'none'
  },
  fileButton: {
    backgroundColor: '#f1f5f9',
    color: '#374151',
    padding: '0.75rem 1.5rem',
    border: '1px dashed #cbd5e1',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.95rem',
    display: 'inline-block',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#e2e8f0',
      borderColor: '#94a3b8'
    }
  },
  fileInfo: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fileName: {
    fontWeight: '500',
    fontSize: '0.95rem'
  },
  fileSize: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    border: '1px solid #cbd5e1',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f8fafc'
    }
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    '&:hover:not(:disabled)': {
      backgroundColor: '#059669',
      transform: 'translateY(-1px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  }
};

export default ControlPagosManual;