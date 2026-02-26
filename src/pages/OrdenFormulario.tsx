import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { QRCodeSVG } from 'qrcode.react';

// Tipos para superficies y piezas dentales
type Superficie = 'oclusal' | 'mesial' | 'distal' | 'vestibular' | 'lingual';
type TipoTrabajo = 'incrustacion' | 'corona' | 'puente' | null;

interface PiezaDental {
  superficies: Record<Superficie, TipoTrabajo>;
}

// Datos de la orden
interface OrdenData {
  paciente: string;
  clinica_id: string;
  dentista_id: string;
  laboratorista_id: string;
  fecha_entrega_estimada: string;
  notas: string;

  protesista_nombre: string;
  doctor_nombre: string;
  direccion: string;
  cp: string;
  telefono: string;

  analisis_impresion: 'buena' | 'regular' | 'mala' | '';
  analisis_modelo: 'buena' | 'regular' | 'mala' | '';

  aporta_registros: boolean;
  cuales_registros: string;

  articulado: 'no_ajustable' | 'semi_ajustable' | 'totalmente_ajustable' | '';
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

  piezas: Record<number, PiezaDental>;
}

// Números de dientes (FDI)
const dientesSuperiores = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const dientesInferiores = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const todosDientes = [...dientesSuperiores, ...dientesInferiores];

const crearPiezaVacia = (): PiezaDental => ({
  superficies: {
    oclusal: null,
    mesial: null,
    distal: null,
    vestibular: null,
    lingual: null,
  },
});

const OrdenFormulario: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [cargando, setCargando] = useState(false);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [dentistas, setDentistas] = useState<any[]>([]);
  const [laboratoristas, setLaboratoristas] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<any>({ nombre: 'Cargando...' });
  const [trabajoId, setTrabajoId] = useState<string | null>(null);
  const [configLaboratorio, setConfigLaboratorio] = useState<any>(null);
  const [dienteEnEdicion, setDienteEnEdicion] = useState<number | null>(null);

  const [formData, setFormData] = useState<OrdenData>({
    paciente: '',
    clinica_id: '',
    dentista_id: '',
    laboratorista_id: '',
    fecha_entrega_estimada: '',
    notas: '',
    protesista_nombre: 'Selene Embati López y Teresa Castillo Saldaña',
    doctor_nombre: '',
    direccion: '',
    cp: '',
    telefono: '',
    analisis_impresion: '',
    analisis_modelo: '',
    aporta_registros: false,
    cuales_registros: '',
    articulado: '',
    metalica: false,
    estetica: false,
    especificaciones: '',
    aleacion: '',
    material_estetico: '',
    tipo_pontico: '',
    color: '',
    protesis_removible: false,
    protesis_total: false,
    protesis_parcial: false,
    removable: false,
    diseno_esqueleto: '',
    ortodoncia_superior: false,
    ortodoncia_inferior: false,
    aparato_realizar: '',
    tipo_yeso: '',
    firma: '',
    fecha_entrega: '',
    costo_final: null,
    piezas: {},
  });

  // Inicializar todas las piezas vacías
  useEffect(() => {
    if (Object.keys(formData.piezas).length === 0) {
      const piezasIniciales: Record<number, PiezaDental> = {};
      todosDientes.forEach(num => {
        piezasIniciales[num] = crearPiezaVacia();
      });
      setFormData(prev => ({ ...prev, piezas: piezasIniciales }));
    }
  }, []);

  useEffect(() => {
    cargarDatosIniciales();
    if (id) cargarOrden(id);
  }, [id]);

  const cargarDatosIniciales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const { data: config } = await supabase
        .from('configuracion_laboratorio')
        .select('*')
        .eq('usuario_id', user.id)
        .single();
      setConfigLaboratorio(config);

      const [clinicasRes, dentistasRes, laboratoristasRes] = await Promise.all([
        supabase.from('clinicas').select('id,nombre').eq('usuario_id', user.id),
        supabase.from('dentistas').select('id,nombre,clinica_id').eq('usuario_id', user.id),
        supabase.from('laboratoristas').select('id,nombre').eq('usuario_id', user.id),
      ]);
      setClinicas(clinicasRes.data || []);
      setDentistas(dentistasRes.data || []);
      setLaboratoristas(laboratoristasRes.data || []);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    }
  };

  const cargarOrden = async (ordenId: string) => {
    try {
      const { data, error } = await supabase
        .from('ordenes_trabajo')
        .select(`*, trabajo:trabajo_id (*)`)
        .eq('id', ordenId)
        .single();
      if (error) throw error;
      if (data) {
        setTrabajoId(data.trabajo_id);
        setFormData({
          paciente: data.trabajo?.paciente || '',
          clinica_id: data.trabajo?.clinica_id || '',
          dentista_id: data.trabajo?.dentista_id || '',
          laboratorista_id: data.trabajo?.laboratorista_id || '',
          fecha_entrega_estimada: data.trabajo?.fecha_entrega_estimada || '',
          notas: data.trabajo?.notas || '',
          protesista_nombre: data.protesista_nombre || 'Selene Embati López y Teresa Castillo Saldaña',
          doctor_nombre: data.doctor_nombre || '',
          direccion: data.direccion || '',
          cp: data.cp || '',
          telefono: data.telefono || '',
          analisis_impresion: data.analisis_impresion || '',
          analisis_modelo: data.analisis_modelo || '',
          aporta_registros: data.aporta_registros || false,
          cuales_registros: data.cuales_registros || '',
          articulado: data.articulado || '',
          metalica: data.metalica || false,
          estetica: data.estetica || false,
          especificaciones: data.especificaciones || '',
          aleacion: data.aleacion || '',
          material_estetico: data.material_estetico || '',
          tipo_pontico: data.tipo_pontico || '',
          color: data.color || '',
          protesis_removible: data.protesis_removible || false,
          protesis_total: data.protesis_total || false,
          protesis_parcial: data.protesis_parcial || false,
          removable: data.removable || false,
          diseno_esqueleto: data.diseno_esqueleto || '',
          ortodoncia_superior: data.ortodoncia_superior || false,
          ortodoncia_inferior: data.ortodoncia_inferior || false,
          aparato_realizar: data.aparato_realizar || '',
          tipo_yeso: data.tipo_yeso || '',
          firma: data.firma || '',
          fecha_entrega: data.fecha_entrega || '',
          costo_final: data.costo_final,
          piezas: data.piezas || {},
        });
      }
    } catch (error) {
      console.error('Error cargando orden:', error);
      alert('Error al cargar la orden');
    }
  };

  const handleChange = (campo: keyof OrdenData, valor: any) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSuperficieChange = (diente: number, superficie: Superficie, tipo: TipoTrabajo) => {
    setFormData(prev => ({
      ...prev,
      piezas: {
        ...prev.piezas,
        [diente]: {
          ...prev.piezas[diente],
          superficies: {
            ...prev.piezas[diente].superficies,
            [superficie]: tipo,
          },
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (!formData.paciente) throw new Error('El nombre del paciente es requerido');
      if (!formData.clinica_id) throw new Error('Debe seleccionar una clínica');
      if (!formData.dentista_id) throw new Error('Debe seleccionar un dentista');

      const trabajoData = {
        paciente: formData.paciente,
        clinica_id: formData.clinica_id || null,
        dentista_id: formData.dentista_id || null,
        laboratorista_id: formData.laboratorista_id || null,
        servicios: [],
        estado: 'pendiente',
        precio_total: formData.costo_final || 0,
        fecha_creacion: new Date().toISOString(),
        fecha_entrega_estimada: formData.fecha_entrega_estimada || null,
        notas: formData.notas,
        modo: 'clinica',
        usuario_id: usuario.id
      };

      let nuevoTrabajoId: string;

      if (id && trabajoId) {
        const { error } = await supabase
          .from('trabajos')
          .update(trabajoData)
          .eq('id', trabajoId);
        if (error) throw error;
        nuevoTrabajoId = trabajoId;
      } else {
        const { data: nuevoTrabajo, error } = await supabase
          .from('trabajos')
          .insert([trabajoData])
          .select();
        if (error) throw error;
        if (!nuevoTrabajo || nuevoTrabajo.length === 0) {
          throw new Error('No se pudo crear el trabajo');
        }
        nuevoTrabajoId = nuevoTrabajo[0].id;
      }

      const ordenData = {
        trabajo_id: nuevoTrabajoId,
        usuario_id: usuario.id,
        protesista_nombre: formData.protesista_nombre,
        doctor_nombre: formData.doctor_nombre,
        direccion: formData.direccion,
        cp: formData.cp,
        telefono: formData.telefono,
        analisis_impresion: formData.analisis_impresion || null,
        analisis_modelo: formData.analisis_modelo || null,
        aporta_registros: formData.aporta_registros,
        cuales_registros: formData.cuales_registros,
        articulado: formData.articulado || null,
        metalica: formData.metalica,
        estetica: formData.estetica,
        especificaciones: formData.especificaciones,
        aleacion: formData.aleacion,
        material_estetico: formData.material_estetico,
        tipo_pontico: formData.tipo_pontico,
        color: formData.color,
        protesis_removible: formData.protesis_removible,
        protesis_total: formData.protesis_total,
        protesis_parcial: formData.protesis_parcial,
        removable: formData.removable,
        diseno_esqueleto: formData.diseno_esqueleto,
        ortodoncia_superior: formData.ortodoncia_superior,
        ortodoncia_inferior: formData.ortodoncia_inferior,
        aparato_realizar: formData.aparato_realizar,
        tipo_yeso: formData.tipo_yeso,
        firma: formData.firma,
        fecha_entrega: formData.fecha_entrega || null,
        costo_final: formData.costo_final,
        piezas: formData.piezas,
      };

      if (id) {
        const { error } = await supabase
          .from('ordenes_trabajo')
          .update(ordenData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ordenes_trabajo')
          .insert([ordenData]);
        if (error) throw error;
      }

      alert('✅ Orden guardada correctamente');
      navigate('/ordenes');
    } catch (error: any) {
      console.error('Error detallado:', error);
      alert('❌ Error al guardar: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Determinar si un diente tiene alguna superficie seleccionada
  const dienteTieneSeleccion = (num: number): boolean => {
    const pieza = formData.piezas[num];
    if (!pieza) return false;
    return Object.values(pieza.superficies).some(v => v !== null);
  };

  // ================== ESTILOS COMPACTOS EN BLANCO Y NEGRO ==================
  interface Styles {
    container: React.CSSProperties;
    paper: React.CSSProperties;
    header: React.CSSProperties;
    headerLeft: React.CSSProperties;
    headerRight: React.CSSProperties;
    title: React.CSSProperties;
    subtitle: React.CSSProperties;
    twoColumnLayout: React.CSSProperties;
    column: React.CSSProperties;
    section: React.CSSProperties;
    sectionTitle: React.CSSProperties;
    grid2: React.CSSProperties;
    grid3: React.CSSProperties;
    field: React.CSSProperties;
    label: React.CSSProperties;
    input: React.CSSProperties;
    checkboxGroup: React.CSSProperties;
    checkboxLabel: React.CSSProperties;
    radioGroup: React.CSSProperties;
    dentaduraContainer: React.CSSProperties;
    arcada: React.CSSProperties;
    arcadaLabel: React.CSSProperties;
    dientesGrid: React.CSSProperties;
    dienteButton: (tieneSeleccion: boolean) => React.CSSProperties;
    leyenda: React.CSSProperties;
    leyendaItem: (color: string) => React.CSSProperties;
    colorBox: React.CSSProperties;
    buttonPrimary: React.CSSProperties;
    buttonSecondary: React.CSSProperties;
    modalOverlay: React.CSSProperties;
    modalContent: React.CSSProperties;
    superficieItem: React.CSSProperties;
    superficieLabel: React.CSSProperties;
    superficieSelect: React.CSSProperties;
  }

  const styles: Styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '10px',
      fontFamily: 'Arial, sans-serif',
    },
    paper: {
      backgroundColor: '#ffffff',
      border: '1px solid #000',
      padding: '15px',
      marginBottom: '10px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      borderBottom: '1px solid #000',
      paddingBottom: '10px',
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      textAlign: 'center',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#000',
      margin: '0 0 2px 0',
    },
    subtitle: {
      fontSize: '0.8rem',
      color: '#333',
    },
    twoColumnLayout: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    section: {
      border: '1px solid #000',
      padding: '10px',
      backgroundColor: '#fff',
    },
    sectionTitle: {
      fontSize: '1rem',
      fontWeight: 'bold',
      color: '#000',
      marginBottom: '8px',
      borderBottom: '1px solid #000',
      paddingBottom: '4px',
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
    },
    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
    },
    field: {
      marginBottom: '6px',
    },
    label: {
      display: 'block',
      marginBottom: '2px',
      fontWeight: 'bold',
      color: '#000',
      fontSize: '0.8rem',
    },
    input: {
      width: '100%',
      padding: '4px 6px',
      border: '1px solid #000',
      borderRadius: '0',
      fontSize: '0.8rem',
      backgroundColor: '#fff',
      color: '#000',
      boxSizing: 'border-box',
    },
    checkboxGroup: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: '0.8rem',
      cursor: 'pointer',
    },
    radioGroup: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    },
    dentaduraContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '5px',
    },
    arcada: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    arcadaLabel: {
      fontWeight: 'bold',
      marginBottom: '5px',
      color: '#000',
      fontSize: '0.8rem',
    },
    dientesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      gap: '4px',
      maxWidth: '450px',
      margin: '0 auto',
    },
    dienteButton: (tieneSeleccion: boolean): React.CSSProperties => ({
      width: '35px',
      height: '35px',
      border: tieneSeleccion ? '2px solid #000' : '1px solid #000',
      backgroundColor: tieneSeleccion ? '#ccc' : '#fff',
      color: '#000',
      fontWeight: 'bold',
      fontSize: '11px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'none',
      boxShadow: 'none',
    }),
    leyenda: {
      display: 'flex',
      gap: '15px',
      justifyContent: 'center',
      marginTop: '8px',
      fontSize: '0.75rem',
    },
    leyendaItem: (color: string): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      color: '#000',
    }),
    colorBox: {
      width: '12px',
      height: '12px',
      border: '1px solid #000',
      backgroundColor: '#fff',
    },
    buttonPrimary: {
      backgroundColor: '#000',
      color: '#fff',
      padding: '6px 12px',
      border: '1px solid #000',
      borderRadius: '0',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      cursor: 'pointer',
    },
    buttonSecondary: {
      backgroundColor: '#fff',
      color: '#000',
      padding: '6px 12px',
      border: '1px solid #000',
      borderRadius: '0',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      cursor: 'pointer',
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
    },
    modalContent: {
      backgroundColor: '#fff',
      padding: '15px',
      border: '1px solid #000',
      maxWidth: '400px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
    },
    superficieItem: {
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    superficieLabel: {
      width: '80px',
      fontWeight: 'bold',
      fontSize: '0.8rem',
      textTransform: 'capitalize',
    },
    superficieSelect: {
      padding: '3px 6px',
      border: '1px solid #000',
      borderRadius: '0',
      flex: 1,
      fontSize: '0.8rem',
      backgroundColor: '#fff',
    },
  };

  return (
    <>
      <Header
        user={usuario}
        onLogout={() => supabase.auth.signOut()}
        showBackButton={true}
        onBack={() => navigate('/ordenes')}
        title={id ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
        showTitle={true}
      />
      <div style={styles.container}>
        <form onSubmit={handleSubmit}>
          <div style={styles.paper}>
            {/* Encabezado con nombre del laboratorio y QR */}
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <h1 style={styles.title}>
                  {configLaboratorio?.nombre_laboratorio || 'Laboratorio Dental'}
                </h1>
                <p style={styles.subtitle}>
                  {configLaboratorio?.direccion} | {configLaboratorio?.telefono}
                </p>
              </div>
              {id && trabajoId && (
                <div style={styles.headerRight}>
                  <QRCodeSVG value={trabajoId} size={60} />
                  <p style={{ fontSize: '0.6rem', marginTop: '2px' }}>
                    ID: {trabajoId.slice(0, 8)}
                  </p>
                </div>
              )}
            </div>

            {/* Dos columnas */}
            <div style={styles.twoColumnLayout}>
              {/* Columna izquierda */}
              <div style={styles.column}>
                {/* Datos del caso */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📋 Datos del caso</h3>
                  <div style={styles.grid2}>
                    <div style={styles.field}>
                      <label style={styles.label}>Protesista</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.protesista_nombre}
                        onChange={(e) => handleChange('protesista_nombre', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Doctor</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.doctor_nombre}
                        onChange={(e) => handleChange('doctor_nombre', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Dirección</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.direccion}
                        onChange={(e) => handleChange('direccion', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>CP</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.cp}
                        onChange={(e) => handleChange('cp', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Teléfono</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.telefono}
                        onChange={(e) => handleChange('telefono', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Paciente *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.paciente}
                        onChange={(e) => handleChange('paciente', e.target.value)}
                        required
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Clínica *</label>
                      <select
                        style={styles.input}
                        value={formData.clinica_id}
                        onChange={(e) => handleChange('clinica_id', e.target.value)}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {clinicas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Dentista *</label>
                      <select
                        style={styles.input}
                        value={formData.dentista_id}
                        onChange={(e) => handleChange('dentista_id', e.target.value)}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {dentistas
                          .filter(d => !formData.clinica_id || d.clinica_id === formData.clinica_id)
                          .map(d => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                      </select>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Laboratorista</label>
                      <select
                        style={styles.input}
                        value={formData.laboratorista_id}
                        onChange={(e) => handleChange('laboratorista_id', e.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {laboratoristas.map(l => (
                          <option key={l.id} value={l.id}>{l.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Fecha entrega estimada</label>
                      <input
                        type="date"
                        style={styles.input}
                        value={formData.fecha_entrega_estimada}
                        onChange={(e) => handleChange('fecha_entrega_estimada', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Análisis de impresión y modelo */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🔍 Análisis</h3>
                  <div style={styles.grid2}>
                    <div>
                      <label style={styles.label}>Impresión</label>
                      <div style={styles.radioGroup}>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="analisis_impresion"
                            value="buena"
                            checked={formData.analisis_impresion === 'buena'}
                            onChange={(e) => handleChange('analisis_impresion', e.target.value)}
                          /> Buena
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="analisis_impresion"
                            value="regular"
                            checked={formData.analisis_impresion === 'regular'}
                            onChange={(e) => handleChange('analisis_impresion', e.target.value)}
                          /> Regular
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="analisis_impresion"
                            value="mala"
                            checked={formData.analisis_impresion === 'mala'}
                            onChange={(e) => handleChange('analisis_impresion', e.target.value)}
                          /> Mala
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Modelo</label>
                      <div style={styles.radioGroup}>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="analisis_modelo"
                            value="buena"
                            checked={formData.analisis_modelo === 'buena'}
                            onChange={(e) => handleChange('analisis_modelo', e.target.value)}
                          /> Buena
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="analisis_modelo"
                            value="regular"
                            checked={formData.analisis_modelo === 'regular'}
                            onChange={(e) => handleChange('analisis_modelo', e.target.value)}
                          /> Regular
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="analisis_modelo"
                            value="mala"
                            checked={formData.analisis_modelo === 'mala'}
                            onChange={(e) => handleChange('analisis_modelo', e.target.value)}
                          /> Mala
                        </label>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.aporta_registros}
                        onChange={(e) => handleChange('aporta_registros', e.target.checked)}
                      /> Aporta registros
                    </label>
                    {formData.aporta_registros && (
                      <input
                        type="text"
                        placeholder="¿Cuáles?"
                        style={{ ...styles.input, width: '180px' }}
                        value={formData.cuales_registros}
                        onChange={(e) => handleChange('cuales_registros', e.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Articulación */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🦷 Articulación</h3>
                  <div style={styles.grid3}>
                    <div>
                      <label style={styles.label}>Tipo</label>
                      <div>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="articulado"
                            value="no_ajustable"
                            checked={formData.articulado === 'no_ajustable'}
                            onChange={(e) => handleChange('articulado', e.target.value)}
                          /> No aj.
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="articulado"
                            value="semi_ajustable"
                            checked={formData.articulado === 'semi_ajustable'}
                            onChange={(e) => handleChange('articulado', e.target.value)}
                          /> Semi aj.
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="radio"
                            name="articulado"
                            value="totalmente_ajustable"
                            checked={formData.articulado === 'totalmente_ajustable'}
                            onChange={(e) => handleChange('articulado', e.target.value)}
                          /> Total aj.
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Características</label>
                      <div>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.metalica}
                            onChange={(e) => handleChange('metalica', e.target.checked)}
                          /> Metálica
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.estetica}
                            onChange={(e) => handleChange('estetica', e.target.checked)}
                          /> Estética
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Especificaciones</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.especificaciones}
                        onChange={(e) => handleChange('especificaciones', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Prótesis removible */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🔄 Prótesis removible</h3>
                  <div>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.protesis_removible}
                        onChange={(e) => handleChange('protesis_removible', e.target.checked)}
                      /> Sí
                    </label>
                    {formData.protesis_removible && (
                      <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.protesis_total}
                            onChange={(e) => handleChange('protesis_total', e.target.checked)}
                          /> Total
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.protesis_parcial}
                            onChange={(e) => handleChange('protesis_parcial', e.target.checked)}
                          /> Parcial
                        </label>
                        <label style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={formData.removable}
                            onChange={(e) => handleChange('removable', e.target.checked)}
                          /> Removable
                        </label>
                        <input
                          type="text"
                          placeholder="Diseño esqueleto"
                          style={{ ...styles.input, width: '180px' }}
                          value={formData.diseno_esqueleto}
                          onChange={(e) => handleChange('diseno_esqueleto', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna derecha */}
              <div style={styles.column}>
                {/* Selector de dientes con superficies */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🦷 Selección de piezas</h3>
                  <p style={{ fontSize: '0.75rem', marginBottom: '5px' }}>
                    Clic en diente: <strong>rojo</strong> incrustación, <strong>azul</strong> corona, <strong>verde</strong> puente.
                  </p>

                  <div style={styles.dentaduraContainer}>
                    {/* Arcada superior */}
                    <div style={styles.arcada}>
                      <div style={styles.arcadaLabel}>Superiores</div>
                      <div style={styles.dientesGrid}>
                        {dientesSuperiores.map(num => (
                          <button
                            key={num}
                            type="button"
                            style={styles.dienteButton(dienteTieneSeleccion(num))}
                            onClick={() => setDienteEnEdicion(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Arcada inferior */}
                    <div style={styles.arcada}>
                      <div style={styles.arcadaLabel}>Inferiores</div>
                      <div style={styles.dientesGrid}>
                        {dientesInferiores.map(num => (
                          <button
                            key={num}
                            type="button"
                            style={styles.dienteButton(dienteTieneSeleccion(num))}
                            onClick={() => setDienteEnEdicion(num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={styles.leyenda}>
                    <div style={styles.leyendaItem('#ef4444')}>
                      <span style={{ ...styles.colorBox, backgroundColor: '#ef4444' }} /> Incrust.
                    </div>
                    <div style={styles.leyendaItem('#3b82f6')}>
                      <span style={{ ...styles.colorBox, backgroundColor: '#3b82f6' }} /> Corona
                    </div>
                    <div style={styles.leyendaItem('#10b981')}>
                      <span style={{ ...styles.colorBox, backgroundColor: '#10b981' }} /> Puente
                    </div>
                  </div>
                </div>

                {/* Modal para editar superficies de un diente */}
                {dienteEnEdicion !== null && (
                  <div style={styles.modalOverlay} onClick={() => setDienteEnEdicion(null)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                      <h4 style={{ marginBottom: '10px' }}>Diente {dienteEnEdicion}</h4>
                      {(['oclusal', 'mesial', 'distal', 'vestibular', 'lingual'] as Superficie[]).map(sup => {
                        const tipoActual = formData.piezas[dienteEnEdicion]?.superficies[sup] || '';
                        return (
                          <div key={sup} style={styles.superficieItem}>
                            <span style={styles.superficieLabel}>{sup}:</span>
                            <select
                              style={styles.superficieSelect}
                              value={tipoActual}
                              onChange={(e) => {
                                const nuevoTipo = e.target.value as TipoTrabajo;
                                handleSuperficieChange(dienteEnEdicion, sup, nuevoTipo || null);
                              }}
                            >
                              <option value="">Ninguno</option>
                              <option value="incrustacion">Incrustación</option>
                              <option value="corona">Corona</option>
                              <option value="puente">Puente</option>
                            </select>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                          type="button"
                          style={styles.buttonSecondary}
                          onClick={() => setDienteEnEdicion(null)}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Materiales */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>⚙️ Materiales</h3>
                  <div style={styles.grid2}>
                    <div style={styles.field}>
                      <label style={styles.label}>Aleación</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.aleacion}
                        onChange={(e) => handleChange('aleacion', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Material estético</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.material_estetico}
                        onChange={(e) => handleChange('material_estetico', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Tipo póntico</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.tipo_pontico}
                        onChange={(e) => handleChange('tipo_pontico', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Color</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.color}
                        onChange={(e) => handleChange('color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Ortodoncia */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>😁 Ortodoncia</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.ortodoncia_superior}
                        onChange={(e) => handleChange('ortodoncia_superior', e.target.checked)}
                      /> Superior
                    </label>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.ortodoncia_inferior}
                        onChange={(e) => handleChange('ortodoncia_inferior', e.target.checked)}
                      /> Inferior
                    </label>
                    <input
                      type="text"
                      placeholder="Aparato a realizar"
                      style={{ ...styles.input, width: '180px' }}
                      value={formData.aparato_realizar}
                      onChange={(e) => handleChange('aparato_realizar', e.target.value)}
                    />
                  </div>
                </div>

                {/* Tipo de yeso y finalización */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📅 Finalización</h3>
                  <div style={styles.grid2}>
                    <div style={styles.field}>
                      <label style={styles.label}>Tipo yeso</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.tipo_yeso}
                        onChange={(e) => handleChange('tipo_yeso', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Fecha entrega</label>
                      <input
                        type="date"
                        style={styles.input}
                        value={formData.fecha_entrega}
                        onChange={(e) => handleChange('fecha_entrega', e.target.value)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Costo final</label>
                      <input
                        type="number"
                        style={styles.input}
                        value={formData.costo_final || ''}
                        onChange={(e) => handleChange('costo_final', e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Firma</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={formData.firma}
                        onChange={(e) => handleChange('firma', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Notas adicionales */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📝 Notas</h3>
                  <textarea
                    style={{ ...styles.input, minHeight: '50px' }}
                    value={formData.notas}
                    onChange={(e) => handleChange('notas', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '15px' }}>
              <button
                type="button"
                style={styles.buttonSecondary}
                onClick={() => navigate('/ordenes')}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={styles.buttonPrimary}
                disabled={cargando}
              >
                {cargando ? 'Guardando...' : 'Guardar Orden'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default OrdenFormulario;