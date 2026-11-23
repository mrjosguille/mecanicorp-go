import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Inicializamos leyendo del localStorage para que sea instantáneo
  const [session, setSession] = useState(() => {
    const savedSession = localStorage.getItem('mecanicorp_session');
    return savedSession ? JSON.parse(savedSession) : null;
  });
  
  const [perfil, setPerfil] = useState(() => {
    const savedPerfil = localStorage.getItem('mecanicorp_perfil');
    return savedPerfil ? JSON.parse(savedPerfil) : null;
  });
  
  // Solo mostramos "Cargando" si no hay perfil guardado previamente
  const [loading, setLoading] = useState(!perfil); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id);
      } else {
        setLoading(false);
        localStorage.removeItem('mecanicorp_session');
        localStorage.removeItem('mecanicorp_perfil');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignoramos los refrescos de token en segundo plano
      if (event !== 'TOKEN_REFRESHED') {
        setSession(session);
        if (session) {
          localStorage.setItem('mecanicorp_session', JSON.stringify(session));
          fetchPerfil(session.user.id);
        } else {
          setPerfil(null);
          setLoading(false);
          localStorage.removeItem('mecanicorp_session');
          localStorage.removeItem('mecanicorp_perfil');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setPerfil(data);
        localStorage.setItem('mecanicorp_perfil', JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  
  const logout = () => {
    localStorage.removeItem('mecanicorp_session');
    localStorage.removeItem('mecanicorp_perfil');
    localStorage.removeItem('borrador_proforma');
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, perfil, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);