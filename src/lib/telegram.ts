import { supabase } from './supabase';

export type TelegramEventType =
  | 'on_arrival_patio'
  | 'on_planta2_dispatch'
  | 'on_dock_assigned'
  | 'on_dock_released'
  | 'on_long_wait_patio'
  | 'on_long_dock_stay';

export interface TelegramRecipient {
  id: string;
  name: string;
  chat_id: string;
  username?: string;
  role?: string;
  enabled: boolean;
  events: Record<TelegramEventType, boolean>;
}

export interface TelegramAlertRules {
  on_arrival_patio: boolean;
  on_planta2_dispatch: boolean;
  on_dock_assigned: boolean;
  on_dock_released: boolean;
  on_long_wait_patio: boolean;
  long_wait_patio_minutes: number;
  on_long_dock_stay: boolean;
  long_dock_stay_minutes: number;
}

export interface TelegramConfig {
  id: string;
  bot_token: string;
  enabled: boolean;
  accounts: TelegramRecipient[];
  rules: TelegramAlertRules;
  updated_at?: string;
}

export const DEFAULT_TELEGRAM_RULES: TelegramAlertRules = {
  on_arrival_patio: true,
  on_planta2_dispatch: true,
  on_dock_assigned: true,
  on_dock_released: true,
  on_long_wait_patio: true,
  long_wait_patio_minutes: 45,
  on_long_dock_stay: true,
  long_dock_stay_minutes: 90,
};

export const DEFAULT_EVENTS_MAP: Record<TelegramEventType, boolean> = {
  on_arrival_patio: true,
  on_planta2_dispatch: true,
  on_dock_assigned: true,
  on_dock_released: true,
  on_long_wait_patio: true,
  on_long_dock_stay: true,
};

const LOCAL_STORAGE_KEY = 'nexus_dock_telegram_config';

export async function fetchTelegramConfig(): Promise<TelegramConfig> {
  try {
    const { data, error } = await supabase
      .from('telegram_config')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!error && data) {
      const config: TelegramConfig = {
        id: data.id || 'default',
        bot_token: data.bot_token || '',
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
        rules: { ...DEFAULT_TELEGRAM_RULES, ...(data.rules || {}) },
        updated_at: data.updated_at,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
      }
      return config;
    }
  } catch (err) {
    console.warn('[Telegram] Fallback a localStorage al leer configuración:', err);
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          id: 'default',
          bot_token: parsed.bot_token || '',
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          rules: { ...DEFAULT_TELEGRAM_RULES, ...(parsed.rules || {}) },
        };
      } catch {
        // ignore
      }
    }
  }

  return {
    id: 'default',
    bot_token: '',
    enabled: true,
    accounts: [],
    rules: { ...DEFAULT_TELEGRAM_RULES },
  };
}

export async function saveTelegramConfig(config: TelegramConfig): Promise<boolean> {
  const payload = {
    id: 'default',
    bot_token: config.bot_token.trim(),
    enabled: config.enabled,
    accounts: config.accounts,
    rules: config.rules,
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  }

  try {
    const { error } = await supabase
      .from('telegram_config')
      .upsert([payload], { onConflict: 'id' });

    if (error) {
      console.error('[Telegram] Error guardando en Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] Excepción guardando en Supabase:', err);
    return false;
  }
}

export async function sendTelegramDirectMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { ok: false, error: 'Falta Bot Token o Chat ID' };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `Error HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error de red al conectar con Telegram' };
  }
}

export async function dispatchTelegramAlert(
  eventType: TelegramEventType,
  messageHtml: string,
  overrideConfig?: TelegramConfig
): Promise<{ sentCount: number; errors: string[] }> {
  const config = overrideConfig || (await fetchTelegramConfig());

  if (!config.enabled || !config.bot_token) {
    return { sentCount: 0, errors: [] };
  }

  // Verificar si la regla global para este evento está activa
  if (!config.rules[eventType]) {
    return { sentCount: 0, errors: [] };
  }

  const targetAccounts = config.accounts.filter(
    (acc) => acc.enabled && acc.chat_id && (acc.events?.[eventType] ?? true)
  );

  if (targetAccounts.length === 0) {
    return { sentCount: 0, errors: [] };
  }

  let sentCount = 0;
  const errors: string[] = [];

  await Promise.all(
    targetAccounts.map(async (acc) => {
      const res = await sendTelegramDirectMessage(config.bot_token, acc.chat_id, messageHtml);
      if (res.ok) {
        sentCount++;
      } else {
        errors.push(`${acc.name} (${acc.chat_id}): ${res.error}`);
      }
    })
  );

  return { sentCount, errors };
}

export interface DetectedTelegramChat {
  chat_id: string;
  name: string;
  username: string;
  type: string;
  last_message?: string;
}

export async function detectRecentTelegramChats(
  botToken: string
): Promise<{ ok: boolean; chats: DetectedTelegramChat[]; botUsername?: string; error?: string }> {
  if (!botToken.trim()) {
    return { ok: false, chats: [], error: 'Ingresa un Bot Token válido primero.' };
  }

  try {
    const token = botToken.trim();
    const [meRes, updatesRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getMe`),
      fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`),
    ]);

    const meData = await meRes.json();
    const updatesData = await updatesRes.json();

    if (!updatesData.ok) {
      return {
        ok: false,
        chats: [],
        error: updatesData.description || 'No se pudo obtener actualizaciones del bot',
      };
    }

    const botUsername = meData?.result?.username ? `@${meData.result.username}` : undefined;
    const chatMap = new Map<string, DetectedTelegramChat>();

    for (const item of updatesData.result || []) {
      const msg = item.message || item.edited_message || item.channel_post || item.my_chat_member;
      const chat = msg?.chat;
      if (!chat || !chat.id) continue;

      const chatIdStr = String(chat.id);
      const fullName =
        chat.title ||
        [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
        chat.username ||
        `Chat ${chatIdStr}`;

      const username = chat.username ? `@${chat.username}` : '';
      const chatType =
        chat.type === 'private'
          ? 'Personal'
          : chat.type === 'group' || chat.type === 'supergroup'
          ? 'Grupo'
          : 'Canal';

      chatMap.set(chatIdStr, {
        chat_id: chatIdStr,
        name: fullName,
        username,
        type: chatType,
        last_message: item.message?.text || undefined,
      });
    }

    return {
      ok: true,
      chats: Array.from(chatMap.values()),
      botUsername,
    };
  } catch (err: any) {
    return {
      ok: false,
      chats: [],
      error: err.message || 'Error al consultar API de Telegram',
    };
  }
}
