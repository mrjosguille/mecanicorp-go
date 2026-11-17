import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { NumerosALetras } from 'numero-a-letras';
import ModalCliente from '../components/ModalCliente';
import ModalVehiculo from '../components/ModalVehiculo';

export default function Proformas() {
  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proformasGuardadas, setProformasGuardadas] = useState([]);
  
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [proformaSeleccionada, setProformaSeleccionada] = useState(null);
  
  // ESTADOS PARA LOS MODALES
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [modalVehiculoAbierto, setModalVehiculoAbierto] = useState(false);
  
  const estadoInicial = {
    numero_proforma: `${Math.floor(Date.now() / 1000).toString().slice(-5)}`,
    fecha: new Date().toLocaleDateString('es-BO'),
    placa_buscada: '', vehiculo_id: '', cliente_nombre: '', telefono_cliente: '', 
    tiene_seguro: false, seguro: '', es_rc: false, placa_asegurado: '',
    tiene_terceros: false,
    marca_modelo: '', color_vehiculo: '', 
    items: [{ descripcion: '', cantidad: 1, precio_unitario: 0 }],
    repuestos: [{ descripcion: '', cantidad: 1 }],
    terceros: [{ descripcion: '', precio_unitario: 0 }]
  };

  const [proforma, setProforma] = useState(estadoInicial);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: vehData } = await supabase.from('vehiculos').select('id, placa, marca, modelo, color');
    if (vehData) setVehiculos(vehData);

    const { data: cliData } = await supabase.from('clientes').select('id, nombre, telefono');
    if (cliData) setClientes(cliData);

    const { data: profData } = await supabase.from('proformas').select(`
      *,
      clientes (nombre, telefono),
      vehiculos (placa, marca, modelo, color)
    `).order('fecha', { ascending: false });
    
    if (profData) setProformasGuardadas(profData);
  };

  const proformasFiltradas = proformasGuardadas.filter(p => {
    const texto = busqueda.toUpperCase();
    const matchPlaca = p.vehiculos?.placa?.toUpperCase().includes(texto);
    const matchCliente = p.clientes?.nombre?.toUpperCase().includes(texto);
    const matchNumero = p.numero_proforma?.toString().toUpperCase().includes(texto);
    return matchPlaca || matchCliente || matchNumero;
  });

  const buscarPorPlaca = (texto) => {
    const textoUpper = texto.toUpperCase();
    setProforma(prev => ({ ...prev, placa_buscada: textoUpper }));
    const veh = vehiculos.find(v => v.placa === textoUpper);
    if (veh) {
      setProforma(prev => ({ ...prev, vehiculo_id: veh.id, marca_modelo: `${veh.marca} ${veh.modelo}`, color_vehiculo: veh.color || '' }));
    } else {
      setProforma(prev => ({ ...prev, vehiculo_id: '', marca_modelo: '', color_vehiculo: '' }));
    }
  };

  const buscarCliente = (texto) => {
    const textoUpper = texto.toUpperCase();
    const cli = clientes.find(c => c.nombre === textoUpper);
    setProforma(prev => ({ ...prev, cliente_nombre: textoUpper, telefono_cliente: cli ? cli.telefono : '' }));
  };

  const agregarItem = () => setProforma({ ...proforma, items: [...proforma.items, { descripcion: '', cantidad: 1, precio_unitario: 0 }] });
  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...proforma.items];
    nuevosItems[index][campo] = valor;
    setProforma({ ...proforma, items: nuevosItems });
  };

  const agregarRepuesto = () => setProforma({ ...proforma, repuestos: [...proforma.repuestos, { descripcion: '', cantidad: 1 }] });
  const actualizarRepuesto = (index, campo, valor) => {
    const nuevosRepuestos = [...proforma.repuestos];
    nuevosRepuestos[index][campo] = valor;
    setProforma({ ...proforma, repuestos: nuevosRepuestos });
  };

  const agregarTercero = () => setProforma({ ...proforma, terceros: [...proforma.terceros, { descripcion: '', precio_unitario: 0 }] });
  const actualizarTercero = (index, campo, valor) => {
    const nuevosTerceros = [...proforma.terceros];
    nuevosTerceros[index][campo] = valor;
    setProforma({ ...proforma, terceros: nuevosTerceros });
  };

  const calcularTotal = () => {
    const totalManoObra = proforma.items.reduce((total, item) => total + item.precio_unitario, 0);
    const totalTerceros = proforma.tiene_terceros ? proforma.terceros.reduce((total, ter) => total + ter.precio_unitario, 0) : 0;
    return totalManoObra + totalTerceros;
  };
  
  const totalEnLetras = (monto) => {
    if (monto === 0) return 'CERO BOLIVIANOS';
    return `${NumerosALetras(monto).toUpperCase()} BOLIVIANOS`;
  };

  const cargarDetalleProforma = async (prof) => {
    setProformaSeleccionada(prof);
    const { data: itemsData } = await supabase.from('proforma_items').select('*').eq('proforma_id', prof.id).not('descripcion', 'like', '[TERCEROS]%');
    const { data: repuestosData } = await supabase.from('proforma_repuestos_solicitados').select('*').eq('proforma_id', prof.id);
    const { data: tercerosData } = await supabase.from('proforma_items').select('*').eq('proforma_id', prof.id).like('descripcion', '[TERCEROS]%');

    setProforma({
      ...prof,
      items: itemsData || [], repuestos: repuestosData || [], terceros: tercerosData || [],
      tiene_terceros: tercerosData && tercerosData.length > 0,
      cliente_nombre: prof.clientes?.nombre || 'SIN NOMBRE', 
      placa_buscada: prof.vehiculos?.placa || 'SIN PLACA', 
      marca_modelo: `${prof.vehiculos?.marca || ''} ${prof.vehiculos?.modelo || ''}`, 
      color_vehiculo: prof.vehiculos?.color || '',
      telefono_cliente: prof.clientes?.telefono || ''
    });
  };

  const guardarProforma = async (e) => {
    e.preventDefault();
    
    const clienteEncontrado = clientes.find(c => c.nombre.toLowerCase() === proforma.cliente_nombre.toLowerCase());
    if (!clienteEncontrado) {
      alert("⛔ CLIENTE NO REGISTRADO. Use el botón '+ NUEVO' para registrarlo.");
      return; 
    }

    const vehiculoEncontrado = vehiculos.find(v => v.placa === proforma.placa_buscada);
    if (!vehiculoEncontrado) {
      alert("⛔ VEHÍCULO NO REGISTRADO. Use el botón '+ NUEVO' para registrarlo.");
      return; 
    }

    const { data: profGuardada, error } = await supabase.from('proformas').insert([{ 
        vehiculo_id: vehiculoEncontrado.id, 
        cliente_id: clienteEncontrado.id, 
        total: calcularTotal(),
        numero_proforma: proforma.numero_proforma, 
        seguro: proforma.tiene_seguro ? proforma.seguro : 'SIN SEGURO',
        es_rc: proforma.es_rc, 
        placa_asegurado: proforma.placa_asegurado
      }]).select();

    if (error) return alert("Error: " + error.message);

    const itemsValidos = proforma.items.filter(item => item.descripcion.trim() !== '');
    if (itemsValidos.length > 0) {
      await supabase.from('proforma_items').insert(itemsValidos.map(item => ({ proforma_id: profGuardada[0].id, descripcion: item.descripcion, cantidad: 1, precio_unitario: item.precio_unitario })));
    }

    const repuestosValidos = proforma.repuestos.filter(rep => rep.descripcion.trim() !== '');
    if (repuestosValidos.length > 0) {
      await supabase.from('proforma_repuestos_solicitados').insert(repuestosValidos.map(rep => ({ proforma_id: profGuardada[0].id, descripcion: rep.descripcion, cantidad: 1 })));
    }

    if (proforma.tiene_terceros) {
      const tercerosValidos = proforma.terceros.filter(ter => ter.descripcion.trim() !== '');
      if (tercerosValidos.length > 0) {
        await supabase.from('proforma_items').insert(tercerosValidos.map(ter => ({ proforma_id: profGuardada[0].id, descripcion: `[TERCEROS] ${ter.descripcion}`, cantidad: 1, precio_unitario: ter.precio_unitario })));
      }
    }

    alert("¡Proforma guardada exitosamente!");
    setMostrarFormulario(false);
    cargarDatos();
    setProforma(estadoInicial); 
  };

  return (
    <div>
      <div className="print-hide">
        <h2 style={{ marginBottom: '20px' }}>Módulo de Proformas</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
          <button onClick={() => { setProforma(estadoInicial); setMostrarFormulario(true); setProformaSeleccionada(null); }} style={{ padding: '10px 20px', background: '#1e4b8f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
            + Crear Nueva Proforma
          </button>
          <input type="text" placeholder="🔍 Buscar por Placa, Cliente o N° Proforma..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '10px', width: '350px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '14px' }} />
        </div>

        <h3>Historial de Proformas</h3>
        <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ padding: '10px' }}>N° Proforma</th>
              <th style={{ padding: '10px' }}>Cliente</th>
              <th style={{ padding: '10px' }}>Placa</th>
              <th style={{ padding: '10px' }}>Total (Bs)</th>
              <th style={{ padding: '10px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proformasFiltradas.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{p.numero_proforma}</td>
                <td style={{ padding: '10px' }}>{p.clientes?.nombre || 'Cliente Ocasional'}</td>
                <td style={{ padding: '10px' }}>{p.vehiculos?.placa}</td>
                <td style={{ padding: '10px' }}>{p.total}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => cargarDetalleProforma(p)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Ver / Imprimir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(mostrarFormulario || proformaSeleccionada) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="paper-container uppercase-paper" style={{ boxShadow: 'none', margin: 0 }}>
              
              <div className="print-hide" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => { setMostrarFormulario(false); setProformaSeleccionada(null); setProforma(estadoInicial); }} style={{ padding: '10px 20px', cursor: 'pointer' }}>Cerrar</button>
                <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🖨️ Imprimir / PDF</button>
                {mostrarFormulario && <button onClick={guardarProforma} style={{ padding: '10px 20px', background: '#1e4b8f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Guardar</button>}
              </div>

              {/* CABECERA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1e4b8f', paddingBottom: '10px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '40%', alignItems: 'center' }}>
                  <img src="/logo-mecanicorp.png" alt="Logo" style={{ height: '110px', objectFit: 'contain' }} />
                  <div style={{ fontSize: '9px', color: '#1e4b8f', textAlign: 'center', marginTop: '5px', lineHeight: '1.3', fontWeight: 'bold' }}>
                    RADIAL 27 BARRIO ENDE CALLE 3 / PARALELA AV. BANZER Z/NORTE<br/>
                    TELF. OF.: 77605007 - 77603006<br/>
                    SANTA CRUZ - BOLIVIA
                  </div>
                </div>
                <div style={{ textAlign: 'right', width: '60%' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e4b8f', marginBottom: '5px' }}>CHAPERIO - PINTURA - RAMPLA<br/>MECÁNICA - INYECCIÓN ELECTRÓNICA</div>
                  <div style={{ border: '2px solid #1e4b8f', color: '#1e4b8f', fontSize: '24px', fontWeight: 'bold', padding: '5px 20px', borderRadius: '5px', display: 'inline-block', marginBottom: '5px' }}>PRO-FORMA</div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>STEVEN ARAS - 70070044 - 70000570</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '5px' }}>
                    <strong>Nº </strong> 
                    {mostrarFormulario ? (
                      <input type="text" value={proforma.numero_proforma} onChange={e => setProforma({...proforma, numero_proforma: e.target.value})} style={{ width: '100px', fontWeight: 'bold', fontSize: '16px', color: '#e74c3c' }} />
                    ) : <span style={{ color: '#e74c3c' }}>{proformaSeleccionada?.numero_proforma}</span>}
                  </div>
                </div>
              </div>

              {/* DATOS DEL CLIENTE Y VEHICULO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ width: '65%', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <strong style={{ marginRight: '5px', whiteSpace: 'nowrap' }}>CLIENTE: </strong>
                    {mostrarFormulario ? (
                      <>
                        <input type="text" list="lista-clientes" value={proforma.cliente_nombre} onChange={e => buscarCliente(e.target.value)} style={{ width: '100%', borderBottom: '1px solid #000' }} />
                        <datalist id="lista-clientes">{clientes.map(c => <option key={c.id} value={c.nombre} />)}</datalist>
                        <button type="button" onClick={() => setModalClienteAbierto(true)} style={{ fontSize: '11px', background: '#e74c3c', color: 'white', padding: '3px 8px', border: 'none', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>+ NUEVO</button>
                      </>
                    ) : proformaSeleccionada?.clientes?.nombre}
                  </div>
                  <div style={{ width: '30%' }}>
                    <strong>TELÉFONO: </strong> {mostrarFormulario ? proforma.telefono_cliente : proformaSeleccionada?.clientes?.telefono}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ width: '30%', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <strong style={{ marginRight: '5px', whiteSpace: 'nowrap' }}>VEHÍCULO: </strong>
                    {mostrarFormulario ? (
                      <>
                        <input type="text" list="lista-placas" placeholder="PLACA" value={proforma.placa_buscada} onChange={(e) => buscarPorPlaca(e.target.value)} style={{ width: '80px', borderBottom: '1px solid #000' }} />
                        <datalist id="lista-placas">{vehiculos.map(v => <option key={v.id} value={v.placa} />)}</datalist>
                        <button type="button" onClick={() => setModalVehiculoAbierto(true)} style={{ fontSize: '11px', background: '#e74c3c', color: 'white', padding: '3px 8px', border: 'none', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>+ NUEVO</button>
                      </>
                    ) : proformaSeleccionada?.vehiculos?.placa}
                  </div>
                  <div style={{ width: '40%' }}>
                    <strong>MODELO: </strong>
                    {mostrarFormulario ? <span>{proforma.marca_modelo}</span> : `${proformaSeleccionada?.vehiculos?.marca || ''} ${proformaSeleccionada?.vehiculos?.modelo || ''}`}
                  </div>
                  <div style={{ width: '30%' }}>
                    <strong>COLOR: </strong>
                    {mostrarFormulario ? <span>{proforma.color_vehiculo}</span> : proformaSeleccionada?.vehiculos?.color}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                  <div style={{ width: '65%', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={mostrarFormulario ? proforma.tiene_seguro : proformaSeleccionada?.seguro !== 'SIN SEGURO'} onChange={e => setProforma({...proforma, tiene_seguro: e.target.checked})} disabled={!mostrarFormulario} />
                      <strong>SEGURO:</strong>
                    </label>
                    {(mostrarFormulario ? proforma.tiene_seguro : proformaSeleccionada?.seguro !== 'SIN SEGURO') && (
                      <>
                        <input type="text" placeholder="ASEGURADORA" value={mostrarFormulario ? proforma.seguro : proformaSeleccionada?.seguro} onChange={e => setProforma({...proforma, seguro: e.target.value})} style={{ width: '150px', borderBottom: '1px solid #000' }} disabled={!mostrarFormulario} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginLeft: '10px' }}>
                          <input type="checkbox" checked={mostrarFormulario ? proforma.es_rc : proformaSeleccionada?.es_rc} onChange={e => setProforma({...proforma, es_rc: e.target.checked})} disabled={!mostrarFormulario} />
                          <strong>RC DE</strong>
                        </label>
                        {(mostrarFormulario ? proforma.es_rc : proformaSeleccionada?.es_rc) && <input type="text" placeholder="PLACA ASEG." value={mostrarFormulario ? proforma.placa_asegurado : proformaSeleccionada?.placa_asegurado} onChange={e => setProforma({...proforma, placa_asegurado: e.target.value.toUpperCase()})} style={{ width: '80px', borderBottom: '1px solid #000' }} disabled={!mostrarFormulario} />}
                      </>
                    )}
                  </div>
                  <div style={{ width: '30%' }}>
                    <strong>FECHA: </strong> {mostrarFormulario ? proforma.fecha : new Date(proformaSeleccionada?.fecha).toLocaleDateString('es-BO')}
                  </div>
                </div>
              </div>

              {/* TABLA DE MANO DE OBRA / ITEMS */}
              <h4 style={{ marginBottom: '5px', textAlign: 'center', fontSize: '14px' }}>DESCRIPCIÓN</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'center', color: '#1e4b8f', width: '50px' }}>ITEM</th>
                    <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left', color: '#1e4b8f', width: '100%' }}>DETALLE</th>
                    <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'center', color: '#1e4b8f', width: '120px' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {mostrarFormulario ? proforma.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #1e4b8f', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left' }}><input type="text" placeholder="EJ. CAMBIO Y BALANCEO..." value={item.descripcion} onChange={e => actualizarItem(index, 'descripcion', e.target.value)} style={{ width: '100%', padding: '3px', border: 'none', background: 'transparent', textAlign: 'left' }} /></td>
                        <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'right', width: '120px' }}>
                          <input type="number" placeholder="0" value={item.precio_unitario === 0 ? '' : item.precio_unitario} onChange={e => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right', padding: '3px', border: 'none', background: 'transparent' }} />
                        </td>
                      </tr>
                    )) : proforma.items?.map((item, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #1e4b8f', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left' }}>{item.descripcion}</td>
                        <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'right', width: '120px' }}>{item.precio_unitario}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {mostrarFormulario && <button className="print-hide" onClick={agregarItem} style={{ padding: '5px 10px', cursor: 'pointer', marginBottom: '20px' }}>+ AGREGAR LÍNEA</button>}

              {/* TABLA DE SOLICITUD DE REPUESTOS */}
              <h4 style={{ marginBottom: '5px', fontSize: '14px' }}>* SOLICITUD DE REPUESTOS</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'center', color: '#1e4b8f', width: '50px' }}>ITEM</th>
                    <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left', color: '#1e4b8f', width: '100%' }}>DESCRIPCIÓN DEL REPUESTO</th>
                  </tr>
                </thead>
                <tbody>
                  {mostrarFormulario ? proforma.repuestos.map((rep, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #1e4b8f', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left' }}><input type="text" placeholder="EJ. FAROL DELANTERO..." value={rep.descripcion} onChange={e => actualizarRepuesto(index, 'descripcion', e.target.value)} style={{ width: '100%', padding: '3px', border: 'none', background: 'transparent', textAlign: 'left' }} /></td>
                      </tr>
                    )) : proforma.repuestos?.map((rep, index) => (
                      <tr key={index}>
                        <td style={{ border: '1px solid #1e4b8f', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>{index + 1}</td>
                        <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left' }}>{rep.descripcion}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {mostrarFormulario && <button className="print-hide" onClick={agregarRepuesto} style={{ padding: '5px 10px', cursor: 'pointer', marginBottom: '20px' }}>+ AGREGAR REPUESTO</button>}

              {/* CHECKBOX Y TABLA DE TRABAJOS DE TERCEROS */}
              <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                  <input type="checkbox" checked={mostrarFormulario ? proforma.tiene_terceros : proformaSeleccionada?.tiene_terceros} onChange={e => setProforma({...proforma, tiene_terceros: e.target.checked})} disabled={!mostrarFormulario} />
                  INCLUYE TRABAJOS DE TERCEROS
                </label>
              </div>

              {(mostrarFormulario ? proforma.tiene_terceros : proformaSeleccionada?.tiene_terceros) && (
                <>
                  <h4 style={{ marginBottom: '5px', fontSize: '14px' }}>TRABAJOS DE TERCEROS</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                    <thead>
                      <tr>
                        <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'center', color: '#1e4b8f', width: '50px' }}>ITEM</th>
                        <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left', color: '#1e4b8f', width: '100%' }}>SERVICIO DE TERCEROS</th>
                        <th style={{ background: '#e0e7ff', border: '1px solid #1e4b8f', padding: '5px', textAlign: 'center', color: '#1e4b8f', width: '120px' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mostrarFormulario ? proforma.terceros.map((ter, index) => (
                          <tr key={index}>
                            <td style={{ border: '1px solid #1e4b8f', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>{index + 1}</td>
                            <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left' }}><input type="text" placeholder="EJ. REPARACIÓN DE AIRE..." value={ter.descripcion} onChange={e => actualizarTercero(index, 'descripcion', e.target.value)} style={{ width: '100%', padding: '3px', border: 'none', background: 'transparent', textAlign: 'left' }} /></td>
                            <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'right', width: '120px' }}>
                              <input type="number" placeholder="0" value={ter.precio_unitario === 0 ? '' : ter.precio_unitario} onChange={e => actualizarTercero(index, 'precio_unitario', parseFloat(e.target.value) || 0)} style={{ width: '100%', textAlign: 'right', padding: '3px', border: 'none', background: 'transparent' }} />
                            </td>
                          </tr>
                        )) : proforma.terceros?.map((ter, index) => (
                          <tr key={index}>
                            <td style={{ border: '1px solid #1e4b8f', textAlign: 'center', fontWeight: 'bold', width: '50px' }}>{index + 1}</td>
                            <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'left' }}>{ter.descripcion.replace('[TERCEROS] ', '')}</td>
                            <td style={{ border: '1px solid #1e4b8f', padding: '5px', textAlign: 'right', width: '120px' }}>{ter.precio_unitario}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {mostrarFormulario && <button className="print-hide" onClick={agregarTercero} style={{ padding: '5px 10px', cursor: 'pointer', marginBottom: '20px' }}>+ AGREGAR TRABAJO DE TERCEROS</button>}
                </>
              )}

              {/* TOTALES Y PIE DE PAGINA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', borderTop: '2px solid #1e4b8f', paddingTop: '10px' }}>
                <div style={{ width: '60%' }}>
                  <strong>SON: </strong> {mostrarFormulario ? totalEnLetras(calcularTotal()) : totalEnLetras(proformaSeleccionada?.total || 0)}
                  <br/><br/>
                  <div style={{ fontSize: '10px', color: '#777', fontStyle: 'italic' }}>
                    GRACIAS POR SU PREFERENCIA!!!<br/>
                    MECANICORP - CALIDAD Y CONFIANZA
                  </div>
                </div>
                <div style={{ width: '40%', textAlign: 'right' }}>
                  <div style={{ border: '2px solid #1e4b8f', background: '#e0e7ff', padding: '10px 20px', fontSize: '18px', fontWeight: 'bold', color: '#1e4b8f', display: 'inline-block' }}>
                    TOTAL BS. {mostrarFormulario ? calcularTotal() : proformaSeleccionada?.total}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODALES FLOTANTES AQUI */}
      {modalClienteAbierto && (
        <ModalCliente 
          onClose={() => setModalClienteAbierto(false)} 
          onClienteAgregado={(nuevoCliente) => {
            setClientes([...clientes, nuevoCliente]);
            setProforma({...proforma, cliente_nombre: nuevoCliente.nombre, telefono_cliente: nuevoCliente.telefono});
          }} 
        />
      )}

      {modalVehiculoAbierto && (
        <ModalVehiculo 
          onClose={() => setModalVehiculoAbierto(false)} 
          onVehiculoAgregado={(nuevoVehiculo) => {
            setVehiculos([...vehiculos, nuevoVehiculo]);
            setProforma({...proforma, placa_buscada: nuevoVehiculo.placa, vehiculo_id: nuevoVehiculo.id, marca_modelo: `${nuevoVehiculo.marca} ${nuevoVehiculo.modelo}`, color_vehiculo: nuevoVehiculo.color});
          }} 
        />
      )}
    </div>
  );
}