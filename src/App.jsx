import { BrowserRouter, Routes, Route, Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // <-- NUEVO IMPORT
import Clientes from './pages/Clientes';
import Vehiculos from './pages/Vehiculos';
import Proformas from './pages/Proformas';
import Almacen from './pages/Almacen';
import Recepcion from './pages/Recepcion';
import OrdenesTrabajo from './pages/OrdenesTrabajo';
import MiTaller from './pages/MiTaller';
import ControlCalidad from './pages/ControlCalidad';
import EntregaCliente from './pages/EntregaCliente';
import Kardex from './pages/Kardex'; // <-- IMPORT DE KARDEX
import './App.css';

// --- COMPONENTE PARA PROTEGER RUTAS ---
const RutaProtegida = ({ children, rolesPermitidos }) => {
  const { session, perfil, loading } = useAuth();

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Cargando sistema...</div>;
  if (!session) return <Navigate to="/login" />;
  
  if (rolesPermitidos && perfil && !rolesPermitidos.includes(perfil.rol)) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

// --- COMPONENTE DEL MENÚ LATERAL Y HEADER ---
const Layout = () => {
  const { perfil, logout } = useAuth();
  const location = useLocation();
  
  const rolesAdmin = ['admin', 'gerente', 'jefe_taller', 'asesor'];
  const rolesTaller = ['admin', 'gerente', 'jefe_taller', 'asesor', 'chapista', 'mecanico'];

  const getTitulo = (path) => {
    switch (path) {
      case '/': return 'Panel de Control';
      case '/clientes': return 'Directorio de Clientes';
      case '/vehiculos': return 'Registro de Vehículos';
      case '/proformas': return 'Módulo de Proformas';
      case '/almacen': return 'Gestión de Almacén';
      case '/recepcion': return 'Recepción de Vehículos';
      case '/ordenes': return 'Órdenes de Trabajo';
      case '/mi-taller': return 'Mi Taller';
      case '/calidad': return 'Control de Calidad';
      case '/entrega': return 'Entrega al Cliente';
      case '/kardex': return 'Kardex y Pagos';
      default: return 'Mecanicorp Go';
    }
  };

  return (
    <div className="app-container">
      {/* SIDEBAR IZQUIERDO */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <img src="/logo-mecanicorp.png" alt="Mecanicorp Logo" />
        </div>
        
        <div className="sidebar-menu">
          <ul>
            <li><Link to="/"><span>🏠</span> Inicio</Link></li>
            
            {rolesAdmin.includes(perfil?.rol) && (
              <>
                <li><Link to="/clientes"><span>👥</span> Clientes</Link></li>
                <li><Link to="/vehiculos"><span>🚗</span> Vehículos</Link></li>
                <li><Link to="/proformas"><span>📝</span> Proformas</Link></li>
                <li><Link to="/almacen"><span>📦</span> Almacén</Link></li>
                <li><Link to="/recepcion"><span>🔑</span> Recepción</Link></li>
                <li><Link to="/ordenes"><span>🔧</span> Órdenes de Trabajo</Link></li>
              </>
            )}

            {rolesTaller.includes(perfil?.rol) && (
              <>
                <li><Link to="/mi-taller"><span>🛠️</span> Mi Taller</Link></li>
                <li><Link to="/calidad"><span>✅</span> Control de Calidad</Link></li>
                <li><Link to="/entrega"><span>🤝</span> Entrega al Cliente</Link></li>
              </>
            )}

            {['admin', 'gerente', 'jefe_taller'].includes(perfil?.rol) && (
              <li><Link to="/kardex"><span>💰</span> Kardex / Pagos</Link></li>
            )}
          </ul>
        </div>
      </nav>

      {/* CONTENEDOR DERECHO (Header + Contenido) */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden' }}>
        
        {/* HEADER SUPERIOR */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '15px 30px', 
          backgroundColor: '#fff', 
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 5,
          height: '70px'
        }}>
          {/* TÍTULO DINÁMICO A LA IZQUIERDA */}
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--mecanicorp-blue)', fontWeight: '700' }}>
              {getTitulo(location.pathname)}
            </h2>
          </div>
          
          {/* PERFIL A LA DERECHA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-main)' }}>
                {perfil?.nombre_completo}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {perfil?.rol?.toUpperCase()}
              </div>
            </div>
            
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--mecanicorp-blue)', 
              color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '18px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
              {perfil?.nombre_completo?.charAt(0).toUpperCase()}
            </div>

            <button onClick={logout} className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '13px' }}>
              Salir
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
        
        {/* FOOTER */}
        <footer className="app-footer">
          <strong>Mecanicorp Go</strong> — Sistema de Gestión de Taller
          <span>Desarrollado para Mecanicorp © 2026 | Todos los derechos reservados</span>
        </footer>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const todosLosRoles = ['admin', 'gerente', 'jefe_taller', 'asesor', 'chapista', 'mecanico', 'bodeguero', 'secretaria'];

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              
              {/* RUTA DEL DASHBOARD REEMPLAZADA */}
              <Route path="/" element={<Dashboard />} />
              
              <Route path="/clientes" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller', 'asesor']}><Clientes /></RutaProtegida>} />
              <Route path="/vehiculos" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller', 'asesor']}><Vehiculos /></RutaProtegida>} />
              <Route path="/proformas" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller', 'asesor']}><Proformas /></RutaProtegida>} />
              <Route path="/almacen" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller', 'asesor', 'bodeguero']}><Almacen /></RutaProtegida>} />
              <Route path="/recepcion" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller', 'asesor']}><Recepcion /></RutaProtegida>} />
              <Route path="/ordenes" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller', 'asesor', 'secretaria']}><OrdenesTrabajo /></RutaProtegida>} />
              
              <Route path="/mi-taller" element={<RutaProtegida rolesPermitidos={todosLosRoles}><MiTaller /></RutaProtegida>} />
              <Route path="/calidad" element={<RutaProtegida rolesPermitidos={todosLosRoles}><ControlCalidad /></RutaProtegida>} />
              <Route path="/entrega" element={<RutaProtegida rolesPermitidos={todosLosRoles}><EntregaCliente /></RutaProtegida>} />
              
              <Route path="/kardex" element={<RutaProtegida rolesPermitidos={['admin', 'gerente', 'jefe_taller']}><Kardex /></RutaProtegida>} />
              
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;