import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const DashboardLaboratorista: React.FC<{ user: any; onLogout: () => Promise<void> }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [trabajos, setTrabajos] = useState<any[]>([]);

  const cargarTrabajos = useCallback(async () => {
    try {
      // Cargar trabajos asignados a este laboratorista
      const { data, error } = await supabase
        .from('trabajos')
        .select('*')
        .eq('laboratorista_id', user?.id)
        .order('fecha_creacion', { ascending: false })
        .limit(10);
      
      if (!error && data) {
        setTrabajos(data);
      }
    } catch (error) {
      console.error('Error cargando trabajos:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    cargarTrabajos();
  }, [cargarTrabajos]);

  const cambiarEstadoTrabajo = async (trabajoId: string, nuevoEstado: string) => {
    try {
      await supabase
        .from('trabajos')
        .update({ estado: nuevoEstado })
        .eq('id', trabajoId);
      
      // Actualizar estado local
      setTrabajos(prev => prev.map(t => 
        t.id === trabajoId ? { ...t, estado: nuevoEstado } : t
      ));
      
      alert('Estado actualizado');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>🦷</div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>DentalFlow Laboratorista</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Panel de control</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Hola, {user?.nombre || 'Laboratorista'}</span>
          <button 
            onClick={onLogout}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '2rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          gap: '2rem'
        }}>
          {/* Sidebar */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0 }}>Menú</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  onClick={() => navigate('/dashboard-laboratorista')}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🏠 Dashboard
                </button>
                <button 
                  onClick={() => navigate('/trabajos')}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🔧 Mis Trabajos
                </button>
                <button 
                  onClick={() => navigate('/insumos')}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  📦 Insumos
                </button>
                <button 
                  onClick={() => navigate('/proveedores')}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  🤝 Proveedores
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div>
            <h1 style={{ color: '#1e293b', marginTop: 0 }}>Mis Trabajos Asignados</h1>
            
            {trabajos.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: '3rem',
                borderRadius: '0.75rem',
                textAlign: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p>No tienes trabajos asignados</p>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {trabajos.map((trabajo) => (
                  <div key={trabajo.id} style={{
                    borderBottom: '1px solid #e2e8f0',
                    padding: '1rem 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>{trabajo.paciente}</h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>
                        📅 Entrega: {new Date(trabajo.fecha_entrega_estimada).toLocaleDateString()}
                      </p>
                      <p style={{ margin: 0, color: '#64748b' }}>💰 ${trabajo.precio_total}</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{
                        backgroundColor: 
                          trabajo.estado === 'pendiente' ? '#fef3c7' :
                          trabajo.estado === 'produccion' ? '#dbeafe' :
                          '#d1fae5',
                        color: 
                          trabajo.estado === 'pendiente' ? '#92400e' :
                          trabajo.estado === 'produccion' ? '#1e40af' :
                          '#065f46',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.875rem'
                      }}>
                        {trabajo.estado === 'pendiente' ? '⏳ Pendiente' :
                         trabajo.estado === 'produccion' ? '🔧 En Producción' :
                         '✅ Terminado'}
                      </span>
                      
                      <select
                        value={trabajo.estado}
                        onChange={(e) => cambiarEstadoTrabajo(trabajo.id, e.target.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="produccion">🔧 En Producción</option>
                        <option value="terminado">✅ Terminado</option>
                        <option value="entregado">📦 Entregado</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones rápidas */}
            <div style={{ marginTop: '2rem' }}>
              <h2>Acciones Rápidas</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <button 
                  onClick={() => navigate('/insumos')}
                  style={{
                    backgroundColor: 'white',
                    border: '2px solid #3b82f6',
                    color: '#3b82f6',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  📦 Ver Insumos
                </button>
                <button 
                  onClick={() => navigate('/proveedores')}
                  style={{
                    backgroundColor: 'white',
                    border: '2px solid #10b981',
                    color: '#10b981',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  🤝 Ver Proveedores
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLaboratorista;