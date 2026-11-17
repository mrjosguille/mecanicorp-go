import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function EntregaCliente() {
  const [ordenesListas, setOrdenesListas] = useState([]);
  const [otSeleccionada, setOtSeleccionada] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  
  // Checklist Técnico
  const [checklist, setChecklist] = useState([
    { item: 'Trabajos Realizados Correctamente', ok: true },
    { item: 'Limpieza Interior y Exterior', ok: true },
    { item: 'Nivel de Combustible', ok: true },
    { item: 'Luces Interiores y Exteriores', ok: true },
    { item: 'Nivel de Fluidos (Aceite, Refrigerante)', ok: true },
    { item: 'Kilometraje Registrado', ok: true },
    { item: 'Accesorios y Pertenencias Completas', ok: true },
  ]);
  
  const [observaciones, setObservaciones] = useState('');
  const [repuestosPendientes, setRepuestosPendientes] = useState('');
  const [firmaDataUrl, setFirmaDataUrl] = useState('');
  const [fotos, setFotos] = useState([]);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    cargarOrdenesListas();
  }, []);

  const cargarOrdenesListas = async () => {
    const { data: controles } = await supabase.from('control_calidad').select('ot_id').eq('aprobado', true);
    const { data: actas } = await supabase.from('actas_cliente').select('ot_id');
    
    if (controles && actas) {
      const idsAprobados = controles.map(c => c.ot_id);
      const idsEntregados = actas.map(a => a.ot_id);
      const pendientesIds = idsAprobados.filter(id => !idsEntregados.includes(id));

      if (pendientesIds.length > 0) {
        const { data: ots } = await supabase.from('ordenes_trabajo')
          .select(`*, vehiculos(placa, marca, modelo), recepciones(cliente_nombre, id)`)
          .in('id', pendientesIds);
        if (ots) setOrdenesListas(ots);
      } else {
        setOrdenesListas([]);
      }
    }
  };

  // --- LÓGICA DE FIRMA ---
  useEffect(() => {
    if (modalAbierto && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const getCoordinates = (e) => {
        const rect = canvas.getBoundingClientRect();
        return { x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top };
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
  }, [modalAbierto, isDrawing]);

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDataUrl('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const nuevasFotos = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setFotos([...fotos, ...nuevasFotos]);
  };

  const eliminarFoto = (index) => {
    const nuevasFotos = [...fotos];
    nuevasFotos.splice(index, 1);
    setFotos(nuevasFotos);
  };

  const toggleChecklist = (index) => {
    const nuevo = [...checklist];
    nuevo[index].ok = !nuevo[index].ok;
    setChecklist(nuevo);
  };

  const abrirModal = async (ot) => {
    setOtSeleccionada(ot);
    setObservaciones('');
    setRepuestosPendientes('');
    setFotos([]);
    setFirmaDataUrl('');
    setChecklist(checklist.map(c => ({ ...c, ok: true })));
    
    // VALIDACIÓN: Buscar si hay repuestos pendientes en la proforma
    const { data: profData } = await supabase.from('proformas').select('numero_proforma').eq('vehiculo_id', ot.vehiculo_id).order('fecha', { ascending: false }).limit(1);
    if (profData && profData.length > 0) {
      const { data: pendientes } = await supabase.from('recepcion_repuestos').select('nombre_repuesto').eq('numero_proforma', profData[0].numero_proforma).eq('estado', 'INCOMPLETO');
      if (pendientes && pendientes.length > 0) {
        setRepuestosPendientes(pendientes.map(p => p.nombre_repuesto).join(', '));
      }
    }

    setModalAbierto(true);
  };

  const confirmarEntrega = async () => {
    if (!firmaDataUrl) return alert("Se requiere la firma del cliente.");
    const todoOk = checklist.every(c => c.ok === true);

    // 1. Subir firma
    const fileName = `firma_cliente_${otSeleccionada.id}_${Date.now()}.png`;
    const res = await fetch(firmaDataUrl);
    const blob = await res.blob();
    await supabase.storage.from('recepciones_fotos').upload(fileName, blob);
    const { data: urlData } = supabase.storage.from('recepciones_fotos').getPublicUrl(fileName);

    // 2. Subir fotos finales
    const urlsFotos = [];
    for (const foto of fotos) {
      const ext = foto.file.name.split('.').pop();
      const fName = `entrega_${otSeleccionada.id}_${Date.now()}.${ext}`;
      await supabase.storage.from('recepciones_fotos').upload(fName, foto.file);
      const { data: fUrl } = supabase.storage.from('recepciones_fotos').getPublicUrl(fName);
      urlsFotos.push(fUrl.publicUrl);
    }

    // 3. Guardar Acta de Cliente
    const { error } = await supabase.from('actas_cliente').insert([{
      ot_id: otSeleccionada.id,
      firma_cliente: urlData.publicUrl,
      observaciones_cliente: observaciones.toUpperCase(),
      checklist_entrega: checklist,
      fotos_entrega: urlsFotos,
      repuestos_pendientes: repuestosPendientes
    }]);

    if (error) return alert("Error al guardar acta: " + error.message);

    // 4. Cerrar la OT
    await supabase.from('ordenes_trabajo').update({ estado: 'CERRADO' }).eq('id', otSeleccionada.id);

    // 5. GENERAR KARDEX (Pago al trabajador)
    const { data: otData } = await supabase.from('ordenes_trabajo').select('*, empleados(id)').eq('id', otSeleccionada.id).single();
    if (otData && otData.empleado_id) {
        // Por defecto asumimos 50% de comisión, luego se puede cambiar
        const porcentaje = 50; 
        const montoPago = (otData.proforma_total * porcentaje) / 100;
        
        await supabase.from('kardex_pagos').insert([{
            ot_id: otData.id,
            empleado_id: otData.empleado_id,
            monto_total_ot: otData.proforma_total,
            porcentaje_aplicado: porcentaje,
            monto_a_pagar: montoPago
        }]);
    }

    alert("✅ Vehículo entregado. Acta firmada y Kardex generado.");
    setModalAbierto(false);
    cargarOrdenesListas();
  };

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Entrega al Cliente</h2>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3>Vehículos Listos para Entregar</h3>
        {ordenesListas.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
            <h3 style={{ color: '#27ae60' }}>✅ No hay vehículos pendientes.</h3>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '10px' }}>Vehículo</th>
                <th style={{ padding: '10px' }}>Cliente</th>
                <th style={{ padding: '10px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesListas.map(ot => (
                <tr key={ot.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{ot.vehiculos?.placa}</td>
                  <td style={{ padding: '10px' }}>{ot.recepciones?.cliente_nombre}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => abrirModal(ot)} style={{ padding: '5px 10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Generar Acta y Firmar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE ENTREGA FINAL CON CHECKLIST */}
      {modalAbierto && otSeleccionada && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '10px', color: '#1e4b8f' }}>Acta de Entrega Final</h3>
            <p style={{ marginBottom: '20px' }}>Vehículo: <strong>{otSeleccionada.vehiculos?.placa}</strong> - Cliente: <strong>{otSeleccionada.recepciones?.cliente_nombre}</strong></p>

            {/* AVISO DE REPUESTOS PENDIENTES */}
            {repuestosPendientes && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                <strong>⚠️ ATENCIÓN: Repuestos Pendientes de Llegada:</strong><br/>
                {repuestosPendientes}<br/>
                <small>Se recomienda informar al cliente que estos repuestos se instalarán cuando lleguen.</small>
              </div>
            )}

            <div style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              <h4 style={{ marginBottom: '10px' }}>Checklist de Entrega (Verificación Física):</h4>
              {checklist.map((c, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '8px 0' }}>
                  <span>{c.item}</span>
                  <button type="button" onClick={() => toggleChecklist(index)} style={{ padding: '5px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', background: c.ok ? '#d4edda' : '#f8d7da', color: c.ok ? '#155724' : '#721c24' }}>
                    {c.ok ? '✅ OK' : '❌ FALLA'}
                  </button>
                </div>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Observaciones del Cliente:</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows="2" style={{ width: '100%', padding: '10px', marginBottom: '20px', textTransform: 'uppercase' }} placeholder="Ej. Todo conforme, excelente trabajo."></textarea>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Fotos del Estado Final (Opcional):</label>
            <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px' }}>📷 Cargar Fotos</button>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {fotos.map((f, i) => (
                <div key={i} style={{ position: 'relative', border: '1px solid #ccc', padding: '5px', borderRadius: '5px' }}>
                  <img src={f.preview} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                  <button onClick={() => eliminarFoto(i)} style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px' }}>X</button>
                </div>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Firma del Cliente (Recibido Conforme):</label>
            <div style={{ border: '2px dashed #ccc', borderRadius: '5px', background: '#f9f9f9', marginBottom: '10px' }}>
              <canvas 
                ref={canvasRef} width={630} height={150} 
                style={{ width: '100%', height: '150px', cursor: 'crosshair', touchAction: 'none' }}
                onMouseUp={() => { if (canvasRef.current) setFirmaDataUrl(canvasRef.current.toDataURL()); }}
                onTouchEnd={() => { if (canvasRef.current) setFirmaDataUrl(canvasRef.current.toDataURL()); }}
              />
            </div>
            <button onClick={limpiarFirma} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', marginBottom: '20px' }}>Limpiar Firma</button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalAbierto(false)} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px', border: '1px solid #ccc' }}>Cancelar</button>
              <button onClick={confirmarEntrega} disabled={!checklist.every(c => c.ok)} style={{ padding: '10px 20px', background: checklist.every(c => c.ok) ? '#27ae60' : '#ccc', color: 'white', border: 'none', borderRadius: '5px', cursor: checklist.every(c => c.ok) ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                {checklist.every(c => c.ok) ? 'Confirmar Entrega' : 'Faltan Ítems en Checklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}