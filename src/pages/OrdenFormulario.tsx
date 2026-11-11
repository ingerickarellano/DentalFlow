import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { QRCodeSVG } from 'qrcode.react';
import { useDialogos } from '../components/ui/Dialogos';
import Odontograma, { PiezaDental, crearPiezaVacia, TODOS_LOS_DIENTES } from '../components/ordenes/Odontograma';
import { useMediaQuery, BREAKPOINTS } from '../hooks/useMediaQuery';

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

// ================== PIEZAS DE PRESENTACIÓN (fuera del componente para que los campos no pierdan el foco) ==================
const Opciones = ({ valor, opciones, onCambiar }: { valor: string; opciones: { valor: string; texto: string }[]; onCambiar: (v: string) => void }) => (
  <div style={ui.opciones} role="radiogroup">
    {opciones.map(o => {
      const activo = valor === o.valor;
      return (
        <button key={o.valor} type="button" role="radio" aria-checked={activo}
          style={{ ...ui.opcion, ...(activo ? ui.opcionActiva : {}) }}
          onClick={() => onCambiar(activo ? '' : o.valor)}>
          {o.texto}
        </button>
      );
    })}
  </div>
);

// Interruptor tipo chip para los sí/no
const Chip = ({ activo, texto, onCambiar }: { activo: boolean; texto: string; onCambiar: (v: boolean) => void }) => (
  <button type="button" role="switch" aria-checked={activo}
    style={{ ...ui.chip, ...(activo ? ui.chipActivo : {}) }}
    onClick={() => onCambiar(!activo)}>
    {activo ? '✓ ' : ''}{texto}
  </button>
);

const Campo = ({ etiqueta, children, ancho }: { etiqueta: string; children: React.ReactNode; ancho?: boolean }) => (
  <label style={{ ...ui.campo, ...(ancho ? { gridColumn: '1 / -1' } : {}) }}>
    <span style={ui.campoLabel}>{etiqueta}</span>
    {children}
  </label>
);

const Seccion = ({ titulo, icono, children, ancho }: { titulo: string; icono: string; children: React.ReactNode; ancho?: boolean }) => (
  <section style={{ ...ui.tarjeta, ...(ancho ? { gridColumn: '1 / -1' } : {}) }}>
    <h2 style={ui.seccionTitulo}><span aria-hidden>{icono}</span> {titulo}</h2>
    {children}
  </section>
);

const OrdenFormulario: React.FC = () => {
  const { avisar } = useDialogos();
  const navigate = useNavigate();
  const { id } = useParams();
  const [cargando, setCargando] = useState(false);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [dentistas, setDentistas] = useState<any[]>([]);
  const [laboratoristas, setLaboratoristas] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<any>({ nombre: 'Cargando...' });
  const [trabajoId, setTrabajoId] = useState<string | null>(null);
  const [configLaboratorio, setConfigLaboratorio] = useState<any>(null);
  // Laboratorista: la orden va sobre un trabajo que ya existe y sin montos
  const [esLaboratorista, setEsLaboratorista] = useState(false);
  const [trabajosDisponibles, setTrabajosDisponibles] = useState<any[]>([]);
  const [nombreLaboratorio, setNombreLaboratorio] = useState('');
  const esCompacto = useMediaQuery(BREAKPOINTS.tablet);

  const [formData, setFormData] = useState<OrdenData>({
    paciente: '',
    clinica_id: '',
    dentista_id: '',
    laboratorista_id: '',
    fecha_entrega_estimada: '',
    notas: '',
    protesista_nombre: '',
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
      TODOS_LOS_DIENTES.forEach(num => {
        piezasIniciales[num] = crearPiezaVacia();
      });
      setFormData(prev => ({ ...prev, piezas: piezasIniciales }));
    }
  }, []);

  useEffect(() => {
    cargarDatosIniciales().then(laboratorista => {
      if (id) cargarOrden(id, laboratorista);
    });
  }, [id]);

  const cargarDatosIniciales = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: perfil } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      const nombreUsuario = perfil?.nombre || user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario';
      // Orden nueva: el protesista por defecto es quien la crea
      if (!id) setFormData(prev => ({ ...prev, protesista_nombre: prev.protesista_nombre || nombreUsuario }));

      setUsuario({
        id: user.id,
        email: user.email!,
        nombre: nombreUsuario,
        rol: perfil?.rol || user.user_metadata?.rol || 'cliente',
        laboratorio: perfil?.laboratorio || user.user_metadata?.laboratorio,
        telefono: perfil?.telefono || user.user_metadata?.telefono,
      });

      const { data: config } = await supabase
        .from('configuracion_laboratorio')
        .select('*')
        .eq('usuario_id', user.id)
        .maybeSingle();
      setConfigLaboratorio(config);

      // Nombre del laboratorio con que se registró (si no configuró uno)
      const { data: memb } = await supabase.rpc('mi_membresia');
      const filaMemb = Array.isArray(memb) ? memb[0] : memb;
      setNombreLaboratorio(filaMemb?.laboratorio || '');

      const [clinicasRes, dentistasRes, laboratoristasRes] = await Promise.all([
        supabase.from('clinicas').select('id,nombre'),
        supabase.from('dentistas').select('id,nombre,clinica_id'),
        supabase.from('laboratoristas').select('id,nombre').order('nombre'),
      ]);
      setClinicas(clinicasRes.data || []);
      setDentistas(dentistasRes.data || []);
      setLaboratoristas(laboratoristasRes.data || []);

      const laboratorista = perfil?.rol === 'laboratorista';
      setEsLaboratorista(laboratorista);
      if (laboratorista) {
        // Sus trabajos que todavía no tienen orden (un trabajo = una orden)
        const [trabajosRes, ordenesRes] = await Promise.all([
          supabase.from('trabajos_vista')
            .select('id, paciente, clinica_id, clinica_nombre, dentista_id, laboratorista_id, fecha_creacion, fecha_entrega_estimada, notas, estado')
            .order('fecha_creacion', { ascending: false }),
          supabase.from('ordenes_vista').select('trabajo_id')
        ]);
        const conOrden = new Set((ordenesRes.data || []).map((o: any) => o.trabajo_id));
        setTrabajosDisponibles((trabajosRes.data || []).filter((t: any) => !conOrden.has(t.id)));
      }
      return laboratorista;
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      return false;
    }
  };

  // Laboratorista: al elegir el trabajo se completan sus datos (no se editan aquí)
  const seleccionarTrabajo = (id: string) => {
    const t = trabajosDisponibles.find(x => x.id === id);
    setTrabajoId(t ? t.id : null);
    setFormData(prev => ({
      ...prev,
      paciente: t?.paciente || '',
      clinica_id: t?.clinica_id || '',
      dentista_id: t?.dentista_id || '',
      laboratorista_id: t?.laboratorista_id || '',
      fecha_entrega_estimada: t?.fecha_entrega_estimada || '',
      notas: t?.notas || ''
    }));
  };

  const cargarOrden = async (ordenId: string, laboratorista: boolean) => {
    try {
      const { data, error } = laboratorista
        ? await supabase
            .from('ordenes_vista')
            .select('*')
            .eq('id', ordenId)
            .single()
        : await supabase
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
          protesista_nombre: data.protesista_nombre || '',
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
          costo_final: data.costo_final ?? null,
          piezas: data.piezas || {},
        });
      }
    } catch (error) {
      console.error('Error cargando orden:', error);
      avisar('Error al cargar la orden');
    }
  };

  const handleChange = (campo: keyof OrdenData, valor: any) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };


  // Campos técnicos de la orden (sin dueño, trabajo ni montos)
  const camposTecnicos = () => ({
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
    piezas: formData.piezas,
  });

  // Laboratorista: la base de datos valida que el trabajo sea suyo y no guarda montos
  const guardarComoLaboratorista = async () => {
    if (!id && !trabajoId) throw new Error('Selecciona el trabajo al que corresponde la orden');
    const { error } = await supabase.rpc('guardar_orden', {
      p_orden_id: id || null,
      p_trabajo_id: id ? null : trabajoId,
      p_datos: camposTecnicos(),
      p_notas: formData.notas ?? ''
    });
    if (error) throw new Error(String(error.message || '').replace(/^[A-Z_]+:\s*/, ''));
    avisar('✅ Orden guardada correctamente');
    navigate('/ordenes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (esLaboratorista) {
        await guardarComoLaboratorista();
        return;
      }
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
        // Editar la orden NO toca los servicios ni el precio del trabajo
        // (se gestionan en Gestión de Trabajos)
        const datosTrabajoEditables: Record<string, any> = { ...trabajoData };
        delete datosTrabajoEditables.servicios;
        delete datosTrabajoEditables.precio_total;
        // ...ni la fecha de creación (el trabajo no se está creando ahora); el estado sí vuelve a pendiente
        delete datosTrabajoEditables.fecha_creacion;
        const { error } = await supabase
          .from('trabajos')
          .update(datosTrabajoEditables)
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
        ...camposTecnicos(),
        costo_final: formData.costo_final,
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

      avisar('✅ Orden guardada correctamente');
      navigate('/ordenes');
    } catch (error: any) {
      console.error('Error detallado:', error);
      avisar('❌ Error al guardar: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  // ================== PRESENTACIÓN ==================
  const texto = (campo: keyof OrdenData, placeholder?: string) => (
    <input type="text" style={ui.input} value={(formData[campo] as string) || ''} placeholder={placeholder}
      onChange={(e) => handleChange(campo, e.target.value)} />
  );

  const datosLab = [configLaboratorio?.direccion, configLaboratorio?.telefono].filter(Boolean).join(' · ');

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
      <div style={ui.pagina}>
        <form onSubmit={handleSubmit}>
          {/* Encabezado: laboratorio y QR del trabajo */}
          <div style={{ ...ui.tarjeta, ...ui.encabezado }}>
            <div style={{ minWidth: 0 }}>
              <div style={ui.encabezadoEtiqueta}>{id ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}</div>
              <h1 style={ui.encabezadoTitulo}>{configLaboratorio?.nombre_laboratorio || nombreLaboratorio || 'Laboratorio'}</h1>
              {datosLab && <div style={ui.encabezadoDatos}>{datosLab}</div>}
            </div>
            {id && trabajoId && (
              <div style={ui.qr}>
                <QRCodeSVG value={trabajoId} size={64} />
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>ID: {trabajoId.slice(0, 8)}</span>
              </div>
            )}
          </div>

          <div style={{ ...ui.grilla, gridTemplateColumns: esCompacto ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
            {/* Datos del caso */}
            <Seccion titulo="Datos del caso" icono="📋" ancho>
              {esLaboratorista && !id && (
                <div style={{ marginBottom: '0.875rem' }}>
                  <Campo etiqueta="Trabajo *">
                    <select style={ui.input} value={trabajoId || ''} onChange={(e) => seleccionarTrabajo(e.target.value)} required>
                      <option value="">Seleccionar trabajo</option>
                      {trabajosDisponibles.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.paciente} — {t.clinica_nombre || 'Sin clínica'} — {new Date(t.fecha_creacion).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <p style={ui.ayuda}>
                    {trabajosDisponibles.length === 0
                      ? 'No tienes trabajos sin orden. Primero crea el trabajo en "Crear Lista de Trabajo".'
                      : 'La orden se agrega a un trabajo ya creado. Paciente, clínica y dentista vienen del trabajo.'}
                  </p>
                </div>
              )}
              <div style={ui.campos}>
                <Campo etiqueta="Paciente *">
                  <input type="text" style={ui.input} value={formData.paciente} required disabled={esLaboratorista}
                    onChange={(e) => handleChange('paciente', e.target.value)} />
                </Campo>
                <Campo etiqueta="Clínica *">
                  <select style={ui.input} value={formData.clinica_id} required disabled={esLaboratorista}
                    onChange={(e) => handleChange('clinica_id', e.target.value)}>
                    <option value="">Seleccionar</option>
                    {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Dentista *">
                  <select style={ui.input} value={formData.dentista_id} required={!esLaboratorista} disabled={esLaboratorista}
                    onChange={(e) => handleChange('dentista_id', e.target.value)}>
                    <option value="">Seleccionar</option>
                    {dentistas.filter(d => !formData.clinica_id || d.clinica_id === formData.clinica_id)
                      .map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Laboratorista">
                  <select style={ui.input} value={formData.laboratorista_id} disabled={esLaboratorista}
                    onChange={(e) => handleChange('laboratorista_id', e.target.value)}>
                    <option value="">Sin asignar</option>
                    {laboratoristas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Fecha de entrega estimada">
                  <input type="date" style={ui.input} value={formData.fecha_entrega_estimada} disabled={esLaboratorista}
                    onChange={(e) => handleChange('fecha_entrega_estimada', e.target.value)} />
                </Campo>
                <Campo etiqueta="Protesista">{texto('protesista_nombre')}</Campo>
                <Campo etiqueta="Doctor">{texto('doctor_nombre')}</Campo>
                <Campo etiqueta="Teléfono">{texto('telefono')}</Campo>
                <Campo etiqueta="Dirección">{texto('direccion')}</Campo>
                <Campo etiqueta="CP">{texto('cp')}</Campo>
              </div>
            </Seccion>

            {/* Odontograma */}
            <Seccion titulo="Selección de piezas" icono="🦷" ancho>
              <p style={ui.ayuda}>Toca un diente para indicar qué se hace en cada cara.</p>
              <Odontograma piezas={formData.piezas} compacto={esCompacto}
                onChange={(piezas) => handleChange('piezas', piezas)} />
            </Seccion>

            <Seccion titulo="Análisis" icono="🔍">
              <div style={ui.campos1}>
                <Campo etiqueta="Impresión">
                  <Opciones valor={formData.analisis_impresion} onCambiar={(v) => handleChange('analisis_impresion', v)} opciones={[{ valor: 'buena', texto: 'Buena' }, { valor: 'regular', texto: 'Regular' }, { valor: 'mala', texto: 'Mala' }]} />
                </Campo>
                <Campo etiqueta="Modelo">
                  <Opciones valor={formData.analisis_modelo} onCambiar={(v) => handleChange('analisis_modelo', v)} opciones={[{ valor: 'buena', texto: 'Buena' }, { valor: 'regular', texto: 'Regular' }, { valor: 'mala', texto: 'Mala' }]} />
                </Campo>
                <div style={ui.enLinea}>
                  <Chip activo={!!formData.aporta_registros} onCambiar={(v) => handleChange('aporta_registros', v)} texto="Aporta registros" />
                  {formData.aporta_registros && (
                    <input type="text" style={{ ...ui.input, flex: '1 1 160px' }} placeholder="¿Cuáles?"
                      value={formData.cuales_registros} onChange={(e) => handleChange('cuales_registros', e.target.value)} />
                  )}
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Articulación" icono="⚙️">
              <div style={ui.campos1}>
                <Campo etiqueta="Tipo de articulador">
                  <Opciones valor={formData.articulado} onCambiar={(v) => handleChange('articulado', v)} opciones={[
                    { valor: 'no_ajustable', texto: 'No ajustable' },
                    { valor: 'semi_ajustable', texto: 'Semi ajustable' },
                    { valor: 'totalmente_ajustable', texto: 'Totalmente ajustable' }
                  ]} />
                </Campo>
                <Campo etiqueta="Características">
                  <div style={ui.enLinea}>
                    <Chip activo={!!formData.metalica} onCambiar={(v) => handleChange('metalica', v)} texto="Metálica" />
                    <Chip activo={!!formData.estetica} onCambiar={(v) => handleChange('estetica', v)} texto="Estética" />
                  </div>
                </Campo>
                <Campo etiqueta="Especificaciones">{texto('especificaciones')}</Campo>
              </div>
            </Seccion>

            <Seccion titulo="Prótesis removible" icono="🔄">
              <div style={ui.campos1}>
                <div style={ui.enLinea}><Chip activo={!!formData.protesis_removible} onCambiar={(v) => handleChange('protesis_removible', v)} texto="Prótesis removible" /></div>
                {formData.protesis_removible && (
                  <>
                    <div style={ui.enLinea}>
                      <Chip activo={!!formData.protesis_total} onCambiar={(v) => handleChange('protesis_total', v)} texto="Total" />
                      <Chip activo={!!formData.protesis_parcial} onCambiar={(v) => handleChange('protesis_parcial', v)} texto="Parcial" />
                      <Chip activo={!!formData.removable} onCambiar={(v) => handleChange('removable', v)} texto="Removable" />
                    </div>
                    <Campo etiqueta="Diseño del esqueleto">{texto('diseno_esqueleto')}</Campo>
                  </>
                )}
              </div>
            </Seccion>

            <Seccion titulo="Materiales" icono="🧪">
              <div style={ui.campos}>
                <Campo etiqueta="Aleación">{texto('aleacion')}</Campo>
                <Campo etiqueta="Material estético">{texto('material_estetico')}</Campo>
                <Campo etiqueta="Tipo de póntico">{texto('tipo_pontico')}</Campo>
                <Campo etiqueta="Color">{texto('color', 'Ej: A2')}</Campo>
              </div>
            </Seccion>

            <Seccion titulo="Ortodoncia" icono="😁">
              <div style={ui.campos1}>
                <div style={ui.enLinea}>
                  <Chip activo={!!formData.ortodoncia_superior} onCambiar={(v) => handleChange('ortodoncia_superior', v)} texto="Superior" />
                  <Chip activo={!!formData.ortodoncia_inferior} onCambiar={(v) => handleChange('ortodoncia_inferior', v)} texto="Inferior" />
                </div>
                <Campo etiqueta="Aparato a realizar">{texto('aparato_realizar')}</Campo>
              </div>
            </Seccion>

            <Seccion titulo="Finalización" icono="📅">
              <div style={ui.campos}>
                <Campo etiqueta="Tipo de yeso">{texto('tipo_yeso')}</Campo>
                <Campo etiqueta="Fecha de entrega">
                  <input type="date" style={ui.input} value={formData.fecha_entrega}
                    onChange={(e) => handleChange('fecha_entrega', e.target.value)} />
                </Campo>
                {!esLaboratorista && (
                  <Campo etiqueta="Costo final">
                    <input type="number" style={ui.input} min="0" step="1" inputMode="numeric" value={formData.costo_final || ''}
                      onChange={(e) => handleChange('costo_final', e.target.value ? Number(e.target.value) : null)} />
                  </Campo>
                )}
                <Campo etiqueta="Firma">{texto('firma')}</Campo>
              </div>
            </Seccion>

            <Seccion titulo="Notas" icono="📝" ancho={!esCompacto}>
              <textarea style={{ ...ui.input, minHeight: '90px', resize: 'vertical' }} value={formData.notas}
                onChange={(e) => handleChange('notas', e.target.value)} placeholder="Indicaciones adicionales para el trabajo" />
            </Seccion>
          </div>

          {/* Acciones siempre visibles */}
          <div style={ui.acciones}>
            <button type="button" style={ui.botonSecundario} onClick={() => navigate('/ordenes')}>Cancelar</button>
            <button type="submit" style={{ ...ui.botonPrimario, ...(cargando ? { opacity: 0.6 } : {}) }} disabled={cargando}>
              {cargando ? 'Guardando...' : '💾 Guardar orden'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

const ui: Record<string, React.CSSProperties> = {
  pagina: { maxWidth: '1200px', margin: '0 auto', padding: 'clamp(0.75rem, 2.5vw, 1.5rem) clamp(0.75rem, 2.5vw, 1.5rem) 0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#0f172a' },
  tarjeta: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: 'clamp(0.875rem, 2.5vw, 1.25rem)', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', minWidth: 0 },
  encabezado: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
  encabezadoEtiqueta: { fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' },
  encabezadoTitulo: { fontSize: 'clamp(1.25rem, 3vw, 1.6rem)', fontWeight: 700, margin: '0.125rem 0', overflowWrap: 'anywhere' },
  encabezadoDatos: { fontSize: '0.875rem', color: '#64748b' },
  qr: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' },
  grilla: { display: 'grid', gap: '1rem' },
  seccionTitulo: { fontSize: '1rem', fontWeight: 700, margin: '0 0 0.875rem', display: 'flex', gap: '0.4rem', alignItems: 'center' },
  campos: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem' },
  campos1: { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  campo: { display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 },
  campoLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#475569' },
  input: { width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', backgroundColor: 'white', color: '#0f172a', fontFamily: 'inherit' },
  ayuda: { fontSize: '0.8rem', color: '#64748b', margin: '0.375rem 0 0.75rem' },
  opciones: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' },
  opcion: { padding: '0.45rem 0.875rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
  opcionActiva: { backgroundColor: '#2563eb', borderColor: '#2563eb', color: 'white' },
  chip: { padding: '0.45rem 0.875rem', borderRadius: '999px', border: '1px dashed #94a3b8', backgroundColor: 'white', color: '#334155', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
  chipActivo: { border: '1px solid #10b981', backgroundColor: '#ecfdf5', color: '#065f46' },
  enLinea: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  acciones: { position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.875rem 0', marginTop: '1rem', background: 'linear-gradient(to top, #f8fafc 70%, rgba(248,250,252,0))', zIndex: 5 },
  botonSecundario: { padding: '0.7rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
  botonPrimario: { padding: '0.7rem 1.5rem', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }
};

export default OrdenFormulario;
