import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import LoginPage from './components/LoginPage.tsx';
import DriverPortal from './components/DriverPortal.tsx';
import { supabase } from './lib/supabase.ts';
import type { User } from '@supabase/supabase-js';

const ALLOWED_DOMAIN = 'cial.cl';

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [driverModeActive, setDriverModeActive] = useState<boolean>(
    localStorage.getItem('nexus_driver_view_active') === 'true'
  );

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      // Validar dominio incluso en sesión existente
      if (u && u.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        setUser(u);
      } else if (u) {
        // Sesión de dominio no permitido → cerrar sesión
        supabase.auth.signOut();
        setUser(null);
      }
      setAuthLoading(false);
    });

    // Escuchar cambios de sesión en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u && u.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        setUser(u);
      } else {
        if (u) supabase.auth.signOut();
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a5c36] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-xs font-semibold tracking-wider uppercase">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // 1. Si el modo de choferes está activo, se muestra el Portal de Conductores
  if (driverModeActive) {
    return (
      <DriverPortal 
        onBackToLogin={() => {
          localStorage.removeItem('nexus_driver_view_active');
          setDriverModeActive(false);
        }} 
      />
    );
  }

  // 2. Si no está activo, flujo normal de auth
  return user ? (
    <App />
  ) : (
    <LoginPage 
      onDriverClick={() => {
        localStorage.setItem('nexus_driver_view_active', 'true');
        setDriverModeActive(true);
      }} 
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
