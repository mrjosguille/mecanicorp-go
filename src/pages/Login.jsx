import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- NUEVO
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate(); // <-- NUEVO

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); // Limpiamos errores previos
    
    const { error } = await login(email, password);
    
    if (error) {
      setErrorMsg('Correo o contraseña incorrectos.');
    } else {
      navigate('/'); // <-- NUEVO: Te manda al panel de control si todo está bien
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo-mecanicorp.png" alt="Logo" style={{ width: '120px', marginBottom: '15px' }} />
          <h2 style={{ color: '#1e293b', margin: 0 }}>Mecanicorp Go</h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Ingresa tus credenciales</p>
        </div>

        {errorMsg && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{errorMsg}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
          <button type="submit" style={{ padding: '12px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}