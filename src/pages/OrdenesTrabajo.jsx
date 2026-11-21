import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function OrdenesTrabajo() {
  const [recepciones, setRecepciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [ordenesCreadas, setOrdenesCreadas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [busqueda, setBusqueda] = useState('');
  const [otSeleccionada, setOtSeleccionada] = useState(null);
  const [detalleFases, setDetalleFases] = useState([]);
  const [adicionales, setAdicionales] = useState([]); 
  
  const [nuevoAdicional, setNuevoAdicional] = useState({ tipo: 'REPUESTO', descripcion: '', monto: '' });
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [gastosExtra, setGastosExtra] = useState([]); 

  const [nuevaOT, setNuevaOT] = useState({ 
    recepcion_id: '', empleado_id: '', fecha_estimada_entrega: '', observaciones: '', 
    esSeguro: false, montoSeguro: '' 
  });
    
  const [archivoSeguro, setArchivoSeguro] = useState(null);
  const [guardandoOT, setGuardandoOT] = useState(false); 

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    // Incluimos el campo 'seguro' de la tabla recepciones
    const { data: recData } = await supabase.from('recepciones').select(`id, cliente_nombre, vehiculo_id, seguro, vehiculos (placa, marca, modelo)`);
    const { data: otData } = await supabase.from('ordenes_trabajo').select('recepcion_id');
    const recepcionesConOT = otData?.map(ot => ot.recepcion_id) || [];
    if (recData) setRecepciones(recData.filter(rec => !recepcionesConOT.includes(rec.id)));

    const { data: empData } = await supabase.from('empleados').select('id, nombre, cargo');
    if (empData) setEmpleados(empData);

    // Incluimos el nombre_seguro para mostrarlo en la tabla
    const { data: ordenesData } = await supabase.from('ordenes_trabajo').select(`*, vehiculos (placa, marca, modelo), empleados (nombre)`).order('fecha_asignacion', { ascending: false });
    if (ordenesData) setOrdenesCreadas(ordenesData);
  };

  const crearOT = async (e) => {
    e.preventDefault();
    if (!nuevaOT.recepcion_id || !nuevaOT.empleado_id) return alert("Seleccione vehículo y empleado");
    
    setGuardandoOT(true);

    const recepcion = recepciones.find(r => r.id === nuevaOT.recepcion_id);
    const empleado = empleados.find(emp => emp.id === nuevaOT.empleado_id);

    // Verificamos si la recepción ya tenía un seguro (Alianza, Sura, etc)
    const tieneSeguroRecepcion = recepcion.seguro && recepcion.seguro !== 'SIN SEGURO';
    
    // Si la recepción ya tiene seguro, autocompletamos
    if (tieneSeguroRecepcion && !nuevaOT.esSeguro) {
        setNuevaOT(prev => ({ ...prev, esSeguro: true }));
    }

    const { data: proforma } = await supabase.from('proformas').select('total').eq('vehiculo_id', recepcion.vehiculo_id).order('fecha', { ascending: false }).limit(1);
    const totalProforma = proforma && proforma.length > 0 ? proforma[0].total : 0;

    let urlSeguro = null;
    
    if (nuevaOT.esSeguro && archivoSeguro) {
      const fileExt = archivoSeguro.name.split('.').pop();
      const fileName = `seguro_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('recepciones_fotos').upload(fileName, archivoSeguro);
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('recepciones_fotos').getPublicUrl(fileName);
        urlSeguro = urlData.publicUrl;
      } else {
        alert("Error al subir el archivo del seguro: " + uploadError.message);
        setGuardandoOT(false);
        return;
      }
    }

    // Guardamos la OT. Hereda el nombre del seguro de la recepción.
    const { data: otGuardada, error } = await supabase.from('ordenes_trabajo').insert([{
      recepcion_id: nuevaOT.recepcion_id, 
      vehiculo_id: recepcion.vehiculo_id, 
      empleado_id: nuevaOT.empleado_id,
      fecha_estimada_entrega: nuevaOT.fecha_estimada_entrega || null, 
      observaciones: nuevaOT.observaciones.toUpperCase(), 
      proforma_total: totalProforma,
      archivo_seguro_url: urlSeguro,
      nombre_seguro: recepcion.seguro, // <-- HEREDA EL SEGURO DE LA RECEPCIÓN
      monto_aprobado_seguro: nuevaOT.esSeguro ? parseFloat(nuevaOT.montoSeguro) || 0 : 0 
    }]).select();

    if (error) {
      alert("Error: " + error.message);
      setGuardandoOT(false);
      return;
    }

    let fases = [];
    if (empleado.cargo === 'MECANICO') {
      fases = ['DIAGNOSTICO', 'PRESUPUESTO', 'REPARACION', 'PRUEBA', 'FINALIZADO'];
    } else {
      fases = ['CHAPERIO', 'PREPARADO', 'PINTURA', 'PULIDO', 'ARMADO', 'LAVADO'];
    }
    await supabase.from('ot_fases').insert(fases.map(fase => ({ ot_id: otGuardada[0].id, nombre_fase: fase, estado: 'PENDIENTE' })));

    alert("¡Orden creada exitosamente!");
    
    setMostrarFormulario(false);
    setNuevaOT({ recepcion_id: '', empleado_id: '', fecha_estimada_entrega: '', observaciones: '', esSeguro: false, montoSeguro: '' });
    setArchivoSeguro(null);
    setGuardandoOT(false); 
    cargarDatos();
  };

  const abrirDetalle = async (ot) => {
    setOtSeleccionada(ot);
    const { data: fases } = await supabase.from('ot_fases').select('*').eq('ot_id', ot.id);
    setDetalleFases(fases || []);

    const { data: gastos } = await supabase.from('ot_gastos').select('*').eq('ot_id', ot.id).order('fecha', { ascending: false });
    setGastosExtra(gastos || []);
  };

  const agregarGasto = async () => {
    if (!nuevoGasto.descripcion || !nuevoGasto.monto) return alert("Complete los datos del gasto");
    
    const { error } = await supabase.from('ot_gastos').insert([{
      ot_id: otSeleccionada.id,
      descripcion: nuevoGasto.descripcion.toUpperCase(),
      monto: parseFloat(nuevoGasto.monto)
    }]);

    if (error) return alert("Error al guardar gasto: " + error.message);
    
    setNuevoGasto({ descripcion: '', monto: '' });
    abrirDetalle(otSeleccionada);
  };

  const agregarAdicional = () => {
    if (!nuevoAdicional.descripcion || !nuevoAdicional.monto) return alert("Complete los datos");
    setAdicionales([...adicionales, { ...nuevoAdicional, id: Date.now() }]);
    setNuevoAdicional({ tipo: 'REPUESTO', descripcion: '', monto: '' });
  };

  const ordenesFiltradas = ordenesCreadas.filter(ot => {
    const texto = busqueda.toUpperCase();
    return ot.vehiculos?.placa?.toUpperCase().includes(texto);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => setMostrarFormulario(true)} style={{ padding: '10px 20px', background: '#1e4b8f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          + Asignar Nueva Orden
        </button>
      </div>

      {mostrarFormulario && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Nueva Asignación</h3>
          <form onSubmit={crearOT} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
            <select value={nuevaOT.recepcion_id} onChange={e => setNuevaOT({...nuevaOT, recepcion_id: e.target.value})} required style={{ padding: '10px' }}>
              <option value="">Seleccione vehículo...</option>
              {recepciones.map(rec => (
                <option key={rec.id} value={rec.id}>
                  {rec.vehiculos?.placa} - {rec.seguro || 'PARTICULAR'}
                </option>
              ))}
            </select>
            <select value={nuevaOT.empleado_id} onChange={e => setNuevaOT({...nuevaOT, empleado_id: e.target.value})} required style={{ padding: '10px' }}>
              <option value="">Seleccione empleado...</option>
              {empleados.filter(e => ['CHAPISTA', 'MECANICO'].includes(e.cargo)).map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
            </select>
            
            {/* SECCIÓN DEL SEGURO */}
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '5px', border: '1px solid #d0dfff' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                <input type="checkbox" checked={nuevaOT.esSeguro} onChange={e => setNuevaOT({...nuevaOT, esSeguro: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                ¿El trabajo ingresa por Seguro?
              </label>
              
              {nuevaOT.esSeguro && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#475569' }}>Monto Aprobado por el Seguro (Bs.):</label>
                    <input type="number" value={nuevaOT.montoSeguro} onChange={e => setNuevaOT({...nuevaOT, montoSeguro: e.target.value})} placeholder="Ej. 800" required style={{ width: '100%', padding: '8px', background: 'white', borderRadius: '5px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#475569' }}>Adjuntar Orden del Seguro (PDF o Imagen):</label>
                    <input type="file" accept=".pdf,image/*" onChange={e => setArchivoSeguro(e.target.files[0])} style={{ width: '100%', padding: '8px', background: 'white', borderRadius: '5px', border: '1px solid #ccc' }} />
                  </div>
                </div>
              )}
            </div>

            <input type="date" value={nuevaOT.fecha_estimada_entrega} onChange={e => setNuevaOT({...nuevaOT, fecha_estimada_entrega: e.target.value})} style={{ padding: '10px' }} />
            <textarea placeholder="Observaciones..." value={nuevaOT.observaciones} onChange={e => setNuevaOT({...nuevaOT, observaciones: e.target.value})} style={{ padding: '10px' }} />
            
            <button type="submit" disabled={guardandoOT} style={{ padding: '10px', background: guardandoOT ? '#94a3b8' : '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: guardandoOT ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {guardandoOT ? '⏳ SUBIENDO Y GUARDANDO...' : 'Guardar Orden'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3>Historial de Órdenes</h3>
          <input type="text" placeholder="🔍 Buscar por Placa..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ padding: '10px', width: '300px', borderRadius: '5px', border: '1px solid #ccc' }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ padding: '10px' }}>Fecha</th>
              <th style={{ padding: '10px' }}>Vehículo</th>
              <th style={{ padding: '10px' }}>Asignado a</th>
              <th style={{ padding: '10px' }}>Seguro</th>
              <th style={{ padding: '10px' }}>Total</th>
              <th style={{ padding: '10px' }}>Estado</th>
              <th style={{ padding: '10px' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.map(ot => (
              <tr key={ot.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{new Date(ot.fecha_asignacion).toLocaleDateString()}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{ot.vehiculos?.placa}</td>
                <td style={{ padding: '10px' }}>{ot.empleados?.nombre}</td>
                <td style={{ padding: '10px', color: '#1e4b8f', fontWeight: 'bold' }}>{ot.nombre_seguro || 'PARTICULAR'}</td>
                <td style={{ padding: '10px' }}>Bs. {ot.monto_aprobado_seguro > 0 ? ot.monto_aprobado_seguro : ot.proforma_total}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ padding: '3px 8px', background: ot.estado === 'FINALIZADO' ? '#27ae60' : (ot.estado === 'EN_PROCESO' ? '#f39c12' : '#3498db'), color: 'white', borderRadius: '3px', fontSize: '12px' }}>{ot.estado}</span>
                </td>
                <td style={{ padding: '10px' }}><button onClick={() => abrirDetalle(ot)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Ver Detalle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PANEL DE DETALLE */}
      {otSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '700px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)' }}>
            
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', zIndex: 10 }}>
              <h3 style={{ margin: 0, color: '#1e4b8f' }}>Detalle OT: {otSeleccionada.vehiculos?.placa}</h3>
              <button onClick={() => setOtSeleccionada(null)} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar</button>
            </div>

            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              
              <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                <p><strong>Seguro:</strong> {otSeleccionada.nombre_seguro || 'PARTICULAR'}</p>
                <p><strong>Observación del Chapista:</strong> {otSeleccionada.observacion_chapista || 'Sin observaciones.'}</p>
                <p><strong>Total Proforma:</strong> Bs. {otSeleccionada.proforma_total}</p>
                {otSeleccionada.monto_aprobado_seguro > 0 && (
                  <p style={{ color: '#27ae60', fontWeight: 'bold' }}><strong>Monto Aprobado Seguro:</strong> Bs. {otSeleccionada.monto_aprobado_seguro}</p>
                )}
              </div>

              <h4>Estado de Fases:</h4>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
                {detalleFases.map(fase => (
                  <li key={fase.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                    <span>{fase.nombre_fase}</span>
                    <span style={{ fontWeight: 'bold', color: fase.estado === 'FINALIZADO' ? '#27ae60' : '#f39c12' }}>{fase.estado}</span>
                  </li>
                ))}
              </ul>

              <h4 style={{ borderTop: '2px solid #1e4b8f', paddingTop: '20px', color: '#1e4b8f' }}>Registrar Gastos Extra:</h4>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Descripción..." value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '150px' }} />
                <input type="number" placeholder="Bs." value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} style={{ width: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                <button onClick={agregarGasto} style={{ padding: '10px 20px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Agregar</button>
              </div>

              {gastosExtra.length > 0 && (
                <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                  <strong>Gastos Registrados:</strong>
                  <ul style={{ paddingLeft: '20px', margin: '10px 0 0 0' }}>
                    {gastosExtra.map(g => (
                      <li key={g.id} style={{ marginBottom: '5px' }}>{g.descripcion} - Bs. {g.monto}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}