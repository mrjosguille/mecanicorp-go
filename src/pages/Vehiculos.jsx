import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Estado para el vehículo que estamos creando o editando
  const [vehiculoActual, setVehiculoActual] = useState({
    id: null, // Si tiene ID, estamos editando. Si no, creando.
    placa: '', tipo: '', marca: '', modelo: '', anio: '', color: ''
  });

  useEffect(() => {
    cargarVehiculos();
  }, []);

  const cargarVehiculos = async () => {
    const { data } = await supabase.from('vehiculos').select('*').order('fecha_registro', { ascending: false });
    if (data) setVehiculos(data);
  };

  // Función que convierte todo a mayúsculas
  const aMayusculas = (texto) => {
    return texto ? texto.toUpperCase() : '';
  };

  const guardarVehiculo = async (e) => {
    e.preventDefault();
    
    // Validar placa duplicada solo si estamos creando uno nuevo
    if (!vehiculoActual.id) {
      const existe = vehiculos.some(v => v.placa.toUpperCase() === vehiculoActual.placa.toUpperCase());
      if (existe) {
        alert("Esta placa ya está registrada en el sistema.");
        return;
      }
    }

    const datosAGuardar = {
      placa: aMayusculas(vehiculoActual.placa),
      tipo: aMayusculas(vehiculoActual.tipo),
      marca: aMayusculas(vehiculoActual.marca),
      modelo: aMayusculas(vehiculoActual.modelo),
      anio: vehiculoActual.anio ? parseInt(vehiculoActual.anio) : null,
      color: aMayusculas(vehiculoActual.color)
    };

    let error;
    if (vehiculoActual.id) {
      // Modo Edición
      const { error: err } = await supabase.from('vehiculos').update(datosAGuardar).eq('id', vehiculoActual.id);
      error = err;
    } else {
      // Modo Creación
      const { error: err } = await supabase.from('vehiculos').insert([datosAGuardar]);
      error = err;
    }

    if (error) {
      alert("Error al guardar vehículo: " + error.message);
    } else {
      cerrarFormulario();
      cargarVehiculos();
    }
  };

  const editarVehiculo = (vehiculo) => {
    setVehiculoActual(vehiculo);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setVehiculoActual({ id: null, placa: '', tipo: '', marca: '', modelo: '', anio: '', color: '' });
    setMostrarFormulario(false);
  };

  return (
    <div>
      <h2>Registro de Vehículos</h2>

      {mostrarFormulario && (
        <form onSubmit={guardarVehiculo} style={{ background: 'white', padding: '20px', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <h3>{vehiculoActual.id ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', marginBottom: '20px' }}>
            <div>
              <label>Placa (Única):</label>
              <input type="text" value={vehiculoActual.placa} onChange={e => setVehiculoActual({...vehiculoActual, placa: e.target.value})} required style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>Tipo:</label>
              <input type="text" value={vehiculoActual.tipo} onChange={e => setVehiculoActual({...vehiculoActual, tipo: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>Marca:</label>
              <input type="text" value={vehiculoActual.marca} onChange={e => setVehiculoActual({...vehiculoActual, marca: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>Modelo:</label>
              <input type="text" value={vehiculoActual.modelo} onChange={e => setVehiculoActual({...vehiculoActual, modelo: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>Año:</label>
              <input type="number" value={vehiculoActual.anio} onChange={e => setVehiculoActual({...vehiculoActual, anio: e.target.value})} style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label>Color:</label>
              <input type="text" value={vehiculoActual.color} onChange={e => setVehiculoActual({...vehiculoActual, color: e.target.value})} style={{ width: '100%', padding: '8px', textTransform: 'uppercase' }} />
            </div>
          </div>

          <button type="submit" style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {vehiculoActual.id ? 'Guardar Cambios' : 'Guardar Vehículo'}
          </button>
          <button type="button" onClick={cerrarFormulario} style={{ marginLeft: '10px', padding: '10px', cursor: 'pointer' }}>Cancelar</button>
        </form>
      )}

      {!mostrarFormulario && (
        <button onClick={() => setMostrarFormulario(true)} style={{ padding: '10px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '20px', cursor: 'pointer' }}>
          + Nuevo Vehículo
        </button>
      )}

      {vehiculos.length === 0 ? (
        <p>No hay vehículos registrados aún.</p>
      ) : (
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ padding: '10px' }}>Placa</th>
              <th style={{ padding: '10px' }}>Marca / Modelo</th>
              <th style={{ padding: '10px' }}>Año</th>
              <th style={{ padding: '10px' }}>Color</th>
              <th style={{ padding: '10px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.placa}</td>
                <td style={{ padding: '10px' }}>{v.marca} {v.modelo}</td>
                <td style={{ padding: '10px' }}>{v.anio}</td>
                <td style={{ padding: '10px' }}>{v.color}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => editarVehiculo(v)} style={{ padding: '5px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
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