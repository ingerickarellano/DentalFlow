import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface RecuperacionCuentaProps {
  onBack: () => void;
}

const RecuperacionCuenta: React.FC<RecuperacionCuentaProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setCargando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/actualizar-contrasena`, // Página a la que redirigirá el enlace
      });

      if (error) throw error;

      setMensaje('Se ha enviado un correo con instrucciones para restablecer tu contraseña.');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button onClick={onBack} style={styles.backButton}>← Volver</button>
        <h2 style={styles.title}>Recuperar contraseña</h2>
        <p style={styles.subtitle}>Ingresa tu email y te enviaremos un enlace para restablecerla.</p>

        {mensaje && <div style={styles.success}>{mensaje}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={cargando}
            />
          </div>
          <button type="submit" style={styles.button} disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviar instrucciones'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
  },
  backButton: {
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  title: {
    color: '#1e293b',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#64748b',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
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
  },
  success: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
  },
};

export default RecuperacionCuenta;