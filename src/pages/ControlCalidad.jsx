import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ControlCalidad() {
  const [pestanaActiva, setPestanaActiva] = useState('PENDIENTES');
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [historialCalidad, setHistorialCalidad] = useState([]);
  
  const [otSeleccionada, setOtSeleccionada] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  
  // Estados de la inspección
  const [checklist, setChecklist] = useState([
    { item: 'Pintura y Acabados', ok: true },
    { item: 'Alineación de Paneles', ok: true },
    { item: 'Limpieza General', ok: true },
    { item: 'Funcionamiento de Luces', ok: true },
    { item: 'Accesorios Completos', ok: true },
    { item: 'Nivel de Fluidos', ok: true },
  ]);
  const [observaciones, setObservaciones] = useState('');
  
  useEffect(() => {
    cargarDatos();
  }, [pestanaActiva]);

  const cargarDatos = async () => {
    // 1. Cargamos los pendientes (OTs finalizadas que no tienen control)
    const { data: ots } = await supabase.from('ordenes_trabajo')
      .select(`*, vehiculos (placa, marca, modelo), empleados (nombre), recepciones (cliente_nombre)`)
      .eq('estado', 'FINALIZADO');

    const { data: controles } = await supabase.from('control_calidad').select('*').order('fecha_evaluacion', { ascending: false });
    
    if (ots && controles) {
      const controlesIds = controles.map(c => c.ot_id);
      const pendientes = ots.filter(ot => !controlesIds.includes(ot.id));
      setOrdenesPendientes(pendientes);

      // 2. Preparamos el historial con los datos de la OT
      const historialCompleto = await Promise.all(controles.map(async (ctrl) => {
        const { data: ot } = await supabase.from('ordenes_trabajo')
          .select(`*, vehiculos(placa, marca, modelo), empleados(nombre)`)
          .eq('id', ctrl.ot_id).single();
        return { ...ctrl, ordenInfo: ot };
      }));
      setHistorialCalidad(historialCompleto);
    }
  };

  const abrirInspeccion = (ot) => {
    setOtSeleccionada(ot);
    setObservaciones('');
    // Reiniciar checklist
    setChecklist(checklist.map(c => ({ ...c, ok: true })));
    setModalAbierto(true);
  };

  const toggleChecklist = (index) => {
    const nuevo = [...checklist];
    nuevo[index].ok = !nuevo[index].ok;
    setChecklist(nuevo);
  };

    const guardarInspeccion = async () => {
    if (!otSeleccionada) return;

    const todoOk = checklist.every(c => c.ok === true);
    const hayObservaciones = observaciones.trim() !== '';

    if (!todoOk && !hayObservaciones) {
      return alert("Si hay fallas (❌), debe escribir una observación para que el trabajador sepa qué corregir.");
    }

    // 1. Guardar el control
    const { error } = await supabase.from('control_calidad').insert([{
      ot_id: otSeleccionada.id,
      aprobado: todoOk,
      observaciones: observaciones.toUpperCase(),
      checklist_calidad: checklist,
      evaluado_por: 'ASESOR' 
    }]);

    if (error) return alert("Error: " + error.message);

    // 2. Si NO se aprueba, la OT vuelve a "EN_PROCESO" y se genera una sola fase de corrección
    if (!todoOk) {
      // Borramos las fases viejas para que no se acumulen
      await supabase.from('ot_fases').delete().eq('ot_id', otSeleccionada.id);
      
      // Creamos la fase única de corrección
      await supabase.from('ot_fases').insert([{
        ot_id: otSeleccionada.id,
        nombre_fase: 'CORRECCION DE OBSERVACIONES',
        estado: 'PENDIENTE'
      }]);

      // Actualizamos la OT con la observación en rojo y reseteamos el avance a 0
      await supabase.from('ordenes_trabajo').update({ 
        estado: 'EN_PROCESO',
        avance: 0,
        observacion_chapista: `RECHAZADO EN CALIDAD: ${observaciones.toUpperCase()}`
      }).eq('id', otSeleccionada.id);
      
      alert("❌ Trabajo RECHAZADO. El chapista verá solo la corrección en su taller.");
    } else {
      alert("✅ Trabajo APROBADO. Listo para entrega al cliente.");
    }

    setModalAbierto(false);
    cargarDatos();
  };

   return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setPestanaActiva('PENDIENTES')} style={{ padding: '10px 20px', background: pestanaActiva === 'PENDIENTES' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Pendientes de Revisión</button>
        <button onClick={() => setPestanaActiva('HISTORIAL')} style={{ padding: '10px 20px', background: pestanaActiva === 'HISTORIAL' ? '#1e4b8f' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Historial de Evaluaciones</button>
      </div>

      {pestanaActiva === 'PENDIENTES' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          {ordenesPendientes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
              <h3 style={{ color: '#27ae60' }}>✅ No hay vehículos pendientes.</h3>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={{ padding: '10px' }}>Vehículo</th>
                  <th style={{ padding: '10px' }}>Cliente</th>
                  <th style={{ padding: '10px' }}>Trabajador</th>
                  <th style={{ padding: '10px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenesPendientes.map(ot => (
                  <tr key={ot.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{ot.vehiculos?.placa}</td>
                    <td style={{ padding: '10px' }}>{ot.recepciones?.cliente_nombre}</td>
                    <td style={{ padding: '10px' }}>{ot.empleados?.nombre}</td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => abrirInspeccion(ot)} style={{ padding: '5px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Inspeccionar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {pestanaActiva === 'HISTORIAL' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '10px' }}>Fecha</th>
                <th style={{ padding: '10px' }}>Vehículo</th>
                <th style={{ padding: '10px' }}>Trabajador</th>
                <th style={{ padding: '10px' }}>Resultado</th>
                <th style={{ padding: '10px' }}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {historialCalidad.map(ctrl => (
                <tr key={ctrl.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{new Date(ctrl.fecha_evaluacion).toLocaleDateString()}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{ctrl.ordenInfo?.vehiculos?.placa}</td>
                  <td style={{ padding: '10px' }}>{ctrl.ordenInfo?.empleados?.nombre}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', background: ctrl.aprobado ? '#d4edda' : '#f8d7da', color: ctrl.aprobado ? '#155724' : '#721c24', borderRadius: '3px', fontWeight: 'bold' }}>
                      {ctrl.aprobado ? '✅ APROBADO' : '❌ RECHAZADO'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontSize: '12px' }}>{ctrl.observaciones || '-'}</td>
                </tr>
              ))}
              {historialCalidad.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No hay historial.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE INSPECCIÓN (Igual que antes) */}
      {modalAbierto && otSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '10px', color: '#1e4b8f' }}>Inspección: {otSeleccionada.vehiculos?.placa}</h3>
            
            <div style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              {checklist.map((c, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '8px 0' }}>
                  <span>{c.item}</span>
                  <button type="button" onClick={() => toggleChecklist(index)} style={{ padding: '5px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', background: c.ok ? '#d4edda' : '#f8d7da', color: c.ok ? '#155724' : '#721c24' }}>
                    {c.ok ? '✅ OK' : '❌ FALLA'}
                  </button>
                </div>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Observaciones para el chapista (Obligatorio si hay fallas):</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows="3" style={{ width: '100%', padding: '10px', marginBottom: '20px', textTransform: 'uppercase' }}></textarea>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalAbierto(false)} style={{ padding: '10px 20px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardarInspeccion} style={{ padding: '10px 20px', background: checklist.every(c => c.ok) ? '#27ae60' : '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                {checklist.every(c => c.ok) ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}