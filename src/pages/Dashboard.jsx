import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({ vehiculos: 0, ordenes: 0, proformas: 0, entregasHoy: 0 });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    // 1. Vehículos en taller (que no estén cerrados)
    const { count: vehiculosCount } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).neq('estado', 'CERRADO');
    
    // 2. Órdenes activas (pendientes o en proceso)
    const { count: ordenesCount } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).in('estado', ['PENDIENTE', 'EN_PROCESO']);
    
    // 3. Proformas (puedes contar las que no tienen orden de trabajo creada)
    const { count: proformasCount } = await supabase.from('proformas').select('*', { count: 'exact', head: true });
    
    // 4. Entregas de hoy (Usamos la fecha actual)
    const hoy = new Date().toISOString().split('T')[0];
    const { count: entregasCount } = await supabase.from('actas_cliente').select('*', { count: 'exact', head: true }).gte('fecha_entrega', hoy);

    setStats({
      vehiculos: vehiculosCount || 0,
      ordenes: ordenesCount || 0,
      proformas: proformasCount || 0,
      entregasHoy: entregasCount || 0
    });
  };

  return (
    <div>
      <h1 style={{ color: 'var(--mecanicorp-blue)' }}>Bienvenido a Mecanicorp Go</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Aquí tienes un resumen de tu taller hoy.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Vehículos en Taller</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--mecanicorp-blue)', margin: 0 }}>{stats.vehiculos}</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Órdenes Activas</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--mecanicorp-blue)', margin: 0 }}>{stats.ordenes}</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Proformas Totales</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--mecanicorp-blue)', margin: 0 }}>{stats.proformas}</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Entregas de Hoy</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--mecanicorp-blue)', margin: 0 }}>{stats.entregasHoy}</p>
        </div>
      </div>
    </div>
  );
}