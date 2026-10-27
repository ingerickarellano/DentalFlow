import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useMembresia, nombrePlan } from '../hooks/useMembresia';
import { usePlanes, formatearCLP, mensajeBD } from '../hooks/usePlanes';
import Header from './Header';

// ============================================
// MI MEMBRESÍA (admin del laboratorio)
// - Estado del plan, uso (clínicas / trabajos del mes) y precios vigentes.
// - Informar un pago: plan, meses, monto, fecha, N° de operación y comprobante.
//   El comprobante se guarda en un espacio privado; un super admin lo revisa y,
//   al aprobarlo, el plan se extiende por los meses pagados.
// - Historial de pagos con su estado y, si fue rechazado, el motivo.
// ============================================

interface Pago {
  id: string;
  plan: string | null;
  meses: number | null;
  monto: number;
  fecha_pago: string | null;
  referencia: string | null;
  comprobante_path: string | null;
  estado: string;
  motivo_rechazo: string | null;
  notas: string | null;
  created_at: string;
}

const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_COMPROBANTE = 5 * 1024 * 1024;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fechaCorta = (f: string | null) =>
  f ? new Date(f.length === 10 ? `${f}T12:00:00` : f).toLocaleDateString('es-CL') : '-';

const MiMembresia: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cargandoUser, setCargandoUser] = useState(true);
  const [mostrarDatosTransferencia, setMostrarDatosTransferencia] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // Formulario de pago
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [planPago, setPlanPago] = useState<'profesional' | 'enterprise'>('profesional');
  const [meses, setMeses] = useState(1);
  const [monto, setMonto] = useState('');
  const [montoEditado, setMontoEditado] = useState(false);
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [pagos, setPagos] = useState<Pago[]>([]);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setCargandoUser(false);
    };
    obtenerUsuario();
  }, []);

  const membresia = useMembresia(user?.id);
  const { plan: datosPlan, cargando: cargandoPlanes } = usePlanes();
  const esSuperAdmin = membresia.rol === 'super_admin';

  const cargarPagos = useCallback(async () => {
    const { data, error } = await supabase
      .from('pagos_manuales')
      .select('id, plan, meses, monto, fecha_pago, referencia, comprobante_path, estado, motivo_rechazo, notas, created_at')
      .order('created_at', { ascending: false });
    if (error) console.error('Error cargando pagos:', error);
    setPagos((data || []) as Pago[]);
  }, []);

  useEffect(() => {
    if (user && !esSuperAdmin) cargarPagos();
  }, [user, esSuperAdmin, cargarPagos]);

  // El plan sugerido para pagar: el actual si es pagado; si no, el que pidió al registrarse
  useEffect(() => {
    if (membresia.cargando) return;
    if (membresia.plan === 'enterprise' || membresia.planSolicitado === 'enterprise') setPlanPago('enterprise');
  }, [membresia.cargando, membresia.plan, membresia.planSolicitado]);

  // Monto sugerido = precio del plan × meses (se puede corregir si pagó otro monto)
  useEffect(() => {
    if (montoEditado) return;
    const p = datosPlan(planPago);
    if (p) setMonto(String(p.precio_mensual * meses));
  }, [planPago, meses, datosPlan, montoEditado]);

  const handleLogout = async () => {
    if (cerrandoSesion) return;
    if (!window.confirm('¿Estás seguro de que quieres cerrar sesión?')) return;
    try {
      setCerrandoSesion(true);
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
    } finally {
      setCerrandoSesion(false);
    }
  };

  const elegirArchivo = (f: File | null) => {
    setMensaje(null);
    if (!f) { setArchivo(null); return; }
    if (!TIPOS_COMPROBANTE.includes(f.type)) {
      setArchivo(null);
      setMensaje({ tipo: 'error', texto: 'El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF.' });
      return;
    }
    if (f.size > MAX_COMPROBANTE) {
      setArchivo(null);
      setMensaje({ tipo: 'error', texto: 'El comprobante no puede pesar más de 5 MB.' });
      return;
    }
    setArchivo(f);
  };

  const reiniciarFormulario = () => {
    setMeses(1);
    setMontoEditado(false);
    setFechaPago(hoyISO());
    setReferencia('');
    setNotas('');
    setArchivo(null);
  };

  const enviarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      setMensaje({ tipo: 'error', texto: 'Indica el monto pagado.' });
      return;
    }
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Adjunta el comprobante de pago.' });
      return;
    }
    if (!membresia.laboratorioId) {
      setMensaje({ tipo: 'error', texto: 'No se encontró tu laboratorio. Vuelve a iniciar sesión.' });
      return;
    }

    setEnviando(true);
    let ruta = '';
    try {
      // 1. Subir el comprobante a la carpeta privada del laboratorio
      const ext = (archivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      ruta = `${membresia.laboratorioId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error: errorSubida } = await supabase.storage
        .from('pagos')
        .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
      if (errorSubida) throw errorSubida;

      // 2. Informar el pago (la base valida plan, meses, monto y comprobante)
      const { error } = await supabase.rpc('registrar_pago', {
        p_plan: planPago,
        p_meses: meses,
        p_monto: montoNum,
        p_fecha_pago: fechaPago,
        p_referencia: referencia,
        p_comprobante_path: ruta,
        p_notas: notas
      });
      if (error) throw error;

      setMensaje({ tipo: 'ok', texto: '✅ Pago informado. Lo revisaremos y te avisaremos aquí mismo cuando quede aprobado.' });
      reiniciarFormulario();
      setMostrarFormulario(false);
      cargarPagos();
    } catch (error: any) {
      console.error('Error informando pago:', error);
      setMensaje({ tipo: 'error', texto: mensajeBD(error, 'No se pudo informar el pago. Intenta de nuevo.') });
    } finally {
      setEnviando(false);
    }
  };

  const verComprobante = async (ruta: string | null) => {
    if (!ruta) return;
    const ventana = window.open('', '_blank');
    const { data, error } = await supabase.storage.from('pagos').createSignedUrl(ruta, 300);
    if (error || !data?.signedUrl) {
      ventana?.close();
      alert('No se pudo abrir el comprobante.');
      return;
    }
    if (ventana) ventana.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  };

  if (cargandoUser || membresia.cargando) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando información de tu membresía...</p>
      </div>
    );
  }

  const getEstadoStyles = () => {
    if (membresia.suspendido) return { bg: '#6b7280', text: 'white', icon: '⏸️', label: 'SUSPENDIDA' };
    if (membresia.estaActiva) return { bg: '#10b981', text: 'white', icon: '✅', label: 'ACTIVA' };
    return { bg: '#ef4444', text: 'white', icon: '⚠️', label: 'VENCIDA' };
  };
  const estadoStyles = getEstadoStyles();

  const precioProfesional = datosPlan('profesional')?.precio_mensual;
  const precioEnterprise = datosPlan('enterprise')?.precio_mensual;
  const pendientes = pagos.filter(p => p.estado === 'pendiente').length;

  const etiquetaEstadoPago = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { texto: '⏳ En revisión', bg: '#fef3c7', color: '#92400e' };
      case 'verificado': return { texto: '✅ Aprobado', bg: '#d1fae5', color: '#065f46' };
      case 'rechazado': return { texto: '❌ Rechazado', bg: '#fee2e2', color: '#991b1b' };
      default: return { texto: estado, bg: '#f1f5f9', color: '#334155' };
    }
  };

  return (
    <div style={styles.container}>
      <Header
        user={user ? {
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.nombre || user.email.split('@')[0],
          rol: membresia.rol || 'admin',
          laboratorio: membresia.laboratorio || user.user_metadata?.laboratorio,
          telefono: user.user_metadata?.telefono
        } : undefined}
        onLogout={handleLogout}
        cerrandoSesion={cerrandoSesion}
        showBackButton={true}
        onBack={() => navigate('/dashboard')}
        title="Mi Membresía"
        showTitle
      />

      <div style={styles.content}>
        {/* Tarjeta de estado */}
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ ...styles.estadoBadge, backgroundColor: estadoStyles.bg, color: estadoStyles.text }}>
                {estadoStyles.icon} {estadoStyles.label}
              </div>
              <div>
                <h2 style={styles.planTitle}>{nombrePlan(membresia.plan)}</h2>
                <p style={styles.planSubtitle}>
                  {membresia.suspendido
                    ? 'Laboratorio suspendido: solo lectura'
                    : membresia.estaActiva
                      ? `Plan activo${membresia.plan !== 'gratuito' && membresia.precioMensual ? ` · ${formatearCLP(membresia.precioMensual)} al mes` : ''}`
                      : 'Plan vencido: solo lectura'}
                </p>
              </div>
            </div>

            <div style={styles.statusInfo}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Días restantes</div>
                <div style={{ ...styles.infoValue, color: membresia.dias_restantes <= 7 ? '#ef4444' : '#059669' }}>
                  {membresia.dias_restantes} días
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Vence el</div>
                <div style={styles.infoValue}>{fechaCorta(membresia.fecha_expiracion)}</div>
              </div>
            </div>
          </div>

          {/* Uso del plan */}
          <div style={styles.usoGrid}>
            <div style={styles.usoItem}>
              <div style={styles.infoLabel}>Clínicas</div>
              <div style={styles.usoValor}>
                {membresia.clinicas}{membresia.limiteClinicas !== null ? ` / ${membresia.limiteClinicas}` : ''}
              </div>
              {membresia.limiteClinicas === null && <div style={styles.usoNota}>Sin límite</div>}
            </div>
            <div style={styles.usoItem}>
              <div style={styles.infoLabel}>Trabajos este mes</div>
              <div style={{
                ...styles.usoValor,
                color: membresia.limiteTrabajosMes !== null && membresia.trabajosMes >= membresia.limiteTrabajosMes ? '#ef4444' : '#1e293b'
              }}>
                {membresia.trabajosMes}{membresia.limiteTrabajosMes !== null ? ` / ${membresia.limiteTrabajosMes}` : ''}
              </div>
              {membresia.limiteTrabajosMes === null && <div style={styles.usoNota}>Sin límite</div>}
            </div>
          </div>

          {/* Características del plan */}
          <div style={styles.featuresGrid}>
            {membresia.plan === 'gratuito' && (
              <>
                <div style={styles.featureItem}>✓ Hasta {membresia.limiteClinicas ?? 3} clínicas</div>
                <div style={styles.featureItem}>✓ Hasta {membresia.limiteTrabajosMes ?? 10} trabajos por mes</div>
                <div style={styles.featureItem}>✓ Pacientes ilimitados</div>
                <div style={styles.featureItem}>✓ Prueba de 30 días</div>
              </>
            )}
            {membresia.plan === 'profesional' && (
              <>
                <div style={styles.featureItem}>✓ Trabajos ilimitados</div>
                <div style={styles.featureItem}>✓ Hasta 3 laboratorios</div>
                <div style={styles.featureItem}>✓ Soporte prioritario</div>
                <div style={styles.featureItem}>✓ Reportes avanzados</div>
              </>
            )}
            {membresia.plan === 'enterprise' && (
              <>
                <div style={styles.featureItem}>✓ Todo en Profesional</div>
                <div style={styles.featureItem}>✓ Laboratorios ilimitados</div>
                <div style={styles.featureItem}>✓ Soporte 24/7</div>
                <div style={styles.featureItem}>✓ API de integración</div>
              </>
            )}
          </div>

          {!membresia.estaActiva && !esSuperAdmin && (
            <div style={styles.avisoVencido}>
              <strong>{membresia.suspendido ? 'Tu laboratorio está suspendido.' : 'Tu plan está vencido.'}</strong>{' '}
              Puedes ver tu información y avanzar los trabajos en curso, pero no crear registros nuevos.
              Para reactivarlo, paga e informa el pago aquí abajo.
            </div>
          )}
        </div>

        {/* Pagar e informar el pago */}
        {!esSuperAdmin && (
          <div style={styles.statusCard}>
            <h3 style={styles.seccionTitulo}>💳 Pagar mi plan</h3>

            <div style={styles.planOpciones}>
              <div style={styles.planOpcion}>
                <h4 style={styles.planOpcionTitulo}>Plan Profesional</h4>
                <div style={styles.planOpcionPrecio}>
                  {cargandoPlanes ? '...' : formatearCLP(precioProfesional)}
                  <span style={styles.planOpcionPeriodo}>/mes</span>
                </div>
                <ul style={styles.planOpcionLista}>
                  <li>✓ Clínicas ilimitadas</li>
                  <li>✓ Trabajos ilimitados</li>
                  <li>✓ Soporte prioritario</li>
                  <li>✓ Reportes avanzados</li>
                </ul>
              </div>
              <div style={styles.planOpcion}>
                <h4 style={styles.planOpcionTitulo}>Plan Enterprise</h4>
                <div style={styles.planOpcionPrecio}>
                  {cargandoPlanes ? '...' : formatearCLP(precioEnterprise)}
                  <span style={styles.planOpcionPeriodo}>/mes</span>
                </div>
                <ul style={styles.planOpcionLista}>
                  <li>✓ Todo del plan Profesional</li>
                  <li>✓ Laboratorios ilimitados</li>
                  <li>✓ Soporte 24/7</li>
                  <li>✓ API de integración</li>
                </ul>
              </div>
            </div>

            <ol style={styles.pasos}>
              <li>Transfiere el monto del plan por los meses que quieras pagar.</li>
              <li>Informa el pago con el comprobante (foto o PDF).</li>
              <li>Revisamos el pago y tu plan se extiende por los meses pagados.</li>
            </ol>

            <div style={styles.botonesFila}>
              <button
                onClick={() => setMostrarDatosTransferencia(!mostrarDatosTransferencia)}
                style={styles.botonSecundario}
              >
                🏦 {mostrarDatosTransferencia ? 'Ocultar' : 'Ver'} datos de transferencia
              </button>
              <button
                onClick={() => { setMostrarFormulario(!mostrarFormulario); setMensaje(null); }}
                style={styles.renovacionButton}
                disabled={pendientes >= 3}
                title={pendientes >= 3 ? 'Tienes 3 pagos en revisión' : undefined}
              >
                📤 {mostrarFormulario ? 'Cerrar formulario' : 'Informar un pago'}
              </button>
            </div>

            {mostrarDatosTransferencia && (
              <div style={styles.transferCard}>
                <h4 style={{ color: '#1e40af', margin: '0 0 1rem' }}>Datos bancarios</h4>
                <div style={styles.transferDetails}>
                  <p><strong>Banco:</strong> Banco de Chile</p>
                  <p><strong>Cuenta Corriente:</strong> 123-45678-9</p>
                  <p><strong>RUT:</strong> 12.345.678-9</p>
                  <p><strong>Titular:</strong> DentalFlow SpA</p>
                  <p><strong>Monto:</strong> {formatearCLP(precioProfesional)} al mes (Profesional) o {formatearCLP(precioEnterprise)} al mes (Enterprise)</p>
                </div>
              </div>
            )}

            {mensaje && (
              <div style={{
                ...styles.mensaje,
                backgroundColor: mensaje.tipo === 'ok' ? '#d1fae5' : '#fee2e2',
                color: mensaje.tipo === 'ok' ? '#065f46' : '#991b1b'
              }}>
                {mensaje.texto}
              </div>
            )}

            {mostrarFormulario && (
              <form onSubmit={enviarPago} style={styles.formulario}>
                <div style={styles.formGrid}>
                  <label style={styles.campo}>
                    <span style={styles.campoLabel}>Plan pagado *</span>
                    <select style={styles.input} value={planPago}
                      onChange={(e) => setPlanPago(e.target.value as 'profesional' | 'enterprise')}>
                      <option value="profesional">Profesional ({formatearCLP(precioProfesional)}/mes)</option>
                      <option value="enterprise">Enterprise ({formatearCLP(precioEnterprise)}/mes)</option>
                    </select>
                  </label>
                  <label style={styles.campo}>
                    <span style={styles.campoLabel}>Meses pagados *</span>
                    <select style={styles.input} value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'mes' : 'meses'}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.campo}>
                    <span style={styles.campoLabel}>Monto pagado (CLP) *</span>
                    <input style={styles.input} type="number" min="1" step="1" inputMode="numeric" value={monto}
                      onChange={(e) => { setMonto(e.target.value); setMontoEditado(true); }} />
                    <span style={styles.ayuda}>
                      Valor del plan: {formatearCLP((datosPlan(planPago)?.precio_mensual || 0) * meses)}
                      {montoEditado && (
                        <button type="button" style={styles.linkBoton} onClick={() => setMontoEditado(false)}>usar este valor</button>
                      )}
                    </span>
                  </label>
                  <label style={styles.campo}>
                    <span style={styles.campoLabel}>Fecha de pago *</span>
                    <input style={styles.input} type="date" value={fechaPago} max={hoyISO()}
                      onChange={(e) => setFechaPago(e.target.value)} required />
                  </label>
                  <label style={styles.campo}>
                    <span style={styles.campoLabel}>N° de operación</span>
                    <input style={styles.input} type="text" value={referencia} maxLength={60}
                      onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" />
                  </label>
                  <label style={styles.campo}>
                    <span style={styles.campoLabel}>Comprobante (JPG, PNG o PDF, máx. 5 MB) *</span>
                    <input style={{ ...styles.input, padding: '0.5rem' }} type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => elegirArchivo(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <label style={{ ...styles.campo, marginTop: '0.75rem' }}>
                  <span style={styles.campoLabel}>Comentario</span>
                  <textarea style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }} value={notas}
                    maxLength={500} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="submit" style={styles.renovacionButton} disabled={enviando}>
                    {enviando ? 'Enviando...' : 'Enviar pago para revisión'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Historial de pagos */}
        {!esSuperAdmin && (
          <div style={styles.statusCard}>
            <h3 style={styles.seccionTitulo}>🧾 Mis pagos</h3>
            {pagos.length === 0 ? (
              <p style={{ color: '#64748b', margin: 0 }}>Aún no has informado pagos.</p>
            ) : (
              <div style={styles.listaPagos}>
                {pagos.map(p => {
                  const etiqueta = etiquetaEstadoPago(p.estado);
                  return (
                    <div key={p.id} style={styles.pagoItem}>
                      <div style={styles.pagoFila}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {nombrePlan(p.plan)} · {p.meses || 1} {(p.meses || 1) === 1 ? 'mes' : 'meses'} · {formatearCLP(p.monto)}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#64748b', overflowWrap: 'anywhere' }}>
                            Pagado el {fechaCorta(p.fecha_pago)}
                            {p.referencia && !p.referencia.startsWith('DF-') ? ` · Op. ${p.referencia}` : ''}
                            {' · '}Informado el {fechaCorta(p.created_at)}
                          </div>
                        </div>
                        <span style={{ ...styles.etiqueta, backgroundColor: etiqueta.bg, color: etiqueta.color }}>
                          {etiqueta.texto}
                        </span>
                      </div>
                      {p.estado === 'rechazado' && p.motivo_rechazo && (
                        <div style={styles.motivo}>Motivo: {p.motivo_rechazo}</div>
                      )}
                      {p.comprobante_path && (
                        <button style={styles.linkBoton} onClick={() => verComprobante(p.comprobante_path)}>
                          Ver comprobante
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Información de soporte */}
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>¿Necesitas ayuda?</h3>
          <div style={styles.contactoInfo}>
            <div style={styles.contactoItem}>
              <span style={styles.contactoIcon}>📧</span>
              <span>soporte@dentalflow.com (soporte técnico)</span>
            </div>
            <div style={styles.contactoItem}>
              <span style={styles.contactoIcon}>📞</span>
              <span>+56 9 84201 462 (WhatsApp)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc' },
  content: { padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: '1000px', margin: '0 auto' },
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', color: '#64748b'
  },
  spinner: {
    width: '50px', height: '50px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6',
    borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem'
  },
  statusCard: {
    backgroundColor: 'white', borderRadius: '1rem', padding: 'clamp(1rem, 4vw, 2rem)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '1.5rem'
  },
  statusHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'
  },
  estadoBadge: {
    padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 600, fontSize: '0.875rem',
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
  },
  planTitle: { fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' },
  planSubtitle: { color: '#64748b', margin: '0.25rem 0 0 0' },
  statusInfo: { display: 'flex', gap: '2rem', flexWrap: 'wrap' },
  infoItem: { textAlign: 'left' },
  infoLabel: { fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' },
  infoValue: { fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' },
  usoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
    gap: '1rem', marginBottom: '1.5rem'
  },
  usoItem: { border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem' },
  usoValor: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' },
  usoNota: { fontSize: '0.75rem', color: '#64748b' },
  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
    gap: '0.75rem', padding: '1.25rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem'
  },
  featureItem: { color: '#374151', fontSize: '0.9375rem' },
  avisoVencido: {
    marginTop: '1.25rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#fef2f2',
    border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.9375rem', lineHeight: 1.5
  },
  seccionTitulo: { fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1rem' },
  planOpciones: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
    gap: '1rem', marginBottom: '1.25rem'
  },
  planOpcion: { border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem' },
  planOpcionTitulo: { margin: '0 0 0.5rem', color: '#1e293b', fontSize: '1.0625rem' },
  planOpcionPrecio: { fontSize: '1.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.75rem' },
  planOpcionPeriodo: { fontSize: '0.9375rem', fontWeight: 500, color: '#64748b' },
  planOpcionLista: { margin: 0, paddingLeft: '1rem', color: '#475569', fontSize: '0.875rem', lineHeight: 1.8 },
  pasos: { margin: '0 0 1.25rem', paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9375rem', lineHeight: 1.7 },
  botonesFila: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  renovacionButton: {
    backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.25rem',
    borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem'
  },
  botonSecundario: {
    backgroundColor: 'white', color: '#1e40af', border: '1px solid #bfdbfe', padding: '0.75rem 1.25rem',
    borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem'
  },
  transferCard: {
    marginTop: '1rem', padding: '1.25rem', backgroundColor: '#eff6ff', borderRadius: '0.75rem',
    border: '1px solid #bfdbfe'
  },
  transferDetails: { color: '#1e293b', fontSize: '0.9375rem', lineHeight: 1.4, overflowWrap: 'anywhere' },
  mensaje: { marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: '0.5rem', fontWeight: 500 },
  formulario: { marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' },
  formGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.875rem'
  },
  campo: { display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: 0 },
  campoLabel: { fontSize: '0.8125rem', fontWeight: 600, color: '#334155' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '0.625rem 0.75rem', border: '1px solid #cbd5e1',
    borderRadius: '0.5rem', fontSize: '0.9375rem', backgroundColor: 'white', color: '#1e293b'
  },
  ayuda: { fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  linkBoton: {
    background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0,
    fontSize: '0.8125rem', textDecoration: 'underline'
  },
  listaPagos: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  pagoItem: { border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.875rem 1rem' },
  pagoFila: { display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  etiqueta: { padding: '0.25rem 0.625rem', borderRadius: '1rem', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' },
  motivo: {
    marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem',
    color: '#991b1b', fontSize: '0.875rem'
  },
  infoCard: {
    backgroundColor: 'white', borderRadius: '1rem', padding: 'clamp(1rem, 4vw, 1.5rem)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  infoTitle: { margin: '0 0 1rem', color: '#1e293b', fontSize: '1.125rem' },
  contactoInfo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  contactoItem: { display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#475569', overflowWrap: 'anywhere' },
  contactoIcon: { fontSize: '1.125rem' }
};

export default MiMembresia;
