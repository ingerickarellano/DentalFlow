import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ============================================
// AGREGAR UN TRABAJO DESDE GESTIÓN DE TRABAJOS
// Ventana con la clínica y el mes ya puestos: solo se completan paciente, RUT,
// dentista, laboratorista y prestaciones. Guarda igual que Crear Lista de Trabajo:
//  - el laboratorista no ve precios (los calcula la base de datos) y queda asignado a sí mismo
//  - si el paciente ya tiene un trabajo ese mes en esa clínica, se suma al existente
// ============================================

interface ServicioCatalogo {
  id: string;
  nombre: string;
  categoria: string;
  precio_base: number;
  activo: boolean;
  anio?: number;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
  clinica: { id: string; nombre: string } | null;
  mes: string; // 'YYYY-MM'
  dentistas: { id: string; nombre: string; clinica_id: string; especialidad?: string }[];
  laboratoristas: { id: string; nombre: string; usuario_id?: string }[];
  servicios: ServicioCatalogo[];
  esLaboratorista: boolean;
  miFichaLaboratorista: string;
  avisar: (texto: string, tipo?: 'exito' | 'error' | 'info') => void;
}

interface Linea {
  clave: string;
  servicio: ServicioCatalogo;
  cantidad: number;
  pieza: string;
  nota: string;
}

const normalizar = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clp = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
const nombreMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  const f = new Date(a, (m || 1) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return f.charAt(0).toUpperCase() + f.slice(1);
};

const NuevoTrabajoModal: React.FC<Props> = ({
  abierto, onCerrar, onGuardado, clinica, mes, dentistas, laboratoristas, servicios,
  esLaboratorista, miFichaLaboratorista, avisar
}) => {
  const [paciente, setPaciente] = useState('');
  const [rut, setRut] = useState('');
  const [dentista, setDentista] = useState('');
  const [laboratorista, setLaboratorista] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState<ServicioCatalogo | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [pieza, setPieza] = useState('');
  const [nota, setNota] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const refPaciente = useRef<HTMLInputElement>(null);

  // Al abrir: formulario limpio
  useEffect(() => {
    if (!abierto) return;
    setPaciente(''); setRut(''); setDentista('');
    setLaboratorista(esLaboratorista ? miFichaLaboratorista : '');
    setBusqueda(''); setElegido(null); setCantidad(1); setPieza(''); setNota(''); setLineas([]);
    setTimeout(() => refPaciente.current?.focus(), 50);
  }, [abierto, esLaboratorista, miFichaLaboratorista]);

  // Esc cierra
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando) onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [abierto, guardando, onCerrar]);

  // Catálogo del año del trabajo (si no hay servicios de ese año, todos los activos)
  const anioTrabajo = Number(mes.split('-')[0]);
  const catalogo = useMemo(() => {
    const activos = servicios.filter(s => s.activo !== false);
    const delAnio = activos.filter(s => s.anio === anioTrabajo);
    return (delAnio.length ? delAnio : activos).slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [servicios, anioTrabajo]);

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const lista = q ? catalogo.filter(s => normalizar(s.nombre).includes(q) || normalizar(s.categoria).includes(q)) : catalogo;
    return lista.slice(0, 60);
  }, [catalogo, busqueda]);

  if (!abierto || !clinica) return null;

  const dentistasClinica = dentistas.filter(d => d.clinica_id === clinica.id);
  const total = lineas.reduce((s, l) => s + l.servicio.precio_base * l.cantidad, 0);

  const agregarLinea = () => {
    if (!elegido) return;
    setLineas(prev => [...prev, {
      clave: `${elegido.id}-${Date.now()}-${Math.random()}`,
      servicio: elegido, cantidad: Math.max(1, cantidad || 1), pieza: pieza.trim(), nota: nota.trim()
    }]);
    setElegido(null); setCantidad(1); setPieza(''); setNota(''); setBusqueda('');
  };

  const guardar = async () => {
    if (!paciente.trim()) { avisar('Indica el nombre del paciente.', 'error'); refPaciente.current?.focus(); return; }
    if (lineas.length === 0) { avisar('Agrega al menos una prestación.', 'error'); return; }
    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      const [a, m] = mes.split('-').map(Number);
      const fechaCreacion = new Date(a, m - 1, 1);
      const fechaEntrega = new Date(fechaCreacion);
      fechaEntrega.setDate(fechaEntrega.getDate() + 7);
      const serviciosBD = lineas.map(l => ({
        servicio_id: l.servicio.id,
        cantidad: l.cantidad,
        precio: esLaboratorista ? 0 : l.servicio.precio_base * l.cantidad,
        nombre: l.servicio.nombre,
        pieza_dental: l.pieza,
        nota_especial: l.nota
      }));
      const { error } = await supabase.from('trabajos').insert({
        paciente: paciente.trim(),
        rut_paciente: rut.trim(),
        clinica_id: clinica.id,
        dentista_id: dentista || null,
        laboratorista_id: (esLaboratorista ? miFichaLaboratorista : laboratorista) || null,
        servicios: serviciosBD,
        estado: 'pendiente',
        precio_total: esLaboratorista ? 0 : total,
        fecha_creacion: fechaCreacion.toISOString(),
        fecha_recibido: fechaCreacion.toISOString(),
        fecha_entrega_estimada: fechaEntrega.toISOString().split('T')[0],
        notas: lineas.map(l => `${l.servicio.nombre}${l.nota ? ` (Nota: ${l.nota})` : ''}`).join(' | '),
        modo: 'clinica',
        usuario_id: user.id,
        mes_trabajo: mes
      });
      if (error) throw error;
      avisar(`Trabajo de ${paciente.trim()} agregado a ${clinica.nombre}`, 'exito');
      onGuardado();
      onCerrar();
    } catch (error: any) {
      const texto = String(error?.message || '');
      avisar(/^[A-Z_]+:\s*/.test(texto) ? texto.replace(/^[A-Z_]+:\s*/, '') : `No se pudo guardar el trabajo. ${texto}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={e.fondo} onMouseDown={(ev) => { if (ev.target === ev.currentTarget && !guardando) onCerrar(); }}>
      <div style={e.caja} role="dialog" aria-modal="true" aria-labelledby="nuevo-trabajo-titulo">
        <div style={e.cabecera}>
          <div style={{ minWidth: 0 }}>
            <h2 id="nuevo-trabajo-titulo" style={e.titulo}>➕ Agregar trabajo</h2>
            <div style={e.contexto}>🏥 {clinica.nombre} · 📅 {nombreMes(mes)}</div>
          </div>
          <button type="button" style={e.cerrar} onClick={onCerrar} disabled={guardando} aria-label="Cerrar">×</button>
        </div>

        <div style={e.cuerpo}>
          <div style={e.grid}>
            <label style={e.campo}><span style={e.etiqueta}>Paciente *</span>
              <input ref={refPaciente} style={e.input} value={paciente} onChange={(ev) => setPaciente(ev.target.value)} placeholder="Ej: Juan Pérez" />
            </label>
            <label style={e.campo}><span style={e.etiqueta}>RUT (opcional)</span>
              <input style={e.input} value={rut} onChange={(ev) => setRut(ev.target.value)} placeholder="Ej: 12.345.678-9" />
            </label>
            <label style={e.campo}><span style={e.etiqueta}>Dentista (opcional)</span>
              <select style={e.input} value={dentista} onChange={(ev) => setDentista(ev.target.value)}>
                <option value="">Sin dentista</option>
                {dentistasClinica.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </label>
            <label style={e.campo}><span style={e.etiqueta}>Laboratorista</span>
              <select style={e.input} value={laboratorista} onChange={(ev) => setLaboratorista(ev.target.value)} disabled={esLaboratorista}>
                {!esLaboratorista && <option value="">Sin asignar</option>}
                {laboratoristas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </label>
          </div>

          <div style={e.seccion}>
            <div style={e.etiqueta}>Prestaciones</div>
            <input style={{ ...e.input, marginTop: '0.3rem' }} value={busqueda} placeholder="🔍 Buscar prestación del catálogo..."
              onChange={(ev) => { setBusqueda(ev.target.value); setElegido(null); }} />
            {!elegido && (
              <div style={e.resultados}>
                {resultados.length === 0 ? (
                  <div style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>Sin resultados.</div>
                ) : resultados.map(s => (
                  <button key={s.id} type="button" style={e.resultado} onClick={() => setElegido(s)}>
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{s.nombre}</span>
                    {!esLaboratorista && <span style={{ color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>{clp(s.precio_base)}</span>}
                  </button>
                ))}
              </div>
            )}
            {elegido && (
              <div style={e.elegido}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', overflowWrap: 'anywhere' }}>
                  {elegido.nombre}{!esLaboratorista && <span style={{ color: '#059669' }}> · {clp(elegido.precio_base)}</span>}
                </div>
                <div style={e.filaElegido}>
                  <label style={{ ...e.campo, flex: '0 0 80px' }}><span style={e.etiqueta}>Cantidad</span>
                    <input type="number" min={1} style={e.input} value={cantidad} onChange={(ev) => setCantidad(parseInt(ev.target.value) || 1)} />
                  </label>
                  <label style={{ ...e.campo, flex: '1 1 90px' }}><span style={e.etiqueta}>Pieza</span>
                    <input style={e.input} value={pieza} onChange={(ev) => setPieza(ev.target.value)} placeholder="Ej: 16" />
                  </label>
                  <label style={{ ...e.campo, flex: '2 1 180px' }}><span style={e.etiqueta}>Nota</span>
                    <input style={e.input} value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Color, material..." />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.625rem' }}>
                  <button type="button" style={e.botonSec} onClick={() => setElegido(null)}>Cancelar</button>
                  <button type="button" style={e.botonAgregar} onClick={agregarLinea}>➕ Agregar</button>
                </div>
              </div>
            )}
          </div>

          <div style={e.seccion}>
            <div style={e.etiqueta}>Agregadas ({lineas.length})</div>
            {lineas.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>Aún no hay prestaciones.</div>
            ) : lineas.map(l => (
              <div key={l.clave} style={e.linea}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', overflowWrap: 'anywhere' }}>{l.servicio.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    🦷 {l.pieza || 'Sin pieza'} · ✕{l.cantidad}{l.nota ? ` · 📝 ${l.nota}` : ''}
                  </div>
                </div>
                {!esLaboratorista && <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{clp(l.servicio.precio_base * l.cantidad)}</div>}
                <button type="button" style={e.quitar} onClick={() => setLineas(prev => prev.filter(x => x.clave !== l.clave))}
                  aria-label={`Quitar ${l.servicio.nombre}`}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div style={e.pie}>
          {!esLaboratorista && <div style={{ fontWeight: 700 }}>Total: <span style={{ color: '#059669' }}>{clp(total)}</span></div>}
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button type="button" style={e.botonSec} onClick={onCerrar} disabled={guardando}>Cancelar</button>
            <button type="button" style={{ ...e.botonGuardar, ...(guardando ? { opacity: 0.6 } : {}) }} onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : '💾 Guardar trabajo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const e: Record<string, React.CSSProperties> = {
  fondo: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 2000, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  caja: { backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(15,23,42,0.3)', overflow: 'hidden' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' },
  titulo: { margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' },
  contexto: { fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem', overflowWrap: 'anywhere' },
  cerrar: { border: 'none', background: 'none', fontSize: '1.5rem', lineHeight: 1, color: '#64748b', cursor: 'pointer' },
  cuerpo: { padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.75rem' },
  campo: { display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 },
  etiqueta: { fontSize: '0.75rem', fontWeight: 600, color: '#475569' },
  input: { width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: 'white', color: '#0f172a', fontFamily: 'inherit' },
  seccion: { marginTop: '1rem' },
  resultados: { marginTop: '0.4rem', maxHeight: '190px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' },
  resultado: { display: 'flex', justifyContent: 'space-between', gap: '0.75rem', width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: '#0f172a' },
  elegido: { marginTop: '0.5rem', padding: '0.75rem', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '10px' },
  filaElegido: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  linea: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderTop: '1px solid #f1f5f9' },
  quitar: { width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #fecaca', background: 'white', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', flex: '0 0 auto' },
  pie: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0' },
  botonSec: { padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonAgregar: { padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  botonGuardar: { padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }
};

export default NuevoTrabajoModal;
