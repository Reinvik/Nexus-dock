import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2,
  CheckCircle,
  Plus, 
  MapPin, 
  User, 
  Search,
  RefreshCw,
  AlertCircle,
  History,
  BarChart3,
  Monitor,
  ArrowRight,
  RotateCcw,
  Trash2,
  Package,
  Truck,
  LogOut
} from 'lucide-react';
import { supabase } from './lib/supabase';
import cialLogo from './assets/cial-alimentos-logo.png';

interface Dock {
  id: string;
  name: string;
  status: 'Disponible' | 'Ocupado' | 'Mantenimiento';
}

interface Driver {
  id: string;
  name: string;
  rut: string;
  phone: string;
  default_tractor: string | null;
  default_trailer: string | null;
}

interface Vehicle {
  id: string;
  plate: string;
  type: 'Tractor' | 'Rampla';
}

interface YardOperation {
  id: string;
  patent: string | null;
  tractor_plate: string | null;
  trailer_plate: string | null;
  driver_id: string | null;
  rut: string | null;
  phone: string | null;
  driver: string;
  carrier: string;
  type: 'Carga' | 'Descarga';
  status: 'cita' | 'espera' | 'anden' | 'completado';
  dock_id: string | null;
  entry_time: string;
  start_time: string | null;
  end_time: string | null;
  exit_time: string | null;
  scheduled_entry_time?: string | null;
  scheduled_end_time?: string | null;
  dock?: {
    name: string;
  } | null;
}

const PERMITTED_OPERATION_TIME_MS = 15 * 60 * 1000; // 15 minutos estándar

const formatLocalDatetime = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'yard' | 'scheduler' | 'history' | 'reports'>('yard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Datos de Supabase
  const [trucks, setTrucks] = useState<YardOperation[]>([]);
  const [docks, setDocks] = useState<Dock[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Campos del modal de ingreso
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [manualDriverName, setManualDriverName] = useState('');
  const [driverRut, setDriverRut] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  
  // Tractor: Selección o manual
  const [selectedTractorId, setSelectedTractorId] = useState<string>('');
  const [manualTractorPlate, setManualTractorPlate] = useState('');
  const [isManualTractor, setIsManualTractor] = useState(false);

  // Rampla: Selección o manual
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>('');
  const [manualTrailerPlate, setManualTrailerPlate] = useState('');
  const [isManualTrailer, setIsManualTrailer] = useState(false);

  const [cargoType, setCargoType] = useState('Refrigerado');
  const [customCargoType, setCustomCargoType] = useState('');
  const [operationType, setOperationType] = useState<'Carga' | 'Descarga'>('Descarga');

  // Campos de tiempo de citación y término programados
  const [scheduledEntryTime, setScheduledEntryTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [isCitaEntry, setIsCitaEntry] = useState(false); // Alternar entre cita e ingreso directo

  // States para Drag and Drop
  const [draggedTruckForDock, setDraggedTruckForDock] = useState<YardOperation | null>(null);
  const [showDockSelectModal, setShowDockSelectModal] = useState(false);
  const [selectedDockIdForDrag, setSelectedDockIdForDrag] = useState('');

  // States para Matriz Horaria (Scheduler)
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date>(new Date());
  const [citaDate, setCitaDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [citaTime, setCitaTime] = useState<string>('09:00');
  const [selectedDockIdInModal, setSelectedDockIdInModal] = useState<string>('');

  // States para Historial de Operaciones (pendiente de implementación)
  const [_historySearch, setHistorySearch] = useState('');
  const [_historyStatus, setHistoryStatus] = useState<string>('todos');
  const [_historyOpType, setHistoryOpType] = useState<string>('todos');
  const [_historyCargoType, setHistoryCargoType] = useState<string>('todos');
  const [_historyPage, setHistoryPage] = useState(1);

  // Suprimir advertencias de setters no usados aún
  void setHistorySearch; void setHistoryStatus; void setHistoryOpType; void setHistoryCargoType; void setHistoryPage;


  // Reloj de cabecera
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar datos
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: docksData, error: docksError } = await supabase
        .from('docks')
        .select('*')
        .order('name', { ascending: true });

      if (docksError) throw docksError;

      const { data: operationsData, error: operationsError } = await supabase
        .from('yard_operations')
        .select(`
          *,
          dock:dock_id ( name )
        `)
        .order('entry_time', { ascending: false });

      if (operationsError) throw operationsError;

      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });

      if (driversError) throw driversError;

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate', { ascending: true });

      if (vehiclesError) throw vehiclesError;

      setDocks(docksData || []);
      setTrucks(operationsData || []);
      setDrivers(driversData || []);
      setVehicles(vehiclesData || []);
    } catch (err: any) {
      console.error('Error cargando datos de Supabase:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    
    if (driverId === 'manual') {
      setManualDriverName('');
      setDriverRut('');
      setDriverPhone('');
      setSelectedTractorId('');
      setSelectedTrailerId('');
      setIsManualTractor(true);
      setIsManualTrailer(true);
      return;
    }

    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      setDriverRut(driver.rut);
      setDriverPhone(driver.phone || '');
      
      if (driver.default_tractor) {
        const matchingTractor = vehicles.find(v => v.plate === driver.default_tractor && v.type === 'Tractor');
        if (matchingTractor) {
          setSelectedTractorId(matchingTractor.id);
          setIsManualTractor(false);
        } else {
          setIsManualTractor(true);
          setManualTractorPlate(driver.default_tractor);
        }
      } else {
        setSelectedTractorId('');
        setIsManualTractor(false);
      }

      if (driver.default_trailer) {
        const matchingTrailer = vehicles.find(v => v.plate === driver.default_trailer && v.type === 'Rampla');
        if (matchingTrailer) {
          setSelectedTrailerId(matchingTrailer.id);
          setIsManualTrailer(false);
        } else {
          setIsManualTrailer(true);
          setManualTrailerPlate(driver.default_trailer);
        }
      } else {
        setSelectedTrailerId('');
        setIsManualTrailer(false);
      }
    }
  };

  const handleEntryTimeChange = (val: string) => {
    setScheduledEntryTime(val);
    if (val) {
      const entryDate = new Date(val);
      const endDate = new Date(entryDate.getTime() + durationMinutes * 60 * 1000);
      setScheduledEndTime(formatLocalDatetime(endDate));
    }
  };

  const handleDurationChange = (minutes: number) => {
    setDurationMinutes(minutes);
    if (scheduledEntryTime) {
      const entryDate = new Date(scheduledEntryTime);
      const endDate = new Date(entryDate.getTime() + minutes * 60 * 1000);
      setScheduledEndTime(formatLocalDatetime(endDate));
    }
  };

  const handleEndTimeChange = (val: string) => {
    setScheduledEndTime(val);
    if (scheduledEntryTime && val) {
      const entryDate = new Date(scheduledEntryTime);
      const endDate = new Date(val);
      const diffMs = endDate.getTime() - entryDate.getTime();
      const diffMin = Math.round(diffMs / (60 * 1000));
      if (diffMin > 0) {
        setDurationMinutes(diffMin);
      }
    }
  };

  const handleOpenAddModal = () => {
    const now = new Date();
    const entryStr = formatLocalDatetime(now);
    const endStr = formatLocalDatetime(new Date(now.getTime() + 15 * 60 * 1000));
    
    setScheduledEntryTime(entryStr);
    setScheduledEndTime(endStr);
    setDurationMinutes(15);
    setIsCitaEntry(false);
    setShowAddModal(true);
  };

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let finalDriverName = '';
    let finalDriverId: string | null = null;

    if (selectedDriverId === 'manual') {
      finalDriverName = manualDriverName.trim();
    } else {
      const drv = drivers.find(d => d.id === selectedDriverId);
      if (drv) {
        finalDriverName = drv.name;
        finalDriverId = drv.id;
      }
    }

    if (!finalDriverName) {
      setErrorMsg('Por favor selecciona o ingresa un conductor.');
      return;
    }

    let finalTractor = '';
    if (isManualTractor) {
      finalTractor = manualTractorPlate.toUpperCase().trim();
    } else {
      const vhc = vehicles.find(v => v.id === selectedTractorId);
      if (vhc) finalTractor = vhc.plate;
    }

    let finalTrailer = '';
    if (isManualTrailer) {
      finalTrailer = manualTrailerPlate.toUpperCase().trim();
    } else {
      const vhc = vehicles.find(v => v.id === selectedTrailerId);
      if (vhc) finalTrailer = vhc.plate;
    }

    if (!finalTractor) {
      setErrorMsg('Debe especificar un tractor.');
      return;
    }

    const carrierVal = cargoType === 'Otro' ? (customCargoType.trim() || 'Otro') : cargoType;
    const targetStatus = isCitaEntry ? 'cita' : 'espera';

    let finalEntryTime = new Date().toISOString();
    let finalDockId: string | null = null;

    if (isCitaEntry && citaDate && citaTime) {
      finalEntryTime = new Date(`${citaDate}T${citaTime}:00`).toISOString();
      if (selectedDockIdInModal) {
        finalDockId = selectedDockIdInModal;
      }
    }

    // Usar la hora de citación programada si existe, de lo contrario la hora de ingreso
    const finalScheduledEntry = scheduledEntryTime ? new Date(scheduledEntryTime).toISOString() : finalEntryTime;
    const finalScheduledEnd = scheduledEndTime ? new Date(scheduledEndTime).toISOString() : new Date(new Date(finalEntryTime).getTime() + durationMinutes * 60 * 1000).toISOString();

    const tempId = Date.now().toString();
    const tempTruck: YardOperation = {
      id: tempId,
      patent: `${finalTractor} / ${finalTrailer || 'S/R'}`,
      tractor_plate: finalTractor,
      trailer_plate: finalTrailer || null,
      driver_id: finalDriverId,
      rut: driverRut,
      phone: driverPhone,
      driver: finalDriverName,
      carrier: carrierVal,
      type: operationType,
      status: targetStatus,
      dock_id: finalDockId,
      entry_time: finalEntryTime,
      start_time: null,
      end_time: null,
      exit_time: null,
      scheduled_entry_time: finalScheduledEntry,
      scheduled_end_time: finalScheduledEnd
    };

    setTrucks(prev => [tempTruck, ...prev]);
    setShowAddModal(false);

    try {
      const { error } = await supabase.from('yard_operations').insert([
        {
          driver_id: finalDriverId,
          driver: finalDriverName,
          rut: driverRut.trim(),
          phone: driverPhone.trim(),
          tractor_plate: finalTractor,
          trailer_plate: finalTrailer || null,
          carrier: carrierVal,
          type: operationType,
          status: targetStatus,
          entry_time: finalEntryTime,
          dock_id: finalDockId,
          scheduled_entry_time: finalScheduledEntry,
          scheduled_end_time: finalScheduledEnd
        }
      ]);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error('Error ingresando camión:', err);
      setErrorMsg('No se pudo registrar la operación en la base de datos.');
      setTrucks(prev => prev.filter(t => t.id !== tempId));
    }

    setSelectedDriverId('');
    setManualDriverName('');
    setDriverRut('');
    setDriverPhone('');
    setSelectedTractorId('');
    setManualTractorPlate('');
    setIsManualTractor(false);
    setSelectedTrailerId('');
    setManualTrailerPlate('');
    setIsManualTrailer(false);
    setCargoType('Refrigerado');
    setCustomCargoType('');
    setIsCitaEntry(false);
    setCitaDate(new Date().toISOString().split('T')[0]);
    setCitaTime('09:00');
    setSelectedDockIdInModal('');
    setScheduledEntryTime('');
    setScheduledEndTime('');
    setDurationMinutes(15);
  };

  // Mover camión de Cita a Patio (Espera)
  const handleMoveToYard = async (truckId: string) => {
    setErrorMsg(null);
    const nowISO = new Date().toISOString();

    // UI Optimista
    setTrucks(prev => prev.map(t => {
      if (t.id === truckId) {
        return { 
          ...t, 
          status: 'espera' as const,
          entry_time: nowISO 
        };
      }
      return t;
    }));

    try {
      const { error } = await supabase
        .from('yard_operations')
        .update({
          status: 'espera',
          entry_time: nowISO
        })
        .eq('id', truckId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error('Error al registrar entrada a patio:', err);
      setErrorMsg('Error al registrar el ingreso físico del camión al patio.');
      fetchData();
    }
  };

  // Revertir estado del transporte (mover hacia atrás)
  const handleRevertStatus = async (truck: YardOperation) => {
    setErrorMsg(null);
    const currentStatus = truck.status;
    let updateData: any = {};
    let dockToFree: string | null = null;
    let dockToOccupy: string | null = null;

    if (currentStatus === 'espera') {
      updateData = { status: 'cita' };
    } else if (currentStatus === 'anden') {
      updateData = { 
        status: 'espera',
        dock_id: null,
        start_time: null
      };
      if (truck.dock_id) {
        dockToFree = truck.dock_id;
      }
    } else if (currentStatus === 'completado') {
      // Si el andén original sigue libre, podemos volver a 'anden', sino a 'espera'
      let canReturnToDock = false;
      if (truck.dock_id) {
        const d = docks.find(dk => dk.id === truck.dock_id);
        if (d && d.status === 'Disponible') {
          canReturnToDock = true;
        }
      }

      if (canReturnToDock && truck.dock_id) {
        updateData = {
          status: 'anden',
          end_time: null,
          exit_time: null
        };
        dockToOccupy = truck.dock_id;
      } else {
        updateData = {
          status: 'espera',
          dock_id: null,
          start_time: null,
          end_time: null,
          exit_time: null
        };
      }
    } else {
      return; // Citas no se pueden retroceder más
    }

    // UI Optimista
    setTrucks(prev => prev.map(t => {
      if (t.id === truck.id) {
        return {
          ...t,
          ...updateData
        };
      }
      return t;
    }));

    if (dockToFree) {
      setDocks(prev => prev.map(d => d.id === dockToFree ? { ...d, status: 'Disponible' } : d));
    }
    if (dockToOccupy) {
      setDocks(prev => prev.map(d => d.id === dockToOccupy ? { ...d, status: 'Ocupado' } : d));
    }

    try {
      const { error: opError } = await supabase
        .from('yard_operations')
        .update(updateData)
        .eq('id', truck.id);

      if (opError) throw opError;

      if (dockToFree) {
        const { error: dError } = await supabase.from('docks').update({ status: 'Disponible' }).eq('id', dockToFree);
        if (dError) throw dError;
      }
      if (dockToOccupy) {
        const { error: dError } = await supabase.from('docks').update({ status: 'Ocupado' }).eq('id', dockToOccupy);
        if (dError) throw dError;
      }

      fetchData();
    } catch (err: any) {
      console.error('Error al revertir estado:', err);
      setErrorMsg('Error al revertir el estado del transporte.');
      fetchData();
    }
  };

  // Eliminar ticket
  const handleDeleteTruck = async (truckId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este ticket de transporte?')) {
      return;
    }

    setErrorMsg(null);
    const truck = trucks.find(t => t.id === truckId);
    if (!truck) return;

    // UI Optimista
    setTrucks(prev => prev.filter(t => t.id !== truckId));
    if (truck.status === 'anden' && truck.dock_id) {
      setDocks(prev => prev.map(d => d.id === truck.dock_id ? { ...d, status: 'Disponible' } : d));
    }

    try {
      const { error: opError } = await supabase
        .from('yard_operations')
        .delete()
        .eq('id', truckId);

      if (opError) throw opError;

      if (truck.status === 'anden' && truck.dock_id) {
        const { error: dError } = await supabase.from('docks').update({ status: 'Disponible' }).eq('id', truck.dock_id);
        if (dError) throw dError;
      }

      fetchData();
    } catch (err: any) {
      console.error('Error al eliminar camión:', err);
      setErrorMsg('Error al eliminar el registro de transporte.');
      fetchData();
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, truckId: string, sourceStatus: string) => {
    e.dataTransfer.setData('truckId', truckId);
    e.dataTransfer.setData('sourceStatus', sourceStatus);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'cita' | 'espera' | 'anden' | 'completado') => {
    e.preventDefault();
    const truckId = e.dataTransfer.getData('truckId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus');

    if (!truckId || sourceStatus === targetStatus) return;

    const truck = trucks.find(t => t.id === truckId);
    if (!truck) return;

    // Regresar hacia atrás si arrastran en sentido contrario
    if (
      (sourceStatus === 'espera' && targetStatus === 'cita') ||
      (sourceStatus === 'anden' && targetStatus === 'espera') ||
      (sourceStatus === 'completado' && (targetStatus === 'anden' || targetStatus === 'espera'))
    ) {
      handleRevertStatus(truck);
      return;
    }

    // Avanzar hacia adelante
    if (sourceStatus === 'cita' && targetStatus === 'espera') {
      handleMoveToYard(truckId);
    } else if (sourceStatus === 'espera' && targetStatus === 'anden') {
      setDraggedTruckForDock(truck);
      const availableDocks = docks.filter(d => d.status === 'Disponible');
      if (availableDocks.length === 0) {
        setErrorMsg('No hay andenes disponibles en este momento.');
        return;
      }
      setSelectedDockIdForDrag(availableDocks[0].id);
      setShowDockSelectModal(true);
    } else if (sourceStatus === 'anden' && targetStatus === 'completado') {
      handleFinishOperation(truckId, truck.dock_id);
    }
  };

  const handleConfirmDockSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draggedTruckForDock || !selectedDockIdForDrag) return;

    const truckId = draggedTruckForDock.id;
    const dockId = selectedDockIdForDrag;

    setShowDockSelectModal(false);
    setDraggedTruckForDock(null);
    setSelectedDockIdForDrag('');

    await handleCallToDock(truckId, dockId);
  };

  const handleCallToDock = async (truckId: string, dockId: string) => {
    setErrorMsg(null);
    const selectedDock = docks.find(d => d.id === dockId);
    if (!selectedDock) return;

    setTrucks(prev => prev.map(t => {
      if (t.id === truckId) {
        return { 
          ...t, 
          status: 'anden' as const, 
          dock_id: dockId, 
          dock: { name: selectedDock.name },
          start_time: new Date().toISOString()
        };
      }
      return t;
    }));

    setDocks(prev => prev.map(d => {
      if (d.id === dockId) {
        return { ...d, status: 'Ocupado' as const };
      }
      return d;
    }));

    try {
      const { error: opError } = await supabase
        .from('yard_operations')
        .update({
          status: 'anden',
          dock_id: dockId,
          start_time: new Date().toISOString()
        })
        .eq('id', truckId);

      if (opError) throw opError;

      const { error: dockError } = await supabase
        .from('docks')
        .update({ status: 'Ocupado' })
        .eq('id', dockId);

      if (dockError) throw dockError;

      fetchData();
    } catch (err: any) {
      console.error('Error al llamar al andén:', err);
      setErrorMsg('Error al asignar el andén en el servidor.');
      fetchData();
    }
  };

  const handleFinishOperation = async (truckId: string, dockId: string | null) => {
    setErrorMsg(null);

    setTrucks(prev => prev.map(t => {
      if (t.id === truckId) {
        return { 
          ...t, 
          status: 'completado' as const,
          end_time: new Date().toISOString(),
          exit_time: new Date().toISOString()
        };
      }
      return t;
    }));

    if (dockId) {
      setDocks(prev => prev.map(d => {
        if (d.id === dockId) {
          return { ...d, status: 'Disponible' as const };
        }
        return d;
      }));
    }

    try {
      const { error: opError } = await supabase
        .from('yard_operations')
        .update({
          status: 'completado',
          end_time: new Date().toISOString(),
          exit_time: new Date().toISOString()
        })
        .eq('id', truckId);

      if (opError) throw opError;

      if (dockId) {
        const { error: dockError } = await supabase
          .from('docks')
          .update({ status: 'Disponible' })
          .eq('id', dockId);

        if (dockError) throw dockError;
      }

      fetchData();
    } catch (err: any) {
      console.error('Error al finalizar operación:', err);
      setErrorMsg('Error al finalizar la operación en el servidor.');
      fetchData();
    }
  };

  const filteredTrucks = trucks.filter(truck => 
    truck.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (truck.tractor_plate && truck.tractor_plate.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (truck.trailer_plate && truck.trailer_plate.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (truck.carrier && truck.carrier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatHeaderDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const dateStr = date.toLocaleDateString('es-CL', options);
    const timeStr = date.toLocaleTimeString('es-CL');
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    return `${formattedDate} (${timeStr})`;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getOperationsForSlot = (dockId: string, hour: number, date: Date) => {
    return trucks.filter(truck => {
      if (truck.dock_id !== dockId) return false;

      let opDateStr = truck.start_time || truck.entry_time;
      if (!opDateStr) return false;
      const opDate = new Date(opDateStr);

      if (!isSameDay(opDate, date)) return false;

      const startHour = opDate.getHours();
      let endHour = startHour;

      if (truck.status === 'anden') {
        const now = new Date();
        if (isSameDay(now, date)) {
          endHour = Math.max(startHour, now.getHours());
        }
      } else if (truck.status === 'completado') {
        if (truck.end_time) {
          endHour = new Date(truck.end_time).getHours();
        }
      }

      return hour >= startHour && hour <= endHour;
    });
  };

  const handlePrevDay = () => {
    setSelectedScheduleDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedScheduleDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 1);
      return next;
    });
  };

  const handleSetToday = () => {
    setSelectedScheduleDate(new Date());
  };

  const getCountdown = (truck: YardOperation) => {
    if (!truck.start_time) return { text: '--:--:--', isOvertime: false };
    
    const startTime = new Date(truck.start_time).getTime();
    
    // Duración permitida (programada) en milisegundos
    let durationMs = PERMITTED_OPERATION_TIME_MS; // 15 min estándar por defecto
    if (truck.scheduled_entry_time && truck.scheduled_end_time) {
      const schStart = new Date(truck.scheduled_entry_time).getTime();
      const schEnd = new Date(truck.scheduled_end_time).getTime();
      const diff = schEnd - schStart;
      if (diff > 0) {
        durationMs = diff;
      }
    }

    const limitTime = startTime + durationMs;
    const diff = limitTime - currentTime.getTime();
    
    const isOvertime = diff < 0;
    const absDiff = Math.abs(diff);
    
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatted = `${isOvertime ? '-' : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    
    return { text: formatted, isOvertime };
  };

  const checkExitCompliance = (truck: YardOperation) => {
    if (!truck.start_time || !truck.end_time) return 'Desconocido';
    const start = new Date(truck.start_time).getTime();
    const end = new Date(truck.end_time).getTime();
    const duration = end - start;
    
    let allowedDurationMs = PERMITTED_OPERATION_TIME_MS; // 15 min estándar por defecto
    if (truck.scheduled_entry_time && truck.scheduled_end_time) {
      const schStart = new Date(truck.scheduled_entry_time).getTime();
      const schEnd = new Date(truck.scheduled_end_time).getTime();
      const diff = schEnd - schStart;
      if (diff > 0) {
        allowedDurationMs = diff;
      }
    }
    
    return duration <= allowedDurationMs ? 'A Tiempo' : 'Atrasado';
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex font-sans">
      
      {/* Barra Lateral Izquierda (Sidebar Verde CiAL) */}
      <aside className="w-64 bg-[#0a5c36] text-white flex flex-col shrink-0 shadow-lg select-none">
        
        {/* Logotipo / Cabecera Sidebar con la imagen oficial de CiAL Alimentos */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3 bg-[#08482a]">
          <img 
            src={cialLogo} 
            alt="CiAL Alimentos" 
            className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 shadow-sm" 
          />
          <div>
            <h2 className="text-sm font-extrabold tracking-wider leading-none">Control</h2>
            <span className="text-xs text-emerald-300 font-semibold tracking-wide uppercase">Recepción</span>
          </div>
        </div>

        {/* Links Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('yard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${activeTab === 'yard' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
          >
            <Monitor className="w-5 h-5 shrink-0" />
            Panel de Recepción
          </button>
          
          <button 
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${activeTab === 'scheduler' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
          >
            <Calendar className="w-5 h-5 shrink-0" />
            Agendamiento Andenes
          </button>

          <div className="pt-4 border-t border-white/10 mt-4">
            <span className="px-4 text-[10px] font-bold text-emerald-300/80 uppercase tracking-widest block mb-2">Logs & Historial</span>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'history' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
            >
              <History className="w-4 h-4 shrink-0" />
              Historial Operaciones
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'reports' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              Reportes de Eficiencia
            </button>
          </div>
        </nav>

        {/* Info Conexión + Cerrar Sesión */}
        <div className="p-4 border-t border-white/10 bg-[#08482a] text-[10px] text-emerald-200 font-bold space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Conectado a Supabase</span>
          </div>
          <div className="text-emerald-300/70 truncate">Nexus Staging: Main</div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 w-full mt-1 text-red-300 hover:text-red-200 hover:bg-red-900/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-3 h-3 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Area Derecha */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        
        {/* Cabecera Unificada (Optimización de Eje Y) */}
        <header className="bg-white border-b border-slate-200 px-6 py-2 flex flex-row items-center justify-between gap-4 shadow-sm select-none shrink-0 min-h-[56px]">
          
          {/* Logo/Título de la página y Reloj (Izquierda) */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">
                Monitoreo Activo de Patio
              </h1>
              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none">
                Vista Monitor
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-1 leading-none">
              <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{formatHeaderDate(currentTime)}</span>
            </div>
          </div>

          {/* Grupo de Control Unificado (Derecha) */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Buscador Integrado */}
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar chofer, tractor, rampla, transportista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36] transition-all"
              />
            </div>

            {/* Botón de Refrescar */}
            <button 
              onClick={fetchData}
              title="Refrescar datos"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer active:scale-95 shadow-sm flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Botón de Registrar Ingreso */}
            <button 
              onClick={handleOpenAddModal}
              className="flex items-center gap-1 bg-[#0a5c36] hover:bg-[#08482a] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Ingresar Camión / Cita
            </button>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 p-6 space-y-6">
          
          {/* Banner de error */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700 text-sm shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error del Servidor:</span> {errorMsg}
              </div>
            </div>
          )}

          {/* Kanban / Contenedor principal */}
          {loading && trucks.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <RefreshCw className="w-10 h-10 text-[#0a5c36] animate-spin mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Cargando datos de patio...</p>
            </div>
          ) : activeTab === 'yard' ? (
            
            /* Pestaña: Kanban Board para Monitor de 4 columnas */
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* 1. Columna: Citas para Hoy */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'cita')}
                className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Citas para Hoy</h3>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                    {filteredTrucks.filter(t => t.status === 'cita').length}
                  </span>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {filteredTrucks.filter(t => t.status === 'cita')
                    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())
                    .map(truck => (
                    <div 
                      key={truck.id} 
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, truck.id, truck.status)}
                      className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing hover:shadow-md"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-extrabold tracking-wider">
                            TR: {truck.tractor_plate || 'S/T'}
                          </span>
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wider">
                            R: {truck.trailer_plate || 'S/R'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTruck(truck.id);
                            }}
                            title="Eliminar cita"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${truck.type === 'Carga' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                            {truck.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1.5 text-slate-600 font-medium pt-1 border-t border-slate-50">
                        <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-700">{truck.driver}</span></p>
                        <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                        <p className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-500">Carga:</span> <span className="text-slate-700 font-semibold">{truck.carrier}</span></p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" /> 
                          <span>Programado: {new Date(truck.entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        {truck.scheduled_entry_time && truck.scheduled_end_time && (
                          <p className="text-[10px] text-[#0a5c36] font-bold pl-6">
                            Citación: {new Date(truck.scheduled_entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(truck.scheduled_end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => handleMoveToYard(truck.id)}
                          className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-[#0a5c36] text-[#0a5c36] hover:text-white border border-[#0a5c36]/20 text-xs py-2.5 rounded-xl font-bold w-full transition-colors active:scale-98 cursor-pointer shadow-sm"
                        >
                          Registrar Entrada Patio
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredTrucks.filter(t => t.status === 'cita').length === 0 && (
                    <div className="text-center py-16 text-slate-400 text-sm font-semibold">No hay citas programadas</div>
                  )}
                </div>
              </div>
              
              {/* 2. Columna: Espera en Patio */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'espera')}
                className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Espera en Patio</h3>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                    {filteredTrucks.filter(t => t.status === 'espera').length}
                  </span>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {filteredTrucks.filter(t => t.status === 'espera')
                    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())
                    .map(truck => (
                    <div 
                      key={truck.id} 
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, truck.id, truck.status)}
                      className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing hover:shadow-md"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-extrabold tracking-wider">
                            TR: {truck.tractor_plate || 'S/T'}
                          </span>
                          <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wider">
                            R: {truck.trailer_plate || 'S/R'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevertStatus(truck);
                            }}
                            title="Regresar a Citas"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTruck(truck.id);
                            }}
                            title="Eliminar registro"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${truck.type === 'Carga' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                            {truck.type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1.5 text-slate-600 font-medium pt-1 border-t border-slate-50">
                        <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-700">{truck.driver}</span></p>
                        <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                        <p className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-500">Carga:</span> <span className="text-slate-700 font-semibold">{truck.carrier}</span></p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" /> 
                          <span>Ingresó: {new Date(truck.entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        {truck.scheduled_entry_time && truck.scheduled_end_time && (
                          <p className="text-[10px] text-[#0a5c36] font-bold pl-6">
                            Citación: {new Date(truck.scheduled_entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(truck.scheduled_end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex gap-2">
                        <select 
                          onChange={(e) => handleCallToDock(truck.id, e.target.value)}
                          defaultValue=""
                          className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2.5 flex-1 text-slate-700 font-bold focus:outline-none focus:border-[#0a5c36] transition-colors cursor-pointer"
                        >
                          <option value="" disabled>Asignar Andén...</option>
                          {docks.filter(d => d.status === 'Disponible').map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {filteredTrucks.filter(t => t.status === 'espera').length === 0 && (
                    <div className="text-center py-16 text-slate-400 text-sm font-semibold">Sin camiones en espera</div>
                  )}
                </div>
              </div>

              {/* 3. Columna: En Andén */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'anden')}
                className="bg-slate-100 border border-slate-200 rounded-2xl p-5 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">En Andén (Cargando)</h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                    {filteredTrucks.filter(t => t.status === 'anden').length}
                  </span>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {filteredTrucks.filter(t => t.status === 'anden')
                    .sort((a, b) => {
                      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
                      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
                      return timeA - timeB;
                    })
                    .map(truck => {
                    const countdown = getCountdown(truck);
                    return (
                      <div 
                        key={truck.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, truck.id, truck.status)}
                        className="bg-white border-2 border-emerald-100 p-5 rounded-2xl space-y-4 shadow-sm hover:border-emerald-200 transition-all cursor-grab active:cursor-grabbing hover:shadow-md relative overflow-hidden"
                      >
                        
                        <div className={`absolute top-0 right-0 left-0 h-1.5 ${countdown.isOvertime ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>

                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="font-mono text-xs bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-emerald-700 font-extrabold tracking-wider">
                              TR: {truck.tractor_plate || 'S/T'}
                            </span>
                            <span className="font-mono text-xs bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wider">
                              R: {truck.trailer_plate || 'S/R'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevertStatus(truck);
                              }}
                              title="Regresar a Espera"
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTruck(truck.id);
                              }}
                              title="Eliminar registro"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="bg-[#0a5c36] text-white text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                              <MapPin className="w-3 h-3" /> {truck.dock?.name || 'Andén'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Temporizador Regresivo Gigante */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center space-y-1 shadow-inner">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Tiempo Restante</span>
                          <span className={`text-2xl font-extrabold tracking-widest font-mono ${countdown.isOvertime ? 'text-red-600 animate-pulse' : 'text-emerald-700 font-bold'}`}>
                            {countdown.text}
                          </span>
                        </div>

                        <div className="text-xs space-y-1.5 text-slate-600 font-medium">
                          <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> <span className="font-bold text-slate-700">{truck.driver}</span></p>
                          <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                          <p className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-500">Carga:</span> <span className="text-slate-700 font-semibold">{truck.carrier}</span></p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" /> 
                          <span>Asignado: {truck.start_time ? new Date(truck.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                        </p>
                        {truck.scheduled_entry_time && truck.scheduled_end_time && (
                          <p className="text-[10px] text-[#0a5c36] font-bold pl-6">
                            Citación: {new Date(truck.scheduled_entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(truck.scheduled_end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        </div>
                        
                        <div className="pt-2 flex gap-2">
                          <button 
                            onClick={() => handleFinishOperation(truck.id, truck.dock_id)}
                            className="flex items-center justify-center gap-2 bg-[#0a5c36] hover:bg-[#08482a] text-white text-xs py-3 rounded-xl font-bold w-full transition-colors active:scale-98 cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Finalizar y Despachar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredTrucks.filter(t => t.status === 'anden').length === 0 && (
                    <div className="text-center py-16 text-slate-400 text-sm font-semibold">Sin camiones operando</div>
                  )}
                </div>
              </div>

              {/* 4. Columna: Recibidos Hoy */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'completado')}
                className="bg-slate-100 border border-slate-200 rounded-2xl p-5 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                    <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Recibidos Hoy</h3>
                  </div>
                  <span className="bg-slate-200 text-slate-700 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                    {filteredTrucks.filter(t => t.status === 'completado').length}
                  </span>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {filteredTrucks.filter(t => t.status === 'completado')
                    .sort((a, b) => {
                      const timeA = a.exit_time ? new Date(a.exit_time).getTime() : 0;
                      const timeB = b.exit_time ? new Date(b.exit_time).getTime() : 0;
                      return timeB - timeA;
                    })
                    .map(truck => {
                    const compliance = checkExitCompliance(truck);
                    return (
                      <div 
                        key={truck.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, truck.id, truck.status)}
                        className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-sm hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing hover:shadow-md opacity-80 hover:opacity-100"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="font-mono text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-500 font-bold tracking-wider">
                              TR: {truck.tractor_plate || 'S/T'}
                            </span>
                            <span className="font-mono text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-400 font-bold tracking-wider">
                              R: {truck.trailer_plate || 'S/R'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevertStatus(truck);
                              }}
                              title="Regresar a Andén"
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTruck(truck.id);
                              }}
                              title="Eliminar registro"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${compliance === 'A Tiempo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {compliance}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-slate-500 font-semibold space-y-1 pt-1 border-t border-slate-50">
                          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Andén: {truck.dock?.name || 'S/A'}</p>
                          <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Chofer: {truck.driver}</p>
                          <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Duración: {
                            truck.start_time && truck.end_time 
                              ? `${Math.round((new Date(truck.end_time).getTime() - new Date(truck.start_time).getTime()) / (1000 * 60))} min`
                              : 'N/A'
                          }</p>
                          {truck.scheduled_entry_time && truck.scheduled_end_time && (
                            <p className="text-[10px] text-[#0a5c36] font-bold pl-5">
                              Citación: {new Date(truck.scheduled_entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(truck.scheduled_end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredTrucks.filter(t => t.status === 'completado').length === 0 && (
                    <div className="text-center py-16 text-slate-400 text-sm font-semibold">Sin despachos hoy</div>
                  )}
                </div>
              </div>

            </section>
          ) : activeTab === 'scheduler' ? (
            
            /* Pestaña: Agendamiento Andenes (Matriz Horaria) */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              
              {/* Barra de Controles Superiores */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-slate-900">Planificador Horario de Andenes</h3>
                  <p className="text-xs text-slate-500 font-semibold">Visualización y reservas diarias de ocupación física</p>
                </div>
                
                {/* Control de Navegación de Fecha */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm">
                  <button 
                    type="button"
                    onClick={handlePrevDay}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors font-bold text-sm cursor-pointer"
                  >
                    &larr; Anterior
                  </button>
                  <input 
                    type="date"
                    value={selectedScheduleDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedScheduleDate(new Date(e.target.value + 'T12:00:00'));
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                  />
                  <button 
                    type="button"
                    onClick={handleNextDay}
                    className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors font-bold text-sm cursor-pointer"
                  >
                    Siguiente &rarr;
                  </button>
                  <button 
                    type="button"
                    onClick={handleSetToday}
                    className="px-3 py-1.5 bg-[#0a5c36] text-white hover:bg-[#08482a] rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ml-1"
                  >
                    Hoy
                  </button>
                </div>

                {/* Leyenda de Estados */}
                <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></span> Citas</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300"></span> En Andén</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-350 bg-slate-200"></span> Recibidos</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200"></span> Mantenimiento</span>
                </div>
              </div>

              {/* Matriz / Grid de Horas y Andenes */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full min-w-[800px] border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-extrabold border-b border-slate-200">
                      <th className="w-24 p-3 border-r border-slate-200 text-center uppercase tracking-wider font-extrabold bg-slate-100">Hora</th>
                      {docks.map(dock => (
                        <th key={dock.id} className="p-3 border-r border-slate-200 last:border-r-0 text-center uppercase tracking-wider">
                          <div className="flex flex-col items-center gap-1">
                            <span>{dock.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm ${
                              dock.status === 'Disponible' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : dock.status === 'Ocupado' 
                                ? 'bg-teal-50 text-teal-700 border border-teal-100 animate-pulse' 
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {dock.status}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody>
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(hour => {
                      const timeString = `${hour.toString().padStart(2, '0')}:00`;
                      return (
                        <tr key={hour} className="border-b border-slate-200 hover:bg-slate-50/30 transition-colors last:border-b-0">
                          {/* Columna Hora */}
                          <td className="p-3 border-r border-slate-200 bg-slate-50/50 text-center text-xs font-bold text-slate-600 font-mono select-none">
                            {timeString}
                          </td>
                          
                          {/* Columnas Andenes */}
                          {docks.map(dock => {
                            const isMaintenance = dock.status === 'Mantenimiento';
                            const ops = getOperationsForSlot(dock.id, hour, selectedScheduleDate);
                            
                            if (isMaintenance) {
                              return (
                                <td 
                                  key={dock.id} 
                                  className="p-2 border-r border-slate-200 last:border-r-0 bg-red-50/40 text-center text-[10px] text-red-400 font-bold select-none"
                                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.05) 10px, rgba(239, 68, 68, 0.05) 20px)' }}
                                >
                                  Mantenimiento
                                </td>
                              );
                            }
                            
                            return (
                              <td 
                                key={dock.id} 
                                className="p-2 border-r border-slate-200 last:border-r-0 align-middle relative group min-h-[60px]"
                              >
                                {ops.length > 0 ? (
                                  <div className="space-y-1">
                                    {ops.map(op => {
                                      const isCita = op.status === 'cita';
                                      const isAnden = op.status === 'anden';
                                      const isCompletado = op.status === 'completado';
                                      
                                      let bgColor = 'bg-slate-50 text-slate-700 border-slate-200';
                                      if (isCita) bgColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                                      if (isAnden) bgColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-2 ring-emerald-500/20';
                                      if (isCompletado) bgColor = 'bg-slate-100 text-slate-600 border-slate-200 opacity-85';

                                      return (
                                        <div 
                                          key={op.id}
                                          className={`p-2 rounded-xl border text-[10px] space-y-1 shadow-sm leading-tight transition-all hover:shadow-md ${bgColor}`}
                                        >
                                          <div className="flex justify-between items-center gap-1">
                                            <span className="font-extrabold tracking-wider bg-white/50 px-1 rounded font-mono text-[9px] border border-slate-200/50">
                                              {op.tractor_plate || 'S/T'}
                                            </span>
                                            <div className="flex items-center gap-0.5">
                                              {op.status !== 'cita' && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRevertStatus(op);
                                                  }}
                                                  title="Revertir estado"
                                                  className="p-0.5 text-slate-400 hover:text-emerald-600 rounded"
                                                >
                                                  <RotateCcw className="w-2.5 h-2.5" />
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteTruck(op.id);
                                                }}
                                                title="Eliminar ticket"
                                                className="p-0.5 text-slate-400 hover:text-red-600 rounded"
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <p className="font-bold truncate text-slate-800">{op.driver}</p>
                                          <p className="text-[9px] text-slate-400 truncate">Carga: {op.carrier} • {op.type}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* Celda Vacía - Hover Agendar Cita */
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/50">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCitaEntry(true);
                                        const dateStr = selectedScheduleDate.toISOString().split('T')[0];
                                        setCitaDate(dateStr);
                                        setCitaTime(timeString);
                                        setSelectedDockIdInModal(dock.id);
                                        
                                        // Configurar horas programadas iniciales para la cita
                                        const entryDt = new Date(`${dateStr}T${timeString}:00`);
                                        setScheduledEntryTime(formatLocalDatetime(entryDt));
                                        setScheduledEndTime(formatLocalDatetime(new Date(entryDt.getTime() + 15 * 60 * 1000)));
                                        setDurationMinutes(15);
                                        
                                        setShowAddModal(true);
                                      }}
                                      className="flex items-center gap-1 bg-[#0a5c36] hover:bg-[#08482a] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Reservar
                                    </button>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'history' ? (

            /* ====================================================
               PESTAÑA: HISTORIAL DE OPERACIONES
               ==================================================== */
            <section className="space-y-5">
              {/* Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Historial de Operaciones</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Registro completo de camiones ingresados, en andén y despachados</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                  <History className="w-4 h-4 text-[#0a5c36]" />
                  {trucks.length} registros totales
                </div>
              </div>

              {/* Barra de Filtros */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar chofer, patente, empresa..."
                    value={historySearch}
                    onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:ring-1 focus:ring-[#0a5c36]"
                  />
                </div>
                <select
                  value={historyStatus}
                  onChange={e => { setHistoryStatus(e.target.value); setHistoryPage(1); }}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#0a5c36] cursor-pointer"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="cita">Cita</option>
                  <option value="en_patio">En Patio</option>
                  <option value="en_anden">En Andén</option>
                  <option value="completado">Completado</option>
                </select>
                <select
                  value={historyOpType}
                  onChange={e => { setHistoryOpType(e.target.value); setHistoryPage(1); }}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#0a5c36] cursor-pointer"
                >
                  <option value="todos">Toda operación</option>
                  <option value="Carga">Carga</option>
                  <option value="Descarga">Descarga</option>
                </select>
                <select
                  value={historyCargoType}
                  onChange={e => { setHistoryCargoType(e.target.value); setHistoryPage(1); }}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-[#0a5c36] cursor-pointer"
                >
                  <option value="todos">Todo tipo carga</option>
                  <option value="Semi Elaborado">Semi Elaborado</option>
                  <option value="Congelado">Congelado</option>
                  <option value="Refrigerado">Refrigerado</option>
                  <option value="Otro">Otro</option>
                </select>
                {(historySearch || historyStatus !== 'todos' || historyOpType !== 'todos' || historyCargoType !== 'todos') && (
                  <button
                    onClick={() => { setHistorySearch(''); setHistoryStatus('todos'); setHistoryOpType('todos'); setHistoryCargoType('todos'); setHistoryPage(1); }}
                    className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl px-3 py-2 transition-all cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Tabla */}
              {(() => {
                const filtered = trucks.filter(t => {
                  const searchLower = historySearch.toLowerCase();
                  const matchSearch = !historySearch || [t.driver, t.tractor_plate, t.trailer_plate, t.company].some(f => f?.toLowerCase().includes(searchLower));
                  const matchStatus = historyStatus === 'todos' || t.status === historyStatus;
                  const matchOp = historyOpType === 'todos' || t.type === historyOpType;
                  const matchCargo = historyCargoType === 'todos' || t.cargo_type === historyCargoType;
                  return matchSearch && matchStatus && matchOp && matchCargo;
                }).sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());

                const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
                const paginated = filtered.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

                const statusBadge = (s: string) => {
                  const map: Record<string, string> = {
                    cita: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    en_patio: 'bg-blue-100 text-blue-800 border-blue-200',
                    en_anden: 'bg-purple-100 text-purple-800 border-purple-200',
                    completado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  };
                  const label: Record<string, string> = { cita: 'Cita', en_patio: 'En Patio', en_anden: 'En Andén', completado: 'Completado' };
                  return <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wide border px-2 py-0.5 rounded-full ${map[s] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{label[s] || s}</span>;
                };

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                            <th className="px-4 py-3 text-left">Chofer / Empresa</th>
                            <th className="px-4 py-3 text-left">Tractor</th>
                            <th className="px-4 py-3 text-left">Rampla</th>
                            <th className="px-4 py-3 text-left">Operación</th>
                            <th className="px-4 py-3 text-left">Carga</th>
                            <th className="px-4 py-3 text-left">Andén</th>
                            <th className="px-4 py-3 text-left">Estado</th>
                            <th className="px-4 py-3 text-left">Ingreso</th>
                            <th className="px-4 py-3 text-left">Cita / Término</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginated.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="text-center py-16 text-slate-400 font-semibold">Sin registros para los filtros seleccionados</td>
                            </tr>
                          ) : paginated.map(t => {
                            const dockName = docks.find(d => d.id === t.dock_id)?.name || '—';
                            const entryDate = new Date(t.entry_time);
                            const appointmentDate = t.appointment_time ? new Date(t.appointment_time) : null;
                            const endDate = t.end_time ? new Date(t.end_time) : null;
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-800">{t.driver}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{t.company || '—'}</p>
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-700">{t.tractor_plate || '—'}</td>
                                <td className="px-4 py-3 font-mono text-slate-500">{t.trailer_plate || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.type === 'Descarga' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-semibold">{t.cargo_type || '—'}</td>
                                <td className="px-4 py-3 text-slate-600 font-semibold">{dockName}</td>
                                <td className="px-4 py-3">{statusBadge(t.status)}</td>
                                <td className="px-4 py-3 text-slate-500 font-mono">
                                  {entryDate.toLocaleDateString('es-CL', {day:'2-digit',month:'2-digit'})} {entryDate.toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'})}
                                </td>
                                <td className="px-4 py-3 text-slate-500 font-mono">
                                  {appointmentDate ? (
                                    <span className="text-blue-600">{appointmentDate.toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'})}</span>
                                  ) : '—'}
                                  {endDate && <span className="text-slate-400"> → {endDate.toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'})}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-500 font-semibold">
                          Mostrando {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, filtered.length)} de {filtered.length}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer disabled:cursor-default">← Ant</button>
                          {Array.from({length: totalPages}, (_, i) => i + 1).map(n => (
                            <button key={n} onClick={() => setHistoryPage(n)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${n === historyPage ? 'bg-[#0a5c36] text-white border-[#0a5c36]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                          ))}
                          <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition-all cursor-pointer disabled:cursor-default">Sig →</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>

          ) : (

            /* ====================================================
               PESTAÑA: REPORTES DE EFICIENCIA
               ==================================================== */
            (() => {
              const total = trucks.length;
              const completados = trucks.filter(t => t.status === 'completado');
              const enAndenes = trucks.filter(t => t.status === 'en_anden');
              const enPatio   = trucks.filter(t => t.status === 'en_patio');
              const citasHoy  = trucks.filter(t => t.status === 'cita');

              // Tiempo promedio en andén (minutos)
              const tiemposAnden = completados
                .filter(t => t.end_time && t.appointment_time)
                .map(t => (new Date(t.end_time!).getTime() - new Date(t.appointment_time!).getTime()) / 60000);
              const avgAnden = tiemposAnden.length > 0
                ? Math.round(tiemposAnden.reduce((a, b) => a + b, 0) / tiemposAnden.length)
                : null;

              const cargas    = trucks.filter(t => t.type === 'Carga').length;
              const descargas = trucks.filter(t => t.type === 'Descarga').length;

              const cargaDist: Record<string, number> = {};
              trucks.forEach(t => { const k = t.cargo_type || 'Sin definir'; cargaDist[k] = (cargaDist[k] || 0) + 1; });

              const now = new Date();
              const days7: { label: string; count: number }[] = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i);
                const label = d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
                const count = trucks.filter(t => {
                  const td = new Date(t.entry_time);
                  return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
                }).length;
                days7.push({ label, count });
              }
              const maxDay = Math.max(...days7.map(d => d.count), 1);

              const docksOcupados = docks.filter(d => d.status === 'Ocupado').length;
              const docksPct = docks.length > 0 ? Math.round((docksOcupados / docks.length) * 100) : 0;

              const dockRotation: Record<string, number> = {};
              completados.forEach(t => { if (t.dock_id) { dockRotation[t.dock_id] = (dockRotation[t.dock_id] || 0) + 1; } });
              const topDocks = Object.entries(dockRotation).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <section className="space-y-5">
                  {/* Header */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-xl font-extrabold text-slate-900">Reportes de Eficiencia</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Métricas operativas en tiempo real · Datos del historial completo</p>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Operaciones', value: total, sub: 'en el sistema', icon: <Truck className="w-5 h-5" />, color: 'from-[#0a5c36] to-emerald-600' },
                      { label: 'Completados', value: completados.length, sub: `${total > 0 ? Math.round(completados.length/total*100) : 0}% del total`, icon: <CheckCircle className="w-5 h-5" />, color: 'from-emerald-400 to-teal-500' },
                      { label: 'En Andén Ahora', value: enAndenes.length, sub: `${docksPct}% ocupación andenes`, icon: <Package className="w-5 h-5" />, color: 'from-purple-500 to-violet-600' },
                      { label: 'Tiempo Prom. Andén', value: avgAnden !== null ? `${avgAnden} min` : 'N/A', sub: avgAnden !== null ? (avgAnden <= 15 ? '✓ Dentro del estándar (15 min)' : `⚠ Sobre estándar (+${avgAnden-15} min)`) : 'Sin datos suficientes', icon: <Clock className="w-5 h-5" />, color: avgAnden !== null && avgAnden > 15 ? 'from-orange-400 to-red-500' : 'from-sky-400 to-blue-600' },
                    ].map((kpi, i) => (
                      <div key={i} className={`rounded-2xl bg-gradient-to-br ${kpi.color} p-5 shadow-md flex flex-col gap-2`}>
                        <div className="flex items-center justify-between">
                          <span className="text-white/80 text-[10px] font-extrabold uppercase tracking-wider">{kpi.label}</span>
                          <span className="text-white/70">{kpi.icon}</span>
                        </div>
                        <p className="text-3xl font-extrabold text-white">{kpi.value}</p>
                        <p className="text-[10px] text-white/70 font-semibold">{kpi.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Gráfico barras 7 días + Donut operaciones */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-extrabold text-sm text-slate-800 mb-1">Operaciones por Día</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mb-4">Últimos 7 días</p>
                      <div className="flex items-end gap-2 h-36">
                        {days7.map((d, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-500">{d.count > 0 ? d.count : ''}</span>
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-[#0a5c36] to-emerald-400 transition-all duration-500"
                              style={{ height: `${Math.max(Math.round((d.count / maxDay) * 100), d.count > 0 ? 4 : 1)}%`, opacity: d.count > 0 ? 1 : 0.15 }}
                            />
                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                      <h3 className="font-extrabold text-sm text-slate-800 mb-1">Tipo de Operación</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mb-4">Carga vs Descarga</p>
                      <div className="flex-1 flex flex-col justify-center gap-4">
                        {[
                          { label: 'Descarga', value: descargas, color: 'bg-orange-400' },
                          { label: 'Carga', value: cargas, color: 'bg-emerald-500' },
                        ].map(op => {
                          const pct = total > 0 ? Math.round((op.value / total) * 100) : 0;
                          return (
                            <div key={op.label}>
                              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                                <span>{op.label}</span>
                                <span>{op.value} ({pct}%)</span>
                              </div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${op.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Estado actual + Tipo carga + Top andenes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4">Estado Actual del Patio</h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Citas Pendientes', value: citasHoy.length, dot: 'bg-yellow-400', text: 'text-yellow-700' },
                          { label: 'En Patio', value: enPatio.length, dot: 'bg-blue-400', text: 'text-blue-700' },
                          { label: 'En Andén', value: enAndenes.length, dot: 'bg-purple-400', text: 'text-purple-700' },
                          { label: 'Completados', value: completados.length, dot: 'bg-emerald-400', text: 'text-emerald-700' },
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                              <span className="text-xs font-semibold text-slate-600">{s.label}</span>
                            </div>
                            <span className={`text-sm font-extrabold ${s.text}`}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-500">Andenes Ocupados</span>
                          <span className="font-extrabold text-slate-800">{docksOcupados} / {docks.length}</span>
                        </div>
                        <div className="mt-2 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#0a5c36] to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${docksPct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 text-right">{docksPct}% de ocupación</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4">Tipos de Carga</h3>
                      <div className="space-y-3">
                        {Object.entries(cargaDist).sort((a, b) => b[1] - a[1]).map(([label, count], idx) => {
                          const colors = ['bg-sky-400','bg-violet-400','bg-pink-400','bg-amber-400','bg-teal-400'];
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                <span>{label}</span><span>{count} ({pct}%)</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(cargaDist).length === 0 && <p className="text-xs text-slate-400 font-semibold text-center py-4">Sin datos</p>}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-extrabold text-sm text-slate-800 mb-4">Rotación por Andén</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mb-3">Operaciones completadas acumuladas</p>
                      <div className="space-y-3">
                        {topDocks.length === 0 ? (
                          <p className="text-xs text-slate-400 font-semibold text-center py-4">Sin operaciones completadas</p>
                        ) : topDocks.map(([dockId, count], idx) => {
                          const dockName = docks.find(d => d.id === dockId)?.name || 'Andén';
                          const maxRot = topDocks[0][1];
                          return (
                            <div key={dockId}>
                              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                <span>#{idx+1} {dockName}</span>
                                <span className="text-[#0a5c36] font-extrabold">{count} ops</span>
                              </div>
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#0a5c36] to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${Math.round((count/maxRot)*100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Mapa estado andenes */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-extrabold text-sm text-slate-800 mb-4">Mapa de Estado de Andenes</h3>
                    <div className="flex flex-wrap gap-3">
                      {docks.map(dock => {
                        const activeTruck = trucks.find(t => t.dock_id === dock.id && t.status === 'en_anden');
                        const isOcupado = dock.status === 'Ocupado';
                        return (
                          <div key={dock.id} className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 shadow-sm transition-all ${isOcupado ? 'bg-purple-50 border-purple-300' : 'bg-emerald-50 border-emerald-200'}`}>
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isOcupado ? 'text-purple-600' : 'text-emerald-600'}`}>{dock.name}</span>
                            <span className={`mt-1 text-[9px] font-bold ${isOcupado ? 'text-purple-500' : 'text-emerald-500'}`}>{isOcupado ? '● Ocupado' : '○ Libre'}</span>
                            {activeTruck && <span className="text-[8px] text-purple-400 font-semibold mt-0.5 text-center leading-tight px-1">{activeTruck.tractor_plate}</span>}
                          </div>
                        );
                      })}
                      {docks.length === 0 && <p className="text-xs text-slate-400 font-semibold">Sin andenes configurados</p>}
                    </div>
                  </div>
                </section>
              );
            })()

          )}
        </main>
      </div>

      {/* Modal Agregar Camión */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <form 
            onSubmit={handleAddTruck}
            className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg relative z-10 space-y-4 shadow-xl text-slate-800 max-h-[90vh] overflow-y-auto"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-900">Registrar Transporte</h3>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Portería & Control de Acceso</p>
            </div>
            
            <div className="space-y-4">
              {/* Tipo de Registro (Cita o Ingreso Inmediato) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destino de Registro</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCitaEntry(true);
                      if (citaDate && citaTime) {
                        const entryDt = new Date(`${citaDate}T${citaTime}:00`);
                        setScheduledEntryTime(formatLocalDatetime(entryDt));
                        setScheduledEndTime(formatLocalDatetime(new Date(entryDt.getTime() + durationMinutes * 60 * 1000)));
                      }
                    }}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isCitaEntry ? 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Programar Cita para Hoy
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCitaEntry(false);
                      const now = new Date();
                      setScheduledEntryTime(formatLocalDatetime(now));
                      setScheduledEndTime(formatLocalDatetime(new Date(now.getTime() + durationMinutes * 60 * 1000)));
                    }}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${!isCitaEntry ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Ingreso Inmediato a Patio
                  </button>
                </div>
              </div>

              {isCitaEntry && (
                <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100/50 space-y-3">
                  <span className="text-[10px] font-extrabold text-yellow-800 uppercase tracking-wider block font-bold">Asignación de Andén</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 font-semibold">Andén Preferente / Asignado</label>
                    <select
                      value={selectedDockIdInModal}
                      onChange={(e) => setSelectedDockIdInModal(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs w-full text-slate-700 font-bold focus:outline-none focus:border-[#0a5c36]"
                    >
                      <option value="">Cualquier Andén (Sin asignar)...</option>
                      {docks.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Programación de Tiempos (Citación y Término) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <span className="text-[10px] font-extrabold text-[#0a5c36] uppercase tracking-wider block">Programación de Tiempos</span>
                
                {/* Selector de Duración Rápida */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 font-semibold">Duración de la Operación (Estándar: 15 min)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 25].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleDurationChange(mins)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${durationMinutes === mins ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 font-semibold">Hora de Citación (Llegada)</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledEntryTime}
                      onChange={(e) => handleEntryTimeChange(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs w-full text-slate-700 font-bold focus:outline-none focus:border-[#0a5c36]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 font-semibold">Hora de Término</label>
                    <input 
                      type="datetime-local" 
                      value={scheduledEndTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs w-full text-slate-700 font-bold focus:outline-none focus:border-[#0a5c36]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Conductor Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Conductor</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36]"
                  required
                >
                  <option value="" disabled>Seleccione Conductor...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.rut})</option>
                  ))}
                  <option value="manual">+ Conductor Nuevo / No Listado</option>
                </select>
              </div>

              {selectedDriverId === 'manual' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-[10px] font-extrabold text-[#0a5c36] uppercase tracking-wider">Datos Conductor Nuevo</span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="Nombre chofer"
                      value={manualDriverName}
                      onChange={(e) => setManualDriverName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full focus:outline-none focus:border-[#0a5c36]"
                      required={selectedDriverId === 'manual'}
                    />
                  </div>
                </div>
              )}

              {/* RUT y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">RUT / Identificación</label>
                  <input 
                    type="text" 
                    placeholder="12.345.678-9"
                    value={driverRut}
                    onChange={(e) => setDriverRut(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="56912345678"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36]"
                  />
                </div>
              </div>

              {/* Selector de Tractor */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">TRACTOR / CABINA</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsManualTractor(!isManualTractor);
                      setSelectedTractorId('');
                    }}
                    className="text-[10px] text-[#0a5c36] font-bold hover:underline"
                  >
                    {isManualTractor ? 'Seleccionar de lista' : '+ Ingresar Patente Manual'}
                  </button>
                </div>

                {isManualTractor ? (
                  <input 
                    type="text" 
                    placeholder="Patente Tractor (Ej. GZSG-25)"
                    value={manualTractorPlate}
                    onChange={(e) => setManualTractorPlate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] uppercase"
                    required
                  />
                ) : (
                  <select
                    value={selectedTractorId}
                    onChange={(e) => setSelectedTractorId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                    required
                  >
                    <option value="" disabled>Seleccione Tractor...</option>
                    {vehicles.filter(v => v.type === 'Tractor').map(v => (
                      <option key={v.id} value={v.id}>{v.plate}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selector de Rampla */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">RAMPLA / ACOPLADO</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsManualTrailer(!isManualTrailer);
                      setSelectedTrailerId('');
                    }}
                    className="text-[10px] text-[#0a5c36] font-bold hover:underline"
                  >
                    {isManualTrailer ? 'Seleccionar de lista' : '+ Ingresar Patente Manual'}
                  </button>
                </div>

                {isManualTrailer ? (
                  <input 
                    type="text" 
                    placeholder="Patente Rampla (Ej. PXDJ-41)"
                    value={manualTrailerPlate}
                    onChange={(e) => setManualTrailerPlate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] uppercase"
                  />
                ) : (
                  <select
                    value={selectedTrailerId}
                    onChange={(e) => setSelectedTrailerId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                  >
                    <option value="">Sin Rampla (Solo Tractor)...</option>
                    {vehicles.filter(v => v.type === 'Rampla').map(v => (
                      <option key={v.id} value={v.id}>{v.plate}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tipo de Carga */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Carga</label>
                <select
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-850 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36] cursor-pointer"
                  required
                >
                  <option value="Semi Elaborado">Semi Elaborado</option>
                  <option value="Congelado">Congelado</option>
                  <option value="Refrigerado">Refrigerado</option>
                  <option value="Otro">Otro (Especificar)</option>
                </select>

                {cargoType === 'Otro' && (
                  <input 
                    type="text" 
                    placeholder="Especifique tipo de carga..."
                    value={customCargoType}
                    onChange={(e) => setCustomCargoType(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:ring-1 focus:ring-[#0a5c36] mt-2 animate-fadeIn"
                    required={cargoType === 'Otro'}
                  />
                )}
              </div>

              {/* Tipo Operación */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Operación</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button 
                    type="button"
                    onClick={() => setOperationType('Descarga')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${operationType === 'Descarga' ? 'bg-orange-50 text-orange-700 border-orange-200 font-extrabold shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    Descarga
                  </button>
                  <button 
                    type="button"
                    onClick={() => setOperationType('Carga')}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${operationType === 'Carga' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    Carga
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors cursor-pointer shadow-md shadow-[#0a5c36]/10"
              >
                Confirmar Ingreso
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Asignación de Andén (para Drag and Drop) */}
      {showDockSelectModal && draggedTruckForDock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowDockSelectModal(false); setDraggedTruckForDock(null); }}></div>
          
          <form 
            onSubmit={handleConfirmDockSelect}
            className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md relative z-10 space-y-4 shadow-xl text-slate-800"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-900">Llamar a Andén</h3>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Asignación de Andén Disponible</p>
            </div>
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
              <p><strong className="text-slate-600">Chofer:</strong> {draggedTruckForDock.driver}</p>
              <p><strong className="text-slate-600">Tractor:</strong> {draggedTruckForDock.tractor_plate}</p>
              {draggedTruckForDock.trailer_plate && (
                <p><strong className="text-slate-600">Rampla:</strong> {draggedTruckForDock.trailer_plate}</p>
              )}
              <p><strong className="text-slate-600">Operación:</strong> {draggedTruckForDock.type}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Andén Disponible</label>
              <select
                value={selectedDockIdForDrag}
                onChange={(e) => setSelectedDockIdForDrag(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36]"
                required
              >
                {docks.filter(d => d.status === 'Disponible').map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => { setShowDockSelectModal(false); setDraggedTruckForDock(null); }}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors cursor-pointer shadow-md shadow-[#0a5c36]/10"
              >
                Confirmar Asignación
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
