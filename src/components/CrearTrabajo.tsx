// CrearTrabajo.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';

// Interfaces
interface CrearTrabajoProps {
  onBack: () => void;
}

interface ClinicaSupabase {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  usuario_id: string;
  created_at: string;
}

interface DentistaSupabase {
  id: string;
  nombre: string;
  especialidad: string;
  clinica_id?: string;
  usuario_id: string;
  created_at: string;
}

interface LaboratoristaSupabase {
  id: string;
  nombre: string;
  especialidad: string;
  usuario_id: string;
  created_at: string;
}

// 🔥 AÑADIMOS CAMPO anio
interface ServicioSupabase {
  id: string;
  nombre: string;
  precio_base: number;
  categoria: string;
  anio: number;            // <-- NUEVO
  activo: boolean;
  usuario_id: string;
  creado_en: string;
  updated_at: string;
  created_at: string;
}

interface TrabajoAgregado {
  id: string;
  paciente: string;
  rutPaciente: string;
  servicio: ServicioSupabase;
  cantidad: number;
  piezaDental: string;
  precioUnitario: number;
  observaciones?: string;
  notaEspecial?: string;
  fechaTrabajo?: Date;
}

type IdiomaType = 'es' | 'en';

interface ConfiguracionDetallada {
  tooth: string;
  materialConfig: string;
  baseMaterial: string;
  implantBased: boolean;
  customAbstinent: string;
  additionalScans: boolean;
  minimalThickness: number;
  gapWidthCement: number;
  orsStockAbstinent: boolean;
  selectedMaterials: string[];
  materialType: string;
  toothColor: string;
}

const categorias = {
  'todos': '📋 Todos',
  'fija': '🦷 Prótesis Fija',
  'removible': '👄 Prótesis Removible',
  'implantes': '⚡ Implantes',
  'ortodoncia': '🎯 Ortodoncia',
  'reparaciones': '🔧 Reparaciones',
  'metales': '🔩 Metales',
  'attachments': '📎 Attachments',
  'ceromeros_composites': '🦷 Cerómeros y Composites',
  'planos_estampados': '📐 Planos y Estampados',
  'otros': '📦 Otros Servicios'
};

// Normalización de texto
const normalizarTexto = (texto: string) => {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Hook debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

interface HistorialServicio {
  servicio_id: string;
  servicio_nombre: string;
  categoria: string;
  veces_usado: number;
  ultimo_uso: Date;
  clinica_id: string;
}

const CrearTrabajo: React.FC<CrearTrabajoProps> = ({ onBack }) => {
  // Estados
  const [clinicas, setClinicas] = useState<ClinicaSupabase[]>([]);
  const [dentistas, setDentistas] = useState<DentistaSupabase[]>([]);
  const [laboratoristas, setLaboratoristas] = useState<LaboratoristaSupabase[]>([]);
  const [servicios, setServicios] = useState<ServicioSupabase[]>([]);

  const [clinicaSeleccionada, setClinicaSeleccionada] = useState<string>('');
  const [dentistaSeleccionado, setDentistaSeleccionado] = useState<string>('');
  const [laboratoristaSeleccionado, setLaboratoristaSeleccionado] = useState<string>('');
  const [nombrePaciente, setNombrePaciente] = useState<string>('');
  const [rutPaciente, setRutPaciente] = useState<string>('');
  const [trabajosAgregados, setTrabajosAgregados] = useState<TrabajoAgregado[]>([]);
  const [modoDetallado, setModoDetallado] = useState<boolean>(false);
  const [idioma, setIdioma] = useState<IdiomaType>('es');
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const [piezasDentales, setPiezasDentales] = useState<{ [key: string]: string }>({});
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');
  // 🔥 NUEVO: filtro por año
  const [filtroAnio, setFiltroAnio] = useState<number>(new Date().getFullYear());
  const [cargandoServicios, setCargandoServicios] = useState<boolean>(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');
  const [cargandoDatos, setCargandoDatos] = useState<boolean>(true);
  const [notasServicios, setNotasServicios] = useState<{ [key: string]: string }>({});
  const [showFloatingCounter, setShowFloatingCounter] = useState(false);
  const [fechaTrabajo, setFechaTrabajo] = useState<string>('');
  const [mostrarHistorial, setMostrarHistorial] = useState<boolean>(false);
  const [historialServicios, setHistorialServicios] = useState<HistorialServicio[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Config detallada
  const [configDetallada, setConfigDetallada] = useState<ConfiguracionDetallada>({
    tooth: '',
    materialConfig: 'Default',
    baseMaterial: 'Solar Laser / 30 Pinz',
    implantBased: false,
    customAbstinent: '',
    additionalScans: false,
    minimalThickness: 0.5,
    gapWidthCement: 0.1,
    orsStockAbstinent: false,
    selectedMaterials: [],
    materialType: 'Zirconia',
    toothColor: 'A2'
  });

  const inicioRef = useRef<HTMLDivElement>(null);
  const terminoBusquedaDebounced = useDebounce(terminoBusqueda, 300);

  // Efectos
  useEffect(() => {
    setShowFloatingCounter(trabajosAgregados.length > 0);
  }, [trabajosAgregados.length]);

  useEffect(() => {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const año = hoy.getFullYear();
    setFechaTrabajo(`${año}-${mes}`);
  }, []);

  useEffect(() => {
    if (clinicaSeleccionada) cargarHistorialServicios();
  }, [clinicaSeleccionada]);

  useEffect(() => {
    const cargarUsuario = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: perfilData } = await supabase
          .from('perfiles_usuarios')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser({ ...authUser, ...perfilData });
      }
    };
    cargarUsuario();
  }, []);

  // Carga inicial
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setCargandoDatos(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Clínicas
        const { data: clinicasData } = await supabase
          .from('clinicas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre');
        setClinicas(clinicasData || []);

        // Dentistas
        const { data: dentistasData } = await supabase
          .from('dentistas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre');
        setDentistas(dentistasData || []);

        // Laboratoristas
        const { data: laboratoristasData } = await supabase
          .from('laboratoristas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre');
        setLaboratoristas(laboratoristasData || []);

        await cargarServicios();
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setCargandoDatos(false);
      }
    };
    cargarDatosIniciales();
  }, []);

  const cargarServicios = async () => {
    try {
      setCargandoServicios(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('servicios')
        .select('*') // incluye anio
        .eq('usuario_id', user.id)
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) throw error;
      setServicios(data || []);
    } catch (error: any) {
      console.error('Error cargando servicios:', error);
    } finally {
      setCargandoServicios(false);
    }
  };

  const cargarHistorialServicios = async () => {
    if (!clinicaSeleccionada) return;
    try {
      setCargandoHistorial(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('trabajos')
        .select(`servicios, clinica_id, created_at`)
        .eq('usuario_id', user.id)
        .eq('clinica_id', clinicaSeleccionada)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const historialMap = new Map<string, HistorialServicio>();
      data?.forEach(trabajo => {
        if (trabajo.servicios && Array.isArray(trabajo.servicios)) {
          trabajo.servicios.forEach((serv: any) => {
            if (serv.servicio_id) {
              const key = serv.servicio_id;
              const existing = historialMap.get(key);
              if (existing) {
                existing.veces_usado += serv.cantidad || 1;
                if (new Date(trabajo.created_at) > existing.ultimo_uso) {
                  existing.ultimo_uso = new Date(trabajo.created_at);
                }
              } else {
                historialMap.set(key, {
                  servicio_id: serv.servicio_id,
                  servicio_nombre: serv.nombre || 'Servicio',
                  categoria: serv.categoria || 'general',
                  veces_usado: serv.cantidad || 1,
                  ultimo_uso: new Date(trabajo.created_at),
                  clinica_id: trabajo.clinica_id
                });
              }
            }
          });
        }
      });
      const historialArray = Array.from(historialMap.values())
        .sort((a, b) => b.veces_usado - a.veces_usado)
        .slice(0, 20);
      setHistorialServicios(historialArray);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Filtros combinados (categoría + año + búsqueda)
  const serviciosFiltrados = useMemo(() => {
    if (servicios.length === 0) return [];
    let filtrados = servicios;

    if (categoriaSeleccionada !== 'todos') {
      filtrados = filtrados.filter(s => s.categoria === categoriaSeleccionada);
    }

    // 🔥 Filtro por año
    filtrados = filtrados.filter(s => s.anio === filtroAnio);

    if (terminoBusquedaDebounced.trim()) {
      const terminoNormalizado = normalizarTexto(terminoBusquedaDebounced);
      filtrados = filtrados.filter(s => {
        const nombreNormalizado = normalizarTexto(s.nombre);
        const nombreCategoria = categorias[s.categoria as keyof typeof categorias] || '';
        const categoriaNormalizada = normalizarTexto(nombreCategoria);
        return nombreNormalizado.includes(terminoNormalizado) ||
               categoriaNormalizada.includes(terminoNormalizado);
      });
    }
    return filtrados;
  }, [servicios, categoriaSeleccionada, filtroAnio, terminoBusquedaDebounced]);

  const dentistasFiltrados = useMemo(() => {
    if (!clinicaSeleccionada) return dentistas;
    return dentistas.filter(d => d.clinica_id === clinicaSeleccionada);
  }, [clinicaSeleccionada, dentistas]);

  // Formateadores
  const formatearPrecioCLP = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  };

  const formatearFecha = (fechaStr: string) => {
    const [año, mes] = fechaStr.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Handlers
  const agregarTrabajoSimple = (servicio: ServicioSupabase) => {
    if (agregando) return;
    setAgregando(true);
    const cantidad = cantidades[servicio.id] || 1;
    const piezaDental = piezasDentales[servicio.id] || '';
    const notaEspecial = notasServicios[servicio.id] || '';
    let fechaTrabajoDate: Date | undefined;
    if (fechaTrabajo) {
      const [año, mes] = fechaTrabajo.split('-');
      fechaTrabajoDate = new Date(parseInt(año), parseInt(mes) - 1, 1);
    }
    const trabajo: TrabajoAgregado = {
      id: Date.now().toString() + Math.random(),
      paciente: nombrePaciente.trim(),
      rutPaciente: rutPaciente.trim(),
      servicio,
      cantidad,
      piezaDental,
      precioUnitario: servicio.precio_base,
      notaEspecial,
      fechaTrabajo: fechaTrabajoDate
    };
    setTrabajosAgregados(prev => [...prev, trabajo]);
    setCantidades(prev => ({ ...prev, [servicio.id]: 1 }));
    setPiezasDentales(prev => ({ ...prev, [servicio.id]: '' }));
    setNotasServicios(prev => ({ ...prev, [servicio.id]: '' }));
    setTimeout(() => setAgregando(false), 300);
  };

  const agregarDesdeHistorial = (servicioHistorial: HistorialServicio) => {
    const servicioCompleto = servicios.find(s => s.id === servicioHistorial.servicio_id);
    if (servicioCompleto) {
      agregarTrabajoSimple(servicioCompleto);
    } else {
      const servicioTemporal: ServicioSupabase = {
        id: servicioHistorial.servicio_id,
        nombre: servicioHistorial.servicio_nombre,
        categoria: servicioHistorial.categoria,
        precio_base: 0,
        anio: filtroAnio, // usamos el año actual del filtro
        activo: true,
        usuario_id: '',
        creado_en: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      agregarTrabajoSimple(servicioTemporal);
    }
  };

  const eliminarTrabajo = (id: string) => {
    setTrabajosAgregados(prev => prev.filter(t => t.id !== id));
  };

  const calcularTotal = () => {
    return trabajosAgregados.reduce((total, t) => total + (t.precioUnitario * t.cantidad), 0);
  };

  const finalizarTrabajo = async () => {
    if (guardando) return;
    setGuardando(true);
    if (!clinicaSeleccionada) {
      alert(idioma === 'es' ? 'Selecciona una clínica' : 'Select a clinic');
      setGuardando(false);
      return;
    }
    if (trabajosAgregados.length === 0) {
      alert(idioma === 'es' ? 'Agrega al menos un trabajo' : 'Add at least one work');
      setGuardando(false);
      return;
    }
    if (!fechaTrabajo) {
      alert(idioma === 'es' ? 'Selecciona un mes' : 'Select a month');
      setGuardando(false);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const trabajosPorPaciente = trabajosAgregados.reduce((acc, trabajo) => {
        const clave = `${trabajo.paciente}-${trabajo.rutPaciente}`;
        if (!acc[clave]) {
          acc[clave] = { paciente: trabajo.paciente, rutPaciente: trabajo.rutPaciente, trabajos: [] };
        }
        acc[clave].trabajos.push(trabajo);
        return acc;
      }, {} as Record<string, { paciente: string, rutPaciente: string, trabajos: TrabajoAgregado[] }>);

      for (const [, grupo] of Object.entries(trabajosPorPaciente)) {
        const serviciosParaBD = grupo.trabajos.map(t => ({
          servicio_id: t.servicio.id,
          cantidad: t.cantidad,
          precio: t.precioUnitario * t.cantidad,
          nombre: t.servicio.nombre,
          pieza_dental: t.piezaDental || '',
          nota_especial: t.notaEspecial || ''
        }));
        const [año, mes] = fechaTrabajo.split('-');
        const fechaCreacion = new Date(parseInt(año), parseInt(mes) - 1, 1);
        const fechaEntrega = new Date(fechaCreacion);
        fechaEntrega.setDate(fechaEntrega.getDate() + 7);
        const totalPaciente = grupo.trabajos.reduce((sum, t) => sum + (t.precioUnitario * t.cantidad), 0);
        const trabajoData = {
          paciente: grupo.paciente.trim(),
          rut_paciente: grupo.rutPaciente || '',
          clinica_id: clinicaSeleccionada,
          dentista_id: dentistaSeleccionado || null,
          laboratorista_id: laboratoristaSeleccionado || null,
          servicios: serviciosParaBD,
          estado: 'pendiente',
          precio_total: totalPaciente,
          fecha_creacion: fechaCreacion.toISOString(),
          fecha_recibido: fechaCreacion.toISOString(),
          fecha_entrega_estimada: fechaEntrega.toISOString().split('T')[0],
          notas: grupo.trabajos.map(t =>
            `${t.servicio.nombre}${t.notaEspecial ? ` (Nota: ${t.notaEspecial})` : ''}`
          ).join(' | '),
          modo: 'clinica',
          usuario_id: user.id,
          mes_trabajo: fechaTrabajo
        };
        const { error } = await supabase.from('trabajos').insert(trabajoData);
        if (error) throw error;
      }
      alert(idioma === 'es' ? 'Trabajo guardado exitosamente' : 'Work saved successfully');
      limpiarTodo();
    } catch (error: any) {
      console.error('Error finalizar:', error);
      alert(idioma === 'es' ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const actualizarCantidad = (servicioId: string, cantidad: number) => {
    if (cantidad < 1) cantidad = 1;
    setCantidades(prev => ({ ...prev, [servicioId]: cantidad }));
  };

  const actualizarPiezaDental = (servicioId: string, pieza: string) => {
    setPiezasDentales(prev => ({ ...prev, [servicioId]: pieza }));
  };

  const actualizarNota = (servicioId: string, nota: string) => {
    setNotasServicios(prev => ({ ...prev, [servicioId]: nota }));
  };

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const [año, mes] = fechaTrabajo.split('-').map(Number);
    let nuevoMes = mes;
    let nuevoAño = año;
    if (direccion === 'anterior') {
      nuevoMes--;
      if (nuevoMes < 1) { nuevoMes = 12; nuevoAño--; }
    } else {
      nuevoMes++;
      if (nuevoMes > 12) { nuevoMes = 1; nuevoAño++; }
    }
    setFechaTrabajo(`${nuevoAño}-${String(nuevoMes).padStart(2, '0')}`);
  };

  const restablecerMesActual = () => {
    const hoy = new Date();
    setFechaTrabajo(`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`);
  };

  const limpiarTodo = () => {
    if (window.confirm(idioma === 'es' ? '¿Limpiar todo?' : 'Clear all?')) {
      setClinicaSeleccionada('');
      setDentistaSeleccionado('');
      setLaboratoristaSeleccionado('');
      setNombrePaciente('');
      setRutPaciente('');
      setTrabajosAgregados([]);
      setCantidades({});
      setPiezasDentales({});
      setNotasServicios({});
      setTerminoBusqueda('');
      setModoDetallado(false);
      setConfigDetallada({
        tooth: '', materialConfig: 'Default', baseMaterial: 'Solar Laser / 30 Pinz',
        implantBased: false, customAbstinent: '', additionalScans: false,
        minimalThickness: 0.5, gapWidthCement: 0.1, orsStockAbstinent: false,
        selectedMaterials: [], materialType: 'Zirconia', toothColor: 'A2'
      });
      setShowFloatingCounter(false);
      setMostrarHistorial(false);
      const hoy = new Date();
      setFechaTrabajo(`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`);
    }
  };

  const handleNombrePacienteChange = (nuevoNombre: string) => {
    const nombreAnterior = nombrePaciente;
    setNombrePaciente(nuevoNombre);
    if (trabajosAgregados.length > 0 && nuevoNombre.trim() !== '' && nombreAnterior !== nuevoNombre) {
      const trabajosConNombreDiferente = trabajosAgregados.filter(t => t.paciente !== nombreAnterior);
      if (trabajosConNombreDiferente.length === 0 && nombreAnterior.trim() !== '') {
        if (window.confirm(idioma === 'es' ? '¿Actualizar todos los trabajos al nuevo nombre?' : 'Update all works to new name?')) {
          setTrabajosAgregados(prev => prev.map(t => ({ ...t, paciente: nuevoNombre, rutPaciente: rutPaciente })));
        }
      }
    }
  };

  const handleRutPacienteChange = (nuevoRut: string) => {
    setRutPaciente(nuevoRut);
    if (trabajosAgregados.length > 0) {
      setTrabajosAgregados(prev => prev.map(t => ({ ...t, rutPaciente: nuevoRut })));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const scrollAlInicio = () => {
    if (inicioRef.current) inicioRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  // Textos
  const textos = {
    es: {
      title: '📋 Crear Lista de Trabajo',
      backButton: '← Volver al Dashboard',
      clinica: 'Clínica *',
      dentista: 'Dentista (Opcional)',
      laboratorista: 'Laboratorista (Opcional)',
      paciente: 'Nombre del Paciente *',
      rut: 'RUT (Opcional)',
      fechaTrabajo: 'Mes del Trabajo *',
      modoSimple: '🔄 Modo Simple',
      modoDetallado: '⚙️ Modo Detallado',
      finalizar: '✅ Finalizar y Guardar Trabajo',
      agregar: 'Agregar',
      eliminar: 'Eliminar',
      total: 'TOTAL GENERAL',
      trabajosAgregados: 'Trabajos Agregados',
      configuracion: 'Configuración Detallada',
      diente: 'Diente',
      materialConfig: 'Configuración de Material (local)',
      materialBase: 'Material Base',
      optionsParams: 'Opciones y Parámetros',
      implantBased: '¿Basado en implante?',
      customAbstinent: 'Abstinencia Personalizada',
      additionalScans: '¿Escaneos adicionales?',
      preopModel: 'Modelo Pre-operatorio',
      minimalThickness: 'Espesor mínimo',
      gapWidthCement: 'Ancho de cemento',
      screwRelated: 'Relacionado con tornillos',
      orsStockAbstinent: 'Abstinencia de stock Ors',
      materialType: 'Tipo de Material',
      toothColor: 'Color del Diente',
      crearTrabajoDetallado: '✅ Crear Trabajo Detallado',
      tiposTrabajos: 'Tipos de Trabajos',
      seleccionaMateriales: 'Selecciona Materiales',
      materialUtilizar: 'Material a Utilizar',
      opcionesParametros: 'Opciones y Parámetros',
      limpiarTrabajo: '🗑️ Limpiar trabajo',
      categoriaTodos: 'Todos',
      buscarServicio: 'Buscar servicio...',
      sinServicios: 'No hay servicios disponibles',
      cargandoServicios: 'Cargando servicios...',
      cargandoDatos: 'Cargando datos...',
      buscando: 'Buscando...',
      resultadosPara: 'Resultados para:',
      enCategoria: 'en',
      serviciosEncontrados: 'servicios encontrados',
      notaEspecial: 'Nota especial (opcional)',
      notaPlaceholder: 'Ej: Color especial, material específico, observaciones...',
      cambiarPaciente: 'Para cambiar de paciente, limpie primero la lista de trabajos',
      actualizarPaciente: '⚠️ El nombre del paciente ha cambiado. ¿Deseas actualizar todos los trabajos existentes al nuevo nombre?',
      verHistorial: '📊 Ver prestaciones más usadas',
      ocultarHistorial: '📊 Ocultar historial',
      historialTitulo: 'Prestaciones más usadas en esta clínica',
      vecesUsado: 'veces usado',
      ultimoUso: 'Último uso',
      agregarDesdeHistorial: 'Agregar',
      sinHistorial: 'No hay historial de prestaciones para esta clínica',
      cargandoHistorial: 'Cargando historial...',
      seleccionaMes: 'Selecciona mes y año',
      mesActual: 'Mes actual',
      mesAnterior: 'Mes anterior',
      mesSiguiente: 'Mes siguiente',
      filtroAnio: 'Año de precios:'
    },
    en: {
      title: '📋 Create Work List',
      backButton: '← Back to Dashboard',
      clinica: 'Clinic *',
      dentista: 'Dentist (Optional)',
      laboratorista: 'Laboratory Technician (Optional)',
      paciente: 'Patient Name *',
      rut: 'RUT (Optional)',
      fechaTrabajo: 'Work Month *',
      modoSimple: '🔄 Simple Mode',
      modoDetallado: '⚙️ Detailed Mode',
      finalizar: '✅ Finish and Save Work',
      agregar: 'Add',
      eliminar: 'Delete',
      total: 'TOTAL',
      trabajosAgregados: 'Added Works',
      configuracion: 'Detailed Configuration',
      diente: 'Tooth',
      materialConfig: 'Material Configuration (local)',
      materialBase: 'Base Material',
      optionsParams: 'Options & Parameters',
      implantBased: 'Implant-based?',
      customAbstinent: 'Custom Abstinent',
      additionalScans: 'Additional Scans?',
      preopModel: 'Pre-op Model',
      minimalThickness: 'Minimal thickness',
      gapWidthCement: 'Gap width of cement',
      screwRelated: 'Screw-related',
      orsStockAbstinent: 'Ors stock abstinent',
      materialType: 'Material Type',
      toothColor: 'Tooth Color',
      crearTrabajoDetallado: '✅ Create Detailed Work',
      tiposTrabajos: 'Work Types',
      seleccionaMateriales: 'Select Materials',
      materialUtilizar: 'Material to Use',
      opcionesParametros: 'Options & Parameters',
      limpiarTrabajo: '🗑️ Clear work',
      categoriaTodos: 'All',
      buscarServicio: 'Search service...',
      sinServicios: 'No services available',
      cargandoServicios: 'Loading services...',
      cargandoDatos: 'Loading data...',
      buscando: 'Searching...',
      resultadosPara: 'Results for:',
      enCategoria: 'in',
      serviciosEncontrados: 'services found',
      notaEspecial: 'Special note (optional)',
      notaPlaceholder: 'Ex: Special color, specific material, observations...',
      cambiarPaciente: 'To change patient, first clear the work list',
      actualizarPaciente: '⚠️ Patient name has changed. Do you want to update all existing works to the new name?',
      verHistorial: '📊 View most used services',
      ocultarHistorial: '📊 Hide history',
      historialTitulo: 'Most used services in this clinic',
      vecesUsado: 'times used',
      ultimoUso: 'Last used',
      agregarDesdeHistorial: 'Add',
      sinHistorial: 'No service history for this clinic',
      cargandoHistorial: 'Loading history...',
      seleccionaMes: 'Select month and year',
      mesActual: 'Current month',
      mesAnterior: 'Previous month',
      mesSiguiente: 'Next month',
      filtroAnio: 'Price year:'
    }
  };

  const t = textos[idioma];

  // Estilos (se mantienen igual, solo añadimos anioBadge)
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: '100%',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    mainContent: {
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    welcomeSection: {
      backgroundColor: 'white',
      padding: '2.5rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem',
      position: 'relative'
    },
    welcomeTitle: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '0.5rem',
      color: '#1e293b'
    },
    welcomeSubtitle: {
      fontSize: '1.125rem',
      color: '#64748b',
      marginBottom: '2rem',
      lineHeight: '1.6'
    },
    floatingCounter: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#3b82f6',
      color: 'white',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
      cursor: 'pointer',
      zIndex: 1000,
      transition: 'transform 0.3s, box-shadow 0.3s',
      border: '3px solid white'
    },
    modeSelector: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '2rem',
      flexWrap: 'wrap'
    },
    modeButton: {
      padding: '0.75rem 1.5rem',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: 'white',
      color: '#475569',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
      transition: 'all 0.3s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    modeButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: '2px solid #3b82f6',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    },
    formContainer: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '1.5rem'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      color: '#374151',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      boxSizing: 'border-box',
      transition: 'all 0.2s'
    },
    select: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    dateControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1rem',
      flexWrap: 'wrap'
    },
    dateDisplay: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1e293b',
      backgroundColor: '#f0f9ff',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      border: '1px solid #bae6fd',
      minWidth: '200px',
      textAlign: 'center'
    },
    dateButton: {
      padding: '0.75rem 1rem',
      border: '1px solid #cbd5e1',
      borderRadius: '0.5rem',
      backgroundColor: 'white',
      color: '#475569',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    dateButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: '1px solid #3b82f6'
    },
    historialContainer: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem'
    },
    historialTitle: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    historialToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      border: '1px solid #cbd5e1',
      borderRadius: '0.5rem',
      backgroundColor: '#f8fafc',
      color: '#475569',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
      marginBottom: '1rem'
    },
    historialGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1rem'
    },
    historialCard: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '0.5rem',
      border: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.2s'
    },
    historialInfo: {
      flex: 1
    },
    historialNombre: {
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.25rem'
    },
    historialStats: {
      fontSize: '12px',
      color: '#64748b',
      display: 'flex',
      gap: '0.75rem'
    },
    historialBadge: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '11px',
      fontWeight: '600'
    },
    historialButton: {
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      backgroundColor: '#10b981',
      color: 'white',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'background-color 0.2s'
    },
    searchContainer: {
      marginBottom: '1.5rem',
      position: 'relative'
    },
    searchInput: {
      width: '100%',
      padding: '1rem 1.5rem',
      paddingLeft: '3rem',
      border: '1px solid #cbd5e1',
      borderRadius: '0.75rem',
      fontSize: '1rem',
      boxSizing: 'border-box',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s'
    },
    searchIcon: {
      position: 'absolute',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#64748b',
      fontSize: '1.25rem'
    },
    filtersContainer: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem'
    },
    filters: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap'
    },
    filterButton: {
      padding: '0.5rem 1rem',
      border: '1px solid #cbd5e1',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      backgroundColor: 'white',
      color: '#475569',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    filterButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: '1px solid #3b82f6'
    },
    serviciosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    servicioCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '1rem'
    },
    servicioNombre: {
      color: '#1e293b',
      fontSize: '16px',
      fontWeight: '600',
      margin: '0',
      lineHeight: '1.4',
      flex: 1
    },
    categoriaBadge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: '#f1f5f9',
      color: '#475569',
      whiteSpace: 'nowrap'
    },
    // 🔥 NUEVO: badge para el año
    anioBadge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: '#e9ecef',
      color: '#495057',
      whiteSpace: 'nowrap',
      marginLeft: '4px'
    },
    precio: {
      color: '#059669',
      fontSize: '20px',
      fontWeight: '700',
      margin: '1rem 0',
      fontFamily: "'Courier New', monospace"
    },
    controlesServicio: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      marginTop: '1rem'
    },
    controlesSuperiores: {
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'center'
    },
    inputCantidad: {
      width: '80px',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      textAlign: 'center',
      fontSize: '14px'
    },
    inputPieza: {
      width: '100px',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '14px'
    },
    inputNota: {
      width: '100%',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '12px',
      minHeight: '40px'
    },
    addButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'background-color 0.2s',
      flex: 1,
      opacity: 1
    },
    addButtonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
      opacity: 0.5
    },
    clearButton: {
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'background-color 0.2s'
    },
    detailedContainer: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '2rem'
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    },
    columnTitle: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #3b82f6',
      marginBottom: '1rem'
    },
    categoryCard: {
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '1.25rem',
      backgroundColor: '#f8fafc'
    },
    categoryHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '1rem'
    },
    categoryIcon: {
      fontSize: '1.5rem',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    categoryTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    materialItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 0',
      cursor: 'pointer'
    },
    materialCheckbox: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      border: '2px solid #cbd5e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    materialCheckboxChecked: {
      backgroundColor: '#10b981',
      border: '2px solid #10b981',
      color: 'white'
    },
    materialName: {
      fontSize: '14px',
      color: '#4a5568'
    },
    materialTypeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '1rem'
    },
    materialTypeCard: {
      border: '2px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '1rem',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'white'
    },
    materialTypeCardSelected: {
      border: '2px solid #3b82f6',
      backgroundColor: '#eff6ff',
      transform: 'scale(1.05)',
      boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
    },
    materialTypeName: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    materialTypePrice: {
      fontSize: '12px',
      color: '#059669',
      fontWeight: '600'
    },
    optionGroup: {
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '1.25rem',
      marginBottom: '1rem',
      backgroundColor: '#f8fafc'
    },
    optionTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#4a5568',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      padding: '0.5rem 0'
    },
    customCheckbox: {
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      border: '2px solid #cbd5e0',
      position: 'relative',
      transition: 'all 0.2s'
    },
    customCheckboxChecked: {
      backgroundColor: '#10b981',
      border: '2px solid #10b981'
    },
    sliderContainer: {
      padding: '1rem 0'
    },
    sliderLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
      fontSize: '14px'
    },
    sliderValue: {
      color: '#3b82f6',
      fontWeight: '600'
    },
    slider: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      backgroundColor: '#e2e8f0',
      outline: 'none',
      WebkitAppearance: 'none'
    },
    colorGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.75rem',
      marginTop: '1rem'
    },
    colorItem: {
      width: '50px',
      height: '50px',
      borderRadius: '8px',
      border: '3px solid transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: '12px',
      color: 'white',
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
      transition: 'all 0.2s'
    },
    colorItemSelected: {
      border: '3px solid #3b82f6',
      transform: 'scale(1.1)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    toothConfig: {
      backgroundColor: '#f8fafc',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      marginBottom: '1rem'
    },
    createButton: {
      marginTop: '2rem',
      textAlign: 'center'
    },
    button: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '1rem 2rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    trabajosContainer: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginTop: '2rem'
    },
    trabajoItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '1.5rem',
      borderBottom: '1px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      transition: 'all 0.2s'
    },
    totalContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1.5rem',
      borderTop: '2px solid #3b82f6',
      backgroundColor: '#f1f5f9',
      borderRadius: '0 0 0.75rem 0.75rem',
      marginTop: '1rem'
    },
    totalText: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    totalAmount: {
      fontSize: '1.25rem',
      fontWeight: '800',
      color: '#059669'
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '3rem',
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      marginBottom: '2rem'
    },
    loadingText: {
      color: '#64748b',
      fontSize: '1.125rem',
      marginTop: '1rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem',
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      color: '#64748b'
    },
    resultadosInfo: {
      marginTop: '1rem',
      marginBottom: '1rem',
      fontSize: '14px',
      color: '#64748b'
    }
  };

  // Renderizado de historial
  const renderHistorialServicios = () => (
    <div style={styles.historialContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={styles.historialTitle}>📊 {t.historialTitulo}</h3>
        <button style={styles.historialToggle} onClick={() => setMostrarHistorial(!mostrarHistorial)}>
          {mostrarHistorial ? '👁️ Ocultar' : '👁️ Mostrar'} {mostrarHistorial ? t.ocultarHistorial : t.verHistorial}
        </button>
      </div>
      {mostrarHistorial && (
        <>
          {cargandoHistorial ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2rem' }}>🔄</div>
              <div style={styles.loadingText}>{t.cargandoHistorial}</div>
            </div>
          ) : historialServicios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
              <p>{t.sinHistorial}</p>
            </div>
          ) : (
            <div style={styles.historialGrid}>
              {historialServicios.slice(0, 6).map((servicio) => (
                <div key={servicio.servicio_id} style={styles.historialCard}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={styles.historialInfo}>
                    <div style={styles.historialNombre}>{servicio.servicio_nombre}</div>
                    <div style={styles.historialStats}>
                      <span>🔥 {servicio.veces_usado} {t.vecesUsado}</span>
                      <span>📅 {servicio.ultimo_uso.toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US')}</span>
                    </div>
                  </div>
                  <button style={styles.historialButton} onClick={() => agregarDesdeHistorial(servicio)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0da271'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    {t.agregarDesdeHistorial}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Renderizado del modo detallado (no modificado, solo se mantiene)
  const renderModoDetallado = () => (
    <div style={styles.detailedContainer}>
      {/* ... (igual que antes) ... */}
      <div style={styles.column}>
        <h3 style={styles.columnTitle}>{t.tiposTrabajos}</h3>
        {materialCategories.map((category, index) => (
          <div key={index} style={styles.categoryCard}>
            <div style={styles.categoryHeader}>
              <div style={styles.categoryIcon}>{category.icon}</div>
              <h4 style={styles.categoryTitle}>{category.category}</h4>
            </div>
            {category.items.map((item, itemIndex) => (
              <div key={itemIndex} style={styles.materialItem} onClick={() => toggleMaterial(item)}>
                <div style={{ ...styles.materialCheckbox, ...(configDetallada.selectedMaterials.includes(item) ? styles.materialCheckboxChecked : {}) }}>
                  {configDetallada.selectedMaterials.includes(item) && '✓'}
                </div>
                <span style={styles.materialName}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={styles.column}>
        <h3 style={styles.columnTitle}>{t.materialUtilizar}</h3>
        <div style={styles.toothConfig}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.diente}</label>
            <input type="text" style={styles.input} value={configDetallada.tooth} onChange={(e) => setConfigDetallada({ ...configDetallada, tooth: e.target.value })} placeholder="Ej: 15, 21, 36" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.materialConfig}</label>
            <select style={styles.select} value={configDetallada.materialConfig} onChange={(e) => setConfigDetallada({ ...configDetallada, materialConfig: e.target.value })}>
              <option value="Default">Default</option><option value="Premium">Premium</option><option value="Economy">Economy</option><option value="Custom">Personalizado</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.materialBase}</label>
            <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}><strong>Solar Laser / 30 Pinz</strong></div>
          </div>
        </div>
        <h4 style={styles.optionTitle}>{t.materialType}</h4>
        <div style={styles.materialTypeGrid}>
          {materialTypes.map((type, index) => (
            <div key={index} style={{ ...styles.materialTypeCard, ...(configDetallada.materialType === type ? styles.materialTypeCardSelected : {}) }}
              onClick={() => setConfigDetallada({ ...configDetallada, materialType: type })}>
              <div style={styles.materialTypeName}>{type}</div>
              <div style={styles.materialTypePrice}>
                {formatearPrecioCLP(type === 'Zirconia' ? 150000 : type === 'Titanio' ? 250000 : type === 'Acrílico/PMMA' ? 80000 : type.includes('Zirconia') ? 180000 : 100000)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.column}>
        <h3 style={styles.columnTitle}>{t.opcionesParametros}</h3>
        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>📊 {t.optionsParams}</h4>
          <label style={styles.checkboxLabel}>
            <div style={{ ...styles.customCheckbox, ...(configDetallada.implantBased ? styles.customCheckboxChecked : {}) }}
              onClick={() => setConfigDetallada({ ...configDetallada, implantBased: !configDetallada.implantBased })} />
            <span>{t.implantBased}</span>
          </label>
          <div style={{ marginTop: '12px' }}>
            <label style={styles.label}>1. {t.customAbstinent}</label>
            <select style={styles.select} value={configDetallada.customAbstinent} onChange={(e) => setConfigDetallada({ ...configDetallada, customAbstinent: e.target.value })}>
              <option value="">Seleccionar opción</option>
              <option value="Orsular Monaco">Orsular Monaco</option>
              <option value="Beta de bar">Beta de bar</option>
              <option value="Other">Otro</option>
            </select>
          </div>
          <label style={{ ...styles.checkboxLabel, marginTop: '12px' }}>
            <div style={{ ...styles.customCheckbox, ...(configDetallada.additionalScans ? styles.customCheckboxChecked : {}) }}
              onClick={() => setConfigDetallada({ ...configDetallada, additionalScans: !configDetallada.additionalScans })} />
            <span>{t.additionalScans}</span>
          </label>
        </div>
        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>📐 2. {t.preopModel}</h4>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}><span>{t.minimalThickness}</span><span style={styles.sliderValue}>{configDetallada.minimalThickness}mm</span></div>
            <input type="range" min="0.1" max="2.0" step="0.1" value={configDetallada.minimalThickness} onChange={(e) => setConfigDetallada({ ...configDetallada, minimalThickness: parseFloat(e.target.value) })} style={styles.slider} />
          </div>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}><span>{t.gapWidthCement}</span><span style={styles.sliderValue}>{configDetallada.gapWidthCement}mm</span></div>
            <input type="range" min="0.01" max="0.5" step="0.01" value={configDetallada.gapWidthCement} onChange={(e) => setConfigDetallada({ ...configDetallada, gapWidthCement: parseFloat(e.target.value) })} style={styles.slider} />
          </div>
        </div>
        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>🔩 3. {t.screwRelated}</h4>
          <label style={styles.checkboxLabel}>
            <div style={{ ...styles.customCheckbox, ...(configDetallada.orsStockAbstinent ? styles.customCheckboxChecked : {}) }}
              onClick={() => setConfigDetallada({ ...configDetallada, orsStockAbstinent: !configDetallada.orsStockAbstinent })} />
            <span>{t.orsStockAbstinent}</span>
          </label>
        </div>
        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>🎨 {t.toothColor}</h4>
          <div style={styles.colorGrid}>
            {toothColors.map((color, index) => (
              <div key={index} style={{ ...styles.colorItem, backgroundColor: getToothColorHex(color), ...(configDetallada.toothColor === color ? styles.colorItemSelected : {}) }}
                onClick={() => setConfigDetallada({ ...configDetallada, toothColor: color })}>
                {color}
              </div>
            ))}
          </div>
        </div>
        <div style={styles.createButton}>
          <button style={styles.button} onClick={crearTrabajoDetallado} disabled={!configDetallada.tooth || configDetallada.selectedMaterials.length === 0}>
            {t.crearTrabajoDetallado}
          </button>
        </div>
      </div>
    </div>
  );

  // Funciones auxiliares para el modo detallado (no modificadas)
  const materialCategories = [
    { category: 'Dentición Residual', items: ['Diente adyacente', 'Orientar endoestructura', 'Injerto en puente', 'Antagonista'], icon: '🏗️' },
    { category: 'Barras', items: ['Pilar de barra', 'Segmento de barra'], icon: '📏' },
    { category: 'Removibles y Aparatos', items: ['Dentadura completa', 'Corona telescópica primaria', 'Corona telescópica secundaria'], icon: '👄' },
    { category: 'Fresado Digital por Copia', items: ['Fresado digital por copia'], icon: '💻' },
    { category: 'Inlays, Onlays y Carillas', items: ['Inlay/Onlay', 'Carilla'], icon: '🔩' },
    { category: 'Pónticos y Mockup', items: ['Póntico anatómico', 'Póntico excelente (Provisional)'], icon: '🦷' },
    { category: 'Coronas y Copings', items: ['Corona amitónica', 'Corona excelente (Cordón frontal)'], icon: '👑' }
  ];

  const materialTypes = [
    'Zirconia', 'Zirconia Multilayer', 'Zirconia Translúcido',
    'Acrílico/PMMA', 'Composite', 'Metal HP', 'Titanio',
    'Metal HP (Láser)', 'Titanio (Láser)', '30 Print'
  ];

  const toothColors = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'];

  const getToothColorHex = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      'A1': '#fffaf0', 'A2': '#fef3c7', 'A3': '#fde68a', 'A3.5': '#fcd34d', 'A4': '#fbbf24',
      'B1': '#fef9c3', 'B2': '#fef08a', 'B3': '#fde047', 'B4': '#facc15',
      'C1': '#fef3c7', 'C2': '#fde68a', 'C3': '#fcd34d', 'C4': '#fbbf24',
      'D2': '#fed7aa', 'D3': '#fdba74', 'D4': '#fb923c'
    };
    return colorMap[color] || '#fff';
  };

  const toggleMaterial = (material: string) => {
    const nuevosMateriales = configDetallada.selectedMaterials.includes(material)
      ? configDetallada.selectedMaterials.filter(m => m !== material)
      : [...configDetallada.selectedMaterials, material];
    setConfigDetallada({ ...configDetallada, selectedMaterials: nuevosMateriales });
  };

  const crearTrabajoDetallado = () => {
    if (!nombrePaciente || !configDetallada.tooth) {
      alert(idioma === 'es' ? 'Completa nombre y diente' : 'Complete patient name and tooth');
      return;
    }
    if (configDetallada.selectedMaterials.length === 0) {
      alert(idioma === 'es' ? 'Selecciona al menos un material' : 'Select at least one material');
      return;
    }
    const preciosMaterial: Record<string, number> = {
      'Zirconia': 150000, 'Zirconia Multilayer': 180000, 'Zirconia Translúcido': 200000,
      'Acrílico/PMMA': 80000, 'Composite': 100000, 'Metal HP': 120000, 'Titanio': 250000,
      'Metal HP (Láser)': 140000, 'Titanio (Láser)': 280000, '30 Print': 90000
    };
    let precioBase = preciosMaterial[configDetallada.materialType] || 150000;
    if (configDetallada.implantBased) precioBase += 50000;
    if (configDetallada.additionalScans) precioBase += 30000;
    if (configDetallada.minimalThickness < 0.3) precioBase += 40000;
    if (configDetallada.gapWidthCement < 0.05) precioBase += 30000;
    if (configDetallada.orsStockAbstinent) precioBase += 25000;
    precioBase += configDetallada.selectedMaterials.length * 20000;

    const observaciones = `
Diente: ${configDetallada.tooth}
Configuración: ${configDetallada.materialConfig}
${configDetallada.implantBased ? '✓ Basado en implante' : '✗ No basado en implante'}
${configDetallada.customAbstinent ? `Abstinencia Personalizada: ${configDetallada.customAbstinent}` : ''}
${configDetallada.additionalScans ? '✓ Escaneos adicionales' : ''}
Espesor mínimo: ${configDetallada.minimalThickness}mm
Ancho de cemento: ${configDetallada.gapWidthCement}mm
${configDetallada.orsStockAbstinent ? '✓ Abstinencia de stock Ors' : ''}
Tipo de material: ${configDetallada.materialType}
Materiales seleccionados: ${configDetallada.selectedMaterials.join(', ')}
Color del diente: ${configDetallada.toothColor}
    `.trim();

    const trabajoDetallado: ServicioSupabase = {
      id: `detallado-${Date.now()}`,
      nombre: `Prótesis Detallada - ${configDetallada.tooth}`,
      categoria: 'fija',
      precio_base: precioBase,
      anio: filtroAnio, // usamos el año del filtro actual
      activo: true,
      usuario_id: '',
      creado_en: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    let fechaTrabajoDate: Date | undefined;
    if (fechaTrabajo) {
      const [año, mes] = fechaTrabajo.split('-');
      fechaTrabajoDate = new Date(parseInt(año), parseInt(mes) - 1, 1);
    }
    const trabajo: TrabajoAgregado = {
      id: Date.now().toString() + Math.random(),
      paciente: nombrePaciente.trim(),
      rutPaciente: rutPaciente.trim(),
      servicio: trabajoDetallado,
      cantidad: 1,
      piezaDental: configDetallada.tooth,
      precioUnitario: precioBase,
      observaciones,
      notaEspecial: observaciones,
      fechaTrabajo: fechaTrabajoDate
    };
    setTrabajosAgregados(prev => [...prev, trabajo]);
    setConfigDetallada({
      tooth: '', materialConfig: 'Default', baseMaterial: 'Solar Laser / 30 Pinz',
      implantBased: false, customAbstinent: '', additionalScans: false,
      minimalThickness: 0.5, gapWidthCement: 0.1, orsStockAbstinent: false,
      selectedMaterials: [], materialType: 'Zirconia', toothColor: 'A2'
    });
    alert(idioma === 'es' ? '¡Trabajo detallado agregado!' : 'Detailed work added!');
  };

  const puedeFinalizar = clinicaSeleccionada && trabajosAgregados.length > 0 && fechaTrabajo;

  return (
    <div style={styles.container}>
      <Header
        user={user}
        onLogout={handleLogout}
        showBackButton={true}
        onBack={onBack}
        title={t.title}
      />
      <main style={styles.mainContent}>
        {cargandoDatos ? (
          <div style={styles.loadingContainer}>
            <div style={{ fontSize: '3rem' }}>🔄</div>
            <div style={styles.loadingText}>{t.cargandoDatos}</div>
          </div>
        ) : (
          <div>
            <div ref={inicioRef} />
            <section style={styles.welcomeSection}>
              <h1 style={styles.welcomeTitle}>{t.title}</h1>
              <p style={styles.welcomeSubtitle}>
                {idioma === 'es'
                  ? 'Crea listas de trabajo para tus pacientes seleccionando servicios de tu catálogo.'
                  : 'Create work lists for your patients by selecting services from your catalog.'}
              </p>
            </section>

            <div style={styles.formContainer}>
              <h3 style={{ color: '#1e293b', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                📋 {idioma === 'es' ? 'Información del Trabajo' : 'Work Information'}
              </h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.clinica}</label>
                  <select style={styles.select} value={clinicaSeleccionada} onChange={(e) => { setClinicaSeleccionada(e.target.value); setDentistaSeleccionado(''); setMostrarHistorial(false); }} required>
                    <option value="">{idioma === 'es' ? 'Selecciona una clínica' : 'Select a clinic'}</option>
                    {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.dentista}</label>
                  <select style={styles.select} value={dentistaSeleccionado} onChange={(e) => setDentistaSeleccionado(e.target.value)} disabled={!clinicaSeleccionada}>
                    <option value="">{idioma === 'es' ? 'Selecciona un dentista (opcional)' : 'Select a dentist (optional)'}</option>
                    {dentistasFiltrados.map(d => <option key={d.id} value={d.id}>{d.nombre} - {d.especialidad}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.laboratorista}</label>
                  <select style={styles.select} value={laboratoristaSeleccionado} onChange={(e) => setLaboratoristaSeleccionado(e.target.value)}>
                    <option value="">{idioma === 'es' ? 'Sin asignar' : 'Not assigned'}</option>
                    {laboratoristas.map(l => <option key={l.id} value={l.id}>{l.nombre} - {l.especialidad}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>{t.fechaTrabajo}</label>
                <div style={styles.dateControls}>
                  <div style={styles.dateDisplay}>📅 {formatearFecha(fechaTrabajo)}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={styles.dateButton} onClick={() => cambiarMes('anterior')} title={t.mesAnterior}>◀️</button>
                    <input type="month" style={styles.input} value={fechaTrabajo} onChange={(e) => setFechaTrabajo(e.target.value)} title={t.seleccionaMes} />
                    <button style={styles.dateButton} onClick={() => cambiarMes('siguiente')} title={t.mesSiguiente}>▶️</button>
                    <button style={styles.dateButton} onClick={restablecerMesActual} title={t.mesActual}>🔄</button>
                  </div>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.paciente}</label>
                  <input type="text" style={styles.input} value={nombrePaciente} onChange={(e) => handleNombrePacienteChange(e.target.value)} placeholder={idioma === 'es' ? "Ej: Juan Pérez" : "Ex: John Doe"} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t.rut}</label>
                  <input type="text" style={styles.input} value={rutPaciente} onChange={(e) => handleRutPacienteChange(e.target.value)} placeholder={idioma === 'es' ? "Ej: 12.345.678-9" : "Ex: 12345678-9"} />
                </div>
              </div>

              {trabajosAgregados.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.5rem', fontSize: '14px', color: '#92400e' }}>
                  ℹ️ {t.cambiarPaciente}
                </div>
              )}
            </div>

            {clinicaSeleccionada && renderHistorialServicios()}

            <div style={styles.modeSelector}>
              <button style={{ ...styles.modeButton, ...(!modoDetallado ? styles.modeButtonActive : {}) }} onClick={() => setModoDetallado(false)}>
                {t.modoSimple}
              </button>
              <button style={{ ...styles.modeButton, ...(modoDetallado ? styles.modeButtonActive : {}) }} onClick={() => setModoDetallado(true)}>
                {t.modoDetallado}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button style={styles.clearButton} onClick={limpiarTodo}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}>
                🗑️ {t.limpiarTrabajo}
              </button>
            </div>

            {modoDetallado ? (
              renderModoDetallado()
            ) : (
              <div>
                <div style={styles.searchContainer}>
                  <div style={styles.searchIcon}>🔍</div>
                  <input type="text" style={styles.searchInput} placeholder={t.buscarServicio} value={terminoBusqueda} onChange={(e) => setTerminoBusqueda(e.target.value)} />
                  {terminoBusqueda.trim() && (
                    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                      {serviciosFiltrados.length} {t.serviciosEncontrados}
                    </div>
                  )}
                </div>

                <div style={styles.filtersContainer}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginRight: '8px' }}>{t.filtroAnio}</label>
                      <select style={styles.select} value={filtroAnio} onChange={(e) => setFiltroAnio(parseInt(e.target.value))}>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                      </select>
                    </div>
                    <div>
                      <h4 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>{idioma === 'es' ? 'Filtrar por categoría:' : 'Filter by category:'}</h4>
                      <div style={styles.filters}>
                        {Object.entries(categorias).map(([key, nombre]) => (
                          <button key={key} style={{ ...styles.filterButton, ...(categoriaSeleccionada === key ? styles.filterButtonActive : {}) }}
                            onClick={() => setCategoriaSeleccionada(key)}>
                            {nombre} ({key === 'todos' ? servicios.filter(s => s.anio === filtroAnio).length : servicios.filter(s => s.categoria === key && s.anio === filtroAnio).length})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {terminoBusquedaDebounced.trim() && serviciosFiltrados.length > 0 && (
                  <div style={styles.resultadosInfo}>
                    {t.resultadosPara} "<strong>{terminoBusquedaDebounced}</strong>"
                    {categoriaSeleccionada !== 'todos' && ` ${t.enCategoria} ${categorias[categoriaSeleccionada as keyof typeof categorias]}`}
                    : <strong>{serviciosFiltrados.length}</strong> {t.serviciosEncontrados}
                  </div>
                )}

                {cargandoServicios ? (
                  <div style={styles.loadingContainer}>
                    <div style={{ fontSize: '3rem' }}>🔄</div>
                    <div style={styles.loadingText}>{t.cargandoServicios}</div>
                  </div>
                ) : serviciosFiltrados.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{t.sinServicios}</h3>
                    <p>
                      {categoriaSeleccionada !== 'todos'
                        ? `${idioma === 'es' ? 'No hay servicios en la categoría' : 'No services in category'} "${categorias[categoriaSeleccionada as keyof typeof categorias]}" para ${filtroAnio}`
                        : terminoBusqueda.trim()
                          ? `${idioma === 'es' ? 'No hay resultados para' : 'No results for'} "${terminoBusqueda}"`
                          : `${idioma === 'es' ? 'No hay servicios para el año ' : 'No services for year '}${filtroAnio}`}
                    </p>
                  </div>
                ) : (
                  <div style={styles.serviciosGrid}>
                    {serviciosFiltrados.map(servicio => (
                      <div key={servicio.id} style={styles.servicioCard}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                      >
                        <div style={styles.cardHeader}>
                          <h3 style={styles.servicioNombre}>{servicio.nombre}</h3>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={styles.categoriaBadge}>
                              {categorias[servicio.categoria as keyof typeof categorias]}
                            </span>
                            {/* 🔥 Mostramos el año */}
                            <span style={styles.anioBadge}>
                              {servicio.anio}
                            </span>
                          </div>
                        </div>

                        <div style={styles.precio}>
                          {formatearPrecioCLP(servicio.precio_base)}
                        </div>

                        <div style={styles.controlesServicio}>
                          <div style={styles.controlesSuperiores}>
                            <input type="number" style={styles.inputCantidad} value={cantidades[servicio.id] || 1} min="1"
                              onChange={(e) => actualizarCantidad(servicio.id, parseInt(e.target.value) || 1)}
                              placeholder={idioma === 'es' ? "Cant" : "Qty"} />
                            <input type="text" style={styles.inputPieza} value={piezasDentales[servicio.id] || ''}
                              onChange={(e) => actualizarPiezaDental(servicio.id, e.target.value)}
                              placeholder={idioma === 'es' ? "Pieza" : "Tooth"} />
                            <button style={{ ...styles.addButton, ...(agregando ? styles.addButtonDisabled : {}) }}
                              onClick={() => agregarTrabajoSimple(servicio)} disabled={agregando}
                              onMouseEnter={(e) => { if (!agregando) e.currentTarget.style.backgroundColor = '#2563eb'; }}
                              onMouseLeave={(e) => { if (!agregando) e.currentTarget.style.backgroundColor = '#3b82f6'; }}>
                              {agregando ? '...' : t.agregar}
                            </button>
                          </div>
                          <input type="text" style={styles.inputNota} placeholder={t.notaPlaceholder}
                            value={notasServicios[servicio.id] || ''}
                            onChange={(e) => actualizarNota(servicio.id, e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.trabajosContainer} id="trabajos-agregados-container">
                  <h3 style={{ color: '#1e293b', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                    📋 {t.trabajosAgregados} ({trabajosAgregados.length})
                    {fechaTrabajo && (
                      <span style={{ fontSize: '1rem', color: '#64748b', marginLeft: '1rem', fontWeight: 'normal' }}>
                        | Mes: {formatearFecha(fechaTrabajo)}
                      </span>
                    )}
                  </h3>

                  {trabajosAgregados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                      <p>{idioma === 'es' ? 'No hay trabajos agregados. Completa los datos y agrega servicios.' : 'No works added. Complete the information and add services.'}</p>
                    </div>
                  ) : (
                    <>
                      {Object.entries(
                        trabajosAgregados.reduce((acc, trabajo) => {
                          const clave = `${trabajo.paciente}-${trabajo.rutPaciente}`;
                          if (!acc[clave]) { acc[clave] = { paciente: trabajo.paciente, rutPaciente: trabajo.rutPaciente, trabajos: [], total: 0 }; }
                          acc[clave].trabajos.push(trabajo);
                          acc[clave].total += trabajo.precioUnitario * trabajo.cantidad;
                          return acc;
                        }, {} as Record<string, { paciente: string, rutPaciente: string, trabajos: TrabajoAgregado[], total: number }>)
                      ).map(([, grupo], grupoIndex) => (
                        <div key={grupoIndex} style={{
                          backgroundColor: '#f8fafc', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem',
                          border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
                            <div>
                              <h4 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>👤 {grupo.paciente}</h4>
                              {grupo.rutPaciente && <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>RUT: {grupo.rutPaciente}</div>}
                              <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block', marginTop: '0.5rem' }}>
                                {grupo.trabajos.length} prestaciones
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>{formatearPrecioCLP(grupo.total)}</div>
                              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total del paciente</div>
                            </div>
                          </div>
                          {grupo.trabajos.map((trabajo, trabajoIndex) => (
                            <div key={trabajo.id} style={{ ...styles.trabajoItem, marginBottom: '1rem', backgroundColor: trabajoIndex % 2 === 0 ? 'white' : '#f8fafc' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>{trabajo.servicio.nombre}</div>
                                <div style={{ fontSize: '14px', color: '#64748b' }}>
                                  <div>🦷 {idioma === 'es' ? 'Pieza:' : 'Tooth:'} {trabajo.piezaDental || (idioma === 'es' ? 'No especificada' : 'Not specified')}</div>
                                  <div>🔢 {idioma === 'es' ? 'Cantidad:' : 'Quantity:'} {trabajo.cantidad}</div>
                                  {trabajo.notaEspecial && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '0.25rem', fontStyle: 'italic' }}>
                                      📝 {trabajo.notaEspecial}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.25rem' }}>{formatearPrecioCLP(trabajo.precioUnitario * trabajo.cantidad)}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>{trabajo.cantidad > 1 && `(${formatearPrecioCLP(trabajo.precioUnitario)} ${idioma === 'es' ? 'c/u' : 'each'})`}</div>
                                <button style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.375rem', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500', marginTop: '0.75rem' }}
                                  onClick={() => eliminarTrabajo(trabajo.id)}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}>
                                  {t.eliminar}
                                </button>
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{idioma === 'es' ? 'Total Paciente:' : 'Patient Total:'}</span>
                            <span style={{ fontWeight: '700', color: '#059669' }}>{formatearPrecioCLP(grupo.total)}</span>
                          </div>
                        </div>
                      ))}
                      <div style={styles.totalContainer}>
                        <span style={styles.totalText}>{t.total}:</span>
                        <span style={styles.totalAmount}>{formatearPrecioCLP(calcularTotal())}</span>
                      </div>
                      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button style={{ ...styles.addButton, padding: '1rem 3rem', fontSize: '1.125rem', opacity: puedeFinalizar ? 1 : 0.5, cursor: puedeFinalizar ? 'pointer' : 'not-allowed', backgroundColor: '#10b981' }}
                          onClick={finalizarTrabajo} disabled={!puedeFinalizar || guardando}
                          onMouseEnter={(e) => { if (puedeFinalizar && !guardando) e.currentTarget.style.backgroundColor = '#059669'; }}
                          onMouseLeave={(e) => { if (puedeFinalizar && !guardando) e.currentTarget.style.backgroundColor = '#10b981'; }}>
                          {guardando ? 'Guardando...' : t.finalizar}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showFloatingCounter && (
        <>
          <div style={{ ...styles.floatingCounter, bottom: '90px' }}
            onClick={() => { const container = document.getElementById('trabajos-agregados-container'); if (container) container.scrollIntoView({ behavior: 'smooth' }); }}
            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'; }}
            title={`${trabajosAgregados.length} prestaciones agregadas`}>
            {trabajosAgregados.length}
          </div>
          <div style={{ ...styles.floatingCounter, backgroundColor: '#10b981', bottom: '20px' }}
            onClick={scrollAlInicio}
            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'; }}
            title="Ir al inicio">
            ↑
          </div>
        </>
      )}
    </div>
  );
};

export default CrearTrabajo;