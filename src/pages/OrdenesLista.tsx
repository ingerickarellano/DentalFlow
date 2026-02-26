import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

const OrdenesLista: React.FC = () => {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);

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

      const { data, error } = await supabase
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
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdenes(data || []);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      alert('Error al cargar las órdenes. Revisa la consola.');
    } finally {
      setCargando(false);
    }
  };

  // ========== FUNCIÓN DE IMPRESIÓN PARA ÓRDENES (sin tabla de prestaciones) ==========
  const imprimirOrden = async (ordenId: string) => {
    try {
      const { data: orden, error } = await supabase
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
        alert('El navegador bloqueó la ventana emergente.');
        return;
      }

      const html = generarHTMLImpresionOrden(orden, config);
      ventana.document.write(html);
      ventana.document.close();
    } catch (error) {
      console.error('Error al imprimir:', error);
      alert('Error al generar la vista de impresión');
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
        <p><span class="label">Costo final:</span> $${orden.costo_final?.toLocaleString() || trabajo?.precio_total?.toLocaleString() || '0'}</p>
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
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b' }}>📋 Órdenes de Trabajo</h1>
          <button
            onClick={() => navigate('/ordenes/nueva')}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            + Nueva Orden
          </button>
        </div>

        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando...</p>
        ) : ordenes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b' }}>No hay órdenes de trabajo registradas.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <thead style={{ background: '#f1f5f9' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Paciente</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Clínica</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map(orden => (
                <tr key={orden.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>{orden.trabajo?.paciente || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{orden.trabajo?.clinica?.nombre || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{new Date(orden.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => navigate(`/ordenes/${orden.id}`)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        marginRight: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => imprimirOrden(orden.id)}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        cursor: 'pointer'
                      }}
                    >
                      Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default OrdenesLista;