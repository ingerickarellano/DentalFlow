import React from 'react';
import { usePWA } from '../hooks/usePWA';

const InstallPWAButton: React.FC = () => {
  const { installApp, showInstallButton } = usePWA();

  if (!showInstallButton()) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      <button
        onClick={installApp}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
      >
        📲 Instalar App
        <span style={{
          fontSize: '12px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: '2px 8px',
          borderRadius: '10px'
        }}>
          PWA
        </span>
      </button>
      <div style={{
        fontSize: '12px',
        color: '#64748b',
        marginTop: '4px',
        textAlign: 'center',
        maxWidth: '200px'
      }}>
        Para acceso rápido a las entregas
      </div>
    </div>
  );
};

export default InstallPWAButton;