import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { QRCodeSVG as QRCode } from 'qrcode.react';

interface GestionTrabajosProps {
  onBack?: () => void;
  user?: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
    plan?: string;
    fecha_expiracion?: string | null;
    suscripcion_activa?: boolean;
    laboratorio?: string;
    telefono?: string;
  };
  onLogout?: () => void;
}

interface Trabajo {
  id: string;
  paciente: string;
  clinica_id: string;
  dentista_id: string;
  laboratorista_id: string;
  servicios: Array<{
    servicio_id: string;
    cantidad: number;
    precio: number;
    nombre?: string;
    pieza_dental?: string;
    nota_especial?: string;
  }>;
  estado: 'pendiente' | 'produccion' | 'terminado' | 'entregado';
  precio_total: number;
  fecha_creacion: string;
  fecha_entrega_estimada: string;
  notas: string;
  modo: 'clinica' | 'individual';
  usuario_id: string;
}

interface Clinica {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

interface Dentista {
  id: string;
  nombre: string;
  clinica_id: string;
  especialidad: string;
}

interface Servicio {
  id: string;
  nombre: string;
  precio_base: number;
  categoria: string;
  activo: boolean;
}

interface Laboratorista {
  id: string;
  nombre: string;
  especialidad: string;
  activo: boolean;
}

interface Filtros {
  clinicaId: string;
  estado: string;
  mes: string;
  año: string;
  paciente: string;
  laboratoristaId: string;
  dentistaId: string;
}

interface TrabajoAgrupado extends Omit<Trabajo, 'id' | 'servicios' | 'precio_total'> {
  ids: string[];
  servicios: Array<{
    servicio_id: string;
    cantidad: number;
    precio: number;
    nombre?: string;
    pieza_dental?: string;
    nota_especial?: string;
  }>;
  precio_total: number;
}

interface OrdenTrabajo {
  id: string;
  trabajo_id: string;
  usuario_id: string;
  protesista_nombre: string;
  doctor_nombre: string;
  direccion: string;
  cp: string;
  telefono: string;
  analisis_impresion: string;
  analisis_modelo: string;
  aporta_registros: boolean;
  cuales_registros: string;
  articulado: string;
  metalica: boolean;
  estetica: boolean;
  especificaciones: string;
  aleacion: string;
  material_estetico: string;
  tipo_pontico: string;
  color: string;
  protesis_removible: boolean;
  protesis_total: boolean;
  protesis_parcial: boolean;
  removable: boolean;
  diseno_esqueleto: string;
  ortodoncia_superior: boolean;
  ortodoncia_inferior: boolean;
  aparato_realizar: string;
  tipo_yeso: string;
  firma: string;
  fecha_entrega: string;
  costo_final: number | null;
  piezas: Record<number, {
    superficies: Record<string, 'incrustacion' | 'corona' | 'puente' | null>;
  }>;
  created_at: string;
}

const GestionTrabajos: React.FC<GestionTrabajosProps> = ({ onBack, user, onLogout }) => {
  const navigate = useNavigate();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [laboratoristas, setLaboratoristas] = useState<Laboratorista[]>([]);
  const [modalNotasAbierto, setModalNotasAbierto] = useState(false);
  const [modalQRAbierto, setModalQRAbierto] = useState(false);
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [trabajoEditando, setTrabajoEditando] = useState<TrabajoAgrupado | null>(null);
  const [trabajoConNotas, setTrabajoConNotas] = useState<Trabajo | null>(null);
  const [trabajoQR, setTrabajoQR] = useState<Trabajo | null>(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    clinicaId: 'todas',
    estado: 'todos',
    mes: 'todos',
    año: 'todos',
    paciente: '',
    laboratoristaId: 'todos',
    dentistaId: 'todos'
  });

  const [serviciosEditando, setServiciosEditando] = useState<TrabajoAgrupado['servicios']>([]);
  const [busquedaServicio, setBusquedaServicio] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [nuevoServicioSeleccionado, setNuevoServicioSeleccionado] = useState<Servicio | null>(null);
  const [nuevaCantidad, setNuevaCantidad] = useState(1);
  const [nuevaPieza, setNuevaPieza] = useState('');
  const [nuevaNotaEspecial, setNuevaNotaEspecial] = useState('');

  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const añosDisponibles = () => {
    const añoActual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (añoActual - i).toString());
  };

  const mesesDisponibles = [
    { valor: 'todos', nombre: 'Todos los Meses' },
    { valor: '01', nombre: 'Enero' },
    { valor: '02', nombre: 'Febrero' },
    { valor: '03', nombre: 'Marzo' },
    { valor: '04', nombre: 'Abril' },
    { valor: '05', nombre: 'Mayo' },
    { valor: '06', nombre: 'Junio' },
    { valor: '07', nombre: 'Julio' },
    { valor: '08', nombre: 'Agosto' },
    { valor: '09', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' }
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalNotasAbierto(false);
        setModalQRAbierto(false);
        setModalEdicionAbierto(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

      const [trabajosRes, clinicasRes, dentistasRes, serviciosRes, laboratoristasRes] =
        await Promise.all([
          supabase.from('trabajos').select('*').eq('usuario_id', user.id).order('fecha_creacion', { ascending: false }),
          supabase.from('clinicas').select('*').eq('usuario_id', user.id),
          supabase.from('dentistas').select('*').eq('usuario_id', user.id),
          supabase.from('servicios').select('*').eq('usuario_id', user.id),
          supabase.from('laboratoristas').select('*').eq('usuario_id', user.id)
        ]);

      if (trabajosRes.data) setTrabajos(trabajosRes.data);
      if (clinicasRes.data) setClinicas(clinicasRes.data);
      if (dentistasRes.data) setDentistas(dentistasRes.data);
      if (serviciosRes.data) setServicios(serviciosRes.data);
      if (laboratoristasRes.data) setLaboratoristas(laboratoristasRes.data);

    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos. Por favor recarga la página.');
    } finally {
      setCargando(false);
    }
  };

  const handleVolver = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    setCerrandoSesion(true);
    if (onLogout) {
      await onLogout();
    }
    setCerrandoSesion(false);
  };

  const trabajosFiltrados = trabajos.filter(trabajo => {
    const filtroClinica = filtros.clinicaId === 'todas' || trabajo.clinica_id === filtros.clinicaId;
    const filtroEstado = filtros.estado === 'todos' || trabajo.estado === filtros.estado;
    const filtroPaciente = !filtros.paciente || trabajo.paciente.toLowerCase().includes(filtros.paciente.toLowerCase());
    const filtroLaboratorista = filtros.laboratoristaId === 'todos' || trabajo.laboratorista_id === filtros.laboratoristaId;
    const filtroDentista = filtros.dentistaId === 'todos' || trabajo.dentista_id === filtros.dentistaId;

    let filtroFecha = true;
    if (filtros.año !== 'todos' || filtros.mes !== 'todos') {
      const fechaTrabajo = new Date(trabajo.fecha_creacion);
      const añoTrabajo = fechaTrabajo.getFullYear().toString();
      const mesTrabajo = (fechaTrabajo.getMonth() + 1).toString().padStart(2, '0');

      if (filtros.año !== 'todos' && añoTrabajo !== filtros.año) filtroFecha = false;
      if (filtros.mes !== 'todos' && mesTrabajo !== filtros.mes) filtroFecha = false;
    }

    return filtroClinica && filtroEstado && filtroPaciente && filtroFecha && filtroLaboratorista && filtroDentista;
  });

  const agruparTrabajosDuplicados = (trabajos: Trabajo[]): TrabajoAgrupado[] => {
    const grupos: Record<string, TrabajoAgrupado> = {};

    trabajos.forEach(t => {
      const serviciosNorm = [...t.servicios]
        .map(s => ({
          servicio_id: s.servicio_id,
          pieza_dental: s.pieza_dental || '',
          nota_especial: s.nota_especial || ''
        }))
        .sort((a, b) => (a.servicio_id + a.pieza_dental).localeCompare(b.servicio_id + b.pieza_dental));

      const key = `${t.paciente}|${t.clinica_id}|${new Date(t.fecha_creacion).toISOString().split('T')[0]}|${t.estado}|${JSON.stringify(serviciosNorm)}`;

      if (!grupos[key]) {
        const { id, ...rest } = t;
        grupos[key] = {
          ...rest,
          ids: [t.id],
          servicios: t.servicios.map(s => ({ ...s })),
          precio_total: t.precio_total
        };
      } else {
        const grupo = grupos[key];
        grupo.ids.push(t.id);
        grupo.precio_total += t.precio_total;
        t.servicios.forEach(s => {
          const existente = grupo.servicios.find(
            g => g.servicio_id === s.servicio_id &&
              (g.pieza_dental || '') === (s.pieza_dental || '') &&
              (g.nota_especial || '') === (s.nota_especial || '')
          );
          if (existente) {
            existente.cantidad += s.cantidad;
            existente.precio += s.precio;
          } else {
            grupo.servicios.push({ ...s });
          }
        });
      }
    });

    return Object.values(grupos);
  };

  const trabajosAgrupados = agruparTrabajosDuplicados(trabajosFiltrados);

  const trabajosPorClinicaYPaciente = trabajosAgrupados.reduce((acc, trabajo) => {
    const clinicaId = trabajo.clinica_id;
    const pacienteNombre = trabajo.paciente;

    if (!acc[clinicaId]) acc[clinicaId] = {};
    if (!acc[clinicaId][pacienteNombre]) {
      acc[clinicaId][pacienteNombre] = {
        paciente: pacienteNombre,
        trabajos: []
      };
    }
    acc[clinicaId][pacienteNombre].trabajos.push(trabajo);
    return acc;
  }, {} as Record<string, Record<string, { paciente: string, trabajos: TrabajoAgrupado[] }>>);

  const estadisticas = {
    total: trabajosAgrupados.length,
    pendientes: trabajosAgrupados.filter(t => t.estado === 'pendiente').length,
    produccion: trabajosAgrupados.filter(t => t.estado === 'produccion').length,
    terminados: trabajosAgrupados.filter(t => t.estado === 'terminado').length,
    entregados: trabajosAgrupados.filter(t => t.estado === 'entregado').length,
    ingresosTotales: trabajosAgrupados.reduce((sum, t) => sum + t.precio_total, 0)
  };

  const cambiarEstadoTrabajo = async (trabajoAgrupado: TrabajoAgrupado, nuevoEstado: Trabajo['estado']) => {
    if (!window.confirm(`¿Cambiar estado del trabajo de "${trabajoAgrupado.paciente}" a ${nuevoEstado}?`)) return;

    try {
      setCargando(true);
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: nuevoEstado })
        .in('id', trabajoAgrupado.ids);

      if (error) throw error;

      setTrabajos(prev =>
        prev.map(t => trabajoAgrupado.ids.includes(t.id) ? { ...t, estado: nuevoEstado } : t)
      );
      alert(`✅ Estado cambiado a ${nuevoEstado}`);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('❌ Error al cambiar el estado');
    } finally {
      setCargando(false);
    }
  };

  const eliminarTrabajo = async (trabajoAgrupado: TrabajoAgrupado) => {
    if (!window.confirm(`¿Eliminar trabajo de "${trabajoAgrupado.paciente}"? Esta acción no se puede deshacer.`)) return;

    try {
      setCargando(true);
      const { error } = await supabase
        .from('trabajos')
        .delete()
        .in('id', trabajoAgrupado.ids);

      if (error) throw error;

      setTrabajos(prev => prev.filter(t => !trabajoAgrupado.ids.includes(t.id)));
      alert('✅ Trabajo eliminado');
    } catch (error) {
      console.error('Error eliminando trabajo:', error);
      alert('❌ Error al eliminar');
    } finally {
      setCargando(false);
    }
  };

  const finalizarTodosTrabajosClinica = async (clinicaId: string) => {
    const trabajosPendientes = trabajosAgrupados.filter(t =>
      t.clinica_id === clinicaId &&
      (t.estado === 'pendiente' || t.estado === 'produccion')
    );

    if (trabajosPendientes.length === 0) {
      alert('No hay trabajos pendientes en esta clínica');
      return;
    }

    if (!window.confirm(`¿Marcar como terminados los ${trabajosPendientes.length} trabajos pendientes?`)) return;

    try {
      setCargando(true);
      const ids = trabajosPendientes.flatMap(t => t.ids);
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: 'terminado' })
        .in('id', ids);

      if (error) throw error;

      setTrabajos(prev =>
        prev.map(t => ids.includes(t.id) ? { ...t, estado: 'terminado' } : t)
      );
      alert('✅ Todos los trabajos marcados como terminados');
    } catch (error) {
      console.error('Error finalizando trabajos:', error);
      alert('❌ Error al finalizar trabajos');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNotas = (trabajo: TrabajoAgrupado) => {
    const trabajoIndividual = trabajos.find(t => t.id === trabajo.ids[0]);
    if (trabajoIndividual) {
      setTrabajoConNotas(trabajoIndividual);
      setNuevaNota(trabajoIndividual.notas || '');
      setModalNotasAbierto(true);
    }
  };

  const abrirModalQR = (trabajo: TrabajoAgrupado) => {
    const trabajoIndividual = trabajos.find(t => t.id === trabajo.ids[0]);
    if (trabajoIndividual) {
      setTrabajoQR(trabajoIndividual);
      setModalQRAbierto(true);
    }
  };

  const abrirModalEdicion = (trabajo: TrabajoAgrupado) => {
    setTrabajoEditando(trabajo);
    setServiciosEditando(trabajo.servicios);
    setModalEdicionAbierto(true);
  };

  const descargarQR = () => {
    if (!trabajoQR) return;

    try {
      const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
      if (!canvas) {
        console.error('No se encontró el canvas del QR');
        return;
      }

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-entrega-${trabajoQR.id}.png`;
      link.href = url;
      link.click();

      alert('✅ QR descargado correctamente');
    } catch (error) {
      console.error('Error descargando QR:', error);
      alert('❌ Error al descargar el QR');
    }
  };

  const guardarNota = async () => {
    if (!trabajoConNotas) return;

    try {
      setCargando(true);
      const { error } = await supabase
        .from('trabajos')
        .update({ notas: nuevaNota })
        .eq('id', trabajoConNotas.id);

      if (error) throw error;

      setTrabajos(prev =>
        prev.map(t => t.id === trabajoConNotas.id ? { ...t, notas: nuevaNota } : t)
      );
      setModalNotasAbierto(false);
      alert('✅ Notas guardadas correctamente');
    } catch (error) {
      console.error('Error guardando nota:', error);
      alert('❌ Error al guardar nota');
    } finally {
      setCargando(false);
    }
  };

  const eliminarServicioEditando = (index: number) => {
    setServiciosEditando(prev => prev.filter((_, i) => i !== index));
  };

  const agregarServicioEditando = () => {
    if (!nuevoServicioSeleccionado) return;
    const servicio = nuevoServicioSeleccionado;
    const nuevo = {
      servicio_id: servicio.id,
      cantidad: nuevaCantidad,
      precio: servicio.precio_base * nuevaCantidad,
      nombre: servicio.nombre,
      pieza_dental: nuevaPieza || undefined,
      nota_especial: nuevaNotaEspecial || undefined
    };
    setServiciosEditando(prev => [...prev, nuevo]);
    setNuevoServicioSeleccionado(null);
    setNuevaCantidad(1);
    setNuevaPieza('');
    setNuevaNotaEspecial('');
  };

  const guardarEdicion = async () => {
    if (!trabajoEditando) return;
    const nuevoTotal = serviciosEditando.reduce((sum, s) => sum + s.precio, 0);
    try {
      setCargando(true);
      const primerId = trabajoEditando.ids[0];
      const otrosIds = trabajoEditando.ids.slice(1);

      const { error: errorUpdate } = await supabase
        .from('trabajos')
        .update({
          servicios: serviciosEditando,
          precio_total: nuevoTotal
        })
        .eq('id', primerId);
      if (errorUpdate) throw errorUpdate;

      if (otrosIds.length > 0) {
        const { error: errorDelete } = await supabase
          .from('trabajos')
          .delete()
          .in('id', otrosIds);
        if (errorDelete) throw errorDelete;
      }

      setTrabajos(prev => {
        const nuevos = prev.filter(t => !otrosIds.includes(t.id));
        return nuevos.map(t => t.id === primerId ? { ...t, servicios: serviciosEditando, precio_total: nuevoTotal } : t);
      });

      setModalEdicionAbierto(false);
      alert('✅ Trabajo actualizado correctamente');
    } catch (error) {
      console.error('Error actualizando trabajo:', error);
      alert('❌ Error al actualizar el trabajo');
    } finally {
      setCargando(false);
    }
  };

  // ========== FUNCIÓN DE IMPRESIÓN MEJORADA (ESTILO LABORATORIO) ==========
  const generarHTMLImpresion = (trabajo: TrabajoAgrupado, orden?: OrdenTrabajo, config?: any) => {
    const trabajoIndividual = trabajos.find(t => t.id === trabajo.ids[0]);
    const clinica = clinicas.find(c => c.id === trabajo.clinica_id);
    const dentista = dentistas.find(d => d.id === trabajo.dentista_id);
    const laboratorista = laboratoristas.find(l => l.id === trabajo.laboratorista_id);

    // Tabla de servicios (siempre visible)
    const serviciosRows = trabajo.servicios?.map((servicio, index) => {
      const servicioInfo = servicios.find(s => s.id === servicio.servicio_id);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${servicioInfo?.nombre || servicio.nombre || 'Servicio'}</td>
          <td>${servicio.cantidad}</td>
          <td>${servicio.pieza_dental || '-'}</td>
          <td class="right">$${(servicio.precio / servicio.cantidad).toLocaleString()}</td>
          <td class="right">$${servicio.precio.toLocaleString()}</td>
          <td>${servicio.nota_especial || '-'}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" class="text-center">No hay servicios</td></tr>';

    // Secciones de la orden (si existe)
    let seccionesHTML = '';
    if (orden) {
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
          <p><span class="label">Costo final:</span> $${orden.costo_final?.toLocaleString() || trabajo.precio_total.toLocaleString()}</p>
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

      // Ensamblar todas las secciones en un grid de 2 columnas
      seccionesHTML = `
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
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${orden ? 'Orden de Trabajo' : 'Hoja de Trabajo'} - ${trabajo.paciente}</title>
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
          }
          th {
            background-color: #eee;
            font-weight: bold;
          }
          .right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .total {
            text-align: right;
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
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
            <div class="info-item"><span class="label">Paciente:</span> ${trabajo.paciente}</div>
            <div class="info-item"><span class="label">Clínica:</span> ${clinica?.nombre || '-'}</div>
            <div class="info-item"><span class="label">Dentista:</span> ${dentista?.nombre || '-'}</div>
          </div>
          <div>
            <div class="info-item"><span class="label">Laboratorista:</span> ${laboratorista?.nombre || 'No asignado'}</div>
            <div class="info-item"><span class="label">Fecha creación:</span> ${new Date(trabajo.fecha_creacion).toLocaleDateString()}</div>
            <div class="info-item"><span class="label">Entrega estimada:</span> ${trabajo.fecha_entrega_estimada ? new Date(trabajo.fecha_entrega_estimada).toLocaleDateString() : '-'}</div>
            <div class="info-item"><span class="label">Estado:</span> ${trabajo.estado}</div>
          </div>
        </div>

        <h3 style="margin: 5px 0; font-size: 14px; font-weight: bold;">PRESTACIONES</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Servicio</th>
              <th>Cant.</th>
              <th>Pieza</th>
              <th>P. Unit.</th>
              <th>Subtotal</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            ${serviciosRows}
          </tbody>
        </table>

        <div class="total">
          TOTAL: $${trabajo.precio_total.toLocaleString()}
        </div>

        ${seccionesHTML}

        ${trabajo.notas ? `
          <div style="margin-top: 10px;">
            <h4 style="margin: 5px 0; font-size: 13px; font-weight: bold;">Notas</h4>
            <p>${trabajo.notas}</p>
          </div>
        ` : ''}

        <div class="qr-code">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${trabajo.ids[0]}" alt="QR" />
          <p style="font-size: 9px;">ID: ${trabajo.ids[0].slice(0, 8)}</p>
        </div>

        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleDateString()} - ID Trabajo: ${trabajo.ids[0]}</p>
          <div class="no-print">
            <button onclick="window.print()">🖨️ Imprimir</button>
            <button onclick="window.close()">❌ Cerrar</button>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const imprimirTrabajo = async (trabajo: TrabajoAgrupado) => {
    try {
      setCargando(true);
      const { data: orden } = await supabase
        .from('ordenes_trabajo')
        .select('*')
        .eq('trabajo_id', trabajo.ids[0])
        .maybeSingle();

      const { data: config } = await supabase
        .from('configuracion_laboratorio')
        .select('*')
        .eq('usuario_id', user?.id || '')
        .maybeSingle();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = generarHTMLImpresion(trabajo, orden || undefined, config);
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error al imprimir:', error);
      alert('Error al generar la vista de impresión');
    } finally {
      setCargando(false);
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pendiente': return '⏳ Pendiente';
      case 'produccion': return '🔧 En Producción';
      case 'terminado': return '✅ Terminado';
      case 'entregado': return '📦 Entregado';
      default: return estado;
    }
  };

  const getEstadoStyle = (estado: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '0.375rem 0.75rem',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      display: 'inline-block'
    };

    switch (estado) {
      case 'pendiente':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
      case 'produccion':
        return { ...baseStyle, backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'terminado':
        return { ...baseStyle, backgroundColor: '#d1fae5', color: '#065f46' };
      case 'entregado':
        return { ...baseStyle, backgroundColor: '#e5e7eb', color: '#374151' };
      default:
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
    }
  };

  const copiarID = (id: string, tipo: string) => {
    navigator.clipboard.writeText(id);
    alert(`✅ ID de ${tipo} copiado al portapapeles`);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: "'Inter', sans-serif",
    } as React.CSSProperties,
    mainContent: {
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
    } as React.CSSProperties,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2.5rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid #e2e8f0'
    } as React.CSSProperties,
    title: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.5rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    } as React.CSSProperties,
    subtitle: {
      color: '#64748b',
      fontSize: '1rem'
    } as React.CSSProperties,
    button: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    } as React.CSSProperties,
    buttonSecondary: {
      backgroundColor: 'white',
      color: '#3b82f6',
      padding: '0.75rem 1.5rem',
      border: '2px solid #3b82f6',
      borderRadius: '0.5rem',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s'
    } as React.CSSProperties,
    buttonSmall: {
      backgroundColor: '#f8fafc',
      color: '#64748b',
      padding: '0.5rem 1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    } as React.CSSProperties,
    filtrosContainer: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    } as React.CSSProperties,
    filtrosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1rem'
    } as React.CSSProperties,
    formGroup: {
      marginBottom: '0.75rem'
    } as React.CSSProperties,
    label: {
      display: 'block',
      color: '#1e293b',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.375rem'
    } as React.CSSProperties,
    select: {
      width: '100%',
      padding: '0.625rem 0.75rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'border-color 0.2s'
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '0.625rem 0.75rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      backgroundColor: 'white'
    } as React.CSSProperties,
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    } as React.CSSProperties,
    statCard: {
      backgroundColor: 'white',
      padding: '1.25rem',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      textAlign: 'center',
      transition: 'all 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    } as React.CSSProperties,
    statNumber: {
      fontSize: '1.75rem',
      fontWeight: '700',
      margin: '0.5rem 0'
    } as React.CSSProperties,
    statLabel: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#64748b'
    } as React.CSSProperties,
    clinicaSection: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    } as React.CSSProperties,
    clinicaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #3b82f6'
    } as React.CSSProperties,
    clinicaNombre: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1e293b'
    } as React.CSSProperties,
    pacienteSubsection: {
      marginBottom: '1rem',
      paddingLeft: '0.5rem',
      borderLeft: '2px solid #94a3b8'
    } as React.CSSProperties,
    pacienteHeader: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#334155',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    } as React.CSSProperties,
    trabajoCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1rem',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      marginBottom: '0.5rem',
    } as React.CSSProperties,
    trabajoColumn: {
      flex: 1,
      minWidth: 0,
      fontSize: '0.875rem',
    } as React.CSSProperties,
    trabajoLabel: {
      fontSize: '0.7rem',
      color: '#64748b',
      textTransform: 'uppercase',
      marginBottom: '0.25rem',
    } as React.CSSProperties,
    trabajoValue: {
      fontWeight: '500',
      color: '#1e293b',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as React.CSSProperties,
    actionButtons: {
      display: 'flex',
      gap: '0.25rem',
      flexShrink: 0,
    } as React.CSSProperties,
    actionIcon: {
      background: 'none',
      border: 'none',
      fontSize: '1rem',
      cursor: 'pointer',
      padding: '0.25rem',
      borderRadius: '0.25rem',
      transition: 'background 0.2s',
    } as React.CSSProperties,
    estadoDropdown: {
      padding: '0.25rem 0.5rem',
      borderRadius: '0.375rem',
      border: '1px solid #cbd5e1',
      fontSize: '0.75rem',
      backgroundColor: 'white',
      cursor: 'pointer',
      width: '110px',
    } as React.CSSProperties,
    emptyState: {
      textAlign: 'center',
      color: '#64748b',
      padding: '3rem',
      backgroundColor: '#f1f5f9',
      borderRadius: '0.75rem',
      border: '2px dashed #cbd5e1'
    } as React.CSSProperties,
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    } as React.CSSProperties,
    modalContent: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      width: '95%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    } as React.CSSProperties,
    qrModalContent: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      width: '95%',
      maxWidth: '500px',
      textAlign: 'center' as const,
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    } as React.CSSProperties,
    modalClose: {
      float: 'right',
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#64748b'
    } as React.CSSProperties
  };

  return (
    <div style={styles.container}>
      <Header
        user={user}
        onLogout={handleLogout}
        cerrandoSesion={cerrandoSesion}
        showBackButton={true}
        onBack={handleVolver}
        title="Gestión de Trabajos"
        showTitle={true}
      />

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔧 Gestión de Trabajos</h1>
            <p style={styles.subtitle}>Administra todos los trabajos dentales organizados por clínica y paciente</p>
          </div>

          <button
            style={styles.button}
            onClick={() => navigate('/crear-trabajo')}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            ➕ Nuevo Trabajo
          </button>
        </div>

        <div style={styles.filtrosContainer}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>🔍 Filtros de Búsqueda</h3>

          <div style={styles.filtrosGrid}>
            {['clinicaId', 'estado', 'año', 'mes', 'dentistaId'].map((filtro) => (
              <div key={filtro} style={styles.formGroup}>
                <label style={styles.label}>
                  {filtro === 'clinicaId' ? 'Clínica' :
                    filtro === 'estado' ? 'Estado' :
                      filtro === 'año' ? 'Año' :
                        filtro === 'mes' ? 'Mes' : 'Dentista'}
                </label>
                <select
                  style={styles.select}
                  value={filtros[filtro as keyof Filtros]}
                  onChange={(e) => setFiltros({ ...filtros, [filtro]: e.target.value })}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  {filtro === 'clinicaId' && <option value="todas">🏥 Todas las Clínicas</option>}
                  {filtro === 'estado' && <option value="todos">📊 Todos los Estados</option>}
                  {filtro === 'año' && <option value="todos">📅 Todos los Años</option>}
                  {filtro === 'mes' && mesesDisponibles.map(m => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                  {filtro === 'dentistaId' && <option value="todos">👨‍⚕️ Todos los Dentistas</option>}

                  {filtro === 'clinicaId' && clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  {filtro === 'estado' && ['pendiente', 'produccion', 'terminado', 'entregado'].map(e =>
                    <option key={e} value={e}>{getEstadoText(e)}</option>
                  )}
                  {filtro === 'año' && añosDisponibles().map(a => <option key={a} value={a}>{a}</option>)}
                  {filtro === 'dentistaId' && dentistas.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
            ))}

            <div style={styles.formGroup}>
              <label style={styles.label}>Paciente</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Buscar por nombre..."
                value={filtros.paciente}
                onChange={(e) => setFiltros({ ...filtros, paciente: e.target.value })}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
              Mostrando {trabajosAgrupados.length} de {trabajos.length} trabajos (agrupados)
            </span>
            <button
              style={styles.buttonSmall}
              onClick={() => setFiltros({
                clinicaId: 'todas',
                estado: 'todos',
                mes: 'todos',
                año: 'todos',
                paciente: '',
                laboratoristaId: 'todos',
                dentistaId: 'todos'
              })}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            >
              🔄 Limpiar Filtros
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          {Object.entries({
            'Total Trabajos (agrupados)': estadisticas.total,
            'Ingresos Totales': `$${estadisticas.ingresosTotales.toLocaleString()}`,
            'En Proceso': estadisticas.pendientes + estadisticas.produccion,
            'Finalizados': estadisticas.terminados + estadisticas.entregados
          }).map(([label, value]) => (
            <div
              key={label}
              style={styles.statCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
              }}
            >
              <div style={styles.statLabel}>{label}</div>
              <div style={{
                ...styles.statNumber,
                color: label.includes('Ingresos') ? '#10b981' :
                  label.includes('Proceso') ? '#f59e0b' :
                    label.includes('Finalizados') ? '#3b82f6' : '#1e293b'
              }}>
                {value}
              </div>
              {label === 'En Proceso' && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {estadisticas.pendientes} pendientes • {estadisticas.produccion} producción
                </div>
              )}
              {label === 'Finalizados' && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {estadisticas.terminados} terminados • {estadisticas.entregados} entregados
                </div>
              )}
            </div>
          ))}
        </div>

        {cargando && trabajos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '1rem', color: '#64748b' }}>Cargando trabajos...</div>
          </div>
        ) : trabajosAgrupados.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {trabajos.length === 0 ? 'No hay trabajos registrados' : 'No hay trabajos con los filtros aplicados'}
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {trabajos.length === 0
                ? 'Comienza creando tu primer trabajo dental'
                : 'Intenta con diferentes filtros de búsqueda'}
            </p>
            {trabajos.length === 0 && (
              <button
                style={styles.button}
                onClick={() => navigate('/crear-trabajo')}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                ➕ Crear Primer Trabajo
              </button>
            )}
          </div>
        ) : (
          Object.entries(trabajosPorClinicaYPaciente).map(([clinicaId, pacientes]) => {
            const clinica = clinicas.find(c => c.id === clinicaId);
            return (
              <div key={clinicaId} style={styles.clinicaSection}>
                <div style={styles.clinicaHeader}>
                  <h2 style={styles.clinicaNombre}>🏥 {clinica?.nombre || 'Clínica sin nombre'}</h2>
                  <button
                    style={styles.buttonSmall}
                    onClick={() => finalizarTodosTrabajosClinica(clinicaId)}
                  >
                    ✅ Finalizar todos
                  </button>
                </div>

                {Object.entries(pacientes).map(([pacienteNombre, data]) => (
                  <div key={pacienteNombre} style={styles.pacienteSubsection}>
                    <h3 style={styles.pacienteHeader}>
                      👤 {pacienteNombre}
                      <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#64748b' }}>
                        ({data.trabajos.length} trabajo{data.trabajos.length !== 1 ? 's' : ''})
                      </span>
                    </h3>

                    {data.trabajos.map((trabajo) => {
                      const dentista = dentistas.find(d => d.id === trabajo.dentista_id);
                      return (
                        <div key={trabajo.ids.join('-')} style={styles.trabajoCard}>
                          <div style={{ ...styles.trabajoColumn, flex: '1.5' }}>
                            <div style={styles.trabajoLabel}>Dentista</div>
                            <div style={styles.trabajoValue}>{dentista?.nombre || 'N/A'}</div>
                          </div>
                          <div style={{ ...styles.trabajoColumn, flex: '1' }}>
                            <div style={styles.trabajoLabel}>Fecha</div>
                            <div style={styles.trabajoValue}>{new Date(trabajo.fecha_creacion).toLocaleDateString()}</div>
                          </div>
                          <div style={{ ...styles.trabajoColumn, flex: '2' }}>
                            <div style={styles.trabajoLabel}>Servicios</div>
                            <div style={styles.trabajoValue}>
                              {trabajo.servicios.length} servicio(s)
                              {trabajo.servicios.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                  ({trabajo.servicios.map(s => s.nombre).join(', ').substring(0, 20)}...)
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ ...styles.trabajoColumn, flex: '0.8' }}>
                            <div style={styles.trabajoLabel}>Precio</div>
                            <div style={{ ...styles.trabajoValue, color: '#10b981', fontWeight: '600' }}>
                              ${trabajo.precio_total.toLocaleString()}
                              {trabajo.ids.length > 1 && (
                                <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: '0.25rem' }}>
                                  ({trabajo.ids.length})
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ ...styles.trabajoColumn, flex: '1.2' }}>
                            <select
                              style={styles.estadoDropdown}
                              value={trabajo.estado}
                              onChange={(e) => cambiarEstadoTrabajo(trabajo, e.target.value as Trabajo['estado'])}
                            >
                              <option value="pendiente">⏳ Pendiente</option>
                              <option value="produccion">🔧 Producción</option>
                              <option value="terminado">✅ Terminado</option>
                              <option value="entregado">📦 Entregado</option>
                            </select>
                          </div>
                          <div style={styles.actionButtons}>
                            <button style={styles.actionIcon} onClick={() => abrirModalEdicion(trabajo)} title="Editar">✏️</button>
                            <button style={styles.actionIcon} onClick={() => abrirModalQR(trabajo)} title="Generar QR">📦</button>
                            <button style={styles.actionIcon} onClick={() => abrirModalNotas(trabajo)} title="Notas">📝</button>
                            <button style={styles.actionIcon} onClick={() => imprimirTrabajo(trabajo)} title="Imprimir">🖨️</button>
                            <button style={{ ...styles.actionIcon, color: '#ef4444' }} onClick={() => eliminarTrabajo(trabajo)} title="Eliminar">🗑️</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE NOTAS */}
      {modalNotasAbierto && trabajoConNotas && (
        <div style={styles.modalOverlay} onClick={() => setModalNotasAbierto(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              📝 Notas - {trabajoConNotas.paciente}
            </h2>
            <textarea
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                minHeight: '120px',
                resize: 'vertical'
              }}
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Agrega notas sobre el tratamiento..."
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                style={styles.buttonSmall}
                onClick={() => setModalNotasAbierto(false)}
              >
                Cancelar
              </button>
              <button
                style={{ ...styles.button, backgroundColor: '#10b981', padding: '0.625rem 1.25rem' }}
                onClick={guardarNota}
                disabled={cargando}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
              >
                {cargando ? 'Guardando...' : 'Guardar Notas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN (sin cierre al hacer clic fuera) */}
      {modalEdicionAbierto && trabajoEditando && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.modalClose}
              onClick={() => setModalEdicionAbierto(false)}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
              ✏️ Editar Trabajo - {trabajoEditando.paciente}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#ef4444', marginBottom: '1rem' }}>
              ⚠️ Este trabajo agrupa {trabajoEditando.ids.length} trabajos duplicados. Al guardar, se actualizará el primero y se eliminarán los demás.
            </p>

            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Prestaciones actuales</h3>
            {serviciosEditando.length === 0 ? (
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>No hay prestaciones</p>
            ) : (
              <div style={{ marginBottom: '2rem' }}>
                {serviciosEditando.map((serv, index) => {
                  const servicioInfo = servicios.find(s => s.id === serv.servicio_id);
                  return (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
                      <div>
                        <strong>{servicioInfo?.nombre || serv.nombre || 'Servicio'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Cantidad: {serv.cantidad} {serv.pieza_dental && `| Pieza: ${serv.pieza_dental}`}
                          {serv.nota_especial && ` | Nota: ${serv.nota_especial}`}
                        </div>
                        <div style={{ fontWeight: '600', color: '#10b981' }}>${serv.precio.toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => eliminarServicioEditando(index)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.25rem' }}
                        title="Eliminar prestación"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Agregar nueva prestación</h3>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Buscar servicio..."
                style={styles.input}
                value={busquedaServicio}
                onChange={(e) => setBusquedaServicio(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <select
                style={styles.select}
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="todos">Todas las categorías</option>
                {Array.from(new Set(servicios.map(s => s.categoria))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.5rem', marginBottom: '1rem' }}>
              {servicios
                .filter(s => s.activo && (categoriaFiltro === 'todos' || s.categoria === categoriaFiltro) && s.nombre.toLowerCase().includes(busquedaServicio.toLowerCase()))
                .map(serv => (
                  <div
                    key={serv.id}
                    onClick={() => setNuevoServicioSeleccionado(serv)}
                    style={{
                      padding: '0.5rem',
                      cursor: 'pointer',
                      backgroundColor: nuevoServicioSeleccionado?.id === serv.id ? '#e2e8f0' : 'transparent',
                      borderRadius: '0.375rem',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <strong>{serv.nombre}</strong> - ${serv.precio_base.toLocaleString()}
                  </div>
                ))}
            </div>
            {nuevoServicioSeleccionado && (
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <p><strong>Seleccionado:</strong> {nuevoServicioSeleccionado.nombre}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={styles.label}>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      style={styles.input}
                      value={nuevaCantidad}
                      onChange={(e) => setNuevaCantidad(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Pieza dental</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={nuevaPieza}
                      onChange={(e) => setNuevaPieza(e.target.value)}
                      placeholder="Ej: 15"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={styles.label}>Nota especial</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={nuevaNotaEspecial}
                    onChange={(e) => setNuevaNotaEspecial(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <button
                  style={{ ...styles.buttonSmall, backgroundColor: '#10b981', color: 'white', border: 'none' }}
                  onClick={agregarServicioEditando}
                >
                  ➕ Agregar
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                style={styles.buttonSmall}
                onClick={() => setModalEdicionAbierto(false)}
              >
                Cancelar
              </button>
              <button
                style={{ ...styles.button, backgroundColor: '#3b82f6' }}
                onClick={guardarEdicion}
                disabled={cargando}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                {cargando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE QR */}
      {modalQRAbierto && trabajoQR && (
        <div style={styles.modalOverlay} onClick={() => setModalQRAbierto(false)}>
          <div style={styles.qrModalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              📦 QR de Entrega
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Para: <strong>{trabajoQR.paciente}</strong>
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '2rem',
              padding: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '2px dashed #e2e8f0'
            }}>
              <QRCode
                value={trabajoQR.id}
                size={250}
                includeMargin={true}
                level="H"
                fgColor="#1e293b"
                bgColor="#ffffff"
              />
            </div>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                <strong>📋 Instrucciones para entrega:</strong>
              </div>
              <ol style={{
                fontSize: '0.75rem',
                color: '#64748b',
                paddingLeft: '1.5rem',
                margin: 0,
                textAlign: 'left'
              }}>
                <li>Imprime este código QR</li>
                <li>Pégalo en el paquete del trabajo</li>
                <li>El repartidor escaneará el QR con la app de entregas</li>
                <li>Se registrará automáticamente como "entregado"</li>
              </ol>
            </div>

            <div style={{
              backgroundColor: '#fef3c7',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.75rem',
              color: '#92400e',
              textAlign: 'left'
            }}>
              <strong>⚠️ Nota:</strong> Este QR contiene el ID único del trabajo ({trabajoQR.id.substring(0, 8)}...)
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={descargarQR}
                style={{
                  ...styles.button,
                  backgroundColor: '#3b82f6',
                  padding: '0.75rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📥 Descargar QR
              </button>
              <button
                onClick={() => setModalQRAbierto(false)}
                style={{
                  ...styles.button,
                  backgroundColor: '#64748b',
                  padding: '0.75rem 1.5rem'
                }}
              >
                Cerrar
              </button>
            </div>

            {/* Canvas oculto para descargar */}
            <div style={{ display: 'none' }}>
              <QRCode
                id="qr-canvas"
                value={trabajoQR.id}
                size={300}
                includeMargin={true}
                level="H"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionTrabajos;