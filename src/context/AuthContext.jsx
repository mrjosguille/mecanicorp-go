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
  
   // FORZAMOS EL LOADING A FALSE PARA PROBAR
  const [loading, setLoading] = useState(false); 

    useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'TOKEN_REFRESHED') {
        setSession(session);
        if (session) {
          fetchPerfil(session.user.id);
        } else {
          setPerfil(null);
          setLoading(false);
        }
      }
    });

    // ESTO ES CLAVE: Sin dependencias para que solo se ejecute una vez
    return () => subscription.unsubscribe();
  }, []); // <--- Asegúrate de que este arreglo esté VACÍO

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