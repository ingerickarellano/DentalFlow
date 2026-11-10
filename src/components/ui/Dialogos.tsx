import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ============================================
// DIÁLOGOS DE DENTALFLOW
// Reemplazan a window.confirm y window.alert con el estilo del sitio.
//
//   const { confirmar, avisar } = useDialogos();
//   if (!(await confirmar({ titulo: '¿Eliminar trabajo?', mensaje: 'No se puede deshacer.', peligro: true }))) return;
//   avisar('Trabajo eliminado', 'exito');
//
// - confirmar: ventana al centro de la pantalla (Esc = cancelar, Enter = confirmar).
// - avisar: notificación en una esquina; éxito e info se cierran solas,
//   los errores quedan hasta que se cierran.
// ============================================

export interface OpcionesConfirmar {
  titulo: string;
  mensaje?: React.ReactNode;
  detalle?: string[];          // lista corta (por ejemplo, los pacientes afectados)
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean;           // botón rojo para acciones destructivas
}

export type TipoAviso = 'exito' | 'error' | 'info';

interface Aviso {
  id: number;
  texto: string;
  tipo: TipoAviso;
}

interface ContextoDialogos {
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>;
  avisar: (texto: string, tipo?: TipoAviso) => void;
}

const Contexto = createContext<ContextoDialogos | null>(null);

// Si algún componente se usa fuera del proveedor, cae en los diálogos del navegador
const respaldo: ContextoDialogos = {
  confirmar: async (o) => window.confirm([o.titulo, typeof o.mensaje === 'string' ? o.mensaje : ''].filter(Boolean).join('\n\n')),
  avisar: (t) => window.alert(t)
};

export const useDialogos = (): ContextoDialogos => useContext(Contexto) || respaldo;

// Quita los emojis de estado que el código antiguo ponía al inicio ("✅ ", "❌ ")
const limpiar = (texto: string) => texto.replace(/^\s*(✅|❌|⚠️|ℹ️)\s*/u, '');

export const DialogosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendiente, setPendiente] = useState<(OpcionesConfirmar & { resolver: (v: boolean) => void }) | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);
  const botonConfirmar = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback((opciones: OpcionesConfirmar) =>
    new Promise<boolean>(resolver => setPendiente({ ...opciones, resolver })), []);

  const cerrarAviso = useCallback((id: number) => setAvisos(prev => prev.filter(a => a.id !== id)), []);

  const avisar = useCallback((texto: string, tipo?: TipoAviso) => {
    const t: TipoAviso = tipo || (/^\s*❌/u.test(texto) ? 'error' : /^\s*✅/u.test(texto) ? 'exito' : 'info');
    const id = siguienteId.current++;
    setAvisos(prev => [...prev.slice(-3), { id, texto: limpiar(texto), tipo: t }]);
    if (t !== 'error') setTimeout(() => cerrarAviso(id), 4000);
  }, [cerrarAviso]);

  const responder = useCallback((valor: boolean) => {
    setPendiente(actual => {
      actual?.resolver(valor);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pendiente) return;
    botonConfirmar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); responder(false); }
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [pendiente, responder]);

  const colores = {
    exito: { fondo: '#ecfdf5', borde: '#10b981', texto: '#065f46', icono: '✓' },
    error: { fondo: '#fef2f2', borde: '#ef4444', texto: '#991b1b', icono: '!' },
    info:  { fondo: '#eff6ff', borde: '#3b82f6', texto: '#1e3a8a', icono: 'i' }
  };

  return (
    <Contexto.Provider value={{ confirmar, avisar }}>
      {children}

      {pendiente && (
        <div style={estilos.fondo} onMouseDown={(e) => { if (e.target === e.currentTarget) responder(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="dialogo-titulo" style={estilos.caja}>
            <div style={{ ...estilos.icono, backgroundColor: pendiente.peligro ? '#fee2e2' : '#dbeafe', color: pendiente.peligro ? '#dc2626' : '#2563eb' }}>
              {pendiente.peligro ? '!' : '?'}
            </div>
            <h2 id="dialogo-titulo" style={estilos.titulo}>{pendiente.titulo}</h2>
            {pendiente.mensaje && <div style={estilos.mensaje}>{pendiente.mensaje}</div>}
            {pendiente.detalle && pendiente.detalle.length > 0 && (
              <ul style={estilos.detalle}>
                {pendiente.detalle.slice(0, 8).map((d, i) => <li key={i}>{d}</li>)}
                {pendiente.detalle.length > 8 && <li>y {pendiente.detalle.length - 8} más…</li>}
              </ul>
            )}
            <div style={estilos.botones}>
              <button style={estilos.cancelar} onClick={() => responder(false)}>
                {pendiente.textoCancelar || 'Cancelar'}
              </button>
              <button
                ref={botonConfirmar}
                style={{ ...estilos.confirmar, backgroundColor: pendiente.peligro ? '#dc2626' : '#2563eb' }}
                onClick={() => responder(true)}
              >
                {pendiente.textoConfirmar || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={estilos.zonaAvisos} aria-live="polite">
        {avisos.map(a => {
          const c = colores[a.tipo];
          return (
            <div key={a.id} role={a.tipo === 'error' ? 'alert' : 'status'}
              style={{ ...estilos.aviso, backgroundColor: c.fondo, borderLeftColor: c.borde, color: c.texto }}>
              <span style={{ ...estilos.avisoIcono, backgroundColor: c.borde }}>{c.icono}</span>
              <span style={estilos.avisoTexto}>{a.texto}</span>
              <button style={{ ...estilos.avisoCerrar, color: c.texto }} aria-label="Cerrar" onClick={() => cerrarAviso(a.id)}>×</button>
            </div>
          );
        })}
      </div>
    </Contexto.Provider>
  );
};

const estilos: Record<string, React.CSSProperties> = {
  fondo: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 10000,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  caja: {
    backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.3)', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto',
    boxSizing: 'border-box'
  },
  icono: {
    width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto 12px'
  },
  titulo: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px', overflowWrap: 'anywhere' },
  mensaje: { fontSize: '0.9375rem', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere' },
  detalle: {
    textAlign: 'left', margin: '12px 0 0', padding: '10px 12px 10px 28px', backgroundColor: '#f8fafc',
    borderRadius: '8px', color: '#334155', fontSize: '0.875rem', lineHeight: 1.6, overflowWrap: 'anywhere'
  },
  botones: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' },
  cancelar: {
    flex: '1 1 120px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
    backgroundColor: 'white', color: '#334155', fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer'
  },
  confirmar: {
    flex: '1 1 120px', padding: '10px 16px', borderRadius: '8px', border: 'none', color: 'white',
    fontWeight: 600, fontSize: '0.9375rem', cursor: 'pointer'
  },
  zonaAvisos: {
    position: 'fixed', right: '16px', bottom: '16px', left: '16px', display: 'flex', flexDirection: 'column',
    alignItems: 'flex-end', gap: '8px', zIndex: 10001, pointerEvents: 'none'
  },
  aviso: {
    pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', maxWidth: '380px',
    padding: '12px 12px 12px 14px', borderRadius: '10px', borderLeft: '4px solid', boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
    fontSize: '0.9rem', lineHeight: 1.4, boxSizing: 'border-box',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  avisoIcono: {
    flex: '0 0 22px', width: '22px', height: '22px', borderRadius: '50%', color: 'white', fontWeight: 700,
    fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  avisoTexto: { flex: 1, overflowWrap: 'anywhere', whiteSpace: 'pre-line' },
  avisoCerrar: { background: 'none', border: 'none', fontSize: '1.25rem', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }
};
