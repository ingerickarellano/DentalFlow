import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from './Header';
import { useMembresia } from '../hooks/useMembresia';
import { useMediaQuery, BREAKPOINTS } from '../hooks/useMediaQuery';

// ============================================
// GESTIÓN DE LABORATORISTAS (solo administrador del laboratorio)
// - Las cuentas se crean con la Edge Function "gestionar-laboratorista",
//   que corre en Supabase: el administrador NO pierde su sesión.
// - Un laboratorista se desactiva (no se borra) para conservar su historial.
// - El switch "Puede despachar" habilita el Registro de Entregas.
// ============================================

interface Laboratorista {
  id: string;
  usuario_id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  activo: boolean;
  puede_despachar: boolean;
  created_at?: string;
}

const ESPECIALIDADES = [
  'Prótesis Fija',
  'Prótesis Removible',
  'Ortodoncia',
  'Implantes',
  'Cerámica Dental',
  'Laboratorio Digital'
];

const LARGO_MINIMO_PASSWORD = 8;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lee el mensaje de error que devuelve la Edge Function
const mensajeDeFuncion = async (error: any): Promise<string> => {
  try {
    const cuerpo = await error?.context?.json?.();
    if (cuerpo?.error) return cuerpo.error;
  } catch {
    /* sin cuerpo legible */
  }
  return error?.message || 'Error desconocido';
};

const FORM_VACIO = {
  nombre: '',
  email: '',
  telefono: '',
  especialidad: ESPECIALIDADES[0],
  password: '',
  confirmPassword: '',
  puede_despachar: false
};

const GestionLaboratoristas: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const vistaTarjetas = useMediaQuery(BREAKPOINTS.tablet);

  const [usuario, setUsuario] = useState<any>(null);
  const [laboratoristas, setLaboratoristas] = useState<Laboratorista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [errorForm, setErrorForm] = useState('');

  const [modalPassword, setModalPassword] = useState<Laboratorista | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState({ password: '', confirmPassword: '' });
  const [errorPassword, setErrorPassword] = useState('');

  const membresia = useMembresia(usuario?.id);

  // ---------------- Carga ----------------
  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUsuario(user);

      // La base solo devuelve los laboratoristas del laboratorio del administrador
      const { data, error: errorCarga } = await supabase
        .from('laboratoristas')
        .select('id, usuario_id, nombre, email, telefono, especialidad, activo, puede_despachar, created_at')
        .order('activo', { ascending: false })
        .order('nombre', { ascending: true });
      if (errorCarga) throw errorCarga;
      setLaboratoristas((data || []) as Laboratorista[]);
    } catch (e: any) {
      console.error('Error cargando laboratoristas:', e);
      setError(e.message || 'No se pudieron cargar los laboratoristas');
    } finally {
      setCargando(false);
    }
  }, [navigate]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleVolver = () => (onBack ? onBack() : navigate('/dashboard'));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const activos = laboratoristas.filter(l => l.activo).length;
  const puedeCrear = !membresia.cargando && !membresia.soloLectura;

  // ---------------- Crear ----------------
  const abrirNuevo = () => {
    if (!puedeCrear) {
      alert('Tu plan está vencido: regulariza tu pago en Mi Membresía para agregar laboratoristas.');
      return;
    }
    setForm(FORM_VACIO);
    setErrorForm('');
    setModalNuevo(true);
  };

  const crearLaboratorista = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');
    const nombre = form.nombre.trim();
    const email = form.email.trim().toLowerCase();

    if (nombre.length < 2) return setErrorForm('Ingresa el nombre del laboratorista.');
    if (!EMAIL_VALIDO.test(email)) return setErrorForm('Ingresa un email válido.');
    if (form.password.length < LARGO_MINIMO_PASSWORD) {
      return setErrorForm(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
    }
    if (form.password !== form.confirmPassword) return setErrorForm('Las contraseñas no coinciden.');

    try {
      setGuardando(true);
      const { error: errorFuncion } = await supabase.functions.invoke('gestionar-laboratorista', {
        body: {
          accion: 'crear',
          nombre,
          email,
          password: form.password,
          telefono: form.telefono.trim(),
          especialidad: form.especialidad,
          puede_despachar: form.puede_despachar
        }
      });
      if (errorFuncion) {
        setErrorForm(await mensajeDeFuncion(errorFuncion));
        return;
      }
      setModalNuevo(false);
      alert(`✅ Laboratorista creado. ${nombre} ya puede iniciar sesión con ${email} y la contraseña que definiste.`);
      await cargar();
    } catch (e: any) {
      setErrorForm(e.message || 'No se pudo crear el laboratorista');
    } finally {
      setGuardando(false);
    }
  };

  // ---------------- Activar / desactivar ----------------
  const cambiarActivo = async (lab: Laboratorista) => {
    const accion = lab.activo ? 'Desactivar' : 'Activar';
    const detalle = lab.activo
      ? 'No podrá iniciar sesión ni ver información del laboratorio. Sus trabajos se conservan.'
      : 'Podrá volver a iniciar sesión.';
    if (!window.confirm(`¿${accion} a ${lab.nombre}?\n\n${detalle}`)) return;

    const { error: errorUpdate } = await supabase
      .from('laboratoristas')
      .update({ activo: !lab.activo, updated_at: new Date().toISOString() })
      .eq('id', lab.id);
    if (errorUpdate) {
      alert(`Error: ${errorUpdate.message}`);
      return;
    }
    setLaboratoristas(prev => prev.map(l => (l.id === lab.id ? { ...l, activo: !lab.activo } : l)));
  };

  // ---------------- Switch de despacho ----------------
  const cambiarDespacho = async (lab: Laboratorista) => {
    const nuevo = !lab.puede_despachar;
    setLaboratoristas(prev => prev.map(l => (l.id === lab.id ? { ...l, puede_despachar: nuevo } : l)));
    const { error: errorUpdate } = await supabase
      .from('laboratoristas')
      .update({ puede_despachar: nuevo, updated_at: new Date().toISOString() })
      .eq('id', lab.id);
    if (errorUpdate) {
      setLaboratoristas(prev => prev.map(l => (l.id === lab.id ? { ...l, puede_despachar: !nuevo } : l)));
      alert(`Error: ${errorUpdate.message}`);
    }
  };

  // ---------------- Cambiar contraseña ----------------
  const abrirPassword = (lab: Laboratorista) => {
    setNuevaPassword({ password: '', confirmPassword: '' });
    setErrorPassword('');
    setModalPassword(lab);
  };

  const guardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPassword) return;
    if (nuevaPassword.password.length < LARGO_MINIMO_PASSWORD) {
      return setErrorPassword(`La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
    }
    if (nuevaPassword.password !== nuevaPassword.confirmPassword) {
      return setErrorPassword('Las contraseñas no coinciden.');
    }
    try {
      setGuardando(true);
      const { error: errorFuncion } = await supabase.functions.invoke('gestionar-laboratorista', {
        body: { accion: 'cambiar_password', usuario_id: modalPassword.usuario_id, password: nuevaPassword.password }
      });
      if (errorFuncion) {
        setErrorPassword(await mensajeDeFuncion(errorFuncion));
        return;
      }
      alert(`✅ Contraseña de ${modalPassword.nombre} actualizada.`);
      setModalPassword(null);
    } finally {
      setGuardando(false);
    }
  };

  // ---------------- Piezas de la vista ----------------
  const renderEstado = (lab: Laboratorista) => (
    <span style={lab.activo ? styles.badgeActivo : styles.badgeInactivo}>
      {lab.activo ? '● Activo' : '○ Desactivado'}
    </span>
  );

  const renderSwitch = (lab: Laboratorista) => (
    <label style={{ ...styles.switchLabel, opacity: lab.activo ? 1 : 0.5 }} title="Habilita el Registro de Entregas">
      <input
        type="checkbox"
        role="switch"
        aria-checked={lab.puede_despachar}
        checked={lab.puede_despachar}
        disabled={!lab.activo}
        onChange={() => cambiarDespacho(lab)}
        style={styles.switchInput}
      />
      <span
        aria-hidden="true"
        style={{ ...styles.switchTrack, backgroundColor: lab.puede_despachar ? '#059669' : '#cbd5e1' }}
      >
        <span style={{ ...styles.switchThumb, transform: lab.puede_despachar ? 'translateX(18px)' : 'translateX(0)' }} />
      </span>
      <span style={styles.switchText}>{lab.puede_despachar ? 'Sí' : 'No'}</span>
    </label>
  );

  const renderAcciones = (lab: Laboratorista, ancho = false) => (
    <div style={{ ...styles.actionsCell, ...(ancho ? styles.actionsCellAncho : {}) }}>
      <button
        onClick={() => abrirPassword(lab)}
        style={{ ...styles.secondaryButtonSmall, ...(ancho ? { flex: '1 1 140px' } : {}) }}
        disabled={!lab.activo}
        title="Definir una nueva contraseña"
      >
        🔑 Contraseña
      </button>
      <button
        onClick={() => cambiarActivo(lab)}
        style={{ ...(lab.activo ? styles.deactivateButton : styles.activateButton), ...(ancho ? { flex: '1 1 120px' } : {}) }}
      >
        {lab.activo ? '⏸ Desactivar' : '▶ Activar'}
      </button>
    </div>
  );

  // ---------------- Render ----------------
  return (
    <>
      <Header
        user={usuario ? {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.user_metadata?.nombre || usuario.email?.split('@')[0] || 'Usuario',
          rol: 'admin',
          laboratorio: membresia.laboratorio || 'Laboratorio'
        } : undefined}
        onLogout={handleLogout}
        showBackButton
        onBack={handleVolver}
        title="Laboratoristas"
        showTitle
      />

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <h1 style={styles.title}>👨‍🔧 Mis Laboratoristas</h1>
            <p style={styles.subtitle}>
              {activos} activo(s) de {laboratoristas.length}. Ven las clínicas y trabajos del laboratorio, pero nunca los precios.
            </p>
          </div>
          <button
            onClick={abrirNuevo}
            style={{ ...styles.addButton, ...(!puedeCrear ? styles.addButtonDisabled : {}) }}
            disabled={!puedeCrear}
          >
            + Nuevo Laboratorista
          </button>
        </div>

        {!membresia.cargando && membresia.soloLectura && (
          <div style={styles.avisoSoloLectura} role="status">
            ⚠️ Tu plan está vencido: puedes ver y desactivar laboratoristas, pero no agregar nuevos.
          </div>
        )}

        {error && <div style={styles.avisoError}>{error}</div>}

        {cargando ? (
          <div style={styles.loadingText}>Cargando laboratoristas...</div>
        ) : laboratoristas.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ margin: '0 0 16px 0' }}>Aún no tienes laboratoristas.</p>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px' }}>
              Crea una cuenta para cada persona del laboratorio. Podrá iniciar sesión con su email y la contraseña que definas.
            </p>
            {puedeCrear && (
              <button onClick={abrirNuevo} style={styles.addButton}>+ Crear el primero</button>
            )}
          </div>
        ) : vistaTarjetas ? (
          <div style={styles.cardsList}>
            {laboratoristas.map(lab => (
              <div key={lab.id} style={{ ...styles.card, ...(lab.activo ? {} : styles.cardInactiva) }}>
                <div style={styles.cardTop}>
                  <h3 style={styles.cardNombre}>{lab.nombre}</h3>
                  {renderEstado(lab)}
                </div>
                <dl style={styles.cardDatos}>
                  <dt style={styles.cardLabel}>Email</dt>
                  <dd style={{ ...styles.cardValor, ...styles.textoLargo }}>{lab.email || '—'}</dd>
                  <dt style={styles.cardLabel}>Teléfono</dt>
                  <dd style={styles.cardValor}>{lab.telefono || '—'}</dd>
                  <dt style={styles.cardLabel}>Especialidad</dt>
                  <dd style={styles.cardValor}>{lab.especialidad || '—'}</dd>
                  <dt style={styles.cardLabel}>Despacho</dt>
                  <dd style={styles.cardValor}>{renderSwitch(lab)}</dd>
                </dl>
                {renderAcciones(lab, true)}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Laboratorista</th>
                  <th style={styles.th}>Contacto</th>
                  <th style={styles.th}>Especialidad</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th} title="Habilita el Registro de Entregas">Puede despachar</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {laboratoristas.map(lab => (
                  <tr key={lab.id} style={lab.activo ? undefined : styles.rowInactiva}>
                    <td style={{ ...styles.td, ...styles.nombreCell }}>{lab.nombre}</td>
                    <td style={styles.td}>
                      <div style={styles.textoLargo}>✉️ {lab.email || '—'}</div>
                      {lab.telefono && <div style={{ whiteSpace: 'nowrap' }}>📞 {lab.telefono}</div>}
                    </td>
                    <td style={styles.td}>{lab.especialidad || <span style={styles.emptyCell}>—</span>}</td>
                    <td style={styles.td}>{renderEstado(lab)}</td>
                    <td style={styles.td}>{renderSwitch(lab)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{renderAcciones(lab)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------- Modal: nuevo laboratorista ---------- */}
        {modalNuevo && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="titulo-nuevo-lab">
              <div style={styles.modalHeader}>
                <h2 id="titulo-nuevo-lab" style={styles.modalTitle}>👨‍🔧 Nuevo Laboratorista</h2>
                <button onClick={() => setModalNuevo(false)} style={styles.closeButton} aria-label="Cerrar">✕</button>
              </div>

              <form onSubmit={crearLaboratorista}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="lab-nombre">Nombre completo *</label>
                  <input id="lab-nombre" style={styles.input} value={form.nombre} autoComplete="off"
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Eduardo Tillería" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="lab-email">Email (con este inicia sesión) *</label>
                  <input id="lab-email" type="email" style={styles.input} value={form.email} autoComplete="off"
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Ej: eduardo@milaboratorio.cl" />
                </div>
                <div style={styles.formRow}>
                  <div style={{ ...styles.formGroup, flex: '1 1 180px' }}>
                    <label style={styles.label} htmlFor="lab-telefono">Teléfono</label>
                    <input id="lab-telefono" type="tel" style={styles.input} value={form.telefono}
                      onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+56 9 1234 5678" />
                  </div>
                  <div style={{ ...styles.formGroup, flex: '1 1 180px' }}>
                    <label style={styles.label} htmlFor="lab-especialidad">Especialidad</label>
                    <select id="lab-especialidad" style={styles.input} value={form.especialidad}
                      onChange={e => setForm(p => ({ ...p, especialidad: e.target.value }))}>
                      {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                    </select>
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={{ ...styles.formGroup, flex: '1 1 180px' }}>
                    <label style={styles.label} htmlFor="lab-pass">Contraseña *</label>
                    <input id="lab-pass" type="password" style={styles.input} value={form.password} autoComplete="new-password"
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`} />
                  </div>
                  <div style={{ ...styles.formGroup, flex: '1 1 180px' }}>
                    <label style={styles.label} htmlFor="lab-pass2">Repetir contraseña *</label>
                    <input id="lab-pass2" type="password" style={styles.input} value={form.confirmPassword} autoComplete="new-password"
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>
                </div>

                <label style={styles.checkboxRow}>
                  <input type="checkbox" checked={form.puede_despachar}
                    onChange={e => setForm(p => ({ ...p, puede_despachar: e.target.checked }))} />
                  <span>
                    <strong>Puede despachar</strong><br />
                    <small style={{ color: '#64748b' }}>Habilita el Registro de Entregas. Puedes cambiarlo después.</small>
                  </span>
                </label>

                {errorForm && <div style={styles.errorText} role="alert">{errorForm}</div>}

                <div style={styles.buttonGroup}>
                  <button type="button" onClick={() => setModalNuevo(false)} style={styles.cancelButton} disabled={guardando}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitButton} disabled={guardando}>
                    {guardando ? 'Creando...' : 'Crear Laboratorista'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Modal: cambiar contraseña ---------- */}
        {modalPassword && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent} role="dialog" aria-modal="true" aria-labelledby="titulo-pass">
              <div style={styles.modalHeader}>
                <h2 id="titulo-pass" style={styles.modalTitle}>🔑 Nueva contraseña</h2>
                <button onClick={() => setModalPassword(null)} style={styles.closeButton} aria-label="Cerrar">✕</button>
              </div>
              <p style={{ marginTop: 0, color: '#475569' }}>
                Para <strong>{modalPassword.nombre}</strong> ({modalPassword.email}). Comunícale la nueva contraseña por un medio seguro.
              </p>
              <form onSubmit={guardarPassword}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="np1">Nueva contraseña *</label>
                  <input id="np1" type="password" style={styles.input} autoComplete="new-password"
                    value={nuevaPassword.password}
                    onChange={e => setNuevaPassword(p => ({ ...p, password: e.target.value }))}
                    placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="np2">Repetir contraseña *</label>
                  <input id="np2" type="password" style={styles.input} autoComplete="new-password"
                    value={nuevaPassword.confirmPassword}
                    onChange={e => setNuevaPassword(p => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
                {errorPassword && <div style={styles.errorText} role="alert">{errorPassword}</div>}
                <div style={styles.buttonGroup}>
                  <button type="button" onClick={() => setModalPassword(null)} style={styles.cancelButton} disabled={guardando}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitButton} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ============================================
// ESTILOS (misma paleta que Gestión de Clínicas)
// ============================================
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px clamp(12px, 3vw, 20px)',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    maxWidth: '1400px',
    margin: '0 auto',
    marginTop: '64px'
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '15px',
    flexWrap: 'wrap'
  },
  title: { margin: 0, color: '#1f2937', fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 'bold' },
  subtitle: { margin: '6px 0 0 0', color: '#64748b', fontSize: '14px' },
  addButton: {
    padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
  },
  addButtonDisabled: { backgroundColor: '#94a3b8', cursor: 'not-allowed', opacity: 0.7 },
  tableWrapper: {
    backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflowX: 'auto', marginBottom: '40px'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left', padding: '12px 14px', backgroundColor: '#f8fafc', color: '#475569',
    fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em',
    borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap'
  },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#374151', verticalAlign: 'middle' },
  rowInactiva: { backgroundColor: '#f8fafc', color: '#94a3b8' },
  nombreCell: { fontWeight: '600', color: '#1f2937', minWidth: '140px' },
  emptyCell: { color: '#cbd5e1' },
  textoLargo: { overflowWrap: 'anywhere', wordBreak: 'break-word' },
  badgeActivo: {
    display: 'inline-block', color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0',
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap'
  },
  badgeInactivo: {
    display: 'inline-block', color: '#64748b', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
    padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap'
  },
  switchLabel: { display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', position: 'relative' },
  switchInput: { position: 'absolute', opacity: 0, width: '40px', height: '22px', margin: 0, cursor: 'pointer' },
  switchTrack: {
    width: '40px', height: '22px', borderRadius: '999px', position: 'relative',
    transition: 'background-color 0.2s', flexShrink: 0
  },
  switchThumb: {
    position: 'absolute', top: '3px', left: '3px', width: '16px', height: '16px', borderRadius: '50%',
    backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.25)', transition: 'transform 0.2s'
  },
  switchText: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  actionsCell: { display: 'flex', justifyContent: 'flex-end', gap: '8px', whiteSpace: 'nowrap' },
  actionsCellAncho: { justifyContent: 'stretch', flexWrap: 'wrap', whiteSpace: 'normal' },
  secondaryButtonSmall: {
    padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
    borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
  },
  deactivateButton: {
    padding: '6px 12px', backgroundColor: 'white', color: '#b91c1c', border: '1px solid #fca5a5',
    borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
  },
  activateButton: {
    padding: '6px 12px', backgroundColor: '#059669', color: 'white', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
  },
  cardsList: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
    gap: '16px', marginBottom: '40px'
  },
  card: {
    backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minWidth: 0
  },
  cardInactiva: { backgroundColor: '#f8fafc' },
  cardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px',
    flexWrap: 'wrap', marginBottom: '12px'
  },
  cardNombre: { margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1f2937', overflowWrap: 'anywhere' },
  cardDatos: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '12px', rowGap: '8px',
    margin: '0 0 14px 0', fontSize: '14px', alignItems: 'center'
  },
  cardLabel: {
    color: '#6b7280', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em'
  },
  cardValor: { margin: 0, color: '#374151', minWidth: 0 },
  avisoSoloLectura: {
    backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#7f1d1d',
    padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px'
  },
  avisoError: {
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c',
    padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px'
  },
  loadingText: { textAlign: 'center', color: '#6b7280', padding: '40px', fontSize: '16px' },
  emptyState: {
    textAlign: 'center', color: '#6b7280', padding: '40px 20px', backgroundColor: 'white',
    borderRadius: '12px', border: '2px dashed #d1d5db'
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
  },
  modalContent: {
    backgroundColor: 'white', padding: 'clamp(18px, 4vw, 30px)', borderRadius: '12px',
    width: '100%', maxWidth: '560px', maxHeight: '92vh', overflow: 'auto', boxSizing: 'border-box'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' },
  modalTitle: { margin: 0, color: '#1f2937', fontSize: 'clamp(19px, 4vw, 24px)', fontWeight: 'bold' },
  closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280', padding: '4px' },
  formRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  formGroup: { marginBottom: '16px', minWidth: 0 },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white'
  },
  checkboxRow: {
    display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', backgroundColor: '#f0f9ff',
    borderRadius: '8px', borderLeft: '4px solid #2563eb', cursor: 'pointer', fontSize: '14px', color: '#1f2937'
  },
  errorText: {
    color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
    padding: '8px 12px', fontSize: '13px', marginTop: '14px'
  },
  buttonGroup: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', flexWrap: 'wrap' },
  cancelButton: {
    padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontWeight: '500'
  },
  submitButton: {
    padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none',
    borderRadius: '6px', cursor: 'pointer', fontWeight: '500'
  }
};

export default GestionLaboratoristas;
