import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Clientes from './pages/Clientes';
import Vehiculos from './pages/Vehiculos';
import Proformas from './pages/Proformas';
import Almacen from './pages/Almacen';
import Recepcion from './pages/Recepcion';
import OrdenesTrabajo from './pages/OrdenesTrabajo';
import MiTaller from './pages/MiTaller';
import ControlCalidad from './pages/ControlCalidad';
import EntregaCliente from './pages/EntregaCliente';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        
        {/* BARRA LATERAL */}
        <nav className="sidebar">
          <div className="sidebar-header">
            <img src="/logo-mecanicorp.png" alt="Mecanicorp Logo" />
          </div>
          <div className="sidebar-menu">
            <ul>
              <li><Link to="/"><span>🏠</span> Inicio</Link></li>
              <li><Link to="/clientes"><span>👥</span> Clientes</Link></li>
              <li><Link to="/vehiculos"><span>🚗</span> Vehículos</Link></li>
              <li><Link to="/proformas"><span>📝</span> Proformas</Link></li>
              <li><Link to="/almacen"><span>📦</span> Almacén</Link></li>
              <li><Link to="/recepcion"><span>🔑</span> Recepción</Link></li>
              <li><Link to="/ordenes"><span>🔧</span> Órdenes de Trabajo</Link></li>
              <li><Link to="/mi-taller"><span>🛠️</span> Mi Taller</Link></li>
              <li><Link to="/calidad"><span>✅</span> Control de Calidad</Link></li>
              <li><Link to="/entrega"><span>🤝</span> Entrega al Cliente</Link></li>
            </ul>
          </div>
        </nav>

        {/* CONTENIDO PRINCIPAL CON FOOTER */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden' }}>
          
          {/* Área de scroll de las páginas */}
          <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={
                <div>
                  <h1>Panel de Control</h1>
                  <p style={{ color: '#64748b', marginBottom: '30px' }}>Bienvenido a Mecanicorp Go. Selecciona un módulo para comenzar.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div className="card">
                      <h3>Clientes</h3>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>Gestión de clientes y contactos.</p>
                      <Link to="/clientes" className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block', textDecoration: 'none' }}>Ir a Clientes</Link>
                    </div>
                    <div className="card">
                      <h3>Vehículos</h3>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>Registro y control de flota.</p>
                      <Link to="/vehiculos" className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block', textDecoration: 'none' }}>Ir a Vehículos</Link>
                    </div>
                    <div className="card">
                      <h3>Proformas</h3>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>Cotizaciones y presupuestos.</p>
                      <Link to="/proformas" className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block', textDecoration: 'none' }}>Ir a Proformas</Link>
                    </div>
                    <div className="card">
                      <h3>Recepción</h3>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>Ingreso de vehículos al taller.</p>
                      <Link to="/recepcion" className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block', textDecoration: 'none' }}>Ir a Recepción</Link>
                    </div>
                    <div className="card">
                      <h3>Órdenes de Trabajo</h3>
                      <p style={{ color: '#64748b', fontSize: '14px' }}>Asignación de trabajos a chapistas.</p>
                      <Link to="/ordenes" className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block', textDecoration: 'none' }}>Ir a Órdenes</Link>
                    </div>
                  </div>
                </div>
              } />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/vehiculos" element={<Vehiculos />} />
              <Route path="/proformas" element={<Proformas />} />
              <Route path="/almacen" element={<Almacen />} />
              <Route path="/recepcion" element={<Recepcion />} />
              <Route path="/ordenes" element={<OrdenesTrabajo />} />
              <Route path="/mi-taller" element={<MiTaller />} />
              <Route path="/calidad" element={<ControlCalidad />} />
              <Route path="/entrega" element={<EntregaCliente />} />
            </Routes>
          </main>

          {/* FOOTER FIJO AL FONDO */}
          <footer className="app-footer">
            <strong>Mecanicorp Go</strong> — Sistema de Gestión de Taller
            <span>Desarrollado para Mecanicorp © 2026 | Todos los derechos reservados</span>
          </footer>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;