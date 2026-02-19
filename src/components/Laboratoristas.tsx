import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LaboratoristasProps {
  onBack: () => void;
  user: any; // usuario administrador autenticado
}

interface Laboratorista {
  id: string;
  nombre: string;
  especialidad: string;
  telefono: string;
  email: string;
  activo: boolean;
  usuario_id: string; // administrador que lo creó
  created_at: string;
}

const Laboratoristas: React.FC<LaboratoristasProps> = ({ onBack, user }) => {
  const [laboratoristas, setLaboratoristas] = useState<Laboratorista[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [currentLaboratorista, setCurrentLaboratorista] = useState<Laboratorista | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    especialidad: '',
    telefono: '',
    email: '',
    password: '' // solo para creación
  });
  const [cargando, setCargando] = useState(false);

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

  useEffect(() => {
    cargarLaboratoristas();
  }, []);

  const cargarLaboratoristas = async () => {
    try {
      const { data, error } = await supabase
        .from('laboratoristas')
        .select('*')
        .eq('usuario_id', user.id)
        .order('nombre');

      if (error) throw error;
      setLaboratoristas(data || []);
    } catch (error) {
      console.error('Error cargando laboratoristas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (currentLaboratorista) {
        // Editar laboratorista existente (solo perfil)
        const { error } = await supabase
          .from('laboratoristas')
          .update({
            nombre: formData.nombre,
            especialidad: formData.especialidad,
            telefono: formData.telefono,
            email: formData.email
          })
          .eq('id', currentLaboratorista.id);

        if (error) throw error;
        alert('Laboratorista actualizado exitosamente');
      } else {
        // Crear nuevo laboratorista: primero registrar usuario en auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              nombre: formData.nombre,
              rol: 'laboratorista'
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        // Luego insertar en laboratoristas con el mismo ID
        const { error } = await supabase
          .from('laboratoristas')
          .insert([{
            id: authData.user.id,
            nombre: formData.nombre,
            especialidad: formData.especialidad,
            telefono: formData.telefono,
            email: formData.email,
            activo: true,
            usuario_id: user.id
          }]);

        if (error) {
          // Si falla la inserción en laboratoristas, deberíamos eliminar el usuario creado
          // Esto requiere permisos de admin, así que lo omitimos por ahora
          console.error('Error al insertar en laboratoristas:', error);
          throw error;
        }

        alert('Laboratorista creado exitosamente');
      }

      setShowForm(false);
      setFormData({ nombre: '', especialidad: '', telefono: '', email: '', password: '' });
      setCurrentLaboratorista(null);
      cargarLaboratoristas();

    } catch (error: any) {
      console.error('Error guardando laboratorista:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (laboratorista: Laboratorista) => {
    setCurrentLaboratorista(laboratorista);
    setFormData({
      nombre: laboratorista.nombre,
      especialidad: laboratorista.especialidad,
      telefono: laboratorista.telefono,
      email: laboratorista.email,
      password: '' // no se edita
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este laboratorista? También se eliminará su acceso al sistema.')) return;

    try {
      // En lugar de eliminar, lo desactivamos (más seguro)
      const { error } = await supabase
        .from('laboratoristas')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      alert('Laboratorista desactivado. Para eliminarlo completamente, contacta al administrador.');
      cargarLaboratoristas();

    } catch (error: any) {
      console.error('Error eliminando laboratorista:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleActivo = async (id: string, activoActual: boolean) => {
    try {
      const { error } = await supabase
        .from('laboratoristas')
        .update({ activo: !activoActual })
        .eq('id', id);

      if (error) throw error;
      cargarLaboratoristas();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar estado');
    }
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
            setFormData({ nombre: '', especialidad: '', telefono: '', email: '', password: '' });
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancelar' : '+ Agregar Laboratorista'}
        </button>
      </div>

      {showForm && (
        <form style={styles.form} onSubmit={handleSubmit}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
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
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Ej: tecnico@laboratorio.com"
              required
              disabled={!!currentLaboratorista} // No se puede editar email
            />
          </div>

          {!currentLaboratorista && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Contraseña *</label>
              <input
                type="password"
                style={styles.input}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>
          )}

          <button 
            type="submit" 
            style={styles.button}
            disabled={cargando}
          >
            {cargando ? 'Guardando...' : (currentLaboratorista ? 'Actualizar' : 'Guardar')} Laboratorista
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
                onClick={() => handleToggleActivo(laboratorista.id, laboratorista.activo)}
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