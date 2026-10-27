import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from './Header';
import { nombrePlan } from '../hooks/useMembresia';
import { usePlanes, formatearCLP, mensajeBD } from '../hooks/usePlanes';

// ============================================
// PANEL DE ADMINISTRACIÓN (solo super admin)
// - Laboratorios: plan, vencimiento, estado y SOLO cantidades de uso.
//   Nunca se muestran clínicas, pacientes, trabajos ni precios del laboratorio.
//   Acciones: cambiar plan, extender meses, fijar vencimiento, suspender/reactivar.
// - Planes: precio mensual de Profesional y Enterprise.
// Todo pasa por funciones de la base de datos que verifican que sea super admin.
// ============================================

interface AdminPanelProps {
  onBack: () => void;
}

interface LabAdmin {
  id: string;
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  admin_nombre: string | null;
  admin_email: string | null;
  plan: string;
  plan_solicitado: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  vigente: boolean;
  dias_restantes: number | null;
  creado: string | null;
  clinicas: number;
  dentistas: number;
  laboratoristas: number;
  trabajos: number;
  trabajos_mes: number;
  pagos_pendientes: number;
}

const fecha = (f: string | null) =>
  f ? new Date(f.length === 10 ? `${f}T12:00:00` : f).toLocaleDateString('es-CL') : '-';

const situacion = (l: LabAdmin) =>
  l.estado === 'suspendido' ? 'suspendido' : l.vigente ? 'activo' : 'vencido';

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<any>(null);
  const [vista, setVista] = useState<'laboratorios' | 'planes'>('laboratorios');
  const [labs, setLabs] = useState<LabAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'vencido' | 'suspendido'>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [mesesExtender, setMesesExtender] = useState(1);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [procesando, setProcesando] = useState(false);

  const { planes, recargar: recargarPlanes } = usePlanes();
  const [precios, setPrecios] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase.from('perfiles_usuarios').select('nombre, rol').eq('id', user.id).maybeSingle();
      setUsuario({ id: user.id, email: user.email, nombre: perfil?.nombre || user.email?.split('@')[0], rol: perfil?.rol || 'super_admin', laboratorio: 'DentalFlow' });
    })();
  }, []);

  const cargarLabs = useCallback(async () => {
    setCargando(true);
    setError('');
    const { data, error } = await supabase.rpc('admin_laboratorios');
    if (error) {
      console.error('Error cargando laboratorios:', error);
      setError(mensajeBD(error, 'No se pudieron cargar los laboratorios.'));
      setLabs([]);
    } else {
      setLabs((data || []) as LabAdmin[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargarLabs(); }, [cargarLabs]);

  useEffect(() => {
    const p: Record<string, string> = {};
    planes.forEach(pl => { p[pl.id] = String(pl.precio_mensual); });
    setPrecios(p);
  }, [planes]);

  const ejecutar = async (fn: string, args: Record<string, any>, exito: string) => {
    setProcesando(true);
    const { error } = await supabase.rpc(fn, args);
    setProcesando(false);
    if (error) {
      alert('❌ ' + mensajeBD(error, 'No se pudo completar la acción.'));
      return false;
    }
    alert('✅ ' + exito);
    await cargarLabs();
    return true;
  };

  const cambiarPlan = (l: LabAdmin, plan: string) => {
    if (plan === l.plan) return;
    if (!window.confirm(`¿Cambiar el plan de "${l.nombre}" de ${nombrePlan(l.plan)} a ${nombrePlan(plan)}?\n(El vencimiento no cambia.)`)) return;
    ejecutar('admin_cambiar_plan', { p_lab: l.id, p_plan: plan }, `Plan cambiado a ${nombrePlan(plan)}.`);
  };

  const extender = (l: LabAdmin) => {
    if (!window.confirm(`¿Extender el plan de "${l.nombre}" por ${mesesExtender} ${mesesExtender === 1 ? 'mes' : 'meses'}?\n(Se suma desde el vencimiento actual, o desde hoy si ya venció.)`)) return;
    ejecutar('admin_extender_plan', { p_lab: l.id, p_meses: mesesExtender }, 'Plan extendido.');
  };

  const fijarFecha = (l: LabAdmin) => {
    if (!nuevaFecha) { alert('Elige la nueva fecha de vencimiento.'); return; }
    if (!window.confirm(`¿Fijar el vencimiento de "${l.nombre}" en ${fecha(nuevaFecha)}?`)) return;
    ejecutar('admin_fijar_vencimiento', { p_lab: l.id, p_fecha: nuevaFecha }, 'Vencimiento actualizado.');
  };

  const cambiarEstado = (l: LabAdmin) => {
    const nuevo = l.estado === 'suspendido' ? 'activo' : 'suspendido';
    const texto = nuevo === 'suspendido'
      ? `¿Suspender "${l.nombre}"?\nQuedará en solo lectura: podrá ver su información y cerrar trabajos en curso, pero no crear nada nuevo.`
      : `¿Reactivar "${l.nombre}"?`;
    if (!window.confirm(texto)) return;
    ejecutar('admin_cambiar_estado', { p_lab: l.id, p_estado: nuevo }, nuevo === 'suspendido' ? 'Laboratorio suspendido.' : 'Laboratorio reactivado.');
  };

  const guardarPrecio = async (planId: string) => {
    const valor = Number(precios[planId]);
    if (!valor || valor <= 0 || !Number.isInteger(valor)) { alert('El precio debe ser un monto entero mayor a 0.'); return; }
    if (!window.confirm(`¿Cambiar el precio del plan ${nombrePlan(planId)} a ${formatearCLP(valor)} al mes?\nSe mostrará a los laboratorios desde ahora; los pagos ya informados no cambian.`)) return;
    setProcesando(true);
    const { error } = await supabase.rpc('admin_actualizar_precio_plan', { p_plan: planId, p_precio: valor });
    setProcesando(false);
    if (error) { alert('❌ ' + mensajeBD(error, 'No se pudo cambiar el precio.')); return; }
    alert('✅ Precio actualizado.');
    recargarPlanes();
  };

  const filtrados = labs.filter(l =>
    (filtro === 'todos' || situacion(l) === filtro) &&
    (!busqueda.trim() ||
      `${l.nombre || ''} ${l.email || ''} ${l.admin_email || ''} ${l.admin_nombre || ''}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
  );
  const total = (s: string) => labs.filter(l => situacion(l) === s).length;
  const pagosPendientes = labs.reduce((s, l) => s + (l.pagos_pendientes || 0), 0);

  const colorSituacion: Record<string, { bg: string; color: string; texto: string }> = {
    activo: { bg: '#d1fae5', color: '#065f46', texto: 'Activo' },
    vencido: { bg: '#fee2e2', color: '#991b1b', texto: 'Vencido' },
    suspendido: { bg: '#e5e7eb', color: '#374151', texto: 'Suspendido' }
  };

  return (
    <div style={styles.container}>
      <Header
        user={usuario || undefined}
        onLogout={async () => { await supabase.auth.signOut(); navigate('/'); }}
        showBackButton
        onBack={onBack}
        title="Panel de Administración"
        showTitle
      />

      <main style={styles.main}>
        <h1 style={styles.titulo}>👑 Panel de Administración</h1>
        <p style={styles.subtitulo}>Laboratorios, planes y vencimientos. Solo se muestran cantidades de uso.</p>

        <div style={styles.stats}>
          <div style={styles.stat}><div style={styles.statNum}>{labs.length}</div><div style={styles.statLabel}>Laboratorios</div></div>
          <div style={styles.stat}><div style={{ ...styles.statNum, color: '#059669' }}>{total('activo')}</div><div style={styles.statLabel}>Activos</div></div>
          <div style={styles.stat}><div style={{ ...styles.statNum, color: '#dc2626' }}>{total('vencido')}</div><div style={styles.statLabel}>Vencidos</div></div>
          <div style={styles.stat}><div style={{ ...styles.statNum, color: '#4b5563' }}>{total('suspendido')}</div><div style={styles.statLabel}>Suspendidos</div></div>
          <button style={{ ...styles.stat, cursor: 'pointer', border: pagosPendientes ? '2px solid #f59e0b' : '1px solid #e2e8f0' }}
            onClick={() => navigate('/control-pagos')}>
            <div style={{ ...styles.statNum, color: '#d97706' }}>{pagosPendientes}</div>
            <div style={styles.statLabel}>Pagos por revisar →</div>
          </button>
        </div>

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(vista === 'laboratorios' ? styles.tabActiva : {}) }} onClick={() => setVista('laboratorios')}>🏢 Laboratorios</button>
          <button style={{ ...styles.tab, ...(vista === 'planes' ? styles.tabActiva : {}) }} onClick={() => setVista('planes')}>💰 Planes y precios</button>
        </div>

        {vista === 'laboratorios' && (
          <>
            <div style={styles.filtros}>
              <div style={styles.chips}>
                {(['todos', 'activo', 'vencido', 'suspendido'] as const).map(f => (
                  <button key={f} onClick={() => setFiltro(f)} style={{ ...styles.chip, ...(filtro === f ? styles.chipActivo : {}) }}>
                    {f === 'todos' ? 'Todos' : colorSituacion[f].texto + 's'}
                  </button>
                ))}
              </div>
              <input style={styles.input} placeholder="Buscar por laboratorio, administrador o correo..."
                value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {cargando ? (
              <p style={{ color: '#64748b' }}>Cargando laboratorios...</p>
            ) : filtrados.length === 0 ? (
              <div style={styles.vacio}>No hay laboratorios con ese filtro.</div>
            ) : (
              <div style={styles.lista}>
                {filtrados.map(l => {
                  const s = colorSituacion[situacion(l)];
                  const estaAbierto = abierto === l.id;
                  return (
                    <div key={l.id} style={styles.tarjeta}>
                      <div style={styles.fila}>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.labNombre}>{l.nombre || 'Sin nombre'}</div>
                          <div style={styles.secundario}>
                            {l.admin_nombre ? `${l.admin_nombre} · ` : ''}{l.admin_email || l.email || '-'}
                            {l.telefono ? ` · ${l.telefono}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {l.pagos_pendientes > 0 && (
                            <span style={{ ...styles.etiqueta, backgroundColor: '#fef3c7', color: '#92400e' }}>
                              {l.pagos_pendientes} pago{l.pagos_pendientes > 1 ? 's' : ''} por revisar
                            </span>
                          )}
                          <span style={{ ...styles.etiqueta, backgroundColor: s.bg, color: s.color }}>{s.texto}</span>
                        </div>
                      </div>

                      <div style={styles.datos}>
                        <div><span style={styles.dLabel}>Plan</span><span style={styles.dValor}>{nombrePlan(l.plan)}</span>
                          {l.plan_solicitado && l.plan_solicitado !== l.plan && l.plan === 'gratuito' && (
                            <span style={styles.dNota}>Pidió {nombrePlan(l.plan_solicitado)} al registrarse</span>
                          )}
                        </div>
                        <div><span style={styles.dLabel}>Vence</span><span style={styles.dValor}>{fecha(l.fecha_vencimiento)}</span>
                          <span style={styles.dNota}>
                            {l.dias_restantes === null ? '' : l.dias_restantes >= 0 ? `${l.dias_restantes} días restantes` : `vencido hace ${-l.dias_restantes} días`}
                          </span>
                        </div>
                        <div><span style={styles.dLabel}>Registrado</span><span style={styles.dValor}>{fecha(l.creado)}</span></div>
                        <div><span style={styles.dLabel}>Uso</span>
                          <span style={styles.dValor}>{l.clinicas} clínicas · {l.dentistas} dentistas</span>
                          <span style={styles.dNota}>{l.trabajos} trabajos ({l.trabajos_mes} este mes) · {l.laboratoristas} laboratoristas activos</span>
                        </div>
                      </div>

                      <button style={styles.botonSec} onClick={() => { setAbierto(estaAbierto ? null : l.id); setMesesExtender(1); setNuevaFecha(l.fecha_vencimiento || ''); }}>
                        {estaAbierto ? 'Cerrar acciones' : '⚙️ Gestionar'}
                      </button>

                      {estaAbierto && (
                        <div style={styles.acciones}>
                          <div style={styles.accion}>
                            <span style={styles.dLabel}>Cambiar plan</span>
                            <select style={styles.select} value={l.plan} disabled={procesando}
                              onChange={(e) => cambiarPlan(l, e.target.value)}>
                              <option value="gratuito">Prueba Gratuita</option>
                              <option value="profesional">Profesional</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </div>
                          <div style={styles.accion}>
                            <span style={styles.dLabel}>Extender (meses)</span>
                            <div style={styles.enLinea}>
                              <select style={styles.select} value={mesesExtender} onChange={(e) => setMesesExtender(Number(e.target.value))}>
                                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <button style={styles.botonOk} disabled={procesando} onClick={() => extender(l)}>Extender</button>
                            </div>
                          </div>
                          <div style={styles.accion}>
                            <span style={styles.dLabel}>Fijar vencimiento</span>
                            <div style={styles.enLinea}>
                              <input type="date" style={styles.select} value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
                              <button style={styles.botonPrim} disabled={procesando} onClick={() => fijarFecha(l)}>Guardar</button>
                            </div>
                          </div>
                          <div style={styles.accion}>
                            <span style={styles.dLabel}>Estado</span>
                            <button style={l.estado === 'suspendido' ? styles.botonOk : styles.botonNo} disabled={procesando} onClick={() => cambiarEstado(l)}>
                              {l.estado === 'suspendido' ? '▶️ Reactivar' : '⏸️ Suspender'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {vista === 'planes' && (
          <div style={styles.lista}>
            {planes.map(p => (
              <div key={p.id} style={styles.tarjeta}>
                <div style={styles.fila}>
                  <div>
                    <div style={styles.labNombre}>{nombrePlan(p.id)}</div>
                    <div style={styles.secundario}>
                      {p.limite_clinicas ? `Hasta ${p.limite_clinicas} clínicas` : 'Clínicas ilimitadas'} ·{' '}
                      {p.limite_trabajos_mes ? `hasta ${p.limite_trabajos_mes} trabajos por mes` : 'trabajos ilimitados'}
                    </div>
                  </div>
                  <div style={styles.precioActual}>{p.precio_mensual ? `${formatearCLP(p.precio_mensual)}/mes` : 'Gratis'}</div>
                </div>
                {p.id !== 'gratuito' && (
                  <div style={{ ...styles.enLinea, marginTop: '0.875rem' }}>
                    <label style={{ ...styles.accion, flex: '1 1 180px' }}>
                      <span style={styles.dLabel}>Nuevo precio mensual (CLP)</span>
                      <input type="number" min="1" step="1" inputMode="numeric" style={styles.select}
                        value={precios[p.id] ?? ''} onChange={(e) => setPrecios(prev => ({ ...prev, [p.id]: e.target.value }))} />
                    </label>
                    <button style={styles.botonPrim} disabled={procesando || Number(precios[p.id]) === p.precio_mensual}
                      onClick={() => guardarPrecio(p.id)}>Guardar precio</button>
                  </div>
                )}
              </div>
            ))}
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
              El precio se usa en Registro y Mi Membresía, y como "valor del plan" al revisar pagos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  main: { maxWidth: '1200px', margin: '0 auto', padding: 'clamp(1rem, 4vw, 2rem)' },
  titulo: { fontSize: 'clamp(1.375rem, 4vw, 1.75rem)', fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem' },
  subtitulo: { color: '#64748b', margin: '0 0 1.25rem' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
  stat: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', font: 'inherit' },
  statNum: { fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' },
  statLabel: { fontSize: '0.8125rem', color: '#64748b' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  tab: { padding: '0.625rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600, color: '#334155' },
  tabActiva: { backgroundColor: '#2563eb', borderColor: '#2563eb', color: 'white' },
  filtros: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' },
  chips: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  chip: { padding: '0.5rem 0.875rem', borderRadius: '2rem', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 },
  chipActivo: { backgroundColor: '#1e293b', borderColor: '#1e293b', color: 'white' },
  input: { width: '100%', boxSizing: 'border-box', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9375rem' },
  error: { padding: '0.875rem 1rem', borderRadius: '0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: '1rem' },
  vacio: { padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' },
  lista: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  tarjeta: { backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: 'clamp(0.875rem, 3vw, 1.25rem)' },
  fila: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' },
  labNombre: { fontWeight: 700, fontSize: '1.0625rem', color: '#1e293b', overflowWrap: 'anywhere' },
  secundario: { color: '#64748b', fontSize: '0.8125rem', overflowWrap: 'anywhere' },
  etiqueta: { padding: '0.25rem 0.625rem', borderRadius: '1rem', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' },
  datos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem', margin: '1rem 0' },
  dLabel: { display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.125rem' },
  dValor: { display: 'block', fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' },
  dNota: { display: 'block', fontSize: '0.75rem', color: '#64748b' },
  acciones: { marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.875rem' },
  accion: { display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 },
  enLinea: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' },
  select: { padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', minWidth: 0, boxSizing: 'border-box' },
  precioActual: { fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' },
  botonOk: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonNo: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonPrim: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonSec: { backgroundColor: 'white', color: '#1e40af', border: '1px solid #bfdbfe', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }
};

export default AdminPanel;
