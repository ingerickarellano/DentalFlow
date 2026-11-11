import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { useDialogos } from '../components/ui/Dialogos';

const OrdenesLista: React.FC = () => {
  const { avisar } = useDialogos();
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  // Laboratorista: lee la vista sin montos (sin costo final ni anticipos)
  const [esLaboratorista, setEsLaboratorista] = useState(false);

  useEffect(() => {
    cargarUsuarioYOrdenes();
  }, []);

  const cargarUsuarioYOrdenes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No hay usuario autenticado');
        return;
      }

      const { data: perfil } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      setUsuario({
        id: user.id,
        email: user.email!,
        nombre: perfil?.nombre || user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
        rol: perfil?.rol || user.user_metadata?.rol || 'cliente',
        laboratorio: perfil?.laboratorio || user.user_metadata?.laboratorio,
        telefono: perfil?.telefono || user.user_metadata?.telefono,
      });

      const laboratorista = perfil?.rol === 'laboratorista';
      setEsLaboratorista(laboratorista);

      // Admin: todas las órdenes de su laboratorio. Laboratorista: las de sus trabajos, sin montos.
      const { data, error } = laboratorista
        ? await supabase
            .from('ordenes_vista')
            .select('*')
            .order('created_at', { ascending: false })
        : await supabase
            .from('ordenes_trabajo')
            .select(`
              *,
              trabajo:trabajo_id (
                id,
                paciente,
                servicios,
                precio_total,
                fecha_creacion,
                fecha_entrega_estimada,
                notas,
                estado,
                clinica:clinica_id (id, nombre, direccion, telefono),
                dentista:dentista_id (id, nombre),
                laboratorista:laboratorista_id (id, nombre)
              )
            `)
            .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdenes(data || []);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      avisar('Error al cargar las órdenes. Revisa la consola.');
    } finally {
      setCargando(false);
    }
  };

  // ========== FUNCIÓN DE IMPRESIÓN PARA ÓRDENES (sin tabla de prestaciones) ==========
  const imprimirOrden = async (ordenId: string) => {
    try {
      const { data: orden, error } = esLaboratorista
        ? await supabase
            .from('ordenes_vista')
            .select('*')
            .eq('id', ordenId)
            .single()
        : await supabase
            .from('ordenes_trabajo')
            .select(`
              *,
              trabajo:trabajo_id (
                *,
                clinica:clinica_id (*),
                dentista:dentista_id (*),
                laboratorista:laboratorista_id (*)
              )
            `)
            .eq('id', ordenId)
            .single();

      if (error) throw error;

      const { data: config } = await supabase
        .from('configuracion_laboratorio')
        .select('*')
        .eq('usuario_id', orden.usuario_id)
        .single();

      const ventana = window.open('', '_blank');
      if (!ventana) {
        avisar('El navegador bloqueó la ventana emergente.');
        return;
      }

      const html = generarHTMLImpresionOrden(orden, config);
      ventana.document.write(html);
      ventana.document.close();
    } catch (error) {
      console.error('Error al imprimir:', error);
      avisar('Error al generar la vista de impresión');
    }
  };

  const generarHTMLImpresionOrden = (orden: any, config: any) => {
    const trabajo = orden.trabajo;
    const clinica = trabajo?.clinica;
    const dentista = trabajo?.dentista;
    const laboratorista = trabajo?.laboratorista;

    // Secciones de la orden (basadas en la orden, no en trabajo)
    // Materiales
    const materiales = `
      <div class="section">
        <h4>Materiales</h4>
        <p><span class="label">Aleación:</span> ${orden.aleacion || '-'}</p>
        <p><span class="label">Material estético:</span> ${orden.material_estetico || '-'}</p>
        <p><span class="label">Tipo de póntico:</span> ${orden.tipo_pontico || '-'}</p>
        <p><span class="label">Color:</span> ${orden.color || '-'}</p>
      </div>
    `;

    // Análisis
    const analisis = `
      <div class="section">
        <h4>Análisis</h4>
        <p><span class="label">Impresión:</span> ${orden.analisis_impresion || '-'}</p>
        <p><span class="label">Modelo:</span> ${orden.analisis_modelo || '-'}</p>
        <p><span class="label">Registros:</span> ${orden.aporta_registros ? 'Sí' + (orden.cuales_registros ? ': ' + orden.cuales_registros : '') : 'No'}</p>
      </div>
    `;

    // Articulación
    const articulacion = `
      <div class="section">
        <h4>Articulación</h4>
        <p><span class="label">Tipo:</span> ${orden.articulado || '-'}</p>
        <p><span class="label">Características:</span> ${orden.metalica ? 'Metálica ' : ''}${orden.estetica ? 'Estética' : '-'}</p>
        <p><span class="label">Especificaciones:</span> ${orden.especificaciones || '-'}</p>
      </div>
    `;

    // Prótesis removible
    const protesisRemovible = `
      <div class="section">
        <h4>Prótesis removible</h4>
        <p><span class="label">Removible:</span> ${orden.protesis_removible ? 'Sí' : 'No'}</p>
        ${orden.protesis_removible ? `
          <p><span class="label">Total:</span> ${orden.protesis_total ? 'Sí' : 'No'}</p>
          <p><span class="label">Parcial:</span> ${orden.protesis_parcial ? 'Sí' : 'No'}</p>
          <p><span class="label">Removable:</span> ${orden.removable ? 'Sí' : 'No'}</p>
          <p><span class="label">Diseño esqueleto:</span> ${orden.diseno_esqueleto || '-'}</p>
        ` : ''}
      </div>
    `;

    // Ortodoncia
    const ortodoncia = `
      <div class="section">
        <h4>Ortodoncia</h4>
        <p><span class="label">Superior:</span> ${orden.ortodoncia_superior ? 'Sí' : 'No'}</p>
        <p><span class="label">Inferior:</span> ${orden.ortodoncia_inferior ? 'Sí' : 'No'}</p>
        <p><span class="label">Aparato:</span> ${orden.aparato_realizar || '-'}</p>
      </div>
    `;

    // Finalización
    const finalizacion = `
      <div class="section">
        <h4>Finalización</h4>
        <p><span class="label">Yeso:</span> ${orden.tipo_yeso || '-'}</p>
        <p><span class="label">Fecha entrega:</span> ${orden.fecha_entrega ? new Date(orden.fecha_entrega).toLocaleDateString() : '-'}</p>
        ${esLaboratorista ? '' : `<p><span class="label">Costo final:</span> $${orden.costo_final?.toLocaleString() || trabajo?.precio_total?.toLocaleString() || '0'}</p>`}
        <p><span class="label">Firma:</span> ${orden.firma || '-'}</p>
      </div>
    `;

    // Piezas seleccionadas
    const piezasHTML = Object.entries(orden.piezas || {})
      .map(([num, p]: [string, any]) => {
        const superficiesActivas = Object.entries(p.superficies || {})
          .filter(([_, tipo]) => tipo !== null)
          .map(([sup, tipo]) => {
            let tipoTexto = '';
            if (tipo === 'incrustacion') tipoTexto = 'Incrustación';
            else if (tipo === 'corona') tipoTexto = 'Corona';
            else if (tipo === 'puente') tipoTexto = 'Puente';
            return `${sup}: ${tipoTexto}`;
          })
          .join(', ');
        if (superficiesActivas.length === 0) return null;
        return `<p><span class="label">Diente ${num}:</span> ${superficiesActivas}</p>`;
      })
      .filter(Boolean)
      .join('') || '<p>No hay piezas seleccionadas</p>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Trabajo - ${trabajo?.paciente || 'Sin paciente'}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header p {
            margin: 2px 0;
            font-size: 11px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .info-item {
            margin: 2px 0;
          }
          .label {
            font-weight: bold;
            display: inline-block;
            min-width: 100px;
          }
          .section {
            margin-bottom: 8px;
          }
          .section h4 {
            margin: 5px 0 2px;
            font-size: 13px;
            font-weight: bold;
            text-decoration: underline;
          }
          .section p {
            margin: 2px 0;
          }
          .qr-code {
            text-align: center;
            margin: 10px 0;
          }
          .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid #000;
            padding-top: 5px;
          }
          .no-print {
            display: none;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${config?.nombre_laboratorio || 'LABORATORIO DENTAL'}</h1>
          <p>${config?.direccion || ''} | Tel: ${config?.telefono || ''} | ${config?.email || ''}</p>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-item"><span class="label">Paciente:</span> ${trabajo?.paciente || ''}</div>
            <div class="info-item"><span class="label">Clínica:</span> ${clinica?.nombre || '-'}</div>
            <div class="info-item"><span class="label">Dentista:</span> ${dentista?.nombre || '-'}</div>
          </div>
          <div>
            <div class="info-item"><span class="label">Laboratorista:</span> ${laboratorista?.nombre || 'No asignado'}</div>
            <div class="info-item"><span class="label">Fecha creación:</span> ${trabajo?.fecha_creacion ? new Date(trabajo.fecha_creacion).toLocaleDateString() : '-'}</div>
            <div class="info-item"><span class="label">Entrega estimada:</span> ${trabajo?.fecha_entrega_estimada ? new Date(trabajo.fecha_entrega_estimada).toLocaleDateString() : '-'}</div>
            <div class="info-item"><span class="label">Estado:</span> ${trabajo?.estado || '-'}</div>
          </div>
        </div>

        <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 10px;">
          <h3 style="margin: 5px 0; font-size: 14px; font-weight: bold;">DETALLES DE LA ORDEN</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${materiales}
            ${analisis}
            ${articulacion}
            ${protesisRemovible}
            ${ortodoncia}
            ${finalizacion}
          </div>
          <div style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 5px;">
            <h4 style="margin: 5px 0; font-size: 13px; font-weight: bold;">Piezas seleccionadas</h4>
            ${piezasHTML}
          </div>
        </div>

        ${trabajo?.notas ? `
          <div style="margin-top: 10px;">
            <h4 style="margin: 5px 0; font-size: 13px; font-weight: bold;">Notas</h4>
            <p>${trabajo.notas}</p>
          </div>
        ` : ''}

        <div class="qr-code">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${trabajo?.id}" alt="QR" />
          <p style="font-size: 9px;">ID: ${trabajo?.id?.slice(0, 8)}</p>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString()} - ID Orden: ${orden.id}</p>
          <div class="no-print">
            <button onclick="window.print()">🖨️ Imprimir</button>
            <button onclick="window.close()">❌ Cerrar</button>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Búsqueda por paciente, clínica o dentista
  const normalizar = (t: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtradas = ordenes.filter(o => {
    const q = normalizar(busqueda.trim());
    if (!q) return true;
    return [o.trabajo?.paciente, o.trabajo?.clinica?.nombre, o.trabajo?.dentista?.nombre, o.doctor_nombre]
      .some(v => normalizar(v || '').includes(q));
  });

  const ESTADOS: Record<string, { texto: string; bg: string; color: string }> = {
    pendiente: { texto: 'Pendiente', bg: '#fef3c7', color: '#92400e' },
    produccion: { texto: 'En producción', bg: '#dbeafe', color: '#1e40af' },
    terminado: { texto: 'Terminado', bg: '#d1fae5', color: '#065f46' },
    entregado: { texto: 'Entregado', bg: '#ede9fe', color: '#5b21b6' }
  };

  // Dientes marcados en la orden (para el resumen de la tarjeta)
  const dientesMarcados = (piezas: any) => Object.entries(piezas || {})
    .filter(([, p]: [string, any]) => Object.values(p?.superficies || {}).some(v => v))
    .map(([n]) => n);

  return (
    <>
      <Header
        user={usuario}
        onLogout={() => supabase.auth.signOut()}
        showBackButton={true}
        onBack={() => navigate('/dashboard')}
        title="Órdenes de Trabajo"
        showTitle={true}
      />
      <div style={ui.pagina}>
        <div style={ui.cabecera}>
          <div>
            <h1 style={ui.titulo}>📋 Órdenes de Trabajo</h1>
            <p style={ui.subtitulo}>{ordenes.length} {ordenes.length === 1 ? 'orden' : 'órdenes'}</p>
          </div>
          <button onClick={() => navigate('/ordenes/nueva')} style={ui.botonNueva}>+ Nueva orden</button>
        </div>

        <div style={ui.buscadorCaja}>
          <span style={ui.buscadorIcono}>🔍</span>
          <input style={ui.buscador} placeholder="Buscar por paciente, clínica o dentista..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
        </div>

        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando...</p>
        ) : ordenes.length === 0 ? (
          <div style={ui.vacio}>No hay órdenes de trabajo registradas.</div>
        ) : filtradas.length === 0 ? (
          <div style={ui.vacio}>No hay órdenes que coincidan con "{busqueda}".</div>
        ) : (
          <div style={ui.grilla}>
            {filtradas.map(orden => {
              const estado = ESTADOS[orden.trabajo?.estado] || null;
              const dientes = dientesMarcados(orden.piezas);
              return (
                <div key={orden.id} style={ui.tarjeta}>
                  <div style={ui.tarjetaCabecera}>
                    <div style={{ minWidth: 0 }}>
                      <div style={ui.paciente}>👤 {orden.trabajo?.paciente || 'Sin paciente'}</div>
                      <div style={ui.detalle}>🏥 {orden.trabajo?.clinica?.nombre || 'Sin clínica'}</div>
                    </div>
                    {estado && <span style={{ ...ui.estado, backgroundColor: estado.bg, color: estado.color }}>{estado.texto}</span>}
                  </div>
                  <div style={ui.datos}>
                    <div><span style={ui.dLabel}>Dentista</span>{orden.trabajo?.dentista?.nombre || orden.doctor_nombre || '-'}</div>
                    <div><span style={ui.dLabel}>Creada</span>{new Date(orden.created_at).toLocaleDateString('es-CL')}</div>
                    <div><span style={ui.dLabel}>Entrega estimada</span>{orden.trabajo?.fecha_entrega_estimada ? new Date(`${orden.trabajo.fecha_entrega_estimada}T12:00:00`).toLocaleDateString('es-CL') : '-'}</div>
                    <div><span style={ui.dLabel}>Piezas</span>{dientes.length ? dientes.join(', ') : '-'}</div>
                  </div>
                  <div style={ui.acciones}>
                    <button onClick={() => navigate(`/ordenes/${orden.id}`)} style={ui.botonEditar}>✏️ Editar</button>
                    <button onClick={() => imprimirOrden(orden.id)} style={ui.botonImprimir}>🖨️ Imprimir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

const ui: Record<string, React.CSSProperties> = {
  pagina: { padding: 'clamp(0.75rem, 2.5vw, 1.5rem)', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#0f172a' },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' },
  titulo: { fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 700, margin: 0 },
  subtitulo: { color: '#64748b', margin: '0.125rem 0 0', fontSize: '0.875rem' },
  botonNueva: { backgroundColor: '#2563eb', color: 'white', padding: '0.65rem 1.25rem', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' },
  buscadorCaja: { position: 'relative', marginBottom: '1rem' },
  buscadorIcono: { position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' },
  buscador: { width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.875rem 0.7rem 2.4rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.95rem', backgroundColor: 'white' },
  vacio: { textAlign: 'center', padding: '2.5rem 1rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' },
  grilla: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '0.875rem' },
  tarjeta: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 },
  tarjetaCabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' },
  paciente: { fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' },
  detalle: { fontSize: '0.8125rem', color: '#64748b', marginTop: '0.125rem', overflowWrap: 'anywhere' },
  estado: { padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' },
  datos: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem 0.75rem', fontSize: '0.875rem', overflowWrap: 'anywhere' },
  dLabel: { display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 },
  acciones: { display: 'flex', gap: '0.5rem', marginTop: 'auto' },
  botonEditar: { flex: 1, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.55rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' },
  botonImprimir: { flex: 1, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '0.55rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }
};

export default OrdenesLista;
