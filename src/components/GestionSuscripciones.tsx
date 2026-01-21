import React, { useState, useEffect } from 'react';
import { membresias, planesMembresia, Pago, pagos } from '../data/database';

interface GestionSuscripcionesProps {
  onBack?: () => void;
}

const GestionSuscripciones: React.FC<GestionSuscripcionesProps> = ({ onBack }) => {
  const [suscripcionesActivas, setSuscripcionesActivas] = useState<any[]>([]);
  const [pagosRecientes, setPagosRecientes] = useState<Pago[]>([]);

  useEffect(() => {
    // Filtrar suscripciones activas
    const activas = membresias.filter(sub => 
      sub.estado === 'activa'
    );
    setSuscripcionesActivas(activas);

    // Obtener pagos recientes
    const recientes = pagos.slice(0, 10);
    setPagosRecientes(recientes);
  }, []);

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
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center' as const
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    statLabel: {
      color: '#64748b',
      fontSize: '0.875rem'
    },
    section: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '2rem'
    },
    sectionTitle: {
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '1rem'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const
    },
    th: {
      backgroundColor: '#f8fafc',
      padding: '0.75rem',
      textAlign: 'left' as const,
      borderBottom: '1px solid #e2e8f0',
      color: '#475569',
      fontWeight: '600'
    },
    td: {
      padding: '0.75rem',
      borderBottom: '1px solid #e2e8f0',
      color: '#475569'
    },
    badge: {
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    badgeActive: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    badgeWarning: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    badgeInactive: {
      backgroundColor: '#f1f5f9',
      color: '#64748b'
    },
    actionButton: {
      padding: '0.25rem 0.5rem',
      border: 'none',
      borderRadius: '0.25rem',
      cursor: 'pointer',
      fontSize: '0.75rem',
      marginRight: '0.5rem'
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    buttonDanger: {
      backgroundColor: '#ef4444',
      color: 'white'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestión de Suscripciones</h1>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Volver
          </button>
        )}
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{suscripcionesActivas.length}</div>
          <div style={styles.statLabel}>Suscripciones Activas</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            {membresias.filter(sub => sub.estado === 'expirada').length}
          </div>
          <div style={styles.statLabel}>Expiradas</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>
            ${pagosRecientes.reduce((total, pago) => total + pago.monto, 0)}
          </div>
          <div style={styles.statLabel}>Ingresos del Mes</div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Todas las Suscripciones</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Usuario</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {membresias.map(suscripcion => (
              <tr key={suscripcion.id}>
                <td style={styles.td}>Usuario {suscripcion.usuarioId}</td>
                <td style={styles.td}>Plan {suscripcion.id}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    ...(suscripcion.estado === 'activa' ? styles.badgeActive : 
                        suscripcion.estado === 'expirada' ? styles.badgeInactive : styles.badgeWarning)
                  }}>
                    {suscripcion.estado}w
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={{...styles.actionButton, ...styles.buttonPrimary}}>
                    Renovar
                  </button>
                  <button style={{...styles.actionButton, ...styles.buttonDanger}}>
                    Cancelar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Pagos Recientes</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID Pago</th>
              <th style={styles.th}>Usuario</th>
              <th style={styles.th}>Monto</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {pagosRecientes.map(pago => (
              <tr key={pago.id}>
                <td style={styles.td}>{pago.id}</td>
                <td style={styles.td}>Usuario {pago.usuarioId}</td>
                <td style={styles.td}>${pago.monto}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    ...(pago.estado === 'completado' ? styles.badgeActive : 
                        pago.estado === 'pendiente' ? styles.badgeWarning : styles.badgeInactive)
                  }}>
                    {pago.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionSuscripciones;