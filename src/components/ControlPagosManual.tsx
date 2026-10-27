import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from './Header';
import { nombrePlan } from '../hooks/useMembresia';
import { formatearCLP, mensajeBD } from '../hooks/usePlanes';

// ============================================
// CONTROL DE PAGOS (solo super admin)
// Los laboratorios informan sus pagos desde Mi Membresía. Aquí se revisan:
// - Aprobar: se eligen los meses (por defecto los informados). El plan del
//   laboratorio pasa al plan pagado y se extiende desde su vencimiento actual
//   (o desde hoy si ya venció). Si estaba suspendido, se reactiva.
// - Rechazar: con un motivo que el laboratorio ve en Mi Membresía.
// Los comprobantes son privados: se abren con un enlace temporal.
// ============================================

interface PagoAdmin {
  id: string;
  laboratorio_id: string | null;
  laboratorio: string | null;
  admin_email: string | null;
  plan: string | null;
  meses: number | null;
  monto: number;
  monto_esperado: number | null;
  fecha_pago: string | null;
  referencia: string | null;
  comprobante_path: string | null;
  notas: string | null;
  estado: string;
  motivo_rechazo: string | null;
  creado: string;
  revisado: string | null;
  plan_actual: string | null;
  vencimiento_actual: string | null;
}

const fecha = (f: string | null) =>
  f ? new Date(f.length === 10 ? `${f}T12:00:00` : f).toLocaleDateString('es-CL') : '-';

// Vencimiento resultante si se aprueba: desde el vencimiento actual (o hoy si ya venció) + meses
const vencimientoResultante = (actual: string | null, meses: number) => {
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  let base = actual ? new Date(`${actual}T12:00:00`) : hoy;
  if (base < hoy) base = hoy;
  const r = new Date(base);
  const dia = r.getDate();
  r.setMonth(r.getMonth() + meses);
  if (r.getDate() < dia) r.setDate(0); // 31 de enero + 1 mes = 28/29 de febrero (igual que la base)
  return r.toLocaleDateString('es-CL');
};

const ControlPagosManual: React.FC = () => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<any>(null);
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [mesesAprobar, setMesesAprobar] = useState<Record<string, number>>({});
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase.from('perfiles_usuarios').select('nombre, rol').eq('id', user.id).maybeSingle();
      setUsuario({ id: user.id, email: user.email, nombre: perfil?.nombre || user.email?.split('@')[0], rol: perfil?.rol || 'super_admin', laboratorio: 'DentalFlow' });
    })();
  }, []);

  const cargarPagos = useCallback(async () => {
    setCargando(true);
    setError('');
    const { data, error } = await supabase.rpc('admin_pagos');
    if (error) {
      console.error('Error cargando pagos:', error);
      setError(mensajeBD(error, 'No se pudieron cargar los pagos.'));
      setPagos([]);
    } else {
      setPagos((data || []) as PagoAdmin[]);
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargarPagos(); }, [cargarPagos]);

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

  const aprobar = async (p: PagoAdmin) => {
    const meses = mesesAprobar[p.id] ?? p.meses ?? 1;
    const nuevo = vencimientoResultante(p.vencimiento_actual, meses);
    if (!window.confirm(
      `¿Aprobar el pago de ${p.laboratorio || 'este laboratorio'}?\n\n` +
      `Plan: ${nombrePlan(p.plan)} · ${meses} ${meses === 1 ? 'mes' : 'meses'}\n` +
      `Nuevo vencimiento: ${nuevo}`
    )) return;
    setProcesando(p.id);
    const { data, error } = await supabase.rpc('aprobar_pago', { p_id: p.id, p_meses: meses });
    setProcesando(null);
    if (error) {
      alert('❌ ' + mensajeBD(error, 'No se pudo aprobar el pago.'));
      return;
    }
    alert(`✅ Pago aprobado. El plan vence el ${fecha(data as string)}.`);
    cargarPagos();
  };

  const confirmarRechazo = async (p: PagoAdmin) => {
    if (!motivo.trim()) {
      alert('Indica el motivo del rechazo (lo verá el laboratorio).');
      return;
    }
    setProcesando(p.id);
    const { error } = await supabase.rpc('rechazar_pago', { p_id: p.id, p_motivo: motivo.trim() });
    setProcesando(null);
    if (error) {
      alert('❌ ' + mensajeBD(error, 'No se pudo rechazar el pago.'));
      return;
    }
    setRechazando(null);
    setMotivo('');
    cargarPagos();
  };

  const filtrados = pagos.filter(p =>
    (filtroEstado === 'todos' || p.estado === filtroEstado) &&
    (!busqueda.trim() ||
      `${p.laboratorio || ''} ${p.admin_email || ''} ${p.referencia || ''}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
  );
  const cuenta = (estado: string) => pagos.filter(p => p.estado === estado).length;

  const etiqueta = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { texto: '⏳ Pendiente', bg: '#fef3c7', color: '#92400e' };
      case 'verificado': return { texto: '✅ Aprobado', bg: '#d1fae5', color: '#065f46' };
      case 'rechazado': return { texto: '❌ Rechazado', bg: '#fee2e2', color: '#991b1b' };
      default: return { texto: estado, bg: '#f1f5f9', color: '#334155' };
    }
  };

  return (
    <div style={styles.container}>
      <Header
        user={usuario || undefined}
        onLogout={async () => { await supabase.auth.signOut(); navigate('/'); }}
        showBackButton
        onBack={() => navigate('/dashboard')}
        title="Control de Pagos"
        showTitle
      />

      <main style={styles.main}>
        <h1 style={styles.titulo}>💳 Control de Pagos</h1>
        <p style={styles.subtitulo}>Pagos informados por los laboratorios desde Mi Membresía.</p>

        <div style={styles.filtros}>
          <div style={styles.chips}>
            {[
              { id: 'pendiente', texto: `Pendientes (${cuenta('pendiente')})` },
              { id: 'verificado', texto: `Aprobados (${cuenta('verificado')})` },
              { id: 'rechazado', texto: `Rechazados (${cuenta('rechazado')})` },
              { id: 'todos', texto: `Todos (${pagos.length})` }
            ].map(f => (
              <button key={f.id} onClick={() => setFiltroEstado(f.id)}
                style={{ ...styles.chip, ...(filtroEstado === f.id ? styles.chipActivo : {}) }}>
                {f.texto}
              </button>
            ))}
          </div>
          <input style={styles.buscador} placeholder="Buscar laboratorio, correo o N° de operación..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {cargando ? (
          <p style={{ color: '#64748b' }}>Cargando pagos...</p>
        ) : filtrados.length === 0 ? (
          <div style={styles.vacio}>No hay pagos {filtroEstado === 'todos' ? '' : `en estado "${etiqueta(filtroEstado).texto.replace(/^\S+\s/, '').toLowerCase()}"`}.</div>
        ) : (
          <div style={styles.lista}>
            {filtrados.map(p => {
              const e = etiqueta(p.estado);
              const meses = mesesAprobar[p.id] ?? p.meses ?? 1;
              const difiere = p.monto_esperado !== null && Number(p.monto) !== Number(p.monto_esperado);
              return (
                <div key={p.id} style={styles.tarjeta}>
                  <div style={styles.fila}>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.lab}>{p.laboratorio || 'Laboratorio eliminado'}</div>
                      <div style={styles.secundario}>{p.admin_email || '-'}</div>
                    </div>
                    <span style={{ ...styles.etiqueta, backgroundColor: e.bg, color: e.color }}>{e.texto}</span>
                  </div>

                  <div style={styles.datos}>
                    <div><span style={styles.dLabel}>Plan pagado</span><span style={styles.dValor}>{nombrePlan(p.plan)} · {p.meses || 1} {(p.meses || 1) === 1 ? 'mes' : 'meses'}</span></div>
                    <div>
                      <span style={styles.dLabel}>Monto</span>
                      <span style={{ ...styles.dValor, color: difiere ? '#b45309' : '#1e293b' }}>{formatearCLP(p.monto)}</span>
                      {difiere && <span style={styles.alerta}>Valor del plan: {formatearCLP(p.monto_esperado)}</span>}
                    </div>
                    <div><span style={styles.dLabel}>Fecha de pago</span><span style={styles.dValor}>{fecha(p.fecha_pago)}</span></div>
                    <div><span style={styles.dLabel}>N° de operación</span><span style={styles.dValor}>{p.referencia && !p.referencia.startsWith('DF-') ? p.referencia : 'No indicado'}</span></div>
                    <div><span style={styles.dLabel}>Plan actual</span><span style={styles.dValor}>{nombrePlan(p.plan_actual)} · vence {fecha(p.vencimiento_actual)}</span></div>
                    <div><span style={styles.dLabel}>Informado</span><span style={styles.dValor}>{fecha(p.creado)}{p.revisado ? ` · revisado ${fecha(p.revisado)}` : ''}</span></div>
                  </div>

                  {p.notas && <div style={styles.nota}>💬 {p.notas}</div>}
                  {p.estado === 'rechazado' && p.motivo_rechazo && <div style={styles.motivo}>Motivo del rechazo: {p.motivo_rechazo}</div>}

                  <div style={styles.acciones}>
                    {p.comprobante_path && (
                      <button style={styles.botonSec} onClick={() => verComprobante(p.comprobante_path)}>📎 Ver comprobante</button>
                    )}
                    {p.estado === 'pendiente' && rechazando !== p.id && (
                      <>
                        <label style={styles.mesesLabel}>
                          Meses a habilitar
                          <select style={styles.select} value={meses}
                            onChange={(ev) => setMesesAprobar(prev => ({ ...prev, [p.id]: Number(ev.target.value) }))}>
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                        <button style={styles.botonOk} disabled={procesando === p.id} onClick={() => aprobar(p)}>
                          {procesando === p.id ? 'Procesando...' : `✅ Aprobar (vence ${vencimientoResultante(p.vencimiento_actual, meses)})`}
                        </button>
                        <button style={styles.botonNo} disabled={procesando === p.id}
                          onClick={() => { setRechazando(p.id); setMotivo(''); }}>
                          ❌ Rechazar
                        </button>
                      </>
                    )}
                  </div>

                  {rechazando === p.id && (
                    <div style={styles.rechazoCaja}>
                      <label style={styles.dLabel}>Motivo del rechazo (lo verá el laboratorio)</label>
                      <textarea style={styles.textarea} value={motivo} maxLength={300}
                        onChange={(ev) => setMotivo(ev.target.value)}
                        placeholder="Ej: El monto no coincide con la transferencia recibida." />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button style={styles.botonSec} onClick={() => setRechazando(null)}>Cancelar</button>
                        <button style={styles.botonNo} disabled={procesando === p.id} onClick={() => confirmarRechazo(p)}>
                          {procesando === p.id ? 'Procesando...' : 'Confirmar rechazo'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  main: { maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1rem, 4vw, 2rem)' },
  titulo: { fontSize: 'clamp(1.375rem, 4vw, 1.75rem)', fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem' },
  subtitulo: { color: '#64748b', margin: '0 0 1.25rem' },
  filtros: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' },
  chips: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  chip: {
    padding: '0.5rem 0.875rem', borderRadius: '2rem', border: '1px solid #cbd5e1', backgroundColor: 'white',
    color: '#334155', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500
  },
  chipActivo: { backgroundColor: '#2563eb', borderColor: '#2563eb', color: 'white' },
  buscador: {
    width: '100%', boxSizing: 'border-box', padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
    border: '1px solid #cbd5e1', fontSize: '0.9375rem'
  },
  error: { padding: '0.875rem 1rem', borderRadius: '0.5rem', backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: '1rem' },
  vacio: { padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' },
  lista: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  tarjeta: { backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: 'clamp(0.875rem, 3vw, 1.25rem)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  fila: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' },
  lab: { fontWeight: 700, color: '#1e293b', fontSize: '1.0625rem', overflowWrap: 'anywhere' },
  secundario: { color: '#64748b', fontSize: '0.8125rem', overflowWrap: 'anywhere' },
  etiqueta: { padding: '0.25rem 0.625rem', borderRadius: '1rem', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' },
  datos: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
    gap: '0.75rem', margin: '1rem 0'
  },
  dLabel: { display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.125rem' },
  dValor: { display: 'block', fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', overflowWrap: 'anywhere' },
  alerta: { display: 'block', fontSize: '0.75rem', color: '#b45309' },
  nota: { padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', color: '#334155', fontSize: '0.875rem', marginBottom: '0.75rem', overflowWrap: 'anywhere' },
  motivo: { padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem', marginBottom: '0.75rem' },
  acciones: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' },
  mesesLabel: { display: 'flex', flexDirection: 'column', fontSize: '0.75rem', color: '#64748b', gap: '0.25rem' },
  select: { padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' },
  botonOk: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonNo: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonSec: { backgroundColor: 'white', color: '#1e40af', border: '1px solid #bfdbfe', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  rechazoCaja: { marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: '70px', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9375rem', resize: 'vertical' }
};

export default ControlPagosManual;
