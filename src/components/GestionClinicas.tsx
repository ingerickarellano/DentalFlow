import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface GestionClinicasProps {
  onBack?: () => void;
}

interface Clinica {
  id: string;
  nombre: string;
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
  
  const [formDataClinica, setFormDataClinica] = useState({
    nombre: '',
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
        return;
      }

      console.log('Usuario ID:', user.id);

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

      if (clinicasRes.error) {
        console.error('Error cargando clínicas:', clinicasRes.error);
        throw clinicasRes.error;
      }
      if (dentistasRes.error) {
        console.error('Error cargando dentistas:', dentistasRes.error);
        throw dentistasRes.error;
      }

      console.log('Clínicas cargadas:', clinicasRes.data?.length);
      console.log('Dentistas cargados:', dentistasRes.data?.length);

      setClinicas(clinicasRes.data || []);
      setDentistas(dentistasRes.data || []);

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      alert(`Error al cargar los datos: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const abrirModalClinica = (clinica?: Clinica) => {
    if (clinica) {
      setClinicaEditando(clinica);
      setFormDataClinica({
        nombre: clinica.nombre,
        direccion: clinica.direccion || '',
        telefono: clinica.telefono || '',
        email: clinica.email || '',
        tipo_retencion: clinica.tipo_retencion || 'sin_retencion'
      });
    } else {
      setClinicaEditando(null);
      setFormDataClinica({
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        tipo_retencion: 'sin_retencion'
      });
    }
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

    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

      console.log('Guardando clínica para usuario:', user.id);

      // Porcentaje fijo para "Con Retención" - 15.25%
      const PORCENTAJE_RETENCION_FIJO = 15.25;

      const clinicaDataForSupabase = {
        nombre: formDataClinica.nombre.trim(),
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

        if (error) {
          console.error('Error actualizando clínica:', error);
          throw error;
        }

        const clinicaDataForState = {
          nombre: formDataClinica.nombre.trim(),
          direccion: formDataClinica.direccion.trim(),
          telefono: formDataClinica.telefono.trim(),
          email: formDataClinica.email.trim(),
          tipo_retencion: formDataClinica.tipo_retencion,
          porcentaje_retencion: formDataClinica.tipo_retencion === 'con_retencion' ? 
            PORCENTAJE_RETENCION_FIJO : null
        };

        setClinicas(prev => prev.map(c => 
          c.id === clinicaEditando.id ? { ...c, ...clinicaDataForState } : c
        ));
        
        alert('✅ Clínica actualizada exitosamente');
      } else {
        console.log('Datos de clínica a insertar:', clinicaDataForSupabase);

        const { data, error } = await supabase
          .from('clinicas')
          .insert([clinicaDataForSupabase])
          .select();

        if (error) {
          console.error('Error insertando clínica:', error);
          throw error;
        }

        if (data && data.length > 0) {
          setClinicas(prev => [data[0], ...prev]);
          alert('✅ Clínica creada exitosamente');
        } else {
          throw new Error('No se recibieron datos de respuesta');
        }
      }

      cerrarModales();
      
    } catch (error: any) {
      console.error('Error guardando clínica:', error);
      alert(`Error al guardar la clínica: ${error.message}`);
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

      console.log('Usuario ID:', user.id);
      console.log('Clínica seleccionada:', clinicaSeleccionada);

      const dentistaData = {
        nombre: formDataDentista.nombre.trim(),
        especialidad: formDataDentista.especialidad.trim(),
        clinica_id: clinicaSeleccionada,
        usuario_id: user.id
      };

      console.log('Datos del dentista a insertar:', dentistaData);

      const { data, error } = await supabase
        .from('dentistas')
        .insert([dentistaData])
        .select();

      if (error) {
        console.error('Error completo de Supabase:', error);
        
        if (error.code === '42501') {
          throw new Error('Permiso denegado. Necesitas configurar las políticas RLS en Supabase.');
        }
        
        throw error;
      }

      if (data && data.length > 0) {
        setDentistas(prev => [data[0], ...prev]);
        cerrarModales();
        alert('✅ Dentista agregado exitosamente');
      } else {
        throw new Error('No se recibieron datos de respuesta');
      }
      
    } catch (error: any) {
      console.error('Error guardando dentista:', error);
      
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        alert(`❌ Error de permisos: ${error.message}\n\nPor favor, configura las políticas RLS en Supabase para permitir insertar dentistas.`);
      } else {
        alert(`Error al guardar el dentista: ${error.message}`);
      }
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
      
      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

      const { error: errorDentistas } = await supabase
        .from('dentistas')
        .delete()
        .eq('clinica_id', clinica.id)
        .eq('usuario_id', user.id);

      if (errorDentistas) {
        console.error('Error eliminando dentistas:', errorDentistas);
      }

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
      
      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }

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

  const getNombreClinicaSeleccionada = () => {
    const clinica = clinicas.find(c => c.id === clinicaSeleccionada);
    return clinica ? clinica.nombre : 'Clínica no encontrada';
  };

  // Comentado ya que no se usa en el código actual
  // const getTipoRetencionTexto = (clinica: Clinica) => {
  //   if (clinica.tipo_retencion === 'con_retencion') {
  //     return '💰 Con Retención (15.25% fijo) - La clínica retiene y declara al SII';
  //   } else {
  //     return '💰 Sin Retención - Tú recibes el total y declaras el PPM al SII';
  //   }
  // };

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      maxWidth: '1200px',
      margin: '0 auto'
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
      fontSize: '14px'
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
    clinicasGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      gap: '20px',
      marginBottom: '40px'
    },
    clinicaCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    clinicaHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '15px'
    },
    clinicaNombre: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: 0,
      marginBottom: '8px'
    },
    clinicaInfo: {
      color: '#6b7280',
      marginBottom: '6px',
      fontSize: '14px'
    },
    retencionInfo: {
      color: '#1e40af',
      backgroundColor: '#dbeafe',
      padding: '8px 12px',
      borderRadius: '6px',
      marginBottom: '12px',
      fontSize: '13px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    dentistasSection: {
      marginTop: '20px',
      paddingTop: '15px',
      borderTop: '1px solid #f3f4f6'
    },
    dentistasTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '10px'
    },
    dentistaItem: {
      backgroundColor: '#f9fafb',
      padding: '10px 12px',
      borderRadius: '6px',
      marginBottom: '8px',
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
    cardActions: {
      display: 'flex',
      gap: '8px',
      marginTop: '15px'
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
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={handleVolver}
            style={styles.backButton}
          >
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>🏥 Gestión de Clínicas</h1>
        </div>
        
        <button 
          onClick={() => abrirModalClinica()}
          style={styles.addButton}
        >
          + Agregar Clínica
        </button>
      </div>

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
                style={styles.addButton}
              >
                + Agregar Primera Clínica
              </button>
            </div>
          ) : (
            <div style={styles.clinicasGrid}>
              {clinicas.map((clinica) => (
                <div key={clinica.id} style={styles.clinicaCard}>
                  <div style={styles.clinicaHeader}>
                    <div style={{ flex: 1 }}>
                      <h3 style={styles.clinicaNombre}>{clinica.nombre}</h3>
                      
                      {clinica.tipo_retencion === 'con_retencion' ? (
                        <div style={styles.retencionInfo}>
                          🏛️ Con Retención (15.25%) - La clínica retiene y declara
                        </div>
                      ) : (
                        <div style={styles.retencionInfo}>
                          💼 Sin Retención - Tú declaras el PPM al SII
                        </div>
                      )}
                      
                      {clinica.direccion && (
                        <div style={styles.clinicaInfo}>📍 {clinica.direccion}</div>
                      )}
                      {clinica.telefono && (
                        <div style={styles.clinicaInfo}>📞 {clinica.telefono}</div>
                      )}
                      {clinica.email && (
                        <div style={styles.clinicaInfo}>✉️ {clinica.email}</div>
                      )}
                    </div>
                  </div>

                  <div style={styles.dentistasSection}>
                    <div style={styles.dentistasTitle}>
                      👨‍⚕️ Dentistas ({dentistasPorClinica(clinica.id).length})
                    </div>
                    
                    {dentistasPorClinica(clinica.id).length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '10px' }}>
                        No hay dentistas asignados
                      </p>
                    ) : (
                      dentistasPorClinica(clinica.id).map((dentista) => (
                        <div key={dentista.id} style={styles.dentistaItem}>
                          <div style={styles.dentistaInfo}>
                            <span style={styles.dentistaNombre}>{dentista.nombre}</span>
                            <span style={styles.dentistaEspecialidad}>{dentista.especialidad}</span>
                          </div>
                          <button 
                            onClick={() => eliminarDentista(dentista)}
                            style={styles.deleteButton}
                          >
                            Eliminar
                          </button>
                        </div>
                      ))
                    )}
                    
                    <button 
                      onClick={() => abrirModalDentista(clinica.id)}
                      style={styles.secondaryButton}
                    >
                      + Agregar Dentista
                    </button>
                  </div>

                  <div style={styles.cardActions}>
                    <button 
                      onClick={() => abrirModalClinica(clinica)}
                      style={styles.editButton}
                    >
                      ✏️ Editar Clínica
                    </button>
                    <button 
                      onClick={() => eliminarClinica(clinica)}
                      style={styles.deleteButton}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalClinicaAbierto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {clinicaEditando ? '✏️ Editar Clínica' : '🏥 Agregar Nueva Clínica'}
              </h2>
              <button 
                onClick={cerrarModales}
                style={styles.closeButton}
              >
                ✕
              </button>
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
                <button 
                  type="button"
                  onClick={cerrarModales}
                  style={styles.cancelButton}
                  disabled={cargando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={styles.submitButton}
                  disabled={cargando}
                >
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
              <button 
                onClick={cerrarModales}
                style={styles.closeButton}
              >
                ✕
              </button>
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
                <button 
                  type="button"
                  onClick={cerrarModales}
                  style={styles.cancelButton}
                  disabled={cargando}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={styles.submitButton}
                  disabled={cargando}
                >
                  {cargando ? 'Guardando...' : 'Agregar Dentista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionClinicas;