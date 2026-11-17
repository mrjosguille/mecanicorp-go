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
      <h2>Directorio de Clientes</h2>

      {mostrarFormulario && (
        <form onSubmit={guardarCliente} style={{ background: 'white', padding: '20px', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <h3>{clienteActual.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', marginBottom: '20px' }}>
            <div>
              <label>Nombre Completo / Razón Social:</label>
              <input type="text" value={clienteActual.nombre} onChange={e => setClienteActual({...clienteActual, nombre: e.target.value})} required style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>CI / NIT:</label>
              <input type="text" value={clienteActual.ci_nit} onChange={e => setClienteActual({...clienteActual, ci_nit: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>Teléfono:</label>
              <input type="text" value={clienteActual.telefono} onChange={e => setClienteActual({...clienteActual, telefono: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Email:</label>
              <input type="email" value={clienteActual.email} onChange={e => setClienteActual({...clienteActual, email: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label>Dirección:</label>
              <input type="text" value={clienteActual.direccion} onChange={e => setClienteActual({...clienteActual, direccion: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
          </div>

          <button type="submit" style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {clienteActual.id ? 'Guardar Cambios' : 'Guardar Cliente'}
          </button>
          <button type="button" onClick={cerrarFormulario} style={{ marginLeft: '10px', padding: '10px', cursor: 'pointer' }}>Cancelar</button>
        </form>
      )}

      {!mostrarFormulario && (
        <button onClick={() => setMostrarFormulario(true)} style={{ padding: '10px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '20px', cursor: 'pointer' }}>
          + Nuevo Cliente
        </button>
      )}

      {clientes.length === 0 ? (
        <p>No hay clientes registrados aún.</p>
      ) : (
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ padding: '10px' }}>Nombre</th>
              <th style={{ padding: '10px' }}>Teléfono</th>
              <th style={{ padding: '10px' }}>Email</th>
              <th style={{ padding: '10px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{c.nombre}</td>
                <td style={{ padding: '10px' }}>{c.telefono}</td>
                <td style={{ padding: '10px' }}>{c.email}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => editarCliente(c)} style={{ padding: '5px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}