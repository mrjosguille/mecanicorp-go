import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function Almacen() {
  // --- ROL DEL USUARIO (Simulación) ---
  const [rolActual, setRolActual] = useState('ALMACENERO'); 

  // --- ESTADOS DE PESTAÑAS ---
  const [pestanaActiva, setPestanaActiva] = useState('REPUESTOS');
  
  // --- ESTADOS BÚSQUEDA POR PLACA ---
  const [placaBusqueda, setPlacaBusqueda] = useState('');
  const [vehiculosEncontrados, setVehiculosEncontrados] = useState([]);
  const [proformasVehiculo, setProformasVehiculo] = useState([]);
  const [proformaSeleccionada, setProformaSeleccionada] = useState(null);
  
  // --- ESTADOS DETALLE DE PROFORMA ---
  const [repuestosProforma, setRepuestosProforma] = useState([]);
  const [recepcionesGuardadas, setRecepcionesGuardadas] = useState([]);
  
  // --- ESTADOS MODAL RECEPCIÓN ---
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState(null);
  const [estadoLlegada, setEstadoLlegada] = useState('COMPLETO');
  const [obsLlegada, setObsLlegada] = useState('');
  const [cantidadRecibida, setCantidadRecibida] = useState(1);

  // --- NUEVOS ESTADOS PARA INVENTARIO ---
  const [insumos, setInsumos] = useState([]);
  const [insumoSeleccionadoId, setInsumoSeleccionadoId] = useState('');
  const [cantidadIngreso, setCantidadIngreso] = useState("");
  const [precioIngreso, setPrecioIngreso] = useState("");
  const [historialInventario, setHistorialInventario] = useState([]);

  // --- ESTADOS MODAL NUEVO INSUMO ---
  const [modalNuevoInsumo, setModalNuevoInsumo] = useState(false);
  const [nuevoInsumoForm, setNuevoInsumoForm] = useState({ nombre: '', precio_unitario: "", stock_minimo: "" });

  // --- ESTADOS HISTORIAL E INVENTARIO ---
  const [historialRecepciones, setHistorialRecepciones] = useState([]);
  const [filtroHistorial, setFiltroHistorial] = useState('');

  // --- ESTADOS SOLICITUDES Y ENTREGAS ---
  const [solicitudes, setSolicitudes] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [historialEntregas, setHistorialEntregas] = useState([]); 
  
  // --- BUSCADORES ---
  const [filtroSolicitudes, setFiltroSolicitudes] = useState('');
  const [filtroEntregas, setFiltroEntregas] = useState('');
  
  // Modales Generales
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false);
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);
  const [firmaUrlSeleccionada, setFirmaUrlSeleccionada] = useState('');
  
  const [firmaDataUrl, setFirmaDataUrl] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Cargar datos iniciales según el rol
  useEffect(() => {
    if (rolActual === 'ALMACENERO') {
      setPestanaActiva('REPUESTOS');
      cargarPendientes();
    } else {
      setPestanaActiva('INSUMOS');
      cargarInsumos();
      cargarHistorialInventario();
    }
  }, [rolActual]);

  useEffect(() => {
    if (pestanaActiva === 'INSUMOS') { cargarInsumos(); cargarHistorialInventario(); }
    if (pestanaActiva === 'INVENTARIO') cargarHistorial();
    if (pestanaActiva === 'SOLICITUDES') cargarSolicitudes();
    if (pestanaActiva === 'ENTREGAS') cargarHistorialEntregas();
  }, [pestanaActiva]);

  // --- LÓGICA DE FIRMA ---
  useEffect(() => {
    if (modalEntregaAbierto && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      const getCoordinates = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      };

      const startDrawing = (e) => { e.preventDefault(); setIsDrawing(true); const { x, y } = getCoordinates(e); ctx.beginPath(); ctx.moveTo(x, y); };
      const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const { x, y } = getCoordinates(e); ctx.lineTo(x, y); ctx.stroke(); };
      const stopDrawing = () => { setIsDrawing(false); };

      canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseleave', stopDrawing);
      canvas.addEventListener('touchstart', startDrawing, { passive: false }); canvas.addEventListener('touchmove', draw, { passive: false }); canvas.addEventListener('touchend', stopDrawing);

      return () => {
        canvas.removeEventListener('mousedown', startDrawing); canvas.removeEventListener('mousemove', draw); canvas.removeEventListener('mouseup', stopDrawing); canvas.removeEventListener('mouseleave', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing); canvas.removeEventListener('touchmove', draw); canvas.removeEventListener('touchend', stopDrawing);
      };
    }
  }, [modalEntregaAbierto, isDrawing]);

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDataUrl('');
  };

  // --- CARGAR DATOS REPUESTOS ---
  const cargarPendientes = async () => {
    const { data: repuestos } = await supabase.from('proforma_repuestos_solicitados').select(`*, proformas ( numero_proforma, vehiculos (placa, marca, modelo), clientes (nombre) )`);
    const { data: recepciones } = await supabase.from('recepcion_repuestos').select('*');

    if (repuestos && recepciones) {
      const pendientes = repuestos.filter(r => !recepciones.find(rec => rec.proforma_repuesto_id === r.id)).map(r => ({
        ...r, placa: r.proformas?.vehiculos?.placa || 'SIN PLACA', modelo: `${r.proformas?.vehiculos?.marca} ${r.proformas?.vehiculos?.modelo}`,
        numero_proforma: r.proformas?.numero_proforma, cliente: r.proformas?.clientes?.nombre || 'SIN CLIENTE'
      }));
      setTodosLosPendientes(pendientes);
      setResultadosBusqueda(pendientes);
    }
  };

  const [busqueda, setBusqueda] = useState('');
  const [todosLosPendientes, setTodosLosPendientes] = useState([]);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  const handleBusqueda = (texto) => {
    setBusqueda(texto.toUpperCase());
    if (texto.trim() === '') { setResultadosBusqueda(todosLosPendientes); return; }
    const filtrados = todosLosPendientes.filter(r => r.placa.includes(texto.toUpperCase()) || r.numero_proforma?.toString().includes(texto) || r.descripcion.toUpperCase().includes(texto.toUpperCase()) || r.cliente.toUpperCase().includes(texto.toUpperCase()));
    setResultadosBusqueda(filtrados);
  };

  const abrirModalRecepcion = (rep) => {
    setRepuestoSeleccionado(rep);
    setEstadoLlegada('COMPLETO');
    setCantidadRecibida(1);
    setObsLlegada('');
  };

  const guardarRecepcion = async () => {
    const { error } = await supabase.from('recepcion_repuestos').insert([{
      proforma_repuesto_id: repuestoSeleccionado.id, estado: estadoLlegada, cantidad_recibida: parseInt(cantidadRecibida) || 1,
      observaciones: obsLlegada, nombre_repuesto: repuestoSeleccionado.descripcion, placa_vehiculo: repuestoSeleccionado.placa, numero_proforma: repuestoSeleccionado.numero_proforma
    }]);
    if (error) return alert("Error: " + error.message);

    if (estadoLlegada !== 'RECHAZADO') {
      const { data: existe } = await supabase.from('inventario_repuestos').select('*').ilike('nombre', repuestoSeleccionado.descripcion).limit(1);
      if (existe && existe.length > 0) {
        await supabase.from('inventario_repuestos').update({ stock_actual: existe[0].stock_actual + (parseInt(cantidadRecibida) || 1) }).eq('id', existe[0].id);
      } else {
        await supabase.from('inventario_repuestos').insert([{ nombre: repuestoSeleccionado.descripcion, stock_actual: parseInt(cantidadRecibida) || 1 }]);
      }
    }
    alert("Recepción guardada.");
    setRepuestoSeleccionado(null);
    cargarPendientes(); 
  };

  // --- LÓGICA DE INSUMOS ---
  const cargarInsumos = async () => {
    const { data } = await supabase.from('insumos_taller').select('*').order('nombre');
    if (data) setInsumos(data);
  };

  const cargarHistorialInventario = async () => {
    const { data } = await supabase.from('inventario_movimientos')
      .select('*, insumos_taller(nombre)')
      .order('fecha', { ascending: false }).limit(50);
    if (data) setHistorialInventario(data);
  };

  const guardarNuevoInsumo = async (e) => {
    e.preventDefault();
    if (!nuevoInsumoForm.nombre) return alert("El nombre es obligatorio");
    
    await supabase.from('insumos_taller').insert([{
      nombre: nuevoInsumoForm.nombre.toUpperCase(),
      stock_actual: 0, 
      precio_unitario: parseFloat(nuevoInsumoForm.precio_unitario) || 0,
      stock_minimo: parseFloat(nuevoInsumoForm.stock_minimo) || 0
    }]);
    
    alert("Insumo añadido al catálogo. Ahora puedes registrar su ingreso.");
    setModalNuevoInsumo(false);
    setNuevoInsumoForm({ nombre: '', precio_unitario: "", stock_minimo: "" });
    cargarInsumos();
  };

  const registrarIngreso = async (e) => {
    e.preventDefault();
    const cant = parseFloat(cantidadIngreso) || 0;
    const prec = parseFloat(precioIngreso) || 0;

    if (!insumoSeleccionadoId) return alert("Seleccione un insumo");
    if (cant <= 0) return alert("Ingrese una cantidad válida");

    const insumoActual = insumos.find(i => i.id === insumoSeleccionadoId);
    const nuevoStock = insumoActual.stock_actual + cant;
    
    // 1. Actualizar Stock y Precio
    await supabase.from('insumos_taller').update({
      stock_actual: nuevoStock,
      precio_unitario: prec > 0 ? prec : insumoActual.precio_unitario
    }).eq('id', insumoSeleccionadoId);

    // 2. Guardar en el historial
    await supabase.from('inventario_movimientos').insert([{
      insumo_id: insumoSeleccionadoId,
      tipo_movimiento: 'INGRESO',
      cantidad: cant,
      motivo: 'Compra / Llegada a Bodega'
    }]);

    alert(`✅ Se sumaron ${cant} unidades al stock de ${insumoActual.nombre}`);
    
    setInsumoSeleccionadoId('');
    setCantidadIngreso("");
    setPrecioIngreso("");
    
    cargarInsumos();
    cargarHistorialInventario();
  };

  const cargarHistorial = async () => {
    const { data } = await supabase.from('recepcion_repuestos').select('*').order('fecha', { ascending: false });
    if (data) setHistorialRecepciones(data);
  };

  const cargarSolicitudes = async () => {
    const { data: solData } = await supabase.from('ot_materiales').select('*').eq('estado', 'PENDIENTE');
    if (solData && solData.length > 0) {
      const completas = await Promise.all(solData.map(async (sol) => {
        const { data: ot } = await supabase.from('ordenes_trabajo').select('*, vehiculos(placa, marca, modelo), empleados(id, nombre)').eq('id', sol.ot_id).single();
        let nombreMaterial = 'Material';
        let esInsumo = false;
        
        if (sol.repuesto_id) {
          const { data: rep } = await supabase.from('recepcion_repuestos').select('nombre_repuesto').eq('id', sol.repuesto_id).single();
          if (rep) nombreMaterial = rep.nombre_repuesto;
        } else if (sol.insumo_id) {
          const { data: ins } = await supabase.from('insumos_taller').select('nombre').eq('id', sol.insumo_id).single();
          if (ins) { nombreMaterial = ins.nombre; esInsumo = true; }
        }
        return { ...sol, ordenInfo: ot, nombreMaterial, esInsumo };
      }));
      setSolicitudes(completas);
    } else setSolicitudes([]);
  };

  const cargarHistorialEntregas = async () => {
    const { data: actasData } = await supabase.from('actas_entrega').select('*').order('fecha_entrega', { ascending: false });
    
    if (actasData && actasData.length > 0) {
      const completas = await Promise.all(actasData.map(async (acta) => {
        const { data: mats } = await supabase.from('ot_materiales').select('*').eq('acta_id', acta.id);
        
        const detalles = await Promise.all(mats.map(async (mat) => {
            const { data: ot } = await supabase.from('ordenes_trabajo').select('*, vehiculos(placa), empleados(nombre)').eq('id', mat.ot_id).single();
            let nombreMaterial = 'Material';
            let esInsumo = false;

            if (mat.repuesto_id) {
              const { data: rep } = await supabase.from('recepcion_repuestos').select('nombre_repuesto').eq('id', mat.repuesto_id).single();
              if (rep) nombreMaterial = rep.nombre_repuesto;
            } else if (mat.insumo_id) {
              const { data: ins } = await supabase.from('insumos_taller').select('nombre').eq('id', mat.insumo_id).single();
              if (ins) { nombreMaterial = ins.nombre; esInsumo = true; }
            }
            return { ...mat, placa: ot?.vehiculos?.placa, empleado: ot?.empleados?.nombre, nombreMaterial, esInsumo };
        }));

        const actaEsDeInsumo = detalles.length > 0 ? detalles[0].esInsumo : false;
        return { ...acta, detalles, actaEsDeInsumo };
      }));

      const entregasFiltradasPorRol = completas.filter(acta => {
        if (rolActual === 'ALMACENERO') return !acta.actaEsDeInsumo;
        if (rolActual === 'BODEGUERO') return acta.actaEsDeInsumo;
        return true; 
      });

      setHistorialEntregas(entregasFiltradasPorRol);
    } else {
      setHistorialEntregas([]);
    }
  };

  // --- LÓGICA DE ENTREGA MÚLTIPLE ---
  const toggleSeleccion = (id) => {
    if (seleccionadas.includes(id)) setSeleccionadas(seleccionadas.filter(item => item !== id));
    else setSeleccionadas([...seleccionadas, id]);
  };

  const abrirEntregaMultiple = () => {
    if (seleccionadas.length === 0) return alert("Seleccione al menos una solicitud.");
    const solicitudesSeleccionadas = solicitudes.filter(s => seleccionadas.includes(s.id));
    const empleadosIds = [...new Set(solicitudesSeleccionadas.map(s => s.ordenInfo.empleados.id))];
    if (empleadosIds.length > 1) return alert("Seleccione solo materiales de un mismo empleado para firmar un acta.");
    setModalEntregaAbierto(true);
    setFirmaDataUrl('');
    setTimeout(() => { if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }, 100);
  };

  const confirmarEntregaMultiple = async () => {
    if (!firmaDataUrl) return alert("Se requiere la firma del chapista.");
    const solicitudesSeleccionadas = solicitudes.filter(s => seleccionadas.includes(s.id));
    const empleadoId = solicitudesSeleccionadas[0].ordenInfo.empleados.id;

    const fileName = `firma_${Date.now()}.png`;
    const res = await fetch(firmaDataUrl);
    const blob = await res.blob();
    const { error: uploadError } = await supabase.storage.from('recepciones_fotos').upload(fileName, blob);
    
    let urlFirma = '';
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('recepciones_fotos').getPublicUrl(fileName);
      urlFirma = urlData.publicUrl;
    }

    const { data: actaData, error: actaError } = await supabase.from('actas_entrega').insert([{
        empleado_id: empleadoId, entregado_por: rolActual, firma_receptor: urlFirma
    }]).select();

    if (actaError) return alert("Error al crear acta: " + actaError.message);

    const { error: updateError } = await supabase.from('ot_materiales')
        .update({ estado: 'ENTREGADO', fecha_entrega: new Date().toISOString(), acta_id: actaData[0].id })
        .in('id', seleccionadas);

    if (updateError) return alert("Error al actualizar materiales: " + updateError.message);

    alert("✅ Entrega registrada correctamente.");
    setModalEntregaAbierto(false);
    setSeleccionadas([]);
    cargarSolicitudes();
    cargarHistorialEntregas();
  };

  // --- FILTRADOS ---
  const solicitudesFiltradas = solicitudes.filter(sol => {
    if (rolActual === 'ALMACENERO' && sol.esInsumo) return false;
    if (rolActual === 'BODEGUERO' && !sol.esInsumo) return false;
    return true;
  });

  const solicitudesFiltradasPorTexto = solicitudesFiltradas.filter(sol => {
    const texto = filtroSolicitudes.toUpperCase();
    return (
      sol.ordenInfo?.vehiculos?.placa?.toUpperCase().includes(texto) ||
      sol.ordenInfo?.empleados?.nombre?.toUpperCase().includes(texto) ||
      sol.nombreMaterial?.toUpperCase().includes(texto)
    );
  });

  const historialEntregasFiltrado = historialEntregas.filter(acta => {
    const texto = filtroEntregas.toUpperCase();
    const coincideEmpleado = acta.detalles[0]?.empleado?.toUpperCase().includes(texto);
    const coincidePlaca = acta.detalles.some(d => d.placa?.toUpperCase().includes(texto));
    return coincideEmpleado || coincidePlaca;
  });

  return (
    <div>
      {/* SELECTOR DE ROL (Simulación Login) */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Módulo de Inventario</h2>
        <div>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Simular Ingreso como:</label>
          <select value={rolActual} onChange={e => setRolActual(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}>
            <option value="ALMACENERO">Almacenero (Repuestos)</option>
            <option value="BODEGUERO">Bodeguero (Insumos)</option>
          </select>
        </div>
      </div>

      {/* PESTAÑAS DINÁMICAS SEGÚN ROL */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {rolActual === 'ALMACENERO' && (
          <>
            <button onClick={() => { setPestanaActiva('REPUESTOS'); cargarPendientes(); }} style={{ padding: '10px 20px', background: pestanaActiva === 'REPUESTOS' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>1. Recepción Repuestos</button>
            <button onClick={() => setPestanaActiva('INVENTARIO')} style={{ padding: '10px 20px', background: pestanaActiva === 'INVENTARIO' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>2. Historial Llegadas</button>
          </>
        )}
        {rolActual === 'BODEGUERO' && (
          <button onClick={() => setPestanaActiva('INSUMOS')} style={{ padding: '10px 20px', background: pestanaActiva === 'INSUMOS' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>1. Bodega Insumos</button>
        )}
        <button onClick={() => setPestanaActiva('SOLICITUDES')} style={{ padding: '10px 20px', background: pestanaActiva === 'SOLICITUDES' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>2. Solicitudes Pendientes</button>
<button onClick={() => setPestanaActiva('ENTREGAS')} style={{ padding: '10px 20px', background: pestanaActiva === 'ENTREGAS' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>3. Historial Entregas</button>
      </div>

      {/* --- PESTAÑA: REPUESTOS --- */}
      {pestanaActiva === 'REPUESTOS' && rolActual === 'ALMACENERO' && (
         <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3>Control de Llegada de Repuestos</h3>
            <div style={{ marginBottom: '20px', background: '#f0f4ff', padding: '15px', borderRadius: '8px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Buscar:</label>
                <input type="text" placeholder="Placa, Proforma o Nombre..." value={busqueda} onChange={(e) => handleBusqueda(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '2px solid #1e4b8f' }} />
            </div>
            {resultadosBusqueda.length === 0 ? <p>No hay pendientes.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#e0e7ff' }}><th style={{ padding: '10px', textAlign: 'left' }}>Placa</th><th style={{ padding: '10px', textAlign: 'left' }}>Repuesto</th><th style={{ padding: '10px', textAlign: 'center' }}>Acción</th></tr></thead>
                    <tbody>{resultadosBusqueda.map(rep => (<tr key={rep.id} style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '10px', fontWeight: 'bold' }}>{rep.placa}</td><td style={{ padding: '10px' }}>{rep.descripcion}</td><td style={{ padding: '10px', textAlign: 'center' }}><button onClick={() => abrirModalRecepcion(rep)} style={{ padding: '5px 10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Recibir</button></td></tr>))}</tbody>
                </table>
            )}
         </div>
      )}

      {/* --- PESTAÑA: INSUMOS (NUEVO DISEÑO) --- */}
      {pestanaActiva === 'INSUMOS' && rolActual === 'BODEGUERO' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Inventario de Insumos</h3>
            <button onClick={() => setModalNuevoInsumo(true)} style={{ padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
              + Añadir al Catálogo
            </button>
          </div>

          {/* FORMULARIO DE INGRESO */}
          <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0, color: '#166534' }}>📦 Registrar Ingreso de Mercadería</h4>
            <form onSubmit={registrarIngreso} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Seleccionar Insumo:</label>
                <select value={insumoSeleccionadoId} onChange={e => {
                  setInsumoSeleccionadoId(e.target.value);
                  const ins = insumos.find(i => i.id === e.target.value);
                  if (ins) { setPrecioIngreso(ins.precio_unitario); }
                }} style={{ padding: '8px', width: '100%' }} required>
                  <option value="">Seleccione el insumo que llegó...</option>
                  {insumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} (Stock: {ins.stock_actual})</option>)}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '80px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Cant. que llega:</label>
                <input type="number" min="1" placeholder="0" value={cantidadIngreso} onChange={e => setCantidadIngreso(e.target.value)} style={{ padding: '8px', width: '100%' }} required />
              </div>

              <div style={{ flex: 1, minWidth: '80px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Precio (Bs.):</label>
                <input type="number" placeholder="0.00" value={precioIngreso} onChange={e => setPrecioIngreso(e.target.value)} style={{ padding: '8px', width: '100%' }} />
              </div>

              <button type="submit" style={{ padding: '9px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', height: '38px' }}>Registrar Ingreso</button>
            </form>
          </div>

          {/* TABLA DE CATÁLOGO */}
          <h4>Catálogo Actual y Alertas</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '30px' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '10px' }}>Insumo</th>
                <th style={{ padding: '10px' }}>Stock</th>
                <th style={{ padding: '10px' }}>Precio</th>
                <th style={{ padding: '10px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map(ins => {
                const bajoStock = ins.stock_actual <= ins.stock_minimo;
                return (
                  <tr key={ins.id} style={{ borderBottom: '1px solid #ddd', background: bajoStock ? '#fff3cd' : 'white' }}>
                    <td style={{ padding: '10px' }}>{ins.nombre}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: bajoStock ? '#e74c3c' : 'black' }}>{ins.stock_actual}</td>
                    <td style={{ padding: '10px' }}>Bs. {ins.precio_unitario}</td>
                    <td style={{ padding: '10px' }}>
                      {bajoStock ? <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>⚠️ REPONER (Mín: {ins.stock_minimo})</span> : <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ OK</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* HISTORIAL DE MOVIMIENTOS */}
          <h4>Últimos Movimientos de Bodega</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#e2e8f0' }}>
                <th style={{ padding: '10px' }}>Fecha</th>
                <th style={{ padding: '10px' }}>Insumo</th>
                <th style={{ padding: '10px' }}>Tipo</th>
                <th style={{ padding: '10px' }}>Cantidad</th>
                <th style={{ padding: '10px' }}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {historialInventario.map(mov => (
                <tr key={mov.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{new Date(mov.fecha).toLocaleDateString()}</td>
                  <td style={{ padding: '10px' }}>{mov.insumos_taller?.nombre}</td>
                  <td style={{ padding: '10px', color: mov.tipo_movimiento === 'INGRESO' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{mov.tipo_movimiento}</td>
                  <td style={{ padding: '10px' }}>{mov.cantidad}</td>
                  <td style={{ padding: '10px' }}>{mov.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL LLEGADAS --- */}
      {pestanaActiva === 'INVENTARIO' && rolActual === 'ALMACENERO' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h3>Historial de Repuestos Recibidos</h3>
          <input type="text" placeholder="🔍 Buscar..." value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)} style={{ padding: '10px', width: '300px', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '15px' }} />
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#eee' }}><th style={{ padding: '10px' }}>Fecha</th><th style={{ padding: '10px' }}>Placa</th><th style={{ padding: '10px' }}>Repuesto</th><th style={{ padding: '10px' }}>Estado</th></tr></thead>
            <tbody>{historialRecepciones.map(h => (<tr key={h.id} style={{ borderBottom: '1px solid #ddd' }}><td style={{ padding: '10px' }}>{new Date(h.fecha).toLocaleDateString()}</td><td style={{ padding: '10px' }}>{h.placa_vehiculo}</td><td style={{ padding: '10px' }}>{h.nombre_repuesto}</td><td style={{ padding: '10px' }}>{h.estado}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {/* --- PESTAÑA: SOLICITUDES --- */}
      {pestanaActiva === 'SOLICITUDES' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Solicitudes Pendientes de {rolActual === 'ALMACENERO' ? 'Repuestos' : 'Insumos'}</h3>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por Placa, Chapista o Material..." 
                    value={filtroSolicitudes} 
                    onChange={e => setFiltroSolicitudes(e.target.value)} 
                    style={{ padding: '10px', width: '300px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '14px' }} 
                />
                <button 
                    onClick={abrirEntregaMultiple} 
                    disabled={seleccionadas.length === 0}
                    style={{ padding: '10px 20px', background: seleccionadas.length === 0 ? '#ccc' : '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: seleccionadas.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                    Firmar y Entregar ({seleccionadas.length})
                </button>
            </div>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#eee' }}><th style={{ padding: '10px' }}></th><th style={{ padding: '10px' }}>Vehículo</th><th style={{ padding: '10px' }}>Chapista</th><th style={{ padding: '10px' }}>Material</th><th style={{ padding: '10px' }}>Cant.</th></tr></thead>
            <tbody>
              {solicitudesFiltradasPorTexto.map(sol => (
                <tr key={sol.id} style={{ borderBottom: '1px solid #ddd', background: seleccionadas.includes(sol.id) ? '#f0fff4' : 'white' }}>
                  <td style={{ padding: '10px' }}><input type="checkbox" checked={seleccionadas.includes(sol.id)} onChange={() => toggleSeleccion(sol.id)} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} /></td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{sol.ordenInfo?.vehiculos?.placa}</td>
                  <td style={{ padding: '10px' }}>{sol.ordenInfo?.empleados?.nombre}</td>
                  <td style={{ padding: '10px' }}>{sol.nombreMaterial}</td>
                  <td style={{ padding: '10px' }}>{sol.cantidad_solicitada}</td>
                </tr>
              ))}
              {solicitudesFiltradasPorTexto.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No hay solicitudes que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* --- PESTAÑA: HISTORIAL ENTREGAS --- */}
      {pestanaActiva === 'ENTREGAS' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>Historial de Entregas (Actas)</h3>
            <input 
                type="text" 
                placeholder="🔍 Buscar por Placa o Chapista..." 
                value={filtroEntregas} 
                onChange={e => setFiltroEntregas(e.target.value)} 
                style={{ padding: '10px', width: '300px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '14px' }} 
            />
          </div>

          {historialEntregasFiltrado.map(acta => (
              <div key={acta.id} style={{ border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                  <div style={{ background: '#f0f4ff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                          <strong>Acta #{acta.id.slice(0,6)}</strong> - Entregado a: <strong>{acta.detalles[0]?.empleado}</strong> - Fecha: {new Date(acta.fecha_entrega).toLocaleString()}
                      </div>
                      <button onClick={() => { setFirmaUrlSeleccionada(acta.firma_receptor); setModalFirmaAbierto(true); }} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Ver Firma</button>
                  </div>
                  <div style={{ padding: '10px 15px' }}>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                          {acta.detalles.map(d => (
                              <li key={d.id}>{d.placa} - {d.cantidad_solicitada}x {d.nombreMaterial}</li>
                          ))}
                      </ul>
                  </div>
              </div>
          ))}
          {historialEntregasFiltrado.length === 0 && <p>No se encontraron entregas.</p>}
        </div>
      )}

      {/* MODAL DE RECEPCIÓN DE REPUESTOS */}
      {repuestoSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '450px' }}>
            <h3 style={{ marginBottom: '15px', color: '#1e4b8f' }}>Revisión de Llegada</h3>
            <p>Repuesto: <strong>{repuestoSeleccionado.descripcion}</strong></p>
            <input type="number" value={cantidadRecibida} onChange={e => setCantidadRecibida(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '10px', marginBottom: '15px' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setRepuestoSeleccionado(null)} style={{ padding: '10px 20px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarRecepcion} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVO INSUMO (CATALOGO) */}
      {modalNuevoInsumo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '400px' }}>
            <h3 style={{ marginBottom: '20px', color: '#1e4b8f' }}>Añadir Insumo al Catálogo</h3>
            <form onSubmit={guardarNuevoInsumo} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Nombre del Insumo:</label>
                <input type="text" value={nuevoInsumoForm.nombre} onChange={e => setNuevoInsumoForm({...nuevoInsumoForm, nombre: e.target.value})} style={{ padding: '10px', width: '100%' }} placeholder="Ej. CINTA AISLANTE" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Precio Base (Bs.):</label>
                <input type="number" value={nuevoInsumoForm.precio_unitario} onChange={e => setNuevoInsumoForm({...nuevoInsumoForm, precio_unitario: e.target.value})} style={{ padding: '10px', width: '100%' }} placeholder="0.00" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Alerta Stock Mínimo:</label>
                <input type="number" value={nuevoInsumoForm.stock_minimo} onChange={e => setNuevoInsumoForm({...nuevoInsumoForm, stock_minimo: e.target.value})} style={{ padding: '10px', width: '100%' }} placeholder="Ej. 5" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalNuevoInsumo(false)} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Crear Insumo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ENTREGA MÚLTIPLE CON FIRMA */}
      {modalEntregaAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px' }}>
            <h3 style={{ marginBottom: '10px', color: '#1e4b8f' }}>Acta de Entrega Múltiple</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
              Entregando <strong>{seleccionadas.length} materiales</strong> a <strong>{solicitudes.find(s => s.id === seleccionadas[0])?.ordenInfo?.empleados?.nombre}</strong>.
            </p>
            
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Firma del Chapista (Receptor):</label>
            <div style={{ border: '2px dashed #ccc', borderRadius: '5px', background: '#f9f9f9', marginBottom: '10px' }}>
              <canvas 
                ref={canvasRef} 
                width={440} 
                height={150} 
                style={{ width: '100%', height: '150px', cursor: 'crosshair', touchAction: 'none' }}
                onMouseUp={() => { if (canvasRef.current) setFirmaDataUrl(canvasRef.current.toDataURL()); }}
                onTouchEnd={() => { if (canvasRef.current) setFirmaDataUrl(canvasRef.current.toDataURL()); }}
              />
            </div>
            <button onClick={limpiarFirma} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', marginBottom: '20px' }}>Limpiar Firma</button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalEntregaAbierto(false)} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc' }}>Cancelar</button>
              <button onClick={confirmarEntregaMultiple} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar y Firmar</button>
            </div>
          </div>
        </div>
      )}

      {/* VISOR DE FIRMA FLOTANTE */}
      {modalFirmaAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setModalFirmaAbierto(false)}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '10px', textAlign: 'center' }}>Firma de Recepción</h3>
            <img src={firmaUrlSeleccionada} alt="Firma" style={{ width: '100%', maxWidth: '400px', border: '1px solid #ccc', borderRadius: '5px' }} />
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button onClick={() => setModalFirmaAbierto(false)} style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}