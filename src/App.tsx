import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Importar componentes
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Registro from './components/Registro';
import RecuperacionCuenta from './components/RecuperacionCuenta';
import Dashboard from './components/Dashboard';
import DashboardLaboratorista from './components/DashboardLaboratorista'; // <-- NUEVO
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

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  suscripcion_activa?: boolean;
  fecha_expiracion?: string | null;
  plan?: string;
  laboratorio?: string;
  telefono?: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authListenerSet, setAuthListenerSet] = useState(false);
  const navigate = useNavigate();

  // 1. INICIALIZACIÓN ÚNICA
  useEffect(() => {
    console.log('🚀 Inicializando aplicación...');
    
    const initializeAuth = async () => {
      try {
        // Obtener sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ Usuario encontrado:', session.user.email);
          console.log('📋 Metadata del usuario:', session.user.user_metadata);
          
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            nombre: session.user.user_metadata?.nombre || session.user.email!.split('@')[0],
            rol: session.user.user_metadata?.rol || 'cliente', // <-- OBTIENE EL ROL
            suscripcion_activa: false,
            plan: 'gratuita'
          };
          
          console.log(`🎭 Rol detectado: ${userData.rol}`);
          setCurrentUser(userData);
          
          // Solo redirigir si estamos explícitamente en login/registro
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/registro' || currentPath === '/recuperacion') {
            navigate('/dashboard');
          }
        } else {
          console.log('ℹ️ No hay usuario autenticado');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('💥 Error inicializando app:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [navigate]);

  // 2. CONFIGURAR LISTENER DE AUTH (solo una vez)
  useEffect(() => {
    if (authListenerSet || loading) return;
    
    console.log('🔔 Configurando listener de auth...');
    setAuthListenerSet(true);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Evento auth:', event, 'Usuario:', session?.user?.email);
        
        // Ignorar eventos de refresco
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          console.log(`⚡ ${event} - Ignorando`);
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('📋 Metadata en SIGNED_IN:', session.user.user_metadata);
          
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            nombre: session.user.user_metadata?.nombre || session.user.email!.split('@')[0],
            rol: session.user.user_metadata?.rol || 'cliente', // <-- IMPORTANTE
          };
          
          console.log(`🎭 Rol en login: ${userData.rol}`);
          setCurrentUser(userData);
          
          // Solo redirigir si estamos en rutas de auth
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/registro' || currentPath === '/recuperacion') {
            navigate('/dashboard');
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🔒 Logout detectado');
          setCurrentUser(null);
          
          // Solo redirigir si estamos en rutas protegidas
          const currentPath = window.location.pathname;
          const protectedRoutes = ['/dashboard', '/crear-trabajo', '/clinicas', '/dentistas', 
                                  '/laboratoristas', '/servicios', '/trabajos', '/precios', 
                                  '/configuracion', '/reportes', '/admin', '/opciones-cuenta'];
          
          if (protectedRoutes.includes(currentPath)) {
            navigate('/login');
          }
        }
        
        if (event === 'USER_UPDATED' && session?.user) {
          console.log('📝 Usuario actualizado');
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            nombre: session.user.user_metadata?.nombre || session.user.email!.split('@')[0],
            rol: session.user.user_metadata?.rol || 'cliente',
          };
          setCurrentUser(userData);
        }
      }
    );
    
    return () => {
      console.log('🧹 Limpiando listener de auth');
      subscription.unsubscribe();
    };
  }, [loading, currentUser, navigate, authListenerSet]);

  // 3. LOADER
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '2rem',
          borderRadius: '1rem',
          backgroundColor: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦷</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <div style={{ color: '#64748b', fontSize: '1rem' }}>Iniciando DentalFlow...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  console.log('🎉 App cargada. Usuario:', currentUser?.email, 'Rol:', currentUser?.rol);

  // 4. FUNCIÓN DE LOGOUT COMPARTIDA
  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      console.log('🚪 Iniciando logout...');
      await supabase.auth.signOut();
    }
  };

  // 5. COMPONENTE PARA RUTAS PROTEGIDAS CON ROL
  const ProtectedRoute = ({ 
    children, 
    allowedRoles = ['admin', 'cliente', 'laboratorista'] 
  }: { 
    children: React.ReactNode;
    allowedRoles?: string[];
  }) => {
    if (!currentUser) {
      console.log('🚫 Usuario no autenticado, redirigiendo a login');
      return <Navigate to="/login" />;
    }
    
    if (!allowedRoles.includes(currentUser.rol)) {
      console.log(`🚫 Rol no permitido: ${currentUser.rol}, redirigiendo a dashboard`);
      return <Navigate to="/dashboard" />;
    }
    
    return <>{children}</>;
  };

  return (
    <div className="App">
      <Routes>
        {/* RUTA PRINCIPAL */}
        <Route path="/" element={<LandingPage />} />
        
        {/* AUTENTICACIÓN */}
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to="/dashboard" /> : <Login />} 
        />
        
        <Route 
          path="/registro" 
          element={currentUser ? <Navigate to="/dashboard" /> : <Registro onBack={() => navigate('/')} />} 
        />
        
        <Route 
          path="/recuperacion" 
          element={currentUser ? <Navigate to="/dashboard" /> : <RecuperacionCuenta onBack={() => navigate('/login')} />} 
        />
        
        {/* DASHBOARD PRINCIPAL - DIFERENTE SEGÚN ROL */}
<Route 
  path="/dashboard" 
  element={
    currentUser ? (
      currentUser.rol === 'laboratorista' ? (
        <DashboardLaboratorista user={currentUser} onLogout={handleLogout} />
      ) : (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )
    ) : (
      <Navigate to="/login" />
    )
  } 
/>
        
        {/* MÓDULOS DEL SISTEMA - SOLO PARA ADMIN/CLIENTE */}
        <Route 
          path="/crear-trabajo" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <CrearTrabajo onBack={() => navigate('/dashboard')} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/clinicas" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <GestionClinicas />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dentistas" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <GestionDentistas />
            </ProtectedRoute>
          } 
        />
        
        {/* GESTIÓN DE LABORATORISTAS - SOLO ADMIN */}
        <Route 
          path="/laboratoristas" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <GestionLaboratoristas />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/servicios" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <GestionServicios />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/trabajos" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente', 'laboratorista']}>
              <GestionTrabajos />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/precios" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <GestionPrecios />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/configuracion" 
          element={
            <ProtectedRoute>
              <OpcionesCuenta onBack={() => navigate('/dashboard')} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reportes" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cliente']}>
              <Reportes onBack={() => navigate('/dashboard')} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPanel onBack={() => navigate('/dashboard')} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/opciones-cuenta" 
          element={
            <ProtectedRoute>
              <OpcionesCuenta onBack={() => navigate('/dashboard')} />
            </ProtectedRoute>
          } 
        />
        
        {/* RUTA POR DEFECTO */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;