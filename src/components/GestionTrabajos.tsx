import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

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

const GestionTrabajos: React.FC<GestionTrabajosProps> = ({ onBack, user, onLogout }) => {
  const navigate = useNavigate();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [laboratoristas, setLaboratoristas] = useState<Laboratorista[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [modalNotasAbierto, setModalNotasAbierto] = useState(false);
  const [trabajoEditando, setTrabajoEditando] = useState<Trabajo | null>(null);
  const [trabajoConNotas, setTrabajoConNotas] = useState<Trabajo | null>(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [cargando, setCargando] = useState(false);
  const [trabajoExpandido, setTrabajoExpandido] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    clinicaId: 'todas',
    estado: 'todos',
    mes: 'todos',
    año: 'todos',
    paciente: '',
    laboratoristaId: 'todos',
    dentistaId: 'todos'
  });

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
        if (modalAbierto) setModalAbierto(false);
        if (modalEdicionAbierto) setModalEdicionAbierto(false);
        if (modalNotasAbierto) setModalNotasAbierto(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalAbierto, modalEdicionAbierto, modalNotasAbierto]);

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

  const trabajosPorClinicaYPaciente = trabajosFiltrados.reduce((acc, trabajo) => {
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
  }, {} as Record<string, Record<string, { paciente: string, trabajos: Trabajo[] }>>);

  const estadisticas = {
    total: trabajosFiltrados.length,
    pendientes: trabajosFiltrados.filter(t => t.estado === 'pendiente').length,
    produccion: trabajosFiltrados.filter(t => t.estado === 'produccion').length,
    terminados: trabajosFiltrados.filter(t => t.estado === 'terminado').length,
    entregados: trabajosFiltrados.filter(t => t.estado === 'entregado').length,
    ingresosTotales: trabajosFiltrados.reduce((sum, t) => sum + t.precio_total, 0)
  };

  const cambiarEstadoTrabajo = async (trabajoId: string, nuevoEstado: Trabajo['estado']) => {
    try {
      setCargando(true);
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: nuevoEstado })
        .eq('id', trabajoId);

      if (error) throw error;

      setTrabajos(prev => 
        prev.map(t => t.id === trabajoId ? { ...t, estado: nuevoEstado } : t)
      );
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('❌ Error al cambiar el estado');
    } finally {
      setCargando(false);
    }
  };

  const eliminarTrabajo = async (trabajoId: string, pacienteNombre: string) => {
    if (!window.confirm(`¿Eliminar trabajo de "${pacienteNombre}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      setCargando(true);
      const { error } = await supabase
        .from('trabajos')
        .delete()
        .eq('id', trabajoId);

      if (error) throw error;

      setTrabajos(prev => prev.filter(t => t.id !== trabajoId));
      alert('✅ Trabajo eliminado');
    } catch (error) {
      console.error('Error eliminando trabajo:', error);
      alert('❌ Error al eliminar');
    } finally {
      setCargando(false);
    }
  };

  const finalizarTodosTrabajosClinica = async (clinicaId: string) => {
    const trabajosPendientes = trabajos.filter(t => 
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
      const { error } = await supabase
        .from('trabajos')
        .update({ estado: 'terminado' })
        .eq('clinica_id', clinicaId)
        .in('estado', ['pendiente', 'produccion']);

      if (error) throw error;

      setTrabajos(prev => 
        prev.map(t => 
          t.clinica_id === clinicaId && (t.estado === 'pendiente' || t.estado === 'produccion')
            ? { ...t, estado: 'terminado' }
            : t
        )
      );
    } catch (error) {
      console.error('Error finalizando trabajos:', error);
      alert('❌ Error al finalizar trabajos');
    } finally {
      setCargando(false);
    }
  };

  const abrirModalNotas = (trabajo: Trabajo) => {
    setTrabajoConNotas(trabajo);
    setNuevaNota(trabajo.notas || '');
    setModalNotasAbierto(true);
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
    } catch (error) {
      console.error('Error guardando nota:', error);
      alert('❌ Error al guardar nota');
    } finally {
      setCargando(false);
    }
  };

  const imprimirTrabajo = (trabajo: Trabajo) => {
    const clinica = clinicas.find(c => c.id === trabajo.clinica_id);
    const dentista = dentistas.find(d => d.id === trabajo.dentista_id);
    const laboratorista = laboratoristas.find(l => l.id === trabajo.laboratorista_id);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hoja de Trabajo - ${trabajo.paciente}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .patient-info { margin-bottom: 30px; }
            .services-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .services-table th, .services-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .services-table th { background-color: #f8f9fa; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 30px; }
            .notes { margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HOJA DE TRABAJO DENTAL</h1>
            <p><strong>Fecha:</strong> ${new Date(trabajo.fecha_creacion).toLocaleDateString()}</p>
          </div>
          
          <div class="patient-info">
            <h2>Información del Paciente</h2>
            <p><strong>Nombre:</strong> ${trabajo.paciente}</p>
            <p><strong>Clínica:</strong> ${clinica?.nombre || 'No especificada'}</p>
            <p><strong>Dentista:</strong> ${dentista?.nombre || 'No especificado'}</p>
            <p><strong>Laboratorista:</strong> ${laboratorista?.nombre || 'No asignado'}</p>
            <p><strong>Estado:</strong> ${trabajo.estado}</p>
            <p><strong>Fecha Entrega Estimada:</strong> ${new Date(trabajo.fecha_entrega_estimada).toLocaleDateString()}</p>
          </div>
          
          <h2>Prestaciones del Trabajo</h2>
          <table class="services-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Servicio</th>
                <th>Cantidad</th>
                <th>Pieza Dental</th>
                <th>Precio Unitario</th>
                <th>Subtotal</th>
                <th>Notas Especiales</th>
              </tr>
            </thead>
            <tbody>
              ${trabajo.servicios.map((servicio, index) => {
                const servicioInfo = servicios.find(s => s.id === servicio.servicio_id);
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${servicioInfo?.nombre || servicio.nombre || 'Servicio'}</td>
                    <td>${servicio.cantidad}</td>
                    <td>${servicio.pieza_dental || '-'}</td>
                    <td>$${(servicio.precio / servicio.cantidad).toLocaleString()}</td>
                    <td>$${servicio.precio.toLocaleString()}</td>
                    <td>${servicio.nota_especial || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p>TOTAL: $${trabajo.precio_total.toLocaleString()}</p>
          </div>
          
          ${trabajo.notas ? `
            <div class="notes">
              <h3>Notas Generales:</h3>
              <p>${trabajo.notas}</p>
            </div>
          ` : ''}
          
          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
              🖨️ Imprimir
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Cerrar
            </button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
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
      alignItems: 'flex-start',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #f1f5f9'
    } as React.CSSProperties,
    
    pacienteSection: {
      marginBottom: '1.5rem'
    } as React.CSSProperties,
    
    pacienteHeader: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '1rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid #f1f5f9'
    } as React.CSSProperties,
    
    trabajosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1rem'
    } as React.CSSProperties,
    
    trabajoCard: {
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      transition: 'all 0.2s',
      borderLeft: '4px solid #3b82f6'
    } as React.CSSProperties,
    
    trabajoHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '0.75rem'
    } as React.CSSProperties,
    
    trabajoInfo: {
      color: '#64748b',
      fontSize: '0.8125rem',
      marginBottom: '0.375rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    } as React.CSSProperties,
    
    serviciosContainer: {
      marginTop: '1rem',
      maxHeight: '250px',
      overflowY: 'auto' as 'auto',
      padding: '0.75rem',
      backgroundColor: '#f8fafc',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0'
    } as React.CSSProperties,
    
    servicioItem: {
      backgroundColor: 'white',
      padding: '0.75rem',
      borderRadius: '0.375rem',
      marginBottom: '0.5rem',
      fontSize: '0.8125rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderLeft: '3px solid #e2e8f0'
    } as React.CSSProperties,
    
    estadoSelector: {
      display: 'flex',
      gap: '0.375rem',
      marginTop: '1rem',
      flexWrap: 'wrap'
    } as React.CSSProperties,
    
    estadoButton: (activo: boolean): React.CSSProperties => ({
      padding: '0.375rem 0.75rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '500',
      backgroundColor: activo ? '#3b82f6' : 'white',
      color: activo ? 'white' : '#64748b',
      borderColor: activo ? '#3b82f6' : '#e2e8f0'
    }),
    
    accionesContainer: {
      display: 'flex',
      gap: '0.375rem',
      marginTop: '1rem',
      justifyContent: 'flex-end',
      flexWrap: 'wrap'
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
      zIndex: 1000
    } as React.CSSProperties,
    
    modalContent: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      width: '95%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
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
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🔧 Gestión de Trabajos</h1>
            <p style={styles.subtitle}>Administra todos los trabajos dentales organizados por clínica y paciente</p>
          </div>
          
          <button 
            style={styles.button}
            onClick={() => setModalAbierto(true)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            ➕ Nuevo Trabajo
          </button>
        </div>

        {/* FILTROS */}
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
                  onChange={(e) => setFiltros({...filtros, [filtro]: e.target.value})}
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
                onChange={(e) => setFiltros({...filtros, paciente: e.target.value})}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
              Mostrando {trabajosFiltrados.length} de {trabajos.length} trabajos
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

        {/* ESTADÍSTICAS */}
        <div style={styles.statsGrid}>
          {Object.entries({
            'Total Trabajos': estadisticas.total,
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

        {/* LISTA DE TRABAJOS */}
        {cargando && trabajos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '1rem', color: '#64748b' }}>Cargando trabajos...</div>
          </div>
        ) : Object.keys(trabajosPorClinicaYPaciente).length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {trabajos.length === 0 ? 'No hay trabajos registrados' : 'No hay trabajos con los filtros aplicados'}
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {trabajos.length === 0 
                ? 'Comienza creando tu primer trabajo dental' 
                : 'Intenta con diferentes filtros de búsqueda'
              }
            </p>
            {trabajos.length === 0 && (
              <button style={styles.button} onClick={() => setModalAbierto(true)}>
                ➕ Crear Primer Trabajo
              </button>
            )}
          </div>
        ) : (
          // ORGANIZACIÓN: CLÍNICA -> PACIENTE -> TRABAJOS
          Object.entries(trabajosPorClinicaYPaciente).map(([clinicaId, pacientesObj]) => {
            const clinica = clinicas.find(c => c.id === clinicaId);
            const pacientes = Object.values(pacientesObj);
            
            const trabajosPendientes = trabajos.filter(t => 
              t.clinica_id === clinicaId && 
              (t.estado === 'pendiente' || t.estado === 'produccion')
            ).length;

            return (
              <div key={clinicaId} style={styles.clinicaSection}>
                {/* HEADER DE CLÍNICA */}
                <div style={styles.clinicaHeader}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      🏥 {clinica?.nombre || 'Clínica no encontrada'}
                    </h2>
                    {clinica?.direccion && (
                      <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                        📍 {clinica.direccion}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: '500'
                    }}>
                      {pacientes.reduce((total, p) => total + p.trabajos.length, 0)} trabajos
                    </span>
                    
                    {trabajosPendientes > 0 && (
                      <button 
                        style={{
                          ...styles.buttonSmall,
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none'
                        }}
                        onClick={() => finalizarTodosTrabajosClinica(clinicaId)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                      >
                        ✅ Finalizar Todos ({trabajosPendientes})
                      </button>
                    )}
                  </div>
                </div>

                {/* LISTA DE PACIENTES Y SUS TRABAJOS */}
                {pacientes.map(({ paciente, trabajos: trabajosPaciente }) => (
                  <div key={paciente} style={styles.pacienteSection}>
                    <h3 style={styles.pacienteHeader}>
                      👤 {/^\d+$/.test(paciente) ? `Paciente ${paciente}` : paciente} 
                      <span style={{ fontSize: '0.8125rem', color: '#64748b', marginLeft: '0.5rem' }}>
                        ({trabajosPaciente.length} trabajo{trabajosPaciente.length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                    
                    <div style={styles.trabajosGrid}>
                      {trabajosPaciente.map((trabajo) => {
                        const dentista = dentistas.find(d => d.id === trabajo.dentista_id);
                        const laboratorista = laboratoristas.find(l => l.id === trabajo.laboratorista_id);

                        return (
                          <div 
                            key={trabajo.id}
                            style={styles.trabajoCard}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {/* HEADER DEL TRABAJO */}
                            <div style={styles.trabajoHeader}>
                              <div>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                                  {/^\d+$/.test(trabajo.paciente) ? `Paciente ${trabajo.paciente}` : trabajo.paciente}
                                </h4>
                                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                  👨‍⚕️ {dentista?.nombre || 'No especificado'}
                                </div>
                              </div>
                              <span style={getEstadoStyle(trabajo.estado)}>
                                {getEstadoText(trabajo.estado)}
                              </span>
                            </div>

                            {/* INFORMACIÓN BÁSICA */}
                            <div style={styles.trabajoInfo}>
                              <span>💰 ${trabajo.precio_total.toLocaleString()}</span>
                            </div>
                            <div style={styles.trabajoInfo}>
                              <span>📅 Creado: {new Date(trabajo.fecha_creacion).toLocaleDateString()}</span>
                            </div>
                            <div style={styles.trabajoInfo}>
                              <span>📅 Entrega: {trabajo.fecha_entrega_estimada ? new Date(trabajo.fecha_entrega_estimada).toLocaleDateString() : 'Sin fecha'}</span>
                            </div>
                            {laboratorista && (
                              <div style={styles.trabajoInfo}>
                                <span>👨‍🔧 {laboratorista.nombre}</span>
                              </div>
                            )}

                            {/* PRESTACIONES */}
                            <div style={styles.serviciosContainer}>
                              <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                                Prestaciones ({trabajo.servicios?.length || 0}):
                              </div>
                              {trabajo.servicios && trabajo.servicios.length > 0 ? (
                                trabajo.servicios.map((servicioTrabajo, index) => {
                                  const servicio = servicios.find(s => s.id === servicioTrabajo.servicio_id);
                                  return (
                                    <div key={index} style={styles.servicioItem}>
                                      <div>
                                        <div style={{ fontWeight: '500', marginBottom: '0.125rem', fontSize: '0.75rem' }}>
                                          {servicio?.nombre || servicioTrabajo.nombre || 'Servicio'}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                          Cantidad: {servicioTrabajo.cantidad}
                                          {servicioTrabajo.pieza_dental && ` • Pieza: ${servicioTrabajo.pieza_dental}`}
                                        </div>
                                        {servicioTrabajo.nota_especial && (
                                          <div style={{ fontSize: '0.6875rem', color: '#f59e0b', fontStyle: 'italic', marginTop: '0.125rem' }}>
                                            📝 {servicioTrabajo.nota_especial}
                                          </div>
                                        )}
                                      </div>
                                      <div style={{ fontWeight: '600', color: '#10b981', fontSize: '0.75rem' }}>
                                        ${servicioTrabajo.precio.toLocaleString()}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem' }}>
                                  No hay prestaciones
                                </div>
                              )}
                            </div>

                            {/* NOTAS */}
                            {trabajo.notas && (
                              <div style={{
                                backgroundColor: '#fef3c7',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.375rem',
                                marginTop: '0.75rem',
                                fontSize: '0.75rem',
                                borderLeft: '3px solid #f59e0b'
                              }}>
                                <strong style={{ fontSize: '0.6875rem' }}>📝 Notas:</strong> {trabajo.notas}
                              </div>
                            )}

                            {/* CAMBIAR ESTADO */}
                            <div style={styles.estadoSelector}>
                              {(['pendiente', 'produccion', 'terminado', 'entregado'] as const).map((estado) => (
                                <button
                                  key={estado}
                                  style={styles.estadoButton(trabajo.estado === estado)}
                                  onClick={() => cambiarEstadoTrabajo(trabajo.id, estado)}
                                  onMouseEnter={(e) => {
                                    if (trabajo.estado !== estado) {
                                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (trabajo.estado !== estado) {
                                      e.currentTarget.style.backgroundColor = 'white';
                                    }
                                  }}
                                >
                                  {estado === 'pendiente' ? '⏳' : 
                                   estado === 'produccion' ? '🔧' : 
                                   estado === 'terminado' ? '✅' : '📦'}
                                </button>
                              ))}
                            </div>

                            {/* ACCIONES */}
                            <div style={styles.accionesContainer}>
                              <button 
                                style={styles.buttonSmall}
                                onClick={() => abrirModalNotas(trabajo)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              >
                                📝 Notas
                              </button>
                              <button 
                                style={styles.buttonSmall}
                                onClick={() => imprimirTrabajo(trabajo)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              >
                                🖨️ Imprimir
                              </button>
                              <button 
                                style={{
                                  ...styles.buttonSmall,
                                  color: '#ef4444',
                                  borderColor: '#fecaca'
                                }}
                                onClick={() => eliminarTrabajo(trabajo.id, trabajo.paciente)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}

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
      </div>
    </div>
  );
};

export default GestionTrabajos;