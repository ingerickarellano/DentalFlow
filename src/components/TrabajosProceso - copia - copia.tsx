import React, { useState } from 'react';
import { Trabajo, trabajos, clinicas, dentistas, servicios } from '../data/database';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

interface TrabajosProcesoProps {
  onBack: () => void;
}

const TrabajosProceso: React.FC<TrabajosProcesoProps> = ({ onBack }) => {
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'produccion' | 'terminado' | 'entregado'>('todos');
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: 'bold'
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      marginRight: '0.5rem'
    },
    filters: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      flexWrap: 'wrap' as const
    },
    filterButton: {
      padding: '0.5rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      backgroundColor: 'white',
      transition: 'all 0.2s'
    },
    filterButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      borderLeft: '4px solid #2563eb'
    },
    cardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '1rem'
    },
    pacienteName: {
      color: '#1e293b',
      fontSize: '1.125rem',
      fontWeight: '600',
      margin: 0
    },
    estadoBadge: {
      padding: '0.25rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    estadoPendiente: {
      backgroundColor: '#fef3c7',
      color: '#d97706'
    },
    estadoProduccion: {
      backgroundColor: '#dbeafe',
      color: '#2563eb'
    },
    estadoTerminado: {
      backgroundColor: '#dcfce7',
      color: '#16a34a'
    },
    estadoEntregado: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
      fontSize: '0.875rem'
    },
    serviciosList: {
      marginTop: '1rem',
      paddingTop: '1rem',
      borderTop: '1px solid #e2e8f0'
    },
    servicioItem: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.25rem',
      fontSize: '0.75rem',
      color: '#64748b'
    },
    total: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '0.5rem',
      paddingTop: '0.5rem',
      borderTop: '1px solid #e2e8f0',
      fontWeight: '600',
      color: '#1e293b'
    },
    actions: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem',
      flexWrap: 'wrap' as const
    },
    actionButton: {
      padding: '0.375rem 0.75rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto' as const
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '3rem',
      color: '#64748b'
    }
  };

  const trabajosFiltrados = filtroEstado === 'todos' 
    ? trabajos 
    : trabajos.filter(t => t.estado === filtroEstado);

  const getEstadoStyles = (estado: string) => {
    switch (estado) {
      case 'pendiente': return { ...styles.estadoBadge, ...styles.estadoPendiente };
      case 'produccion': return { ...styles.estadoBadge, ...styles.estadoProduccion };
      case 'terminado': return { ...styles.estadoBadge, ...styles.estadoTerminado };
      case 'entregado': return { ...styles.estadoBadge, ...styles.estadoEntregado };
      default: return styles.estadoBadge;
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '⏳ Pendiente';
      case 'produccion': return '🔧 En Producción';
      case 'terminado': return '✅ Terminado';
      case 'entregado': return '📦 Entregado';
      default: return estado;
    }
  };

  const getNextEstado = (estadoActual: string): string => {
    switch (estadoActual) {
      case 'pendiente': return 'produccion';
      case 'produccion': return 'terminado';
      case 'terminado': return 'entregado';
      default: return estadoActual;
    }
  };

  const getNextEstadoTexto = (estadoActual: string): string => {
    const next = getNextEstado(estadoActual);
    return getEstadoTexto(next);
  };

  const cambiarEstado = (trabajoId: string, nuevoEstado: string) => {
    const trabajoIndex = trabajos.findIndex(t => t.id === trabajoId);
    if (trabajoIndex !== -1) {
      trabajos[trabajoIndex].estado = nuevoEstado as any;
      // Forzar re-render
      setTrabajoSeleccionado(null);
      setTimeout(() => {
        setTrabajoSeleccionado(trabajos[trabajoIndex]);
      }, 100);
    }
  };

  const getServicioNombre = (servicioId: string) => {
    return servicios.find(s => s.id === servicioId)?.nombre || 'Servicio no encontrado';
  };

  const getServicioPrecio = (servicioId: string) => {
    return servicios.find(s => s.id === servicioId)?.precioBase || 0;
  };

  const generarPDF = async (trabajo: Trabajo) => {
    try {
      // Crear elemento HTML temporal para el PDF
      const pdfElement = document.createElement('div');
      pdfElement.style.position = 'absolute';
      pdfElement.style.left = '-9999px';
      pdfElement.style.padding = '20px';
      pdfElement.style.backgroundColor = 'white';
      pdfElement.style.width = '210mm'; // A4 width
      pdfElement.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            <h1 style="color: #2563eb; margin: 0;">DentalFlow Manager</h1>
            <p style="color: #666; margin: 5px 0;">Sistema de Gestión Dental</p>
            <p style="color: #666; margin: 0;">Presupuesto y Orden de Trabajo</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <h3 style="color: #333; margin-bottom: 10px;">Información del Paciente</h3>
              <p style="margin: 5px 0;"><strong>Paciente:</strong> ${trabajo.paciente}</p>
              <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Estado:</strong> ${getEstadoTexto(trabajo.estado)}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="color: #333; margin-bottom: 10px;">Información de Contacto</h3>
              <p style="margin: 5px 0;"><strong>Clínica:</strong> ${clinicas.find(c => c.id === trabajo.clinicaId)?.nombre}</p>
              <p style="margin: 5px 0;"><strong>Dentista:</strong> ${dentistas.find(d => d.id === trabajo.dentistaId)?.nombre}</p>
              <p style="margin: 5px 0;"><strong>Entrega:</strong> ${new Date(trabajo.fechaEntrega).toLocaleDateString()}</p>
            </div>
          </div>

          <h3 style="color: #333; margin-bottom: 15px;">Detalle de Servicios</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Servicio</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Cantidad</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Precio Unit.</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${trabajo.servicios.map(servicio => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">${getServicioNombre(servicio.servicioId)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${servicio.cantidad}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">$${servicio.precioUnitario}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">$${servicio.precioUnitario * servicio.cantidad}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="text-align: right; margin-bottom: 20px;">
            <h3 style="color: #333;">Total: $${trabajo.precioTotal}</h3>
          </div>

          ${trabajo.observaciones ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #333; margin-bottom: 10px;">Observaciones</h3>
              <p style="background-color: #f8fafc; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb;">
                ${trabajo.observaciones}
              </p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
            <p style="color: #666; font-size: 12px;">
              Documento generado automáticamente por DentalFlow Manager<br>
              Fecha de generación: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `;

      document.body.appendChild(pdfElement);

      // Convertir a canvas y luego a PDF
      const canvas = await html2canvas(pdfElement);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Presupuesto_${trabajo.paciente}_${new Date().toISOString().split('T')[0]}.pdf`);

      // Limpiar
      document.body.removeChild(pdfElement);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intenta nuevamente.');
    }
  };

  const generarExcel = (trabajo: Trabajo) => {
    try {
      // Preparar datos para Excel
      const datosServicios = trabajo.servicios.map((servicio, index) => ({
        'N°': index + 1,
        'Servicio': getServicioNombre(servicio.servicioId),
        'Cantidad': servicio.cantidad,
        'Precio Unitario': servicio.precioUnitario,
        'Subtotal': servicio.precioUnitario * servicio.cantidad
      }));

      // Crear workbook
      const wb = XLSX.utils.book_new();
      
      // Hoja de servicios
      const wsServicios = XLSX.utils.json_to_sheet(datosServicios);
      XLSX.utils.book_append_sheet(wb, wsServicios, 'Servicios');

      // Hoja de información general
      const infoGeneral = [
        ['PACIENTE:', trabajo.paciente],
        ['CLÍNICA:', clinicas.find(c => c.id === trabajo.clinicaId)?.nombre],
        ['DENTISTA:', dentistas.find(d => d.id === trabajo.dentistaId)?.nombre],
        ['FECHA RECIBIDO:', new Date(trabajo.fechaRecibido).toLocaleDateString()],
        ['FECHA ENTREGA:', new Date(trabajo.fechaEntrega).toLocaleDateString()],
        ['ESTADO:', getEstadoTexto(trabajo.estado)],
        ['OBSERVACIONES:', trabajo.observaciones || 'Ninguna'],
        ['TOTAL:', `$${trabajo.precioTotal}`]
      ];
      
      const wsInfo = XLSX.utils.aoa_to_sheet(infoGeneral);
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Información General');

      // Generar y descargar archivo
      XLSX.writeFile(wb, `Orden_Trabajo_${trabajo.paciente}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
    } catch (error) {
      console.error('Error generando Excel:', error);
      alert('Error al generar el Excel. Por favor intenta nuevamente.');
    }
  };

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button style={styles.backButton} onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>🔧 Trabajos en Proceso</h1>
        </div>
      </div>

      <div style={styles.filters}>
        <button
          style={{
            ...styles.filterButton,
            ...(filtroEstado === 'todos' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFiltroEstado('todos')}
        >
          📋 Todos ({trabajos.length})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filtroEstado === 'pendiente' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFiltroEstado('pendiente')}
        >
          ⏳ Pendientes ({trabajos.filter(t => t.estado === 'pendiente').length})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filtroEstado === 'produccion' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFiltroEstado('produccion')}
        >
          🔧 En Producción ({trabajos.filter(t => t.estado === 'produccion').length})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filtroEstado === 'terminado' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFiltroEstado('terminado')}
        >
          ✅ Terminados ({trabajos.filter(t => t.estado === 'terminado').length})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filtroEstado === 'entregado' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFiltroEstado('entregado')}
        >
          📦 Entregados ({trabajos.filter(t => t.estado === 'entregado').length})
        </button>
      </div>

      {trabajosFiltrados.length === 0 ? (
        <div style={styles.emptyState}>
          <h3>No hay trabajos {filtroEstado !== 'todos' ? `en estado "${getEstadoTexto(filtroEstado)}"` : 'registrados'}</h3>
          <p>
            {filtroEstado === 'todos' 
              ? 'Comienza creando tu primer trabajo desde el módulo "Crear Lista de Trabajo"'
              : 'Los trabajos aparecerán aquí cuando cambien a este estado'
            }
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {trabajosFiltrados.map(trabajo => {
            const clinica = clinicas.find(c => c.id === trabajo.clinicaId);
            const dentista = dentistas.find(d => d.id === trabajo.dentistaId);
            
            return (
              <div
                key={trabajo.id}
                style={{
                  ...styles.card,
                  ...(hoveredCard === trabajo.id ? styles.cardHover : {})
                }}
                onMouseEnter={() => setHoveredCard(trabajo.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setTrabajoSeleccionado(trabajo)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.pacienteName}>{trabajo.paciente}</h3>
                  <span style={getEstadoStyles(trabajo.estado)}>
                    {getEstadoTexto(trabajo.estado)}
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <span><strong>Clínica:</strong></span>
                  <span>{clinica?.nombre}</span>
                </div>

                <div style={styles.infoRow}>
                  <span><strong>Dentista:</strong></span>
                  <span>{dentista?.nombre}</span>
                </div>

                <div style={styles.infoRow}>
                  <span><strong>Fecha Entrega:</strong></span>
                  <span>{new Date(trabajo.fechaEntrega).toLocaleDateString()}</span>
                </div>

                <div style={styles.serviciosList}>
                  <strong>Servicios:</strong>
                  {trabajo.servicios.map((servicio, index) => (
                    <div key={index} style={styles.servicioItem}>
                      <span>
                        {getServicioNombre(servicio.servicioId)} 
                        {servicio.cantidad > 1 && ` (x${servicio.cantidad})`}
                      </span>
                      <span>${servicio.precioUnitario * servicio.cantidad}</span>
                    </div>
                  ))}
                  <div style={styles.total}>
                    <span>TOTAL:</span>
                    <span>${trabajo.precioTotal}</span>
                  </div>
                </div>

                {trabajo.observaciones && (
                  <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b'}}>
                    <strong>Observaciones:</strong> {trabajo.observaciones}
                  </div>
                )}

                <div style={styles.actions}>
                  {trabajo.estado !== 'entregado' && (
                    <button
                      style={{
                        ...styles.actionButton,
                        backgroundColor: '#10b981',
                        color: 'white'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextEstado = getNextEstado(trabajo.estado);
                        cambiarEstado(trabajo.id, nextEstado);
                      }}
                    >
                      Avanzar a {getNextEstadoTexto(trabajo.estado)}
                    </button>
                  )}
                  
                  {trabajo.estado === 'terminado' && (
                    <>
                      <button
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#dc2626',
                          color: 'white'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          generarPDF(trabajo);
                        }}
                      >
                        📄 Descargar PDF
                      </button>
                      <button
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#16a34a',
                          color: 'white'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          generarExcel(trabajo);
                        }}
                      >
                        📊 Descargar Excel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {trabajoSeleccionado && (
        <div style={styles.modalOverlay} onClick={() => setTrabajoSeleccionado(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.cardHeader}>
              <h2 style={{margin: 0, color: '#1e293b'}}>{trabajoSeleccionado.paciente}</h2>
              <span style={getEstadoStyles(trabajoSeleccionado.estado)}>
                {getEstadoTexto(trabajoSeleccionado.estado)}
              </span>
            </div>

            <div style={styles.infoRow}>
              <span><strong>Clínica:</strong></span>
              <span>{clinicas.find(c => c.id === trabajoSeleccionado.clinicaId)?.nombre}</span>
            </div>

            <div style={styles.infoRow}>
              <span><strong>Dentista:</strong></span>
              <span>{dentistas.find(d => d.id === trabajoSeleccionado.dentistaId)?.nombre}</span>
            </div>

            <div style={styles.infoRow}>
              <span><strong>Fecha Recibido:</strong></span>
              <span>{new Date(trabajoSeleccionado.fechaRecibido).toLocaleDateString()}</span>
            </div>

            <div style={styles.infoRow}>
              <span><strong>Fecha Entrega:</strong></span>
              <span>{new Date(trabajoSeleccionado.fechaEntrega).toLocaleDateString()}</span>
            </div>

            <div style={styles.serviciosList}>
              <strong>Servicios Detallados:</strong>
              {trabajoSeleccionado.servicios.map((servicio, index) => (
                <div key={index} style={styles.servicioItem}>
                  <span>
                    {getServicioNombre(servicio.servicioId)} 
                    {servicio.cantidad > 1 && ` (x${servicio.cantidad})`}
                  </span>
                  <span>${servicio.precioUnitario * servicio.cantidad}</span>
                </div>
              ))}
              <div style={styles.total}>
                <span>TOTAL:</span>
                <span>${trabajoSeleccionado.precioTotal}</span>
              </div>
            </div>

            {trabajoSeleccionado.observaciones && (
              <div style={{marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem'}}>
                <strong>Observaciones:</strong>
                <p style={{margin: '0.5rem 0 0 0', color: '#64748b'}}>{trabajoSeleccionado.observaciones}</p>
              </div>
            )}

            <div style={{...styles.actions, marginTop: '1.5rem', justifyContent: 'center'}}>
              {trabajoSeleccionado.estado !== 'entregado' && (
                <button
                  style={{
                    ...styles.actionButton,
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => {
                    const nextEstado = getNextEstado(trabajoSeleccionado.estado);
                    cambiarEstado(trabajoSeleccionado.id, nextEstado);
                  }}
                >
                  Avanzar a {getNextEstadoTexto(trabajoSeleccionado.estado)}
                </button>
              )}
              
              {trabajoSeleccionado.estado === 'terminado' && (
                <>
                  <button
                    style={{
                      ...styles.actionButton,
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem'
                    }}
                    onClick={() => generarPDF(trabajoSeleccionado)}
                  >
                    📄 Generar PDF
                  </button>
                  <button
                    style={{
                      ...styles.actionButton,
                      backgroundColor: '#16a34a',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem'
                    }}
                    onClick={() => generarExcel(trabajoSeleccionado)}
                  >
                    📊 Generar Excel
                  </button>
                </>
              )}
              
              <button
                style={{
                  ...styles.actionButton,
                  backgroundColor: '#64748b',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem'
                }}
                onClick={() => setTrabajoSeleccionado(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrabajosProceso;