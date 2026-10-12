import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import LoginPage from './components/LoginPage.tsx';
import DriverPortal from './components/DriverPortal.tsx';
import { supabase } from './lib/supabase.ts';
import type { User } from '@supabase/supabase-js';

import { QrDockReleaseModal } from './components/QrDockManager.tsx';

const ALLOWED_DOMAIN = 'cial.cl';

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [driverModeActive, setDriverModeActive] = useState<boolean>(
    localStorage.getItem('nexus_driver_view_active') === 'true'
  );
  const [qrReleaseDockId, setQrReleaseDockId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('qr_release_dock');
  });

  const handleCloseQrModal = () => {
    setQrReleaseDockId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('qr_release_dock');
      window.history.replaceState({}, '', url.toString());
    }
  };

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

  // 0. Si se abrió escaneando el QR de un semáforo de andén (?qr_release_dock=...) y no hay sesión en App
  if (qrReleaseDockId && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <QrDockReleaseModal
          dockId={qrReleaseDockId}
          onClose={handleCloseQrModal}
        />
      </div>
    );
  }

  // 1. Si el modo de choferes está activo, se muestra el Portal de Conductores
  if (driverModeActive && !qrReleaseDockId) {
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
    <App currentUser={user} />
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
