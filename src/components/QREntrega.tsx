import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Webcam from 'react-webcam';
import Header from './Header';

interface Trabajo {
  id: string;
  paciente: string;
  clinica_id: string;
  estado: string;
  fecha_creacion: string;
  precio_total: number;
}

interface Clinica {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}

const QREntrega: React.FC = () => {
  const navigate = useNavigate();
  const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [scanning, setScanning] = useState(true);
  const [fotoTomada, setFotoTomada] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [entregadoPor, setEntregadoPor] = useState('');
  const [receptorNombre, setReceptorNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error' | ''>('');

  const webcamRef = useRef<Webcam>(null);
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scanning) {
      iniciarScanner();
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear();
      }
    };
  }, [scanning]);

  const iniciarScanner = () => {
    qrScannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: []
      },
      false
    );

    qrScannerRef.current.render(
      async (decodedText) => {
        // El QR contiene el ID del trabajo
        await cargarTrabajo(decodedText);
      },
      (error) => {
        console.error('Error scanning QR:', error);
      }
    );
  };

  const cargarTrabajo = async (trabajoId: string) => {
    try {
      setLoading(true);
      const { data: trabajoData, error: trabajoError } = await supabase
        .from('trabajos')
        .select('*, clinicas(*)')
        .eq('id', trabajoId)
        .single();

      if (trabajoError) throw trabajoError;

      if (trabajoData) {
        setTrabajo(trabajoData);
        setClinica(trabajoData.clinicas);
        setScanning(false);
        
        if (qrScannerRef.current) {
          qrScannerRef.current.clear();
        }
      }
    } catch (error) {
      mostrarMensaje('Trabajo no encontrado', 'error');
      console.error('Error cargando trabajo:', error);
    } finally {
      setLoading(false);
    }
  };

  const tomarFoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFotoTomada(imageSrc);
    }
  };

  const subirFoto = async (): Promise<string | null> => {
    if (!fotoTomada || !trabajo) return null;

    try {
      // Convertir base64 a blob
      const blob = await fetch(fotoTomada).then(res => res.blob());
      
      // Generar nombre único para la foto
      const fileName = `entrega_${trabajo.id}_${Date.now()}.jpg`;
      
      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('entregas')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('entregas')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error subiendo foto:', error);
      return null;
    }
  };

  const confirmarEntrega = async () => {
    if (!trabajo || !entregadoPor.trim()) {
      mostrarMensaje('Por favor completa todos los campos', 'error');
      return;
    }

    try {
      setLoading(true);

      // 1. Subir foto si existe
      const fotoUrl = fotoTomada ? await subirFoto() : null;

      // 2. Actualizar estado del trabajo
      const { error: updateError } = await supabase
        .from('trabajos')
        .update({
          estado: 'entregado',
          fecha_entrega: new Date().toISOString(),
          entregado_por: entregadoPor,
          receptor_nombre: receptorNombre,
          observaciones_entrega: observaciones,
          foto_entrega_url: fotoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', trabajo.id);

      if (updateError) throw updateError;

      // 3. Registrar en historial
      await supabase
        .from('historial_entregas')
        .insert({
          trabajo_id: trabajo.id,
          entregado_por: entregadoPor,
          receptor_nombre: receptorNombre,
          observaciones: observaciones,
          foto_url: fotoUrl,
          creado_en: new Date().toISOString()
        });

      mostrarMensaje('✅ Entrega registrada exitosamente', 'success');

      // Resetear formulario después de 2 segundos
      setTimeout(() => {
        resetFormulario();
      }, 2000);

    } catch (error) {
      mostrarMensaje('Error registrando entrega', 'error');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFormulario = () => {
    setTrabajo(null);
    setClinica(null);
    setFotoTomada(null);
    setObservaciones('');
    setEntregadoPor('');
    setReceptorNombre('');
    setScanning(true);
    setMensaje('');
    setTipoMensaje('');
    
    // Reiniciar scanner
    setTimeout(() => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear();
        iniciarScanner();
      }
    }, 500);
  };

  const mostrarMensaje = (texto: string, tipo: 'success' | 'error') => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setTimeout(() => {
      setMensaje('');
      setTipoMensaje('');
    }, 5000);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    } as React.CSSProperties,
    mainContent: {
      padding: '1rem',
      maxWidth: '500px',
      margin: '0 auto'
    } as React.CSSProperties,
    scannerContainer: {
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto 2rem',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    } as React.CSSProperties,
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '0.75rem',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '16px'
    } as React.CSSProperties,
    button: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginBottom: '0.5rem'
    } as React.CSSProperties,
    buttonSecondary: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer'
    } as React.CSSProperties,
    webcamContainer: {
      width: '100%',
      borderRadius: '8px',
      overflow: 'hidden'
    } as React.CSSProperties
  };

  return (
    <div style={styles.container}>
      <Header 
        user={{
  id: 'qr-entregas',
  email: 'entregas@dentalflow.com',
  nombre: 'Usuario Entrega',
  rol: 'laboratorista'
}}
        onLogout={() => navigate('/')}
        title="Entrega de Trabajos"
        showBackButton={true}
        onBack={() => navigate('/dashboard')}
        showTitle={true}
      />

      <main style={styles.mainContent}>
        {mensaje && (
          <div style={{
            backgroundColor: tipoMensaje === 'success' ? '#d1fae5' : '#fee2e2',
            color: tipoMensaje === 'success' ? '#065f46' : '#991b1b',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {mensaje}
          </div>
        )}

        {scanning && !trabajo && (
          <div style={styles.card}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
              📦 Escanear Código QR
            </h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1rem' }}>
              Apunta la cámara al código QR del paquete
            </p>
            
            <div id="qr-reader" style={styles.scannerContainer}></div>
            
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
              Los códigos QR se generan automáticamente en cada trabajo
            </p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Cargando...</p>
          </div>
        )}

        {trabajo && clinica && !scanning && (
          <div style={styles.card}>
            <h2 style={{ marginBottom: '1rem', color: '#1e293b' }}>
              📋 Confirmar Entrega
            </h2>

            {/* Información del Trabajo */}
            <div style={{
              backgroundColor: '#f1f5f9',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <p><strong>Paciente:</strong> {trabajo.paciente}</p>
              <p><strong>Clínica:</strong> {clinica.nombre}</p>
              <p><strong>Dirección:</strong> {clinica.direccion}</p>
              <p><strong>Teléfono:</strong> {clinica.telefono}</p>
              <p><strong>Total:</strong> ${trabajo.precio_total.toLocaleString()}</p>
            </div>

            {/* Cámara para foto */}
            <h3 style={{ marginBottom: '0.5rem' }}>📷 Tomar Foto de Comprobante</h3>
            <div style={styles.webcamContainer}>
              {!fotoTomada ? (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    videoConstraints={{
                      facingMode: 'environment'
                    }}
                  />
                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: '#ef4444',
                      marginTop: '0.5rem'
                    }}
                    onClick={tomarFoto}
                  >
                    📸 Tomar Foto
                  </button>
                </>
              ) : (
                <div>
                  <img 
                    src={fotoTomada} 
                    alt="Comprobante" 
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      marginBottom: '0.5rem'
                    }} 
                  />
                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: '#64748b'
                    }}
                    onClick={() => setFotoTomada(null)}
                  >
                    🔁 Volver a tomar
                  </button>
                </div>
              )}
            </div>

            {/* Formulario de entrega */}
            <div style={{ marginTop: '1.5rem' }}>
              <input
                type="text"
                placeholder="Tu nombre (entregado por)*"
                value={entregadoPor}
                onChange={(e) => setEntregadoPor(e.target.value)}
                style={styles.input}
                required
              />

              <input
                type="text"
                placeholder="Nombre del receptor (opcional)"
                value={receptorNombre}
                onChange={(e) => setReceptorNombre(e.target.value)}
                style={styles.input}
              />

              <textarea
                placeholder="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={{...styles.input, minHeight: '80px'}}
              />

              <button
                style={styles.button}
                onClick={confirmarEntrega}
                disabled={loading || !entregadoPor.trim()}
              >
                {loading ? 'Procesando...' : '✅ Confirmar Entrega'}
              </button>

              <button
                style={{
                  ...styles.buttonSecondary,
                  backgroundColor: '#64748b'
                }}
                onClick={resetFormulario}
                disabled={loading}
              >
                🔄 Escanear otro
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Mejorar visibilidad del scanner */
          #qr-reader {
            border: none !important;
          }
          
          #qr-reader__dashboard_section {
            padding: 10px;
          }
          
          /* Asegurar que funcione bien en móviles */
          @media (max-width: 480px) {
            input, button {
              font-size: 16px !important; /* Evita zoom en iOS */
            }
          }
        `}</style>
      </main>
    </div>
  );
};

export default QREntrega;