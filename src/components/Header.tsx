// src/components/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  user?: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
    plan?: string;
    fecha_expiracion?: string | null;
    suscripcion_activa?: boolean;
    laboratorio?: string;
    telefono?: string;
  };
  onLogout?: () => void;
  cerrandoSesion?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  showTitle?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  onLogout, 
  cerrandoSesion = false, 
  showBackButton = false, 
  onBack,
  title = '',
  showTitle = false
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      return;
    }

    try {
      if (onLogout) {
        await onLogout();
      }
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
    }
  };

  const styles = {
    header: {
      padding: '0.75rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky' as const,
      top: 0,
      zIndex: 100,
      height: '64px'
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.5rem'
    },
    backButton: {
      backgroundColor: 'transparent',
      color: '#64748b',
      padding: '0.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '1.25rem',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      transition: 'all 0.2s'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
      textDecoration: 'none'
    },
    logoImage: {
      height: '40px',
      width: 'auto',
      objectFit: 'contain' as const,
      transition: 'transform 0.2s'
    },
    logoText: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#3b82f6',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    pageTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#374151',
      margin: 0,
      paddingLeft: '1rem',
      borderLeft: '2px solid #e5e7eb'
    },
    userSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    userInfo: {
      textAlign: 'right' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'flex-end'
    },
    userName: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    userRole: {
      fontSize: '0.75rem',
      color: '#64748b',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    userBadge: {
      backgroundColor: '#f0f9ff',
      color: '#0369a1',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '500',
      border: '1px solid #bae6fd'
    },
    logoutButton: {
      backgroundColor: 'transparent',
      color: '#ef4444',
      padding: '0.5rem 1rem',
      border: '1px solid #ef4444',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    logoutButtonDisabled: {
      backgroundColor: '#f3f4f6',
      color: '#9ca3af',
      padding: '0.5rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    userAvatar: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: '0.875rem',
      textTransform: 'uppercase' as const
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header style={styles.header}>
      <div style={styles.leftSection}>
        {showBackButton && onBack && (
          <button 
            style={styles.backButton}
            onClick={onBack}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
            title="Volver"
          >
            ←
          </button>
        )}
        
        <div 
          style={styles.logoContainer}
          onClick={() => navigate('/dashboard')}
          onMouseEnter={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) {
              img.style.transform = 'scale(1)';
            }
          }}
        >
          <img 
            src="/Dentalflow-Manager.png" 
            alt="DentalFlow Logo" 
            style={styles.logoImage}
          />
        </div>

        {showTitle && title && (
          <h1 style={styles.pageTitle}>{title}</h1>
        )}
      </div>
      
      <div style={styles.userSection}>
        {user && (
          <div style={styles.userInfo}>
            <p style={styles.userName}>
              {user.nombre}
              {user.rol === 'admin' && (
                <span style={styles.userBadge}>Admin</span>
              )}
            </p>
            <p style={styles.userRole}>
              {user.laboratorio || 'Laboratorio'}
            </p>
          </div>
        )}

        {user && (
          <div style={styles.userAvatar}>
            {getInitials(user.nombre)}
          </div>
        )}
        
        {onLogout && (
          <button 
            style={cerrandoSesion ? styles.logoutButtonDisabled : styles.logoutButton}
            onClick={handleLogout}
            disabled={cerrandoSesion}
            onMouseEnter={(e) => {
              if (!cerrandoSesion) {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!cerrandoSesion) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#ef4444';
              }
            }}
            title="Cerrar sesión"
          >
            {cerrandoSesion ? (
              <>
                <span>⌛</span>
                Saliendo...
              </>
            ) : (
              'Salir'
            )}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;