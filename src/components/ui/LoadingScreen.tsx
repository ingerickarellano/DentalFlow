import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Cargando..." 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          animation: 'pulse 2s infinite'
        }}>
          🦷
        </div>
        <div style={{ 
          color: '#64748b', 
          fontSize: '1.125rem',
          fontWeight: '500'
        }}>
          {message}
        </div>
        <style>
          {`
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default LoadingScreen;