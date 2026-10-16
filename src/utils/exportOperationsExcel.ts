import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import type { YardOperation } from '../App';

// Formato de fecha y hora local para Chile (DD/MM/AAAA HH:mm:ss)
export const formatDateTimeChile = (isoString?: string | null): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Formato de solo fecha (DD/MM/AAAA)
export const formatDateOnlyChile = (isoString?: string | null): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Cálculo de minutos entre dos fechas ISO
export const calcDiffMinutes = (startIso?: string | null, endIso?: string | null): number | null => {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  const diffMs = end - start;
  return Math.round(diffMs / 60000);
};

// Formatear minutos en texto amigable '1h 24m' o '45m'
export const formatMinutesToHours = (totalMinutes: number | null): string => {
  if (totalMinutes === null || isNaN(totalMinutes)) return '';
  if (totalMinutes < 0) return `-${formatMinutesToHours(Math.abs(totalMinutes))}`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

// Traducir estado a texto formal
export const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    cita: 'Cita Programada',
    planta_carga: 'En Carga (Planta 2)',
    en_ruta: 'En Ruta a CD',
    espera: 'En Espera (Patio)',
    anden: 'En Andén (Operación)',
    completado: 'Completado / Despachado'
  };
  return map[status] || status;
};

// Traducir origen
export const getOriginLabel = (origin?: string | null): string => {
  if (!origin) return 'Planta 2';
  if (origin === 'planta_2') return 'Planta 2';
  if (origin === 'proveedor') return 'Proveedor Externo';
  return origin;
};

export interface ExportOptions {
  mode: 'all_db' | 'filtered';
  filteredOperations?: YardOperation[];
  docks?: { id: string; name: string }[];
  onProgress?: (msg: string) => void;
}

// Función principal para descargar el Excel completo con todos los tiempos
export const exportOperationsToExcel = async ({
  mode,
  filteredOperations = [],
  docks = [],
  onProgress
}: ExportOptions): Promise<{ count: number; filename: string }> => {
  let operations: any[] = [];
  const docksMap = new Map<string, string>();
  docks.forEach(d => docksMap.set(d.id, d.name));

  if (mode === 'filtered') {
    operations = [...filteredOperations];
    onProgress?.(`Preparando ${operations.length} registros filtrados...`);
  } else {
    // Modo base de datos completa: traer todos los registros de dock.yard_operations sin límite de 1000
    onProgress?.('Consultando base de datos completa...');
    
    // Si no tenemos mapa de andenes completo, cargarlo
    if (docksMap.size === 0) {
      const { data: docksData } = await supabase.from('docks').select('id, name');
      if (docksData) {
        docksData.forEach(d => docksMap.set(d.id, d.name));
      }
    }

    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      onProgress?.(`Descargando registros de la base de datos (${page * PAGE_SIZE} cargados)...`);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('yard_operations')
        .select(`
          *,
          dock:dock_id ( name )
        `)
        .order('entry_time', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        operations = operations.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
  }

  onProgress?.(`Procesando ${operations.length} operaciones y calculando todos los tiempos...`);

  // Construir filas de la Hoja 1: "Historial de Operaciones"
  const rows = operations.map((op, idx) => {
    const dockName = op.dock?.name || (op.dock_id ? docksMap.get(op.dock_id) : '') || '—';
    
    // Tiempos de proceso calculados
    const cargaP2Min = calcDiffMinutes(op.plant_loading_time, op.dispatch_time);
    const trasladoP2Min = calcDiffMinutes(op.dispatch_time, op.entry_time);
    const esperaPatioMin = calcDiffMinutes(op.entry_time, op.start_time);
    const andénOperacionMin = calcDiffMinutes(op.start_time, op.end_time);
    
    // Estadía total en CD (desde llegada a patio hasta salida o término)
    const salidaFin = op.exit_time || op.end_time;
    const estadiaTotalCDMin = calcDiffMinutes(op.entry_time, salidaFin);

    // Ciclo logístico integral (desde inicio en P2 hasta salida final en CD)
    const cicloIntegralMin = calcDiffMinutes(op.plant_loading_time, salidaFin);

    // Desviación de Cita (Puntualidad)
    let desviacionCitaMin: number | null = null;
    let puntualidadCita = 'Sin Cita';
    if (op.scheduled_entry_time && op.entry_time) {
      desviacionCitaMin = calcDiffMinutes(op.scheduled_entry_time, op.entry_time);
      if (desviacionCitaMin !== null) {
        if (Math.abs(desviacionCitaMin) <= 15) {
          puntualidadCita = 'A Tiempo (±15 min)';
        } else if (desviacionCitaMin < -15) {
          puntualidadCita = `Adelantado (${formatMinutesToHours(Math.abs(desviacionCitaMin))})`;
        } else {
          puntualidadCita = `Retrasado (+${formatMinutesToHours(desviacionCitaMin)})`;
        }
      }
    }

    return {
      'N°': idx + 1,
      'ID Operación': op.id,
      'Fecha Ingreso': formatDateOnlyChile(op.entry_time || op.created_at),
      'Estado Actual': getStatusLabel(op.status),
      'Tipo Operación': op.type || '—',
      'Origen': getOriginLabel(op.origin),
      'Andén': dockName,
      'Chofer': op.driver || '—',
      'RUT': op.rut || '—',
      'Teléfono': op.phone || '—',
      'Patente Tractor': op.tractor_plate || op.patent || '—',
      'Patente Rampla': op.trailer_plate || '—',
      'Carga / Transportista': op.carrier || '—',
      
      // MARCAS TEMPORALES EXACTAS (TIMESTAMPS DE BASE DE DATOS)
      '1. Creación Registro (created_at)': formatDateTimeChile(op.created_at),
      '2. Inicio Carga en Planta 2 (plant_loading_time)': formatDateTimeChile(op.plant_loading_time),
      '3. Despacho / Salida Planta 2 (dispatch_time)': formatDateTimeChile(op.dispatch_time),
      '4. Cita Programada - Inicio (scheduled_entry_time)': formatDateTimeChile(op.scheduled_entry_time),
      '5. Cita Programada - Fin (scheduled_end_time)': formatDateTimeChile(op.scheduled_end_time),
      '6. Llegada a Patio / Registro (entry_time)': formatDateTimeChile(op.entry_time),
      '7. Llamado / Inicio Andén (start_time)': formatDateTimeChile(op.start_time),
      '8. Fin Operación / Liberación Andén (end_time)': formatDateTimeChile(op.end_time),
      '9. Salida del Recinto (exit_time)': formatDateTimeChile(op.exit_time),
      '10. Última Actualización (updated_at)': formatDateTimeChile(op.updated_at),

      // TIEMPOS CALCULADOS DE PROCESO (EN MINUTOS Y FORMATO HORAS/MINUTOS)
      'Espera en Patio (min)': esperaPatioMin !== null ? esperaPatioMin : '',
      'Espera en Patio (Tiempo)': formatMinutesToHours(esperaPatioMin),
      'Operación en Andén (min)': andénOperacionMin !== null ? andénOperacionMin : '',
      'Operación en Andén (Tiempo)': formatMinutesToHours(andénOperacionMin),
      'Estadía Total en CD (min)': estadiaTotalCDMin !== null ? estadiaTotalCDMin : '',
      'Estadía Total en CD (Tiempo)': formatMinutesToHours(estadiaTotalCDMin),
      'Traslado P2 -> CD (min)': trasladoP2Min !== null ? trasladoP2Min : '',
      'Traslado P2 -> CD (Tiempo)': formatMinutesToHours(trasladoP2Min),
      'Carga en Planta 2 (min)': cargaP2Min !== null ? cargaP2Min : '',
      'Carga en Planta 2 (Tiempo)': formatMinutesToHours(cargaP2Min),
      'Ciclo Logístico Integral P2-CD (min)': cicloIntegralMin !== null ? cicloIntegralMin : '',
      'Ciclo Logístico Integral P2-CD (Tiempo)': formatMinutesToHours(cicloIntegralMin),
      'Desviación vs Cita (min)': desviacionCitaMin !== null ? desviacionCitaMin : '',
      'Puntualidad Cita': puntualidadCita
    };
  });

  // Hoja 1: Historial de Operaciones
  const ws1 = XLSX.utils.json_to_sheet(rows);

  // Auto-ajustar anchos de columna para visualización profesional
  if (rows.length > 0) {
    const colKeys = Object.keys(rows[0]);
    ws1['!cols'] = colKeys.map(key => {
      let maxLen = key.length;
      // Muestra aleatoria o primeras 100 filas para calcular ancho
      const sample = rows.slice(0, 100);
      sample.forEach(r => {
        const val = (r as any)[key];
        const len = val !== null && val !== undefined ? String(val).length : 0;
        if (len > maxLen) maxLen = len;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
  }

  // Hoja 2: Resumen Ejecutivo y Métricas de Tiempos
  const completedOps = operations.filter(o => o.status === 'completado');
  const validEsperaMin = operations
    .map(o => calcDiffMinutes(o.entry_time, o.start_time))
    .filter((m): m is number => m !== null && m >= 0);
  const validAndenMin = operations
    .map(o => calcDiffMinutes(o.start_time, o.end_time))
    .filter((m): m is number => m !== null && m >= 0);
  const validEstadiaMin = operations
    .map(o => calcDiffMinutes(o.entry_time, o.exit_time || o.end_time))
    .filter((m): m is number => m !== null && m >= 0);
  const validTrasladoMin = operations
    .map(o => calcDiffMinutes(o.dispatch_time, o.entry_time))
    .filter((m): m is number => m !== null && m >= 0);

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const summaryKpi = [
    { 'Métrica': 'Total de Operaciones Registradas', 'Valor': operations.length, 'Unidad / Formato': 'Camiones' },
    { 'Métrica': 'Operaciones Completadas / Despachadas', 'Valor': completedOps.length, 'Unidad / Formato': 'Camiones' },
    { 'Métrica': 'Camiones Actualmente en Andén', 'Valor': operations.filter(o => o.status === 'anden').length, 'Unidad / Formato': 'Camiones' },
    { 'Métrica': 'Camiones en Espera en Patio', 'Valor': operations.filter(o => o.status === 'espera').length, 'Unidad / Formato': 'Camiones' },
    { 'Métrica': 'Camiones en Ruta desde Planta 2', 'Valor': operations.filter(o => o.status === 'en_ruta').length, 'Unidad / Formato': 'Camiones' },
    { 'Métrica': 'Citas Programadas Registradas', 'Valor': operations.filter(o => o.status === 'cita' || Boolean(o.scheduled_entry_time)).length, 'Unidad / Formato': 'Camiones' },
    { 'Métrica': 'Promedio Espera en Patio', 'Valor': avg(validEsperaMin), 'Unidad / Formato': `${avg(validEsperaMin)} min (${formatMinutesToHours(avg(validEsperaMin))})` },
    { 'Métrica': 'Promedio Operación en Andén', 'Valor': avg(validAndenMin), 'Unidad / Formato': `${avg(validAndenMin)} min (${formatMinutesToHours(avg(validAndenMin))})` },
    { 'Métrica': 'Promedio Estadía Total en CD', 'Valor': avg(validEstadiaMin), 'Unidad / Formato': `${avg(validEstadiaMin)} min (${formatMinutesToHours(avg(validEstadiaMin))})` },
    { 'Métrica': 'Promedio Traslado Planta 2 -> CD', 'Valor': avg(validTrasladoMin), 'Unidad / Formato': `${avg(validTrasladoMin)} min (${formatMinutesToHours(avg(validTrasladoMin))})` },
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryKpi);
  ws2['!cols'] = [{ wch: 42 }, { wch: 15 }, { wch: 30 }];

  // Crear Libro Excel
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Historial Operaciones');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen y Tiempos KPI');

  // Guardar archivo
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = mode === 'filtered' ? 'Filtrado' : 'BaseDatos_Completa';
  const filename = `NexusDock_Historial_Tiempos_${suffix}_${dateStr}.xlsx`;

  onProgress?.('Generando archivo Excel...');
  XLSX.writeFile(wb, filename);

  return { count: operations.length, filename };
};
