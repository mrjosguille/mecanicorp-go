import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ModalVehiculo({ onClose, onVehiculoAgregado }) {
  const [vehiculo, setVehiculo] = useState({ placa: '', tipo: '', marca: '', modelo: '', anio: '', color: '', chasis: '' });
  const [cargando, setCargando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    
    // Verificamos si la placa ya existe
    const { data: existe } = await supabase.from('vehiculos').select('id').ilike('placa', vehiculo.placa).limit(1);
    if (existe && existe.length > 0) {
      setCargando(false);
      return alert("¡Error! Esta placa ya está registrada.");
    }

    const { data, error } = await supabase.from('vehiculos').insert([{
      placa: vehiculo.placa.toUpperCase(),
      tipo: vehiculo.tipo.toUpperCase(),
      marca: vehiculo.marca.toUpperCase(),
      modelo: vehiculo.modelo.toUpperCase(),
      anio: parseInt(vehiculo.anio) || null,
      color: vehiculo.color.toUpperCase(),
      chasis: vehiculo.chasis.toUpperCase()
    }]).select();

    setCargando(false);
    if (error) return alert("Error al guardar vehículo: " + error.message);
    
    alert("¡Vehículo registrado!");
    onVehiculoAgregado(data[0]); // Le avisa a la Proforma
    onClose(); 
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '450px', maxWidth: '90%' }}>
        <h3 style={{ marginBottom: '15px' }}>Registrar Nuevo Vehículo</h3>
        <form onSubmit={guardar}>
          <input type="text" placeholder="Placa" value={vehiculo.placa} onChange={e => setVehiculo({...vehiculo, placa: e.target.value})} required style={{ width: '100%', padding: '8px', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" placeholder="Marca" value={vehiculo.marca} onChange={e => setVehiculo({...vehiculo, marca: e.target.value})} style={{ flex: 1, padding: '8px', textTransform: 'uppercase' }} />
            <input type="text" placeholder="Modelo" value={vehiculo.modelo} onChange={e => setVehiculo({...vehiculo, modelo: e.target.value})} style={{ flex: 1, padding: '8px', textTransform: 'uppercase' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input type="text" placeholder="Tipo (Auto, Camioneta)" value={vehiculo.tipo} onChange={e => setVehiculo({...vehiculo, tipo: e.target.value})} style={{ flex: 1, padding: '8px', textTransform: 'uppercase' }} />
            <input type="number" placeholder="Año" value={vehiculo.anio} onChange={e => setVehiculo({...vehiculo, anio: e.target.value})} style={{ flex: 1, padding: '8px' }} />
          </div>

          <input type="text" placeholder="Color" value={vehiculo.color} onChange={e => setVehiculo({...vehiculo, color: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '10px', textTransform: 'uppercase' }} />
          <input type="text" placeholder="N° Chasis" value={vehiculo.chasis} onChange={e => setVehiculo({...vehiculo, chasis: e.target.value})} style={{ width: '100%', padding: '8px', marginBottom: '15px', textTransform: 'uppercase' }} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 15px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={cargando} style={{ padding: '10px 15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {cargando ? 'Guardando...' : 'Guardar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}