// Reportes.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Header from './Header';

interface ReportesProps {
  onBack: () => void;
}

interface FiltrosReporte {
  clinicaId: string;
  periodo: 'mes' | 'año' | 'personalizado';
  fechaInicio: string;
  fechaFin: string;
  mes: string;
  año: string;
}

interface Trabajo {
  id: string;
  paciente: string;
  clinica_id: string;
  dentista_id: string | null;
  laboratorista_id: string | null;
  servicios: Array<{
    servicio_id: string;
    cantidad: number;
    precio: number;
    nombre: string;
    pieza_dental: string;
    nota_especial?: string;
  }>;
  precio_total: number;
  estado: 'pendiente' | 'produccion' | 'terminado' | 'entregado';
  fecha_recibido: string;
  fecha_entrega_estimada: string;
  notas: string;
  usuario_id: string;
  created_at: string;
}

interface Clinica {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  usuario_id: string;
  created_at: string;
}

interface ConfiguracionLaboratorio {
  id?: string;
  nombre_laboratorio: string;
  rut: string;
  direccion: string;
  telefono: string;
  email: string;
  logo: string | null;
  tipo_impuesto: 'iva' | 'honorarios';
  porcentaje_impuesto: number;
  usuario_id: string;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  plan?: string;
  fecha_expiracion?: string | null;
  suscripcion_activa?: boolean;
  laboratorio?: string;
  telefono?: string;
}

type Styles = {
  [key: string]: React.CSSProperties;
};

const Reportes: React.FC<ReportesProps> = ({ onBack }) => {
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    clinicaId: 'todos',
    periodo: 'mes',
    fechaInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    mes: (new Date().getMonth() + 1).toString(),
    año: new Date().getFullYear().toString()
  });

  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [configuracionLaboratorio, setConfiguracionLaboratorio] = useState<ConfiguracionLaboratorio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // Estado para la acción masiva
  const [estadoMasivo, setEstadoMasivo] = useState<Trabajo['estado']>('entregado');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

      const { data: userData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUsuario({
          id: userData.id,
          email: userData.email || user.email || '',
          nombre: userData.nombre || 'Usuario',
          rol: userData.rol || 'usuario',
          plan: userData.plan,
          fecha_expiracion: userData.fecha_expiracion,
          suscripcion_activa: userData.suscripcion_activa,
          laboratorio: userData.laboratorio,
          telefono: userData.telefono
        });
      }

      const [trabajosRes, clinicasRes, configuracionRes] = await Promise.all([
        supabase
          .from('trabajos')
          .select('*')
          .eq('usuario_id', user.id)
          .order('fecha_recibido', { ascending: false }),
        supabase.from('clinicas').select('*').eq('usuario_id', user.id),
        supabase.from('configuracion_laboratorio').select('*').eq('usuario_id', user.id).single()
      ]);

      if (trabajosRes.error) throw trabajosRes.error;
      if (clinicasRes.error) throw clinicasRes.error;

      setTrabajos(trabajosRes.data || []);
      setClinicas(clinicasRes.data || []);

      if (configuracionRes.data) {
        setConfiguracionLaboratorio(configuracionRes.data);
      } else {
        setConfiguracionLaboratorio({
          nombre_laboratorio: 'Laboratorio Dental Pro',
          rut: '76.123.456-7',
          direccion: 'Av. Principal 123, Santiago, Chile',
          telefono: '+56 2 2345 6789',
          email: 'contacto@laboratoriodental.cl',
          logo: null,
          tipo_impuesto: 'iva',
          porcentaje_impuesto: 19,
          usuario_id: user.id
        });
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      alert(`Error al cargar los datos: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = async () => {
    try {
      setCerrandoSesion(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
    } finally {
      setCerrandoSesion(false);
    }
  };

  const calcularMontosConImpuesto = useCallback((montoBruto: number) => {
    if (!configuracionLaboratorio) {
      return {
        bruto: montoBruto,
        impuesto: 0,
        neto: montoBruto,
        porcentaje: 0,
        tipo: 'Sin configuración'
      };
    }

    const porcentaje = configuracionLaboratorio.porcentaje_impuesto;
    const montoImpuesto = (montoBruto * porcentaje) / 100;
    const montoNeto = configuracionLaboratorio.tipo_impuesto === 'iva'
      ? montoBruto + montoImpuesto
      : montoBruto - montoImpuesto;

    return {
      bruto: montoBruto,
      impuesto: montoImpuesto,
      neto: montoNeto,
      porcentaje: porcentaje,
      tipo: configuracionLaboratorio.tipo_impuesto === 'iva' ? 'IVA' : 'Retención'
    };
  }, [configuracionLaboratorio]);

  const actualizarEstadoTrabajo = async (trabajoId: string, nuevoEstado: string) => {
    try {
      setActualizandoEstado(trabajoId);
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: nuevoEstado })
        .eq('id', trabajoId);

      if (error) throw error;

      setTrabajos(prev => prev.map(t =>
        t.id === trabajoId ? { ...t, estado: nuevoEstado as Trabajo['estado'] } : t
      ));

      alert('✅ Estado actualizado correctamente');
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      alert('❌ Error al actualizar el estado');
    } finally {
      setActualizandoEstado(null);
    }
  };

  // Función para actualizar todos los trabajos filtrados a un estado elegido
  const actualizarTodosEstado = async () => {
    if (trabajosFiltrados.length === 0) {
      alert('No hay trabajos en los filtros actuales.');
      return;
    }

    const count = trabajosFiltrados.length;
    const estadoTexto = obtenerTextoEstado(estadoMasivo);
    if (!window.confirm(`¿Estás seguro de marcar TODOS los ${count} trabajos filtrados como "${estadoTexto}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setBulkUpdating(true);
      const ids = trabajosFiltrados.map(t => t.id);
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: estadoMasivo })
        .in('id', ids);

      if (error) throw error;

      setTrabajos(prev => prev.map(t => ids.includes(t.id) ? { ...t, estado: estadoMasivo } : t));
      alert(`✅ ${count} trabajos marcados como "${estadoTexto}".`);
    } catch (error: any) {
      console.error('Error actualizando estado masivo:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setBulkUpdating(false);
    }
  };

  const calcularFechasPorPeriodo = (periodo: string, mes?: string, año?: string) => {
    const hoy = new Date();
    let fechaInicio = new Date();
    let fechaFin = new Date();

    switch (periodo) {
      case 'mes':
        if (mes && año) {
          fechaInicio = new Date(parseInt(año), parseInt(mes) - 1, 1);
          fechaFin = new Date(parseInt(año), parseInt(mes), 0);
        } else {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        }
        break;
      case 'año':
        if (año) {
          fechaInicio = new Date(parseInt(año), 0, 1);
          fechaFin = new Date(parseInt(año), 11, 31);
        } else {
          fechaInicio = new Date(hoy.getFullYear(), 0, 1);
          fechaFin = new Date(hoy.getFullYear(), 11, 31);
        }
        break;
      default:
        fechaInicio = new Date(filtros.fechaInicio);
        fechaFin = new Date(filtros.fechaFin);
        break;
    }

    return {
      inicio: fechaInicio.toISOString().split('T')[0],
      fin: fechaFin.toISOString().split('T')[0]
    };
  };

  const handleFiltroChange = (
    campo: keyof FiltrosReporte,
    valor: string
  ) => {
    if (campo === 'periodo' && valor !== 'personalizado') {
      const fechas = calcularFechasPorPeriodo(valor, filtros.mes, filtros.año);
      setFiltros(prev => ({
        ...prev,
        periodo: valor as 'mes' | 'año' | 'personalizado',
        fechaInicio: fechas.inicio,
        fechaFin: fechas.fin
      }));
    } else if (campo === 'mes' || campo === 'año') {
      const nuevoFiltros = {
        ...filtros,
        [campo]: valor
      };

      if (filtros.periodo === 'mes' || filtros.periodo === 'año') {
        const fechas = calcularFechasPorPeriodo(filtros.periodo,
          campo === 'mes' ? valor : nuevoFiltros.mes,
          campo === 'año' ? valor : nuevoFiltros.año
        );
        nuevoFiltros.fechaInicio = fechas.inicio;
        nuevoFiltros.fechaFin = fechas.fin;
      }

      setFiltros(nuevoFiltros);
    } else {
      setFiltros(prev => ({
        ...prev,
        [campo]: valor
      } as FiltrosReporte));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    handleFiltroChange(name as keyof FiltrosReporte, value);
  };

  const trabajosFiltrados = useMemo(() => {
    let filtrados = [...trabajos];

    if (filtros.clinicaId !== 'todos') {
      filtrados = filtrados.filter(t => t.clinica_id === filtros.clinicaId);
    }

    filtrados = filtrados.filter(t => {
      const fechaTrabajo = new Date(t.fecha_recibido);
      const fechaInicio = new Date(filtros.fechaInicio);
      const fechaFin = new Date(filtros.fechaFin);
      return fechaTrabajo >= fechaInicio && fechaTrabajo <= fechaFin;
    });

    return filtrados;
  }, [filtros, trabajos]);

  const estadisticas = useMemo(() => {
    const totalTrabajos = trabajosFiltrados.length;
    const totalIngresos = trabajosFiltrados.reduce((sum, t) => sum + t.precio_total, 0);
    const montos = calcularMontosConImpuesto(totalIngresos);

    const totalPrestaciones = trabajosFiltrados.reduce((sum, t) =>
      sum + t.servicios.reduce((servSum, s) => servSum + s.cantidad, 0), 0
    );

    return {
      totalTrabajos,
      totalPrestaciones,
      totalIngresos,
      ...montos
    };
  }, [trabajosFiltrados, calcularMontosConImpuesto]);

  const obtenerNombreMes = (mes: string) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[parseInt(mes) - 1] || '';
  };

  const exportarPDF = () => {
    const clinicaSeleccionada = filtros.clinicaId !== 'todos'
      ? clinicas.find(c => c.id === filtros.clinicaId)
      : null;

    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('El navegador bloqueó la ventana emergente. Permite ventanas emergentes e intenta de nuevo.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte ${clinicaSeleccionada ? clinicaSeleccionada.nombre : 'Todas las Clínicas'} - ${new Date().toLocaleDateString()}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Roboto, Arial, sans-serif;
            background-color: #f8fafc;
            padding: 15px;
            color: #1e293b;
            line-height: 1.4;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 2px solid #2563eb;
          }
          .left { flex: 1; }
          .right { flex: 1; text-align: right; }
          .logo { max-width: 100px; max-height: 60px; object-fit: contain; margin-bottom: 5px; }
          .lab-info { font-size: 11px; color: #475569; line-height: 1.4; }
          .lab-info strong { color: #1e293b; font-size: 13px; }
          .title-section h1 { color: #2563eb; font-size: 20px; font-weight: 700; margin: 0 0 5px 0; }
          .title-section h2 { color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 8px 0; }
          .report-info {
            background-color: #f0f9ff;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #bae6fd;
            font-size: 11px;
            text-align: right;
            display: inline-block;
          }
          .report-info p { margin: 2px 0; }
          .tabla-trabajos {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11px;
          }
          .tabla-trabajos th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 600;
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #e2e8f0;
          }
          .tabla-trabajos td {
            padding: 8px 6px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
          }
          .servicios-list { margin: 0; padding: 0; list-style: none; }
          .servicio-item {
            padding: 3px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .servicio-item:last-child { border-bottom: none; }
          .servicio-nombre { font-weight: 500; font-size: 10px; }
          .servicio-detalle { font-size: 9px; color: #64748b; }
          .nota-especial { font-size: 8px; color: #f59e0b; font-style: italic; }
          .estado-badge {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: 600;
            text-align: center;
            min-width: 60px;
          }
          .estado-pendiente { background-color: #fef3c7; color: #92400e; }
          .estado-produccion { background-color: #dbeafe; color: #1e40af; }
          .estado-terminado { background-color: #d1fae5; color: #065f46; }
          .estado-entregado { background-color: #e5e7eb; color: #374151; }
          .totales {
            margin-top: 15px;
            padding: 12px;
            background-color: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .total-final {
            font-weight: 700;
            font-size: 14px;
            border-top: 2px solid #2563eb;
            padding-top: 8px;
            margin-top: 8px;
            color: #2563eb;
          }
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
          .no-print { margin-top: 15px; text-align: center; }
          .btn-print {
            background-color: #2563eb;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            margin-right: 8px;
          }
          .btn-close {
            background-color: #64748b;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 5px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="left">
              ${
                configuracionLaboratorio?.logo
                  ? `<img src="${configuracionLaboratorio.logo}" class="logo" alt="Logo">`
                  : '<div style="font-size: 36px; color: #2563eb;">🦷</div>'
              }
              <div class="lab-info">
                <strong>${configuracionLaboratorio?.nombre_laboratorio || 'Laboratorio Dental'}</strong><br>
                ${configuracionLaboratorio?.rut || ''}<br>
                ${configuracionLaboratorio?.direccion || ''}<br>
                ${configuracionLaboratorio?.telefono || ''}<br>
                ${configuracionLaboratorio?.email || ''}
              </div>
            </div>
            <div class="right">
              <div class="title-section">
                <h1>INFORME DE PRESTACIONES DENTALES</h1>
                <h2>${clinicaSeleccionada ? `CLÍNICA: ${clinicaSeleccionada.nombre.toUpperCase()}` : 'TODAS LAS CLÍNICAS'}</h2>
              </div>
              <div class="report-info">
                <p><strong>Período:</strong> ${
                  filtros.periodo === 'mes'
                    ? `${obtenerNombreMes(filtros.mes)} ${filtros.año}`
                    : `${filtros.fechaInicio} a ${filtros.fechaFin}`
                }</p>
                <p><strong>Generado:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                <p><strong>Régimen:</strong> ${configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'IVA' : 'Honorarios'} (${configuracionLaboratorio?.porcentaje_impuesto}%)</p>
                <p><strong>Total Trabajos:</strong> ${estadisticas.totalTrabajos} | <strong>Prestaciones:</strong> ${estadisticas.totalPrestaciones}</p>
              </div>
            </div>
          </div>

          <table class="tabla-trabajos">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Servicios</th>
                <th>Estado</th>
                <th>Bruto</th>
                <th>${configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'IVA' : 'Retención'}</th>
                <th>${configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'Total con IVA' : 'Total Neto'}</th>
              </tr>
            </thead>
            <tbody>
              ${trabajosFiltrados.map(trabajo => {
                const clinica = clinicas.find(c => c.id === trabajo.clinica_id);
                const montos = calcularMontosConImpuesto(trabajo.precio_total);
                const estadoClass = `estado-badge estado-${trabajo.estado}`;

                const serviciosHTML = trabajo.servicios.map(s => `
                  <div class="servicio-item">
                    <div class="servicio-nombre">${s.nombre || 'Servicio'}</div>
                    <div class="servicio-detalle">
                      x${s.cantidad} ${s.pieza_dental ? `| Pieza: ${s.pieza_dental}` : ''}
                    </div>
                    ${s.nota_especial ? `<div class="nota-especial">📝 ${s.nota_especial}</div>` : ''}
                  </div>
                `).join('');

                return `
                  <tr>
                    <td><strong>${trabajo.paciente}</strong></td>
                    <td><div class="servicios-list">${serviciosHTML}</div></td>
                    <td><span class="${estadoClass}">${obtenerTextoEstado(trabajo.estado)}</span></td>
                    <td>$${trabajo.precio_total.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td>$${montos.impuesto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</td>
                    <td><strong style="color: #10b981;">$${montos.neto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="totales">
            <div class="total-row">
              <span>Total de Trabajos:</span>
              <span><strong>${estadisticas.totalTrabajos}</strong></span>
            </div>
            <div class="total-row">
              <span>Total de Prestaciones:</span>
              <span><strong>${estadisticas.totalPrestaciones}</strong></span>
            </div>
            <div class="total-row">
              <span>Total Bruto:</span>
              <span><strong>$${estadisticas.totalIngresos.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></span>
            </div>
            <div class="total-row">
              <span>${configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'IVA' : 'Retención'} (${configuracionLaboratorio?.porcentaje_impuesto}%):</span>
              <span><strong>$${estadisticas.impuesto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</strong></span>
            </div>
            <div class="total-row total-final">
              <span>${configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'TOTAL CON IVA' : 'TOTAL NETO A PAGAR'}:</span>
              <span>$${estadisticas.neto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div class="footer">
            Documento generado automáticamente por DentalFlow Manager - ${new Date().toLocaleDateString()}
          </div>

          <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir Reporte</button>
            <button class="btn-close" onclick="window.close()">❌ Cerrar</button>
          </div>
        </div>
      </body>
      </html>
    `;

    ventana.document.write(htmlContent);
    ventana.document.close();
  };

  const exportarExcel = () => {
    const headers = ['Paciente', 'Clínica', 'Servicios', 'Estado', 'Precio Bruto', 'Precio Neto', 'Impuesto', 'Fecha Recibido', 'Prestaciones Totales'];

    const filas: string[] = [];

    trabajosFiltrados.forEach(trabajo => {
      const clinica = clinicas.find(c => c.id === trabajo.clinica_id)?.nombre || 'N/A';
      const montos = calcularMontosConImpuesto(trabajo.precio_total);

      filas.push([
        `"${trabajo.paciente}"`,
        `"${clinica}"`,
        `"Resumen: ${trabajo.servicios.length} servicios"`,
        trabajo.estado,
        trabajo.precio_total,
        montos.neto.toFixed(0),
        montos.impuesto.toFixed(0),
        trabajo.fecha_recibido,
        trabajo.servicios.reduce((sum, s) => sum + s.cantidad, 0)
      ].join(','));

      trabajo.servicios.forEach(servicio => {
        filas.push([
          `"${trabajo.paciente}"`,
          `"${clinica}"`,
          `"${servicio.nombre || 'Servicio'} (x${servicio.cantidad})${servicio.pieza_dental ? ` - ${servicio.pieza_dental}` : ''}${servicio.nota_especial ? ` - Nota: ${servicio.nota_especial}` : ''}"`,
          trabajo.estado,
          servicio.precio,
          (servicio.precio - (servicio.precio * (configuracionLaboratorio?.porcentaje_impuesto || 0) / 100)).toFixed(0),
          (servicio.precio * (configuracionLaboratorio?.porcentaje_impuesto || 0) / 100).toFixed(0),
          trabajo.fecha_recibido,
          servicio.cantidad
        ].join(','));
      });

      filas.push('');
    });

    const csvContent = [
      headers.join(','),
      ...filas
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);

    const nombreArchivo = `prestaciones-${filtros.clinicaId !== 'todos' ? clinicas.find(c => c.id === filtros.clinicaId)?.nombre : 'todas-clinicas'}-${filtros.mes}-${filtros.año}.csv`;

    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('📈 Reporte exportado exitosamente en formato Excel/CSV');
  };

  const obtenerTextoEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'produccion': return 'En Producción';
      case 'terminado': return 'Terminado';
      case 'entregado': return 'Entregado';
      default: return estado;
    }
  };

  const obtenerEstiloEstado = (estado: string) => {
    const baseStyle: React.CSSProperties = {
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: '500'
    };

    switch (estado) {
      case 'pendiente': return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
      case 'produccion': return { ...baseStyle, backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'terminado': return { ...baseStyle, backgroundColor: '#d1fae5', color: '#065f46' };
      case 'entregado': return { ...baseStyle, backgroundColor: '#e5e7eb', color: '#374151' };
      default: return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
    }
  };

  const styles: Styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: 'calc(100vh - 64px)',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      margin: 0
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      marginRight: '0.5rem',
      fontSize: '0.875rem'
    },
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      marginRight: '0.5rem',
      fontSize: '0.875rem'
    },
    buttonSuccess: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.875rem'
    },
    buttonWarning: {
      backgroundColor: '#f59e0b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.875rem'
    },
    buttonDanger: {
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.875rem'
    },
    filtrosContainer: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    },
    formGroup: {
      marginBottom: '1rem'
    },
    label: {
      display: 'block',
      color: '#1e293b',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    select: {
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      backgroundColor: 'white'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    },
    resultadosContainer: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    },
    reporteHeader: {
      textAlign: 'center',
      marginBottom: '2rem',
      padding: '1rem',
      backgroundColor: '#f0f9ff',
      borderRadius: '0.5rem',
      border: '1px solid #bae6fd'
    },
    tabla: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '1rem',
      fontSize: '0.875rem'
    },
    th: {
      backgroundColor: '#f1f5f9',
      padding: '0.75rem',
      textAlign: 'left',
      border: '1px solid #e2e8f0',
      fontWeight: '600',
      color: '#475569',
      fontSize: '0.875rem'
    },
    td: {
      padding: '0.75rem',
      border: '1px solid #e2e8f0',
      color: '#475569',
      fontSize: '0.875rem'
    },
    trPar: {
      backgroundColor: '#f8fafc'
    },
    trNormal: {
      backgroundColor: 'white'
    },
    totalesContainer: {
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: '#f8fafc',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0'
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      margin: '0.5rem 0',
      fontSize: '0.875rem'
    },
    totalFinal: {
      fontWeight: 'bold',
      fontSize: '1rem',
      borderTop: '2px solid #e2e8f0',
      paddingTop: '1rem',
      marginTop: '1rem',
      color: '#1e293b'
    },
    sectionTitle: {
      color: '#1e293b',
      fontSize: '1.125rem',
      fontWeight: '600',
      margin: '0 0 1rem 0',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #e2e8f0'
    },
    loadingText: {
      textAlign: 'center',
      color: '#64748b',
      padding: '2rem'
    },
    acciones: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap'
    },
    actionButton: {
      padding: '0.25rem 0.5rem',
      border: 'none',
      borderRadius: '0.25rem',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    exportButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1rem',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    serviciosContainer: {
      maxHeight: '150px',
      overflowY: 'auto',
      padding: '0.5rem',
      backgroundColor: '#f8fafc',
      borderRadius: '0.375rem',
      border: '1px solid #e2e8f0'
    },
    servicioItem: {
      marginBottom: '0.5rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px dashed #e2e8f0'
    },
    servicioItemLast: {
      marginBottom: '0',
      paddingBottom: '0',
      borderBottom: 'none'
    },
    servicioNombre: {
      fontWeight: '500',
      fontSize: '0.75rem',
      marginBottom: '0.25rem'
    },
    servicioDetalles: {
      fontSize: '0.7rem',
      color: '#64748b',
      display: 'flex',
      justifyContent: 'space-between'
    },
    notaEspecial: {
      fontSize: '0.7rem',
      color: '#f59e0b',
      fontStyle: 'italic',
      marginTop: '0.25rem'
    }
  };

  const getRowStyle = (index: number) => {
    return index % 2 === 0 ? styles.trPar : styles.trNormal;
  };

  const meses = [
    { valor: '1', nombre: 'Enero' }, { valor: '2', nombre: 'Febrero' },
    { valor: '3', nombre: 'Marzo' }, { valor: '4', nombre: 'Abril' },
    { valor: '5', nombre: 'Mayo' }, { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' }, { valor: '8', nombre: 'Agosto' },
    { valor: '9', nombre: 'Septiembre' }, { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' }, { valor: '12', nombre: 'Diciembre' }
  ];

  const años = Array.from({ length: 5 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  if (cargando) {
    return (
      <>
        <Header
          user={usuario || undefined}
          onLogout={handleLogout}
          cerrandoSesion={cerrandoSesion}
          showBackButton={true}
          onBack={onBack}
          title="Reportes de Prestaciones"
          showTitle={true}
        />
        <div style={styles.container}>
          <div style={styles.loadingText}>Cargando datos...</div>
        </div>
      </>
    );
  }

  const clinicaSeleccionada = filtros.clinicaId !== 'todos'
    ? clinicas.find(c => c.id === filtros.clinicaId)
    : null;

  return (
    <>
      <Header
        user={usuario || undefined}
        onLogout={handleLogout}
        cerrandoSesion={cerrandoSesion}
        showBackButton={true}
        onBack={onBack}
        title="Reportes de Prestaciones"
        showTitle={true}
      />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Reportes de Prestaciones</h1>
        </div>

        <div style={styles.filtrosContainer}>
          <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', fontSize: '1.125rem' }}>Configurar Reporte</h3>

          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Clínica</label>
              <select
                style={styles.select}
                name="clinicaId"
                value={filtros.clinicaId}
                onChange={handleInputChange}
              >
                <option value="todos">Todas las Clínicas</option>
                {clinicas.map(clinica => (
                  <option key={clinica.id} value={clinica.id}>{clinica.nombre}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Período</label>
              <select
                style={styles.select}
                name="periodo"
                value={filtros.periodo}
                onChange={handleInputChange}
              >
                <option value="mes">Mes</option>
                <option value="año">Año</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {filtros.periodo === 'mes' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mes</label>
                  <select
                    style={styles.select}
                    name="mes"
                    value={filtros.mes}
                    onChange={handleInputChange}
                  >
                    {meses.map(mes => (
                      <option key={mes.valor} value={mes.valor}>
                        {mes.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Año</label>
                  <select
                    style={styles.select}
                    name="año"
                    value={filtros.año}
                    onChange={handleInputChange}
                  >
                    {años.map(año => (
                      <option key={año} value={año}>{año}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {filtros.periodo === 'año' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Año</label>
                <select
                  style={styles.select}
                  name="año"
                  value={filtros.año}
                  onChange={handleInputChange}
                >
                  {años.map(año => (
                    <option key={año} value={año}>{año}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filtros.periodo === 'personalizado' && (
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Fecha Inicio</label>
                <input
                  type="date"
                  style={styles.select}
                  name="fechaInicio"
                  value={filtros.fechaInicio}
                  onChange={handleInputChange}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Fecha Fin</label>
                <input
                  type="date"
                  style={styles.select}
                  name="fechaFin"
                  value={filtros.fechaFin}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          <div style={styles.exportButtons}>
            <button style={styles.buttonWarning} onClick={exportarExcel}>
              📈 Exportar a Excel
            </button>
            <button style={styles.buttonSuccess} onClick={exportarPDF}>
              📄 Exportar a PDF
            </button>
            {/* Acción masiva con dropdown */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={estadoMasivo}
                onChange={(e) => setEstadoMasivo(e.target.value as Trabajo['estado'])}
                style={{ ...styles.select, width: 'auto', padding: '0.5rem' }}
                disabled={bulkUpdating || trabajosFiltrados.length === 0}
              >
                <option value="pendiente">⏳ Pendiente</option>
                <option value="produccion">🔧 En Producción</option>
                <option value="terminado">✅ Terminado</option>
                <option value="entregado">📦 Entregado</option>
              </select>
              <button
                style={{ ...styles.button, backgroundColor: '#64748b' }} // gris
                onClick={actualizarTodosEstado}
                disabled={bulkUpdating || trabajosFiltrados.length === 0}
              >
                {bulkUpdating ? 'Actualizando...' : 'Aplicar a todos'}
              </button>
            </div>
          </div>
        </div>

        {trabajosFiltrados.length > 0 ? (
          <div style={styles.resultadosContainer}>
            <div style={styles.reporteHeader}>
              <h2 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>
                PRESTACIONES DE {clinicaSeleccionada ? `LA CLÍNICA ${clinicaSeleccionada.nombre.toUpperCase()}` : 'TODAS LAS CLÍNICAS'}
              </h2>
              <p style={{ margin: '0.25rem 0', color: '#64748b' }}>
                Período: {filtros.periodo === 'mes' ? `${obtenerNombreMes(filtros.mes)} ${filtros.año}` : `${filtros.fechaInicio} a ${filtros.fechaFin}`}
              </p>
              <p style={{ margin: '0.25rem 0', color: '#64748b' }}>
                Generado: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </p>
              <p style={{ margin: '0.25rem 0', color: '#64748b', fontWeight: 'bold' }}>
                Total Trabajos: {estadisticas.totalTrabajos} | Total Prestaciones: {estadisticas.totalPrestaciones}
              </p>
            </div>

            <h3 style={styles.sectionTitle}>Detalles de Trabajos</h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={styles.tabla}>
                <thead>
                  <tr>
                    <th style={styles.th}>Paciente</th>
                    <th style={{ ...styles.th, width: '30%' }}>Prestaciones</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Precio Bruto</th>
                    <th style={styles.th}>{configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'IVA' : 'Retención'} ({configuracionLaboratorio?.porcentaje_impuesto}%)</th>
                    <th style={styles.th}>{configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'Total con IVA' : 'Total Neto'}</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {trabajosFiltrados.map((trabajo, index) => {
                    const clinica = clinicas.find(c => c.id === trabajo.clinica_id);
                    const montos = calcularMontosConImpuesto(trabajo.precio_total);

                    return (
                      <tr key={trabajo.id} style={getRowStyle(index)}>
                        <td style={styles.td}>{trabajo.paciente}</td>
                        <td style={styles.td}>
                          <div style={styles.serviciosContainer}>
                            {trabajo.servicios.map((servicio, idx) => (
                              <div key={idx} style={idx === trabajo.servicios.length - 1 ? { ...styles.servicioItem, ...styles.servicioItemLast } : styles.servicioItem}>
                                <div style={styles.servicioNombre}>
                                  {servicio.nombre || 'Servicio'}
                                </div>
                                <div style={styles.servicioDetalles}>
                                  <span>x{servicio.cantidad} {servicio.pieza_dental && `| Pieza: ${servicio.pieza_dental}`}</span>
                                </div>
                                {servicio.nota_especial && (
                                  <div style={styles.notaEspecial}>
                                    📝 {servicio.nota_especial}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={obtenerEstiloEstado(trabajo.estado)}>
                            {obtenerTextoEstado(trabajo.estado)}
                          </span>
                        </td>
                        <td style={styles.td}>${trabajo.precio_total.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        <td style={styles.td}>${montos.impuesto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</td>
                        <td style={{ ...styles.td, color: '#10b981', fontWeight: 'bold' }}>
                          ${montos.neto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.acciones}>
                            {trabajo.estado === 'pendiente' && (
                              <button
                                style={{ ...styles.actionButton, backgroundColor: '#10b981', color: 'white' }}
                                onClick={() => actualizarEstadoTrabajo(trabajo.id, 'produccion')}
                                disabled={actualizandoEstado === trabajo.id}
                              >
                                {actualizandoEstado === trabajo.id ? '...' : '▶️'}
                              </button>
                            )}
                            {trabajo.estado === 'produccion' && (
                              <button
                                style={{ ...styles.actionButton, backgroundColor: '#f59e0b', color: 'white' }}
                                onClick={() => actualizarEstadoTrabajo(trabajo.id, 'terminado')}
                                disabled={actualizandoEstado === trabajo.id}
                              >
                                {actualizandoEstado === trabajo.id ? '...' : '✅'}
                              </button>
                            )}
                            {trabajo.estado === 'terminado' && (
                              <button
                                style={{ ...styles.actionButton, backgroundColor: '#3b82f6', color: 'white' }}
                                onClick={() => actualizarEstadoTrabajo(trabajo.id, 'entregado')}
                                disabled={actualizandoEstado === trabajo.id}
                              >
                                {actualizandoEstado === trabajo.id ? '...' : '📦'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={styles.totalesContainer}>
              <h3 style={styles.sectionTitle}>Resumen General</h3>
              <div style={styles.totalRow}>
                <span>Total de Trabajos:</span>
                <span>{estadisticas.totalTrabajos}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Total de Prestaciones:</span>
                <span>{estadisticas.totalPrestaciones}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Total Bruto:</span>
                <span>${estadisticas.totalIngresos.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              <div style={styles.totalRow}>
                <span>{configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'IVA' : 'Retención'} ({configuracionLaboratorio?.porcentaje_impuesto}%):</span>
                <span>${estadisticas.impuesto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span>
              </div>
              <div style={{ ...styles.totalRow, ...styles.totalFinal }}>
                <span>{configuracionLaboratorio?.tipo_impuesto === 'iva' ? 'TOTAL CON IVA:' : 'TOTAL NETO A PAGAR:'}</span>
                <span style={{ color: '#10b981' }}>${estadisticas.neto.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.resultadosContainer}>
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No hay trabajos para mostrar</h3>
              <p>No se encontraron trabajos con los filtros seleccionados.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Reportes;