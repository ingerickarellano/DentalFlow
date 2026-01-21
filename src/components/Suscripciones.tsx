import React, { useState } from 'react';
import { planesMembresia, membresias } from '../data/database';

interface SuscripcionesProps {
  onBack?: () => void;
}

const Suscripciones: React.FC<SuscripcionesProps> = ({ onBack }) => {
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);

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
      marginBottom: '3rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '2.5rem',
      fontWeight: 'bold'
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontSize: '1rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    card: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      textAlign: 'center' as const,
      border: '2px solid transparent',
      transition: 'all 0.3s ease',
      position: 'relative' as const
    },
    cardFeatured: {
      borderColor: '#3b82f6',
      transform: 'scale(1.05)'
    },
    popularBadge: {
      position: 'absolute' as const,
      top: '-10px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.5rem 1.5rem',
      borderRadius: '1rem',
      fontSize: '0.875rem',
      fontWeight: '600'
    },
    planName: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '1rem'
    },
    price: {
      fontSize: '3rem',
      fontWeight: 'bold',
      color: '#3b82f6',
      marginBottom: '0.5rem'
    },
    period: {
      color: '#64748b',
      fontSize: '1rem',
      marginBottom: '2rem'
    },
    caracteristicas: {
      listStyle: 'none',
      padding: 0,
      margin: '2rem 0',
      textAlign: 'left' as const
    },
    caracteristica: {
      padding: '0.75rem 0',
      color: '#475569',
      borderBottom: '1px solid #f1f5f9'
    },
    checkIcon: {
      color: '#10b981',
      marginRight: '0.5rem',
      fontWeight: 'bold'
    },
    selectButton: {
      width: '100%',
      padding: '1rem 2rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1.125rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    buttonSecondary: {
      backgroundColor: '#f1f5f9',
      color: '#475569'
    },
    buttonSelected: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    currentPlan: {
      textAlign: 'center' as const,
      marginTop: '3rem',
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    currentPlanTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '1rem'
    }
  };

  const handleSeleccionarPlan = (planId: string) => {
    setPlanSeleccionado(planId);
    console.log('Plan seleccionado:', planId);
  };

  const suscripcionActual = membresias[0];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Planes de Suscripción</h1>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Volver al Dashboard
          </button>
        )}
      </div>

      {suscripcionActual && (
        <div style={styles.currentPlan}>
          <h2 style={styles.currentPlanTitle}>Tu Plan Actual</h2>
<p>Plan: {planesMembresia.find(p => p.id === suscripcionActual.id)?.nombre}</p>
          <p>Estado: <strong>{suscripcionActual.estado}</strong></p>
        </div>
      )}

      <div style={styles.grid}>
        {planesMembresia.map(plan => (
          <div
            key={plan.id}
            style={{
              ...styles.card,
              ...(plan.id === 'premium' ? styles.cardFeatured : {})
            }}
          >
            {plan.id === 'premium' && (
              <div style={styles.popularBadge}>MÁS POPULAR</div>
            )}
            
            <h3 style={styles.planName}>{plan.nombre}</h3>
            
            <div style={styles.price}>
              ${plan.precio}
              <span style={styles.period}>/mes</span>
            </div>

            <ul style={styles.caracteristicas}>
              {plan.caracteristicas.map((caracteristica, index) => (
                <li key={index} style={styles.caracteristica}>
                  <span style={styles.checkIcon}>✓</span>
                  {caracteristica}
                </li>
              ))}
            </ul>

            <button
              style={{
                ...styles.selectButton,
                ...(planSeleccionado === plan.id ? styles.buttonSelected : 
                    plan.id === 'premium' ? styles.buttonPrimary : styles.buttonSecondary)
              }}
              onClick={() => handleSeleccionarPlan(plan.id)}
            >
              {planSeleccionado === plan.id ? 'Seleccionado' : 
               plan.precio === 0 ? 'Comenzar Gratis' : 'Seleccionar Plan'}
            </button>
          </div>
        ))}
      </div>

      {planSeleccionado && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button style={{
            ...styles.selectButton,
            ...styles.buttonPrimary,
            width: 'auto',
            padding: '1rem 3rem'
          }}>
            Proceder al Pago
          </button>
        </div>
      )}
    </div>
  );
};

export default Suscripciones;