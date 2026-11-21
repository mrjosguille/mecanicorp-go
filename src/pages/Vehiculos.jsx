import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Estado para el vehículo que estamos creando o editando
  const [vehiculoActual, setVehiculoActual] = useState({
    id: null,
    placa: '', tipo: '', marca: '', modelo: '', anio: '', color: ''
  });

  useEffect(() => {
    cargarVehiculos();
  }, []);

  const cargarVehiculos = async () => {
    const { data } = await supabase.from('vehiculos').select('*').order('fecha_registro', { ascending: false });
    if (data) setVehiculos(data);
  };

  const aMayusculas = (texto) => {
    return texto ? texto.toUpperCase() : '';
  };

  const guardarVehiculo = async (e) => {
    e.preventDefault();
    
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
      const { error: err } = await supabase.from('vehiculos').update(datosAGuardar).eq('id', vehiculoActual.id);
      error = err;
    } else {
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
      {/* BARRA DE ACCIONES (Botón a la derecha) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        {!mostrarFormulario && (
          <button onClick={() => setMostrarFormulario(true)} className="btn btn-primary">
            + Nuevo Vehículo
          </button>
        )}
      </div>

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px' }}>{vehiculoActual.id ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
          
          <form onSubmit={guardarVehiculo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Placa (Única):</label>
                <input type="text" value={vehiculoActual.placa} onChange={e => setVehiculoActual({...vehiculoActual, placa: e.target.value})} required style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Tipo:</label>
                <input type="text" value={vehiculoActual.tipo} onChange={e => setVehiculoActual({...vehiculoActual, tipo: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Marca:</label>
                <input type="text" value={vehiculoActual.marca} onChange={e => setVehiculoActual({...vehiculoActual, marca: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Modelo:</label>
                <input type="text" value={vehiculoActual.modelo} onChange={e => setVehiculoActual({...vehiculoActual, modelo: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Año:</label>
                <input type="number" value={vehiculoActual.anio} onChange={e => setVehiculoActual({...vehiculoActual, anio: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Color:</label>
                <input type="text" value={vehiculoActual.color} onChange={e => setVehiculoActual({...vehiculoActual, color: e.target.value})} style={{ textTransform: 'uppercase' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {vehiculoActual.id ? 'Guardar Cambios' : 'Guardar Vehículo'}
              </button>
              <button type="button" onClick={cerrarFormulario} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {vehiculos.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay vehículos registrados aún.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca / Modelo</th>
                <th>Año</th>
                <th>Color</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 'bold' }}>{v.placa}</td>
                  <td>{v.marca} {v.modelo}</td>
                  <td>{v.anio}</td>
                  <td>{v.color}</td>
                  <td>
                    <button onClick={() => editarVehiculo(v)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
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