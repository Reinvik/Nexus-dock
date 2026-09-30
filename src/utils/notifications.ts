// Sistema de Notificaciones Móviles, Audio Háptico y PWA para Nexus Dock

export type NotificationType = 'arrival' | 'assignment' | 'alert';

const STORAGE_KEY_ENABLED = 'nexus_dock_notifications_enabled';
const STORAGE_KEY_SOUND_ENABLED = 'nexus_dock_sound_enabled';

// Registrar Service Worker para permitir notificaciones en segundo plano y PWA
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[PWA] Error al registrar Service Worker:', err);
    return null;
  }
};

// Verificar estado de permisos de notificación
export const getNotificationPermissionState = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

// Solicitar permisos de notificación nativa al usuario
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
      localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error al solicitar permiso de notificaciones:', err);
    return false;
  }
};

// Preferencias de usuario
export const areNotificationsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(STORAGE_KEY_ENABLED);
  return saved !== 'false' && getNotificationPermissionState() === 'granted';
};

export const setNotificationsEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
};

export const isSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
  return saved !== 'false';
};

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, enabled ? 'true' : 'false');
};

// Reproductor de archivos de audio reales (WAV de alta compatibilidad con pantalla bloqueada)
export const playNotificationSound = (type: NotificationType) => {
  if (!isSoundEnabled() || typeof window === 'undefined') return;

  const soundPath = type === 'arrival' 
    ? '/arrival.wav' 
    : type === 'assignment' 
      ? '/assignment.wav' 
      : '/alert.wav';

  try {
    const audio = new Audio(soundPath);
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Audio] Error al reproducir archivo WAV, probando sintetizador:', err);
        playSynthesizedChime(type);
      });
    }
  } catch (e) {
    playSynthesizedChime(type);
  }
};

// Generador de audio sintetizado con Web Audio API (fallback)
export const playSynthesizedChime = (type: NotificationType) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    if (type === 'arrival') {
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);
        gain.gain.setValueAtTime(0, now + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.33);
      });
    } else if (type === 'assignment') {
      const freqs = [440, 554.37, 659.25]; // A4, C#5, E5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.10);
        gain.gain.setValueAtTime(0, now + idx * 0.10);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.10 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.10 + 0.30);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.10);
        osc.stop(now + idx * 0.10 + 0.31);
      });
    } else {
      [0, 0.20].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset);
        osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.16);
        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.17);
      });
    }
  } catch (e) {
    console.warn('[Audio] Error al reproducir chime acústico sintetizado:', e);
  }
};

// Vibración háptica en celulares (patrón contundente para bolsillo)
export const triggerVibration = (type: NotificationType) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'alert') {
        navigator.vibrate([500, 200, 500, 200, 500]);
      } else if (type === 'assignment') {
        navigator.vibrate([400, 150, 400]);
      } else {
        navigator.vibrate([400, 150, 400]);
      }
    } catch (e) {
      console.warn('[Vibration] No soportada o bloqueada por política de energía:', e);
    }
  }
};

const recentNotifications = new Map<string, number>();

// Enviar Notificación al Celular / Sistema Operativo
export const sendMobileNotification = async ({
  title,
  body,
  type = 'arrival',
  tag
}: {
  title: string;
  body: string;
  type?: NotificationType;
  tag?: string;
}) => {
  // Deduplicación para evitar ráfagas dobles en menos de 3.5 segundos
  const dedupKey = tag || `${title}-${body}`;
  const now = Date.now();
  if (recentNotifications.has(dedupKey)) {
    const lastTime = recentNotifications.get(dedupKey)!;
    if (now - lastTime < 3500) {
      return;
    }
  }
  recentNotifications.set(dedupKey, now);

  if (recentNotifications.size > 50) {
    for (const [k, v] of recentNotifications.entries()) {
      if (now - v > 15000) recentNotifications.delete(k);
    }
  }

  // 1. Siempre reproducir sonido y vibración
  playNotificationSound(type);
  triggerVibration(type);

  // 2. Si no hay soporte o permisos de notificación, retornar
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: tag || `nexus-dock-${Date.now()}`,
    vibrate: type === 'alert' ? [500, 200, 500, 200, 500] : [400, 150, 400],
    renotify: true,
    silent: false, // Forzar a Android a no enviar la notificación en modo silencioso
    requireInteraction: true, // Mantener en pantalla de bloqueo
    data: { url: window.location.origin }
  };

  try {
    // Intentar a través de Service Worker (clave para pantalla bloqueada)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        return;
      }
    }

    // Fallback a Notification API estándar
    new Notification(title, notificationOptions);
  } catch (err) {
    console.warn('[Notification] Falló el despacho de la notificación:', err);
  }
};

// ============================================================================
// MODO GUARDIA / PATIO ACTIVO (Mantiene viva la conexión WebSocket con pantalla bloqueada)
// ============================================================================
let keepAliveAudioElement: HTMLAudioElement | null = null;
let wakeLockInstance: any = null;

const STORAGE_KEY_PATIO_MODE = 'nexus_dock_patio_mode';

export const isBackgroundPatioModeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_PATIO_MODE) === 'true';
};

export const startBackgroundPatioMode = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Iniciar loop de audio silencioso keep-alive
    if (!keepAliveAudioElement) {
      keepAliveAudioElement = new Audio('/keepalive.wav');
      keepAliveAudioElement.loop = true;
      keepAliveAudioElement.volume = 0.05; // Bajo nivel para evitar saturación
    }

    await keepAliveAudioElement.play();

    // 2. Registrar sesión multimedia (indica al sistema operativo que la app está en servicio activo)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Nexus Dock | Guardia Activo',
        artist: 'Monitoreo de Patio en Vivo',
        album: 'Patio Inbound CiAL',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    // 3. Solicitar WakeLock si está disponible
    if ('wakeLock' in navigator) {
      try {
        wakeLockInstance = await (navigator as any).wakeLock.request('screen');
        wakeLockInstance.addEventListener('release', () => {
          wakeLockInstance = null;
        });
      } catch (wlErr) {
        console.warn('[WakeLock] No concedido:', wlErr);
      }
    }

    localStorage.setItem(STORAGE_KEY_PATIO_MODE, 'true');
    return true;
  } catch (err) {
    console.error('[PatioMode] Error al activar modo segundo plano:', err);
    return false;
  }
};

export const stopBackgroundPatioMode = () => {
  if (typeof window === 'undefined') return;

  try {
    if (keepAliveAudioElement) {
      keepAliveAudioElement.pause();
      keepAliveAudioElement.currentTime = 0;
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }

    if (wakeLockInstance) {
      wakeLockInstance.release();
      wakeLockInstance = null;
    }

    localStorage.setItem(STORAGE_KEY_PATIO_MODE, 'false');
  } catch (err) {
    console.error('[PatioMode] Error al desactivar:', err);
  }
};

export const toggleBackgroundPatioMode = async (): Promise<boolean> => {
  if (isBackgroundPatioModeActive()) {
    stopBackgroundPatioMode();
    return false;
  } else {
    return await startBackgroundPatioMode();
  }
};
