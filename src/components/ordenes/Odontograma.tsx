import React, { useMemo, useState } from 'react';

// ============================================
// ODONTOGRAMA (numeración FDI, dientes permanentes)
// Boca abierta: arcada superior arriba, inferior abajo. Cada diente tiene la forma
// de su tipo (molar, premolar, canino, incisivo) y su número por fuera.
// Al tocar un diente se abre el panel con sus 5 caras: se elige Incrustación,
// Corona, Puente o Borrar y se tocan las caras. "Mesial" queda siempre del lado
// de la línea media.
// Mantiene el mismo formato de datos que ya se guarda en las órdenes:
//   piezas[numero].superficies[cara] = 'incrustacion' | 'corona' | 'puente' | null
// ============================================

export type Superficie = 'oclusal' | 'mesial' | 'distal' | 'vestibular' | 'lingual';
export type TipoTrabajo = 'incrustacion' | 'corona' | 'puente' | null;
export interface PiezaDental { superficies: Record<Superficie, TipoTrabajo>; }
export type Piezas = Record<number, PiezaDental>;

export const CARAS: Superficie[] = ['oclusal', 'mesial', 'distal', 'vestibular', 'lingual'];
const SUPERIORES = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const INFERIORES = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const TODOS_LOS_DIENTES = [...SUPERIORES, ...INFERIORES];

export const crearPiezaVacia = (): PiezaDental => ({
  superficies: { oclusal: null, mesial: null, distal: null, vestibular: null, lingual: null }
});

const COLOR: Record<string, string> = { incrustacion: '#ef4444', corona: '#3b82f6', puente: '#10b981' };
const SUAVE: Record<string, string> = { incrustacion: '#fee2e2', corona: '#dbeafe', puente: '#d1fae5' };
export const NOMBRE_TIPO: Record<string, string> = { incrustacion: 'Incrustación', corona: 'Corona', puente: 'Puente' };
const NOMBRE_DIENTE: Record<string, string> = { molar: 'Molar', premolar: 'Premolar', canino: 'Canino', incisivo: 'Incisivo' };

// Ancho mesiodistal relativo por posición (1 = incisivo central ... 8 = tercer molar)
const ANCHO_SUP: Record<number, number> = { 1: 8.6, 2: 6.6, 3: 7.6, 4: 7, 5: 6.6, 6: 10.2, 7: 9.2, 8: 8.6 };
const ANCHO_INF: Record<number, number> = { 1: 5.4, 2: 5.9, 3: 7, 4: 7, 5: 7.1, 6: 11, 7: 10.4, 8: 10 };

const tipoDiente = (n: number) => {
  const p = n % 10;
  return p >= 6 ? 'molar' : p >= 4 ? 'premolar' : p === 3 ? 'canino' : 'incisivo';
};

// Contorno del diente visto desde oclusal, centrado en 0,0
const forma = (tipo: string, w: number, h: number) => {
  const x = w / 2, y = h / 2;
  if (tipo === 'molar') {
    return `M${-x + 4},${-y} Q0,${-y - 3} ${x - 4},${-y} Q${x},${-y} ${x},${-y + 4} L${x},${y - 4} Q${x},${y} ${x - 4},${y} Q0,${y + 3} ${-x + 4},${y} Q${-x},${y} ${-x},${y - 4} L${-x},${-y + 4} Q${-x},${-y} ${-x + 4},${-y}Z`;
  }
  if (tipo === 'premolar') return `M0,${-y} C${x * 1.1},${-y} ${x * 1.05},${y} 0,${y} C${-x * 1.05},${y} ${-x * 1.1},${-y} 0,${-y}Z`;
  if (tipo === 'canino') return `M0,${-y - 2} C${x * 1.15},${-y * 0.5} ${x * 0.95},${y} 0,${y} C${-x * 0.95},${y} ${-x * 1.15},${-y * 0.5} 0,${-y - 2}Z`;
  return `M${-x + 2},${-y} L${x - 2},${-y} Q${x},${-y} ${x},${-y + 3} L${x * 0.8},${y - 2} Q${x * 0.7},${y} ${x * 0.5},${y} L${-x * 0.5},${y} Q${-x * 0.7},${y} ${-x * 0.8},${y - 2} L${-x},${-y + 3} Q${-x},${-y} ${-x + 2},${-y}Z`;
};

interface DientePos { n: number; x: number; y: number; ang: number; w: number; h: number; ux: number; uy: number; }

// Reparte los dientes sobre media elipse según su ancho real
const arcada = (lista: number[], anchos: Record<number, number>, cx: number, cy: number, rx: number, ry: number, arriba: boolean): DientePos[] => {
  const N = 400;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = Math.PI * (1 - i / N);
    pts.push([cx + rx * Math.cos(t), cy + (arriba ? -1 : 1) * ry * Math.sin(t)]);
  }
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1];
  const ws = lista.map(n => anchos[n % 10]);
  const esc = total / ws.reduce((a, b) => a + b, 0);
  let pos = 0;
  return lista.map((n, k) => {
    const centro = (pos + ws[k] / 2) * esc;
    pos += ws[k];
    let i = acc.findIndex(a => a >= centro);
    if (i < 1) i = 1;
    const [x, y] = pts[i];
    const [x0, y0] = pts[i - 1];
    const ang = Math.atan2(y - y0, x - x0) * 180 / Math.PI;
    const nx = (x - cx) / rx, ny = (y - cy) / ry, nl = Math.hypot(nx, ny) || 1;
    const w = ws[k] * esc * 0.88;
    const tipo = tipoDiente(n);
    const h = tipo === 'molar' ? w * 1.05 : tipo === 'incisivo' ? w * 0.85 : w * 1.25;
    return { n, x, y, ang, w, h, ux: nx / nl, uy: ny / nl };
  });
};

const DIENTES: DientePos[] = [
  ...arcada(SUPERIORES, ANCHO_SUP, 300, 255, 215, 185, true),
  ...arcada(INFERIORES, ANCHO_INF, 300, 305, 205, 175, false)
];

const elipse = (cx: number, cy: number, rx: number, ry: number, arriba: boolean) =>
  `M${cx - rx},${cy} A${rx},${ry} 0 0 ${arriba ? 1 : 0} ${cx + rx},${cy}`;

// Tipo que predomina en un diente (para pintarlo)
export const tipoPrincipal = (pieza?: PiezaDental): TipoTrabajo => {
  if (!pieza?.superficies) return null;
  const cuenta: Record<string, number> = {};
  Object.values(pieza.superficies).forEach(t => { if (t) cuenta[t] = (cuenta[t] || 0) + 1; });
  const orden = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
  return (orden[0] as TipoTrabajo) || null;
};

interface Props {
  piezas: Piezas;
  onChange: (piezas: Piezas) => void;
  soloLectura?: boolean;
  compacto?: boolean;      // panel debajo en vez de al lado
}

const Odontograma: React.FC<Props> = ({ piezas, onChange, soloLectura = false, compacto = false }) => {
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [herramienta, setHerramienta] = useState<TipoTrabajo | 'borrar'>('corona');

  const pieza = (n: number): PiezaDental => piezas[n] || crearPiezaVacia();

  const cambiarDiente = (n: number, superficies: Record<Superficie, TipoTrabajo>) => {
    onChange({ ...piezas, [n]: { superficies } });
  };

  const tocarCara = (cara: Superficie) => {
    if (seleccionado === null || soloLectura) return;
    const actual = pieza(seleccionado).superficies;
    const nuevo: TipoTrabajo = herramienta === 'borrar' ? null : actual[cara] === herramienta ? null : herramienta;
    cambiarDiente(seleccionado, { ...actual, [cara]: nuevo });
  };

  // Resumen: por diente, cada tipo con sus caras ("Incrustación (oclusal, mesial)" o "Corona" si son las 5)
  const marcados = useMemo(() => TODOS_LOS_DIENTES
    .map(n => {
      const sup = piezas[n]?.superficies;
      const porTipo: Record<string, Superficie[]> = {};
      CARAS.forEach(c => { const t = sup?.[c]; if (t) (porTipo[t] = porTipo[t] || []).push(c); });
      const detalle = Object.entries(porTipo)
        .map(([t, caras]) => `${NOMBRE_TIPO[t]}${caras.length < 5 ? ` (${caras.join(', ')})` : ''}`).join(' · ');
      return { n, tipo: tipoPrincipal(piezas[n]), detalle };
    })
    .filter(d => d.tipo), [piezas]);

  const sel = seleccionado !== null ? pieza(seleccionado).superficies : null;
  const mesialDerecha = seleccionado !== null && [1, 4].includes(Math.floor(seleccionado / 10));

  const cara = (c: Superficie, d: string, tx: number, ty: number, etiqueta: string) => {
    const t = sel?.[c];
    return (
      <g key={c} onClick={() => tocarCara(c)} style={{ cursor: soloLectura ? 'default' : 'pointer' }}>
        <path d={d} fill={t ? SUAVE[t] : '#ffffff'} stroke={t ? COLOR[t] : '#94a3b8'} strokeWidth={2} />
        <text x={tx} y={ty} textAnchor="middle" fontSize={9} fontWeight={700} fill="#475569" style={{ pointerEvents: 'none' }}>{etiqueta}</text>
      </g>
    );
  };
  const IZQ = 'M10,10 L50,50 L50,110 L10,150Z';
  const DER = 'M150,10 L150,150 L110,110 L110,50Z';

  const herramientas: { id: TipoTrabajo | 'borrar'; texto: string; color: string }[] = [
    { id: 'incrustacion', texto: 'Incrustación', color: COLOR.incrustacion },
    { id: 'corona', texto: 'Corona', color: COLOR.corona },
    { id: 'puente', texto: 'Puente', color: COLOR.puente },
    { id: 'borrar', texto: 'Borrar', color: '#64748b' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: compacto ? '1fr' : 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
      <div>
        <svg viewBox="0 0 600 540" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Odontograma">
          <defs>
            <radialGradient id="odontograma-encia" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#fecdd3" />
              <stop offset="100%" stopColor="#fda4af" />
            </radialGradient>
          </defs>
          <path d={elipse(300, 255, 215, 185, true)} fill="none" stroke="url(#odontograma-encia)" strokeWidth={58} strokeLinecap="round" opacity={0.6} />
          <path d={elipse(300, 305, 205, 175, false)} fill="none" stroke="url(#odontograma-encia)" strokeWidth={58} strokeLinecap="round" opacity={0.6} />
          <line x1={300} y1={40} x2={300} y2={520} stroke="#e2e8f0" strokeDasharray="4 6" />
          <text x={300} y={200} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight={600}>SUPERIOR</text>
          <text x={300} y={370} textAnchor="middle" fontSize={13} fill="#94a3b8" fontWeight={600}>INFERIOR</text>
          <text x={14} y={284} fontSize={11} fill="#94a3b8">Derecha</text>
          <text x={586} y={284} fontSize={11} fill="#94a3b8" textAnchor="end">Izquierda</text>

          {DIENTES.map(d => {
            const tipo = tipoDiente(d.n);
            const t = tipoPrincipal(piezas[d.n]);
            const es = d.n === seleccionado;
            const lx = d.x + d.ux * (d.h / 2 + 34);
            const ly = d.y + d.uy * (d.h / 2 + 34);
            const tocar = () => setSeleccionado(es ? null : d.n);
            return (
              <g key={d.n} onClick={tocar} style={{ cursor: 'pointer' }} role="button" aria-label={`Diente ${d.n}`}>
                <g transform={`translate(${d.x.toFixed(1)},${d.y.toFixed(1)}) rotate(${d.ang.toFixed(1)})`}>
                  {/* área de toque más grande que el diente */}
                  <circle r={Math.max(d.w, d.h) / 2 + 8} fill="transparent" />
                  {es && <path d={forma(tipo, d.w + 8, d.h + 8)} fill="none" stroke="#0f172a" strokeWidth={2.5} strokeDasharray="3 3" />}
                  <path d={forma(tipo, d.w, d.h)} fill={t ? SUAVE[t] : '#ffffff'} stroke={t ? COLOR[t] : '#94a3b8'} strokeWidth={t ? 2.5 : 1.5} />
                  {tipo === 'molar' && (
                    <path d={`M${-d.w / 4},${-d.h / 5} L${d.w / 4},${d.h / 5} M${d.w / 4},${-d.h / 5} L${-d.w / 4},${d.h / 5}`}
                      stroke={t ? COLOR[t] : '#cbd5e1'} strokeWidth={1} />
                  )}
                </g>
                <circle cx={lx} cy={ly} r={13} fill="transparent" />
                <text x={lx.toFixed(1)} y={(ly + 5).toFixed(1)} textAnchor="middle" fontSize={compacto ? 16 : 13}
                  fontWeight={es ? 800 : 600} fill={es ? '#0f172a' : '#475569'}>{d.n}</text>
              </g>
            );
          })}
        </svg>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569', marginTop: '6px' }}>
          {(['incrustacion', 'corona', 'puente'] as const).map(k => (
            <span key={k}><i style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: COLOR[k], marginRight: 5, verticalAlign: -1 }} />{NOMBRE_TIPO[k]}</span>
          ))}
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', backgroundColor: '#f8fafc' }}>
        {seleccionado === null ? (
          <div style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0.5rem' }}>
            👆 Toca un diente de la boca para indicar qué se hace en cada cara.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Diente {seleccionado}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', margin: '2px 0 10px' }}>
                  {NOMBRE_DIENTE[tipoDiente(seleccionado)]}{soloLectura ? '' : ' · elige qué hacer y toca las caras'}
                </div>
              </div>
              <button type="button" onClick={() => setSeleccionado(null)} aria-label="Cerrar"
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {!soloLectura && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {herramientas.map(h => {
                  const activa = herramienta === h.id;
                  return (
                    <button key={String(h.id)} type="button" onClick={() => setHerramienta(h.id)}
                      style={{
                        border: `1px solid ${activa ? h.color : '#cbd5e1'}`, background: activa ? h.color : '#fff',
                        color: activa ? '#fff' : '#0f172a', borderRadius: '999px', padding: '6px 10px',
                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                      }}>{h.texto}</button>
                  );
                })}
              </div>
            )}
            <svg viewBox="0 0 160 160" style={{ maxWidth: 200, width: '100%', display: 'block', margin: '0 auto' }}>
              {cara('vestibular', 'M10,10 L150,10 L110,50 L50,50Z', 80, 34, 'VESTIBULAR')}
              {cara('distal', mesialDerecha ? IZQ : DER, mesialDerecha ? 30 : 130, 84, 'D')}
              {cara('mesial', mesialDerecha ? DER : IZQ, mesialDerecha ? 130 : 30, 84, 'M')}
              {cara('lingual', 'M10,150 L50,110 L110,110 L150,150Z', 80, 136, 'LINGUAL')}
              {cara('oclusal', 'M50,50 L110,50 L110,110 L50,110Z', 80, 84, 'OCLUSAL')}
            </svg>
            {!soloLectura && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button type="button"
                  onClick={() => cambiarDiente(seleccionado, { oclusal: 'corona', mesial: 'corona', distal: 'corona', vestibular: 'corona', lingual: 'corona' })}
                  style={{ flex: 1, borderRadius: '8px', padding: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8' }}>
                  Corona completa
                </button>
                <button type="button" onClick={() => cambiarDiente(seleccionado, crearPiezaVacia().superficies)}
                  style={{ flex: 1, borderRadius: '8px', padding: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #fecaca', background: '#fff', color: '#dc2626' }}>
                  Limpiar diente
                </button>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: '14px', fontSize: '0.82rem' }}>
          <b style={{ display: 'block', marginBottom: '4px' }}>Marcado ({marcados.length} {marcados.length === 1 ? 'diente' : 'dientes'})</b>
          {marcados.length === 0 ? (
            <span style={{ color: '#94a3b8' }}>Ningún diente marcado.</span>
          ) : marcados.map(m => (
            <button key={m.n} type="button" onClick={() => setSeleccionado(m.n)}
              style={{
                display: 'inline-block', background: '#fff', border: `1px solid ${COLOR[m.tipo as string]}`, borderRadius: '999px',
                padding: '3px 9px', margin: '0 4px 4px 0', fontSize: '0.8rem', cursor: 'pointer', color: '#0f172a'
              }}>
              {m.n}: {m.detalle}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Odontograma;
