import React, { useState } from 'react';
import { Clinica, Dentista, clinicas, dentistas } from '../data/database';

interface ClinicasProps {
  onBack: () => void;
}

const Clinicas: React.FC<ClinicasProps> = ({ onBack }) => {
  const [showForm, setShowForm] = useState(false);
  const [currentClinica, setCurrentClinica] = useState<Clinica | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    email: ''
  });

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
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer'
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
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #2563eb'
    },
    cardTitle: {
      color: '#1e293b',
      fontSize: '1.125rem',
      fontWeight: '600',
      margin: '0 0 1rem 0'
    },
    dentistaItem: {
      padding: '0.5rem',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '0.5rem'
    },
    form: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      marginBottom: '2rem'
    },
    formGroup: {
      marginBottom: '1rem'
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
    buttonGroup: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem'
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí guardaríamos la clínica
    console.log('Guardar clínica:', formData);
    alert('Clínica guardada exitosamente');
    setShowForm(false);
    setFormData({ nombre: '', direccion: '', telefono: '', email: '' });
  };

  const handleAddDentista = (clinicaId: string) => {
    alert(`Agregar dentista a clínica: ${clinicaId}`);
    // Aquí implementaríamos el formulario para agregar dentista
  };

  const handleEditClinica = (clinica: Clinica) => {
    setCurrentClinica(clinica);
    setFormData({
      nombre: clinica.nombre,
      direccion: clinica.direccion,
      telefono: clinica.telefono,
      email: clinica.email
    });
    setShowForm(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button 
            style={styles.backButton}
            onClick={onBack}
          >
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>🏥 Clínicas y Dentistas</h1>
        </div>
        <button 
          style={styles.button}
          onClick={() => {
            setCurrentClinica(null);
            setFormData({ nombre: '', direccion: '', telefono: '', email: '' });
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancelar' : '+ Agregar Clínica'}
        </button>
      </div>

      {showForm && (
        <form style={styles.form} onSubmit={handleSubmit}>
          <h3 style={{margin: '0 0 1rem 0', color: '#1e293b'}}>
            {currentClinica ? 'Editar Clínica' : 'Nueva Clínica'}
          </h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre de la Clínica</label>
            <input
              type="text"
              style={styles.input}
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej: Clínica Dental Smile"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Dirección</label>
            <input
              type="text"
              style={styles.input}
              value={formData.direccion}
              onChange={(e) => setFormData({...formData, direccion: e.target.value})}
              placeholder="Ej: Av. Principal 123"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Teléfono</label>
            <input
              type="tel"
              style={styles.input}
              value={formData.telefono}
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              placeholder="Ej: 555-0101"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Ej: info@clinica.com"
              required
            />
          </div>

          <button type="submit" style={styles.button}>
            {currentClinica ? 'Actualizar' : 'Guardar'} Clínica
          </button>
        </form>
      )}

      <div style={styles.grid}>
        {clinicas.map(clinica => {
          const dentistasClinica = dentistas.filter(d => d.clinicaId === clinica.id);
          
          return (
            <div key={clinica.id} style={styles.card}>
              <h3 style={styles.cardTitle}>{clinica.nombre}</h3>
              <p><strong>📍 Dirección:</strong> {clinica.direccion}</p>
              <p><strong>📞 Teléfono:</strong> {clinica.telefono}</p>
              <p><strong>✉️ Email:</strong> {clinica.email}</p>
              
              <h4 style={{margin: '1rem 0 0.5rem 0', color: '#475569'}}>Dentistas:</h4>
              {dentistasClinica.length > 0 ? (
                dentistasClinica.map(dentista => (
                  <div key={dentista.id} style={styles.dentistaItem}>
                    <strong>{dentista.nombre}</strong>
                    <br />
                    <small>Especialidad: {dentista.especialidad}</small>
                    <br />
                    <small>Tel: {dentista.telefono}</small>
                  </div>
                ))
              ) : (
                <p style={{color: '#94a3b8', fontStyle: 'italic'}}>No hay dentistas registrados</p>
              )}
              
              <div style={styles.buttonGroup}>
                <button 
                  style={{
                    ...styles.button,
                    backgroundColor: '#06b6d4'
                  }}
                  onClick={() => handleAddDentista(clinica.id)}
                >
                  Agregar Dentista
                </button>
                
                <button 
                  style={{
                    ...styles.button,
                    backgroundColor: '#10b981'
                  }}
                  onClick={() => handleEditClinica(clinica)}
                >
                  Editar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {clinicas.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#64748b'
        }}>
          <h3>No hay clínicas registradas</h3>
          <p>Comienza agregando tu primera clínica usando el botón "Agregar Clínica"</p>
        </div>
      )}
    </div>
  );
};

export default Clinicas;