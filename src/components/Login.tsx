import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'admin' | 'laboratorista' | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setCargando(true);

    try {
      console.log('🔐 Intentando login con:', email);

      // 1. Limpiar sesión previa
      await supabase.auth.signOut();

      // 2. Login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (loginError) {
        throw loginError;
      }

      console.log('✅ Login exitoso:', data.user?.email);

      // 3. Esperar y verificar sesión
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('La sesión no se estableció');
      }

      const userId = data.user.id;

      // 4. Verificar que el usuario tenga perfil. El plan vencido ya NO bloquea
      //    el ingreso: el laboratorio entra en modo solo lectura (lo controla la base).
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles_usuarios')
        .select('id, rol')
        .eq('id', userId)
        .maybeSingle();

      if (perfilError || !perfil) {
        await supabase.auth.signOut();
        throw new Error('No se encontró el perfil de usuario. Contacta al administrador.');
      }

      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error('❌ Error en login:', error);
      setError(error.message || 'Error desconocido');
      setPassword('');
    } finally {
      setCargando(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      padding: '2rem',
      width: '100%',
      maxWidth: '400px'
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '2rem'
    },
    logo: {
      width: '80px',
      height: '80px',
      marginBottom: '1rem',
      objectFit: 'contain' as const
    },
    title: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      color: '#1e293b',
      margin: '0 0 0.5rem 0'
    },
    subtitle: {
      color: '#64748b',
      margin: 0
    },
    tipoSelector: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem',
      justifyContent: 'center'
    },
    tipoButton: {
      padding: '0.5rem 1rem',
      border: '2px solid #e2e8f0',
      borderRadius: '2rem',
      backgroundColor: 'white',
      color: '#475569',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    tipoButtonActive: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      color: 'white'
    },
    error: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '0.75rem',
      borderRadius: '0.375rem',
      marginBottom: '1rem',
      fontSize: '0.875rem',
      textAlign: 'center' as const
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      color: '#374151',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.625rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      boxSizing: 'border-box' as const
    },
    button: {
      width: '100%',
      backgroundColor: '#3b82f6',
      color: 'white',
      padding: '0.75rem',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginTop: '0.5rem'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    links: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '1.5rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid #e5e7eb'
    },
    link: {
      color: '#3b82f6',
      textDecoration: 'none',
      fontSize: '0.875rem',
      cursor: 'pointer',
      fontWeight: '500'
    },
    infoMensaje: {
      textAlign: 'center' as const,
      marginBottom: '1rem',
      fontSize: '0.875rem',
      color: '#64748b',
      fontStyle: 'italic'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img
            src="/icono Dentalflow-Manager.png"
            alt="DentalFlow Logo"
            style={styles.logo}
          />
          <h2 style={styles.title}>DentalFlow</h2>
          <p style={styles.subtitle}>Inicia sesión en tu cuenta</p>
        </div>

        {/* Selector de tipo de usuario */}
        <div style={styles.tipoSelector}>
          <button
            style={{
              ...styles.tipoButton,
              ...(tipoSeleccionado === 'admin' ? styles.tipoButtonActive : {})
            }}
            onClick={() => setTipoSeleccionado('admin')}
          >
            👤 Administrador
          </button>
          <button
            style={{
              ...styles.tipoButton,
              ...(tipoSeleccionado === 'laboratorista' ? styles.tipoButtonActive : {})
            }}
            onClick={() => setTipoSeleccionado('laboratorista')}
          >
            🔧 Laboratorista
          </button>
        </div>

        {tipoSeleccionado && (
          <div style={styles.infoMensaje}>
            {tipoSeleccionado === 'admin'
              ? 'Ingresa con tu cuenta de administrador del laboratorio'
              : 'Ingresa con tu cuenta de laboratorista (creada por el administrador)'}
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="correo@ejemplo.com"
              required
              disabled={cargando}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
              disabled={cargando}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(cargando ? styles.buttonDisabled : {})
            }}
            disabled={cargando}
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={styles.links}>
          <span
            style={styles.link}
            onClick={() => navigate('/recuperacion')}
          >
            ¿Olvidaste tu contraseña?
          </span>

          <span
            style={styles.link}
            onClick={() => navigate('/registro')}
          >
            Crear cuenta nueva
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;