import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const GestionLaboratoristas: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const [laboratoristas, setLaboratoristas] = useState<any[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: 'Prótesis Fija',
    password: '',
    confirmPassword: ''
  });

  const especialidades = [
    'Prótesis Fija',
    'Prótesis Removible', 
    'Ortodoncia',
    'Implantes',
    'Cerámica Dental',
    'Laboratorio Digital'
  ];

  // Cargar laboratoristas
  useEffect(() => {
    cargarLaboratoristas();
  }, []);

  const cargarLaboratoristas = async () => {
    try {
      setCargando(true);
      setError(null);
      
      console.log('Cargando laboratoristas...');
      
      // Primero obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No hay usuario autenticado');
      }

      console.log('Usuario autenticado:', user.email);
      
      // Obtener el laboratorio del usuario actual
      const { data: laboratorio, error: labError } = await supabase
        .from('laboratorios')
        .select('id, nombre')
        .eq('usuario_admin_id', user.id)
        .single();

      if (labError) {
        console.warn('No hay laboratorio registrado:', labError.message);
        // Si no hay laboratorio, mostrar todos los laboratoristas (modo administrador)
        const { data, error } = await supabase
          .from('laboratoristas')
          .select('*')
          .order('nombre');
        
        if (error) throw error;
        setLaboratoristas(data || []);
        return;
      }

      console.log('Laboratorio encontrado:', laboratorio.nombre);
      
      // Cargar laboratoristas de este laboratorio
      const { data, error } = await supabase
        .from('laboratoristas')
        .select('*')
        .eq('laboratorio_id', laboratorio.id)
        .order('nombre');

      if (error) throw error;
      
      setLaboratoristas(data || []);
      console.log('Laboratoristas cargados:', data?.length || 0);

    } catch (error: any) {
      console.error('Error cargando laboratoristas:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  // Crear nuevo laboratorista
  const crearLaboratorista = async () => {
    // Validaciones básicas
    if (!formData.nombre || !formData.email || !formData.password) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setCargando(true);
      setError(null);

      // 1. Obtener el usuario administrador actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No hay usuario administrador autenticado');
      }

      console.log('👤 Admin encontrado:', user.email);

      // 2. Obtener o crear el laboratorio del administrador
      let laboratorioId;
      
      // Primero intentar obtener laboratorio existente
      const { data: laboratorioExistente, error: labError } = await supabase
        .from('laboratorios')
        .select('id')
        .eq('usuario_admin_id', user.id)
        .single();

      if (labError) {
        console.log('⚠️ No hay laboratorio, creando uno...');
        // Crear laboratorio automáticamente
        const { data: nuevoLab, error: nuevoLabError } = await supabase
          .from('laboratorios')
          .insert([{
            nombre: `Laboratorio de ${user.email?.split('@')[0] || 'Admin'}`,
            usuario_admin_id: user.id,
            email: user.email,
            telefono: '',
            direccion: ''
          }])
          .select()
          .single();

        if (nuevoLabError) {
          console.error('❌ Error creando laboratorio:', nuevoLabError);
          throw new Error(`No se pudo crear el laboratorio: ${nuevoLabError.message}`);
        }
        
        laboratorioId = nuevoLab.id;
        console.log('✅ Laboratorio creado:', nuevoLab.id);
      } else {
        laboratorioId = laboratorioExistente.id;
        console.log('✅ Laboratorio encontrado:', laboratorioId);
      }

      // 3. Crear usuario en Auth
      console.log('📝 Creando usuario en Auth...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            rol: 'laboratorista',
            telefono: formData.telefono,
            especialidad: formData.especialidad
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (authError) {
        console.error('❌ Error creando usuario Auth:', authError);
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado. Usa otro email.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en el sistema');
      }

      console.log('✅ Usuario Auth creado:', authData.user.id);

      // Esperar 1 segundo para asegurar que el usuario se creó
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Crear registro en tabla laboratoristas
      const laboratoristaData = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        especialidad: formData.especialidad,
        usuario_id: authData.user.id,  // ID de auth.users
        laboratorio_id: laboratorioId, // ID del laboratorio del admin
        activo: true,
        suscripcion: 'basica',
        publicidad_activa: false,
        created_at: new Date().toISOString()
      };

      console.log('📝 Insertando laboratorista:', laboratoristaData);
      
      const { data, error: insertError } = await supabase
        .from('laboratoristas')
        .insert([laboratoristaData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error insertando laboratorista:', insertError);
        
        // Mensaje específico para diferentes errores
        if (insertError.message.includes('foreign key constraint')) {
          throw new Error(`
            ERROR DE CLAVE FORÁNEA: La tabla 'laboratoristas' no está correctamente configurada.
            
            Ejecuta en Supabase SQL Editor:
            
            ALTER TABLE laboratoristas 
            DROP CONSTRAINT IF EXISTS laboratoristas_usuario_id_fkey;
            
            ALTER TABLE laboratoristas
            ADD CONSTRAINT laboratoristas_usuario_id_fkey 
            FOREIGN KEY (usuario_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
            
            Y asegúrate de que la tabla 'laboratorios' exista.
          `);
        }
        
        if (insertError.message.includes('laboratorio_id')) {
          throw new Error(`
            ERROR: No se encontró un laboratorio para este administrador.
            
            Primero asegúrate de ejecutar en Supabase:
            
            CREATE TABLE IF NOT EXISTS laboratorios (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              nombre TEXT NOT NULL,
              usuario_admin_id UUID REFERENCES auth.users(id),
              UNIQUE(usuario_admin_id)
            );
            
            ALTER TABLE laboratoristas 
            ADD COLUMN IF NOT EXISTS laboratorio_id UUID REFERENCES laboratorios(id);
          `);
        }
        
        throw insertError;
      }

      console.log('✅ Laboratorista creado exitosamente:', data);
      
      alert('✅ Laboratorista creado exitosamente. El usuario recibirá un email con sus credenciales.');
      
      // Cerrar modal y resetear
      setModalAbierto(false);
      resetForm();
      
      // Recargar lista
      await cargarLaboratoristas();

    } catch (error: any) {
      console.error('❌ Error completo al crear laboratorista:', error);
      setError(error.message);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };
  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      especialidad: 'Prótesis Fija',
      password: '',
      confirmPassword: ''
    });
  };

  const cambiarEstado = async (id: string, activoActual: boolean) => {
    const confirmacion = window.confirm(
      `¿${activoActual ? 'Desactivar' : 'Activar'} este laboratorista?`
    );
    
    if (!confirmacion) return;

    try {
      const { error } = await supabase
        .from('laboratoristas')
        .update({ activo: !activoActual })
        .eq('id', id);

      if (error) throw error;
      
      // Actualizar estado local
      setLaboratoristas(prev => 
        prev.map(lab => 
          lab.id === id ? { ...lab, activo: !activoActual } : lab
        )
      );
      
      alert(`Laboratorista ${!activoActual ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Estilos mejorados
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '2rem'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap' as const,
      gap: '1rem'
    },
    title: {
      color: '#1e293b',
      fontSize: '1.75rem',
      fontWeight: 'bold',
      margin: 0
    },
    button: {
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'background-color 0.2s'
    },
    table: {
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    tableHeader: {
      backgroundColor: '#f1f5f9',
      padding: '1rem',
      textAlign: 'left' as const,
      fontWeight: '600',
      color: '#475569',
      borderBottom: '1px solid #e2e8f0'
    },
    tableCell: {
      padding: '1rem',
      borderBottom: '1px solid #e2e8f0'
    },
    badge: (activo: boolean) => ({
      backgroundColor: activo ? '#10b98120' : '#ef444420',
      color: activo ? '#10b981' : '#ef4444',
      padding: '0.375rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      border: `1px solid ${activo ? '#10b981' : '#ef4444'}`,
      transition: 'all 0.2s'
    }),
    loadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '3rem'
    },
    errorContainer: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      border: '1px solid #fca5a5'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button 
            style={{
              backgroundColor: '#64748b',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
            onClick={() => onBack ? onBack() : navigate('/dashboard')}
          >
            ← Volver
          </button>
          <h1 style={styles.title}>👨‍🔧 Gestión de Laboratoristas</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
            {laboratoristas.length} laboratoristas registrados
          </p>
        </div>
        
        <button 
          style={styles.button}
          onClick={() => setModalAbierto(true)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          + Nuevo Laboratorista
        </button>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div style={styles.errorContainer}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <div style={styles.loadingContainer}>
          <div style={{
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ color: '#64748b' }}>Cargando laboratoristas...</p>
          </div>
        </div>
      ) : (
        <div style={styles.table}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Nombre</th>
                <th style={styles.tableHeader}>Email</th>
                <th style={styles.tableHeader}>Teléfono</th>
                <th style={styles.tableHeader}>Especialidad</th>
                <th style={styles.tableHeader}>Estado</th>
                <th style={styles.tableHeader}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {laboratoristas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ 
                    ...styles.tableCell, 
                    textAlign: 'center',
                    color: '#64748b',
                    padding: '3rem'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍🔧</div>
                    <p style={{ marginBottom: '1rem' }}>
                      No hay laboratoristas registrados
                    </p>
                    <button 
                      style={styles.button}
                      onClick={() => setModalAbierto(true)}
                    >
                      + Crear Primer Laboratorista
                    </button>
                  </td>
                </tr>
              ) : (
                laboratoristas.map((lab) => (
                  <tr 
                    key={lab.id}
                    style={{ 
                      transition: 'background-color 0.2s',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={styles.tableCell}>
                      <strong>{lab.nombre}</strong>
                      {lab.suscripcion && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Plan: {lab.suscripcion}
                        </div>
                      )}
                    </td>
                    <td style={styles.tableCell}>{lab.email}</td>
                    <td style={styles.tableCell}>{lab.telefono || 'No especificado'}</td>
                    <td style={styles.tableCell}>{lab.especialidad || 'General'}</td>
                    <td style={styles.tableCell}>
                      <button
                        style={styles.badge(lab.activo)}
                        onClick={() => cambiarEstado(lab.id, lab.activo)}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        {lab.activo ? '✅ Activo' : '❌ Inactivo'}
                      </button>
                    </td>
                    <td style={styles.tableCell}>
                      <button
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          padding: '0.375rem 0.75rem',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          marginRight: '0.5rem'
                        }}
                        onClick={() => {
                          const mensaje = `Hola ${lab.nombre},\n\nTus credenciales para acceder a DentalFlow son:\n\nEmail: ${lab.email}\nContraseña: [la que estableciste]\n\nAccede en: [URL del sistema]\n\nSaludos.`;
                          navigator.clipboard.writeText(mensaje);
                          alert('Mensaje copiado al portapapeles. Envíalo al laboratorista.');
                        }}
                      >
                        📋 Enviar Recordatorio
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear laboratorista */}
      {modalAbierto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>Crear Nuevo Laboratorista</h2>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
                onClick={() => {
                  if (formData.nombre || formData.email || formData.password) {
                    if (window.confirm('¿Cancelar? Se perderán los datos ingresados.')) {
                      setModalAbierto(false);
                      resetForm();
                    }
                  } else {
                    setModalAbierto(false);
                  }
                }}
              >
                ×
              </button>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              El laboratorista recibirá un email con sus credenciales para iniciar sesión.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Nombre completo *
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                placeholder="Ej: Carlos Rodríguez"
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Email *
              </label>
              <input
                type="email"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="laboratorista@email.com"
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Teléfono
              </label>
              <input
                type="tel"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Especialidad
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  backgroundColor: 'white'
                }}
                value={formData.especialidad}
                onChange={(e) => setFormData({...formData, especialidad: e.target.value})}
              >
                {especialidades.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Contraseña *
              </label>
              <input
                type="password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Confirmar contraseña *
              </label>
              <input
                type="password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Repite la contraseña"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                style={{
                  backgroundColor: '#64748b',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                onClick={() => {
                  setModalAbierto(false);
                  resetForm();
                }}
                disabled={cargando}
              >
                Cancelar
              </button>
              <button 
                style={{
                  backgroundColor: cargando ? '#94a3b8' : '#10b981',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={crearLaboratorista}
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Creando...
                  </>
                ) : 'Crear Laboratorista'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GestionLaboratoristas;