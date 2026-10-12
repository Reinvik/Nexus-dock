import React, { useState, useEffect } from 'react';
import {
  type TelegramConfig,
  type TelegramRecipient,
  type TelegramEventType,
  type DetectedTelegramChat,
  DEFAULT_EVENTS_MAP,
  saveTelegramConfig,
  sendTelegramDirectMessage,
  detectRecentTelegramChats,
} from '../lib/telegram';
import {
  Send,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Clock,
  RefreshCw,
  Search,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
} from 'lucide-react';

const EVENT_LABELS: {
  key: TelegramEventType;
  label: string;
  shortLabel: string;
  desc: string;
  badgeColor: string;
}[] = [
  {
    key: 'on_arrival_patio',
    label: '🚛 Llegada de Camión a Patio (Espera)',
    shortLabel: '🚛 Llegada Patio',
    desc: 'Avisa cuando un camión registra su llegada y queda en espera de andén.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: 'on_planta2_dispatch',
    label: '🏭 Despacho en Ruta desde Planta 2',
    shortLabel: '🏭 Planta 2',
    desc: 'Avisa cuando Planta 2 despacha un camión en tránsito hacia el CD.',
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  {
    key: 'on_dock_assigned',
    label: '🏗️ Asignación de Andén',
    shortLabel: '🏗️ Asignación Andén',
    desc: 'Avisa cuando se asigna un andén a un camión para iniciar carga o descarga.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    key: 'on_dock_released',
    label: '✅ Andén Liberado / Camión Despachado (QR o Panel)',
    shortLabel: '✅ Andén Liberado',
    desc: 'Avisa cuando se despacha un camión y se libera el andén (por QR en semáforo o panel).',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'on_long_wait_patio',
    label: '⏰ Alerta Programable: Espera Prolongada en Patio',
    shortLabel: '⏰ Espera Prolongada',
    desc: 'Avisa automáticamente si un camión supera el tiempo máximo configurado esperando en patio.',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    key: 'on_long_dock_stay',
    label: '⚠️ Alerta Programable: Tiempo Excedido en Andén (No Liberado)',
    shortLabel: '⚠️ Exceso en Andén',
    desc: 'Avisa si un camión lleva demasiado tiempo en andén sin ser liberado (detecta olvidos de cierre).',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
  },
];

export function TelegramAlertsManager({
  config,
  onChangeConfig,
}: {
  config: TelegramConfig;
  onChangeConfig: (newConfig: TelegramConfig) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Estado para agregar cuenta manualmente
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newChatId, setNewChatId] = useState('');

  // Detección automática de chats del Bot
  const [detectingChats, setDetectingChats] = useState(false);
  const [detectedChats, setDetectedChats] = useState<DetectedTelegramChat[]>([]);
  const [botHandle, setBotHandle] = useState<string>('@AntigravitydeArielbot');

  // Mostrar / ocultar Bot Token
  const [showBotToken, setShowBotToken] = useState(false);

  useEffect(() => {
    if (!statusFeedback) return;
    const t = setTimeout(() => setStatusFeedback(null), 5000);
    return () => clearTimeout(t);
  }, [statusFeedback]);

  const persistChanges = async (updated: TelegramConfig, customMessage?: string) => {
    onChangeConfig(updated);
    setSaving(true);
    const ok = await saveTelegramConfig(updated);
    setSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (customMessage) {
        setStatusFeedback({ type: 'success', text: customMessage });
      }
    } else {
      setStatusFeedback({
        type: 'error',
        text: 'Se guardó localmente, pero hubo un problema sincronizando con la base de datos.',
      });
    }
  };

  const handleAddAccountManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newChatId.trim()) {
      setStatusFeedback({
        type: 'error',
        text: 'Debes ingresar el Nombre y el Chat ID de Telegram.',
      });
      return;
    }

    if (config.accounts.some((a) => a.chat_id.trim() === newChatId.trim())) {
      setStatusFeedback({
        type: 'error',
        text: 'Este Chat ID ya se encuentra registrado en la lista.',
      });
      return;
    }

    const newAcc: TelegramRecipient = {
      id: `acc-${Date.now()}`,
      name: newName.trim(),
      chat_id: newChatId.trim(),
      username: newUsername.trim()
        ? newUsername.trim().startsWith('@')
          ? newUsername.trim()
          : `@${newUsername.trim()}`
        : '',
      role: newRole.trim() || 'Operaciones',
      enabled: true,
      events: { ...DEFAULT_EVENTS_MAP },
    };

    const updated: TelegramConfig = {
      ...config,
      accounts: [...config.accounts, newAcc],
    };

    setNewName('');
    setNewRole('');
    setNewUsername('');
    setNewChatId('');

    await persistChanges(updated, `✅ Cuenta "${newAcc.name}" agregada correctamente.`);
  };

  const handleAddDetectedChat = async (chat: DetectedTelegramChat) => {
    if (config.accounts.some((a) => a.chat_id === chat.chat_id)) {
      setStatusFeedback({
        type: 'error',
        text: `${chat.name} ya está en tu lista de cuentas registradas.`,
      });
      return;
    }

    const newAcc: TelegramRecipient = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: chat.name,
      chat_id: chat.chat_id,
      username: chat.username,
      role: chat.type,
      enabled: true,
      events: { ...DEFAULT_EVENTS_MAP },
    };

    const updated: TelegramConfig = {
      ...config,
      accounts: [...config.accounts, newAcc],
    };

    await persistChanges(updated, `✅ Cuenta "${chat.name}" vinculada y activada.`);
  };

  const handleRemoveAccount = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar a "${name}" de las alertas de Telegram?`)) return;
    const updated: TelegramConfig = {
      ...config,
      accounts: config.accounts.filter((a) => a.id !== id),
    };
    await persistChanges(updated, `Cuenta "${name}" eliminada.`);
  };

  const handleToggleAccountEnabled = async (id: string) => {
    const updated: TelegramConfig = {
      ...config,
      accounts: config.accounts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    };
    await persistChanges(updated);
  };

  const handleToggleAccountEvent = async (accId: string, eventKey: TelegramEventType) => {
    const updated: TelegramConfig = {
      ...config,
      accounts: config.accounts.map((a) => {
        if (a.id !== accId) return a;
        const currentEvents = { ...DEFAULT_EVENTS_MAP, ...(a.events || {}) };
        return {
          ...a,
          events: {
            ...currentEvents,
            [eventKey]: !currentEvents[eventKey],
          },
        };
      }),
    };
    await persistChanges(updated);
  };

  const handleTestAccount = async (acc: TelegramRecipient) => {
    if (!config.bot_token) {
      setStatusFeedback({
        type: 'error',
        text: 'Falta configurar el Bot Token de Telegram.',
      });
      return;
    }

    setTestingId(acc.id);
    const msg = [
      `🔔 <b>PRUEBA DE ALERTA · NEXUS DOCK</b>`,
      `Hola <b>${acc.name}</b>, tu cuenta de Telegram está correctamente vinculada para recibir alertas operativas de andenes y patio en tiempo real.`,
      ``,
      `📍 <b>Centro:</b> CiAL CD Central`,
      `🕒 <b>Hora:</b> ${new Date().toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      })} hrs`,
    ].join('\n');

    const res = await sendTelegramDirectMessage(config.bot_token, acc.chat_id, msg);
    setTestingId(null);

    if (res.ok) {
      setStatusFeedback({
        type: 'success',
        text: `📨 Mensaje de prueba enviado con éxito a ${acc.name}.`,
      });
    } else {
      setStatusFeedback({
        type: 'error',
        text: `Error enviando a ${acc.name}: ${res.error}`,
      });
    }
  };

  const handleDetectChats = async () => {
    setDetectingChats(true);
    const res = await detectRecentTelegramChats(config.bot_token);
    setDetectingChats(false);

    if (!res.ok) {
      setStatusFeedback({
        type: 'error',
        text: res.error || 'No se pudo consultar los chats recientes del bot.',
      });
      return;
    }

    if (res.botUsername) {
      setBotHandle(res.botUsername);
    }
    setDetectedChats(res.chats);

    if (res.chats.length === 0) {
      setStatusFeedback({
        type: 'error',
        text: 'No se encontraron mensajes recientes. Pídele a la persona que le envíe "/start" o "Hola" al bot en Telegram y vuelve a buscar.',
      });
    } else {
      setStatusFeedback({
        type: 'success',
        text: `Se detectaron ${res.chats.length} chat(s) que han interactuado con el bot.`,
      });
    }
  };

  return (
    <section className="space-y-6">
      {/* Cabecera Principal */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-[#0a5c36] rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-sky-400/20 border border-sky-400/30 px-3 py-1 rounded-full text-xs font-extrabold text-sky-200">
            <Send className="w-3.5 h-3.5" />
            <span>Centro de Notificaciones Telegram</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Cuentas de Telegram y Alertas Programables
          </h2>
          <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
            Agrega las cuentas o grupos de Telegram de tu equipo y configura qué eventos y excesos de tiempo (en patio o en andén) deben notificarse automáticamente.
          </p>
        </div>

        {/* Switch Maestro */}
        <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 flex items-center gap-4 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-200 block">
              Estado Global
            </span>
            <span className="text-sm font-extrabold">
              {config.enabled ? '🟢 Alertas Activas' : '⚪ Alertas Pausadas'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => persistChanges({ ...config, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* Feedback Toast Inline */}
      {statusFeedback && (
        <div
          className={`rounded-2xl p-4 border flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
            statusFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-bold">
            {statusFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{statusFeedback.text}</span>
          </div>
          <button
            onClick={() => setStatusFeedback(null)}
            className="text-xs font-black opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (7 cols): Cuentas Registradas y Buscador */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Lista de Cuentas de Telegram Registradas */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>👥 Cuentas de Telegram Destinatarias ({config.accounts.length})</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Selecciona qué alertas recibe cada persona o grupo y envía pruebas en un clic.
                </p>
              </div>
              {saving && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </span>
              )}
              {!saving && saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Guardado
                </span>
              )}
            </div>

            {config.accounts.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <Send className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No hay cuentas configuradas aún</p>
                <p className="text-xs text-slate-400">
                  Agrega una cuenta abajo usando el detector automático o ingresando el Chat ID.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {config.accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`rounded-2xl border p-4 transition-all space-y-3 ${
                      acc.enabled
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                            acc.enabled
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{acc.name}</h4>
                            {acc.role && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {acc.role}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span>ID: {acc.chat_id}</span>
                            {acc.username && <span>• {acc.username}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={testingId === acc.id}
                          onClick={() => handleTestAccount(acc)}
                          className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Enviar mensaje de prueba a este Telegram"
                        >
                          {testingId === acc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Probar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleAccountEnabled(acc.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            acc.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {acc.enabled ? 'Activo' : 'Pausado'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveAccount(acc.id, acc.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar cuenta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Selector de qué alertas recibe esta cuenta */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Alertas habilitadas para {acc.name}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {EVENT_LABELS.map((ev) => {
                          const isChecked = acc.events?.[ev.key] ?? true;
                          return (
                            <button
                              key={ev.key}
                              type="button"
                              onClick={() => handleToggleAccountEvent(acc.id, ev.key)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                isChecked
                                  ? ev.badgeColor + ' font-extrabold shadow-2xs'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                              }`}
                            >
                              {isChecked ? '✓ ' : ''}
                              {ev.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Vincular Nueva Cuenta (Detector Automático + Formulario Manual) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0a5c36]" />
              <span>Agregar Nueva Cuenta o Grupo de Telegram</span>
            </h3>

            {/* Método A: Detección Automática 1 Clic */}
            <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">
                    Método Rápido Recomendado
                  </span>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    Detectar automáticamente quién le escribió al Bot
                  </h4>
                </div>
                <a
                  href={`https://t.me/${botHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:text-sky-900 underline"
                >
                  <span>Abrir {botHandle}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                1. Pídele al usuario que abra Telegram, busque el bot <strong>{botHandle}</strong> y presione <strong>Iniciar (/start)</strong> o envíe un "Hola".<br />
                2. Haz clic en el botón inferior para detectar su cuenta y agregarla con 1 clic:
              </p>

              <button
                type="button"
                disabled={detectingChats}
                onClick={handleDetectChats}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {detectingChats ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Buscar Cuentas que Escribieron al Bot</span>
              </button>

              {detectedChats.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-sky-200/70">
                  <span className="text-[10px] font-black uppercase text-sky-800 block">
                    Cuentas encontradas en el Bot:
                  </span>
                  {detectedChats.map((c) => {
                    const alreadyAdded = config.accounts.some((a) => a.chat_id === c.chat_id);
                    return (
                      <div
                        key={c.chat_id}
                        className="bg-white border border-sky-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-slate-800">{c.name}</span>{' '}
                          {c.username && <span className="text-slate-400">({c.username})</span>}
                          <span className="block text-[10px] font-mono text-slate-500">
                            Chat ID: {c.chat_id} · Tipo: {c.type}
                          </span>
                        </div>
                        {alreadyAdded ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            ✓ Ya agregada
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddDetectedChat(c)}
                            className="bg-[#0a5c36] hover:bg-[#08482a] text-white text-xs font-extrabold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            + Agregar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Método B: Agregar manualmente por Chat ID */}
            <form onSubmit={handleAddAccountManual} className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                O ingresar manualmente por Chat ID
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nombre de la Persona o Grupo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Jefe de Patio / Guillermo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full text-slate-800 font-semibold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Chat ID de Telegram *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 6193455718 o -100123456"
                    value={newChatId}
                    onChange={(e) => setNewChatId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-mono text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Cargo / Área (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Supervisor CD / Portería"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Usuario @handle (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: @usuario"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-[#0a5c36] hover:bg-[#08482a] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Guardar Cuenta de Telegram</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA (5 cols): Reglas Programables y Tiempos */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#0a5c36]" />
                <span>Configuración de Alertas Programables</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Define qué eventos disparan notificaciones automáticas y ajusta los minutos límite para alertas de demora.
              </p>
            </div>

            <div className="space-y-3">
              {EVENT_LABELS.map((ev) => {
                const isRuleEnabled = config.rules[ev.key];
                const isWaitTimer = ev.key === 'on_long_wait_patio';
                const isDockTimer = ev.key === 'on_long_dock_stay';

                return (
                  <div
                    key={ev.key}
                    className={`rounded-2xl border p-4 transition-all space-y-3 ${
                      isRuleEnabled
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-slate-50/30 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-extrabold text-slate-900">{ev.label}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{ev.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={isRuleEnabled}
                          onChange={(e) =>
                            persistChanges({
                              ...config,
                              rules: { ...config.rules, [ev.key]: e.target.checked },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0a5c36]"></div>
                      </label>
                    </div>

                    {/* Selector de minutos si es la alerta de espera prolongada en patio */}
                    {isWaitTimer && isRuleEnabled && (
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Avisar cuando supere:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[15, 30, 45, 60, 90, 120].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() =>
                                persistChanges({
                                  ...config,
                                  rules: { ...config.rules, long_wait_patio_minutes: mins },
                                })
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                config.rules.long_wait_patio_minutes === mins
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                              }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selector de minutos si es la alerta de exceso de tiempo en andén */}
                    {isDockTimer && isRuleEnabled && (
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-red-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-red-600" />
                          Avisar sin liberar tras:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[30, 45, 60, 90, 120, 180].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() =>
                                persistChanges({
                                  ...config,
                                  rules: { ...config.rules, long_dock_stay_minutes: mins },
                                })
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                config.rules.long_dock_stay_minutes === mins
                                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50'
                              }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuración del Bot Token */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Credencial Bot de Telegram
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {showBotToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showBotToken ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type={showBotToken ? 'text' : 'password'}
                value={config.bot_token}
                onChange={(e) => onChangeConfig({ ...config, bot_token: e.target.value })}
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono flex-1 text-slate-700 focus:outline-none focus:border-[#0a5c36]"
              />
              <button
                type="button"
                onClick={() => persistChanges(config, '✅ Bot Token actualizado correctamente.')}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
