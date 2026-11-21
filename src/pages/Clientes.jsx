import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [clienteActual, setClienteActual] = useState({
    id: null, nombre: '', ci_nit: '', telefono: '', direccion: '', email: ''
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nombre');
    if (data) setClientes(data);
  };

  const aMayusculas = (texto) => texto ? texto.toUpperCase() : '';

  const guardarCliente = async (e) => {
    e.preventDefault();
    
    const datosAGuardar = {
      nombre: aMayusculas(clienteActual.nombre),
      ci_nit: aMayusculas(clienteActual.ci_nit),
      telefono: clienteActual.telefono,
      direccion: aMayusculas(clienteActual.direccion),
      email: clienteActual.email ? clienteActual.email.toUpperCase() : ''
    };

    let error;
    if (clienteActual.id) {
      const { error: err } = await supabase.from('clientes').update(datosAGuardar).eq('id', clienteActual.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('clientes').insert([datosAGuardar]);
      error = err;
    }

    if (error) {
      alert("Error: " + error.message);
    } else {
      cerrarFormulario();
      cargarClientes();
    }
  };

  const editarCliente = (cliente) => {
    setClienteActual(cliente);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setClienteActual({ id: null, nombre: '', ci_nit: '', telefono: '', direccion: '', email: '' });
    setMostrarFormulario(false);
  };

  return (
    <div>
      {/* BARRA DE ACCIONES (Botón a la derecha) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        {!mostrarFormulario && (
          <button onClick={() => setMostrarFormulario(true)} className="btn btn-primary">
            + Nuevo Cliente
          </button>
        )}
      </div>

      {/* FORMULARIO (Usando la clase .card de tu App.css) */}
      {mostrarFormulario && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>{clienteActual.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          
          <form onSubmit={guardarCliente}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Nombre Completo / Razón Social:</label>
                <input type="text" value={clienteActual.nombre} onChange={e => setClienteActual({...clienteActual, nombre: e.target.value})} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>CI / NIT:</label>
                <input type="text" value={clienteActual.ci_nit} onChange={e => setClienteActual({...clienteActual, ci_nit: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Teléfono:</label>
                <input type="text" value={clienteActual.telefono} onChange={e => setClienteActual({...clienteActual, telefono: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Email:</label>
                <input type="email" value={clienteActual.email} onChange={e => setClienteActual({...clienteActual, email: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Dirección:</label>
                <input type="text" value={clienteActual.direccion} onChange={e => setClienteActual({...clienteActual, direccion: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {clienteActual.id ? 'Guardar Cambios' : 'Guardar Cliente'}
              </button>
              <button type="button" onClick={cerrarFormulario} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA (Usando las clases globales de tu App.css) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {clientes.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes registrados aún.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 'bold' }}>{c.nombre}</td>
                  <td>{c.telefono}</td>
                  <td>{c.email}</td>
                  <td>
                    <button onClick={() => editarCliente(c)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}