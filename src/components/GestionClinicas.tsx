import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { useMembresia } from '../hooks/useMembresia';
import { useMediaQuery, BREAKPOINTS } from '../hooks/useMediaQuery';
import { normalizarRut, validarRut, formatearRut } from '../utils/rut';

interface GestionClinicasProps {
  onBack?: () => void;
}

interface Clinica {
  id: string;
  nombre: string;
  rut?: string | null;
  direccion: string;
  telefono: string;
  email: string;
  usuario_id: string;
  created_at: string;
  tipo_retencion: 'con_retencion' | 'sin_retencion';
  porcentaje_retencion: number | null;
}

interface Dentista {
  id: string;
  nombre: string;
  especialidad: string;
  clinica_id: string;
  usuario_id: string;
  created_at: string;
}

const GestionClinicas: React.FC<GestionClinicasProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [modalClinicaAbierto, setModalClinicaAbierto] = useState(false);
  const [modalDentistaAbierto, setModalDentistaAbierto] = useState(false);
  const [clinicaEditando, setClinicaEditando] = useState<Clinica | null>(null);
  const [cargando, setCargando] = useState(false);
  const [clinicaSeleccionada, setClinicaSeleccionada] = useState<string>('');
  const [usuario, setUsuario] = useState<any>(null);
  const [clinicasExpandidas, setClinicasExpandidas] = useState<string[]>([]);
  const [errorRut, setErrorRut] = useState<string>('');

  const membresia = useMembresia(usuario?.id);

  const [formDataClinica, setFormDataClinica] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    telefono: '',
    email: '',
    tipo_retencion: 'sin_retencion' as 'con_retencion' | 'sin_retencion'
  });

  const [formDataDentista, setFormDataDentista] = useState({
    nombre: '',
    especialidad: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('No hay usuario autenticado');
        navigate('/login');
        return;
      }

      setUsuario(user);

      const [clinicasRes, dentistasRes] = await Promise.all([
        supabase
          .from('clinicas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre', { ascending: true }),
        supabase
          .from('dentistas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre', { ascending: true })
      ]);

      if (clinicasRes.error) throw clinicasRes.error;
      if (dentistasRes.error) throw dentistasRes.error;

      setClinicas(clinicasRes.data || []);
      setDentistas(dentistasRes.data || []);

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      alert(`Error al cargar los datos: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Vista: tabla en pantallas anchas, tarjetas en tablet y teléfono
  const vistaTarjetas = useMediaQuery(BREAKPOINTS.tablet);

  // Límite de clínicas según el plan del laboratorio (la base lo valida igual)
  const limiteClinicas = membresia.limiteClinicas ?? Infinity;
  const puedeCrearClinica =
    !membresia.cargando && !membresia.soloLectura && clinicas.length < limiteClinicas;

  const mensajeLimite = (() => {
    if (membresia.cargando) return 'Verificando plan...';
    if (membresia.soloLectura) {
      return 'Tu plan está vencido: puedes ver tus clínicas, pero no agregar nuevas. Regulariza tu pago en Mi Membresía.';
    }
    if (membresia.limiteClinicas !== null) {
      if (clinicas.length >= membresia.limiteClinicas) {
        return `Has alcanzado el límite de ${membresia.limiteClinicas} clínicas del plan ${membresia.planNombre}. Mejora tu plan para agregar más.`;
      }
      return `Puedes agregar ${membresia.limiteClinicas - clinicas.length} clínica(s) más en tu plan ${membresia.planNombre}.`;
    }
    return '';
  })();

  // Mensajes de la base (PLAN_VENCIDO / LIMITE_PLAN) sin el código técnico
  const mensajeError = (error: any) =>
    String(error?.message || 'Error desconocido').replace(/^(PLAN_VENCIDO|LIMITE_PLAN):\s*/, '');

  const abrirModalClinica = (clinica?: Clinica) => {
    if (clinica) {
      setClinicaEditando(clinica);
      setFormDataClinica({
        nombre: clinica.nombre,
        rut: clinica.rut ? formatearRut(clinica.rut) : '',
        direccion: clinica.direccion || '',
        telefono: clinica.telefono || '',
        email: clinica.email || '',
        tipo_retencion: clinica.tipo_retencion || 'sin_retencion'
      });
    } else {
      if (!puedeCrearClinica) {
        alert(mensajeLimite || 'No puedes crear más clínicas en este plan.');
        return;
      }
      setClinicaEditando(null);
      setFormDataClinica({
        nombre: '',
        rut: '',
        direccion: '',
        telefono: '',
        email: '',
        tipo_retencion: 'sin_retencion'
      });
    }
    setErrorRut('');
    setModalClinicaAbierto(true);
  };

  const abrirModalDentista = (clinicaId: string) => {
    const clinica = clinicas.find(c => c.id === clinicaId);
    if (!clinica) {
      alert('Clínica no encontrada');
      return;
    }

    setClinicaSeleccionada(clinicaId);
    setFormDataDentista({
      nombre: '',
      especialidad: ''
    });
    setModalDentistaAbierto(true);
  };

  const cerrarModales = () => {
    setModalClinicaAbierto(false);
    setModalDentistaAbierto(false);
    setClinicaEditando(null);
    setClinicaSeleccionada('');
  };

  const guardarClinica = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDataClinica.nombre.trim()) {
      alert('El nombre de la clínica es requerido');
      return;
    }

    // RUT opcional: si viene, debe ser válido
    const rutIngresado = formDataClinica.rut.trim();
    if (rutIngresado && !validarRut(rutIngresado)) {
      setErrorRut('RUT inválido. Revisa el número y el dígito verificador.');
      return;
    }

    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

      const PORCENTAJE_RETENCION_FIJO = 15.25;

      const clinicaDataForSupabase = {
        nombre: formDataClinica.nombre.trim(),
        rut: normalizarRut(rutIngresado),
        direccion: formDataClinica.direccion.trim(),
        telefono: formDataClinica.telefono.trim(),
        email: formDataClinica.email.trim(),
        tipo_retencion: formDataClinica.tipo_retencion,
        porcentaje_retencion: formDataClinica.tipo_retencion === 'con_retencion' ?
          PORCENTAJE_RETENCION_FIJO : null,
        usuario_id: user.id
      };

      if (clinicaEditando) {
        const { error } = await supabase
          .from('clinicas')
          .update(clinicaDataForSupabase)
          .eq('id', clinicaEditando.id)
          .eq('usuario_id', user.id);

        if (error) throw error;

        setClinicas(prev => prev.map(c =>
          c.id === clinicaEditando.id ? { ...c, ...clinicaDataForSupabase, id: c.id } : c
        ));

        alert('✅ Clínica actualizada exitosamente');
      } else {
        const { data, error } = await supabase
          .from('clinicas')
          .insert([clinicaDataForSupabase])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setClinicas(prev => [data[0], ...prev]);
          alert('✅ Clínica creada exitosamente');
        }
      }

      cerrarModales();

    } catch (error: any) {
      console.error('Error guardando clínica:', error);
      if (error?.code === '23505') {
        setErrorRut(`Ya existe una clínica con el RUT ${formatearRut(rutIngresado)}.`);
      } else if (error?.code === '23514') {
        setErrorRut('RUT inválido. Revisa el número y el dígito verificador.');
      } else {
        alert(`Error al guardar la clínica: ${mensajeError(error)}`);
      }
    } finally {
      setCargando(false);
    }
  };

  const guardarDentista = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDataDentista.nombre.trim() || !formDataDentista.especialidad.trim()) {
      alert('El nombre y especialidad del dentista son requeridos');
      return;
    }

    if (!clinicaSeleccionada) {
      alert('No se ha seleccionado una clínica');
      return;
    }

    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

      const dentistaData = {
        nombre: formDataDentista.nombre.trim(),
        especialidad: formDataDentista.especialidad.trim(),
        clinica_id: clinicaSeleccionada,
        usuario_id: user.id
      };

      const { data, error } = await supabase
        .from('dentistas')
        .insert([dentistaData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setDentistas(prev => [data[0], ...prev]);
        cerrarModales();
        alert('✅ Dentista agregado exitosamente');
      }

    } catch (error: any) {
      console.error('Error guardando dentista:', error);
      alert(`Error al guardar el dentista: ${mensajeError(error)}`);
    } finally {
      setCargando(false);
    }
  };

  const eliminarClinica = async (clinica: Clinica) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la clínica "${clinica.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from('dentistas')
        .delete()
        .eq('clinica_id', clinica.id)
        .eq('usuario_id', user.id);

      const { error } = await supabase
        .from('clinicas')
        .delete()
        .eq('id', clinica.id)
        .eq('usuario_id', user.id);

      if (error) throw error;

      setClinicas(prev => prev.filter(c => c.id !== clinica.id));
      setDentistas(prev => prev.filter(d => d.clinica_id !== clinica.id));
      alert('✅ Clínica eliminada exitosamente');

    } catch (error: any) {
      console.error('Error eliminando clínica:', error);
      alert(`Error al eliminar la clínica: ${error.message}`);
    }
  };

  const eliminarDentista = async (dentista: Dentista) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al dentista "${dentista.nombre}"?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('dentistas')
        .delete()
        .eq('id', dentista.id)
        .eq('usuario_id', user.id);

      if (error) throw error;

      setDentistas(prev => prev.filter(d => d.id !== dentista.id));
      alert('✅ Dentista eliminado exitosamente');

    } catch (error: any) {
      console.error('Error eliminando dentista:', error);
      alert(`Error al eliminar el dentista: ${error.message}`);
    }
  };

  const handleVolver = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/dashboard');
    }
  };

  const dentistasPorClinica = (clinicaId: string) => {
    return dentistas.filter(d => d.clinica_id === clinicaId);
  };

  const alternarDentistas = (clinicaId: string) => {
    setClinicasExpandidas(prev =>
      prev.includes(clinicaId) ? prev.filter(id => id !== clinicaId) : [...prev, clinicaId]
    );
  };

  const getNombreClinicaSeleccionada = () => {
    const clinica = clinicas.find(c => c.id === clinicaSeleccionada);
    return clinica ? clinica.nombre : 'Clínica no encontrada';
  };

  // Función para copiar ID al portapapeles
  const copiarID = (id: string, tipo: string) => {
    navigator.clipboard.writeText(id);
    alert(`✅ ID de ${tipo} copiado al portapapeles`);
  };

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
      marginBottom: '30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '15px',
      flexWrap: 'wrap'
    },
    backButton: {
      padding: '10px 20px',
      backgroundColor: '#64748b',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600'
    },
    title: {
      margin: 0,
      color: '#1f2937',
      fontSize: '28px',
      fontWeight: 'bold'
    },
    addButton: {
      padding: '12px 24px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      opacity: 1,
    },
    addButtonDisabled: {
      backgroundColor: '#94a3b8',
      cursor: 'not-allowed',
      opacity: 0.7,
    },
    secondaryButton: {
      padding: '8px 16px',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500'
    },
    editButton: {
      padding: '6px 12px',
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      marginRight: '8px'
    },
    deleteButton: {
      padding: '6px 12px',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    tableWrapper: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      overflowX: 'auto',
      marginBottom: '40px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    th: {
      textAlign: 'left',
      padding: '12px 14px',
      backgroundColor: '#f8fafc',
      color: '#475569',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      borderBottom: '1px solid #e5e7eb',
      whiteSpace: 'nowrap'
    },
    td: {
      padding: '12px 14px',
      borderBottom: '1px solid #f1f5f9',
      color: '#374151',
      verticalAlign: 'middle'
    },
    rowExpanded: {
      backgroundColor: '#f8fafc'
    },
    nombreCell: {
      fontWeight: '600',
      color: '#1f2937',
      minWidth: '140px'
    },
    codigoCell: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      whiteSpace: 'nowrap'
    },
    codigoText: {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#475569',
      backgroundColor: '#f1f5f9',
      padding: '2px 6px',
      borderRadius: '4px'
    },
    emptyCell: {
      color: '#cbd5e1'
    },
    retencionBadge: {
      display: 'inline-block',
      color: '#1e40af',
      backgroundColor: '#dbeafe',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '500',
      whiteSpace: 'nowrap'
    },
    badgeMultilinea: {
      whiteSpace: 'normal',
      borderRadius: '8px'
    },
    retencionBadgeSin: {
      color: '#475569',
      backgroundColor: '#f1f5f9'
    },
    dentistasToggle: {
      padding: '6px 12px',
      backgroundColor: '#ecfdf5',
      color: '#047857',
      border: '1px solid #a7f3d0',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap'
    },
    actionsCell: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      whiteSpace: 'nowrap'
    },
    dentistasRowCell: {
      padding: '0 14px 16px 14px',
      backgroundColor: '#f8fafc',
      borderBottom: '1px solid #e5e7eb'
    },
    dentistasSection: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '14px'
    },
    dentistasHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '10px',
      flexWrap: 'wrap'
    },
    dentistasTitle: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#374151'
    },
    dentistasVacio: {
      color: '#9ca3af',
      fontSize: '14px',
      textAlign: 'center',
      padding: '10px',
      margin: 0
    },
    dentistasGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '8px'
    },
    optionalLabel: {
      fontWeight: '400',
      color: '#9ca3af',
      fontSize: '13px'
    },
    inputError: {
      borderColor: '#dc2626',
      backgroundColor: '#fef2f2'
    },
    errorText: {
      color: '#dc2626',
      fontSize: '13px',
      marginTop: '6px'
    },
    iconButton: {
      padding: '6px 10px',
      fontSize: '14px',
      lineHeight: 1
    },
    textoLargo: {
      overflowWrap: 'anywhere',
      wordBreak: 'break-word'
    },
    cardsList: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
      gap: '16px',
      marginBottom: '40px'
    },
    clinicaCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      minWidth: 0
    },
    cardTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '8px',
      flexWrap: 'wrap',
      marginBottom: '12px'
    },
    cardNombre: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1f2937',
      overflowWrap: 'anywhere'
    },
    cardDatos: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      columnGap: '12px',
      rowGap: '6px',
      margin: '0 0 14px 0',
      fontSize: '14px'
    },
    cardLabel: {
      color: '#6b7280',
      fontWeight: '600',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      paddingTop: '2px'
    },
    cardValor: {
      margin: 0,
      color: '#374151',
      minWidth: 0
    },
    cardAcciones: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    },
    avisoLimite: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      color: '#1e3a8a',
      padding: '10px 14px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    avisoSoloLectura: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#7f1d1d',
      padding: '10px 14px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    copyButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#3b82f6',
      fontSize: '14px',
      padding: '2px 6px',
      borderRadius: '4px',
      transition: 'background 0.2s'
    },
    dentistaItem: {
      backgroundColor: '#f9fafb',
      padding: '10px 12px',
      borderRadius: '6px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    dentistaInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    dentistaNombre: {
      fontWeight: '600',
      color: '#1f2937',
      fontSize: '14px'
    },
    dentistaEspecialidad: {
      color: '#6b7280',
      fontSize: '12px'
    },
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
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    modalTitle: {
      margin: 0,
      color: '#1f2937',
      fontSize: '24px',
      fontWeight: 'bold'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '4px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '600',
      color: '#374151',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '30px'
    },
    cancelButton: {
      padding: '10px 20px',
      backgroundColor: '#6b7280',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    submitButton: {
      padding: '10px 20px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    loadingText: {
      textAlign: 'center',
      color: '#6b7280',
      padding: '40px',
      fontSize: '16px'
    },
    emptyState: {
      textAlign: 'center',
      color: '#6b7280',
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '2px dashed #d1d5db'
    },
    clinicaInfoHeader: {
      backgroundColor: '#f1f5f9',
      padding: '10px',
      borderRadius: '6px',
      marginBottom: '15px',
      textAlign: 'center',
      fontWeight: '600',
      color: '#475569'
    },
    retencionSection: {
      backgroundColor: '#f0f9ff',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      borderLeft: '4px solid #2563eb'
    },
    retencionTitle: {
      fontSize: '15px',
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: '10px'
    },
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '15px'
    },
    radioOption: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    radioInput: {
      margin: 0
    },
    radioLabel: {
      fontSize: '14px',
      color: '#374151'
    },
    limiteInfo: {
      fontSize: '14px',
      color: '#475569',
      marginTop: '8px',
      padding: '8px 12px',
      backgroundColor: '#f1f5f9',
      borderRadius: '6px',
      display: 'inline-block'
    }
  };

  // ---------- Piezas de la vista (compartidas por tabla y tarjetas) ----------
  const renderCodigo = (clinica: Clinica) => (
    <div style={styles.codigoCell}>
      <span style={styles.codigoText}>CLI-{clinica.id.slice(-4)}</span>
      <button
        style={styles.copyButton}
        onClick={() => copiarID(clinica.id, 'clínica')}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        title="Copiar ID completo"
        aria-label="Copiar ID completo"
      >
        📋
      </button>
    </div>
  );

  const renderRetencion = (clinica: Clinica, completo: boolean) =>
    clinica.tipo_retencion === 'con_retencion' ? (
      <span style={{ ...styles.retencionBadge, ...(completo ? styles.badgeMultilinea : {}) }} title="La clínica retiene el 15,25% y lo declara al SII">
        🏛️ {completo ? 'Con retención 15,25% (la clínica declara)' : 'Con 15,25%'}
      </span>
    ) : (
      <span style={{ ...styles.retencionBadge, ...styles.retencionBadgeSin, ...(completo ? styles.badgeMultilinea : {}) }} title="Tú declaras el PPM al SII">
        💼 {completo ? 'Sin retención (tú declaras el PPM)' : 'Sin retención'}
      </span>
    );

  const renderDentistas = (clinica: Clinica) => {
    const dentistasClinica = dentistasPorClinica(clinica.id);
    return (
      <div style={styles.dentistasSection}>
        <div style={styles.dentistasHeader}>
          <span style={styles.dentistasTitle}>
            👨‍⚕️ Dentistas de {clinica.nombre} ({dentistasClinica.length})
          </span>
          <button onClick={() => abrirModalDentista(clinica.id)} style={styles.secondaryButton}>
            + Agregar Dentista
          </button>
        </div>
        {dentistasClinica.length === 0 ? (
          <p style={styles.dentistasVacio}>No hay dentistas asignados</p>
        ) : (
          <div style={styles.dentistasGrid}>
            {dentistasClinica.map((dentista) => (
              <div key={dentista.id} style={styles.dentistaItem}>
                <div style={styles.dentistaInfo}>
                  <span style={styles.dentistaNombre}>{dentista.nombre}</span>
                  <span style={styles.dentistaEspecialidad}>{dentista.especialidad}</span>
                </div>
                <button onClick={() => eliminarDentista(dentista)} style={styles.deleteButton}>
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Header
        user={usuario ? {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.user_metadata?.nombre || usuario.email?.split('@')[0] || 'Usuario',
          rol: 'user',
          laboratorio: 'Laboratorio Dental'
        } : undefined}
        onLogout={handleLogout}
        showBackButton={true}
        onBack={handleVolver}
        title="Gestión de Clínicas"
        showTitle={true}
      />

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h1 style={styles.title}>🏥 Gestión de Clínicas</h1>
            {!membresia.cargando && membresia.laboratorioId && (
              <span style={styles.limiteInfo}>
                {membresia.limiteClinicas !== null
                  ? `📊 ${clinicas.length} / ${membresia.limiteClinicas} clínicas`
                  : `⭐ Plan ${membresia.planNombre} (ilimitado)`}
              </span>
            )}
          </div>

          <button
            onClick={() => abrirModalClinica()}
            style={{
              ...styles.addButton,
              ...(!puedeCrearClinica ? styles.addButtonDisabled : {})
            }}
            disabled={!puedeCrearClinica}
            title={!puedeCrearClinica ? mensajeLimite : ''}
          >
            + Agregar Clínica
          </button>
        </div>

        {!membresia.cargando && !puedeCrearClinica && mensajeLimite && (
          <div style={membresia.soloLectura ? styles.avisoSoloLectura : styles.avisoLimite} role="status">
            {membresia.soloLectura ? '⚠️ ' : 'ℹ️ '}{mensajeLimite}
          </div>
        )}

        {cargando && clinicas.length === 0 ? (
          <div style={styles.loadingText}>Cargando clínicas...</div>
        ) : (
          <div>
            {clinicas.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ marginBottom: '20px' }}>
                  No hay clínicas registradas. Haz clic en "Agregar Clínica" para comenzar.
                </p>
                <button
                  onClick={() => abrirModalClinica()}
                  style={{
                    ...styles.addButton,
                    ...(!puedeCrearClinica ? styles.addButtonDisabled : {})
                  }}
                  disabled={!puedeCrearClinica}
                >
                  + Agregar Primera Clínica
                </button>
              </div>
            ) : (
              vistaTarjetas ? (
                <div style={styles.cardsList}>
                  {clinicas.map((clinica) => {
                    const dentistasClinica = dentistasPorClinica(clinica.id);
                    const expandida = clinicasExpandidas.includes(clinica.id);
                    return (
                      <div key={clinica.id} style={styles.clinicaCard}>
                        <div style={styles.cardTop}>
                          <h3 style={styles.cardNombre}>{clinica.nombre}</h3>
                          {renderCodigo(clinica)}
                        </div>
                        <dl style={styles.cardDatos}>
                          <dt style={styles.cardLabel}>RUT</dt>
                          <dd style={styles.cardValor}>{clinica.rut ? formatearRut(clinica.rut) : <span style={styles.emptyCell}>—</span>}</dd>
                          <dt style={styles.cardLabel}>Dirección</dt>
                          <dd style={styles.cardValor}>{clinica.direccion || <span style={styles.emptyCell}>—</span>}</dd>
                          <dt style={styles.cardLabel}>Teléfono</dt>
                          <dd style={styles.cardValor}>{clinica.telefono || <span style={styles.emptyCell}>—</span>}</dd>
                          <dt style={styles.cardLabel}>Email</dt>
                          <dd style={{ ...styles.cardValor, ...styles.textoLargo }}>{clinica.email || <span style={styles.emptyCell}>—</span>}</dd>
                          <dt style={styles.cardLabel}>Retención</dt>
                          <dd style={styles.cardValor}>{renderRetencion(clinica, true)}</dd>
                        </dl>
                        <div style={styles.cardAcciones}>
                          <button
                            onClick={() => alternarDentistas(clinica.id)}
                            style={{ ...styles.dentistasToggle, flex: '1 1 140px' }}
                            aria-expanded={expandida}
                          >
                            👨‍⚕️ Dentistas ({dentistasClinica.length}) {expandida ? '▲' : '▼'}
                          </button>
                          <button onClick={() => abrirModalClinica(clinica)} style={{ ...styles.editButton, marginRight: 0, flex: '1 1 90px' }}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => eliminarClinica(clinica)} style={{ ...styles.deleteButton, flex: '1 1 90px' }}>
                            🗑️ Eliminar
                          </button>
                        </div>
                        {expandida && <div style={{ marginTop: '12px' }}>{renderDentistas(clinica)}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Clínica</th>
                      <th style={styles.th}>RUT</th>
                      <th style={styles.th}>Dirección</th>
                      <th style={styles.th}>Contacto</th>
                      <th style={styles.th}>Retención</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Dentistas</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinicas.map((clinica) => {
                      const dentistasClinica = dentistasPorClinica(clinica.id);
                      const expandida = clinicasExpandidas.includes(clinica.id);
                      return (
                        <React.Fragment key={clinica.id}>
                          <tr style={expandida ? styles.rowExpanded : undefined}>
                            <td style={{ ...styles.td, ...styles.nombreCell }}>
                              <div>{clinica.nombre}</div>
                              <div style={{ marginTop: '4px' }}>{renderCodigo(clinica)}</div>
                            </td>
                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                              {clinica.rut ? formatearRut(clinica.rut) : <span style={styles.emptyCell}>—</span>}
                            </td>
                            <td style={styles.td}>
                              {clinica.direccion || <span style={styles.emptyCell}>—</span>}
                            </td>
                            <td style={styles.td}>
                              {!clinica.telefono && !clinica.email && <span style={styles.emptyCell}>—</span>}
                              {clinica.telefono && <div style={{ whiteSpace: 'nowrap' }}>📞 {clinica.telefono}</div>}
                              {clinica.email && <div style={styles.textoLargo}>✉️ {clinica.email}</div>}
                            </td>
                            <td style={styles.td}>{renderRetencion(clinica, false)}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button
                                onClick={() => alternarDentistas(clinica.id)}
                                style={styles.dentistasToggle}
                                title={expandida ? 'Ocultar dentistas' : 'Ver dentistas'}
                                aria-expanded={expandida}
                              >
                                👨‍⚕️ {dentistasClinica.length} {expandida ? '▲' : '▼'}
                              </button>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right' }}>
                              <div style={styles.actionsCell}>
                                <button
                                  onClick={() => abrirModalClinica(clinica)}
                                  style={{ ...styles.editButton, ...styles.iconButton }}
                                  title="Editar clínica"
                                  aria-label={`Editar ${clinica.nombre}`}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => eliminarClinica(clinica)}
                                  style={{ ...styles.deleteButton, ...styles.iconButton }}
                                  title="Eliminar clínica"
                                  aria-label={`Eliminar ${clinica.nombre}`}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>

                          {expandida && (
                            <tr>
                              <td colSpan={7} style={styles.dentistasRowCell}>
                                {renderDentistas(clinica)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )
            )}
          </div>
        )}

        {/* Modales existentes... (sin cambios) */}
        {modalClinicaAbierto && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {clinicaEditando ? '✏️ Editar Clínica' : '🏥 Agregar Nueva Clínica'}
                </h2>
                <button onClick={cerrarModales} style={styles.closeButton}>✕</button>
              </div>

              <form onSubmit={guardarClinica}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre de la Clínica *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ej: Clínica Dental Smile"
                    value={formDataClinica.nombre}
                    onChange={(e) => setFormDataClinica(prev => ({...prev, nombre: e.target.value}))}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>RUT <span style={styles.optionalLabel}>(opcional)</span></label>
                  <input
                    type="text"
                    style={{ ...styles.input, ...(errorRut ? styles.inputError : {}) }}
                    placeholder="Ej: 76.123.456-7"
                    value={formDataClinica.rut}
                    maxLength={12}
                    onChange={(e) => {
                      setErrorRut('');
                      setFormDataClinica(prev => ({...prev, rut: e.target.value}));
                    }}
                    onBlur={() => {
                      const valor = formDataClinica.rut.trim();
                      if (!valor) return;
                      if (validarRut(valor)) {
                        setFormDataClinica(prev => ({...prev, rut: formatearRut(valor)}));
                      } else {
                        setErrorRut('RUT inválido. Revisa el número y el dígito verificador.');
                      }
                    }}
                  />
                  {errorRut && <div style={styles.errorText}>{errorRut}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Dirección</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ej: Av. Principal #123"
                    value={formDataClinica.direccion}
                    onChange={(e) => setFormDataClinica(prev => ({...prev, direccion: e.target.value}))}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Teléfono</label>
                  <input
                    type="tel"
                    style={styles.input}
                    placeholder="Ej: +1 234 567 8900"
                    value={formDataClinica.telefono}
                    onChange={(e) => setFormDataClinica(prev => ({...prev, telefono: e.target.value}))}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    style={styles.input}
                    placeholder="Ej: contacto@clinicadental.com"
                    value={formDataClinica.email}
                    onChange={(e) => setFormDataClinica(prev => ({...prev, email: e.target.value}))}
                  />
                </div>

                <div style={styles.retencionSection}>
                  <div style={styles.retencionTitle}>📋 Configuración de Retención PPM/SII</div>

                  <div style={styles.radioGroup}>
                    <label style={styles.radioOption}>
                      <input
                        type="radio"
                        name="tipo_retencion"
                        style={styles.radioInput}
                        value="sin_retencion"
                        checked={formDataClinica.tipo_retencion === 'sin_retencion'}
                        onChange={(e) => setFormDataClinica(prev => ({...prev, tipo_retencion: e.target.value as 'sin_retencion'}))}
                      />
                      <span style={styles.radioLabel}>
                        <strong>Sin Retención</strong><br />
                        <small>Tú recibes el 100% del pago y te encargas de declarar y pagar el PPM (Pago Provisional Mensual) al SII.</small>
                      </span>
                    </label>

                    <label style={styles.radioOption}>
                      <input
                        type="radio"
                        name="tipo_retencion"
                        style={styles.radioInput}
                        value="con_retencion"
                        checked={formDataClinica.tipo_retencion === 'con_retencion'}
                        onChange={(e) => setFormDataClinica(prev => ({...prev, tipo_retencion: e.target.value as 'con_retencion'}))}
                      />
                      <span style={styles.radioLabel}>
                        <strong>Con Retención (15.25% fijo)</strong><br />
                        <small>La clínica retiene el 15.25% del pago y se encarga de declararlo al SII. Este porcentaje está definido por tu configuración de cuenta.</small>
                      </span>
                    </label>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button type="button" onClick={cerrarModales} style={styles.cancelButton} disabled={cargando}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitButton} disabled={cargando}>
                    {cargando ? 'Guardando...' : (clinicaEditando ? 'Actualizar' : 'Guardar')} Clínica
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalDentistaAbierto && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>👨‍⚕️ Agregar Dentista</h2>
                <button onClick={cerrarModales} style={styles.closeButton}>✕</button>
              </div>

              <div style={styles.clinicaInfoHeader}>
                Para: {getNombreClinicaSeleccionada()}
              </div>

              <form onSubmit={guardarDentista}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre del Dentista *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ej: Dr. Juan Pérez"
                    value={formDataDentista.nombre}
                    onChange={(e) => setFormDataDentista(prev => ({...prev, nombre: e.target.value}))}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Especialidad *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ej: Ortodoncia, Periodoncia, etc."
                    value={formDataDentista.especialidad}
                    onChange={(e) => setFormDataDentista(prev => ({...prev, especialidad: e.target.value}))}
                    required
                  />
                </div>

                <div style={styles.buttonGroup}>
                  <button type="button" onClick={cerrarModales} style={styles.cancelButton} disabled={cargando}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.submitButton} disabled={cargando}>
                    {cargando ? 'Guardando...' : 'Agregar Dentista'}
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

export default GestionClinicas;