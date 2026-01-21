import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface CrearTrabajoProps {
  onBack: () => void;
}

// Definir interfaces para los datos de Supabase
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

interface ServicioSupabase {
  id: string;
  nombre: string;
  precio_base: number;
  categoria: string;
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
  fechaTrabajo?: Date; // Nueva propiedad para fecha del trabajo
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

// Mismas categorías que en GestionPrecios.tsx
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

// Función de debounce para la búsqueda
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Interfaz para historial de servicios usados
interface HistorialServicio {
  servicio_id: string;
  servicio_nombre: string;
  categoria: string;
  veces_usado: number;
  ultimo_uso: Date;
  clinica_id: string;
}

const CrearTrabajo: React.FC<CrearTrabajoProps> = ({ onBack }) => {
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
  const [cargandoServicios, setCargandoServicios] = useState<boolean>(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');
  const [cargandoDatos, setCargandoDatos] = useState<boolean>(true);
  const [notasServicios, setNotasServicios] = useState<{ [key: string]: string }>({});
  const [showFloatingCounter, setShowFloatingCounter] = useState(false);
  const [fechaTrabajo, setFechaTrabajo] = useState<string>('');
  const [mostrarHistorial, setMostrarHistorial] = useState<boolean>(false);
  const [historialServicios, setHistorialServicios] = useState<HistorialServicio[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false);
  
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

  // UseEffect para mostrar/ocultar el botón flotante
  useEffect(() => {
    setShowFloatingCounter(trabajosAgregados.length > 0);
  }, [trabajosAgregados.length]);

  // Usar debounce para la búsqueda (300ms)
  const terminoBusquedaDebounced = useDebounce(terminoBusqueda, 300);

  // Setear fecha actual por defecto
  useEffect(() => {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const año = hoy.getFullYear();
    setFechaTrabajo(`${año}-${mes}`);
  }, []);

  // Cargar historial cuando se selecciona una clínica
  useEffect(() => {
    if (clinicaSeleccionada) {
      cargarHistorialServicios();
    }
  }, [clinicaSeleccionada]);

  // Materiales organizados para modo detallado
  const materialCategories = [
    { 
      category: 'Dentición Residual', 
      items: ['Diente adyacente', 'Orientar endoestructura', 'Injerto en puente', 'Antagonista'], 
      icon: '🏗️'
    },
    { 
      category: 'Barras', 
      items: ['Pilar de barra', 'Segmento de barra'], 
      icon: '📏'
    },
    { 
      category: 'Removibles y Aparatos', 
      items: ['Dentadura completa', 'Corona telescópica primaria', 'Corona telescópica secundaria'], 
      icon: '👄'
    },
    { 
      category: 'Fresado Digital por Copia', 
      items: ['Fresado digital por copia'], 
      icon: '💻'
    },
    { 
      category: 'Inlays, Onlays y Carillas', 
      items: ['Inlay/Onlay', 'Carilla'], 
      icon: '🔩'
    },
    { 
      category: 'Pónticos y Mockup', 
      items: ['Póntico anatómico', 'Póntico excelente (Provisional)'], 
      icon: '🦷'
    },
    { 
      category: 'Coronas y Copings', 
      items: ['Corona amitónica', 'Corona excelente (Cordón frontal)'], 
      icon: '👑'
    }
  ];

  const materialTypes = [
    'Zirconia', 'Zirconia Multilayer', 'Zirconia Translúcido',
    'Acrílico/PMMA', 'Composite', 'Metal HP', 'Titanio',
    'Metal HP (Láser)', 'Titanio (Láser)', '30 Print'
  ];

  const toothColors = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4'];

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
      mesSiguiente: 'Mes siguiente'
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
      mesSiguiente: 'Next month'
    }
  };

  const t = textos[idioma];

  // Cargar datos desde Supabase
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setCargandoDatos(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('No hay usuario autenticado');
          return;
        }

        // Cargar clínicas del usuario (sin filtro de activo)
        const { data: clinicasData, error: clinicasError } = await supabase
          .from('clinicas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre', { ascending: true });

        if (clinicasError) {
          console.error('Error cargando clínicas:', clinicasError);
          throw clinicasError;
        }
        setClinicas(clinicasData || []);
        console.log('Clínicas cargadas:', clinicasData?.length || 0);

        // Cargar dentistas del usuario (sin filtro de activo)
        const { data: dentistasData, error: dentistasError } = await supabase
          .from('dentistas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre', { ascending: true });

        if (dentistasError) {
          console.error('Error cargando dentistas:', dentistasError);
          throw dentistasError;
        }
        setDentistas(dentistasData || []);
        console.log('Dentistas cargados:', dentistasData?.length || 0);

        // Cargar laboratoristas del usuario (sin filtro de activo)
        const { data: laboratoristasData, error: laboratoristasError } = await supabase
          .from('laboratoristas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nombre', { ascending: true });

        if (laboratoristasError) {
          console.error('Error cargando laboratoristas:', laboratoristasError);
          throw laboratoristasError;
        }
        setLaboratoristas(laboratoristasData || []);
        console.log('Laboratoristas cargados:', laboratoristasData?.length || 0);

        // Cargar servicios del usuario
        await cargarServicios();

      } catch (error: any) {
        console.error('Error cargando datos iniciales:', error);
      } finally {
        setCargandoDatos(false);
      }
    };
    
    cargarDatosIniciales();
  }, []);

  // Función para cargar historial de servicios más usados
  const cargarHistorialServicios = async () => {
    if (!clinicaSeleccionada) return;
    
    try {
      setCargandoHistorial(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No hay usuario autenticado');
        return;
      }

      // Consulta para obtener servicios más usados por esta clínica
      const { data, error } = await supabase
        .from('trabajos')
        .select(`
          servicios,
          clinica_id,
          created_at
        `)
        .eq('usuario_id', user.id)
        .eq('clinica_id', clinicaSeleccionada)
        .order('created_at', { ascending: false })
        .limit(100); // Últimos 100 trabajos para analizar

      if (error) throw error;

      // Procesar los datos para contar servicios más usados
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

      // Convertir a array y ordenar por veces_usado
      const historialArray = Array.from(historialMap.values())
        .sort((a, b) => b.veces_usado - a.veces_usado)
        .slice(0, 20); // Top 20 servicios más usados

      setHistorialServicios(historialArray);
      
    } catch (error: any) {
      console.error('Error cargando historial de servicios:', error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cargarServicios = async () => {
    try {
      setCargandoServicios(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No hay usuario autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log('Servicios cargados desde Supabase:', data?.length || 0, 'servicios');
      setServicios(data || []);

    } catch (error: any) {
      console.error('Error cargando servicios:', error);
    } finally {
      setCargandoServicios(false);
    }
  };

  // Filtrar dentistas por clínica seleccionada
  const dentistasFiltrados = useMemo(() => {
    if (!clinicaSeleccionada) return dentistas;
    return dentistas.filter(dentista => dentista.clinica_id === clinicaSeleccionada);
  }, [clinicaSeleccionada, dentistas]);

  const getToothColorHex = (color: string): string => {
    const colorMap: {[key: string]: string} = {
      'A1': '#fffaf0', 'A2': '#fef3c7', 'A3': '#fde68a', 'A3.5': '#fcd34d', 'A4': '#fbbf24',
      'B1': '#fef9c3', 'B2': '#fef08a', 'B3': '#fde047', 'B4': '#facc15',
      'C1': '#fef3c7', 'C2': '#fde68a', 'C3': '#fcd34d', 'C4': '#fbbf24',
      'D2': '#fed7aa', 'D3': '#fdba74', 'D4': '#fb923c'
    };
    return colorMap[color] || '#fff';
  };

  // Filtrar servicios por categoría y búsqueda con useMemo para optimización
  const serviciosFiltrados = useMemo(() => {
    if (servicios.length === 0) return [];

    let filtrados = servicios;
    
    // Filtrar por categoría
    if (categoriaSeleccionada !== 'todos') {
      filtrados = filtrados.filter(servicio => servicio.categoria === categoriaSeleccionada);
    }
    
    // Filtrar por término de búsqueda
    if (terminoBusquedaDebounced.trim()) {
      const terminoLower = terminoBusquedaDebounced.toLowerCase().trim();
      filtrados = filtrados.filter(servicio => 
        servicio.nombre.toLowerCase().includes(terminoLower) ||
        (categorias[servicio.categoria as keyof typeof categorias]?.toLowerCase() || '').includes(terminoLower)
      );
    }
    
    return filtrados;
  }, [servicios, categoriaSeleccionada, terminoBusquedaDebounced]);

  // Formatear precio en CLP (igual que en GestionPrecios.tsx)
  const formatearPrecioCLP = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  };

  // Formatear fecha en español
  const formatearFecha = (fechaStr: string) => {
    const [año, mes] = fechaStr.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    
    return fecha.toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Función para agregar trabajo en modo simple
  const agregarTrabajoSimple = (servicio: ServicioSupabase) => {
    const cantidad = cantidades[servicio.id] || 1;
    const piezaDental = piezasDentales[servicio.id] || '';
    const notaEspecial = notasServicios[servicio.id] || '';
    
    // Convertir fecha string a Date
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

    setTrabajosAgregados([...trabajosAgregados, trabajo]);
    setCantidades(prev => ({ ...prev, [servicio.id]: 1 }));
    setPiezasDentales(prev => ({ ...prev, [servicio.id]: '' }));
    setNotasServicios(prev => ({ ...prev, [servicio.id]: '' }));
  };

  // Función para agregar desde el historial
  const agregarDesdeHistorial = (servicioHistorial: HistorialServicio) => {
    // Buscar el servicio completo en la lista de servicios
    const servicioCompleto = servicios.find(s => s.id === servicioHistorial.servicio_id);
    
    if (servicioCompleto) {
      agregarTrabajoSimple(servicioCompleto);
    } else {
      // Si no está en la lista actual, buscar en Supabase o crear uno temporal
      const servicioTemporal: ServicioSupabase = {
        id: servicioHistorial.servicio_id,
        nombre: servicioHistorial.servicio_nombre,
        categoria: servicioHistorial.categoria,
        precio_base: 0, // Necesitaríamos cargar el precio real
        activo: true,
        usuario_id: '',
        creado_en: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      agregarTrabajoSimple(servicioTemporal);
    }
  };

  // Función para eliminar trabajo de la lista
  const eliminarTrabajo = (id: string) => {
    setTrabajosAgregados(trabajosAgregados.filter(t => t.id !== id));
  };

  // Calcular total
  const calcularTotal = () => {
    return trabajosAgregados.reduce((total, trabajo) => 
      total + (trabajo.precioUnitario * trabajo.cantidad), 0
    );
  };

  // Función principal para guardar el trabajo
  const finalizarTrabajo = async () => {
    if (!clinicaSeleccionada) {
      alert(idioma === 'es' ? 'Por favor selecciona una clínica' : 'Please select a clinic');
      return;
    }

    if (trabajosAgregados.length === 0) {
      alert(idioma === 'es' ? 'Por favor agrega al menos un trabajo' : 'Please add at least one work');
      return;
    }

    if (!fechaTrabajo) {
      alert(idioma === 'es' ? 'Por favor selecciona un mes para el trabajo' : 'Please select a month for the work');
      return;
    }

    try {
      console.log('🔍 Iniciando guardado de trabajo...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Error al obtener usuario:', userError);
        throw userError;
      }
      
      if (!user) {
        console.error('❌ No hay usuario autenticado');
        alert(idioma === 'es' ? 'No hay usuario autenticado' : 'No authenticated user');
        return;
      }

      console.log('✅ Usuario autenticado:', user.id);
      
      // Agrupar trabajos por paciente
      const trabajosPorPaciente = trabajosAgregados.reduce((acc, trabajo) => {
        const clave = `${trabajo.paciente}-${trabajo.rutPaciente}`;
        if (!acc[clave]) {
          acc[clave] = {
            paciente: trabajo.paciente,
            rutPaciente: trabajo.rutPaciente,
            trabajos: []
          };
        }
        acc[clave].trabajos.push(trabajo);
        return acc;
      }, {} as Record<string, { paciente: string, rutPaciente: string, trabajos: TrabajoAgregado[] }>);

      let trabajosGuardados = 0;
      
      // Crear un trabajo en la base de datos POR CADA PACIENTE
      for (const [, grupo] of Object.entries(trabajosPorPaciente)) {
        // Crear array de servicios para la base de datos
        const serviciosParaBD = grupo.trabajos.map(trabajo => ({
          servicio_id: trabajo.servicio.id,
          cantidad: trabajo.cantidad,
          precio: trabajo.precioUnitario * trabajo.cantidad,
          nombre: trabajo.servicio.nombre,
          pieza_dental: trabajo.piezaDental || '',
          nota_especial: trabajo.notaEspecial || trabajo.observaciones || ''
        }));

        // Convertir fechaTrabajo a fecha de creación
        const [año, mes] = fechaTrabajo.split('-');
        const fechaCreacion = new Date(parseInt(año), parseInt(mes) - 1, 1);
        
        // Calcular fecha de entrega (7 días después de la fecha de creación)
        const fechaEntrega = new Date(fechaCreacion);
        fechaEntrega.setDate(fechaEntrega.getDate() + 7);

        // Calcular total para este paciente
        const totalPaciente = grupo.trabajos.reduce((total, trabajo) => 
          total + (trabajo.precioUnitario * trabajo.cantidad), 0
        );

        // Datos del trabajo para ESTE PACIENTE
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
          fecha_entrega_estimada: fechaEntrega.toISOString().split('T')[0],
          notas: grupo.trabajos.map(t => 
            `${t.servicio.nombre}${t.notaEspecial ? ` (Nota: ${t.notaEspecial})` : ''}`
          ).join(' | '),
          modo: 'clinica',
          usuario_id: user.id,
          mes_trabajo: fechaTrabajo // Nuevo campo para filtrar por mes
        };

        console.log(`📝 Guardando trabajo para paciente: ${grupo.paciente}`, trabajoData);

        // Guardar en Supabase
        const { data: trabajoInsertado, error: errorTrabajo } = await supabase
          .from('trabajos')
          .insert(trabajoData)
          .select()
          .single();

        if (errorTrabajo) throw errorTrabajo;

        console.log(`✅ Trabajo insertado para ${grupo.paciente}:`, trabajoInsertado);
        trabajosGuardados++;
      }

      const mensajeExito = idioma === 'es' 
        ? `¡${trabajosGuardados} trabajos creados exitosamente!\nSe creó un trabajo por cada paciente.`
        : `Work created successfully!\nCreated ${trabajosGuardados} work orders (one per patient).`;
      
      alert(mensajeExito);
      
      // Limpiar todo después de guardar exitosamente
      limpiarTodo();
      
    } catch (error: any) {
      console.error('❌ Error completo en finalizarTrabajo:', error);
      
      const mensajeError = idioma === 'es' 
        ? `Error al guardar el trabajo: ${error.message || 'Error desconocido'}. Por favor intenta nuevamente.`
        : `Error saving work: ${error.message || 'Unknown error'}. Please try again.`;
      
      alert(mensajeError);
    }
  };

  // Actualizar cantidad
  const actualizarCantidad = (servicioId: string, cantidad: number) => {
    if (cantidad < 1) cantidad = 1;
    setCantidades(prev => ({ ...prev, [servicioId]: cantidad }));
  };

  // Actualizar pieza dental
  const actualizarPiezaDental = (servicioId: string, pieza: string) => {
    setPiezasDentales(prev => ({ ...prev, [servicioId]: pieza }));
  };

  // Actualizar nota especial
  const actualizarNota = (servicioId: string, nota: string) => {
    setNotasServicios(prev => ({ ...prev, [servicioId]: nota }));
  };

  // Navegar entre meses
  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const [año, mes] = fechaTrabajo.split('-').map(Number);
    let nuevoMes = mes;
    let nuevoAño = año;
    
    if (direccion === 'anterior') {
      nuevoMes--;
      if (nuevoMes < 1) {
        nuevoMes = 12;
        nuevoAño--;
      }
    } else {
      nuevoMes++;
      if (nuevoMes > 12) {
        nuevoMes = 1;
        nuevoAño++;
      }
    }
    
    setFechaTrabajo(`${nuevoAño}-${String(nuevoMes).padStart(2, '0')}`);
  };

  // Restablecer al mes actual
  const restablecerMesActual = () => {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const año = hoy.getFullYear();
    setFechaTrabajo(`${año}-${mes}`);
  };

  const puedeFinalizar = clinicaSeleccionada && trabajosAgregados.length > 0 && fechaTrabajo;

  // ==================== FUNCIONES MODO DETALLADO ====================
  const toggleMaterial = (material: string) => {
    const nuevosMateriales = configDetallada.selectedMaterials.includes(material)
      ? configDetallada.selectedMaterials.filter(m => m !== material)
      : [...configDetallada.selectedMaterials, material];
    
    setConfigDetallada({
      ...configDetallada,
      selectedMaterials: nuevosMateriales
    });
  };

  const crearTrabajoDetallado = () => {
    if (!nombrePaciente || !configDetallada.tooth) {
      alert(idioma === 'es' ? 'Por favor completa el nombre del paciente y el diente' : 'Please complete patient name and tooth');
      return;
    }

    if (configDetallada.selectedMaterials.length === 0) {
      alert(idioma === 'es' ? 'Por favor selecciona al menos un material' : 'Please select at least one material');
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
      activo: true,
      usuario_id: '',
      creado_en: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Convertir fecha string a Date
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

    setTrabajosAgregados([...trabajosAgregados, trabajo]);
    
    // Resetear configuración detallada
    setConfigDetallada({
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
    
    alert(idioma === 'es' ? '¡Trabajo detallado agregado exitosamente!' : 'Detailed work added successfully!');
  };

  // Limpiar todo
  const limpiarTodo = () => {
    const confirmMessage = idioma === 'es'
      ? '¿Estás seguro de que quieres limpiar todo el trabajo en progreso?'
      : 'Are you sure you want to clear all work in progress?';
    
    if (window.confirm(confirmMessage)) {
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
      setShowFloatingCounter(false);
      setMostrarHistorial(false);
      
      // Restablecer fecha al mes actual
      const hoy = new Date();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const año = hoy.getFullYear();
      setFechaTrabajo(`${año}-${mes}`);
      
      alert(idioma === 'es' ? 'Todo limpiado correctamente' : 'Everything cleared successfully');
    }
  };

  // ==================== MANEJO DE CAMBIO DE PACIENTE ====================
  // Manejar cambio de nombre de paciente
  const handleNombrePacienteChange = (nuevoNombre: string) => {
    const nombreAnterior = nombrePaciente;
    setNombrePaciente(nuevoNombre);
    
    // Si hay trabajos agregados y el nombre cambió (no está vacío)
    if (trabajosAgregados.length > 0 && nuevoNombre.trim() !== '' && nombreAnterior !== nuevoNombre) {
      // Verificar si algún trabajo tiene un nombre diferente al nuevo
      const trabajosConNombreDiferente = trabajosAgregados.filter(
        trabajo => trabajo.paciente !== nombreAnterior
      );
      
      // Si todos los trabajos tienen el mismo nombre que el anterior, preguntar si actualizar
      if (trabajosConNombreDiferente.length === 0 && nombreAnterior.trim() !== '') {
        const confirmar = window.confirm(t.actualizarPaciente);
        if (confirmar) {
          // Actualizar todos los trabajos al nuevo nombre
          const trabajosActualizados = trabajosAgregados.map(trabajo => ({
            ...trabajo,
            paciente: nuevoNombre,
            rutPaciente: rutPaciente // También actualizar RUT si cambió
          }));
          setTrabajosAgregados(trabajosActualizados);
        }
      }
    }
  };

  // Manejar cambio de RUT de paciente
  const handleRutPacienteChange = (nuevoRut: string) => {
    const rutAnterior = rutPaciente;
    setRutPaciente(nuevoRut);
    
    // Si hay trabajos agregados y el RUT cambió
    if (trabajosAgregados.length > 0 && rutAnterior !== nuevoRut) {
      // Actualizar RUT en todos los trabajos
      const trabajosActualizados = trabajosAgregados.map(trabajo => ({
        ...trabajo,
        rutPaciente: nuevoRut
      }));
      setTrabajosAgregados(trabajosActualizados);
    }
  };

  // Estilos mejorados con TypeScript
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    header: {
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    logo: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#3b82f6',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer'
    },
    userSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem'
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
    // Botón flotante
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
    languageSelector: {
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center'
    },
    languageButton: {
      padding: '0.5rem 1rem',
      border: '1px solid #cbd5e1',
      borderRadius: '6px',
      backgroundColor: 'white',
      color: '#475569',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    languageButtonActive: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: '1px solid #3b82f6'
    },
    // Selector de modo
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
    // Controles de fecha
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
    // Historial de servicios
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
    // Filtros de categoría
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
    // Servicios Grid
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
      lineHeight: '1.4'
    },
    categoriaBadge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: '#f1f5f9',
      color: '#475569'
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
      flex: 1
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
    // Modo detallado - 3 columnas
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
    // Columna izquierda: Tipos de trabajos
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
    // Columna central: Material a utilizar
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
    // Columna derecha: Opciones y parámetros
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
    // Sliders
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
    // Selector de color
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
    // Configuración de diente
    toothConfig: {
      backgroundColor: '#f8fafc',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      marginBottom: '1rem'
    },
    // Botón para crear trabajo detallado
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

  // Renderizar historial de servicios
  const renderHistorialServicios = () => (
    <div style={styles.historialContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={styles.historialTitle}>
          📊 {t.historialTitulo}
        </h3>
        <button
          style={styles.historialToggle}
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
        >
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
              {historialServicios.slice(0, 6).map((servicio, index) => (
                <div 
                  key={servicio.servicio_id} 
                  style={styles.historialCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={styles.historialInfo}>
                    <div style={styles.historialNombre}>{servicio.servicio_nombre}</div>
                    <div style={styles.historialStats}>
                      <span>🔥 {servicio.veces_usado} {t.vecesUsado}</span>
                      <span>📅 {servicio.ultimo_uso.toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US')}</span>
                    </div>
                  </div>
                  <button
                    style={styles.historialButton}
                    onClick={() => agregarDesdeHistorial(servicio)}
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

  // Renderizar modo detallado
  const renderModoDetallado = () => (
    <div style={styles.detailedContainer}>
      {/* Columna izquierda: Tipos de trabajos */}
      <div style={styles.column}>
        <h3 style={styles.columnTitle}>{t.tiposTrabajos}</h3>
        
        {materialCategories.map((category, index) => (
          <div key={index} style={styles.categoryCard}>
            <div style={styles.categoryHeader}>
              <div style={styles.categoryIcon}>{category.icon}</div>
              <h4 style={styles.categoryTitle}>{category.category}</h4>
            </div>
            {category.items.map((item, itemIndex) => (
              <div 
                key={itemIndex} 
                style={styles.materialItem}
                onClick={() => toggleMaterial(item)}
              >
                <div style={{
                  ...styles.materialCheckbox,
                  ...(configDetallada.selectedMaterials.includes(item) ? styles.materialCheckboxChecked : {})
                }}>
                  {configDetallada.selectedMaterials.includes(item) && '✓'}
                </div>
                <span style={styles.materialName}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Columna central: Material a utilizar */}
      <div style={styles.column}>
        <h3 style={styles.columnTitle}>{t.materialUtilizar}</h3>
        
        <div style={styles.toothConfig}>
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.diente}</label>
            <input
              type="text"
              style={styles.input}
              value={configDetallada.tooth}
              onChange={(e) => setConfigDetallada({...configDetallada, tooth: e.target.value})}
              placeholder="Ej: 15, 21, 36"
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.materialConfig}</label>
            <select 
              style={styles.select}
              value={configDetallada.materialConfig}
              onChange={(e) => setConfigDetallada({...configDetallada, materialConfig: e.target.value})}
            >
              <option value="Default">Default</option>
              <option value="Premium">Premium</option>
              <option value="Economy">Economy</option>
              <option value="Custom">Personalizado</option>
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>{t.materialBase}</label>
            <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
              <strong>Solar Laser / 30 Pinz</strong>
            </div>
          </div>
        </div>

        <h4 style={styles.optionTitle}>{t.materialType}</h4>
        <div style={styles.materialTypeGrid}>
          {materialTypes.map((type, index) => (
            <div 
              key={index} 
              style={{
                ...styles.materialTypeCard,
                ...(configDetallada.materialType === type ? styles.materialTypeCardSelected : {})
              }}
              onClick={() => setConfigDetallada({...configDetallada, materialType: type})}
            >
              <div style={styles.materialTypeName}>{type}</div>
              <div style={styles.materialTypePrice}>
                {formatearPrecioCLP(
                  type === 'Zirconia' ? 150000 : 
                  type === 'Titanio' ? 250000 : 
                  type === 'Acrílico/PMMA' ? 80000 : 
                  type.includes('Zirconia') ? 180000 : 100000
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna derecha: Opciones y parámetros */}
      <div style={styles.column}>
        <h3 style={styles.columnTitle}>{t.opcionesParametros}</h3>
        
        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>📊 {t.optionsParams}</h4>
          <label style={styles.checkboxLabel}>
            <div style={{
              ...styles.customCheckbox,
              ...(configDetallada.implantBased ? styles.customCheckboxChecked : {})
            }} 
              onClick={() => setConfigDetallada({...configDetallada, implantBased: !configDetallada.implantBased})}
            />
            <span>{t.implantBased}</span>
          </label>
          
          <div style={{ marginTop: '12px' }}>
            <label style={styles.label}>1. {t.customAbstinent}</label>
            <select 
              style={styles.select}
              value={configDetallada.customAbstinent}
              onChange={(e) => setConfigDetallada({...configDetallada, customAbstinent: e.target.value})}
            >
              <option value="">Seleccionar opción</option>
              <option value="Orsular Monaco">Orsular Monaco</option>
              <option value="Beta de bar">Beta de bar</option>
              <option value="Other">Otro</option>
            </select>
          </div>
          
          <label style={{...styles.checkboxLabel, marginTop: '12px'}}>
            <div style={{
              ...styles.customCheckbox,
              ...(configDetallada.additionalScans ? styles.customCheckboxChecked : {})
            }} 
              onClick={() => setConfigDetallada({...configDetallada, additionalScans: !configDetallada.additionalScans})}
            />
            <span>{t.additionalScans}</span>
          </label>
        </div>

        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>📐 2. {t.preopModel}</h4>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}>
              <span>{t.minimalThickness}</span>
              <span style={styles.sliderValue}>{configDetallada.minimalThickness}mm</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={configDetallada.minimalThickness}
              onChange={(e) => setConfigDetallada({...configDetallada, minimalThickness: parseFloat(e.target.value)})}
              style={styles.slider}
            />
          </div>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderLabel}>
              <span>{t.gapWidthCement}</span>
              <span style={styles.sliderValue}>{configDetallada.gapWidthCement}mm</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={configDetallada.gapWidthCement}
              onChange={(e) => setConfigDetallada({...configDetallada, gapWidthCement: parseFloat(e.target.value)})}
              style={styles.slider}
            />
          </div>
        </div>

        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>🔩 3. {t.screwRelated}</h4>
          <label style={styles.checkboxLabel}>
            <div style={{
              ...styles.customCheckbox,
              ...(configDetallada.orsStockAbstinent ? styles.customCheckboxChecked : {})
            }} 
              onClick={() => setConfigDetallada({...configDetallada, orsStockAbstinent: !configDetallada.orsStockAbstinent})}
            />
            <span>{t.orsStockAbstinent}</span>
          </label>
        </div>

        <div style={styles.optionGroup}>
          <h4 style={styles.optionTitle}>🎨 {t.toothColor}</h4>
          <div style={styles.colorGrid}>
            {toothColors.map((color, index) => (
              <div
                key={index}
                style={{
                  ...styles.colorItem,
                  backgroundColor: getToothColorHex(color),
                  ...(configDetallada.toothColor === color ? styles.colorItemSelected : {})
                }}
                onClick={() => setConfigDetallada({...configDetallada, toothColor: color})}
              >
                {color}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.createButton}>
          <button 
            style={styles.button}
            onClick={crearTrabajoDetallado}
            disabled={!configDetallada.tooth || configDetallada.selectedMaterials.length === 0}
          >
            {t.crearTrabajoDetallado}
          </button>
        </div>
      </div>
    </div>
  );

  // Mostrar estado de carga
  if (cargandoDatos) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logo} onClick={onBack}>
            <span>🦷</span>
            DentalFlow
          </div>
        </header>
        <main style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={{ fontSize: '3rem' }}>🔄</div>
            <div style={styles.loadingText}>{t.cargandoDatos}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo} onClick={onBack}>
          <span>🦷</span>
          DentalFlow
        </div>
        
        <div style={styles.userSection}>
          <div style={styles.languageSelector}>
            <button
              style={{
                ...styles.languageButton,
                ...(idioma === 'es' ? styles.languageButtonActive : {})
              }}
              onClick={() => setIdioma('es')}
            >
              🇪🇸 Español
            </button>
            <button
              style={{
                ...styles.languageButton,
                ...(idioma === 'en' ? styles.languageButtonActive : {})
              }}
              onClick={() => setIdioma('en')}
            >
              🇺🇸 English
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Welcome Section */}
        <section style={styles.welcomeSection}>
          <h1 style={styles.welcomeTitle}>
            {t.title}
          </h1>
          <p style={styles.welcomeSubtitle}>
            {idioma === 'es' 
              ? 'Crea listas de trabajo para tus pacientes seleccionando servicios de tu catálogo.'
              : 'Create work lists for your patients by selecting services from your catalog.'}
          </p>
        </section>

        {/* Información del paciente */}
        <div style={styles.formContainer}>
          <h3 style={{ color: '#1e293b', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            📋 {idioma === 'es' ? 'Información del Trabajo' : 'Work Information'}
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.clinica}</label>
              <select 
                style={styles.select}
                value={clinicaSeleccionada}
                onChange={(e) => {
                  setClinicaSeleccionada(e.target.value);
                  setDentistaSeleccionado('');
                  setMostrarHistorial(false);
                }}
                required
              >
                <option value="">{idioma === 'es' ? 'Selecciona una clínica' : 'Select a clinic'}</option>
                {clinicas.map(clinica => (
                  <option key={clinica.id} value={clinica.id}>
                    {clinica.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.dentista}</label>
              <select 
                style={styles.select}
                value={dentistaSeleccionado}
                onChange={(e) => setDentistaSeleccionado(e.target.value)}
                disabled={!clinicaSeleccionada}
              >
                <option value="">{idioma === 'es' ? 'Selecciona un dentista (opcional)' : 'Select a dentist (optional)'}</option>
                {dentistasFiltrados.map(dentista => (
                  <option key={dentista.id} value={dentista.id}>
                    {dentista.nombre} - {dentista.especialidad}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.laboratorista}</label>
              <select 
                style={styles.select}
                value={laboratoristaSeleccionado}
                onChange={(e) => setLaboratoristaSeleccionado(e.target.value)}
              >
                <option value="">{idioma === 'es' ? 'Sin asignar' : 'Not assigned'}</option>
                {laboratoristas.map(laboratorista => (
                  <option key={laboratorista.id} value={laboratorista.id}>
                    {laboratorista.nombre} - {laboratorista.especialidad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de fecha del trabajo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={styles.label}>{t.fechaTrabajo}</label>
            <div style={styles.dateControls}>
              <div style={styles.dateDisplay}>
                📅 {formatearFecha(fechaTrabajo)}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  style={styles.dateButton}
                  onClick={() => cambiarMes('anterior')}
                  title={t.mesAnterior}
                >
                  ◀️
                </button>
                
                <input
                  type="month"
                  style={styles.input}
                  value={fechaTrabajo}
                  onChange={(e) => setFechaTrabajo(e.target.value)}
                  title={t.seleccionaMes}
                />
                
                <button
                  style={styles.dateButton}
                  onClick={() => cambiarMes('siguiente')}
                  title={t.mesSiguiente}
                >
                  ▶️
                </button>
                
                <button
                  style={styles.dateButton}
                  onClick={restablecerMesActual}
                  title={t.mesActual}
                >
                  🔄
                </button>
              </div>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t.paciente}</label>
              <input
                type="text"
                style={styles.input}
                value={nombrePaciente}
                onChange={(e) => handleNombrePacienteChange(e.target.value)}
                placeholder={idioma === 'es' ? "Ej: Juan Pérez" : "Ex: John Doe"}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t.rut}</label>
              <input
                type="text"
                style={styles.input}
                value={rutPaciente}
                onChange={(e) => handleRutPacienteChange(e.target.value)}
                placeholder={idioma === 'es' ? "Ej: 12.345.678-9" : "Ex: 12345678-9"}
              />
            </div>
          </div>
          
          {trabajosAgregados.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '0.5rem',
              fontSize: '14px',
              color: '#92400e'
            }}>
              ℹ️ {t.cambiarPaciente}
            </div>
          )}
        </div>

        {/* Historial de servicios más usados */}
        {clinicaSeleccionada && renderHistorialServicios()}

        {/* Selector de modo */}
        <div style={styles.modeSelector}>
          <button
            style={{
              ...styles.modeButton,
              ...(!modoDetallado ? styles.modeButtonActive : {})
            }}
            onClick={() => setModoDetallado(false)}
          >
            {t.modoSimple}
          </button>
          <button
            style={{
              ...styles.modeButton,
              ...(modoDetallado ? styles.modeButtonActive : {})
            }}
            onClick={() => setModoDetallado(true)}
          >
            {t.modoDetallado}
          </button>
        </div>

        {/* Botón para limpiar todo */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button
            style={styles.clearButton}
            onClick={limpiarTodo}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            🗑️ {t.limpiarTrabajo}
          </button>
        </div>

        {/* Modo seleccionado */}
        {modoDetallado ? (
          renderModoDetallado()
        ) : (
          /* Modo Simple */
          <div>
            {/* Buscador de servicios */}
            <div style={styles.searchContainer}>
              <div style={styles.searchIcon}>🔍</div>
              <input
                type="text"
                style={styles.searchInput}
                placeholder={t.buscarServicio}
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
              />
              {terminoBusqueda.trim() && (
                <div style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {serviciosFiltrados.length} {t.serviciosEncontrados}
                </div>
              )}
            </div>

            {/* Filtros de categoría */}
            <div style={styles.filtersContainer}>
              <h4 style={{ marginBottom: '1rem', color: '#1e293b' }}>
                {idioma === 'es' ? 'Filtrar por categoría:' : 'Filter by category:'}
              </h4>
              <div style={styles.filters}>
                {Object.entries(categorias).map(([key, nombre]) => (
                  <button
                    key={key}
                    style={{
                      ...styles.filterButton,
                      ...(categoriaSeleccionada === key ? styles.filterButtonActive : {})
                    }}
                    onClick={() => setCategoriaSeleccionada(key)}
                  >
                    {nombre} ({key === 'todos' ? servicios.length : servicios.filter(s => s.categoria === key).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Información de búsqueda */}
            {terminoBusquedaDebounced.trim() && serviciosFiltrados.length > 0 && (
              <div style={styles.resultadosInfo}>
                {t.resultadosPara} "<strong>{terminoBusquedaDebounced}</strong>"
                {categoriaSeleccionada !== 'todos' && ` ${t.enCategoria} ${categorias[categoriaSeleccionada as keyof typeof categorias]}`}
                : <strong>{serviciosFiltrados.length}</strong> {t.serviciosEncontrados}
              </div>
            )}

            {/* Lista de servicios */}
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
                    ? `${idioma === 'es' ? 'No hay servicios en la categoría' : 'No services in category'} "${categorias[categoriaSeleccionada as keyof typeof categorias]}"`
                    : terminoBusqueda.trim() 
                    ? `${idioma === 'es' ? 'No hay resultados para' : 'No results for'} "${terminoBusqueda}"`
                    : idioma === 'es' 
                    ? 'Comienza agregando servicios en la Gestión de Precios'
                    : 'Start by adding services in Price Management'
                  }
                </p>
              </div>
            ) : (
              <div style={styles.serviciosGrid}>
                {serviciosFiltrados.map(servicio => (
                  <div 
                    key={servicio.id} 
                    style={styles.servicioCard}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <h3 style={styles.servicioNombre}>{servicio.nombre}</h3>
                      <span style={styles.categoriaBadge}>
                        {categorias[servicio.categoria as keyof typeof categorias]}
                      </span>
                    </div>

                    <div style={styles.precio}>
                      {formatearPrecioCLP(servicio.precio_base)}
                    </div>

                    <div style={styles.controlesServicio}>
                      <div style={styles.controlesSuperiores}>
                        <input
                          type="number"
                          style={styles.inputCantidad}
                          value={cantidades[servicio.id] || 1}
                          min="1"
                          onChange={(e) => actualizarCantidad(servicio.id, parseInt(e.target.value) || 1)}
                          placeholder={idioma === 'es' ? "Cant" : "Qty"}
                        />
                        
                        <input
                          type="text"
                          style={styles.inputPieza}
                          value={piezasDentales[servicio.id] || ''}
                          onChange={(e) => actualizarPiezaDental(servicio.id, e.target.value)}
                          placeholder={idioma === 'es' ? "Pieza" : "Tooth"}
                        />
                        
                        <button 
                          style={styles.addButton}
                          onClick={() => agregarTrabajoSimple(servicio)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                          {t.agregar}
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        style={styles.inputNota}
                        placeholder={t.notaPlaceholder}
                        value={notasServicios[servicio.id] || ''}
                        onChange={(e) => actualizarNota(servicio.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de Trabajos Agregados */}
            <div style={styles.trabajosContainer} id="trabajos-agregados-container">
              <h3 style={{ color: '#1e293b', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                📋 {t.trabajosAgregados} ({trabajosAgregados.length})
                {fechaTrabajo && (
                  <span style={{ 
                    fontSize: '1rem', 
                    color: '#64748b', 
                    marginLeft: '1rem',
                    fontWeight: 'normal'
                  }}>
                    | Mes: {formatearFecha(fechaTrabajo)}
                  </span>
                )}
              </h3>
              
              {trabajosAgregados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                  <p>
                    {idioma === 'es' 
                      ? 'No hay trabajos agregados. Completa los datos y agrega servicios.'
                      : 'No works added. Complete the information and add services.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Agrupar trabajos por paciente */}
                  {Object.entries(
                    trabajosAgregados.reduce((acc, trabajo) => {
                      const clave = `${trabajo.paciente}-${trabajo.rutPaciente}`;
                      if (!acc[clave]) {
                        acc[clave] = {
                          paciente: trabajo.paciente,
                          rutPaciente: trabajo.rutPaciente,
                          trabajos: [],
                          total: 0
                        };
                      }
                      acc[clave].trabajos.push(trabajo);
                      acc[clave].total += trabajo.precioUnitario * trabajo.cantidad;
                      return acc;
                    }, {} as Record<string, { 
                      paciente: string, 
                      rutPaciente: string, 
                      trabajos: TrabajoAgregado[],
                      total: number
                    }>)
                  ).map(([, grupo], grupoIndex) => (
                    <div key={grupoIndex} style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      marginBottom: '2rem',
                      border: '1px solid #e2e8f0',
                      borderLeft: '4px solid #3b82f6'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '2px solid #e2e8f0'
                      }}>
                        <div>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>
                            👤 {grupo.paciente}
                          </h4>
                          {grupo.rutPaciente && (
                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                              RUT: {grupo.rutPaciente}
                            </div>
                          )}
                          <div style={{ 
                            backgroundColor: '#3b82f6', 
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            display: 'inline-block',
                            marginTop: '0.5rem'
                          }}>
                            {grupo.trabajos.length} prestaciones
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                            {formatearPrecioCLP(grupo.total)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            Total del paciente
                          </div>
                        </div>
                      </div>
                      
                      {/* Lista de trabajos para este paciente */}
                      {grupo.trabajos.map((trabajo, trabajoIndex) => (
                        <div key={trabajo.id} style={{
                          ...styles.trabajoItem,
                          marginBottom: '1rem',
                          backgroundColor: trabajoIndex % 2 === 0 ? 'white' : '#f8fafc'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                              {trabajo.servicio.nombre}
                            </div>
                            <div style={{ fontSize: '14px', color: '#64748b' }}>
                              <div>🦷 {idioma === 'es' ? 'Pieza:' : 'Tooth:'} {trabajo.piezaDental || (idioma === 'es' ? 'No especificada' : 'Not specified')}</div>
                              <div>🔢 {idioma === 'es' ? 'Cantidad:' : 'Quantity:'} {trabajo.cantidad}</div>
                              {trabajo.notaEspecial && (
                                <div style={{ 
                                  marginTop: '0.5rem', 
                                  fontSize: '12px', 
                                  color: '#f59e0b', 
                                  backgroundColor: '#fef3c7', 
                                  padding: '0.5rem', 
                                  borderRadius: '0.25rem',
                                  fontStyle: 'italic'
                                }}>
                                  📝 {trabajo.notaEspecial}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.25rem' }}>
                              {formatearPrecioCLP(trabajo.precioUnitario * trabajo.cantidad)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>
                              {trabajo.cantidad > 1 && `(${formatearPrecioCLP(trabajo.precioUnitario)} ${idioma === 'es' ? 'c/u' : 'each'})`}
                            </div>
                            <button 
                              style={{ 
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                marginTop: '0.75rem'
                              }}
                              onClick={() => eliminarTrabajo(trabajo.id)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                            >
                              {t.eliminar}
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Total por paciente */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '0.5rem',
                        marginTop: '1rem',
                        borderTop: '1px solid #e2e8f0'
                      }}>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>
                          {idioma === 'es' ? 'Total Paciente:' : 'Patient Total:'}
                        </span>
                        <span style={{ fontWeight: '700', color: '#059669' }}>
                          {formatearPrecioCLP(grupo.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total General */}
                  <div style={styles.totalContainer}>
                    <span style={styles.totalText}>{t.total}:</span>
                    <span style={styles.totalAmount}>{formatearPrecioCLP(calcularTotal())}</span>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button 
                      style={{ 
                        ...styles.addButton,
                        padding: '1rem 3rem',
                        fontSize: '1.125rem',
                        opacity: puedeFinalizar ? 1 : 0.5,
                        cursor: puedeFinalizar ? 'pointer' : 'not-allowed'
                      }}
                      onClick={finalizarTrabajo}
                      disabled={!puedeFinalizar}
                      onMouseEnter={(e) => {
                        if (puedeFinalizar) {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (puedeFinalizar) {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                        }
                      }}
                    >
                      {t.finalizar}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Botón flotante */}
      {showFloatingCounter && (
        <div 
          style={styles.floatingCounter}
          onClick={() => {
            const trabajosContainer = document.getElementById('trabajos-agregados-container');
            if (trabajosContainer) {
              trabajosContainer.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onMouseEnter={(e: any) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e: any) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
          }}
          title={`${trabajosAgregados.length} prestaciones agregadas`}
        >
          {trabajosAgregados.length}
        </div>
      )}
    </div>
  );
};

export default CrearTrabajo;