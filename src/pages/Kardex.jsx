import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Kardex() {
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [otSeleccionada, setOtSeleccionada] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Estados para el cálculo del Kardex
  const [montoBase, setMontoBase] = useState(0);
  const [esAlianza, setEsAlianza] = useState(false);
  const [tipoTrabajo, setTipoTrabajo] = useState('CHAPISTA');
  const [costoMateriales, setCostoMateriales] = useState(0);
  const [adicionales, setAdicionales] = useState(0);
  const [descuentoError, setDescuentoError] = useState(0); // Material extra por errores
  
  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    // Traemos las OTs que están finalizadas y aprobadas por calidad, pero que no tienen pago autorizado
    const { data: ots } = await supabase.from('ordenes_trabajo')
      .select(`*, vehiculos(placa, marca, modelo), empleados(id, nombre)`)
      .eq('estado', 'FINALIZADO'); // Asumiendo que Control de Calidad las deja en este estado

    const { data: kardex } = await supabase.from('kardex_pagos').select('ot_id');
    const idsPagados = kardex?.map(k => k.ot_id) || [];

    if (ots) {
      const pendientes = ots.filter(ot => !idsPagados.includes(ot.id));
      setOrdenesPendientes(pendientes);
    }
  };

  const abrirKardex = async (ot) => {
    setOtSeleccionada(ot);
    setMontoBase(ot.monto_aprobado_seguro > 0 ? ot.monto_aprobado_seguro : ot.proforma_total);
    setEsAlianza(ot.nombre_seguro && ot.nombre_seguro.toUpperCase().includes('ALIANZA'));
    setTipoTrabajo(ot.tipo_trabajo || 'CHAPISTA');
    setDescuentoError(0);
    setAdicionales(0);
    
    // Cargar gastos extra (materiales normales)
    const { data: gastos } = await supabase.from('ot_gastos').select('monto').eq('ot_id', ot.id);
    const totalGastos = gastos?.reduce((acc, curr) => acc + curr.monto, 0) || 0;
    setCostoMateriales(totalGastos); 

    setModalAbierto(true);
  };

  // --- LÓGICA MATEMÁTICA DEL KARDEX ---
  const calcularPago = () => {
    let montoPaso1 = parseFloat(montoBase);
    
    // 1. Descuento Alianza
    if (esAlianza) {
      montoPaso1 = montoPaso1 - (montoPaso1 * 0.25);
    }

    // 2. Descuento Factura (14.94%)
    const montoPaso2 = montoPaso1 - (montoPaso1 * 0.1494);

    // 3. Restar Materiales, Adicionales y Descuento por Error
    const totalRestas = parseFloat(costoMateriales) + parseFloat(adicionales) + parseFloat(descuentoError);
    const montoNeto = montoPaso2 - totalRestas;

    // 4. División 50/50
    const pagoBase = montoNeto / 2;

    // 5. Si es MIXTO, dividimos el pagoBase a la mitad entre ambos
    let pagoChapista = 0;
    let pagoRamplero = 0;

    if (tipoTrabajo === 'CHAPISTA') {
      pagoChapista = pagoBase;
    } else if (tipoTrabajo === 'MIXTO') {
      pagoChapista = pagoBase / 2; // Ejemplo: Bisagras, el taller cobra 1 monto, y se divide entre los 2 trabajadores
      pagoRamplero = pagoBase / 2;
    }

    return {
      montoNeto,
      pagoBase,
      pagoChapista,
      pagoRamplero,
      totalRestas
    };
  };

  const autorizarPago = async () => {
    const calculos = calcularPago();
    
    // Guardar en la base de datos
    const { error } = await supabase.from('kardex_pagos').insert([{
      ot_id: otSeleccionada.id,
      empleado_id: otSeleccionada.empleado_id, // El chapista
      monto_total_ot: montoBase,
      monto_chapista: calculos.pagoChapista,
      monto_ramplero: calculos.pagoRamplero,
      descuento_material_extra: descuentoError,
      estado: 'AUTORIZADO' // El jefe de taller aprobó
    }]);

    if (error) return alert("Error: " + error.message);
    
    alert("✅ Pago Autorizado y registrado en el Kardex.");
    setModalAbierto(false);
    cargarPendientes();
  };

  const calculos = calcularPago();

  return (
    <div>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3>Kardex - Autorización de Pagos (Jefe de Taller)</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>Trabajos aprobados por Control de Calidad listos para liquidar.</p>
        
        {ordenesPendientes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
            <h3 style={{ color: '#27ae60' }}>✅ No hay pagos pendientes de autorización.</h3>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '10px' }}>Vehículo</th>
                <th style={{ padding: '10px' }}>Trabajador</th>
                <th style={{ padding: '10px' }}>Seguro</th>
                <th style={{ padding: '10px' }}>Monto Base</th>
                <th style={{ padding: '10px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesPendientes.map(ot => (
                <tr key={ot.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{ot.vehiculos?.placa}</td>
                  <td style={{ padding: '10px' }}>{ot.empleados?.nombre}</td>
                  <td style={{ padding: '10px' }}>{ot.nombre_seguro || 'PARTICULAR'}</td>
                  <td style={{ padding: '10px' }}>Bs. {ot.monto_aprobado_seguro > 0 ? ot.monto_aprobado_seguro : ot.proforma_total}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => abrirKardex(ot)} style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Revisar y Autorizar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE KARDEX (Autorización del Jefe) */}
      {modalAbierto && otSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '10px', color: '#1e4b8f' }}>Autorización de Pago - {otSeleccionada.vehiculos?.placa}</h3>
            <p style={{ marginBottom: '20px' }}>Trabajador Asignado: <strong>{otSeleccionada.empleados?.nombre}</strong></p>

            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Tipo de Trabajo:</label>
                  <select value={tipoTrabajo} onChange={e => setTipoTrabajo(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                    <option value="CHAPISTA">Solo Chapista (100%)</option>
                    <option value="MIXTO">Compartido (Chapista 50% / Ramplero 50%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Descuento por Error (Material extra):</label>
                  <input type="number" value={descuentoError} onChange={e => setDescuentoError(e.target.value)} style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              <hr style={{ margin: '15px 0', borderColor: '#bbf7d0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                <span>Monto Base ({esAlianza ? 'Alianza' : 'Particular/Otro'}):</span>
                <strong>Bs. {montoBase}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                <span>Menos Descuento Factura/Alianza:</span>
                <strong>Bs. {(montoBase - calculos.montoNeto - calculos.totalRestas).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                <span>Menos Materiales y Descuentos:</span>
                <strong>Bs. {calculos.totalRestas.toFixed(2)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', padding: '10px', background: '#dcfce7', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', color: '#15803d' }}>
                <span>Total a Pagar al Chapista:</span>
                <span>Bs. {calculos.pagoChapista.toFixed(2)}</span>
              </div>

              {tipoTrabajo === 'MIXTO' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', padding: '10px', background: '#e0f2fe', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', color: '#0369a1' }}>
                  <span>Total a Pagar al Ramplero:</span>
                  <span>Bs. {calculos.pagoRamplero.toFixed(2)}</span>
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalAbierto(false)} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc' }}>Cancelar</button>
              <button onClick={autorizarPago} style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                ✅ Autorizar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}