import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dispatchTelegramAlert } from '../lib/telegram';
import {
  QrCode,
  Printer,
  CheckCircle2,
  Truck,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  X,
  Smartphone,
  AlertCircle,
} from 'lucide-react';

interface DockItem {
  id: string;
  name: string;
  status: 'Disponible' | 'Ocupado' | 'Mantenimiento';
}

interface TruckItem {
  id: string;
  patent: string | null;
  tractor_plate: string | null;
  trailer_plate?: string | null;
  driver: string;
  carrier: string;
  type: 'Carga' | 'Descarga';
  status: string;
  dock_id: string | null;
  entry_time: string;
  start_time?: string | null;
}

export function buildQrDockUrl(dockId: string): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}?qr_release_dock=${encodeURIComponent(dockId)}`;
}

export function getQrImageUrl(dataUrl: string, size: number = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(
    dataUrl
  )}`;
}

const formatDurationFromStart = (startTimeStr?: string | null) => {
  if (!startTimeStr) return '—';
  const start = new Date(startTimeStr).getTime();
  if (isNaN(start)) return '—';
  const diffMin = Math.max(0, Math.floor((Date.now() - start) / 60000));
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
};

/**
 * Modal / Pantalla de Liberación Rápida cuando se escanea el QR de un Semáforo de Andén
 * Solo permite liberar el andén / despachar el camión actual.
 */
export function QrDockReleaseModal({
  dockId,
  onClose,
  onReleasedSuccess,
}: {
  dockId: string;
  onClose: () => void;
  onReleasedSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dock, setDock] = useState<DockItem | null>(null);
  const [activeTruck, setActiveTruck] = useState<TruckItem | null>(null);
  const [releasedDone, setReleasedDone] = useState(false);
  const [releasedSummary, setReleasedSummary] = useState<{
    dockName: string;
    plate: string;
    driver: string;
    duration: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDockStatus = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: dockData, error: dockErr } = await supabase
        .from('docks')
        .select('*')
        .eq('id', dockId)
        .single();

      if (dockErr || !dockData) {
        throw new Error('No se encontró el andén especificado en el código QR.');
      }
      setDock(dockData);

      const { data: opsData, error: opsErr } = await supabase
        .from('yard_operations')
        .select('*')
        .eq('dock_id', dockId)
        .eq('status', 'anden')
        .order('entry_time', { ascending: false });

      if (opsErr) throw opsErr;

      setActiveTruck(opsData && opsData.length > 0 ? opsData[0] : null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al verificar estado del andén.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDockStatus();
  }, [dockId]);

  const handleReleaseDockNow = async () => {
    if (!dock) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const nowIso = new Date().toISOString();
      const durationStr = formatDurationFromStart(activeTruck?.start_time || activeTruck?.entry_time);

      // 1. Si hay camión(es) en estado 'anden' en este dock, pasarlos a 'completado'
      const { data: currentOps } = await supabase
        .from('yard_operations')
        .select('*')
        .eq('dock_id', dock.id)
        .eq('status', 'anden');

      if (currentOps && currentOps.length > 0) {
        const ids = currentOps.map((o) => o.id);
        const { error: updateOpErr } = await supabase
          .from('yard_operations')
          .update({
            status: 'completado',
            end_time: nowIso,
            exit_time: nowIso,
          })
          .in('id', ids);

        if (updateOpErr) throw updateOpErr;
      }

      // 2. Liberar el andén poniéndolo en 'Disponible'
      const { error: updateDockErr } = await supabase
        .from('docks')
        .update({ status: 'Disponible' })
        .eq('id', dock.id);

      if (updateDockErr) throw updateDockErr;

      const truckPlate = activeTruck?.tractor_plate || activeTruck?.patent || 'S/P';
      const truckDriver = activeTruck?.driver || 'Operador de Patio';

      setReleasedSummary({
        dockName: dock.name,
        plate: truckPlate,
        driver: truckDriver,
        duration: durationStr,
      });
      setReleasedDone(true);

      // 3. Disparar alerta a Telegram si está configurada
      const telegramMsg = [
        `✅ <b>ANDÉN LIBERADO (Escaneo QR Semáforo)</b>`,
        `📍 <b>Andén:</b> ${dock.name}`,
        activeTruck
          ? `🚛 <b>Camión Despachado:</b> <code>${truckPlate}</code>${
              activeTruck.trailer_plate ? ` / Rampla: <code>${activeTruck.trailer_plate}</code>` : ''
            }`
          : `🚛 <b>Estado:</b> Liberación directa de andén`,
        activeTruck ? `👤 <b>Chofer:</b> ${truckDriver}` : '',
        activeTruck ? `📦 <b>Operación:</b> ${activeTruck.type} (${activeTruck.carrier})` : '',
        activeTruck ? `⏱️ <b>Tiempo en Andén:</b> ${durationStr}` : '',
        `🕒 <b>Hora Despacho:</b> ${new Date().toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
        })} hrs`,
      ]
        .filter(Boolean)
        .join('\n');

      dispatchTelegramAlert('on_dock_released', telegramMsg).catch((e) =>
        console.warn('Error enviando alerta Telegram:', e)
      );

      if (onReleasedSuccess) {
        onReleasedSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo liberar el andén.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Cabecera */}
        <div className="bg-[#0a5c36] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">
                Control de Semáforo QR
              </span>
              <h3 className="text-lg font-extrabold leading-tight">
                {dock ? dock.name : 'Verificando Andén...'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-[#0a5c36] animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600">Consultando estado del andén en tiempo real...</p>
            </div>
          ) : errorMsg ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-bold text-red-800">{errorMsg}</p>
              <button
                onClick={loadDockStatus}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : releasedDone && releasedSummary ? (
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-300 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  ¡OPERACIÓN FINALIZADA!
                </span>
                <h4 className="text-2xl font-black text-slate-900">
                  {releasedSummary.dockName} Liberado
                </h4>
                <p className="text-xs font-semibold text-slate-500">
                  El camión ha sido marcado como despachado y el andén ya figura <strong>Disponible</strong> en Nexus Dock.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Camión despachado:</span>
                  <span className="font-mono font-black text-slate-800">{releasedSummary.plate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Chofer:</span>
                  <span className="font-bold text-slate-700">{releasedSummary.driver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Tiempo en andén:</span>
                  <span className="font-mono font-bold text-emerald-700">{releasedSummary.duration}</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all cursor-pointer shadow-md"
              >
                Cerrar Pantalla
              </button>
            </div>
          ) : activeTruck || dock?.status === 'Ocupado' ? (
            <div className="space-y-5">
              {/* Estado actual: Ocupado con camión */}
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Andén Ocupado · Listo para Liberar
                  </span>
                </div>
                <span className="text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg">
                  {dock?.name}
                </span>
              </div>

              {activeTruck ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Tractor / Patente
                      </span>
                      <span className="font-mono text-lg font-black text-slate-900">
                        {activeTruck.tractor_plate || activeTruck.patent || 'S/P'}
                      </span>
                    </div>
                    {activeTruck.trailer_plate && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Rampla</span>
                        <span className="font-mono text-sm font-bold text-slate-700">
                          {activeTruck.trailer_plate}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Chofer</span>
                      <span className="font-extrabold text-slate-800">{activeTruck.driver}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Operación</span>
                      <span className="font-extrabold text-slate-800">
                        {activeTruck.type} · {activeTruck.carrier}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Inicio en Andén</span>
                      <span className="font-bold text-slate-700">
                        {activeTruck.start_time
                          ? new Date(activeTruck.start_time).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) + ' hrs'
                          : 'Registrado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Tiempo en Andén</span>
                      <span className="font-mono font-black text-purple-700">
                        ⏱️ {formatDurationFromStart(activeTruck.start_time || activeTruck.entry_time)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold text-slate-600">
                    El andén figura como <strong>Ocupado</strong>. Presiona el botón inferior para liberarlo y dejarlo disponible.
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={processing}
                onClick={handleReleaseDockNow}
                className="w-full py-4 px-5 rounded-2xl bg-[#0a5c36] hover:bg-[#08482a] active:scale-98 text-white font-black text-base shadow-lg shadow-[#0a5c36]/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Liberando Andén...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>DESPACHAR CAMIÓN Y LIBERAR ANDÉN</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400 font-medium">
                Al confirmar, el camión pasará a estado <strong>Despachado/Completado</strong> y el {dock?.name} quedará libre de inmediato.
              </p>
            </div>
          ) : (
            /* El andén ya está libre */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-9 h-9 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-0.5 rounded-full">
                  ANDÉN DISPONIBLE
                </span>
                <h4 className="text-xl font-black text-slate-800">{dock?.name} ya está libre</h4>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  No hay ningún camión pendiente de despacho en este andén actualmente.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Panel Administrador de Códigos QR de Andenes (Para imprimir y pegar en cada semáforo)
 */
export function QrDockManager({
  docks,
  trucks,
  onOpenSimulateQr,
}: {
  docks: DockItem[];
  trucks: TruckItem[];
  onOpenSimulateQr: (dockId: string) => void;
}) {
  const [copiedDockId, setCopiedDockId] = useState<string | null>(null);

  const handleCopyLink = (dockId: string) => {
    const url = buildQrDockUrl(dockId);
    navigator.clipboard.writeText(url);
    setCopiedDockId(dockId);
    setTimeout(() => setCopiedDockId(null), 2500);
  };

  const handlePrintAllQrs = (singleDock?: DockItem) => {
    const targetDocks = singleDock ? [singleDock] : docks;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      alert('Por favor permite las ventanas emergentes para imprimir los códigos QR.');
      return;
    }

    const cardsHtml = targetDocks
      .map((d) => {
        const qrUrl = buildQrDockUrl(d.id);
        const imgUrl = getQrImageUrl(qrUrl, 320);
        return `
          <div class="qr-card">
            <div class="header-badge">NEXUS DOCK · CONTROL DE PATIO</div>
            <div class="dock-title">${d.name.toUpperCase()}</div>
            <div class="qr-box">
              <img src="${imgUrl}" alt="QR ${d.name}" width="220" height="220" />
            </div>
            <div class="action-badge">✅ ESCANEAR AL DESPACHAR CAMIÓN</div>
            <div class="instructions">
              Escanea este código con la cámara de tu teléfono al cerrar el portón o poner el semáforo en verde para <strong>liberar el ${d.name}</strong> automáticamente en el sistema.
            </div>
          </div>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Códigos QR de Liberación de Andenes - Nexus Dock</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
              background: #fff;
              color: #0f172a;
              padding: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
            }
            .qr-card {
              border: 3px solid #0a5c36;
              border-radius: 20px;
              padding: 24px 20px;
              text-align: center;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
            }
            .header-badge {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              color: #0a5c36;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              padding: 4px 12px;
              border-radius: 999px;
              margin-bottom: 10px;
            }
            .dock-title {
              font-size: 32px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
              margin-bottom: 14px;
            }
            .qr-box {
              background: #ffffff;
              border: 2px dashed #cbd5e1;
              border-radius: 16px;
              padding: 12px;
              margin-bottom: 14px;
            }
            .action-badge {
              background: #0a5c36;
              color: #ffffff;
              font-size: 13px;
              font-weight: 900;
              padding: 8px 16px;
              border-radius: 10px;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
              width: 100%;
            }
            .instructions {
              font-size: 11px;
              color: #475569;
              line-height: 1.4;
              max-width: 280px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 14px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div>
              <strong style="font-size: 15px;">Vista Previa de Impresión (${targetDocks.length} ${
      targetDocks.length === 1 ? 'Andén' : 'Andenes'
    })</strong>
              <p style="font-size: 12px; color: #64748b;">Imprime y plastifica estas tarjetas para pegarlas junto al semáforo de cada andén.</p>
            </div>
            <button onclick="window.print()" style="background: #0a5c36; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 13px;">
              🖨️ Imprimir Ahora
            </button>
          </div>
          <div class="grid">
            ${cardsHtml}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <section className="space-y-6">
      {/* Banner Explicativo y Botón Imprimir Todos */}
      <div className="bg-gradient-to-r from-[#0a5c36] to-[#08482a] rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-extrabold text-emerald-200">
            <QrCode className="w-4 h-4" />
            <span>Liberación Rápida en Semáforo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Códigos QR para Despacho y Cierre de Andenes
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Imprime y pega cada código QR junto al semáforo de su andén correspondiente. Cuando el operario despache físicamente el camión, solo debe escanear el QR con su celular para <strong>marcar el camión como despachado y liberar el andén</strong> al instante.
          </p>
        </div>

        <button
          onClick={() => handlePrintAllQrs()}
          className="bg-white hover:bg-emerald-50 text-[#0a5c36] font-black text-xs sm:text-sm px-5 py-3.5 rounded-2xl shadow-md flex items-center gap-2.5 shrink-0 transition-all cursor-pointer active:scale-95"
        >
          <Printer className="w-5 h-5" />
          <span>Imprimir Todos los QRs ({docks.length})</span>
        </button>
      </div>

      {/* Grilla de Tarjetas QR por Andén */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {docks.map((dock) => {
          const qrUrl = buildQrDockUrl(dock.id);
          const qrImg = getQrImageUrl(qrUrl, 240);
          const activeTruck = trucks.find((t) => t.dock_id === dock.id && t.status === 'anden');
          const isOccupied = dock.status === 'Ocupado' || Boolean(activeTruck);

          return (
            <div
              key={dock.id}
              className={`bg-white rounded-3xl border-2 p-5 shadow-xs flex flex-col justify-between transition-all ${
                isOccupied ? 'border-purple-300 bg-purple-50/10' : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div>
                {/* Cabecera tarjeta */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Semáforo de Andén
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{dock.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      isOccupied
                        ? 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse'
                        : dock.status === 'Mantenimiento'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isOccupied ? '● Ocupado' : dock.status}
                  </span>
                </div>

                {/* Imagen QR */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-center mb-4">
                  <img
                    src={qrImg}
                    alt={`QR ${dock.name}`}
                    className="w-40 h-40 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-2xs"
                    loading="lazy"
                  />
                  <span className="mt-2 text-[10px] font-bold text-slate-500 text-center">
                    Escanear para liberar <strong>{dock.name}</strong>
                  </span>
                </div>

                {/* Info de Camión Actual si está ocupado */}
                {activeTruck ? (
                  <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-purple-950">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-purple-700" />
                        {activeTruck.tractor_plate || activeTruck.patent}
                      </span>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-purple-200">
                        ⏱️ {formatDurationFromStart(activeTruck.start_time || activeTruck.entry_time)}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 truncate font-medium">
                      Chofer: {activeTruck.driver}
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Sin camión posicionado actualmente
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenSimulateQr(dock.id)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isOccupied
                      ? 'bg-[#0a5c36] hover:bg-[#08482a] text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isOccupied ? 'Liberar Ahora (Vista QR)' : 'Probar Pantalla QR'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintAllQrs(dock)}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Imprimir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(dock.id)}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedDockId === dock.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
