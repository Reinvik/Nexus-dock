import React, { useState, useMemo } from 'react';
import {
  Clock,
  Truck,
  Factory,
  Send,
  Building2,
  RotateCcw,
  Snowflake,
  Thermometer,
  User,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart,
  Layers,
  ChevronDown,
  ChevronUp,
  Package,
  AlertCircle
} from 'lucide-react';
import type { YardOperation, Dock, Driver } from '../App';

export interface EfficiencyCycleReportProps {
  trucks: YardOperation[];
  docks: Dock[];
  drivers: Driver[];
}

export type CargoTempFilter = 'todos' | 'congelado' | 'refrigerado' | 'otros';
export type ChartViewMode = 'grouped' | 'stacked' | 'lines';
export type TimeRangeFilter = '4weeks' | '8weeks' | '12weeks' | 'all';

interface OperationCycleMetrics {
  cargaP2Min: number | null;
  rutaMin: number | null;
  esperaPatioMin: number | null;
  descargaMin: number | null;
  cicloTotalMin: number | null;
}

interface WeekGroupData {
  weekKey: string;
  weekNum: number;
  year: number;
  startDate: Date;
  endDate: Date;
  label: string;
  shortLabel: string;
  operations: YardOperation[];
  // Medias (en minutos)
  avgCargaP2: number | null;
  countCargaP2: number;
  avgRuta: number | null;
  countRuta: number;
  avgEsperaPatio: number | null;
  countEsperaPatio: number;
  avgDescarga: number | null;
  countDescarga: number;
  avgCicloMedio: number | null;
  countCicloMedio: number;
  // Comparativa vs semana previa
  cicloDiffVsPrev: number | null; // en minutos
  cicloPctVsPrev: number | null;  // en porcentaje
}

// Formateo de minutos a texto legible (ej: "45 min" o "1h 22m")
export const formatMinutes = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val) || val < 0) return '—';
  const totalMin = Math.round(val);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs > 0) {
    return `${hrs}h ${min > 0 ? `${min}m` : ''}`.trim();
  }
  return `${min} min`;
};

// Formateo compacto para ejes de gráficos
const formatMinutesCompact = (val: number): string => {
  if (val >= 60) {
    const hrs = (val / 60).toFixed(1).replace('.0', '');
    return `${hrs}h`;
  }
  return `${Math.round(val)}m`;
};

// Cálculo de métricas individuales de una operación
export const getTruckCycleMetrics = (t: YardOperation): OperationCycleMetrics => {
  // 1. Carga P2: Desde inicio en P2 hasta despacho hacia patio
  let cargaP2Min: number | null = null;
  if (t.dispatch_time && (t.plant_loading_time || (t.origin === 'planta_2' && t.entry_time))) {
    const s = new Date(t.plant_loading_time || t.entry_time).getTime();
    const d = new Date(t.dispatch_time).getTime();
    if (d > s) {
      cargaP2Min = Math.round((d - s) / 60000);
    }
  }

  // 2. Tiempo en Ruta: Salida P2 hasta llegada a Patio CD
  let rutaMin: number | null = null;
  if (t.dispatch_time && t.entry_time) {
    const d = new Date(t.dispatch_time).getTime();
    const e = new Date(t.entry_time).getTime();
    if (e > d) {
      rutaMin = Math.round((e - d) / 60000);
    }
  }

  // 3. Tiempo Espera Patio: Llegada a Patio CD hasta inicio de andén
  let esperaPatioMin: number | null = null;
  if (t.start_time && t.entry_time) {
    const e = new Date(t.entry_time).getTime();
    const s = new Date(t.start_time).getTime();
    if (s >= e) {
      esperaPatioMin = Math.round((s - e) / 60000);
    }
  }

  // 4. Tiempo Descarga: Inicio en andén hasta fin de descarga
  let descargaMin: number | null = null;
  if (t.end_time && t.start_time) {
    const s = new Date(t.start_time).getTime();
    const ed = new Date(t.end_time).getTime();
    if (ed >= s) {
      descargaMin = Math.round((ed - s) / 60000);
    }
  }

  // 5. Ciclo Total: Desde inicio de la operación hasta fin
  let cicloTotalMin: number | null = null;
  const finishTime = t.end_time || t.exit_time;
  const initialTime = t.plant_loading_time || (t.origin === 'planta_2' && t.dispatch_time ? t.dispatch_time : t.entry_time);
  if (finishTime && initialTime) {
    const i = new Date(initialTime).getTime();
    const f = new Date(finishTime).getTime();
    if (f > i) {
      cicloTotalMin = Math.round((f - i) / 60000);
    }
  }

  return { cargaP2Min, rutaMin, esperaPatioMin, descargaMin, cicloTotalMin };
};

// Obtiene la semana ISO (Lunes a Domingo) para una fecha dada
export const getISOWeekInfo = (dateVal: string | Date) => {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;

  const day = d.getDay(); // 0 Dom, 1 Lun, ...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const target = new Date(monday);
  target.setDate(target.getDate() + 3); // Jueves de referencia
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  const weekNum = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  const year = target.getFullYear();

  const pad = (n: number) => String(n).padStart(2, '0');
  const startFmt = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}`;
  const endFmt = `${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;

  const weekKey = `${year}-W${pad(weekNum)}`;
  const label = `Semana ${weekNum} (${startFmt} - ${endFmt})`;
  const shortLabel = `Sem ${weekNum}`;

  return { weekKey, weekNum, year, monday, sunday, label, shortLabel };
};

export const EfficiencyCycleReport: React.FC<EfficiencyCycleReportProps> = ({
  trucks,
  drivers
}) => {
  // Filtros
  const [cargoFilter, setCargoFilter] = useState<CargoTempFilter>('todos');
  const [driverFilter, setDriverFilter] = useState<string>('todos');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('grouped');
  
  // Toggles de series activas en el gráfico
  const [activeSeries, setActiveSeries] = useState({
    cargaP2: true,
    ruta: true,
    esperaPatio: true,
    descarga: true,
    cicloMedio: true,
  });

  // Drilldown: semana expandida en tabla o seleccionada
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const [hoveredWeekKey, setHoveredWeekKey] = useState<string | null>(null);

  // Lista única de choferes para el selector
  const availableDrivers = useMemo(() => {
    const map = new Map<string, string>();
    trucks.forEach(t => {
      const name = (t.driver || '').trim();
      if (name) {
        map.set(name.toLowerCase(), name);
      }
    });
    drivers.forEach(d => {
      const name = (d.name || '').trim();
      if (name) {
        map.set(name.toLowerCase(), name);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [trucks, drivers]);

  // Filtrado de operaciones según temperatura / tipo carga y chofer
  const filteredTrucks = useMemo(() => {
    return trucks.filter(t => {
      // 1. Filtro por temperatura / carrier
      const carrierLower = (t.carrier || '').toLowerCase();
      if (cargoFilter === 'congelado') {
        if (!carrierLower.includes('congelado')) return false;
      } else if (cargoFilter === 'refrigerado') {
        if (!carrierLower.includes('refrigerado')) return false;
      } else if (cargoFilter === 'otros') {
        if (carrierLower.includes('congelado') || carrierLower.includes('refrigerado')) return false;
      }

      // 2. Filtro por chofer
      if (driverFilter !== 'todos') {
        const driverName = (t.driver || '').toLowerCase().trim();
        const target = driverFilter.toLowerCase().trim();
        const matchesName = driverName === target;
        const matchesId = t.driver_id && t.driver_id === driverFilter;
        if (!matchesName && !matchesId) return false;
      }

      return true;
    });
  }, [trucks, cargoFilter, driverFilter]);

  // Agrupación por semana y cálculo de promedios
  const weeklyData = useMemo(() => {
    const groupsMap = new Map<string, { info: any; list: YardOperation[] }>();

    filteredTrucks.forEach(t => {
      const dateStr = t.plant_loading_time || t.entry_time || t.start_time || t.end_time;
      if (!dateStr) return;
      const weekInfo = getISOWeekInfo(dateStr);
      if (!weekInfo) return;

      if (!groupsMap.has(weekInfo.weekKey)) {
        groupsMap.set(weekInfo.weekKey, { info: weekInfo, list: [] });
      }
      groupsMap.get(weekInfo.weekKey)!.list.push(t);
    });

    // Ordenar semanas cronológicamente (más antigua a más reciente)
    const sortedEntries = Array.from(groupsMap.entries()).sort((a, b) => {
      return a[1].info.monday.getTime() - b[1].info.monday.getTime();
    });

    // Filtro de rango de tiempo si aplica
    let finalEntries = sortedEntries;
    if (timeRange === '4weeks') {
      finalEntries = sortedEntries.slice(-4);
    } else if (timeRange === '8weeks') {
      finalEntries = sortedEntries.slice(-8);
    } else if (timeRange === '12weeks') {
      finalEntries = sortedEntries.slice(-12);
    }

    // Calcular promedios para cada semana
    const result: WeekGroupData[] = [];
    let prevCicloMedio: number | null = null;

    finalEntries.forEach(([, entry]) => {
      const { info, list } = entry;
      const p2Arr: number[] = [];
      const rutaArr: number[] = [];
      const esperaArr: number[] = [];
      const descargaArr: number[] = [];
      const cicloArr: number[] = [];

      list.forEach(t => {
        const m = getTruckCycleMetrics(t);
        if (m.cargaP2Min !== null) p2Arr.push(m.cargaP2Min);
        if (m.rutaMin !== null) rutaArr.push(m.rutaMin);
        if (m.esperaPatioMin !== null) esperaArr.push(m.esperaPatioMin);
        if (m.descargaMin !== null) descargaArr.push(m.descargaMin);
        if (m.cicloTotalMin !== null) cicloArr.push(m.cicloTotalMin);
      });

      const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

      const avgP2 = avg(p2Arr);
      const avgRut = avg(rutaArr);
      const avgEsp = avg(esperaArr);
      const avgDes = avg(descargaArr);
      const avgCic = avg(cicloArr);

      let cicloDiffVsPrev: number | null = null;
      let cicloPctVsPrev: number | null = null;
      if (avgCic !== null && prevCicloMedio !== null && prevCicloMedio > 0) {
        cicloDiffVsPrev = avgCic - prevCicloMedio;
        cicloPctVsPrev = Math.round(((avgCic - prevCicloMedio) / prevCicloMedio) * 100);
      }

      if (avgCic !== null) {
        prevCicloMedio = avgCic;
      }

      result.push({
        weekKey: info.weekKey,
        weekNum: info.weekNum,
        year: info.year,
        startDate: info.monday,
        endDate: info.sunday,
        label: info.label,
        shortLabel: info.shortLabel,
        operations: list,
        avgCargaP2: avgP2,
        countCargaP2: p2Arr.length,
        avgRuta: avgRut,
        countRuta: rutaArr.length,
        avgEsperaPatio: avgEsp,
        countEsperaPatio: esperaArr.length,
        avgDescarga: avgDes,
        countDescarga: descargaArr.length,
        avgCicloMedio: avgCic,
        countCicloMedio: cicloArr.length,
        cicloDiffVsPrev,
        cicloPctVsPrev,
      });
    });

    return result;
  }, [filteredTrucks, timeRange]);

  // Medias globales para el resumen superior
  const globalSummary = useMemo(() => {
    const p2Arr: number[] = [];
    const rutaArr: number[] = [];
    const esperaArr: number[] = [];
    const descargaArr: number[] = [];
    const cicloArr: number[] = [];

    filteredTrucks.forEach(t => {
      const m = getTruckCycleMetrics(t);
      if (m.cargaP2Min !== null) p2Arr.push(m.cargaP2Min);
      if (m.rutaMin !== null) rutaArr.push(m.rutaMin);
      if (m.esperaPatioMin !== null) esperaArr.push(m.esperaPatioMin);
      if (m.descargaMin !== null) descargaArr.push(m.descargaMin);
      if (m.cicloTotalMin !== null) cicloArr.push(m.cicloTotalMin);
    });

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    return {
      totalOps: filteredTrucks.length,
      avgCargaP2: avg(p2Arr),
      countP2: p2Arr.length,
      avgRuta: avg(rutaArr),
      countRuta: rutaArr.length,
      avgEsperaPatio: avg(esperaArr),
      countEspera: esperaArr.length,
      avgDescarga: avg(descargaArr),
      countDescarga: descargaArr.length,
      avgCicloMedio: avg(cicloArr),
      countCiclo: cicloArr.length,
    };
  }, [filteredTrucks]);

  // Máximo para escala del gráfico (en minutos)
  const chartMaxMinutes = useMemo(() => {
    let max = 60; // mínimo 1h para visualización armónica
    weeklyData.forEach(w => {
      if (chartViewMode === 'stacked') {
        const sum = (w.avgCargaP2 || 0) + (w.avgRuta || 0) + (w.avgEsperaPatio || 0) + (w.avgDescarga || 0);
        if (sum > max) max = sum;
      } else {
        if (activeSeries.cargaP2 && (w.avgCargaP2 || 0) > max) max = w.avgCargaP2!;
        if (activeSeries.ruta && (w.avgRuta || 0) > max) max = w.avgRuta!;
        if (activeSeries.esperaPatio && (w.avgEsperaPatio || 0) > max) max = w.avgEsperaPatio!;
        if (activeSeries.descarga && (w.avgDescarga || 0) > max) max = w.avgDescarga!;
        if (activeSeries.cicloMedio && (w.avgCicloMedio || 0) > max) max = w.avgCicloMedio!;
      }
    });
    // Redondear al múltiplo superior de 15 o 30
    return Math.ceil(max / 15) * 15;
  }, [weeklyData, chartViewMode, activeSeries]);

  const hasActiveFilters = cargoFilter !== 'todos' || driverFilter !== 'todos' || timeRange !== 'all';

  const clearFilters = () => {
    setCargoFilter('todos');
    setDriverFilter('todos');
    setTimeRange('all');
  };

  const toggleSeries = (key: keyof typeof activeSeries) => {
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Barra de Encabezado y Filtros */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-50 text-[#0a5c36] rounded-xl border border-emerald-100">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Tiempos Medios de Ciclo & Operación
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Reporte evolutivo semana a semana con trazabilidad de Carga P2, En Ruta, Espera Patio, Descarga y Ciclo Total.
                </p>
              </div>
            </div>
          </div>

          {/* Contador y Badge de Filtros */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              📊 {filteredTrucks.length} viajes analizados
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Controles de Filtros */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* Filtro 1: Temperatura / Tipo de Carga */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-sky-500" />
              <span>Tipo de Carga / Temperatura</span>
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setCargoFilter('todos')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  cargoFilter === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCargoFilter('congelado')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  cargoFilter === 'congelado'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-sky-700 hover:text-sky-900 hover:bg-white/50'
                }`}
              >
                <Snowflake className="w-3 h-3" />
                <span>Congelado</span>
              </button>
              <button
                type="button"
                onClick={() => setCargoFilter('refrigerado')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  cargoFilter === 'refrigerado'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900 hover:bg-white/50'
                }`}
              >
                <Thermometer className="w-3 h-3" />
                <span>Refrigerado</span>
              </button>
              <button
                type="button"
                onClick={() => setCargoFilter('otros')}
                className={`px-2 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  cargoFilter === 'otros'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Otros tipos de carga"
              >
                Otros
              </button>
            </div>
          </div>

          {/* Filtro 2: Chofer */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chofer / Conductor</span>
            </label>
            <div className="relative">
              <select
                value={driverFilter}
                onChange={e => setDriverFilter(e.target.value)}
                className="w-full bg-slate-50 hover:bg-white text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0a5c36] cursor-pointer appearance-none transition-colors"
              >
                <option value="todos">Todos los choferes ({availableDrivers.length})</option>
                {availableDrivers.map(drv => (
                  <option key={drv} value={drv}>
                    {drv}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Filtro 3: Rango de Semanas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Horizonte Temporal</span>
            </label>
            <div className="relative">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as TimeRangeFilter)}
                className="w-full bg-slate-50 hover:bg-white text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0a5c36] cursor-pointer appearance-none transition-colors"
              >
                <option value="all">Todo el historial ({weeklyData.length} semanas)</option>
                <option value="4weeks">Últimas 4 semanas</option>
                <option value="8weeks">Últimas 8 semanas</option>
                <option value="12weeks">Últimas 12 semanas</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      {/* 2. Top 5 KPI Cards: Tiempos Medios Globales del Período / Filtro */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* KPI 1: Carga P2 */}
        <div className="bg-gradient-to-br from-cyan-500/10 via-white to-cyan-50 border border-cyan-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Carga Planta 2</span>
            <Factory className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-cyan-950">
              {formatMinutes(globalSummary.avgCargaP2)}
            </div>
            <p className="text-[10px] font-semibold text-cyan-700/80 mt-0.5">
              {globalSummary.countP2 > 0 ? `${globalSummary.countP2} viajes medidos` : 'Sin registros P2'}
            </p>
          </div>
          <div className="text-[10px] text-cyan-900/60 font-medium border-t border-cyan-100 pt-1.5 flex items-center gap-1">
            <span>Inicio P2 ➔ Despacho</span>
          </div>
        </div>

        {/* KPI 2: En Ruta */}
        <div className="bg-gradient-to-br from-blue-500/10 via-white to-blue-50 border border-blue-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Tiempo en Ruta</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-blue-950">
              {formatMinutes(globalSummary.avgRuta)}
            </div>
            <p className="text-[10px] font-semibold text-blue-700/80 mt-0.5">
              {globalSummary.countRuta > 0 ? `${globalSummary.countRuta} viajes medidos` : 'Sin tramos en ruta'}
            </p>
          </div>
          <div className="text-[10px] text-blue-900/60 font-medium border-t border-blue-100 pt-1.5 flex items-center gap-1">
            <span>Tránsito P2 ➔ Patio CD</span>
          </div>
        </div>

        {/* KPI 3: Espera Patio */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Espera en Patio</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-amber-950">
              {formatMinutes(globalSummary.avgEsperaPatio)}
            </div>
            <p className="text-[10px] font-semibold text-amber-700/80 mt-0.5">
              {globalSummary.countEspera > 0 ? `${globalSummary.countEspera} viajes medidos` : 'Sin esperas'}
            </p>
          </div>
          <div className="text-[10px] text-amber-900/60 font-medium border-t border-amber-100 pt-1.5 flex items-center gap-1">
            <span>Llegada CD ➔ Andén</span>
          </div>
        </div>

        {/* KPI 4: Descarga Andén */}
        <div className="bg-gradient-to-br from-purple-500/10 via-white to-purple-50 border border-purple-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[10px] font-black uppercase tracking-wider">Tiempo Descarga</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-purple-950">
              {formatMinutes(globalSummary.avgDescarga)}
            </div>
            <p className="text-[10px] font-semibold text-purple-700/80 mt-0.5">
              {globalSummary.countDescarga > 0 ? `${globalSummary.countDescarga} descargas` : 'Sin descargas'}
            </p>
          </div>
          <div className="text-[10px] text-purple-900/60 font-medium border-t border-purple-100 pt-1.5 flex items-center gap-1">
            <span>Operación en andén</span>
          </div>
        </div>

        {/* KPI 5: Ciclo Medio Total */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-[#0a5c36]/15 via-white to-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#0a5c36]">
            <span className="text-[10px] font-black uppercase tracking-wider">Ciclo Medio Total</span>
            <RotateCcw className="w-4 h-4 text-[#0a5c36]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#0a5c36]">
              {formatMinutes(globalSummary.avgCicloMedio)}
            </div>
            <p className="text-[10px] font-bold text-emerald-800 mt-0.5">
              {globalSummary.countCiclo > 0 ? `${globalSummary.countCiclo} ciclos completos` : 'Sin datos'}
            </p>
          </div>
          <div className="text-[10px] text-emerald-950/70 font-semibold border-t border-emerald-200 pt-1.5 flex items-center gap-1">
            <span>Duración global punta a punta</span>
          </div>
        </div>

      </div>

      {/* 3. Gráfico de Evolución Semana a Semana */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0a5c36]" />
              <span>Evolución de Tiempos Medios Semana a Semana</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Tendencia comparativa de duración por etapa y ciclo medio a lo largo del tiempo.
            </p>
          </div>

          {/* Selector de Modo de Gráfico */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setChartViewMode('grouped')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartViewMode === 'grouped' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Barras Agrupadas por métrica"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('stacked')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartViewMode === 'stacked' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Barras Apiladas (Composición del Ciclo)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Apiladas</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('lines')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartViewMode === 'lines' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Líneas de Tendencia"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Tendencia</span>
            </button>
          </div>
        </div>

        {/* Leyenda interactiva con Toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs font-bold">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">Series:</span>

          {/* Toggle Carga P2 */}
          <button
            type="button"
            onClick={() => toggleSeries('cargaP2')}
            className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSeries.cargaP2
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Carga P2</span>
          </button>

          {/* Toggle Ruta */}
          <button
            type="button"
            onClick={() => toggleSeries('ruta')}
            className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSeries.ruta
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>En Ruta</span>
          </button>

          {/* Toggle Espera Patio */}
          <button
            type="button"
            onClick={() => toggleSeries('esperaPatio')}
            className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSeries.esperaPatio
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Espera Patio</span>
          </button>

          {/* Toggle Descarga */}
          <button
            type="button"
            onClick={() => toggleSeries('descarga')}
            className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSeries.descarga
                ? 'bg-purple-50 border-purple-300 text-purple-800'
                : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Descarga</span>
          </button>

          {/* Toggle Ciclo Medio */}
          {chartViewMode !== 'stacked' && (
            <button
              type="button"
              onClick={() => toggleSeries('cicloMedio')}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSeries.cicloMedio
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#0a5c36]" />
              <span>Ciclo Medio</span>
            </button>
          )}
        </div>

        {/* Área del Gráfico SVG */}
        {weeklyData.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Sin datos de operaciones para los filtros seleccionados</h4>
            <p className="text-xs text-slate-500">Prueba ajustando el filtro de temperatura, chofer o rango de semanas.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs font-bold text-[#0a5c36] hover:underline cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        ) : (
          <div className="relative pt-4 pb-2 select-none">
            {/* Contenedor del Gráfico SVG */}
            <div className="h-72 w-full">
              {(() => {
                const chartHeight = 260;
                const chartPaddingTop = 20;
                const chartPaddingBottom = 40;
                const chartPaddingLeft = 50;
                const chartPaddingRight = 20;

                const usableHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
                const maxVal = chartMaxMinutes;

                // Líneas de cuadrícula Y (4 niveles: 0, 33%, 66%, 100%)
                const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

                const numWeeks = weeklyData.length;

                return (
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox={`0 0 1000 ${chartHeight}`}
                    preserveAspectRatio="none"
                  >
                    {/* Ejes y líneas de fondo */}
                    {yTicks.map(tVal => {
                      const yPos = chartHeight - chartPaddingBottom - (tVal / maxVal) * usableHeight;
                      return (
                        <g key={tVal}>
                          <line
                            x1={chartPaddingLeft}
                            y1={yPos}
                            x2={1000 - chartPaddingRight}
                            y2={yPos}
                            stroke="#e2e8f0"
                            strokeDasharray={tVal === 0 ? 'none' : '3 3'}
                            strokeWidth="1"
                          />
                          <text
                            x={chartPaddingLeft - 8}
                            y={yPos + 3}
                            textAnchor="end"
                            fontSize="10"
                            fontWeight="600"
                            fill="#94a3b8"
                          >
                            {formatMinutesCompact(tVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* RENDERIZADO MODO: BARRAS AGRUPADAS */}
                    {chartViewMode === 'grouped' && weeklyData.map((week, idx) => {
                      const slotWidth = (1000 - chartPaddingLeft - chartPaddingRight) / numWeeks;
                      const centerX = chartPaddingLeft + (idx + 0.5) * slotWidth;

                      const allSeriesItems: { key: keyof typeof activeSeries; color: string; val: number | null }[] = [
                        { key: 'cargaP2', color: '#06b6d4', val: week.avgCargaP2 },
                        { key: 'ruta', color: '#3b82f6', val: week.avgRuta },
                        { key: 'esperaPatio', color: '#f59e0b', val: week.avgEsperaPatio },
                        { key: 'descarga', color: '#8b5cf6', val: week.avgDescarga },
                        { key: 'cicloMedio', color: '#0a5c36', val: week.avgCicloMedio },
                      ];
                      const activeKeys = allSeriesItems.filter(s => activeSeries[s.key]);

                      const barWidth = Math.min(slotWidth / Math.max(activeKeys.length + 1, 2), 16);
                      const totalBarsWidth = activeKeys.length * barWidth;
                      const startX = centerX - totalBarsWidth / 2;

                      const isHovered = hoveredWeekKey === week.weekKey;

                      return (
                        <g
                          key={week.weekKey}
                          className="cursor-pointer transition-opacity"
                          onMouseEnter={() => setHoveredWeekKey(week.weekKey)}
                          onMouseLeave={() => setHoveredWeekKey(null)}
                          onClick={() => setExpandedWeekKey(prev => prev === week.weekKey ? null : week.weekKey)}
                        >
                          {/* Fondo de columna resaltado al hover */}
                          {isHovered && (
                            <rect
                              x={centerX - slotWidth / 2 + 2}
                              y={chartPaddingTop}
                              width={slotWidth - 4}
                              height={usableHeight}
                              fill="#f1f5f9"
                              rx="6"
                              opacity="0.6"
                            />
                          )}

                          {/* Barras individuales para cada serie activa */}
                          {activeKeys.map((s, bIdx) => {
                            const val = s.val || 0;
                            const barHeight = Math.max((val / maxVal) * usableHeight, val > 0 ? 3 : 0);
                            const barY = chartHeight - chartPaddingBottom - barHeight;
                            const barX = startX + bIdx * barWidth + 1;

                            return (
                              <g key={s.key}>
                                <rect
                                  x={barX}
                                  y={barY}
                                  width={Math.max(barWidth - 2, 2)}
                                  height={barHeight}
                                  fill={s.color}
                                  rx="2"
                                  className="transition-all duration-300 hover:brightness-110"
                                />
                              </g>
                            );
                          })}

                          {/* Etiqueta del Eje X (Semana) */}
                          <text
                            x={centerX}
                            y={chartHeight - 16}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight={isHovered ? '800' : '600'}
                            fill={isHovered ? '#0a5c36' : '#64748b'}
                          >
                            {week.shortLabel}
                          </text>
                          <text
                            x={centerX}
                            y={chartHeight - 4}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="500"
                            fill="#94a3b8"
                          >
                            {week.operations.length} ops
                          </text>
                        </g>
                      );
                    })}

                    {/* RENDERIZADO MODO: BARRAS APILADAS */}
                    {chartViewMode === 'stacked' && weeklyData.map((week, idx) => {
                      const slotWidth = (1000 - chartPaddingLeft - chartPaddingRight) / numWeeks;
                      const centerX = chartPaddingLeft + (idx + 0.5) * slotWidth;
                      const barWidth = Math.min(slotWidth * 0.45, 26);
                      const barX = centerX - barWidth / 2;

                      const isHovered = hoveredWeekKey === week.weekKey;

                      // Segmentos apilados
                      const segments = [
                        { key: 'cargaP2', color: '#06b6d4', val: activeSeries.cargaP2 ? (week.avgCargaP2 || 0) : 0 },
                        { key: 'ruta', color: '#3b82f6', val: activeSeries.ruta ? (week.avgRuta || 0) : 0 },
                        { key: 'esperaPatio', color: '#f59e0b', val: activeSeries.esperaPatio ? (week.avgEsperaPatio || 0) : 0 },
                        { key: 'descarga', color: '#8b5cf6', val: activeSeries.descarga ? (week.avgDescarga || 0) : 0 },
                      ];

                      let accumulatedVal = 0;

                      return (
                        <g
                          key={week.weekKey}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredWeekKey(week.weekKey)}
                          onMouseLeave={() => setHoveredWeekKey(null)}
                          onClick={() => setExpandedWeekKey(prev => prev === week.weekKey ? null : week.weekKey)}
                        >
                          {isHovered && (
                            <rect
                              x={centerX - slotWidth / 2 + 2}
                              y={chartPaddingTop}
                              width={slotWidth - 4}
                              height={usableHeight}
                              fill="#f1f5f9"
                              rx="6"
                              opacity="0.6"
                            />
                          )}

                          {segments.map((seg, sIdx) => {
                            const val = seg.val;
                            if (val <= 0) return null;
                            const segHeight = (val / maxVal) * usableHeight;
                            const segY = chartHeight - chartPaddingBottom - ((accumulatedVal + val) / maxVal) * usableHeight;
                            accumulatedVal += val;

                            return (
                              <rect
                                key={seg.key}
                                x={barX}
                                y={segY}
                                width={barWidth}
                                height={segHeight}
                                fill={seg.color}
                                rx={sIdx === segments.length - 1 ? 3 : 0}
                                className="transition-all duration-300"
                              />
                            );
                          })}

                          {/* Etiqueta X */}
                          <text
                            x={centerX}
                            y={chartHeight - 16}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight={isHovered ? '800' : '600'}
                            fill={isHovered ? '#0a5c36' : '#64748b'}
                          >
                            {week.shortLabel}
                          </text>
                          <text
                            x={centerX}
                            y={chartHeight - 4}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="500"
                            fill="#94a3b8"
                          >
                            {week.operations.length} ops
                          </text>
                        </g>
                      );
                    })}

                    {/* RENDERIZADO MODO: LÍNEAS DE TENDENCIA */}
                    {chartViewMode === 'lines' && (() => {
                      const slotWidth = (1000 - chartPaddingLeft - chartPaddingRight) / numWeeks;
                      const lineSeriesConfig = [
                        { key: 'cargaP2', color: '#06b6d4', field: 'avgCargaP2' as const },
                        { key: 'ruta', color: '#3b82f6', field: 'avgRuta' as const },
                        { key: 'esperaPatio', color: '#f59e0b', field: 'avgEsperaPatio' as const },
                        { key: 'descarga', color: '#8b5cf6', field: 'avgDescarga' as const },
                        { key: 'cicloMedio', color: '#0a5c36', field: 'avgCicloMedio' as const },
                      ].filter(s => activeSeries[s.key as keyof typeof activeSeries]);

                      return (
                        <g>
                          {/* Polylines para cada serie */}
                          {lineSeriesConfig.map(s => {
                            const points = weeklyData
                              .map((w, idx) => {
                                const val = w[s.field];
                                if (val === null) return null;
                                const x = chartPaddingLeft + (idx + 0.5) * slotWidth;
                                const y = chartHeight - chartPaddingBottom - (val / maxVal) * usableHeight;
                                return `${x},${y}`;
                              })
                              .filter(Boolean)
                              .join(' ');

                            return (
                              <g key={s.key}>
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke={s.color}
                                  strokeWidth={s.key === 'cicloMedio' ? '3' : '2'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {/* Nodos interactivos */}
                                {weeklyData.map((w, idx) => {
                                  const val = w[s.field];
                                  if (val === null) return null;
                                  const cx = chartPaddingLeft + (idx + 0.5) * slotWidth;
                                  const cy = chartHeight - chartPaddingBottom - (val / maxVal) * usableHeight;
                                  const isHovered = hoveredWeekKey === w.weekKey;

                                  return (
                                    <circle
                                      key={`${w.weekKey}-${s.key}`}
                                      cx={cx}
                                      cy={cy}
                                      r={isHovered ? 5 : 3.5}
                                      fill="white"
                                      stroke={s.color}
                                      strokeWidth={s.key === 'cicloMedio' ? 2.5 : 2}
                                      className="transition-all"
                                    />
                                  );
                                })}
                              </g>
                            );
                          })}

                          {/* Columnas hover y etiquetas X */}
                          {weeklyData.map((week, idx) => {
                            const centerX = chartPaddingLeft + (idx + 0.5) * slotWidth;
                            const isHovered = hoveredWeekKey === week.weekKey;

                            return (
                              <g
                                key={week.weekKey}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredWeekKey(week.weekKey)}
                                onMouseLeave={() => setHoveredWeekKey(null)}
                                onClick={() => setExpandedWeekKey(prev => prev === week.weekKey ? null : week.weekKey)}
                              >
                                {isHovered && (
                                  <line
                                    x1={centerX}
                                    y1={chartPaddingTop}
                                    x2={centerX}
                                    y2={chartHeight - chartPaddingBottom}
                                    stroke="#94a3b8"
                                    strokeDasharray="2 2"
                                    strokeWidth="1.5"
                                  />
                                )}
                                <text
                                  x={centerX}
                                  y={chartHeight - 16}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fontWeight={isHovered ? '800' : '600'}
                                  fill={isHovered ? '#0a5c36' : '#64748b'}
                                >
                                  {week.shortLabel}
                                </text>
                                <text
                                  x={centerX}
                                  y={chartHeight - 4}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fontWeight="500"
                                  fill="#94a3b8"
                                >
                                  {week.operations.length} ops
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                );
              })()}
            </div>

            {/* Tooltip Flotante de Detalle al pasar el cursor */}
            {hoveredWeekKey && (() => {
              const hovered = weeklyData.find(w => w.weekKey === hoveredWeekKey);
              if (!hovered) return null;

              return (
                <div className="mt-3 p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 max-w-md mx-auto flex flex-col gap-2 animate-fadeIn text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-extrabold text-emerald-400">{hovered.label}</span>
                      <span className="text-[11px] text-slate-400 ml-2 font-semibold">({hovered.operations.length} operaciones)</span>
                    </div>
                    {hovered.cicloPctVsPrev !== null && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        hovered.cicloPctVsPrev <= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                      }`}>
                        {hovered.cicloPctVsPrev <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        <span>{Math.abs(hovered.cicloPctVsPrev)}% vs sem. ant.</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-cyan-400 block font-semibold text-[10px]">Carga P2</span>
                      <span className="font-bold">{formatMinutes(hovered.avgCargaP2)}</span>
                    </div>
                    <div>
                      <span className="text-blue-400 block font-semibold text-[10px]">En Ruta</span>
                      <span className="font-bold">{formatMinutes(hovered.avgRuta)}</span>
                    </div>
                    <div>
                      <span className="text-amber-400 block font-semibold text-[10px]">Espera Patio</span>
                      <span className="font-bold">{formatMinutes(hovered.avgEsperaPatio)}</span>
                    </div>
                    <div>
                      <span className="text-purple-400 block font-semibold text-[10px]">Descarga</span>
                      <span className="font-bold">{formatMinutes(hovered.avgDescarga)}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-white/10 rounded-lg p-1 text-center">
                      <span className="text-emerald-300 block font-extrabold text-[10px]">Ciclo Medio</span>
                      <span className="font-black text-emerald-200">{formatMinutes(hovered.avgCicloMedio)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 4. Tabla Detallada Semana a Semana & Acordeón de Viajes */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0a5c36]" />
              <span>Desglose Detallado de Métricas por Semana</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Haz clic en cualquier semana para desplegar y auditar los viajes individuales.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 self-start sm:self-auto">
            {weeklyData.length} {weeklyData.length === 1 ? 'semana registrada' : 'semanas registradas'}
          </span>
        </div>

        {weeklyData.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-semibold">
            No hay registros para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Semana / Período</th>
                  <th className="py-3.5 px-3 text-center">Viajes</th>
                  <th className="py-3.5 px-3 text-cyan-800">Carga P2</th>
                  <th className="py-3.5 px-3 text-blue-800">En Ruta</th>
                  <th className="py-3.5 px-3 text-amber-800">Espera Patio</th>
                  <th className="py-3.5 px-3 text-purple-800">Descarga</th>
                  <th className="py-3.5 px-3 text-[#0a5c36]">Ciclo Medio</th>
                  <th className="py-3.5 px-3 text-center">Evolución</th>
                  <th className="py-3.5 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklyData.map(week => {
                  const isExpanded = expandedWeekKey === week.weekKey;

                  return (
                    <React.Fragment key={week.weekKey}>
                      <tr
                        onClick={() => setExpandedWeekKey(isExpanded ? null : week.weekKey)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        {/* Semana */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#0a5c36]" />
                            <span>{week.label}</span>
                          </div>
                        </td>

                        {/* Cantidad de Viajes */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px]">
                            {week.operations.length}
                          </span>
                        </td>

                        {/* Carga P2 */}
                        <td className="py-3.5 px-3 font-semibold text-cyan-900">
                          {formatMinutes(week.avgCargaP2)}
                          {week.countCargaP2 > 0 && (
                            <span className="text-[10px] text-cyan-600/70 block">({week.countCargaP2})</span>
                          )}
                        </td>

                        {/* En Ruta */}
                        <td className="py-3.5 px-3 font-semibold text-blue-900">
                          {formatMinutes(week.avgRuta)}
                          {week.countRuta > 0 && (
                            <span className="text-[10px] text-blue-600/70 block">({week.countRuta})</span>
                          )}
                        </td>

                        {/* Espera Patio */}
                        <td className="py-3.5 px-3 font-semibold text-amber-900">
                          {formatMinutes(week.avgEsperaPatio)}
                          {week.countEsperaPatio > 0 && (
                            <span className="text-[10px] text-amber-600/70 block">({week.countEsperaPatio})</span>
                          )}
                        </td>

                        {/* Descarga */}
                        <td className="py-3.5 px-3 font-semibold text-purple-900">
                          {formatMinutes(week.avgDescarga)}
                          {week.countDescarga > 0 && (
                            <span className="text-[10px] text-purple-600/70 block">({week.countDescarga})</span>
                          )}
                        </td>

                        {/* Ciclo Medio */}
                        <td className="py-3.5 px-3 font-black text-[#0a5c36]">
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                            {formatMinutes(week.avgCicloMedio)}
                          </span>
                        </td>

                        {/* Evolución vs previa */}
                        <td className="py-3.5 px-3 text-center">
                          {week.cicloDiffVsPrev === null ? (
                            <span className="text-[10px] text-slate-400 font-semibold">—</span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${
                                week.cicloDiffVsPrev <= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                              title={`${week.cicloDiffVsPrev > 0 ? '+' : ''}${week.cicloDiffVsPrev} min respecto a la semana anterior`}
                            >
                              {week.cicloDiffVsPrev <= 0 ? (
                                <TrendingDown className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <TrendingUp className="w-3 h-3 text-red-700" />
                              )}
                              <span>
                                {week.cicloPctVsPrev !== null ? `${Math.abs(week.cicloPctVsPrev)}%` : `${Math.abs(week.cicloDiffVsPrev)}m`}
                              </span>
                            </span>
                          )}
                        </td>

                        {/* Detalle Acordeón */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Fila expandible con el detalle de viajes de la semana */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                  <Truck className="w-3.5 h-3.5 text-[#0a5c36]" />
                                  <span>Viajes en {week.label} ({week.operations.length})</span>
                                </h4>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Tiempos medidos por transporte
                                </span>
                              </div>

                              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-slate-100/90 text-slate-500 font-extrabold border-b border-slate-200 text-[9px] uppercase tracking-wider">
                                      <th className="py-2.5 px-3">Chofer / Patente</th>
                                      <th className="py-2.5 px-3">Carga / Temp</th>
                                      <th className="py-2.5 px-3">Origen</th>
                                      <th className="py-2.5 px-3 text-cyan-800">Carga P2</th>
                                      <th className="py-2.5 px-3 text-blue-800">En Ruta</th>
                                      <th className="py-2.5 px-3 text-amber-800">Espera Patio</th>
                                      <th className="py-2.5 px-3 text-purple-800">Descarga</th>
                                      <th className="py-2.5 px-3 text-[#0a5c36]">Ciclo Total</th>
                                      <th className="py-2.5 px-3">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {week.operations.map(op => {
                                      const m = getTruckCycleMetrics(op);
                                      const isCongelado = (op.carrier || '').toLowerCase().includes('congelado');
                                      const isRefrigerado = (op.carrier || '').toLowerCase().includes('refrigerado');

                                      return (
                                        <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                                          {/* Chofer / Patente */}
                                          <td className="py-2 px-3 font-bold text-slate-900">
                                            <div className="flex flex-col">
                                              <span>{op.driver || 'Sin chofer'}</span>
                                              <span className="text-[10px] text-slate-400 font-semibold">
                                                {op.tractor_plate || op.patent || 'S/P'}
                                                {op.trailer_plate ? ` · R: ${op.trailer_plate}` : ''}
                                              </span>
                                            </div>
                                          </td>

                                          {/* Carga / Temp */}
                                          <td className="py-2 px-3">
                                            <span
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                isCongelado
                                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                                  : isRefrigerado
                                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                                              }`}
                                            >
                                              {isCongelado && <Snowflake className="w-2.5 h-2.5 text-sky-600" />}
                                              {isRefrigerado && <Thermometer className="w-2.5 h-2.5 text-emerald-600" />}
                                              {!isCongelado && !isRefrigerado && <Package className="w-2.5 h-2.5 text-slate-500" />}
                                              <span>{op.carrier || 'General'}</span>
                                            </span>
                                          </td>

                                          {/* Origen */}
                                          <td className="py-2 px-3 text-[10px] font-bold text-slate-600">
                                            {op.origin === 'planta_2' ? (
                                              <span className="text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">Planta 2</span>
                                            ) : (
                                              <span className="text-slate-500">Patio CD</span>
                                            )}
                                          </td>

                                          {/* Carga P2 */}
                                          <td className="py-2 px-3 font-semibold text-cyan-900">
                                            {formatMinutes(m.cargaP2Min)}
                                          </td>

                                          {/* En Ruta */}
                                          <td className="py-2 px-3 font-semibold text-blue-900">
                                            {formatMinutes(m.rutaMin)}
                                          </td>

                                          {/* Espera Patio */}
                                          <td className="py-2 px-3 font-semibold text-amber-900">
                                            {formatMinutes(m.esperaPatioMin)}
                                          </td>

                                          {/* Descarga */}
                                          <td className="py-2 px-3 font-semibold text-purple-900">
                                            {formatMinutes(m.descargaMin)}
                                          </td>

                                          {/* Ciclo Total */}
                                          <td className="py-2 px-3 font-black text-[#0a5c36]">
                                            {formatMinutes(m.cicloTotalMin)}
                                          </td>

                                          {/* Estado */}
                                          <td className="py-2 px-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                              {op.status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
