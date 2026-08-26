import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import Header from './Header';

interface GestionPreciosProps {
  onBack?: () => void;
}

interface Servicio {
  id: string;
  nombre: string;
  precio_base: number;
  categoria: string;
  anio: number;
  activo: boolean;
  usuario_id: string;
  creado_en: string;
  updated_at: string;
  created_at: string;
}

interface FilaPlantillaExcel {
  'Categoría': string;
  'Nombre del Servicio': string;
  'Precio Base': number;
  'Año'?: number;
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

const categorias = {
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

const palabrasClave: { [key: string]: string } = {
  'fija': 'fija',
  'removible': 'removible',
  'implante': 'implantes',
  'implantes': 'implantes',
  'ortodoncia': 'ortodoncia',
  'reparacion': 'reparaciones',
  'reparaciones': 'reparaciones',
  'metal': 'metales',
  'metales': 'metales',
  'attachment': 'attachments',
  'attachments': 'attachments',
  'ceromero': 'ceromeros_composites',
  'ceromeros': 'ceromeros_composites',
  'composite': 'ceromeros_composites',
  'composites': 'ceromeros_composites',
  'plano': 'planos_estampados',
  'planos': 'planos_estampados',
  'estampado': 'planos_estampados',
  'estampados': 'planos_estampados',
  'otro': 'otros',
  'otros': 'otros'
};

const mapeoCategorias: { [key: string]: string } = {
  'prótesis fija': 'fija',
  'protesis fija': 'fija',
  'fija': 'fija',
  'prótesis removible': 'removible',
  'protesis removible': 'removible',
  'removible': 'removible',
  'implantes': 'implantes',
  'implante': 'implantes',
  'ortodoncia': 'ortodoncia',
  'reparaciones': 'reparaciones',
  'reparación': 'reparaciones',
  'reparacion': 'reparaciones',
  'metales': 'metales',
  'metal': 'metales',
  'attachments': 'attachments',
  'attachment': 'attachments',
  'cerómeros y composites': 'ceromeros_composites',
  'ceromeros y composites': 'ceromeros_composites',
  'cerómeros': 'ceromeros_composites',
  'ceromeros': 'ceromeros_composites',
  'composites': 'ceromeros_composites',
  'composite': 'ceromeros_composites',
  'planos y estampados': 'planos_estampados',
  'planos': 'planos_estampados',
  'estampados': 'planos_estampados',
  'plano': 'planos_estampados',
  'estampado': 'planos_estampados',
  'otros': 'otros',
  'otro': 'otros'
};

const extraerAnioYCategoria = (texto: string): { anio: number; categoria: string } => {
  let textoLimpio = texto.trim();
  let anio = new Date().getFullYear();
  const matchAnio = textoLimpio.match(/^(\d{4})\s+(.+)/);
  if (matchAnio) {
    anio = parseInt(matchAnio[1]);
    textoLimpio = matchAnio[2];
  }
  const normalizado = textoLimpio
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let clave = mapeoCategorias[normalizado];
  if (clave) return { anio, categoria: clave };
  const claves = Object.keys(palabrasClave).sort((a, b) => b.length - a.length);
  for (const palabra of claves) {
    if (normalizado.includes(palabra)) {
      return { anio, categoria: palabrasClave[palabra] };
    }
  }
  return { anio, categoria: 'otros' };
};

const GestionPrecios: React.FC<GestionPreciosProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalExcel, setMostrarModalExcel] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroAnio, setFiltroAnio] = useState<number>(new Date().getFullYear());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>('');
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [formData, setFormData] = useState({
    categoria: 'fija',
    anio: new Date().getFullYear(),
    nombre: '',
    precioBase: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarUsuario();
    cargarServicios();
  }, []);

  const cargarUsuario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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
    } catch (error) {
      console.error('Error cargando usuario:', error);
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

  const cargarServicios = async () => {
    try {
      setCargando(true);
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay usuario autenticado');
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
      setServicios(data || []);
    } catch (error: any) {
      console.error('Error cargando servicios:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/dashboard');
    }
  };

  const abrirModal = (servicio?: Servicio) => {
    if (servicio) {
      setServicioEditando(servicio);
      setFormData({
        categoria: servicio.categoria,
        anio: servicio.anio,
        nombre: servicio.nombre,
        precioBase: servicio.precio_base.toString()
      });
    } else {
      setServicioEditando(null);
      setFormData({
        categoria: 'fija',
        anio: new Date().getFullYear(),
        nombre: '',
        precioBase: ''
      });
    }
    setMostrarModal(true);
    setError('');
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setServicioEditando(null);
    setFormData({
      categoria: 'fija',
      anio: new Date().getFullYear(),
      nombre: '',
      precioBase: ''
    });
    setError('');
  };

  const guardarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.nombre.trim() || !formData.precioBase.trim()) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }
    const precio = parseFloat(formData.precioBase);
    if (isNaN(precio) || precio <= 0) {
      setError('Por favor ingresa un precio válido mayor a 0');
      return;
    }
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay usuario autenticado');
        return;
      }
      if (servicioEditando) {
        const { error } = await supabase
          .from('servicios')
          .update({
            nombre: formData.nombre.trim(),
            categoria: formData.categoria,
            anio: formData.anio,
            precio_base: precio,
            updated_at: new Date().toISOString()
          })
          .eq('id', servicioEditando.id)
          .eq('usuario_id', user.id);
        if (error) throw error;
      } else {
        const servicioData = {
          nombre: formData.nombre.trim(),
          categoria: formData.categoria,
          anio: formData.anio,
          precio_base: precio,
          activo: true,
          usuario_id: user.id,
          creado_en: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        const { error } = await supabase
          .from('servicios')
          .insert([servicioData]);
        if (error) throw error;
      }
      await cargarServicios();
      cerrarModal();
    } catch (error: any) {
      console.error('Error guardando servicio:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarServicio = async (servicio: Servicio) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el servicio "${servicio.nombre}"?`)) {
      return;
    }
    try {
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay usuario autenticado');
        return;
      }
      const { error } = await supabase
        .from('servicios')
        .update({ activo: false })
        .eq('id', servicio.id)
        .eq('usuario_id', user.id);
      if (error) throw error;
      setServicios(prev => prev.filter(s => s.id !== servicio.id));
    } catch (error: any) {
      console.error('Error eliminando servicio:', error);
      setError(error.message);
    }
  };

  const descargarPlantillaExcel = () => {
    const plantilla: FilaPlantillaExcel[] = [
      { 'Categoría': '👄 Prótesis Removible', 'Nombre del Servicio': 'Prótesis Acrílica Completa', 'Precio Base': 200000, 'Año': 2025 },
      { 'Categoría': '🦷 Prótesis Fija', 'Nombre del Servicio': 'Corona de Zirconio', 'Precio Base': 150000, 'Año': 2025 },
      { 'Categoría': '⚡ Implantes', 'Nombre del Servicio': 'Implante Dental Unitario', 'Precio Base': 300000, 'Año': 2025 }
    ];
    const ws = XLSX.utils.json_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    const colWidths = [{ wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 10 }];
    ws['!cols'] = colWidths;
    XLSX.writeFile(wb, 'plantilla_servicios.xlsx');
  };

  const procesarArchivoExcel = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Ahora buscará también la columna 'Año'
  const obtenerValorColumna = (fila: any, tipo: 'categoria' | 'nombre' | 'precio' | 'anio'): string | null => {
    const mapeoColumnas = {
      categoria: ['Categoría', 'categoria', 'CATEGORIA', 'Categoria', 'Tipo'],
      nombre: ['Nombre del Servicio', 'nombre', 'NOMBRE', 'Nombre', 'Servicio'],
      precio: ['Precio Base', 'precio_base', 'PRECIO', 'precio', 'Precio'],
      anio: ['Año', 'anio', 'ANO', 'Año']
    };
    const posiblesNombres = mapeoColumnas[tipo];
    for (const nombreColumna of posiblesNombres) {
      const valor = fila[nombreColumna];
      if (valor !== undefined && valor !== null && valor !== '') {
        return valor.toString();
      }
    }
    return null;
  };

  const cargarDesdeExcel = async () => {
    if (!archivoExcel) {
      setError('Por favor selecciona un archivo Excel');
      return;
    }
    try {
      setCargando(true);
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No hay usuario autenticado');
        return;
      }
      const datosExcel: any[] = await procesarArchivoExcel(archivoExcel) as any[];
      const datosFiltrados = datosExcel.filter(fila => {
        const categoria = obtenerValorColumna(fila, 'categoria');
        const nombre = obtenerValorColumna(fila, 'nombre');
        const precio = obtenerValorColumna(fila, 'precio');
        return categoria && nombre && precio;
      });
      if (datosFiltrados.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
      }
      const serviciosParaInsertar = datosFiltrados.map((fila, index) => {
        const numeroFila = index + 2;
        const categoriaRaw = obtenerValorColumna(fila, 'categoria') || '';
        const nombre = obtenerValorColumna(fila, 'nombre') || '';
        const precioRaw = obtenerValorColumna(fila, 'precio') || '0';
        const anioRaw = obtenerValorColumna(fila, 'anio');

        let anioFinal = new Date().getFullYear();
        if (anioRaw) {
          const anioNum = parseInt(anioRaw);
          if (!isNaN(anioNum) && anioNum > 2000) {
            anioFinal = anioNum;
          }
        } else {
          const { anio } = extraerAnioYCategoria(categoriaRaw);
          anioFinal = anio;
        }

        const { categoria: categoriaExtraida } = extraerAnioYCategoria(categoriaRaw);
        if (!categoriaExtraida) {
          throw new Error(`Fila ${numeroFila}: No se pudo determinar la categoría a partir de "${categoriaRaw}"`);
        }
        const precio = parseFloat(precioRaw.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(precio) || precio <= 0) {
          throw new Error(`Fila ${numeroFila}: Precio inválido`);
        }
        return {
          nombre: nombre.toString().trim(),
          categoria: categoriaExtraida,
          anio: anioFinal,
          precio_base: precio,
          activo: true,
          usuario_id: user.id,
          creado_en: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
      });
      const { error } = await supabase
        .from('servicios')
        .insert(serviciosParaInsertar);
      if (error) throw error;
      alert(`✅ ${serviciosParaInsertar.length} servicios cargados correctamente`);
      await cargarServicios();
      setMostrarModalExcel(false);
      setArchivoExcel(null);
    } catch (error: any) {
      console.error('Error cargando desde Excel:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  // Filtros
  const serviciosFiltrados = servicios.filter(s => {
    const matchCategoria = filtroCategoria === 'todos' || s.categoria === filtroCategoria;
    const matchAnio = s.anio === filtroAnio;
    return matchCategoria && matchAnio;
  });

  const formatearPrecioCLP = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  };

  // ==================== ESTILOS COMPLETOS ====================
  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: 'calc(100vh - 64px)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      flexWrap: 'wrap' as const,
      gap: '15px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: '0'
    },
    primaryButton: {
      padding: '8px 16px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    secondaryButton: {
      padding: '8px 16px',
      backgroundColor: '#95a5a6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '15px',
      marginBottom: '25px'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      border: '1px solid #e0e0e0'
    },
    statNumber: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: '8px 0'
    },
    statLabel: {
      fontSize: '14px',
      color: '#7f8c8d',
      fontWeight: '500'
    },
    filters: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      marginBottom: '25px',
      border: '1px solid #e0e0e0'
    },
    filterTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '15px'
    },
    filterButtons: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '10px'
    },
    filterButton: {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      color: '#495057',
      cursor: 'pointer',
      fontSize: '14px'
    },
    filterButtonActive: {
      backgroundColor: '#3498db',
      color: 'white',
      borderColor: '#3498db'
    },
    contentCard: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      border: '1px solid #e0e0e0'
    },
    serviciosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    },
    servicioCard: {
      backgroundColor: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '15px'
    },
    servicioNombre: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: '0',
      flex: 1
    },
    categoriaBadge: {
      padding: '4px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      fontSize: '12px',
      color: '#6c757d',
      fontWeight: '500',
      whiteSpace: 'nowrap' as const
    },
    anioBadge: {
      padding: '4px 10px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      fontSize: '12px',
      color: '#495057',
      fontWeight: '600',
      whiteSpace: 'nowrap' as const
    },
    precio: {
      fontSize: '22px',
      fontWeight: '600',
      color: '#27ae60',
      margin: '12px 0',
      fontFamily: "'Courier New', monospace"
    },
    acciones: {
      display: 'flex',
      gap: '10px',
      marginTop: '15px'
    },
    actionButton: {
      flex: 1,
      padding: '8px',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      backgroundColor: 'white',
      color: '#495057',
      cursor: 'pointer',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px'
    },
    editButton: {
      color: '#3498db'
    },
    deleteButton: {
      color: '#e74c3c'
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    },
    modalHeader: {
      padding: '20px 20px 10px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#7f8c8d',
      padding: 0,
      lineHeight: 1
    },
    modalBody: {
      padding: '20px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#495057',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box' as const
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    modalFooter: {
      padding: '20px',
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px'
    },
    cancelButton: {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      color: '#495057',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    loadingText: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: '#7f8c8d',
      fontSize: '16px'
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#7f8c8d'
    },
    emptyStateTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '10px'
    },
    emptyStateText: {
      marginBottom: '20px',
      fontSize: '14px'
    },
    errorText: {
      backgroundColor: '#fff5f5',
      border: '1px solid #fed7d7',
      color: '#e53e3e',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    excelSection: {
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      backgroundColor: '#f8f9fa'
    },
    excelTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '12px'
    },
    excelDescription: {
      fontSize: '14px',
      color: '#6c757d',
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    categoryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginBottom: '20px'
    },
    categoryItem: {
      padding: '8px',
      backgroundColor: 'white',
      borderRadius: '4px',
      fontSize: '12px',
      textAlign: 'center' as const,
      color: '#495057',
      border: '1px solid #dee2e6'
    },
    fileInput: {
      width: '100%',
      padding: '12px',
      border: '1px dashed #ced4da',
      borderRadius: '6px',
      backgroundColor: 'white',
      cursor: 'pointer',
      marginBottom: '20px',
      textAlign: 'center' as const,
      color: '#6c757d'
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setArchivoExcel(file);
  };

  return (
    <>
      <Header
        user={usuario || undefined}
        onLogout={handleLogout}
        cerrandoSesion={cerrandoSesion}
        showBackButton={true}
        onBack={handleBack}
        title="Gestión de Precios"
        showTitle={true}
      />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={styles.title}>Gestión de Precios</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={styles.secondaryButton} onClick={descargarPlantillaExcel}>
              📥 Plantilla Excel
            </button>
            <button style={styles.secondaryButton} onClick={() => setMostrarModalExcel(true)}>
              📊 Cargar Excel
            </button>
            <button style={styles.primaryButton} onClick={() => abrirModal()}>
              ➕ Nuevo Servicio
            </button>
          </div>
        </div>

        {error && <div style={styles.errorText}>❌ {error}</div>}

        {/* Estadísticas */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Servicios ({filtroAnio})</div>
            <div style={styles.statNumber}>{servicios.filter(s => s.anio === filtroAnio).length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Prótesis Fija</div>
            <div style={styles.statNumber}>{servicios.filter(s => s.categoria === 'fija' && s.anio === filtroAnio).length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Prótesis Removible</div>
            <div style={styles.statNumber}>{servicios.filter(s => s.categoria === 'removible' && s.anio === filtroAnio).length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Implantes</div>
            <div style={styles.statNumber}>{servicios.filter(s => s.categoria === 'implantes' && s.anio === filtroAnio).length}</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={styles.filters}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <div>
              <div style={styles.filterTitle}>Año:</div>
              <select
                style={{ ...styles.select, width: 'auto' }}
                value={filtroAnio}
                onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <div>
              <div style={styles.filterTitle}>Categoría:</div>
              <div style={styles.filterButtons}>
                <button
                  style={{ ...styles.filterButton, ...(filtroCategoria === 'todos' ? styles.filterButtonActive : {}) }}
                  onClick={() => setFiltroCategoria('todos')}
                >
                  Todos ({servicios.filter(s => s.anio === filtroAnio).length})
                </button>
                {Object.entries(categorias).map(([key, nombre]) => (
                  <button
                    key={key}
                    style={{ ...styles.filterButton, ...(filtroCategoria === key ? styles.filterButtonActive : {}) }}
                    onClick={() => setFiltroCategoria(key)}
                  >
                    {nombre} ({servicios.filter(s => s.categoria === key && s.anio === filtroAnio).length})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de servicios */}
        <div style={styles.contentCard}>
          {cargando ? (
            <div style={styles.loadingText}>Cargando servicios...</div>
          ) : serviciosFiltrados.length === 0 ? (
            <div style={styles.emptyState}>
              <h3 style={styles.emptyStateTitle}>No hay servicios para el año {filtroAnio}</h3>
              <p style={styles.emptyStateText}>
                {filtroCategoria !== 'todos'
                  ? `No hay servicios en la categoría "${categorias[filtroCategoria as keyof typeof categorias]}" para ${filtroAnio}`
                  : `Comienza agregando tu primer servicio para el año ${filtroAnio}`
                }
              </p>
              <button style={styles.primaryButton} onClick={() => abrirModal()}>
                ➕ Agregar Servicio
              </button>
            </div>
          ) : (
            <div style={styles.serviciosGrid}>
              {serviciosFiltrados.map(servicio => (
                <div key={servicio.id} style={styles.servicioCard}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.servicioNombre}>{servicio.nombre}</h3>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={styles.categoriaBadge}>
                        {categorias[servicio.categoria as keyof typeof categorias]}
                      </span>
                      {/* 🔥 AQUÍ SE MUESTRA EL AÑO DE FORMA CLARA */}
                      <span style={styles.anioBadge}>
                        {servicio.anio}
                      </span>
                    </div>
                  </div>
                  <div style={styles.precio}>
                    {formatearPrecioCLP(servicio.precio_base)}
                  </div>
                  <div style={styles.acciones}>
                    <button
                      style={{ ...styles.actionButton, ...styles.editButton }}
                      onClick={() => abrirModal(servicio)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      style={{ ...styles.actionButton, ...styles.deleteButton }}
                      onClick={() => eliminarServicio(servicio)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Nuevo/Editar */}
        {mostrarModal && (
          <div style={styles.modalOverlay} onClick={cerrarModal}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>{servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                <button style={styles.closeButton} onClick={cerrarModal}>×</button>
              </div>
              <div style={styles.modalBody}>
                {error && <div style={styles.errorText}>{error}</div>}
                <form onSubmit={guardarServicio}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Año *</label>
                    <select
                      style={styles.select}
                      value={formData.anio}
                      onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Categoría *</label>
                    <select
                      style={styles.select}
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    >
                      {Object.entries(categorias).map(([key, nombre]) => (
                        <option key={key} value={key}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nombre del Servicio *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Ej: Corona de Zirconio Personalizada"
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Precio Base (CLP) *</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={formData.precioBase}
                      onChange={(e) => setFormData({...formData, precioBase: e.target.value})}
                      min="0"
                      step="100"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div style={styles.modalFooter}>
                    <button type="button" style={styles.cancelButton} onClick={cerrarModal}>Cancelar</button>
                    <button type="submit" style={styles.saveButton}>{servicioEditando ? 'Actualizar' : 'Crear'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Excel */}
        {mostrarModalExcel && (
          <div style={styles.modalOverlay} onClick={() => setMostrarModalExcel(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Cargar desde Excel</h2>
                <button style={styles.closeButton} onClick={() => setMostrarModalExcel(false)}>×</button>
              </div>
              <div style={styles.modalBody}>
                {error && <div style={styles.errorText}>{error}</div>}
                <div style={styles.excelSection}>
                  <h3 style={styles.excelTitle}>Instrucciones</h3>
                  <p style={styles.excelDescription}>
                    Descarga la plantilla, completa los datos y súbelos aquí. <br />
                    Puedes incluir una columna "Año" para indicar el año de los precios, o escribir el año al inicio de la categoría (ej. "2026 👄 Prótesis Removible").
                    El sistema detectará el año automáticamente.
                  </p>
                  <div style={styles.categoryGrid}>
                    {Object.entries(categorias).map(([key, nombre]) => (
                      <div key={key} style={styles.categoryItem}>{nombre}</div>
                    ))}
                  </div>
                  <div
                    style={styles.fileInput}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {archivoExcel ? `📁 ${archivoExcel.name}` : '📎 Seleccionar o arrastrar archivo Excel'}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                    onChange={(e) => setArchivoExcel(e.target.files?.[0] || null)}
                  />
                  <div style={styles.modalFooter}>
                    <button style={styles.cancelButton} onClick={() => setMostrarModalExcel(false)}>Cancelar</button>
                    <button style={styles.saveButton} onClick={cargarDesdeExcel}>Cargar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GestionPrecios;