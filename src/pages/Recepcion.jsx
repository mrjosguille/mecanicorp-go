import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import ModalCliente from '../components/ModalCliente';
import ModalVehiculo from '../components/ModalVehiculo';

export default function Recepcion() {
  const [vista, setVista] = useState('LISTA'); 
  const [recepcionesGuardadas, setRecepcionesGuardadas] = useState([]);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  
  // Datos para detalle
  const [recepcionSeleccionada, setRecepcionSeleccionada] = useState(null);
  const [checklistDetalle, setChecklistDetalle] = useState([]);
  const [danosDetalle, setDanosDetalle] = useState([]);
  const [fotosDetalle, setFotosDetalle] = useState([]);
  const [telefonoDetalle, setTelefonoDetalle] = useState('');
  
  // Modales de Fotos y Detalle
  const [modalFotosAbierto, setModalFotosAbierto] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  
  // ESTADOS PARA EL ZOOM Y PAN
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Estados para la ventana personalizada y el botón de guardar
  const [alerta, setAlerta] = useState({ visible: false, mensaje: '' });
  const [guardando, setGuardando] = useState(false); // <-- Nuevo
  // Estados del Formulario
  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [placaBusqueda, setPlacaBusqueda] = useState('');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [combustible, setCombustible] = useState('');
  const [obsGenerales, setObsGenerales] = useState('');
  const [tieneSeguro, setTieneSeguro] = useState(false);
  const [aseguradora, setAseguradora] = useState('');
  
  const [checklist, setChecklist] = useState([
    { item: 'Luces principales', estado: 'SI' }, { item: 'Luces medias / Stop', estado: 'SI' },
    { item: 'Limpiaparabrisas', estado: 'SI' }, { item: 'Radio / Pantalla', estado: 'SI' },
    { item: 'Espejo LH', estado: 'SI' }, { item: 'Espejo RH', estado: 'SI' },
    { item: 'Vidrios laterales', estado: 'SI' }, { item: 'Llanta de Auxilio', estado: 'SI' },
    { item: 'Gato Hidráulico', estado: 'SI' }, { item: 'Llave de Ruedas', estado: 'SI' },
    { item: 'Triángulos', estado: 'SI' }, { item: 'Botiquín', estado: 'SI' },
    { item: 'Tapa Aros', estado: 'SI' }, { item: 'Emblemas', estado: 'SI' },
    { item: 'Tapa de Gasolina', estado: 'SI' },
  ]);
  
  const [danos, setDanos] = useState([]);
  const [modalDano, setModalDano] = useState(false);
  const [coordenadas, setCoordenadas] = useState({ x: 0, y: 0 });
  const [tipoDano, setTipoDano] = useState('RAYON');
  const [posicionDano, setPosicionDano] = useState('DEL');
  const [obsDano, setObsDano] = useState('');
  
  const [modalVehiculoAbierto, setModalVehiculoAbierto] = useState(false);
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  
  const [fotos, setFotos] = useState([]); 
  const fileInputRef = useRef(null);

  const angulosDisponibles = [
    'FOTO FRONTAL', 'FOTO TRASERA', 'LATERAL LH', 'LATERAL RH', 'FOTO MOTOR', 
    'FOTO CHASIS', 'FOTO INTERIOR', 'FOTO INTERIOR 2', 'FOTO KILOMETRAJE', 
    'FOTO LLANTA DELANTERA', 'FOTO LLANTA TRASERA', 'FOTO MALETERO', 
    'FOTO LLANTA DE AUXILIO', 'FOTO GUANTERA'
  ];

  useEffect(() => {
    cargarDatos();
    cargarRecepciones();
  }, []);

  const cargarDatos = async () => {
    const { data: vehData } = await supabase.from('vehiculos').select('id, placa, marca, modelo, color');
    if (vehData) setVehiculos(vehData);
    const { data: cliData } = await supabase.from('clientes').select('id, nombre, telefono');
    if (cliData) setClientes(cliData);
  };

  const cargarRecepciones = async () => {
    const { data } = await supabase.from('recepciones').select(`
      *,
      vehiculos (placa, marca, modelo)
    `).order('fecha_ingreso', { ascending: false });
    if (data) setRecepcionesGuardadas(data);
  };

  const recepcionesFiltradas = recepcionesGuardadas.filter(rec => {
    const texto = busquedaHistorial.toUpperCase();
    return (
      rec.vehiculos?.placa?.toUpperCase().includes(texto) ||
      rec.cliente_nombre?.toUpperCase().includes(texto)
    );
  });

  const verDetalle = async (rec) => {
    setRecepcionSeleccionada(rec);

    const { data: chkData } = await supabase.from('recepcion_checklist').select('*').eq('recepcion_id', rec.id);
    setChecklistDetalle(chkData || []);

    const { data: danData } = await supabase.from('recepcion_danos').select('*').eq('recepcion_id', rec.id);
    setDanosDetalle(danData || []);

    const { data: fotData } = await supabase.from('recepcion_fotos').select('*').eq('recepcion_id', rec.id);
    setFotosDetalle(fotData || []);

    const cli = clientes.find(c => c.nombre === rec.cliente_nombre);
    setTelefonoDetalle(cli ? cli.telefono : 'NO REGISTRADO');

    setVista('DETALLE');
  };

  const buscarVehiculo = (texto) => {
    setPlacaBusqueda(texto.toUpperCase());
    const veh = vehiculos.find(v => v.placa === texto.toUpperCase());
    setVehiculoSeleccionado(veh || null);
  };

  const buscarCliente = (texto) => {
    setClienteNombre(texto.toUpperCase());
    const cli = clientes.find(c => c.nombre === texto.toUpperCase());
    if (cli) setTelefono(cli.telefono || '');
  };

  const actualizarChecklist = (index, nuevoEstado) => {
    const nuevo = [...checklist];
    nuevo[index].estado = nuevoEstado;
    setChecklist(nuevo);
  };

  const handleClickImagen = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; 
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCoordenadas({ x, y });
    setPosicionDano('DEL');
    setModalDano(true);
  };

  const guardarDano = () => {
    const obsFinal = `[${posicionDano}] ${obsDano}`;
    setDanos([...danos, { tipo: tipoDano, x: coordenadas.x, y: coordenadas.y, observacion: obsFinal }]);
    setModalDano(false);
    setObsDano('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const nuevasFotos = files.map(file => ({
      file, preview: URL.createObjectURL(file), angulo: angulosDisponibles[0]
    }));
    setFotos([...fotos, ...nuevasFotos]);
  };

  const actualizarAnguloFoto = (index, nuevoAngulo) => {
    const nuevasFotos = [...fotos];
    nuevasFotos[index].angulo = nuevoAngulo;
    setFotos(nuevasFotos);
  };

  const eliminarFoto = (index) => {
    const nuevasFotos = [...fotos];
    nuevasFotos.splice(index, 1);
    setFotos(nuevasFotos);
  };

  const limpiarFormulario = () => {
    setPlacaBusqueda(''); setVehiculoSeleccionado(null); setClienteNombre(''); setTelefono('');
    setKilometraje(''); setCombustible(''); setObsGenerales(''); setDanos([]); setFotos([]);
    setTieneSeguro(false); setAseguradora('');
    setChecklist(checklist.map(c => ({ ...c, estado: 'SI' })));
  };

    const guardarRecepcion = async (e) => {
    e.preventDefault();
    if (!vehiculoSeleccionado) return alert("⛔ VEHÍCULO NO REGISTRADO. Regístrelo primero.");
    
    setGuardando(true); // 

    const { data: recGuardada, error } = await supabase.from('recepciones').insert([{
      vehiculo_id: vehiculoSeleccionado.id,
      cliente_nombre: clienteNombre.toUpperCase() || 'SIN NOMBRE',
      kilometraje: parseInt(kilometraje) || 0,
      nivel_combustible: parseFloat(combustible) || 0,
      observaciones_generales: obsGenerales.toUpperCase(),
      seguro: tieneSeguro ? aseguradora.toUpperCase() : 'SIN SEGURO'
    }]).select();

    if (error) return alert("Error: " + error.message);
    const idRecepcion = recGuardada[0].id;

    await supabase.from('recepcion_checklist').insert(checklist.map(c => ({
      recepcion_id: idRecepcion, item: c.item, estado: c.estado, observacion: ''
    })));

    if (danos.length > 0) {
      await supabase.from('recepcion_danos').insert(danos.map(d => ({
        recepcion_id: idRecepcion, tipo_dano: d.tipo, posicion_x: d.x, posicion_y: d.y, observacion: d.observacion
      })));
    }

    for (const foto of fotos) {
      const fileExt = foto.file.name.split('.').pop();
      const fileName = `${idRecepcion}_${foto.angulo.replace(/\s/g, '')}_${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('recepciones_fotos').upload(fileName, foto.file);
      
      if (!uploadError) {
        const { data: urlData } = await supabase.storage.from('recepciones_fotos').getPublicUrl(fileName);
        await supabase.from('recepcion_fotos').insert([{
          recepcion_id: idRecepcion, url_foto: urlData.publicUrl, angulo: foto.angulo
        }]);
      }
    }

     setAlerta({ visible: true, mensaje: '¡Recepción guardada exitosamente!' });
    setGuardando(false); 
    limpiarFormulario();
    setVista('LISTA');
    cargarRecepciones();
  };

  // --- LÓGICA DE ZOOM Y PAN ---
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setZoom(prev => Math.min(Math.max(1, prev + delta), 5));
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const cerrarVisor = () => {
    setFotoAmpliada(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // --- VISTA 1: LISTADO ---
  if (vista === 'LISTA') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Historial de Recepciones</h2>
          <button onClick={() => setVista('FORMULARIO')} style={{ padding: '10px 20px', background: '#1e4b8f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            + Registrar Nueva Recepción
          </button>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <input type="text" placeholder="🔍 Buscar por Placa o Cliente..." value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)} style={{ padding: '10px', width: '350px', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '14px' }} />
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '10px' }}>Fecha</th>
                <th style={{ padding: '10px' }}>Placa</th>
                <th style={{ padding: '10px' }}>Modelo</th>
                <th style={{ padding: '10px' }}>Cliente</th>
                <th style={{ padding: '10px' }}>Seguro</th>
                <th style={{ padding: '10px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recepcionesFiltradas.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{new Date(rec.fecha_ingreso).toLocaleDateString()}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{rec.vehiculos?.placa}</td>
                  <td style={{ padding: '10px' }}>{rec.vehiculos?.marca} {rec.vehiculos?.modelo}</td>
                  <td style={{ padding: '10px' }}>{rec.cliente_nombre}</td>
                  <td style={{ padding: '10px' }}>{rec.seguro}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => verDetalle(rec)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Ver Detalle</button>
                  </td>
                </tr>
              ))}
              {recepcionesFiltradas.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No hay recepciones registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- VISTA 2 Y 3: FORMULARIO O DETALLE ---
  const esDetalle = vista === 'DETALLE';
  const rec = esDetalle ? recepcionSeleccionada : null;
  const datosMostrar = esDetalle ? {
    cliente: rec.cliente_nombre, telefono: telefonoDetalle, placa: rec.vehiculos?.placa,
    modelo: `${rec.vehiculos?.marca} ${rec.vehiculos?.modelo}`, seguro: rec.seguro,
    obs: rec.observaciones_generales, km: rec.kilometraje, combustible: rec.nivel_combustible
  } : {
    cliente: clienteNombre, telefono: telefono, placa: placaBusqueda,
    modelo: `${vehiculoSeleccionado?.marca} ${vehiculoSeleccionado?.modelo}`,
    seguro: tieneSeguro ? aseguradora : 'SIN SEGURO',
    obs: obsGenerales, km: kilometraje, combustible: combustible
  };

  return (
    <div>
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>{esDetalle ? 'Detalle de Recepción' : 'Nueva Recepción'}</h2>
        <button onClick={() => { setVista('LISTA'); limpiarFormulario(); }} style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Volver al Historial</button>
      </div>

      <div className="print-hide" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🖨️ Imprimir Hoja de Recepción</button>
        {esDetalle && (
          <button onClick={() => setModalFotosAbierto(true)} style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            📷 Ver Fotos de Recepción
          </button>
        )}
        
        {/* BOTÓN DE WHATSAPP */}
        <button onClick={() => {
          const numeroWhatsApp = datosMostrar.telefono && datosMostrar.telefono !== 'NO REGISTRADO' ? `591${datosMostrar.telefono.replace(/\D/g, '')}` : '';
          if (!numeroWhatsApp) return alert("No hay número de teléfono registrado.");
          const mensaje = `Hola ${datosMostrar.cliente}, le enviamos la hoja de recepción de su vehículo ${datosMostrar.placa}. Mecanicorp Go.`;
          window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }} style={{ padding: '10px 20px', background: '#25D366', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          📱 Enviar por WhatsApp
        </button>
      </div>

      <div className="paper-container uppercase-paper">
        
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e4b8f', paddingBottom: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo-mecanicorp.png" alt="Logo" style={{ height: '80px' }} />
            <div style={{ fontSize: '10px', lineHeight: '1.2', color: '#1e4b8f', fontWeight: 'bold' }}>
              RADIAL 27 BARRIO ENDE CALLE 3 / PARALELA AV. BANZER Z/NORTE<br/>TELF. OF.: 77605007 - 77603006<br/>SANTA CRUZ - BOLIVIA
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, color: '#1e4b8f', fontSize: '22px' }}>HOJA DE RECEPCIÓN</h1>
            <p style={{ margin: 0, fontSize: '12px' }}>Fecha: {esDetalle ? new Date(rec.fecha_ingreso).toLocaleString() : new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* DATOS CLIENTE / VEHICULO */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>DATOS DEL CLIENTE</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '10px' }}>
              <strong style={{ width: '80px' }}>Cliente:</strong>
              {esDetalle ? <span style={{ flex: 1, borderBottom: '1px solid #000' }}>{datosMostrar.cliente}</span> : 
                <>
                  <input type="text" list="lista-clientes" value={clienteNombre} onChange={e => buscarCliente(e.target.value)} style={{ flex: 1, borderBottom: '1px solid #000', border: 'none', background: 'transparent' }} />
                  <datalist id="lista-clientes">{clientes.map(c => <option key={c.id} value={c.nombre} />)}</datalist>
                  <button className="print-hide" type="button" onClick={() => setModalClienteAbierto(true)} style={{ marginLeft: '5px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer' }}>+</button>
                </>
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <strong style={{ width: '80px' }}>Teléfono:</strong>
              {esDetalle ? <span style={{ flex: 1, borderBottom: '1px solid #000' }}>{datosMostrar.telefono}</span> :
                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} style={{ flex: 1, borderBottom: '1px solid #000', border: 'none', background: 'transparent' }} />
              }
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>DATOS DEL VEHÍCULO</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '10px' }}>
              <strong style={{ width: '80px' }}>Placa:</strong>
              {esDetalle ? <span style={{ flex: 1, borderBottom: '1px solid #000', fontWeight: 'bold' }}>{datosMostrar.placa}</span> :
                <>
                  <input type="text" list="lista-vehiculos" value={placaBusqueda} onChange={e => buscarVehiculo(e.target.value)} style={{ flex: 1, borderBottom: '1px solid #000', border: 'none', background: 'transparent', fontWeight: 'bold' }} />
                  <datalist id="lista-vehiculos">{vehiculos.map(v => <option key={v.id} value={v.placa} />)}</datalist>
                  <button className="print-hide" type="button" onClick={() => setModalVehiculoAbierto(true)} style={{ marginLeft: '5px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer' }}>+</button>
                </>
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <strong style={{ width: '80px' }}>Modelo:</strong>
              <span style={{ flex: 1, borderBottom: '1px solid #000' }}>{datosMostrar.modelo}</span>
            </div>
          </div>
        </div>

        {/* SEGURO */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
            <input type="checkbox" checked={esDetalle ? (datosMostrar.seguro !== 'SIN SEGURO') : tieneSeguro} readOnly disabled={esDetalle} onChange={e => setTieneSeguro(e.target.checked)} />
            ¿INGRESA CON SEGURO?
          </label>
          {((esDetalle && datosMostrar.seguro !== 'SIN SEGURO') || (!esDetalle && tieneSeguro)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>ASEGURADORA:</strong>
              {esDetalle ? <span>{datosMostrar.seguro}</span> :
                <input type="text" value={aseguradora} onChange={e => setAseguradora(e.target.value)} style={{ padding: '5px', borderBottom: '1px solid #000', border: 'none', background: 'transparent', width: '200px' }} />
              }
            </div>
          )}
        </div>

        {/* CHECKLIST Y DIBUJO */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', textAlign: 'center' }}>INVENTARIO</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', rowGap: '5px' }}>
              {(esDetalle ? checklistDetalle : checklist).map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', borderBottom: '1px dotted #eee', paddingBottom: '2px' }}>
                  <span style={{ textAlign: 'left' }}>{item.item}:</span>
                  {esDetalle ? (
                    <span style={{ fontWeight: 'bold', color: item.estado === 'SI' ? '#27ae60' : (item.estado === 'NO' ? '#e74c3c' : '#7f8c8d') }}>
                      {item.estado === 'SI' ? '✔' : (item.estado === 'NO' ? '✖' : 'NA')}
                    </span>
                  ) : (
                    <div className="print-hide" style={{ display: 'flex', gap: '2px' }}>
                      <button type="button" onClick={() => actualizarChecklist(index, 'SI')} style={{ background: item.estado === 'SI' ? '#27ae60' : '#eee', padding: '1px 4px', fontSize: '10px', border: 'none', cursor: 'pointer', color: item.estado === 'SI' ? 'white' : 'black', borderRadius: '2px' }}>✔</button>
                      <button type="button" onClick={() => actualizarChecklist(index, 'NO')} style={{ background: item.estado === 'NO' ? '#e74c3c' : '#eee', padding: '1px 4px', fontSize: '10px', border: 'none', cursor: 'pointer', color: item.estado === 'NO' ? 'white' : 'black', borderRadius: '2px' }}>✖</button>
                      <button type="button" onClick={() => actualizarChecklist(index, 'N/A')} style={{ background: item.estado === 'N/A' ? '#7f8c8d' : '#eee', padding: '1px 4px', fontSize: '8px', border: 'none', cursor: 'pointer', color: item.estado === 'N/A' ? 'white' : 'black', borderRadius: '2px' }}>NA</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px', textAlign: 'center' }}>DAÑOS</h3>
            <div style={{ position: 'relative', width: '100%' }} onClick={esDetalle ? null : handleClickImagen}>
              <img src="https://cdn-icons-png.flaticon.com/512/3202/3202926.png" alt="Auto" style={{ width: '100%', opacity: 0.6, cursor: esDetalle ? 'default' : 'crosshair' }} />
              {(esDetalle ? danosDetalle : danos).map((d, i) => (
                <div key={i} style={{ position: 'absolute', left: `${d.posicion_x || d.x}%`, top: `${d.posicion_y || d.y}%`, transform: 'translate(-50%, -50%)', background: d.tipo_dano === 'GOLPE' || d.tipo === 'GOLPE' ? 'red' : (d.tipo_dano === 'RAYON' || d.tipo === 'RAYON' ? 'orange' : 'blue'), color: 'white', borderRadius: '50%', padding: '2px 5px', fontSize: '8px', fontWeight: 'bold' }}>
                  {(d.tipo_dano || d.tipo).charAt(0)}
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '11px', textAlign: 'left', paddingLeft: '10px' }}>
              <strong>Detalle de Daños:</strong>
              <ul style={{ paddingLeft: '20px', margin: '5px 0', listStyleType: 'disc' }}>
                {(esDetalle ? danosDetalle : danos).map((d, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', color: d.tipo_dano === 'GOLPE' || d.tipo === 'GOLPE' ? 'red' : (d.tipo_dano === 'RAYON' || d.tipo === 'RAYON' ? 'orange' : 'blue') }}>
                      {(d.tipo_dano || d.tipo).charAt(0)}:
                    </span> {d.observacion || 'Sin detalle'}
                  </li>
                ))}
                {(esDetalle ? danosDetalle : danos).length === 0 && <li>Sin daños registrados.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* FOTOS (Solo en modo FORMULARIO) */}
        {!esDetalle && (
          <div className="print-hide" style={{ marginBottom: '20px' }}>
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>FOTOS DE RECEPCIÓN</h3>
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px', fontWeight: 'bold' }}>
              📷 Cargar Múltiples Fotos
            </button>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {fotos.map((f, i) => (
                <div key={i} style={{ border: '1px solid #ccc', padding: '5px', borderRadius: '5px', background: '#f9f9f9', width: '110px', textAlign: 'center' }}>
                  <img src={f.preview} alt="preview" style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '3px', marginBottom: '3px' }} />
                  <select value={f.angulo} onChange={e => actualizarAnguloFoto(i, e.target.value)} style={{ width: '100%', padding: '2px', marginBottom: '3px', fontSize: '9px' }}>
                    {angulosDisponibles.map(ang => <option key={ang} value={ang}>{ang}</option>)}
                  </select>
                  <button onClick={() => eliminarFoto(i)} style={{ width: '100%', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', padding: '2px', cursor: 'pointer', fontSize: '9px' }}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OBSERVACIONES */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>OBSERVACIONES GENERALES</h3>
          {esDetalle ? <p style={{ minHeight: '40px', borderBottom: '1px solid #ccc', textAlign: 'left' }}>{datosMostrar.obs}</p> :
            <textarea value={obsGenerales} onChange={e => setObsGenerales(e.target.value)} rows="3" style={{ width: '100%', border: 'none', borderBottom: '1px solid #ccc', background: 'transparent', textTransform: 'uppercase', textAlign: 'left' }}></textarea>
          }
        </div>

                {!esDetalle && (
          <button 
            className="print-hide" 
            onClick={guardarRecepcion} 
            disabled={guardando} // <-- Se desactiva si está guardando
            style={{ 
              width: '100%', padding: '15px', 
              background: guardando ? '#94a3b8' : '#1e4b8f', // Gris si está guardando
              color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', 
              cursor: guardando ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'background 0.3s'
            }}
          >
            {guardando ? '⏳ GUARDANDO RECEPCIÓN...' : '💾 GUARDAR RECEPCIÓN'}
          </button>
        )}
      </div>

      {/* MODAL DE FOTOS (GALERÍA) */}
      {modalFotosAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '80%', maxHeight: '80%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>Fotos del Vehículo - {datosMostrar.placa}</h3>
              <button onClick={() => setModalFotosAbierto(false)} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Cerrar</button>
            </div>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {fotosDetalle.map((f, i) => (
                <div key={i} style={{ textAlign: 'center', border: '1px solid #ddd', padding: '10px', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setFotoAmpliada(f)}>
                  <img src={f.url_foto} alt="foto" style={{ width: '150px', height: '120px', objectFit: 'cover', borderRadius: '5px' }} />
                  <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>{f.angulo}</p>
                </div>
              ))}
              {fotosDetalle.length === 0 && <p>No hay fotos registradas para esta recepción.</p>}
            </div>
          </div>
        </div>
      )}

      {/* VISOR DE FOTO AMPLIADA CON ZOOM Y PAN MEJORADO */}
      {fotoAmpliada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          
          {/* Controles Flotantes Estilo Moderno */}
          <div style={{ position: 'absolute', top: '30px', display: 'flex', gap: '20px', zIndex: 10, background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '50px', backdropFilter: 'blur(5px)' }}>
            <button onClick={() => setZoom(prev => Math.max(1, prev - 0.5))} style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: '30px', fontWeight: 'bold' }}>-</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ background: 'transparent', color: '#f39c12', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>RESTABLECER</button>
            <button onClick={() => setZoom(prev => Math.min(5, prev + 0.5))} style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', fontSize: '30px', fontWeight: 'bold' }}>+</button>
          </div>

          <p style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', zIndex: 10, letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{fotoAmpliada.angulo}</p>

          <div 
            style={{ 
              overflow: 'hidden', 
              maxWidth: '90%', 
              maxHeight: '75vh', 
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              border: '4px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img 
              src={fotoAmpliada.url_foto} 
              alt="foto" 
              style={{ 
                display: 'block',
                maxWidth: '100%',
                maxHeight: '75vh',
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                pointerEvents: 'none'
              }} 
            />
          </div>

          <button onClick={cerrarVisor} style={{ position: 'absolute', bottom: '40px', background: 'rgba(231, 76, 60, 0.9)', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)' }}>
            CERRAR VISOR
          </button>
        </div>
      )}

      {/* MODAL DE DAÑO CON SELECTOR DE POSICIÓN */}
      {modalDano && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '350px' }}>
            <h4 style={{ marginBottom: '10px' }}>Agregar Daño</h4>
            <select value={tipoDano} onChange={e => setTipoDano(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
              <option value="RAYON">RAYÓN</option><option value="GOLPE">GOLPE</option><option value="PIEZA_DAÑADA">PIEZA DAÑADA</option><option value="FALTA">FALTA PIEZA</option>
            </select>
            
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
              <button type="button" onClick={() => setPosicionDano('DEL')} style={{ flex: 1, padding: '5px', background: posicionDano === 'DEL' ? '#3498db' : '#eee', color: posicionDano === 'DEL' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>DEL</button>
              <button type="button" onClick={() => setPosicionDano('TRAS')} style={{ flex: 1, padding: '5px', background: posicionDano === 'TRAS' ? '#3498db' : '#eee', color: posicionDano === 'TRAS' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>TRAS</button>
              <button type="button" onClick={() => setPosicionDano('LH')} style={{ flex: 1, padding: '5px', background: posicionDano === 'LH' ? '#3498db' : '#eee', color: posicionDano === 'LH' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>LH</button>
              <button type="button" onClick={() => setPosicionDano('RH')} style={{ flex: 1, padding: '5px', background: posicionDano === 'RH' ? '#3498db' : '#eee', color: posicionDano === 'RH' ? 'white' : 'black', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>RH</button>
            </div>

            <input type="text" placeholder="Detalle (Ej. Rayón puerta)" value={obsDano} onChange={e => setObsDano(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', textTransform: 'uppercase' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalDano(false)} style={{ padding: '5px 10px' }}>Cancelar</button>
              <button onClick={guardarDano} style={{ padding: '5px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px' }}>Agregar</button>
            </div>
          </div>
        </div>
      )}

           {modalVehiculoAbierto && <ModalVehiculo onClose={() => setModalVehiculoAbierto(false)} onVehiculoAgregado={(v) => { setVehiculos([...vehiculos, v]); setPlacaBusqueda(v.placa); setVehiculoSeleccionado(v); }} />}
      {modalClienteAbierto && <ModalCliente onClose={() => setModalClienteAbierto(false)} onClienteAgregado={(c) => { setClientes([...clientes, c]); setClienteNombre(c.nombre); setTelefono(c.telefono || ''); }} />}

      {/* VENTANA PERSONALIZADA DE MECANICORP */}
      {console.log("¿Se debe mostrar la ventana?", alerta.visible)}
      {alerta.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <img src="/logo-mecanicorp.png" alt="Mecanicorp" style={{ width: '100px', marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#1e4b8f' }}>Mecanicorp Go</h3>
            <p style={{ color: '#475569', marginBottom: '25px', fontSize: '15px' }}>{alerta.mensaje}</p>
            <button onClick={() => setAlerta({ visible: false, mensaje: '' })} style={{ padding: '10px 30px', background: '#1e4b8f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}