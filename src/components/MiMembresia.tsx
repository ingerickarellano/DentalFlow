import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useMembresia } from '../hooks/useMembresia';
import Header from './Header';

const MiMembresia: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cargandoUser, setCargandoUser] = useState(true);
  const [mostrarDatosTransferencia, setMostrarDatosTransferencia] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setCargandoUser(false);
    };
    obtenerUsuario();
  }, []);

  const membresia = useMembresia(user?.id);
  const esAdmin = user?.user_metadata?.rol === 'admin' || false;

  const handleLogout = async () => {
    if (cerrandoSesion) return;
    if (!window.confirm('¿Estás seguro de que quieres cerrar sesión?')) return;
    try {
      setCerrandoSesion(true);
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
    } finally {
      setCerrandoSesion(false);
    }
  };

  const handleEnviarComprobante = () => {
    window.location.href = `mailto:transferencias@dentalflow.com?subject=Comprobante de Transferencia - ${user?.email}&body=Hola,%0D%0A%0D%0AAquí adjunto el comprobante de transferencia para mi membresía DentalFlow.%0D%0A%0D%0ADatos:%0D%0AEmail: ${user?.email}%0D%0APlan: ${membresia.plan === 'gratuita' ? 'Profesional' : membresia.plan}%0D%0A%0D%0AAtt,%0D%0A${user?.user_metadata?.nombre || user?.email?.split('@')[0] || ''}`;
  };

  if (cargandoUser || membresia.cargando) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando información de tu membresía...</p>
      </div>
    );
  }

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'gratuita': return 'Prueba Gratuita';
      case 'profesional': return 'Profesional';
      case 'empresarial': return 'Empresarial';
      default: return plan;
    }
  };

  const getEstadoStyles = (estaActiva: boolean, dias: number) => {
    if (estaActiva) {
      return { bg: '#10b981', text: 'white', icon: '✅', label: 'ACTIVA' };
    } else {
      if (dias === 0) {
        return { bg: '#ef4444', text: 'white', icon: '⚠️', label: 'VENCIDA' };
      } else {
        return { bg: '#6b7280', text: 'white', icon: '⏸️', label: 'INACTIVA' };
      }
    }
  };

  const estadoStyles = getEstadoStyles(membresia.estaActiva, membresia.dias_restantes);

  return (
    <div style={styles.container}>
      <Header
        user={user ? {
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.nombre || user.email.split('@')[0],
          rol: user.user_metadata?.rol || 'cliente',
          laboratorio: user.user_metadata?.laboratorio,
          telefono: user.user_metadata?.telefono
        } : undefined}
        onLogout={handleLogout}
        cerrandoSesion={cerrandoSesion}
        showBackButton={true}  // ✅ SIEMPRE mostrar el botón de volver al dashboard
        onBack={() => navigate('/dashboard')}
        title="Mi Membresía"
        showTitle
      />

      <div style={styles.content}>
        {/* Tarjeta de Estado */}
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ ...styles.estadoBadge, backgroundColor: estadoStyles.bg, color: estadoStyles.text }}>
                {estadoStyles.icon} {estadoStyles.label}
              </div>
              <div>
                <h2 style={styles.planTitle}>{getPlanDisplayName(membresia.plan)}</h2>
                <p style={styles.planSubtitle}>
                  {membresia.estaActiva ? 'Plan activo' : 
                   membresia.dias_restantes === 0 ? 'Plan vencido' : 'Plan inactivo'}
                </p>
              </div>
            </div>

            {membresia.estaActiva && membresia.dias_restantes > 0 && (
              <div style={styles.statusInfo}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Días restantes</div>
                  <div style={{
                    ...styles.infoValue,
                    color: membresia.dias_restantes <= 7 ? '#ef4444' : '#059669',
                    fontWeight: '700'
                  }}>
                    {membresia.dias_restantes} días
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Vence el</div>
                  <div style={styles.infoValue}>
                    {membresia.fecha_expiracion
                      ? new Date(membresia.fecha_expiracion).toLocaleDateString('es-ES')
                      : 'No definida'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Características del plan */}
          <div style={styles.featuresGrid}>
            {membresia.plan === 'gratuita' && (
              <>
                <div style={styles.featureItem}>✓ Hasta 50 trabajos/mes</div>
                <div style={styles.featureItem}>✓ 1 laboratorio</div>
                <div style={styles.featureItem}>✓ Soporte básico</div>
              </>
            )}
            {membresia.plan === 'profesional' && (
              <>
                <div style={styles.featureItem}>✓ Trabajos ilimitados</div>
                <div style={styles.featureItem}>✓ Hasta 3 laboratorios</div>
                <div style={styles.featureItem}>✓ Soporte prioritario</div>
                <div style={styles.featureItem}>✓ Reportes avanzados</div>
              </>
            )}
            {membresia.plan === 'empresarial' && (
              <>
                <div style={styles.featureItem}>✓ Todo en Profesional</div>
                <div style={styles.featureItem}>✓ Laboratorios ilimitados</div>
                <div style={styles.featureItem}>✓ Soporte 24/7</div>
                <div style={styles.featureItem}>✓ API de integración</div>
              </>
            )}
          </div>

          {/* SECCIÓN DE RENOVACIÓN / ACTIVACIÓN (solo para clientes no admin con membresía inactiva) */}
          {!membresia.estaActiva && !esAdmin && (
            <div style={styles.renovacionSection}>
              <div style={styles.renovacionHeader}>
                <span style={styles.renovacionIcon}>⏳</span>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.renovacionTitle}>
                    {membresia.dias_restantes === 0 
                      ? 'Tu membresía ha expirado' 
                      : 'Tu membresía no está activa'}
                  </h3>
                  <p style={styles.renovacionText}>
                    {membresia.dias_restantes === 0
                      ? 'El período de prueba gratuita ha finalizado. Para seguir usando DentalFlow, elige un plan y realiza el pago.'
                      : 'Tu plan actual no se encuentra activo. Por favor, renueva tu suscripción para continuar accediendo a todos los módulos.'}
                  </p>
                </div>
              </div>

              <div style={styles.planOpciones}>
                <div style={styles.planOpcion}>
                  <h4 style={styles.planOpcionTitulo}>Plan Profesional</h4>
                  <div style={styles.planOpcionPrecio}>$8.000<span style={styles.planOpcionPeriodo}>/mes</span></div>
                  <ul style={styles.planOpcionLista}>
                    <li>✓ Clínicas ilimitadas</li>
                    <li>✓ Trabajos ilimitados</li>
                    <li>✓ Soporte prioritario</li>
                    <li>✓ Reportes avanzados</li>
                  </ul>
                </div>
                <div style={styles.planOpcion}>
                  <h4 style={styles.planOpcionTitulo}>Plan Empresarial</h4>
                  <div style={styles.planOpcionPrecio}>$16.000<span style={styles.planOpcionPeriodo}>/mes</span></div>
                  <ul style={styles.planOpcionLista}>
                    <li>✓ Todo del plan Profesional</li>
                    <li>✓ Laboratorios ilimitados</li>
                    <li>✓ Soporte 24/7</li>
                    <li>✓ API de integración</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setMostrarDatosTransferencia(!mostrarDatosTransferencia)}
                style={styles.renovacionButton}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                💳 Pagar por Transferencia Bancaria
              </button>

              {mostrarDatosTransferencia && (
                <div style={styles.transferCard}>
                  <h4 style={{ color: '#1e40af', marginBottom: '1rem' }}>Datos Bancarios:</h4>
                  <div style={styles.transferDetails}>
                    <p><strong>Banco:</strong> Banco de Chile</p>
                    <p><strong>Cuenta Corriente:</strong> 123-45678-9</p>
                    <p><strong>RUT:</strong> 12.345.678-9</p>
                    <p><strong>Titular:</strong> DentalFlow SpA</p>
                    <p><strong>Monto:</strong> $8.000 CLP/mes (Profesional) o $16.000 CLP/mes (Empresarial)</p>
                    <p><strong>Email para comprobante:</strong> transferencias@dentalflow.com</p>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      onClick={handleEnviarComprobante}
                      style={styles.comprobanteButton}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                    >
                      📧 Enviar Comprobante por Email
                    </button>
                    <p style={styles.comprobanteNota}>
                      Te activaremos manualmente en 24 horas hábiles después de recibir el comprobante.
                      Incluye tu email de registro en el asunto.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje para administradores */}
          {!membresia.estaActiva && esAdmin && (
            <div style={{ ...styles.warningCard, backgroundColor: '#fef3c7', borderColor: '#fbbf24' }}>
              <p style={{ color: '#92400e', margin: 0 }}>
                ⚠️ Eres administrador. Puedes acceder a todos los módulos aunque tu membresía esté inactiva.
              </p>
            </div>
          )}
        </div>

        {/* Información de Soporte */}
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>¿Necesitas ayuda?</h3>
          <div style={styles.contactoInfo}>
            <div style={styles.contactoItem}>
              <span style={styles.contactoIcon}>📧</span>
              <span>transferencias@dentalflow.com (comprobantes)</span>
            </div>
            <div style={styles.contactoItem}>
              <span style={styles.contactoIcon}>📧</span>
              <span>soporte@dentalflow.com (soporte técnico)</span>
            </div>
            <div style={styles.contactoItem}>
              <span style={styles.contactoIcon}>📞</span>
              <span>+56 9 84201 462 (WhatsApp)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: '2rem',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#64748b'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    marginBottom: '2rem'
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap' as const,
    gap: '1rem'
  },
  estadoBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  planTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0',
    color: '#1e293b'
  },
  planSubtitle: {
    color: '#64748b',
    margin: '0.25rem 0 0 0'
  },
  statusInfo: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const
  },
  infoItem: {
    textAlign: 'right' as const
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  infoValue: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.75rem'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#374151'
  },
  // Estilos de renovación
  renovacionSection: {
    marginTop: '2rem',
    padding: '2rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '0.75rem',
  },
  renovacionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  renovacionIcon: {
    fontSize: '2rem',
  },
  renovacionTitle: {
    margin: '0 0 0.5rem 0',
    color: '#92400e',
    fontSize: '1.25rem',
    fontWeight: '600',
  },
  renovacionText: {
    margin: 0,
    color: '#92400e',
    lineHeight: '1.6',
  },
  planOpciones: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  planOpcion: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    border: '2px solid #e2e8f0',
    textAlign: 'center' as const,
  },
  planOpcionTitulo: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#1e293b',
  },
  planOpcionPrecio: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: '1rem',
  },
  planOpcionPeriodo: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: 'normal',
  },
  planOpcionLista: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    textAlign: 'left' as const,
    color: '#475569',
    fontSize: '0.9rem',
  },
  renovacionButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '1rem 2rem',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
    marginBottom: '1.5rem',
  },
  transferCard: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #e0f2fe',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginTop: '1rem',
  },
  transferDetails: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
    lineHeight: '1.8',
  },
  comprobanteButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    width: '100%',
    transition: 'background-color 0.2s',
  },
  comprobanteNota: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginTop: '0.75rem',
    textAlign: 'center' as const,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    marginTop: '1.5rem',
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    border: '1px solid #3b82f6',
    borderRadius: '1rem',
    padding: '2rem',
    marginTop: '2rem',
  },
  infoTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#1e40af',
  },
  contactoInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  contactoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#1e40af',
  },
  contactoIcon: {
    fontSize: '1.25rem',
  },
};

// Agregar animación del spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default MiMembresia;