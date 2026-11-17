import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function OrdenesTrabajo() {
  const [recepciones, setRecepciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [ordenesCreadas, setOrdenesCreadas] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Búsqueda
  const [busqueda, setBusqueda] = useState('');

  // Estados para el panel de detalle
  const [otSeleccionada, setOtSeleccionada] = useState(null);
  const [detalleFases, setDetalleFases] = useState([]);
  const [adicionales, setAdicionales] = useState([]); // Aquí guardaremos piezas y mano de obra
  
  // Formulario de Adicionales
  const [nuevoAdicional, setNuevoAdicional] = useState({ tipo: 'REPUESTO', descripcion: '', monto: '' });
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });

  const [nuevaOT, setNuevaOT] = useState({ recepcion_id: '', empleado_id: '', fecha_estimada_entrega: '', observaciones: '' });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: recData } = await supabase.from('recepciones').select(`id, cliente_nombre, vehiculo_id, vehiculos (placa, marca, modelo)`);
    const { data: otData } = await supabase.from('ordenes_trabajo').select('recepcion_id');
    const recepcionesConOT = otData?.map(ot => ot.recepcion_id) || [];
    if (recData) setRecepciones(recData.filter(rec => !recepcionesConOT.includes(rec.id)));

    const { data: empData } = await supabase.from('empleados').select('id, nombre, cargo');
    if (empData) setEmpleados(empData);

    const { data: ordenesData } = await supabase.from('ordenes_trabajo').select(`*, vehiculos (placa, marca, modelo), empleados (nombre)`).order('fecha_asignacion', { ascending: false });
    if (ordenesData) setOrdenesCreadas(ordenesData);
  };

    const crearOT = async (e) => {
    e.preventDefault();
    if (!nuevaOT.recepcion_id || !nuevaOT.empleado_id) return alert("Seleccione vehículo y empleado");

    const recepcion = recepciones.find(r => r.id === nuevaOT.recepcion_id);
    // AQUÍ BUSCAMOS AL EMPLEADO PARA SABER SU CARGO
    const empleado = empleados.find(emp => emp.id === nuevaOT.empleado_id);

    const { data: proforma } = await supabase.from('proformas').select('total').eq('vehiculo_id', recepcion.vehiculo_id).order('fecha', { ascending: false }).limit(1);
    const totalProforma = proforma && proforma.length > 0 ? proforma[0].total : 0;

    const { data: otGuardada, error } = await supabase.from('ordenes_trabajo').insert([{
      recepcion_id: nuevaOT.recepcion_id, vehiculo_id: recepcion.vehiculo_id, empleado_id: nuevaOT.empleado_id,
      fecha_estimada_entrega: nuevaOT.fecha_estimada_entrega || null, observaciones: nuevaOT.observaciones.toUpperCase(), proforma_total: totalProforma
    }]).select();

    if (error) return alert("Error: " + error.message);

    // LÓGICA DE FASES SEGÚN EL CARGO
    let fases = [];
    if (empleado.cargo === 'MECANICO') {
      fases = ['DIAGNOSTICO', 'PRESUPUESTO', 'REPARACION', 'PRUEBA', 'FINALIZADO'];
    } else {
      fases = ['CHAPERIO', 'PREPARADO', 'PINTURA', 'PULIDO', 'ARMADO', 'LAVADO'];
    }

    await supabase.from('ot_fases').insert(fases.map(fase => ({ ot_id: otGuardada[0].id, nombre_fase: fase, estado: 'PENDIENTE' })));

    alert("¡Orden creada exitosamente!");
    setMostrarFormulario(false);
    setNuevaOT({ recepcion_id: '', empleado_id: '', fecha_estimada_entrega: '', observaciones: '' });
    cargarDatos();
  };

  const abrirDetalle = async (ot) => {
    setOtSeleccionada(ot);
    const { data: fases } = await supabase.from('ot_fases').select('*').eq('ot_id', ot.id);
    setDetalleFases(fases || []);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Órdenes de Trabajo</h2>
        <button onClick={() => setMostrarFormulario(true)} style={{ padding: '10px 20px', background: '#1e4b8f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>+ Asignar Nueva Orden</button>
      </div>

      {mostrarFormulario && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Nueva Asignación</h3>
          <form onSubmit={crearOT} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
            <select value={nuevaOT.recepcion_id} onChange={e => setNuevaOT({...nuevaOT, recepcion_id: e.target.value})} required style={{ padding: '10px' }}>
              <option value="">Seleccione vehículo...</option>
              {recepciones.map(rec => <option key={rec.id} value={rec.id}>{rec.vehiculos?.placa}</option>)}
            </select>
            <select value={nuevaOT.empleado_id} onChange={e => setNuevaOT({...nuevaOT, empleado_id: e.target.value})} required style={{ padding: '10px' }}>
              <option value="">Seleccione empleado...</option>
              {empleados.filter(e => ['CHAPISTA', 'MECANICO'].includes(e.cargo)).map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
            </select>
            <input type="date" value={nuevaOT.fecha_estimada_entrega} onChange={e => setNuevaOT({...nuevaOT, fecha_estimada_entrega: e.target.value})} style={{ padding: '10px' }} />
            <textarea placeholder="Observaciones..." value={nuevaOT.observaciones} onChange={e => setNuevaOT({...nuevaOT, observaciones: e.target.value})} style={{ padding: '10px' }} />
            <button type="submit" style={{ padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px' }}>Guardar</button>
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
                <td style={{ padding: '10px' }}>Bs. {ot.proforma_total}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ padding: '3px 8px', background: ot.estado === 'FINALIZADO' ? '#27ae60' : (ot.estado === 'EN_PROCESO' ? '#f39c12' : '#3498db'), color: 'white', borderRadius: '3px', fontSize: '12px' }}>{ot.estado}</span>
                </td>
                <td style={{ padding: '10px' }}><button onClick={() => abrirDetalle(ot)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Ver Detalle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PANEL DE DETALLE CORREGIDO Y AMPLIADO */}
      {otSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '700px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)' }}>
            
            {/* CABECERA FIJA */}
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', zIndex: 10 }}>
              <h3 style={{ margin: 0, color: '#1e4b8f' }}>Detalle OT: {otSeleccionada.vehiculos?.placa}</h3>
              <button onClick={() => setOtSeleccionada(null)} style={{ background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', padding: '8px 15px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar</button>
            </div>

            {/* CONTENIDO CON SCROLL */}
            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              
              <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                <p><strong>Observación del Chapista:</strong> {otSeleccionada.observacion_chapista || 'Sin observaciones.'}</p>
                <p><strong>Total Proforma Original:</strong> Bs. {otSeleccionada.proforma_total}</p>
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

              <h4 style={{ borderTop: '2px solid #1e4b8f', paddingTop: '20px', color: '#1e4b8f' }}>Proforma Adicional (Daños Ocultos):</h4>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>Registre repuestos o mano de obra encontrados al desarmar.</p>
              
              {/* FORMULARIO DE ADICIONALES CON SELECTOR TIPO */}
              <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <select value={nuevoAdicional.tipo} onChange={e => setNuevoAdicional({...nuevoAdicional, tipo: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                  <option value="REPUESTO">REPUESTO</option>
                  <option value="MANO_DE_OBRA">MANO DE OBRA</option>
                </select>
                <input type="text" placeholder="Descripción..." value={nuevoAdicional.descripcion} onChange={e => setNuevoAdicional({...nuevoAdicional, descripcion: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '150px' }} />
                <input type="number" placeholder="Bs." value={nuevoAdicional.monto} onChange={e => setNuevoAdicional({...nuevoAdicional, monto: e.target.value})} style={{ width: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                <button onClick={agregarAdicional} style={{ padding: '10px 20px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Agregar</button>
              </div>
              
              {adicionales.length > 0 && (
                <ul style={{ paddingLeft: '20px', marginBottom: '20px', background: '#fff3e0', padding: '15px', borderRadius: '5px' }}>
                  {adicionales.map(r => (
                    <li key={r.id} style={{ marginBottom: '5px' }}>
                      <strong>[{r.tipo === 'REPUESTO' ? 'REP' : 'M.O.'}] {r.descripcion}</strong> - Bs. {r.monto}
                    </li>
                  ))}
                </ul>
              )}

              <h4 style={{ borderTop: '2px solid #1e4b8f', paddingTop: '20px', color: '#1e4b8f' }}>Gastos Extra (Secretaría):</h4>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>Registre compras de insumos, seguros o gastos no contemplados.</p>
              
              <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Descripción del gasto..." value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '150px' }} />
                <input type="number" placeholder="Bs." value={nuevoGasto.monto} onChange={e => setNuevoGasto({...nuevoGasto, monto: e.target.value})} style={{ width: '100px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                <button onClick={() => alert("Guardado (Lógica pendiente)")} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}