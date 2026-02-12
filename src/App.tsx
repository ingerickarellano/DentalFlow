import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Importar componentes
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Registro from './components/Registro';
import RecuperacionCuenta from './components/RecuperacionCuenta';
import Dashboard from './components/Dashboard';
import DashboardLaboratorista from './components/DashboardLaboratorista';
import CrearTrabajo from './components/CrearTrabajo';
import GestionClinicas from './components/GestionClinicas';
import GestionDentistas from './components/GestionDentistas';
import GestionLaboratoristas from './components/GestionLaboratoristas';
import GestionServicios from './components/GestionServicios';
import GestionTrabajos from './components/GestionTrabajos';
import GestionPrecios from './components/GestionPrecios';
import OpcionesCuenta from './components/OpcionesCuenta';
import Reportes from './components/Reportes';
import AdminPanel from './components/AdminPanel';
import QREntrega from './components/QREntrega';
import MiMembresia from './components/MiMembresia';
import ControlPagosManual from './components/ControlPagosManual';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  laboratorio?: string;
  telefono?: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authListenerSet, setAuthListenerSet] = useState(false);
  const navigate = useNavigate();

  // ============================================
  // 1. INICIALIZACIÓN DE SESIÓN
  // ============================================
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const { data: perfil } = await supabase
            .from('perfiles_usuarios')
            .select('rol, laboratorio, telefono')
            .eq('id', session.user.id)
            .single();

          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            nombre: session.user.user_metadata?.nombre || session.user.email!.split('@')[0],
            rol: perfil?.rol || session.user.user_metadata?.rol || 'cliente',
            laboratorio: perfil?.laboratorio || session.user.user_metadata?.laboratorio,
            telefono: perfil?.telefono || session.user.user_metadata?.telefono,
          };
          setCurrentUser(userData);

          const currentPath = window.location.pathname;
          if (['/login', '/registro', '/recuperacion'].includes(currentPath)) {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error inicializando:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  // ============================================
  // 2. LISTENER DE AUTENTICACIÓN (CORREGIDO)
  // ============================================
  useEffect(() => {
    if (authListenerSet || loading) return;

    setAuthListenerSet(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: perfil } = await supabase
            .from('perfiles_usuarios')
            .select('rol, laboratorio, telefono')
            .eq('id', session.user.id)
            .single();

          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            nombre: session.user.user_metadata?.nombre || session.user.email!.split('@')[0],
            rol: perfil?.rol || session.user.user_metadata?.rol || 'cliente',
            laboratorio: perfil?.laboratorio || session.user.user_metadata?.laboratorio,
            telefono: perfil?.telefono || session.user.user_metadata?.telefono,
          };
          setCurrentUser(userData);

          const currentPath = window.location.pathname;
          if (['/login', '/registro', '/recuperacion'].includes(currentPath)) {
            navigate('/dashboard');
          }
        }

        // ✅ CORREGIDO: SOLO redirigir al Landing Page con recarga completa
        if (event === 'SIGNED_OUT') {
          console.log('🔒 Logout detectado - Redirigiendo al Landing Page con recarga completa');
          setCurrentUser(null);
          window.location.href = '/';
          return;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loading, authListenerSet, navigate]);

  // ============================================
  // 3. LOGOUT
  // ============================================
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  };

  // ============================================
  // 4. COMPONENTE DE RUTA PROTEGIDA (SIN VALIDACIÓN DE MEMBRESÍA)
  // ============================================
  const ProtectedRoute = ({
    children,
    allowedRoles = ['admin', 'cliente', 'laboratorista'],
  }: {
    children: React.ReactNode;
    allowedRoles?: string[];
  }) => {
    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState<User | null>(null);
    const [rol, setRol] = useState<string | null>(null);

    useEffect(() => {
      const verificarUsuario = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCargando(false);
          return;
        }

        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('rol, laboratorio, telefono')
          .eq('id', user.id)
          .single();

        const userData: User = {
          id: user.id,
          email: user.email!,
          nombre: user.user_metadata?.nombre || user.email!.split('@')[0],
          rol: perfil?.rol || user.user_metadata?.rol || 'cliente',
          laboratorio: perfil?.laboratorio || user.user_metadata?.laboratorio,
          telefono: perfil?.telefono || user.user_metadata?.telefono,
        };
        setUsuario(userData);
        setRol(userData.rol);
        setCargando(false);
      };
      verificarUsuario();
    }, []);

    if (cargando) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
    }

    if (!usuario) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(rol || '')) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  };

  // ============================================
  // 5. LOADER INICIAL
  // ============================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦷</div>
          <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ============================================
  // 6. RUTAS
  // ============================================
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/registro" element={currentUser ? <Navigate to="/dashboard" replace /> : <Registro onBack={() => navigate('/')} />} />
      <Route path="/recuperacion" element={currentUser ? <Navigate to="/dashboard" replace /> : <RecuperacionCuenta onBack={() => navigate('/login')} />} />

      {/* Dashboard según rol */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {currentUser?.rol === 'laboratorista' ? (
              <DashboardLaboratorista user={currentUser} onLogout={handleLogout} />
            ) : (
              <Dashboard user={currentUser!} onLogout={handleLogout} />
            )}
          </ProtectedRoute>
        }
      />

      {/* Mi Membresía */}
      <Route
        path="/mi-membresia"
        element={
          <ProtectedRoute allowedRoles={['admin', 'cliente']}>
            <MiMembresia />
          </ProtectedRoute>
        }
      />

      {/* Módulos protegidos */}
      <Route path="/crear-trabajo" element={<ProtectedRoute allowedRoles={['admin', 'cliente']}><CrearTrabajo onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
      <Route path="/clinicas" element={<ProtectedRoute allowedRoles={['admin', 'cliente']}><GestionClinicas /></ProtectedRoute>} />
      <Route path="/dentistas" element={<ProtectedRoute allowedRoles={['admin', 'cliente']}><GestionDentistas /></ProtectedRoute>} />
      <Route path="/laboratoristas" element={<ProtectedRoute allowedRoles={['admin']}><GestionLaboratoristas /></ProtectedRoute>} />
      <Route path="/control-pagos" element={<ProtectedRoute allowedRoles={['admin']}><ControlPagosManual /></ProtectedRoute>} />
      <Route path="/servicios" element={<ProtectedRoute allowedRoles={['admin', 'cliente']}><GestionServicios /></ProtectedRoute>} />
      <Route path="/trabajos" element={<ProtectedRoute allowedRoles={['admin', 'cliente', 'laboratorista']}><GestionTrabajos /></ProtectedRoute>} />
      <Route path="/precios" element={<ProtectedRoute allowedRoles={['admin', 'cliente']}><GestionPrecios /></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute><OpcionesCuenta onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
      <Route path="/reportes" element={<ProtectedRoute allowedRoles={['admin', 'cliente']}><Reportes onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
      <Route path="/opciones-cuenta" element={<ProtectedRoute><OpcionesCuenta onBack={() => navigate('/dashboard')} /></ProtectedRoute>} />
      <Route path="/entregas" element={<ProtectedRoute allowedRoles={['admin', 'cliente', 'laboratorista']}><QREntrega /></ProtectedRoute>} />

      {/* 404 -> Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;