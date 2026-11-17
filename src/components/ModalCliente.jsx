import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ModalCliente({ onClose, onClienteAgregado }) {
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', ci_nit: '', direccion: '', email: '' });
  const [cargando, setCargando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    const { data, error } = await supabase.from('clientes').insert([{
      nombre: cliente.nombre.toUpperCase(),
      telefono: cliente.telefono,
      ci_nit: cliente.ci_nit,
      direccion: cliente.direccion.toUpperCase(),
      email: cliente.email.toUpperCase()
    }]).select();

    setCargando(false);
    if (error) return alert("Error al guardar cliente: " + error.message);
    
    alert("¡Cliente registrado!");
    onClienteAgregado(data[0]); // Le avisa a la Proforma que se agregó el cliente
    onClose(); // Cierra la ventanita
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
        <h3 style={{ marginBottom: '15px' }}>Registrar Nuevo Cliente</h3>
        <form onSubmit={guardar}>
          <input type="text" placeholder="Nombre / Razón Social" value={cliente.nombre} onChange={e => setCliente({...cliente, nombre: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '10px', textTransform: 'uppercase' }} />
          <input type="text" placeholder="Teléfono" value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
          <input type="text" placeholder="CI / NIT" value={cliente.ci_nit} onChange={e => setCliente({...cliente, ci_nit: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', textTransform: 'uppercase' }} />
          <input type="text" placeholder="Dirección" value={cliente.direccion} onChange={e => setCliente({...cliente, direccion: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', textTransform: 'uppercase' }} />
          <input type="email" placeholder="Email" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '15px', textTransform: 'uppercase' }} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 15px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={cargando} style={{ padding: '10px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {cargando ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}