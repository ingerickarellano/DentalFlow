import React from 'react';

interface GestionServiciosProps {
  onBack?: () => void;
}

const GestionServicios: React.FC<GestionServiciosProps> = ({ onBack }) => {
  const styles = {
    container: {
      padding: '2rem',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '2rem',
      fontWeight: 'bold'
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestión de Servicios</h1>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Volver
          </button>
        )}
      </div>
      <p>Módulo de gestión de servicios - En desarrollo</p>
    </div>
  );
};

export default GestionServicios;