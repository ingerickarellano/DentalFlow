import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ConfiguracionLaboratorioProps {
  onBack: () => void;
}

const ConfiguracionLaboratorio: React.FC<ConfiguracionLaboratorioProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [configuracion, setConfiguracion] = useState({
    nombreLaboratorio: '',
    contacto: '',
    email: '',
    tipoImpuesto: 'empresa', // 'empresa' o 'honorarios'
    porcentajeImpuesto: 19,
    logo: ''
  });
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // En una app real, cargarías la configuración desde tu base de datos
      // Por ahora simulamos una configuración por defecto
      setConfiguracion({
        nombreLaboratorio: '🦷 Mi Laboratorio Dental',
        contacto: '+56 9 1234 5678',
        email: 'contacto@milaboratorio.cl',
        tipoImpuesto: 'empresa',
        porcentajeImpuesto: 19,
        logo: ''
      });
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setCargando(false);
    }
  };

  const guardarConfiguracion = async () => {
    try {
      setCargando(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // En una app real, guardarías en tu base de datos
      console.log('Guardando configuración:', configuracion);
      
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleTipoImpuestoChange = (tipo: string) => {
    setConfiguracion(prev => ({
      ...prev,
      tipoImpuesto: tipo,
      porcentajeImpuesto: tipo === 'empresa' ? 19 : 14.5
    }));
  };

  const styles = {
    container: {
      padding: '20px',
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
      fontSize: '1.5rem',
      fontWeight: 'bold'
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      marginRight: '0.5rem'
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem'
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
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      boxSizing: 'border-box' as const
    },
    select: {
      width: '100%',
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      backgroundColor: 'white'
    },
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    buttonSecondary: {
      backgroundColor: '#6b7280',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
      marginRight: '0.5rem'
    },
    buttonSuccess: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'not-allowed',
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    selectorImpuestos: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '1rem'
    },
    botonImpuesto: {
      flex: 1,
      padding: '1rem',
      border: '2px solid #d1d5db',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      backgroundColor: 'white',
      textAlign: 'center' as const,
      transition: 'all 0.2s'
    },
    botonImpuestoActivo: {
      borderColor: '#2563eb',
      backgroundColor: '#f0f9ff'
    },
    infoBox: {
      backgroundColor: '#f0f9ff',
      padding: '1rem',
      borderRadius: '0.5rem',
      border: '1px solid #bae6fd',
      marginBottom: '1.5rem'
    },
    successMessage: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      border: '1px solid #a7f3d0'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button style={styles.backButton} onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>⚙️ Configuración del Laboratorio</h1>
        </div>
      </div>

      {guardado && (
        <div style={styles.successMessage}>
          ✅ Configuración guardada exitosamente
        </div>
      )}

      <div style={styles.formContainer}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>
          Información del Laboratorio
        </h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>Nombre del Laboratorio</label>
          <input
            type="text"
            style={styles.input}
            value={configuracion.nombreLaboratorio}
            onChange={(e) => setConfiguracion(prev => ({ ...prev, nombreLaboratorio: e.target.value }))}
            placeholder="Ej: Laboratorio Dental Perfect Smile"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contacto</label>
            <input
              type="text"
              style={styles.input}
              value={configuracion.contacto}
              onChange={(e) => setConfiguracion(prev => ({ ...prev, contacto: e.target.value }))}
              placeholder="Ej: +56 9 1234 5678"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={configuracion.email}
              onChange={(e) => setConfiguracion(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Ej: contacto@laboratorio.cl"
            />
          </div>
        </div>

        <div style={styles.infoBox}>
          <h4 style={{ marginTop: 0, color: '#0369a1' }}>📊 Configuración de Impuestos</h4>
          <p style={{ margin: '0.5rem 0', color: '#64748b' }}>
            Selecciona el régimen tributario de tu laboratorio. Esto afectará cómo se calculan los montos netos en tus reportes.
          </p>
        </div>

        <div style={styles.selectorImpuestos}>
          <div 
            style={{
              ...styles.botonImpuesto,
              ...(configuracion.tipoImpuesto === 'empresa' ? styles.botonImpuestoActivo : {})
            }}
            onClick={() => handleTipoImpuestoChange('empresa')}
          >
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>🏢 Empresa</div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>19% IVA</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Ideal para laboratorios constituidos como empresa
            </div>
          </div>

          <div 
            style={{
              ...styles.botonImpuesto,
              ...(configuracion.tipoImpuesto === 'honorarios' ? styles.botonImpuestoActivo : {})
            }}
            onClick={() => handleTipoImpuestoChange('honorarios')}
          >
            <div style={{ fontWeight: 'bold', color: '#1e293b' }}>👨‍💼 Boleta Honorarios</div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>14.5% Retención</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Para profesionales independientes
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Porcentaje de Impuesto/Retención</label>
          <input
            type="number"
            style={styles.input}
            value={configuracion.porcentajeImpuesto}
            onChange={(e) => setConfiguracion(prev => ({ ...prev, porcentajeImpuesto: parseFloat(e.target.value) }))}
            min="0"
            max="100"
            step="0.1"
          />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Actual: {configuracion.porcentajeImpuesto}% - {
              configuracion.tipoImpuesto === 'empresa' 
                ? 'IVA aplicable a empresas' 
                : 'Porcentaje de retención para honorarios'
            }
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Logo del Laboratorio (URL)</label>
          <input
            type="url"
            style={styles.input}
            value={configuracion.logo}
            onChange={(e) => setConfiguracion(prev => ({ ...prev, logo: e.target.value }))}
            placeholder="https://ejemplo.com/logo.png"
          />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Opcional: URL de la imagen de tu logo para los reportes
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <button style={styles.buttonSecondary} onClick={onBack}>
            ← Cancelar
          </button>
          <button 
            style={cargando ? styles.buttonDisabled : styles.buttonSuccess}
            onClick={guardarConfiguracion}
            disabled={cargando}
          >
            {cargando ? '🔄 Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionLaboratorio;