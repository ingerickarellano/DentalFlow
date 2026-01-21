import React, { useState } from 'react';

interface RecuperacionCuentaProps {
  onBack: () => void;
}

const RecuperacionCuenta: React.FC<RecuperacionCuentaProps> = ({ onBack }) => {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    card: {
      backgroundColor: 'white',
      padding: '3rem',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '500px'
    },
    title: {
      color: '#1e293b',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      textAlign: 'center' as const,
      marginBottom: '2rem'
    },
    backButton: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      marginBottom: '2rem'
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
      padding: '0.75rem 1rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      boxSizing: 'border-box' as const
    },
    button: {
      width: '100%',
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '0.75rem 1rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '1rem'
    },
    buttonSecondary: {
      backgroundColor: '#64748b',
      color: 'white',
      padding: '0.75rem 1rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '1rem',
      width: '100%'
    },
    mensaje: {
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      textAlign: 'center' as const
    },
    mensajeSuccess: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '1px solid #a7f3d0'
    },
    mensajeError: {
      backgroundColor: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca'
    },
    infoBox: {
      backgroundColor: '#f0f9ff',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      border: '1px solid #e0f2fe',
      marginBottom: '2rem'
    },
    pasoIndicador: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2rem'
    },
    paso: {
      flex: 1,
      textAlign: 'center' as const,
      padding: '0.5rem',
      color: '#64748b',
      fontSize: '0.875rem'
    },
    pasoActivo: {
      color: '#2563eb',
      fontWeight: '600'
    },
    pasoCompletado: {
      color: '#10b981',
      fontWeight: '600'
    }
  };

  const enviarCodigoRecuperacion = () => {
    // Simular envío de código
    alert(`📧 Código de recuperación enviado a: ${email}`);
    setPaso(2);
  };

  const verificarCodigo = () => {
    // Simular verificación de código
    if (codigo === '123456') { // Código de ejemplo
      setPaso(3);
    } else {
      alert('❌ Código incorrecto. Intenta nuevamente.');
    }
  };

  const cambiarPassword = () => {
    if (nuevaPassword !== confirmarPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }

    if (nuevaPassword.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Simular cambio de contraseña
    alert('✅ Contraseña cambiada exitosamente');
    setPaso(4);
  };

  const renderPaso1 = () => (
    <div>
      <div style={styles.infoBox}>
        <h3 style={{ color: '#0369a1', marginBottom: '0.5rem' }}>🔒 Recuperar Cuenta</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Ingresa el email asociado a tu cuenta. Te enviaremos un código de verificación.
        </p>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Email de la cuenta</label>
        <input
          type="email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
      </div>

      <button style={styles.button} onClick={enviarCodigoRecuperacion}>
        Enviar Código de Verificación
      </button>
    </div>
  );

  const renderPaso2 = () => (
    <div>
      <div style={styles.infoBox}>
        <h3 style={{ color: '#0369a1', marginBottom: '0.5rem' }}>📧 Verifica tu Email</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Hemos enviado un código de 6 dígitos a: <strong>{email}</strong>
        </p>
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          💡 <em>Código de ejemplo: 123456</em>
        </p>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Código de Verificación</label>
        <input
          type="text"
          style={styles.input}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="123456"
          maxLength={6}
          required
        />
      </div>

      <button style={styles.button} onClick={verificarCodigo}>
        Verificar Código
      </button>

      <button 
        style={styles.buttonSecondary}
        onClick={() => setPaso(1)}
      >
        ↶ Volver atrás
      </button>
    </div>
  );

  const renderPaso3 = () => (
    <div>
      <div style={styles.infoBox}>
        <h3 style={{ color: '#0369a1', marginBottom: '0.5rem' }}>🔄 Nueva Contraseña</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Crea una nueva contraseña segura para tu cuenta.
        </p>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Nueva Contraseña</label>
        <input
          type="password"
          style={styles.input}
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Confirmar Contraseña</label>
        <input
          type="password"
          style={styles.input}
          value={confirmarPassword}
          onChange={(e) => setConfirmarPassword(e.target.value)}
          placeholder="Repite la contraseña"
          required
        />
      </div>

      <button style={styles.button} onClick={cambiarPassword}>
        Cambiar Contraseña
      </button>

      <button 
        style={styles.buttonSecondary}
        onClick={() => setPaso(2)}
      >
        ↶ Volver atrás
      </button>
    </div>
  );

  const renderPaso4 = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
      <h3 style={{ color: '#065f46', marginBottom: '1rem' }}>¡Contraseña Restablecida!</h3>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Tu contraseña ha sido cambiada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.
      </p>
      
      <button 
        style={styles.button}
        onClick={onBack}
      >
        🚀 Ir al Login
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <button style={styles.backButton} onClick={onBack}>
          ← Volver al Login
        </button>

        <h1 style={styles.title}>Recuperar Cuenta</h1>

        {/* Indicador de Pasos */}
        <div style={styles.pasoIndicador}>
          <div style={{
            ...styles.paso,
            ...(paso >= 1 ? styles.pasoActivo : {}),
            ...(paso > 1 ? styles.pasoCompletado : {})
          }}>
            1. Email
          </div>
          <div style={{
            ...styles.paso,
            ...(paso >= 2 ? styles.pasoActivo : {}),
            ...(paso > 2 ? styles.pasoCompletado : {})
          }}>
            2. Código
          </div>
          <div style={{
            ...styles.paso,
            ...(paso >= 3 ? styles.pasoActivo : {}),
            ...(paso > 3 ? styles.pasoCompletado : {})
          }}>
            3. Contraseña
          </div>
        </div>

        {paso === 1 && renderPaso1()}
        {paso === 2 && renderPaso2()}
        {paso === 3 && renderPaso3()}
        {paso === 4 && renderPaso4()}
      </div>
    </div>
  );
};

export default RecuperacionCuenta;