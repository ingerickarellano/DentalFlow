import React, { useState } from 'react';
import { Laboratorista, laboratoristas, agregarLaboratorista, actualizarLaboratorista, eliminarLaboratorista, toggleActivoLaboratorista } from '../data/database';

interface LaboratoristasProps {
  onBack: () => void;
}

const Laboratoristas: React.FC<LaboratoristasProps> = ({ onBack }) => {
  const [showForm, setShowForm] = useState(false);
  const [currentLaboratorista, setCurrentLaboratorista] = useState<Laboratorista | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    especialidad: '',
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
      backgroundColor: '#f97316',
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
      borderLeft: '4px solid #f97316',
      position: 'relative' as const
    },
    cardTitle: {
      color: '#1e293b',
      fontSize: '1.125rem',
      fontWeight: '600',
      margin: '0 0 1rem 0'
    },
    statusBadge: {
      position: 'absolute' as const,
      top: '1rem',
      right: '1rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    activeBadge: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    inactiveBadge: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
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
    },
    deleteButton: {
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer'
    },
    toggleButton: {
      backgroundColor: '#06b6d4',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer'
    }
  };

  const especialidades = [
    'Prótesis Fija',
    'Prótesis Removible',
    'Implantes',
    'Ortodoncia',
    'Cerámica Dental',
    'Modelación',
    'Acrílicos',
    'CoCr',
    'Zirconio',
    'General'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentLaboratorista) {
      // Editar laboratorista existente
      actualizarLaboratorista(currentLaboratorista.id, formData);
      alert('Laboratorista actualizado exitosamente');
    } else {
      // Crear nuevo laboratorista
      agregarLaboratorista({
        ...formData,
        activo: true
      });
      alert('Laboratorista agregado exitosamente');
    }
    
    setShowForm(false);
    setFormData({ nombre: '', especialidad: '', telefono: '', email: '' });
    setCurrentLaboratorista(null);
  };

  const handleEdit = (laboratorista: Laboratorista) => {
    setCurrentLaboratorista(laboratorista);
    setFormData({
      nombre: laboratorista.nombre,
      especialidad: laboratorista.especialidad,
      telefono: laboratorista.telefono,
      email: laboratorista.email
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este laboratorista?')) {
      eliminarLaboratorista(id);
      alert('Laboratorista eliminado exitosamente');
    }
  };

  const handleToggleActivo = (id: string) => {
    toggleActivoLaboratorista(id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <button style={styles.backButton} onClick={onBack}>
            ← Volver al Dashboard
          </button>
          <h1 style={styles.title}>👨‍🔧 Gestión de Laboratoristas</h1>
        </div>
        <button 
          style={styles.button}
          onClick={() => {
            setCurrentLaboratorista(null);
            setFormData({ nombre: '', especialidad: '', telefono: '', email: '' });
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancelar' : '+ Agregar Laboratorista'}
        </button>
      </div>

      {showForm && (
        <form style={styles.form} onSubmit={handleSubmit}>
          <h3 style={{margin: '0 0 1rem 0', color: '#1e293b'}}>
            {currentLaboratorista ? 'Editar Laboratorista' : 'Nuevo Laboratorista'}
          </h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre Completo *</label>
            <input
              type="text"
              style={styles.input}
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              placeholder="Ej: Carlos Rodríguez"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Especialidad *</label>
            <select 
              style={styles.input}
              value={formData.especialidad}
              onChange={(e) => setFormData({...formData, especialidad: e.target.value})}
              required
            >
              <option value="">Selecciona una especialidad</option>
              {especialidades.map(especialidad => (
                <option key={especialidad} value={especialidad}>
                  {especialidad}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Teléfono</label>
            <input
              type="tel"
              style={styles.input}
              value={formData.telefono}
              onChange={(e) => setFormData({...formData, telefono: e.target.value})}
              placeholder="Ej: 555-0101"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Ej: tecnico@laboratorio.com"
            />
          </div>

          <button type="submit" style={styles.button}>
            {currentLaboratorista ? 'Actualizar' : 'Guardar'} Laboratorista
          </button>
        </form>
      )}

      <div style={styles.grid}>
        {laboratoristas.map(laboratorista => (
          <div key={laboratorista.id} style={styles.card}>
            <div style={{
              ...styles.statusBadge,
              ...(laboratorista.activo ? styles.activeBadge : styles.inactiveBadge)
            }}>
              {laboratorista.activo ? '🟢 Activo' : '🟡 Inactivo'}
            </div>
            
            <h3 style={styles.cardTitle}>{laboratorista.nombre}</h3>
            <p><strong>🎯 Especialidad:</strong> {laboratorista.especialidad}</p>
            <p><strong>📞 Teléfono:</strong> {laboratorista.telefono}</p>
            <p><strong>✉️ Email:</strong> {laboratorista.email}</p>
            
            <div style={styles.buttonGroup}>
              <button 
                style={styles.toggleButton}
                onClick={() => handleToggleActivo(laboratorista.id)}
              >
                {laboratorista.activo ? 'Desactivar' : 'Activar'}
              </button>
              
              <button 
                style={styles.button}
                onClick={() => handleEdit(laboratorista)}
              >
                Editar
              </button>
              
              <button 
                style={styles.deleteButton}
                onClick={() => handleDelete(laboratorista.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {laboratoristas.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#64748b'
        }}>
          <h3>No hay laboratoristas registrados</h3>
          <p>Comienza agregando tu primer laboratorista usando el botón "Agregar Laboratorista"</p>
        </div>
      )}
    </div>
  );
};

export default Laboratoristas;