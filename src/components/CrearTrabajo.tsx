// CrearTrabajo.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { useDialogos } from './ui/Dialogos';
import { useMediaQuery, BREAKPOINTS } from '../hooks/useMediaQuery';

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

// Categoría especial: prestaciones más usadas en la clínica elegida
const CATEGORIA_MAS_USADAS = 'mas_usadas';

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
  const { confirmarTexto, avisar } = useDialogos();
  const esCompacto = useMediaQuery(BREAKPOINTS.tablet);  // tablet y celular: una columna
  const esMovil = useMediaQuery(BREAKPOINTS.movil);
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
  // Laboratorista: crea trabajos sin ver precios (la base de datos los calcula)
  const [esLaboratorista, setEsLaboratorista] = useState<boolean>(false);
  const [miFichaLaboratorista, setMiFichaLaboratorista] = useState<string>('');
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
  const [fechaTrabajo, setFechaTrabajo] = useState<string>('');
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

  const terminoBusquedaDebounced = useDebounce(terminoBusqueda, 300);

  // Efectos
  useEffect(() => {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const año = hoy.getFullYear();
    setFechaTrabajo(`${año}-${mes}`);
  }, []);

  useEffect(() => {
    if (clinicaSeleccionada) {
      cargarHistorialServicios();
    } else {
      // Sin clínica no hay "más usadas"
      setHistorialServicios([]);
      setCategoriaSeleccionada(prev => (prev === CATEGORIA_MAS_USADAS ? 'todos' : prev));
    }
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

        const { data: perfilRol } = await supabase
          .from('perfiles_usuarios')
          .select('rol')
          .eq('id', user.id)
          .maybeSingle();
        const laboratorista = perfilRol?.rol === 'laboratorista';
        setEsLaboratorista(laboratorista);

        // Clínicas
        const { data: clinicasData } = await supabase
          .from('clinicas')
          .select('*')
          .order('nombre');
        setClinicas(clinicasData || []);

        // Dentistas
        const { data: dentistasData } = await supabase
          .from('dentistas')
          .select('*')
          .order('nombre');
        setDentistas(dentistasData || []);

        // Laboratoristas del laboratorio (el laboratorista solo recibe su propia ficha)
        const { data: laboratoristasData } = await supabase
          .from('laboratoristas')
          .select('*')
          .order('nombre');
        setLaboratoristas(laboratoristasData || []);
        if (laboratorista) {
          const propia = (laboratoristasData || []).find((l: any) => l.usuario_id === user.id);
          if (propia) {
            setMiFichaLaboratorista(propia.id);
            setLaboratoristaSeleccionado(propia.id);
          }
        }

        await cargarServicios(laboratorista);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setCargandoDatos(false);
      }
    };
    cargarDatosIniciales();
  }, []);

  const cargarServicios = async (laboratorista: boolean) => {
    try {
      setCargandoServicios(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Admin: catálogo con precios. Laboratorista: catálogo sin precios.
      const { data, error } = await supabase
        .from(laboratorista ? 'servicios_catalogo' : 'servicios')
        .select('*') // incluye anio
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) throw error;
      setServicios(((data || []) as any[]).map(s => ({ ...s, precio_base: Number(s.precio_base) || 0 })));
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
      // Últimos trabajos de la clínica que el usuario puede ver
      const { data: filas, error } = await supabase
        .from(esLaboratorista ? 'trabajos_vista' : 'trabajos')
        .select('servicios, clinica_id, creado_en')
        .eq('clinica_id', clinicaSeleccionada)
        .order('creado_en', { ascending: false })
        .limit(100);
      if (error) throw error;
      const data = (filas || []).map((f: any) => ({ ...f, created_at: f.creado_en }));

      const historialMap = new Map<string, HistorialServicio>();
      data.forEach(trabajo => {
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

    if (categoriaSeleccionada === CATEGORIA_MAS_USADAS) {
      // Más usadas en la clínica elegida, en orden de uso (solo las que siguen en el catálogo)
      filtrados = historialServicios
        .map(h => servicios.find(s => s.id === h.servicio_id))
        .filter((s): s is ServicioSupabase => !!s);
    } else {
      if (categoriaSeleccionada !== 'todos') {
        filtrados = filtrados.filter(s => s.categoria === categoriaSeleccionada);
      }
      // 🔥 Filtro por año
      filtrados = filtrados.filter(s => s.anio === filtroAnio);
    }

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
  }, [servicios, categoriaSeleccionada, filtroAnio, terminoBusquedaDebounced, historialServicios]);

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
      avisar(idioma === 'es' ? 'Selecciona una clínica' : 'Select a clinic');
      setGuardando(false);
      return;
    }
    if (trabajosAgregados.length === 0) {
      avisar(idioma === 'es' ? 'Agrega al menos un trabajo' : 'Add at least one work');
      setGuardando(false);
      return;
    }
    if (!fechaTrabajo) {
      avisar(idioma === 'es' ? 'Selecciona un mes' : 'Select a month');
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
        // Laboratorista: los precios los calcula la base de datos con el catálogo
        const serviciosParaBD = grupo.trabajos.map(t => ({
          servicio_id: t.servicio.id,
          cantidad: t.cantidad,
          precio: esLaboratorista ? 0 : t.precioUnitario * t.cantidad,
          nombre: t.servicio.nombre,
          pieza_dental: t.piezaDental || '',
          nota_especial: t.notaEspecial || ''
        }));
        const [año, mes] = fechaTrabajo.split('-');
        const fechaCreacion = new Date(parseInt(año), parseInt(mes) - 1, 1);
        const fechaEntrega = new Date(fechaCreacion);
        fechaEntrega.setDate(fechaEntrega.getDate() + 7);
        const totalPaciente = esLaboratorista ? 0 : grupo.trabajos.reduce((sum, t) => sum + (t.precioUnitario * t.cantidad), 0);
        const trabajoData = {
          paciente: grupo.paciente.trim(),
          rut_paciente: grupo.rutPaciente || '',
          clinica_id: clinicaSeleccionada,
          dentista_id: dentistaSeleccionado || null,
          laboratorista_id: (esLaboratorista ? miFichaLaboratorista : laboratoristaSeleccionado) || null,
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
      avisar(idioma === 'es' ? 'Trabajo guardado exitosamente' : 'Work saved successfully');
      reiniciarFormulario();
    } catch (error: any) {
      console.error('Error finalizar:', error);
      // Mensajes de la base de datos vienen con un código delante (PLAN_VENCIDO: ...)
      const mensaje = String(error?.message || '').replace(/^[A-Z_]+:\s*/, '');
      avisar(`Error: ${mensaje}`);
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

  // Botón manual "Limpiar trabajo": pide confirmación antes de borrar.
  // "Limpiar trabajo": borra la información del trabajo y los trabajos agregados
  // (el catálogo, la búsqueda y el modo quedan como están).
  const limpiarTodo = async () => {
    const ok = await confirmarTexto(idioma === 'es'
      ? '¿Limpiar el trabajo?\nSe borrarán la información del trabajo y los trabajos agregados.'
      : 'Clear the work?', { textoConfirmar: idioma === 'es' ? 'Limpiar' : 'Clear', peligro: true });
    if (!ok) return;
    setClinicaSeleccionada('');
    setDentistaSeleccionado('');
    setLaboratoristaSeleccionado(esLaboratorista ? miFichaLaboratorista : '');
    setNombrePaciente('');
    setRutPaciente('');
    setTrabajosAgregados([]);
    if (categoriaSeleccionada === CATEGORIA_MAS_USADAS) setCategoriaSeleccionada('todos');
    restablecerMesActual();
  };

  // Reinicia el formulario sin preguntar (se usa después de guardar con éxito).
  const reiniciarFormulario = () => {
    setClinicaSeleccionada('');
    setDentistaSeleccionado('');
    setLaboratoristaSeleccionado(esLaboratorista ? miFichaLaboratorista : '');
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
    const hoy = new Date();
    setFechaTrabajo(`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`);
  };

  const handleNombrePacienteChange = async (nuevoNombre: string) => {
    const nombreAnterior = nombrePaciente;
    setNombrePaciente(nuevoNombre);
    if (trabajosAgregados.length > 0 && nuevoNombre.trim() !== '' && nombreAnterior !== nuevoNombre) {
      const trabajosConNombreDiferente = trabajosAgregados.filter(t => t.paciente !== nombreAnterior);
      if (trabajosConNombreDiferente.length === 0 && nombreAnterior.trim() !== '') {
        if (await confirmarTexto(idioma === 'es' ? '¿Actualizar todos los trabajos al nuevo nombre?' : 'Update all works to new name?')) {
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
      avisar(idioma === 'es' ? 'Completa nombre y diente' : 'Complete patient name and tooth');
      return;
    }
    if (configDetallada.selectedMaterials.length === 0) {
      avisar(idioma === 'es' ? 'Selecciona al menos un material' : 'Select at least one material');
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
    avisar(idioma === 'es' ? '¡Trabajo detallado agregado!' : 'Detailed work added!');
  };

  const puedeFinalizar = clinicaSeleccionada && trabajosAgregados.length > 0 && fechaTrabajo;

  // Estilos del diseño en dos cuadros
  const ui: { [key: string]: React.CSSProperties } = {
    main: { padding: 'clamp(0.75rem, 2.5vw, 1.5rem)', maxWidth: '1600px', margin: '0 auto' },
    dosColumnas: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' },
    columnaUnica: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    barra: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', minHeight: '44px', marginBottom: '0.75rem' },
    titulo: { fontSize: 'clamp(1.25rem, 3vw, 1.6rem)', fontWeight: 700, color: '#0f172a', margin: 0 },
    modoGrupo: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
    modoEtiqueta: { fontSize: '0.8125rem', fontWeight: 600, color: '#475569', backgroundColor: '#e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '999px' },
    botonModo: { padding: '0.55rem 1rem', borderRadius: '0.5rem', border: '1px solid #7c3aed', backgroundColor: '#7c3aed', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
    botonLimpiar: { padding: '0.55rem 1rem', borderRadius: '0.5rem', border: '1px solid #fecaca', backgroundColor: 'white', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
    cuadro: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.875rem', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' },
    scrollPropio: { flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' },
    filtros: { padding: '0.875rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.625rem' },
    filtrosFila: { display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' },
    buscadorCaja: { position: 'relative', flex: '1 1 220px', minWidth: 0 },
    buscadorIcono: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem' },
    buscador: { width: '100%', boxSizing: 'border-box', padding: '0.6rem 2rem 0.6rem 2.25rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9375rem', backgroundColor: 'white' },
    buscadorLimpiar: { position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', lineHeight: 1 },
    anio: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' },
    anioSelect: { padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: 'white', fontSize: '0.875rem' },
    chips: { display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'thin' },
    chip: { flex: '0 0 auto', padding: '0.375rem 0.75rem', borderRadius: '999px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' },
    chipActivo: { backgroundColor: '#2563eb', borderColor: '#2563eb', color: 'white' },
    chipDeshabilitado: { opacity: 0.5, cursor: 'not-allowed' },
    resultados: { fontSize: '0.8125rem', color: '#475569' },
    vacio: { padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9375rem' },
    tarjetas: { display: 'grid', gap: '0.75rem', padding: '0.875rem' },
    tarjeta: { border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'white', minWidth: 0 },
    tarjetaNombre: { fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', lineHeight: 1.3, minHeight: '2.6em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' },
    tarjetaEtiquetas: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' },
    etiquetaCategoria: { fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
    etiquetaAnio: { fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '999px', backgroundColor: '#f1f5f9', color: '#475569' },
    tarjetaUso: { fontSize: '0.75rem', color: '#b45309' },
    tarjetaPrecio: { fontWeight: 700, color: '#059669', fontSize: '1rem' },
    tarjetaControles: { display: 'flex', gap: '0.375rem' },
    inputCantidad: { width: '3.5rem', flex: '0 0 3.5rem', boxSizing: 'border-box', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.875rem', textAlign: 'center' },
    inputPieza: { flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.875rem' },
    inputNota: { width: '100%', boxSizing: 'border-box', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.8125rem' },
    botonAgregar: { width: '100%', padding: '0.5rem', border: 'none', borderRadius: '0.375rem', backgroundColor: '#2563eb', color: 'white', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', marginTop: 'auto' },
    info: { padding: '1rem', borderBottom: '1px solid #e2e8f0' },
    subtitulo: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem' },
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.625rem 0.75rem' },
    campo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 },
    campoLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#475569' },
    input: { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: 'white', color: '#0f172a' },
    mesFila: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
    botonMes: { flex: '0 0 auto', padding: '0.45rem 0.55rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#334155' },
    aviso: { marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#92400e' },
    agregadosCabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', padding: '0.875rem 1rem 0', flexWrap: 'wrap' },
    agregadosMes: { fontSize: '0.8125rem', color: '#64748b' },
    agregados: { padding: '0 1rem 0.75rem', minHeight: '120px' },
    grupo: { border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', borderRadius: '0.625rem', padding: '0.625rem 0.75rem', marginBottom: '0.625rem', backgroundColor: '#f8fafc' },
    grupoCabecera: { display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.375rem' },
    grupoPaciente: { fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem', overflowWrap: 'anywhere' },
    grupoDetalle: { fontSize: '0.75rem', color: '#64748b' },
    grupoTotal: { fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' },
    item: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderTop: '1px solid #e2e8f0' },
    itemNombre: { fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', overflowWrap: 'anywhere' },
    itemDetalle: { fontSize: '0.75rem', color: '#64748b' },
    itemNota: { fontSize: '0.75rem', color: '#b45309', fontStyle: 'italic', overflowWrap: 'anywhere' },
    itemPrecio: { fontSize: '0.8125rem', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' },
    botonQuitar: { flex: '0 0 auto', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #fecaca', backgroundColor: 'white', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' },
    pie: { borderTop: '1px solid #e2e8f0', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'white' },
    pieTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', color: '#0f172a' },
    contador: { position: 'absolute', right: '14px', bottom: '12px', width: '44px', height: '44px', borderRadius: '50%', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.35)', zIndex: 1 },
    botonFinalizar: { width: '100%', padding: '0.8rem', border: 'none', borderRadius: '0.625rem', backgroundColor: '#10b981', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }
  };

  // ============================================
  // DISEÑO EN DOS CUADROS
  // Izquierda: catálogo (modo simple o detallado) con scroll propio.
  // Derecha: información del trabajo + trabajos agregados (scroll propio) + Finalizar.
  // En tablet y celular: el cuadro del trabajo arriba y el catálogo abajo.
  // ============================================
  const gruposAgregados = Object.entries(
    trabajosAgregados.reduce((acc, trabajo) => {
      const clave = `${trabajo.paciente}-${trabajo.rutPaciente}`;
      if (!acc[clave]) { acc[clave] = { paciente: trabajo.paciente, rutPaciente: trabajo.rutPaciente, trabajos: [], total: 0 }; }
      acc[clave].trabajos.push(trabajo);
      acc[clave].total += trabajo.precioUnitario * trabajo.cantidad;
      return acc;
    }, {} as Record<string, { paciente: string, rutPaciente: string, trabajos: TrabajoAgregado[], total: number }>)
  );
  const columnasTarjetas = esMovil ? 2 : esCompacto ? 3 : 4;
  const masUsadasActiva = categoriaSeleccionada === CATEGORIA_MAS_USADAS;
  const usoDe = (id: string) => historialServicios.find(h => h.servicio_id === id);
  const enModoDetallado = modoDetallado && !esLaboratorista;

  const barraCatalogo = (
    <div style={ui.barra}>
      {!esCompacto && <h1 style={ui.titulo}>{t.title}</h1>}
      {!esLaboratorista && (
        <div style={ui.modoGrupo}>
          <span style={ui.modoEtiqueta}>{enModoDetallado ? '⚙️ Modo detallado' : '📋 Modo simple'}</span>
          <button style={ui.botonModo} onClick={() => setModoDetallado(!modoDetallado)}>
            🔄 {idioma === 'es' ? 'Cambiar modo' : 'Switch mode'}
          </button>
        </div>
      )}
    </div>
  );

  const cuadroCatalogo = (
    <section style={{ ...ui.cuadro, height: esCompacto ? '75vh' : '820px' }} aria-label="Catálogo de servicios">
      {enModoDetallado ? (
        <div style={ui.scrollPropio}>{renderModoDetallado()}</div>
      ) : (
        <>
          {/* Filtros fijos: buscador, año y categorías */}
          <div style={ui.filtros}>
            <div style={ui.filtrosFila}>
              <div style={ui.buscadorCaja}>
                <span style={ui.buscadorIcono}>🔍</span>
                <input type="text" style={ui.buscador} placeholder={t.buscarServicio} value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)} />
                {terminoBusqueda && (
                  <button style={ui.buscadorLimpiar} onClick={() => setTerminoBusqueda('')} aria-label="Limpiar búsqueda">×</button>
                )}
              </div>
              {!masUsadasActiva && (
                <label style={ui.anio}>
                  <span>{esLaboratorista ? (idioma === 'es' ? 'Año del catálogo' : 'Catalog year') : t.filtroAnio.replace(':', '')}</span>
                  <select style={ui.anioSelect} value={filtroAnio} onChange={(e) => setFiltroAnio(parseInt(e.target.value))}>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </label>
              )}
            </div>
            <div style={{ ...ui.chips, ...(esCompacto ? {} : { flexWrap: 'wrap', overflowX: 'visible' }) }}>
              <button
                style={{ ...ui.chip, ...(masUsadasActiva ? ui.chipActivo : {}), ...(!clinicaSeleccionada ? ui.chipDeshabilitado : {}) }}
                onClick={() => clinicaSeleccionada && setCategoriaSeleccionada(CATEGORIA_MAS_USADAS)}
                title={clinicaSeleccionada ? 'Prestaciones más usadas en esta clínica' : 'Elige una clínica para ver sus prestaciones más usadas'}
              >
                ⭐ Más usadas{clinicaSeleccionada ? ` (${cargandoHistorial ? '…' : historialServicios.filter(h => servicios.some(s => s.id === h.servicio_id)).length})` : ''}
              </button>
              {Object.entries(categorias).map(([key, nombre]) => {
                const cantidad = key === 'todos'
                  ? servicios.filter(s => s.anio === filtroAnio).length
                  : servicios.filter(s => s.categoria === key && s.anio === filtroAnio).length;
                if (key !== 'todos' && cantidad === 0) return null;
                return (
                  <button key={key} style={{ ...ui.chip, ...(categoriaSeleccionada === key ? ui.chipActivo : {}) }}
                    onClick={() => setCategoriaSeleccionada(key)}>
                    {nombre} ({cantidad})
                  </button>
                );
              })}
            </div>
            {terminoBusquedaDebounced.trim() && (
              <div style={ui.resultados}>
                {serviciosFiltrados.length} {t.serviciosEncontrados} {idioma === 'es' ? 'para' : 'for'} "<strong>{terminoBusquedaDebounced}</strong>"
              </div>
            )}
          </div>

          {/* Tarjetas con scroll propio */}
          <div style={ui.scrollPropio}>
            {cargandoServicios || (masUsadasActiva && cargandoHistorial) ? (
              <div style={ui.vacio}>🔄 {t.cargandoServicios}</div>
            ) : serviciosFiltrados.length === 0 ? (
              <div style={ui.vacio}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                {masUsadasActiva
                  ? (terminoBusqueda.trim() ? `Sin resultados para "${terminoBusqueda}" en las más usadas` : 'Esta clínica aún no tiene prestaciones registradas.')
                  : terminoBusqueda.trim()
                    ? `${idioma === 'es' ? 'No hay resultados para' : 'No results for'} "${terminoBusqueda}"`
                    : categoriaSeleccionada !== 'todos'
                      ? `${idioma === 'es' ? 'No hay servicios en la categoría' : 'No services in category'} "${categorias[categoriaSeleccionada as keyof typeof categorias]}" ${idioma === 'es' ? 'para' : 'for'} ${filtroAnio}`
                      : `${idioma === 'es' ? 'No hay servicios para el año ' : 'No services for year '}${filtroAnio}`}
              </div>
            ) : (
              <div style={{ ...ui.tarjetas, gridTemplateColumns: `repeat(${columnasTarjetas}, minmax(0, 1fr))` }}>
                {serviciosFiltrados.map(servicio => {
                  const uso = masUsadasActiva ? usoDe(servicio.id) : undefined;
                  return (
                    <div key={servicio.id} style={ui.tarjeta}>
                      <div style={ui.tarjetaNombre} title={servicio.nombre}>{servicio.nombre}</div>
                      <div style={ui.tarjetaEtiquetas}>
                        <span style={ui.etiquetaCategoria}>{categorias[servicio.categoria as keyof typeof categorias] || servicio.categoria}</span>
                        <span style={ui.etiquetaAnio}>{servicio.anio}</span>
                      </div>
                      {uso && (
                        <div style={ui.tarjetaUso}>🔥 {uso.veces_usado} {t.vecesUsado} · {uso.ultimo_uso.toLocaleDateString(idioma === 'es' ? 'es-CL' : 'en-US')}</div>
                      )}
                      {!esLaboratorista && <div style={ui.tarjetaPrecio}>{formatearPrecioCLP(servicio.precio_base)}</div>}
                      <div style={ui.tarjetaControles}>
                        <input type="number" style={ui.inputCantidad} value={cantidades[servicio.id] || 1} min="1"
                          aria-label="Cantidad" title={idioma === 'es' ? 'Cantidad' : 'Quantity'}
                          onChange={(e) => actualizarCantidad(servicio.id, parseInt(e.target.value) || 1)} />
                        <input type="text" style={ui.inputPieza} value={piezasDentales[servicio.id] || ''}
                          placeholder={idioma === 'es' ? 'Pieza' : 'Tooth'}
                          onChange={(e) => actualizarPiezaDental(servicio.id, e.target.value)} />
                      </div>
                      <input type="text" style={ui.inputNota} placeholder={t.notaPlaceholder}
                        value={notasServicios[servicio.id] || ''}
                        onChange={(e) => actualizarNota(servicio.id, e.target.value)} />
                      <button style={{ ...ui.botonAgregar, ...(agregando ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                        onClick={() => agregarTrabajoSimple(servicio)} disabled={agregando}>
                        {agregando ? '...' : `➕ ${t.agregar}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );

  const barraTrabajo = (
    <div style={{ ...ui.barra, justifyContent: 'flex-end' }}>
      <button style={ui.botonLimpiar} onClick={limpiarTodo}>{t.limpiarTrabajo}</button>
    </div>
  );

  const cuadroTrabajo = (
    <section style={{ ...ui.cuadro, height: esCompacto ? 'auto' : '820px' }} aria-label="Trabajo en preparación">
      {/* Información del trabajo */}
      <div style={ui.info}>
        <h2 style={ui.subtitulo}>📋 {idioma === 'es' ? 'Información del trabajo' : 'Work information'}</h2>
        <div style={ui.infoGrid}>
          <label style={ui.campo}>
            <span style={ui.campoLabel}>{t.clinica}</span>
            <select style={ui.input} value={clinicaSeleccionada}
              onChange={(e) => { setClinicaSeleccionada(e.target.value); setDentistaSeleccionado(''); }} required>
              <option value="">{idioma === 'es' ? 'Selecciona una clínica' : 'Select a clinic'}</option>
              {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label style={ui.campo}>
            <span style={ui.campoLabel}>{t.dentista}</span>
            <select style={ui.input} value={dentistaSeleccionado} onChange={(e) => setDentistaSeleccionado(e.target.value)} disabled={!clinicaSeleccionada}>
              <option value="">{idioma === 'es' ? 'Selecciona un dentista (opcional)' : 'Select a dentist (optional)'}</option>
              {dentistasFiltrados.map(d => <option key={d.id} value={d.id}>{d.nombre}{d.especialidad ? ` - ${d.especialidad}` : ''}</option>)}
            </select>
          </label>
          <label style={ui.campo}>
            <span style={ui.campoLabel}>{t.laboratorista}</span>
            <select style={ui.input} value={laboratoristaSeleccionado} onChange={(e) => setLaboratoristaSeleccionado(e.target.value)} disabled={esLaboratorista}>
              {!esLaboratorista && <option value="">{idioma === 'es' ? 'Sin asignar' : 'Not assigned'}</option>}
              {laboratoristas.map(l => <option key={l.id} value={l.id}>{l.nombre}{l.especialidad ? ` - ${l.especialidad}` : ''}</option>)}
            </select>
          </label>
          <div style={ui.campo}>
            <span style={ui.campoLabel}>{t.fechaTrabajo}</span>
            <div style={ui.mesFila}>
              <button style={ui.botonMes} onClick={() => cambiarMes('anterior')} title={t.mesAnterior} aria-label={t.mesAnterior}>◀</button>
              <input type="month" style={{ ...ui.input, flex: 1, minWidth: 0 }} value={fechaTrabajo} onChange={(e) => setFechaTrabajo(e.target.value)} title={t.seleccionaMes} />
              <button style={ui.botonMes} onClick={() => cambiarMes('siguiente')} title={t.mesSiguiente} aria-label={t.mesSiguiente}>▶</button>
              <button style={ui.botonMes} onClick={restablecerMesActual} title={t.mesActual} aria-label={t.mesActual}>↺</button>
            </div>
          </div>
          <label style={ui.campo}>
            <span style={ui.campoLabel}>{t.paciente}</span>
            <input type="text" style={ui.input} value={nombrePaciente} onChange={(e) => handleNombrePacienteChange(e.target.value)}
              placeholder={idioma === 'es' ? 'Ej: Juan Pérez' : 'Ex: John Doe'} required />
          </label>
          <label style={ui.campo}>
            <span style={ui.campoLabel}>{t.rut}</span>
            <input type="text" style={ui.input} value={rutPaciente} onChange={(e) => handleRutPacienteChange(e.target.value)}
              placeholder={idioma === 'es' ? 'Ej: 12.345.678-9' : 'Ex: 12345678-9'} />
          </label>
        </div>
        {trabajosAgregados.length > 0 && <div style={ui.aviso}>ℹ️ {t.cambiarPaciente}</div>}
      </div>

      {/* Trabajos agregados con scroll propio */}
      <div style={ui.agregadosCabecera}>
        <h2 style={ui.subtitulo}>🧾 {t.trabajosAgregados} ({trabajosAgregados.length})</h2>
        {fechaTrabajo && <span style={ui.agregadosMes}>{(() => { const f = formatearFecha(fechaTrabajo); return f.charAt(0).toUpperCase() + f.slice(1); })()}</span>}
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', ...(esCompacto ? {} : { flex: 1, minHeight: 0 }) }}>
      <div id="trabajos-agregados-container"
        style={{ ...ui.scrollPropio, ...(esCompacto ? { maxHeight: '50vh', flex: 'none' } : {}), ...ui.agregados,
                 ...(trabajosAgregados.length > 0 ? { paddingBottom: '64px' } : {}) }}>
        {trabajosAgregados.length === 0 ? (
          <div style={ui.vacio}>
            {idioma === 'es' ? 'Aún no hay trabajos agregados. Completa los datos y agrega servicios del catálogo.' : 'No works added yet.'}
          </div>
        ) : (
          gruposAgregados.map(([clave, grupo]) => (
            <div key={clave} style={ui.grupo}>
              <div style={ui.grupoCabecera}>
                <div style={{ minWidth: 0 }}>
                  <div style={ui.grupoPaciente}>👤 {grupo.paciente}</div>
                  <div style={ui.grupoDetalle}>
                    {grupo.rutPaciente ? `RUT: ${grupo.rutPaciente} · ` : ''}{grupo.trabajos.length} {grupo.trabajos.length === 1 ? 'prestación' : 'prestaciones'}
                  </div>
                </div>
                {!esLaboratorista && <div style={ui.grupoTotal}>{formatearPrecioCLP(grupo.total)}</div>}
              </div>
              {grupo.trabajos.map(trabajo => (
                <div key={trabajo.id} style={ui.item}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={ui.itemNombre}>{trabajo.servicio.nombre}</div>
                    <div style={ui.itemDetalle}>
                      🦷 {trabajo.piezaDental || (idioma === 'es' ? 'Sin pieza' : 'No tooth')} · ✕{trabajo.cantidad}
                      {!esLaboratorista && trabajo.cantidad > 1 && ` · ${formatearPrecioCLP(trabajo.precioUnitario)} c/u`}
                    </div>
                    {trabajo.notaEspecial && <div style={ui.itemNota}>📝 {trabajo.notaEspecial}</div>}
                  </div>
                  {!esLaboratorista && <div style={ui.itemPrecio}>{formatearPrecioCLP(trabajo.precioUnitario * trabajo.cantidad)}</div>}
                  <button style={ui.botonQuitar} onClick={() => eliminarTrabajo(trabajo.id)}
                    title={t.eliminar} aria-label={`${t.eliminar} ${trabajo.servicio.nombre}`}>✕</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Contador dentro de la lista: no tapa nada fuera de ella; al tocarlo baja al último agregado */}
      {trabajosAgregados.length > 0 && (
        <button style={ui.contador}
          onClick={() => { const lista = document.getElementById('trabajos-agregados-container'); if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' }); }}
          title={`${trabajosAgregados.length} prestaciones agregadas`}
          aria-label={`${trabajosAgregados.length} prestaciones agregadas`}>
          {trabajosAgregados.length}
        </button>
      )}
      </div>

      {/* Pie fijo: total (solo admin) y Finalizar */}
      <div style={ui.pie}>
        {!esLaboratorista && (
          <div style={ui.pieTotal}>
            <span>{t.total}</span>
            <strong style={{ color: '#059669' }}>{formatearPrecioCLP(calcularTotal())}</strong>
          </div>
        )}
        <button style={{ ...ui.botonFinalizar, ...(!puedeFinalizar || guardando ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
          onClick={finalizarTrabajo} disabled={!puedeFinalizar || guardando}>
          {guardando ? 'Guardando...' : t.finalizar}
        </button>
      </div>
    </section>
  );

  return (
    <div style={styles.container}>
      <Header
        user={user}
        onLogout={handleLogout}
        showBackButton={true}
        onBack={onBack}
        title={t.title}
      />
      <main style={ui.main}>
        {cargandoDatos ? (
          <div style={styles.loadingContainer}>
            <div style={{ fontSize: '3rem' }}>🔄</div>
            <div style={styles.loadingText}>{t.cargandoDatos}</div>
          </div>
        ) : esCompacto ? (
          <div style={ui.columnaUnica}>
            <h1 style={ui.titulo}>{t.title}</h1>
            <div>{barraTrabajo}{cuadroTrabajo}</div>
            <div>{barraCatalogo}{cuadroCatalogo}</div>
          </div>
        ) : (
          <div style={ui.dosColumnas}>
            <div style={{ minWidth: 0 }}>{barraCatalogo}{cuadroCatalogo}</div>
            <div style={{ minWidth: 0 }}>{barraTrabajo}{cuadroTrabajo}</div>
          </div>
        )}
      </main>

    </div>
  );
};

export default CrearTrabajo;