import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import cialLogo from '../assets/cial-alimentos-logo.png';
import { 
  Truck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  Sparkles, 
  RefreshCw, 
  LogOut, 
  MapPin, 
  RotateCcw,
  Navigation
} from 'lucide-react';

interface YardOperation {
  id: string;
  patent: string | null;
  tractor_plate: string | null;
  trailer_plate: string | null;
  driver: string;
  carrier: string;
  type: 'Carga' | 'Descarga';
  status: 'cita' | 'espera' | 'anden' | 'completado';
  dock_id: string | null;
  entry_time: string;
  scheduled_entry_time?: string | null;
  dock?: {
    name: string;
  } | null;
}

export default function DriverPortal({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [activeStep, setActiveStep] = useState<'search' | 'monitor' | 'register_express'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundCita, setFoundCita] = useState<YardOperation | null>(null);
  
  // Datos del monitoreo activo
  const [activeOp, setActiveOp] = useState<YardOperation | null>(null);
  const [dockName, setDockName] = useState<string>('—');

  // Campos para Registro Express
  const [driverName, setDriverName] = useState('');
  const [tractorPlate, setTractorPlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [cargoType, setCargoType] = useState('Refrigerado');
  const [customCargoType, setCustomCargoType] = useState('');
  const [opType, setOpType] = useState<'Carga' | 'Descarga'>('Descarga');

  // Verificar si hay una operación activa guardada en localStorage al montar
  useEffect(() => {
    const savedOpId = localStorage.getItem('nexus_driver_op_id');
    if (savedOpId) {
      loadActiveOp(savedOpId);
    }
  }, []);

  // Polling para actualizar el ticket activo cada 5 segundos
  useEffect(() => {
    if (!activeOp) return;

    const interval = setInterval(() => {
      refreshActiveOp(activeOp.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeOp]);

  const loadActiveOp = async (opId: string) => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('yard_operations')
        .select(`
          *,
          dock:dock_id ( name )
        `)
        .eq('id', opId)
        .single();

      if (err) throw err;

      if (data) {
        setActiveOp(data);
        setDockName(data.dock?.name || '—');
        setActiveStep('monitor');
      }
    } catch (e) {
      console.error('Error cargando operación activa:', e);
      localStorage.removeItem('nexus_driver_op_id');
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveOp = async (opId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('yard_operations')
        .select(`
          *,
          dock:dock_id ( name )
        `)
        .eq('id', opId)
        .single();

      if (err) throw err;

      if (data) {
        setActiveOp(data);
        setDockName(data.dock?.name || '—');
      }
    } catch (e) {
      console.error('Error refrescando operación:', e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFoundCita(null);

    const query = searchQuery.trim();
    if (!query) {
      setError('Por favor, ingresa tu patente o nombre.');
      return;
    }

    setLoading(true);
    try {
      // 1. Primero buscamos si hay una operación activa ya en patio ('espera' o 'anden') para este chofer/patente
      const { data: activeData, error: activeErr } = await supabase
        .from('yard_operations')
        .select(`
          *,
          dock:dock_id ( name )
        `)
        .or(`tractor_plate.ilike.%${query}%,driver.ilike.%${query}%`)
        .in('status', ['espera', 'anden'])
        .order('entry_time', { ascending: false })
        .limit(1);

      if (activeErr) throw activeErr;

      if (activeData && activeData.length > 0) {
        const op = activeData[0];
        localStorage.setItem('nexus_driver_op_id', op.id);
        setActiveOp(op);
        setDockName(op.dock?.name || '—');
        setActiveStep('monitor');
        setSearchQuery('');
        return;
      }

      // 2. Si no hay operación activa, buscamos si hay una cita programada ('cita') para hoy
      const { data: citaData, error: citaErr } = await supabase
        .from('yard_operations')
        .select(`
          *,
          dock:dock_id ( name )
        `)
        .or(`tractor_plate.ilike.%${query}%,driver.ilike.%${query}%`)
        .eq('status', 'cita')
        .order('created_at', { ascending: false })
        .limit(1);

      if (citaErr) throw citaErr;

      if (citaData && citaData.length > 0) {
        setFoundCita(citaData[0]);
      } else {
        setError('No encontramos citas programadas para hoy con esos datos. Puedes registrar un ingreso express.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Ocurrió un error al buscar tus datos. Reintenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmArrival = async () => {
    if (!foundCita) return;
    setError(null);
    setLoading(true);

    try {
      const { data, error: err } = await supabase
        .from('yard_operations')
        .update({
          status: 'espera',
          entry_time: new Date().toISOString()
        })
        .eq('id', foundCita.id)
        .select()
        .single();

      if (err) throw err;

      if (data) {
        localStorage.setItem('nexus_driver_op_id', data.id);
        await loadActiveOp(data.id);
        setFoundCita(null);
        setSearchQuery('');
      }
    } catch (e) {
      console.error(e);
      setError('Error al registrar llegada. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!driverName.trim() || !tractorPlate.trim()) {
      setError('Nombre del chofer y Patente del tractor son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const finalCargo = cargoType === 'Otro' ? (customCargoType.trim() || 'Otro') : cargoType;

      const { data, error: err } = await supabase
        .from('yard_operations')
        .insert({
          driver: driverName.trim(),
          patent: tractorPlate.trim().toUpperCase(),
          tractor_plate: tractorPlate.trim().toUpperCase(),
          trailer_plate: trailerPlate.trim().toUpperCase() || null,
          carrier: finalCargo,
          type: opType,
          status: 'espera',
          entry_time: new Date().toISOString()
        })
        .select()
        .single();

      if (err) throw err;

      if (data) {
        localStorage.setItem('nexus_driver_op_id', data.id);
        // Reset campos
        setDriverName('');
        setTractorPlate('');
        setTrailerPlate('');
        setCustomCargoType('');
        await loadActiveOp(data.id);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error al guardar el ingreso express.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExit = async () => {
    if (!activeOp) return;
    setLoading(true);
    try {
      // Registrar la confirmación de salida liberando la app del conductor
      localStorage.removeItem('nexus_driver_op_id');
      setActiveOp(null);
      setDockName('—');
      setActiveStep('search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      
      {/* Header Fijo */}
      <header className="bg-gradient-to-br from-[#0a5c36] to-[#0d7a49] text-white px-6 py-4 flex items-center justify-between shadow-md select-none sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src={cialLogo} alt="CiAL Logo" className="w-14 h-14 object-contain drop-shadow-sm" />
          <div>
            <h1 className="font-extrabold text-sm tracking-tight leading-none">Portal Conductores</h1>
            <span className="text-emerald-200 font-bold text-[9px] tracking-widest uppercase">CiAL Alimentos</span>
          </div>
        </div>

        <button 
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/25 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Acceso Admin</span>
        </button>
      </header>

      {/* Cuerpo Principal */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-start">
        
        {/* === STEP 1: BUSCAR CITA / REGISTROS === */}
        {activeStep === 'search' && !foundCita && (
          <div className="space-y-5 my-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Truck className="w-8 h-8 text-[#0a5c36]" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">¡Hola, Conductor!</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                Ingresa tus datos para avisar tu llegada o monitorear el estado de tu andén asignado.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-semibold leading-relaxed">{error}</p>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <form onSubmit={handleSearch} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">
                    Buscar por Patente o Nombre
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ej. ABCD12 o Juan Perez"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:ring-2 focus:ring-[#0a5c36]/15 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#0a5c36] hover:bg-[#08482a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  {loading ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Buscar Cita o Monitoreo
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <span className="relative px-3 text-[9px] text-slate-400 font-extrabold uppercase bg-white">¿No tienes una cita?</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setActiveStep('register_express');
                }}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0a5c36]" />
                Registrar Ingreso Express a Patio
              </button>
            </div>
          </div>
        )}

        {/* === STEP 1.5: CITA ENCONTRADA - CONFIRMAR LLEGADA === */}
        {foundCita && (
          <div className="space-y-5 my-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-yellow-50 border border-yellow-100 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Cita Encontrada</h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                ¡Excelente! Tienes una cita programada para hoy. Confirma tu llegada para ingresar a patio.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-400 font-semibold">Conductor</span>
                  <span className="text-xs text-slate-800 font-extrabold">{foundCita.driver}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-400 font-semibold">Patente Tractor</span>
                  <span className="text-xs font-mono text-slate-800 font-extrabold bg-slate-200 px-2 py-0.5 rounded-md leading-none">{foundCita.tractor_plate || foundCita.patent}</span>
                </div>
                {foundCita.trailer_plate && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs text-slate-400 font-semibold">Patente Rampla</span>
                    <span className="text-xs font-mono text-slate-800 font-extrabold bg-slate-200 px-2 py-0.5 rounded-md leading-none">{foundCita.trailer_plate}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-400 font-semibold">Tipo Operación</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${foundCita.type === 'Descarga' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{foundCita.type}</span>
                </div>
                 <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs text-slate-400 font-semibold">Carga</span>
                  <span className="text-xs text-slate-800 font-bold">{foundCita.carrier}</span>
                </div>
                {foundCita.scheduled_entry_time && (
                  <div className="flex justify-between pt-1">
                    <span className="text-xs text-slate-400 font-semibold">Horario Citado</span>
                    <span className="text-xs text-emerald-700 font-extrabold flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg leading-none">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      {(() => {
                        const dateObj = new Date(foundCita.scheduled_entry_time);
                        const fecha = dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
                        const hora = dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                        return `${fecha} - ${hora} hrs`;
                      })()}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleConfirmArrival}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#0a5c36] hover:bg-[#08482a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  {loading ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      CONFIRMAR LLEGADA A PATIO
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setFoundCita(null);
                    setError(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold transition-all py-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a buscar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 2: REGISTRO EXPRESS === */}
        {activeStep === 'register_express' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setError(null);
                  setActiveStep('search');
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Ingreso Express a Patio</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Portería & Choferes</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-semibold leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleRegisterExpress} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Tu Nombre y Apellido"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Patente Tractor</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABCD12"
                    value={tractorPlate}
                    onChange={(e) => setTractorPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Patente Rampla</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="KYRD20 (Opcional)"
                    value={trailerPlate}
                    onChange={(e) => setTrailerPlate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 pl-1">Operación</label>
                  <div className="grid grid-cols-2 gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                    {(['Descarga', 'Carga'] as const).map(op => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOpType(op)}
                        className={`text-[10px] font-bold py-1.5 rounded-md transition-all cursor-pointer ${opType === op ? 'bg-[#0a5c36] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 pl-1">Tipo de Carga</label>
                  <select
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                  >
                    <option value="Refrigerado">Refrigerado</option>
                    <option value="Semi Elaborado">Semi Elaborado</option>
                    <option value="Congelado">Congelado</option>
                    <option value="Otro">Otro (Escribir)...</option>
                  </select>
                </div>
              </div>

              {cargoType === 'Otro' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">Especificar Carga</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Abarrotes, Envases, etc."
                    value={customCargoType}
                    onChange={(e) => setCustomCargoType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#0a5c36] hover:bg-[#08482a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-md active:scale-95 mt-2"
              >
                {loading ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Registrar e Ingresar a Patio
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* === STEP 3: PANTALLA MONITOREO / SEMÁFORO === */}
        {activeStep === 'monitor' && activeOp && (
          <div className="space-y-5 my-auto">
            
            {/* Cabecera del ticket monitoreado */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-extrabold text-[#0a5c36] uppercase tracking-wider">Ticket en Monitoreo</p>
                <h3 className="font-extrabold text-slate-800 text-sm">{activeOp.driver}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-extrabold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 leading-none">
                  {activeOp.tractor_plate || activeOp.patent}
                </span>
                <button
                  onClick={() => refreshActiveOp(activeOp.id)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer active:scale-95 transition-all text-slate-500"
                  title="Actualizar estado"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* === LÓGICA DEL SEMÁFORO SEGÚN EL ESTADO === */}
            
            {/* CASO A: EN PATIO (ESPERA) */}
            {activeOp.status === 'espera' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md text-center space-y-6">
                
                {/* Visualización Semáforo: Azul de Espera */}
                <div className="flex justify-center gap-4 py-2">
                  <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center shadow-inner relative">
                    <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-35" />
                    <Clock className="w-10 h-10 text-blue-600 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="inline-block text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full tracking-wider">
                    EN PATIO · ESPERA
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Espera de Andén</h3>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2">
                    Tu llegada ha sido registrada en el patio de CiAL. Permanece atento a tu celular, te notificaremos por aquí cuando se te asigne un andén.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <MapPin className="w-4 h-4 text-[#0a5c36]" />
                    <span>Zona de espera autorizada</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Mantén encendida la radio del camión y sigue las instrucciones de seguridad del personal del patio.
                  </p>
                </div>
              </div>
            )}

            {/* CASO B: EN ANDÉN (ROJO - DETENERSE) */}
            {activeOp.status === 'anden' && (
              <div className="bg-white border border-red-200 rounded-3xl p-6 shadow-md text-center space-y-6">
                
                {/* Visualización Semáforo: ROJO (Permanecer quieto) */}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Estructura Semáforo */}
                  <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-800 flex flex-col gap-3.5 relative">
                    <div className="w-16 h-16 rounded-full bg-red-600 border-4 border-red-400 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.8)] relative">
                      <span className="absolute inset-0 rounded-full border border-red-400 animate-ping opacity-60" />
                      <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
                    </div>
                    <div className="w-16 h-16 rounded-full bg-amber-950/45 border-4 border-slate-900 flex items-center justify-center opacity-30" />
                    <div className="w-16 h-16 rounded-full bg-emerald-950/45 border-4 border-slate-900 flex items-center justify-center opacity-30" />
                  </div>
                  <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest animate-pulse mt-1">SEMAFORO EN ROJO</span>
                </div>

                <div className="space-y-2.5">
                  <span className="inline-block text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200 px-3.5 py-1 rounded-full tracking-wider">
                    NO MOVER EL CAMIÓN
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 leading-tight">Dirígete al {dockName}</h3>
                  <p className="text-sm font-extrabold text-red-600 flex items-center justify-center gap-1.5 animate-pulse mt-1 bg-red-50/50 py-2.5 rounded-xl border border-red-100">
                    <Navigation className="w-4 h-4 rotate-45 shrink-0" />
                    ACÓPLATE AL ANDÉN Y PERMANECE QUIETO
                  </p>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2 mt-2">
                    Tu proceso de {activeOp.type.toLowerCase()} está en curso. Por seguridad del personal de andenes, <strong>está estrictamente prohibido mover el camión</strong> hasta que el semáforo cambie a verde.
                  </p>
                </div>
              </div>
            )}

            {/* CASO C: COMPLETADO (VERDE - LISTO PARA PARTIR) */}
            {activeOp.status === 'completado' && (
              <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-md text-center space-y-6">
                
                {/* Visualización Semáforo: VERDE (Listo para partir) */}
                <div className="flex flex-col items-center gap-1.5">
                  {/* Estructura Semáforo */}
                  <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-800 flex flex-col gap-3.5 relative">
                    <div className="w-16 h-16 rounded-full bg-red-950/45 border-4 border-slate-900 flex items-center justify-center opacity-30" />
                    <div className="w-16 h-16 rounded-full bg-amber-950/45 border-4 border-slate-900 flex items-center justify-center opacity-30" />
                    <div className="w-16 h-16 rounded-full bg-emerald-500 border-4 border-emerald-300 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.8)] relative">
                      <span className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-60" />
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest animate-pulse mt-1">SEMAFORO EN VERDE</span>
                </div>

                <div className="space-y-2">
                  <span className="inline-block text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1 rounded-full tracking-wider">
                    OPERACIÓN FINALIZADA
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 leading-tight">¡Puedes Partir!</h3>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed px-2">
                    Tu proceso en el <strong>{dockName}</strong> ha terminado. Por favor, retira el camión del andén y del patio de forma ordenada y segura.
                  </p>
                </div>

                <button
                  onClick={handleConfirmExit}
                  className="w-full flex items-center justify-center gap-2 bg-[#0a5c36] hover:bg-[#08482a] text-white py-3.5 rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ENTENDIDO / LIBERAR PORTAL
                </button>
              </div>
            )}

            {/* Ficha técnica del camión */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block font-bold">Ficha de Operación</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Operación</p>
                  <p className="font-extrabold text-slate-800">{activeOp.type}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Tipo Carga</p>
                  <p className="font-extrabold text-slate-800">{activeOp.carrier}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Ingreso a Patio</p>
                  <p className="font-bold text-slate-700">
                    {new Date(activeOp.entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Andén Asignado</p>
                  <p className={`font-extrabold ${dockName !== '—' ? 'text-purple-600' : 'text-slate-700'}`}>
                    {dockName}
                  </p>
                </div>
              </div>

              {/* Botón de desvincular o retirar manualmente si se equivocó */}
              <div className="pt-3 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => {
                    if (window.confirm('¿Quieres desvincular este camión de tu celular y volver a la búsqueda?')) {
                      localStorage.removeItem('nexus_driver_op_id');
                      setActiveOp(null);
                      setActiveStep('search');
                    }
                  }}
                  className="text-[10px] font-extrabold text-red-500 hover:text-red-700 transition-colors bg-red-50/50 hover:bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 cursor-pointer"
                >
                  Desvincular Camión de mi Celular
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer Fijo */}
      <footer className="bg-white border-t border-slate-200/80 px-6 py-4 text-center select-none">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
          Nexus Dock v2.0 · Vista Conductores
        </p>
        <span className="text-[8px] text-[#0a5c36] font-bold mt-1 inline-block">CiAL Alimentos S.A.</span>
      </footer>

    </div>
  );
}
