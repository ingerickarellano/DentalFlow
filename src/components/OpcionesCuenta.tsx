import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OpcionesCuentaProps {
  onBack: () => void;
}

interface ConfiguracionLaboratorio {
  id?: string;
  nombre_laboratorio: string;
  rut: string;
  direccion: string;
  telefono: string;
  email: string;
  logo: string | null;
  tipo_impuesto: 'iva' | 'honorarios';
  porcentaje_impuesto: number;
  usuario_id: string;
  created_at?: string;
  updated_at?: string;
}

// Definir tipo para los estilos
type Styles = {
  [key: string]: React.CSSProperties;
};

const OpcionesCuenta: React.FC<OpcionesCuentaProps> = ({ onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [configuracion, setConfiguracion] = useState<ConfiguracionLaboratorio>({
    nombre_laboratorio: 'Laboratorio Dental Pro',
    rut: '76.123.456-7',
    direccion: 'Av. Principal 123, Santiago, Chile',
    telefono: '+56 2 2345 6789',
    email: 'contacto@laboratoriodental.cl',
    logo: null,
    tipo_impuesto: 'iva',
    porcentaje_impuesto: 19,
    usuario_id: ''
  });

  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Cargar configuración desde Supabase al iniciar
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async (): Promise<void> => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMensaje('❌ No hay usuario autenticado');
        setCargando(false);
        return;
      }

      // Cargar configuración desde Supabase
      const { data, error } = await supabase
        .from('configuracion_laboratorio')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando configuración:', error);
        throw error;
      }

      if (data) {
        setConfiguracion({
          ...data,
          usuario_id: user.id
        });
      } else {
        setConfiguracion(prev => ({
          ...prev,
          usuario_id: user.id
        }));
      }

    } catch (error: any) {
      console.error('Error cargando configuración:', error);
      setMensaje('❌ Error al cargar la configuración');
    } finally {
      setCargando(false);
    }
  };

  // Estilos mejorados - diseño flotante y moderno
  const styles: Styles = {
    container: {
      padding: '20px',
      backgroundColor: 'rgba(248, 250, 252, 0.8)',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    },
    mainCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      padding: '2rem',
      maxWidth: '800px',
      width: '100%',
      marginTop: '2rem',
      border: '1px solid rgba(226, 232, 240, 0.6)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '2px solid #f1f5f9'
    },
    title: {
      color: '#1e293b',
      fontSize: '1.75rem',
      fontWeight: 'bold',
      margin: 0
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      marginRight: '0.5rem',
      fontWeight: '600',
      fontSize: '0.875rem',
      transition: 'all 0.2s'
    },
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
      transition: 'all 0.2s'
    },
    buttonSuccess: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
      transition: 'all 0.2s'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '12px',
      cursor: 'not-allowed',
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    configContainer: {
      backgroundColor: '#f8fafc',
      padding: '2rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      color: '#1e293b',
      fontSize: '1.25rem',
      fontWeight: '600',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      color: '#374151',
      fontSize: '0.875rem',
      fontWeight: '600',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '1rem',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '1.5rem'
    },
    logoContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      marginBottom: '2rem',
      padding: '2.5rem',
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      backgroundColor: 'white',
      transition: 'border-color 0.2s'
    },
    logoPreview: {
      width: '180px',
      height: '180px',
      objectFit: 'contain',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      backgroundColor: 'white',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    },
    impuestoSelector: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '2rem'
    },
    impuestoOption: {
      padding: '1.5rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center'
    },
    impuestoOptionSelected: {
      borderColor: '#2563eb',
      backgroundColor: '#eff6ff',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)'
    },
    impuestoTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: '#1e293b'
    },
    impuestoDescription: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginBottom: '1rem'
    },
    impuestoPercentage: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#2563eb'
    },
    mensaje: {
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      textAlign: 'center',
      fontWeight: '500'
    },
    mensajeSuccess: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '1px solid #a7f3d0'
    },
    mensajeError: {
      backgroundColor: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca'
    },
    previewContainer: {
      backgroundColor: '#f8fafc',
      padding: '2rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      marginTop: '2rem'
    },
    previewTitle: {
      color: '#475569',
      fontSize: '1.125rem',
      fontWeight: '600',
      marginBottom: '1.5rem'
    },
    previewContent: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    },
    previewHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '2px solid #e2e8f0'
    },
    previewLogo: {
      height: '70px',
      objectFit: 'contain'
    },
    previewInfo: {
      textAlign: 'right'
    },
    previewCalculos: {
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid #e2e8f0'
    },
    calculoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      alignItems: 'center'
    },
    calculoTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1.25rem 0',
      borderTop: '2px solid #e2e8f0',
      fontWeight: 'bold',
      fontSize: '1.125rem',
      alignItems: 'center'
    },
    helperText: {
      fontSize: '0.75rem',
      color: '#6b7280',
      marginTop: '0.25rem',
      fontStyle: 'italic'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'flex-end',
      marginTop: '2rem'
    },
    loadingText: {
      textAlign: 'center',
      color: '#64748b',
      padding: '3rem',
      fontSize: '1.125rem'
    }
  };

  const handleInputChange = (campo: keyof ConfiguracionLaboratorio, valor: string | number) => {
    setConfiguracion(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleTipoImpuestoChange = (tipo: 'iva' | 'honorarios') => {
    setConfiguracion(prev => ({
      ...prev,
      tipo_impuesto: tipo,
      porcentaje_impuesto: tipo === 'iva' ? 19 : 14.5
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMensaje('❌ Por favor, selecciona un archivo de imagen (PNG, JPG, JPEG)');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setMensaje('❌ El archivo no debe ser mayor a 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setConfiguracion(prev => ({
            ...prev,
            logo: event.target?.result as string
          }));
          setMensaje('✅ Logo cargado exitosamente');
          setTimeout(() => setMensaje(''), 3000);
        }
      };
      reader.onerror = () => {
        setMensaje('❌ Error al cargar el logo');
      };
      reader.readAsDataURL(file);
    }
  };

  const eliminarLogo = () => {
    setConfiguracion(prev => ({
      ...prev,
      logo: null
    }));
    setMensaje('🗑️ Logo eliminado');
    setTimeout(() => setMensaje(''), 3000);
  };

  const guardarConfiguracion = async (): Promise<void> => {
    setGuardando(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMensaje('❌ No hay usuario autenticado');
        setGuardando(false);
        return;
      }

      // Validaciones
      if (!configuracion.nombre_laboratorio.trim()) {
        setMensaje('❌ El nombre del laboratorio es obligatorio');
        setGuardando(false);
        return;
      }

      if (!configuracion.rut.trim()) {
        setMensaje('❌ El RUT es obligatorio');
        setGuardando(false);
        return;
      }

      if (!configuracion.direccion.trim()) {
        setMensaje('❌ La dirección es obligatoria');
        setGuardando(false);
        return;
      }

      if (!configuracion.telefono.trim()) {
        setMensaje('❌ El teléfono es obligatorio');
        setGuardando(false);
        return;
      }

      if (!configuracion.email.trim()) {
        setMensaje('❌ El email es obligatorio');
        setGuardando(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(configuracion.email)) {
        setMensaje('❌ Por favor ingresa un email válido');
        setGuardando(false);
        return;
      }

      // Preparar datos para Supabase
      const configuracionData = {
        ...configuracion,
        usuario_id: user.id,
        updated_at: new Date().toISOString()
      };

      let error: any = null;
      let data: ConfiguracionLaboratorio[] | null = null;

      if (configuracion.id) {
        const result = await supabase
          .from('configuracion_laboratorio')
          .update(configuracionData)
          .eq('id', configuracion.id)
          .select();
        error = result.error;
        data = result.data;
      } else {
        const result = await supabase
          .from('configuracion_laboratorio')
          .insert([configuracionData])
          .select();
        error = result.error;
        data = result.data;
      }

      if (error) throw error;

      if (data && data.length > 0 && !configuracion.id) {
        setConfiguracion(prev => ({
          ...prev,
          id: data![0].id
        }));
      }

      setMensaje('✅ Configuración guardada exitosamente');
      
    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      setMensaje(`❌ Error al guardar la configuración: ${error.message}`);
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const resetearConfiguracion = () => {
    if (window.confirm('¿Estás seguro de que quieres resetear toda la configuración a los valores por defecto?')) {
      const configPorDefecto = {
        nombre_laboratorio: 'Laboratorio Dental Pro',
        rut: '76.123.456-7',
        direccion: 'Av. Principal 123, Santiago, Chile',
        telefono: '+56 2 2345 6789',
        email: 'contacto@laboratoriodental.cl',
        logo: null,
        tipo_impuesto: 'iva' as const,
        porcentaje_impuesto: 19,
        usuario_id: configuracion.usuario_id
      };
      
      setConfiguracion(configPorDefecto);
      setMensaje('🔄 Configuración reseteada a valores por defecto');
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const calcularEjemplo = () => {
    const subtotal = 100000;
    const impuesto = (subtotal * configuracion.porcentaje_impuesto) / 100;
    const total = subtotal - impuesto;
    
    return { subtotal, impuesto, total };
  };

  const ejemplo = calcularEjemplo();

  const esConfiguracionValida = 
    configuracion.nombre_laboratorio.trim() &&
    configuracion.rut.trim() &&
    configuracion.direccion.trim() &&
    configuracion.telefono.trim() &&
    configuracion.email.trim();

  if (cargando) {
    return (
      <div style={styles.container}>
        <div style={styles.mainCard}>
          <div style={styles.loadingText}>Cargando configuración...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainCard}>
        <div style={styles.header}>
          <div>
            <button 
              style={styles.backButton}
              onClick={onBack}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#475569';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#64748b';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ← Volver al Dashboard
            </button>
            <h1 style={styles.title}>⚙️ Configuración del Laboratorio</h1>
          </div>
        </div>

        {mensaje && (
          <div style={{
            ...styles.mensaje,
            ...(mensaje.includes('✅') || mensaje.includes('🗑️') || mensaje.includes('🔄') ? styles.mensajeSuccess : styles.mensajeError)
          }}>
            {mensaje}
          </div>
        )}

        {/* Información del Laboratorio */}
        <div style={styles.configContainer}>
          <h3 style={styles.sectionTitle}>
            <span>🏢</span> Información del Laboratorio
          </h3>
          
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre del Laboratorio *</label>
              <input
                type="text"
                style={styles.input}
                value={configuracion.nombre_laboratorio}
                onChange={(e) => handleInputChange('nombre_laboratorio', e.target.value)}
                placeholder="Ej: Laboratorio Dental Pro"
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <div style={styles.helperText}>
                Este nombre aparecerá en todos tus reportes
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>RUT *</label>
              <input
                type="text"
                style={styles.input}
                value={configuracion.rut}
                onChange={(e) => handleInputChange('rut', e.target.value)}
                placeholder="Ej: 76.123.456-7"
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Dirección *</label>
            <input
              type="text"
              style={styles.input}
              value={configuracion.direccion}
              onChange={(e) => handleInputChange('direccion', e.target.value)}
              placeholder="Ej: Av. Principal 123, Santiago"
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Teléfono *</label>
              <input
                type="text"
                style={styles.input}
                value={configuracion.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                placeholder="Ej: +56 2 2345 6789"
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                style={styles.input}
                value={configuracion.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Ej: contacto@laboratorio.cl"
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <div style={styles.helperText}>
                Para contacto en reportes y facturación
              </div>
            </div>
          </div>
        </div>

        {/* Logo del Laboratorio */}
        <div style={styles.configContainer}>
          <h3 style={styles.sectionTitle}>
            <span>🖼️</span> Logo del Laboratorio
          </h3>
          
          <div style={styles.logoContainer}>
            {configuracion.logo ? (
              <>
                <img 
                  src={configuracion.logo} 
                  alt="Logo del laboratorio" 
                  style={styles.logoPreview}
                />
                <div style={styles.buttonGroup}>
                  <button 
                    style={styles.button}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={guardando}
                    onMouseOver={(e) => {
                      if (!guardando) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!guardando) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    📁 Cambiar Logo
                  </button>
                  <button 
                    style={{ ...styles.button, backgroundColor: '#dc2626' }}
                    onClick={eliminarLogo}
                    disabled={guardando}
                    onMouseOver={(e) => {
                      if (!guardando) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.2)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!guardando) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
                  <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>No hay logo cargado</p>
                  <p style={{ fontSize: '0.875rem' }}>Formatos: PNG, JPG, JPEG (Máx. 2MB)</p>
                </div>
                <button 
                  style={styles.button}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={guardando}
                  onMouseOver={(e) => {
                    if (!guardando) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!guardando) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  📁 Cargar Logo
                </button>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleLogoChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Configuración de Impuestos */}
        <div style={styles.configContainer}>
          <h3 style={styles.sectionTitle}>
            <span>💰</span> Configuración de Impuestos
          </h3>
          
          <div style={styles.impuestoSelector}>
            <div
              style={{
                ...styles.impuestoOption,
                ...(configuracion.tipo_impuesto === 'iva' ? styles.impuestoOptionSelected : {})
              }}
              onClick={() => handleTipoImpuestoChange('iva')}
            >
              <div style={styles.impuestoTitle}>IVA Empresa</div>
              <div style={styles.impuestoDescription}>
                Régimen de empresa con retención de IVA
              </div>
              <div style={styles.impuestoPercentage}>19%</div>
            </div>

            <div
              style={{
                ...styles.impuestoOption,
                ...(configuracion.tipo_impuesto === 'honorarios' ? styles.impuestoOptionSelected : {})
              }}
              onClick={() => handleTipoImpuestoChange('honorarios')}
            >
              <div style={styles.impuestoTitle}>Boleta Honorarios</div>
              <div style={styles.impuestoDescription}>
                Régimen de honorarios con retención
              </div>
              <div style={styles.impuestoPercentage}>15,25%</div>
            </div>
          </div>

          <div style={styles.helperText}>
            {configuracion.tipo_impuesto === 'iva' 
              ? 'Se aplicará 19% de IVA en todos los cálculos'
              : 'Se aplicará 15,25% de retención por honorarios'
            }
          </div>
        </div>

        {/* Vista Previa del Reporte */}
        <div style={styles.previewContainer}>
          <h3 style={styles.previewTitle}>👁️ Vista Previa del Reporte</h3>
          
          <div style={styles.previewContent}>
            <div style={styles.previewHeader}>
              <div>
                {configuracion.logo && (
                  <img 
                    src={configuracion.logo} 
                    alt="Logo" 
                    style={styles.previewLogo}
                  />
                )}
                {!configuracion.logo && (
                  <div style={{ 
                    width: '70px', 
                    height: '70px', 
                    backgroundColor: '#f1f5f9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    LOGO
                  </div>
                )}
              </div>
              <div style={styles.previewInfo}>
                <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#1e293b' }}>
                  {configuracion.nombre_laboratorio}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {configuracion.direccion}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {configuracion.telefono} | {configuracion.email}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  RUT: {configuracion.rut}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#475569', marginBottom: '1.5rem', fontSize: '1.125rem' }}>
                Ejemplo de Cálculo para $100.000:
              </h4>
              
              <div style={styles.previewCalculos}>
                <div style={styles.calculoRow}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span style={{ fontWeight: '600' }}>${ejemplo.subtotal.toLocaleString()}</span>
                </div>
                
                <div style={styles.calculoRow}>
                  <span style={{ color: '#64748b' }}>
                    {configuracion.tipo_impuesto === 'iva' ? 'IVA (19%)' : 'Retención Honorarios (14.5%)'}:
                  </span>
                  <span style={{ color: '#dc2626', fontWeight: '600' }}>
                    -${ejemplo.impuesto.toLocaleString()}
                  </span>
                </div>
                
                <div style={styles.calculoTotal}>
                  <span style={{ color: '#1e293b' }}>TOTAL A PAGAR:</span>
                  <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    ${ejemplo.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={styles.buttonGroup}>
          <button 
            style={styles.button}
            onClick={resetearConfiguracion}
            disabled={guardando}
            onMouseOver={(e) => {
              if (!guardando) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.2)';
              }
            }}
            onMouseOut={(e) => {
              if (!guardando) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            🔄 Resetear
          </button>
          <button 
            style={esConfiguracionValida && !guardando ? styles.buttonSuccess : styles.buttonDisabled}
            onClick={guardarConfiguracion}
            disabled={!esConfiguracionValida || guardando}
            onMouseOver={(e) => {
              if (!guardando && esConfiguracionValida) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
              }
            }}
            onMouseOut={(e) => {
              if (!guardando && esConfiguracionValida) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {guardando ? '💾 Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpcionesCuenta;