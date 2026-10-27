import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlanes } from '../hooks/usePlanes';

interface RegistroProps {
  onBack?: () => void;
}

const Registro: React.FC<RegistroProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Acepta los nombres antiguos de plan que aún puedan venir en enlaces
  const planUrl = (searchParams.get('plan') || 'gratuito').toLowerCase();
  const planSeleccionado = planUrl === 'gratuita' ? 'gratuito' : planUrl === 'empresarial' ? 'enterprise' : planUrl;

  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mostrarTransferencia, setMostrarTransferencia] = useState(false);
  const [comprobanteEnviado, setComprobanteEnviado] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    laboratorio: '',
    password: '',
    confirmPassword: '',
  });

  // Planes de suscripción actualizados
  const planesMembresia = [
    {
      id: 'gratuito',
      nombre: 'Prueba Gratuita',
      precio: 0,
      duracion: '30 días',
      caracteristicas: [
        'Hasta 3 clínicas',
        'Hasta 10 trabajos mensuales',
        'Soporte básico por email',
        'Acceso a reportes básicos'
      ]
    },
    {
      id: 'profesional',
      nombre: 'Plan Profesional',
      precio: 8000,
      duracion: 'mes',
      caracteristicas: [
        'Clínicas ilimitadas',
        'Trabajos ilimitados',
        'Soporte prioritario',
        'Reportes avanzados',
        'Backup automático'
      ]
    },
    {
      id: 'enterprise',
      nombre: 'Plan Enterprise',
      precio: 16000,
      duracion: 'mes',
      caracteristicas: [
        'Todo del plan Profesional',
        'Soporte 24/7 dedicado',
        'Reportes personalizados',
        'White-label disponible',
        'Onboarding personalizado'
      ]
    }
  ];

  // Montos en pesos chilenos: $8.000
  const formatearCLP = (monto: number) => `$${monto.toLocaleString('es-CL')}`;

  // El precio vigente viene de la tabla "planes" (lo administra el super admin);
  // si aún no carga, se usa el valor de referencia de arriba.
  const { plan: datosPlan } = usePlanes();
  const [planBase] = useState(planesMembresia.find(p => p.id === planSeleccionado) || planesMembresia[0]);
  const plan = { ...planBase, precio: datosPlan(planBase.id)?.precio_mensual ?? planBase.precio };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '2rem'
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '2rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '2rem',
      fontWeight: 'bold'
    },
    progress: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '3rem'
    },
    progressStep: {
      display: 'flex',
      alignItems: 'center'
    },
    stepNumber: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#e2e8f0',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      margin: '0 1rem'
    },
    stepNumberActive: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    stepLine: {
      width: '100px',
      height: '2px',
      backgroundColor: '#e2e8f0'
    },
    formContainer: {
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      color: '#1e293b',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      boxSizing: 'border-box' as const
    },
    inputError: {
      borderColor: '#dc2626'
    },
    planSummary: {
      backgroundColor: '#f0f9ff',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      marginBottom: '2rem',
      border: '1px solid #e0f2fe'
    },
    planName: {
      fontWeight: 'bold',
      color: '#0369a1',
      fontSize: '1.25rem',
      margin: '0 0 0.5rem 0'
    },
    planPrice: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#2563eb',
      margin: '0 0 1rem 0'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'space-between',
      marginTop: '2rem'
    },
    button: {
      padding: '1rem 2rem',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      opacity: 1
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    buttonPrimary: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    buttonSecondary: {
      backgroundColor: '#64748b',
      color: 'white'
    },
    success: {
      textAlign: 'center' as const,
      padding: '3rem'
    },
    successIcon: {
      fontSize: '4rem',
      marginBottom: '1rem'
    },
    error: {
      color: '#dc2626',
      fontSize: '0.875rem',
      textAlign: 'center' as const,
      marginBottom: '1rem',
      padding: '0.5rem',
      backgroundColor: '#fef2f2',
      borderRadius: '0.375rem'
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validarPaso1 = () => {
    return formData.nombre && 
           formData.email && 
           formData.laboratorio && 
           formData.password && 
           formData.password === formData.confirmPassword &&
           formData.password.length >= 6;
  };

  const handleSiguiente = () => {
    if (paso === 1 && validarPaso1()) {
      setPaso(2);
    } else if (paso === 2) {
      handleFinalizar();
    }
  };

  const handleFinalizar = async () => {
    setCargando(true);
    setError('');

    try {
      // Registrar usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre.trim(),
            laboratorio: formData.laboratorio.trim(),
            telefono: formData.telefono.trim(),
            plan: plan.id,
            rol: 'admin'
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      if (data.user) {
        console.log('✅ Usuario creado con UUID:', data.user.id);
        
        // El laboratorio (prueba Gratuita de 30 días) y el perfil de administrador
        // los crea la base de datos automáticamente al registrarse.

        setPaso(3);
      }
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      // Mensajes de error más amigables
      if (error.message.includes('already registered')) {
        setError('Este email ya está registrado. ¿Olvidaste tu contraseña?');
      } else if (error.message.includes('Password should be at least')) {
        setError('La contraseña debe tener al menos 6 caracteres');
      } else if (error.message.includes('Invalid email')) {
        setError('Por favor ingresa un email válido');
      } else {
        setError(error.message || 'Error al crear la cuenta. Por favor intenta nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  const esPlanPago = plan.precio > 0;

  if (paso === 3) {
    return (
      <div style={styles.container}>
        <div style={styles.formContainer}>
          <div style={styles.success}>
            <div style={styles.successIcon}>🎉</div>
            <h2>¡Registro Exitoso!</h2>
            
            {esPlanPago ? (
              <>
                <p>Tu cuenta <strong>{formData.email}</strong> ha sido creada.</p>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  margin: '1.5rem 0',
                  border: '1px solid #e0f2fe'
                }}>
                  <h3 style={{ color: '#0369a1', marginBottom: '1rem' }}>
                    ⚡ Para activar tu plan {plan.nombre}:
                  </h3>
                  <ol style={{ paddingLeft: '1.5rem', textAlign: 'left' }}>
                    <li style={{ marginBottom: '0.5rem' }}>Realiza la transferencia a los datos proporcionados</li>
                    <li style={{ marginBottom: '0.5rem' }}>Envía el comprobante a <strong>transferencias@dentalflow.com</strong></li>
                    <li style={{ marginBottom: '0.5rem' }}>Incluye tu email <strong>{formData.email}</strong> en el asunto</li>
                    <li>Te activaremos manualmente en 24 horas hábiles</li>
                  </ol>
                  <p style={{ marginTop: '1rem', color: '#475569' }}>
                    📧 Recibirás un email cuando tu cuenta esté activa.
                  </p>
                </div>
                <p>Mientras confirmamos tu pago, tu cuenta parte con la <strong>prueba gratuita de 30 días</strong> (hasta 3 clínicas).</p>
              </>
            ) : (
              <>
                <p>Tu cuenta ha sido creada exitosamente.</p>
                <p>Hemos enviado un email de confirmación a <strong>{formData.email}</strong></p>
                <p>Por favor verifica tu email antes de iniciar sesión.</p>
                <p>Tu plan gratuito de 30 días está activo.</p>
              </>
            )}
            
            <div style={{ marginTop: '2rem' }}>
              <button 
                onClick={() => navigate('/login')}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginRight: '1rem'
                }}
              >
                Ir a Iniciar Sesión
              </button>
              
              {esPlanPago && (
                <button 
                  onClick={() => window.location.href = `mailto:transferencias@dentalflow.com?subject=Comprobante de Transferencia - ${formData.email}&body=Hola,%0D%0A%0D%0AAquí adjunto el comprobante de transferencia para mi cuenta DentalFlow.%0D%0A%0D%0ADatos:%0D%0AEmail: ${formData.email}%0D%0APlan: ${plan.nombre}%0D%0A%0D%0AAtt,%0D%0A${formData.nombre}`}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '0.75rem 2rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📧 Enviar Comprobante Ahora
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Registro en DentalFlow</h1>
        {onBack && (
          <button 
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
              marginTop: '1rem'
            }}
            onClick={onBack}
            disabled={cargando}
          >
            ← Volver al Inicio
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progress}>
        <div style={styles.progressStep}>
          <div style={{
            ...styles.stepNumber,
            ...(paso >= 1 ? styles.stepNumberActive : {})
          }}>1</div>
          <div style={styles.stepLine}></div>
        </div>
        <div style={styles.progressStep}>
          <div style={{
            ...styles.stepNumber,
            ...(paso >= 2 ? styles.stepNumberActive : {})
          }}>2</div>
        </div>
      </div>

      <div style={styles.formContainer}>
        {error && <div style={styles.error}>{error}</div>}

        {/* Resumen del Plan */}
        <div style={styles.planSummary}>
          <h3 style={styles.planName}>{plan.nombre}</h3>
          <div style={styles.planPrice}>
            {plan.precio === 0 ? 'Gratis' : formatearCLP(plan.precio)}
            <span style={{ fontSize: '1rem', color: '#64748b' }}>
              {plan.precio > 0 ? '/mes' : ` - ${plan.duracion}`}
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {plan.caracteristicas.slice(0, 3).map((caract, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>✓ {caract}</li>
            ))}
          </ul>
        </div>

        {paso === 1 && (
          <>
            <h3 style={{ marginBottom: '1.5rem' }}>Información Personal</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre Completo *</label>
              <input
                type="text"
                name="nombre"
                style={{
                  ...styles.input,
                  ...(error && !formData.nombre ? styles.inputError : {})
                }}
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                required
                disabled={cargando}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                name="email"
                style={{
                  ...styles.input,
                  ...(error && !formData.email ? styles.inputError : {})
                }}
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                required
                disabled={cargando}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Teléfono</label>
              <input
                type="tel"
                name="telefono"
                style={styles.input}
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="+56 9 8420 1462"
                disabled={cargando}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre del Laboratorio *</label>
              <input
                type="text"
                name="laboratorio"
                style={{
                  ...styles.input,
                  ...(error && !formData.laboratorio ? styles.inputError : {})
                }}
                value={formData.laboratorio}
                onChange={handleInputChange}
                placeholder="Ej: Tecnodentille"
                required
                disabled={cargando}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Contraseña *</label>
              <input
                type="password"
                name="password"
                style={{
                  ...styles.input,
                  ...(error && !formData.password ? styles.inputError : {})
                }}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 6 caracteres"
                required
                disabled={cargando}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirmar Contraseña *</label>
              <input
                type="password"
                name="confirmPassword"
                style={{
                  ...styles.input,
                  ...(error && formData.password !== formData.confirmPassword ? styles.inputError : {})
                }}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repite tu contraseña"
                required
                disabled={cargando}
              />
            </div>

            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div style={styles.error}>Las contraseñas no coinciden</div>
            )}

            {formData.password && formData.password.length < 6 && (
              <div style={styles.error}>La contraseña debe tener al menos 6 caracteres</div>
            )}
          </>
        )}

        {paso === 2 && (
          <>
            <h3 style={{ marginBottom: '1.5rem' }}>Confirmación</h3>
            
            <div style={{ 
              backgroundColor: '#f0f9ff', 
              padding: '1.5rem', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1' }}>Resumen de tu registro:</h4>
              <p><strong>Nombre:</strong> {formData.nombre}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Laboratorio:</strong> {formData.laboratorio}</p>
              <p><strong>Plan:</strong> {plan.nombre} ({plan.precio === 0 ? 'Gratuito' : `${formatearCLP(plan.precio)} CLP/mes`})</p>
            </div>

            {/* Sección de Transferencia para Planes de Pago */}
            {esPlanPago && (
              <div style={{ 
                backgroundColor: '#f0f9ff', 
                padding: '1.5rem', 
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #e0f2fe'
              }}>
                <h4 style={{ color: '#0369a1', marginBottom: '1rem' }}>
                  💳 Opción de Pago: Transferencia Bancaria
                </h4>
                
                {!mostrarTransferencia ? (
                  <>
                    <p style={{ color: '#475569', marginBottom: '1rem' }}>
                      Para activar tu plan {plan.nombre}, realiza una transferencia bancaria.
                    </p>
                    <button
                      onClick={() => setMostrarTransferencia(true)}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Ver Datos de Transferencia
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <h5 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Datos bancarios:</h5>
                      <div style={{
                        backgroundColor: 'white',
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.9rem'
                      }}>
                        <p><strong>Banco:</strong> Banco de Chile</p>
                        <p><strong>Cuenta:</strong> 123-45678-9</p>
                        <p><strong>RUT:</strong> 12.345.678-9</p>
                        <p><strong>Titular:</strong> DentalFlow SpA</p>
                        <p><strong>Monto:</strong> {formatearCLP(plan.precio)} CLP/mes</p>
                        <p><strong>Email para comprobante:</strong> transferencias@dentalflow.com</p>
                      </div>
                    </div>
                    
                    {!comprobanteEnviado ? (
                      <div style={{ 
                        backgroundColor: '#fef3c7',
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem'
                      }}>
                        <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                          ⚠️ <strong>Importante:</strong> Después de registrar tu cuenta, 
                          envía el comprobante de transferencia al email indicado con tu email de registro.
                          Te activaremos manualmente en 24 horas.
                        </p>
                      </div>
                    ) : (
                      <div style={{ 
                        backgroundColor: '#d1fae5',
                        padding: '1rem',
                        borderRadius: '0.375rem',
                        marginBottom: '1rem'
                      }}>
                        <p style={{ margin: 0, color: '#065f46', fontSize: '0.9rem' }}>
                          ✅ Comprobante enviado. Revisaremos tu transferencia y te activaremos en 24 horas.
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setComprobanteEnviado(true);
                        alert('Recuerda enviar el comprobante a transferencias@dentalflow.com\n\nIncluye tu email de registro en el asunto.');
                      }}
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        marginRight: '1rem'
                      }}
                    >
                      ✓ Marcar como Transferido
                    </button>
                    
                    <button
                      onClick={() => setMostrarTransferencia(false)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#64748b',
                        padding: '0.75rem 1.5rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                    >
                      Ocultar Datos
                    </button>
                  </>
                )}
              </div>
            )}

            {plan.precio === 0 && (
              <div style={{ 
                backgroundColor: '#f0fdf4', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
                  ✅ Tu plan gratuito de 30 días se activará automáticamente después del registro.
                </p>
              </div>
            )}
          </>
        )}

        <div style={styles.buttonGroup}>
          {paso > 1 && (
            <button 
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                ...(cargando ? styles.buttonDisabled : {})
              }}
              onClick={() => setPaso(paso - 1)}
              disabled={cargando}
            >
              Atrás
            </button>
          )}
          
          <button 
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...((paso === 1 && !validarPaso1()) ? styles.buttonDisabled : {}),
              ...(cargando ? styles.buttonDisabled : {}),
              marginLeft: 'auto'
            }}
            onClick={handleSiguiente}
            disabled={(paso === 1 && !validarPaso1()) || cargando}
          >
            {cargando ? 'Procesando...' : 
             paso === 2 ? 'Completar Registro' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Registro;