import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MiTaller() {
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [ordenes, setOrdenes] = useState([]);
  const [cargoActual, setCargoActual] = useState(''); 
  
  // Estados para el modal de solicitudes
  const [modalMaterialAbierto, setModalMaterialAbierto] = useState(false);
  const [otSeleccionada, setOtSeleccionada] = useState(null);
  const [tipoSolicitud, setTipoSolicitud] = useState('REPUESTO');
  const [listaMaterialesOriginal, setListaMaterialesOriginal] = useState([]);
  const [listaMaterialesFiltrada, setListaMaterialesFiltrada] = useState([]);
  
  // Carrito
  const [carrito, setCarrito] = useState([]);
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    cargarEmpleados();
  }, []);

  useEffect(() => {
    if (empleadoSeleccionado) {
      const emp = empleados.find(e => e.id === empleadoSeleccionado);
      setCargoActual(emp ? emp.cargo : '');
      cargarMisOrdenes(empleadoSeleccionado);
    } else {
      setOrdenes([]);
      setCargoActual('');
    }
  }, [empleadoSeleccionado, empleados]);

  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('*');
    if (data) setEmpleados(data);
  };

   const cargarMisOrdenes = async (empId) => {
    // AQUÍ ESTÁ LA MAGIA: Solo traemos las OTs que NO estén finalizadas ni cerradas
    const { data: ots } = await supabase.from('ordenes_trabajo')
      .select('*')
      .eq('empleado_id', empId)
      .not('estado', 'in', '("FINALIZADO","CERRADO")') 
      .order('fecha_asignacion', { ascending: false });

    if (ots && ots.length > 0) {
      const ordenesCompletas = await Promise.all(ots.map(async (ot) => {
        const { data: veh } = await supabase.from('vehiculos').select('placa, marca, modelo').eq('id', ot.vehiculo_id).single();
        const { data: fases } = await supabase.from('ot_fases').select('*').eq('ot_id', ot.id);
        
        const { data: materiales, error: errMat } = await supabase.from('ot_materiales').select('*').eq('ot_id', ot.id);
        
        let materialesConNombres = [];
        if (materiales && !errMat) {
          materialesConNombres = await Promise.all(materiales.map(async (mat) => {
            let nombre = 'Material';
            if (mat.repuesto_id) {
              const { data: rep } = await supabase.from('recepcion_repuestos').select('nombre_repuesto').eq('id', mat.repuesto_id).single();
              if (rep) nombre = rep.nombre_repuesto;
            } else if (mat.insumo_id) {
              const { data: ins } = await supabase.from('insumos_taller').select('nombre').eq('id', mat.insumo_id).single();
              if (ins) nombre = ins.nombre;
            }
            return { ...mat, nombreMaterial: nombre };
          }));
        }

        return { ...ot, vehiculos: veh, ot_fases: fases || [], ot_materiales: materialesConNombres };
      }));
      setOrdenes(ordenesCompletas);
    } else {
      setOrdenes([]);
    }
  };

  const abrirModalMaterial = async (ot, tipo) => {
    setOtSeleccionada(ot);
    setTipoSolicitud(tipo);
    setModalMaterialAbierto(true);
    setCarrito([]); 
    setMaterialSeleccionado('');
    setCantidad(1);
    
    if (tipo === 'REPUESTO') {
      const { data: profData } = await supabase.from('proformas').select('id, numero_proforma').eq('vehiculo_id', ot.vehiculo_id).order('fecha', { ascending: false }).limit(1);
      
      if (profData && profData.length > 0) {
        const { data: repData } = await supabase.from('proforma_repuestos_solicitados').select('id, descripcion').eq('proforma_id', profData[0].id);
        const { data: llegadas } = await supabase.from('recepcion_repuestos').select('id, nombre_repuesto').eq('numero_proforma', profData[0].numero_proforma).neq('estado', 'RECHAZADO');
        
        if (repData) {
          const repuestosConEstado = repData.map(rep => {
            const llegada = llegadas?.find(l => l.nombre_repuesto.toUpperCase() === rep.descripcion.toUpperCase());
            return { 
              ...rep, 
              id_fisico: llegada ? llegada.id : null, 
              disponible: !!llegada 
            };
          });
          setListaMaterialesOriginal(repuestosConEstado);
          setListaMaterialesFiltrada(repuestosConEstado);
        }
      }
    } else {
      const { data: insData } = await supabase.from('insumos_taller').select('id, nombre, stock_actual').gt('stock_actual', 0);
      if (insData) {
        const insumosFormateados = insData.map(i => ({ ...i, disponible: true, id_fisico: i.id }));
        setListaMaterialesOriginal(insumosFormateados);
        setListaMaterialesFiltrada(insumosFormateados);
      }
    }
  };

  const agregarAlCarrito = () => {
    const materialInfo = listaMaterialesFiltrada.find(m => m.id === materialSeleccionado);
    if (!materialInfo) return alert("Seleccione un material");
    if (!materialInfo.disponible) return alert("⛔ Este repuesto aún no ha llegado al almacén.");

    const nombre = materialInfo.descripcion || materialInfo.nombre;
    const idParaGuardar = materialInfo.id_fisico; 

    setCarrito([...carrito, { id: idParaGuardar, nombre, cantidad, tipo: tipoSolicitud }]);
    
    const nuevaLista = listaMaterialesFiltrada.filter(m => m.id !== materialInfo.id);
    setListaMaterialesFiltrada(nuevaLista);

    setMaterialSeleccionado('');
    setCantidad(1);
  };

  const eliminarDelCarrito = (index) => {
    const nuevoCarrito = [...carrito];
    const itemEliminado = nuevoCarrito.splice(index, 1)[0];
    
    const materialOriginal = listaMaterialesOriginal.find(m => m.id_fisico === itemEliminado.id);
    if (materialOriginal) {
      setListaMaterialesFiltrada([...listaMaterialesFiltrada, materialOriginal]);
    }

    setCarrito(nuevoCarrito);
  };

  const enviarSolicitudMultiple = async () => {
    if (carrito.length === 0) return alert("La canasta está vacía");

    const solicitudes = carrito.map(item => ({
      ot_id: otSeleccionada.id,
      repuesto_id: item.tipo === 'REPUESTO' ? item.id : null,
      insumo_id: item.tipo === 'INSUMO' ? item.id : null,
      cantidad_solicitada: item.cantidad
    }));

    const { error } = await supabase.from('ot_materiales').insert(solicitudes);
    if (error) return alert("Error: " + error.message);

    alert(`¡Se enviaron ${carrito.length} solicitudes al Almacén!`);
    setModalMaterialAbierto(false);
    cargarMisOrdenes(empleadoSeleccionado);
  };

  const cambiarEstadoFase = async (faseId, nuevoEstado, otId) => {
    await supabase.from('ot_fases').update({ 
      estado: nuevoEstado,
      fecha_inicio: nuevoEstado === 'EN_PROCESO' ? new Date().toISOString() : null,
      fecha_fin: nuevoEstado === 'FINALIZADO' ? new Date().toISOString() : null
    }).eq('id', faseId);

    const { data: fasesActuales } = await supabase.from('ot_fases').select('estado').eq('ot_id', otId);
    if (fasesActuales) {
      const nuevoAvance = Math.round((fasesActuales.filter(f => f.estado === 'FINALIZADO').length / fasesActuales.length) * 100);
      const nuevoEstadoOT = nuevoAvance === 100 ? 'FINALIZADO' : 'EN_PROCESO';
      await supabase.from('ordenes_trabajo').update({ avance: nuevoAvance, estado: nuevoEstadoOT }).eq('id', otId);
    }
    cargarMisOrdenes(empleadoSeleccionado);
  };

  const agregarObservacion = async (otId, texto) => {
    await supabase.from('ordenes_trabajo').update({ observacion_chapista: texto.toUpperCase() }).eq('id', otId);
    alert("Observación guardada");
  };

  const styles = {
    card: { background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '12px', overflow: 'hidden', border: '1px solid #e1e8ed' },
    headerCard: { padding: '12px 15px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    placa: { margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '800', letterSpacing: '0.5px' },
    modelo: { fontSize: '11px', color: '#64748b', marginTop: '0px' },
    avanceNum: { fontSize: '18px', fontWeight: '900', color: '#10b981' },
    faseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 15px', borderBottom: '1px solid #f8fafc' },
    faseNombre: { fontSize: '12px', fontWeight: '600', color: '#334155' },
    btnIniciar: { padding: '4px 12px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
    btnTerminar: { padding: '4px 12px', background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
    btnPedirRepuesto: { flex: 1, padding: '8px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px' },
    btnPedirInsumo: { flex: 1, padding: '8px', background: '#f3e8ff', color: '#9333ea', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px' }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '20px' }}>
      
      <div style={{ background: '#fff', padding: '15px 20px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>👤 Simulador de Login:</span>
        <select value={empleadoSeleccionado} onChange={e => setEmpleadoSeleccionado(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
          <option value="">Seleccionar Trabajador...</option>
          {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.cargo})</option>)}
        </select>
      </div>

      {!empleadoSeleccionado ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
          <h3>Selecciona un usuario para ver sus tareas</h3>
        </div>
      ) : ordenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
          <h3>No hay vehículos asignados a este trabajador</h3>
        </div>
      ) : (
        // AQUI ESTA EL CAMBIO CLAVE: GRID DE 2 COLUMNAS
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '15px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ gridColumn: '1 / -1', background: cargoActual === 'MECANICO' ? '#e0f2fe' : '#fce7f3', padding: '10px 20px', borderRadius: '8px', marginBottom: '5px', color: cargoActual === 'MECANICO' ? '#0369a1' : '#be185d', fontWeight: 'bold', textAlign: 'center' }}>
            Flujo de Trabajo: {cargoActual}
          </div>

          {ordenes.map(ot => {
            const avance = ot.ot_fases.length === 0 ? 0 : Math.round((ot.ot_fases.filter(f => f.estado === 'FINALIZADO').length / ot.ot_fases.length) * 100);
            
            return (
              <div key={ot.id} style={styles.card}>
                
                <div style={styles.headerCard}>
                  <div>
                    <h3 style={styles.placa}>🚘 {ot.vehiculos?.placa}</h3>
                    <div style={styles.modelo}>{ot.vehiculos?.marca} {ot.vehiculos?.modelo}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={styles.avanceNum}>{avance}%</div>
                    <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${avance}%`, height: '100%', background: avance === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>
                </div>

                <div>
                  {ot.ot_fases.map(fase => (
                    <div key={fase.id} style={styles.faseRow}>
                      <span style={{ ...styles.faseNombre, color: fase.estado === 'FINALIZADO' ? '#10b981' : '#334155' }}>
                        {fase.estado === 'FINALIZADO' ? '✅' : (fase.estado === 'EN_PROCESO' ? '🔄' : '⏳')} {fase.nombre_fase}
                      </span>
                      
                      {fase.estado === 'PENDIENTE' && (
                        <button onClick={() => cambiarEstadoFase(fase.id, 'EN_PROCESO', ot.id)} style={styles.btnIniciar}>▶ Iniciar</button>
                      )}
                      {fase.estado === 'EN_PROCESO' && (
                        <button onClick={() => cambiarEstadoFase(fase.id, 'FINALIZADO', ot.id)} style={styles.btnTerminar}>✔ Terminar</button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ padding: '10px 15px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button onClick={() => abrirModalMaterial(ot, 'REPUESTO')} style={styles.btnPedirRepuesto}>📦 Repuestos</button>
                    <button onClick={() => abrirModalMaterial(ot, 'INSUMO')} style={styles.btnPedirInsumo}>🛠️ Insumos</button>
                  </div>

                  {ot.observacion_chapista && ot.observacion_chapista.includes('RECHAZADO') && (
                    <div style={{ background: '#f8d7da', color: '#721c24', padding: '8px', borderRadius: '5px', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                      ⚠️ {ot.observacion_chapista}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                    <input type="text" placeholder="Observación..." value={ot.observacion_chapista || ''} onChange={(e) => {
                      const nuevas = ordenes.map(o => o.id === ot.id ? {...o, observacion_chapista: e.target.value} : o);
                      setOrdenes(nuevas);
                    }} style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', background: '#fff', outline: 'none' }} />
                    <button onClick={() => agregarObservacion(ot.id, ot.observacion_chapista)} style={{ padding: '6px 12px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                  </div>

                  {ot.ot_materiales.length > 0 && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Solicitudes:</span>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '15px', fontSize: '11px', color: '#475569' }}>
                        {ot.ot_materiales.map(mat => (
                          <li key={mat.id}>
                            {mat.cantidad_solicitada}x {mat.nombreMaterial} 
                            <span style={{ float: 'right', fontWeight: 'bold', color: mat.estado === 'ENTREGADO' ? '#10b981' : '#f59e0b' }}>{mat.estado}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE SOLICITUD */}
      {modalMaterialAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '20px' }}>
              {tipoSolicitud === 'REPUESTO' ? '📦 Pedir Repuestos' : '🛠️ Pedir Insumos'}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexDirection: 'column' }}>
              <select value={materialSeleccionado} onChange={e => setMaterialSeleccionado(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px', outline: 'none' }}>
                <option value="">Seleccionar {tipoSolicitud === 'REPUESTO' ? 'Repuesto' : 'Insumo'}...</option>
                {listaMaterialesFiltrada.map(mat => (
                  <option key={mat.id} value={mat.id} disabled={!mat.disponible}>
                    {mat.disponible ? '🟢' : '🔴'} {mat.descripcion || mat.nombre} {!mat.disponible ? '(No ha llegado)' : ''}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px', outline: 'none' }} />
                <button onClick={agregarAlCarrito} style={{ flex: 2, padding: '0 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>Agregar al Carrito</button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '15px', maxHeight: '200px', overflowY: 'auto', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>LISTA DE SOLICITUD ({carrito.length})</span>
              {carrito.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>Aún no has agregado materiales.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {carrito.map((item, index) => (
                    <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#334155' }}>
                      <span><strong style={{ color: '#3b82f6' }}>{item.cantidad}x</strong> {item.nombre}</span>
                      <button onClick={() => eliminarDelCarrito(index)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalMaterialAbierto(false)} style={{ flex: 1, padding: '14px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontWeight: 'bold', color: '#64748b' }}>Cancelar</button>
              <button onClick={enviarSolicitudMultiple} disabled={carrito.length === 0} style={{ flex: 2, padding: '14px', background: carrito.length === 0 ? '#cbd5e1' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: carrito.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: carrito.length > 0 ? '0 4px 10px rgba(16, 185, 129, 0.3)' : 'none' }}>
                Enviar Solicitud ({carrito.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}