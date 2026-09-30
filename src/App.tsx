import { useState, useEffect, useRef } from 'react';
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
  LogOut,
  Factory,
  Send,
  Activity,
  Building2,
  MessageSquare,
  Key,
  ChevronUp,
  ChevronDown,
  Thermometer,
  Snowflake,
  SlidersHorizontal,
  UtensilsCrossed,
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  KeyRound,
  LockOpen,
  UserCheck,
  UserX,
  Crown,
  Eye,
  EyeOff,
  Edit2,
  Menu,
  X,
  Radio,
  Printer,
  FileText,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Smartphone
} from 'lucide-react';
import { supabase, supabaseMain, activeSchema } from './lib/supabase';
import cialLogo from './assets/cial-alimentos-logo.png';
import laPreferidaLogo from './assets/la-preferida-logo.png';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  registerServiceWorker,
  getNotificationPermissionState,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
  isSoundEnabled,
  setSoundEnabled,
  sendMobileNotification,
  playNotificationSound,
  isBackgroundPatioModeActive,
  toggleBackgroundPatioMode
} from './utils/notifications';

export const OWNER_EMAILS = ['ariel.mella@cial.cl'];

export const isUserOwner = (email?: string | null): boolean => {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
};

export const formatUserRole = (rawRole?: string | null): string => {
  if (!rawRole) return 'Gestor Inbound';
  const clean = rawRole.trim();
  if (clean === 'Operador Inbound') return 'Gestor Inbound';
  if (clean === 'Operador Planta 2') return 'Gestor Planta 2';
  return clean;
};

export interface AppProps {
  currentUser?: SupabaseUser | null;
}

export type RestrictionType = 'mixto' | 'congelado' | 'refrigerado' | 'bloqueado';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  email_confirmed: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  is_banned: boolean;
  app_metadata: Record<string, any>;
  user_metadata: Record<string, any>;
}

export interface ScheduleRestriction {
  id?: string;
  schedule_date: string; // 'YYYY-MM-DD'
  hour: number;
  dock_id?: string;
  restriction_type: RestrictionType;
  note?: string;
}

export interface ScheduleRecurringRule {
  id?: string;
  day_of_week: number; // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  hour: number;
  dock_id?: string | null;
  restriction_type: RestrictionType;
  note?: string;
  is_active?: boolean;
}

export const INITIAL_RECURRING_RULES: ScheduleRecurringRule[] = [
  // Lunes: 11 y 12 no se recibe ni congelado ni refrigerado (Bloqueado)
  { day_of_week: 1, hour: 11, dock_id: null, restriction_type: 'bloqueado', note: 'No se recibe ni congelado ni refrigerado' },
  { day_of_week: 1, hour: 12, dock_id: null, restriction_type: 'bloqueado', note: 'No se recibe ni congelado ni refrigerado' },
  // Martes: 11 no se recibe congelado (Solo Refrigerado)
  { day_of_week: 2, hour: 11, dock_id: null, restriction_type: 'refrigerado', note: 'Solo refrigerado (No congelado)' },
  // Miércoles: 11 y 12 no se recibe refrigerado (Solo Congelado)
  { day_of_week: 3, hour: 11, dock_id: null, restriction_type: 'congelado', note: 'Solo congelado (No refrigerado)' },
  { day_of_week: 3, hour: 12, dock_id: null, restriction_type: 'congelado', note: 'Solo congelado (No refrigerado)' },
  // Jueves: 11 no se recibe congelado (Solo Refrigerado)
  { day_of_week: 4, hour: 11, dock_id: null, restriction_type: 'refrigerado', note: 'Solo refrigerado (No congelado)' },
  // Viernes: 11 y 12 no se recibe refrigerado (Solo Congelado)
  { day_of_week: 5, hour: 11, dock_id: null, restriction_type: 'congelado', note: 'Solo congelado (No refrigerado)' },
  { day_of_week: 5, hour: 12, dock_id: null, restriction_type: 'congelado', note: 'Solo congelado (No refrigerado)' },
];

interface Dock {
  id: string;
  name: string;
  status: 'Disponible' | 'Ocupado' | 'Mantenimiento';
}

interface Driver {
  id: string;
  name: string;
  rut: string;
  phone: string | null;
  default_tractor: string | null;
  default_trailer: string | null;
}

interface Vehicle {
  id: string;
  plate: string;
  type: 'Tractor' | 'Rampla';
}

export type OperationStatus = 'cita' | 'planta_carga' | 'en_ruta' | 'espera' | 'anden' | 'completado';
export type OperationOrigin = 'planta_2' | 'patio_cd';

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
  status: OperationStatus;
  origin?: OperationOrigin | null;
  dispatch_time?: string | null;
  plant_loading_time?: string | null;
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

export interface CargoDocState {
  anden: string;
  fecha: string;
  driver: string;
  rut: string;
  tractorPlate: string;
  trailerPlate: string;
  destino: string;
  kilos: string;
  docTransporte: string;
  sellos: string;
  entregaNum: string;
  bandejas: string;
  palletMadera: string;
  palletPlasticos: string;
  vuelta: string;
  foliosSap: string;
  foliosLegales: string;
  supervisorName: string;
}

export const formatChileanDate = (dateVal?: Date | string | null): string => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export function ControlDeCargaDocument({ data }: { data: CargoDocState }) {
  return (
    <div className="w-full font-sans text-black bg-white select-none text-[11px] leading-tight">
      {/* 1. Header Oficial: Logo La Preferida, Título Andén y Fecha */}
      <div className="flex items-start justify-between gap-4 mb-2">
        {/* Logo Oficial La Preferida */}
        <div className="flex items-center">
          <img 
            src={laPreferidaLogo} 
            alt="La Preferida" 
            className="h-10 sm:h-11 w-auto object-contain max-w-[130px]"
          />
        </div>

        {/* Título Central y Andén */}
        <div className="flex flex-col items-center">
          <div className="border border-black px-6 py-0.5 font-black text-xs tracking-widest text-center">
            CONTROL DE CARGA
          </div>
          <div className="border border-black border-t-0 px-6 py-0.5 font-black text-[10px] tracking-wider text-center w-full min-h-[18px]">
            ANDEN {data.anden ? `: ${data.anden}` : ''}
          </div>
        </div>

        {/* Fecha DD-MM-YYYY */}
        <div className="border border-black px-4 py-1 font-black text-xs tracking-wider text-center min-w-[105px]">
          {data.fecha || formatChileanDate()}
        </div>
      </div>

      {/* 2. Barra de Ruta Origen -> Destino */}
      <div className="border border-black px-3 py-0.5 font-black text-xs tracking-wider mb-2 bg-white">
        Desde Planta 2 a Planta 1
      </div>

      {/* 3. Tabla Oficial de Control de Carga */}
      <table className="w-full border-collapse border border-black text-[11px]">
        <tbody>
          {/* Fila: Conductor */}
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[10px] w-28 bg-white">
              Conductor
            </td>
            <td colSpan={3} className="border border-black px-3 py-1 font-black text-xs uppercase bg-slate-200">
              {data.driver || '-'}
            </td>
          </tr>

          {/* Fila: RUT */}
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[10px] bg-white">
              Rut
            </td>
            <td colSpan={3} className="border border-black px-3 py-1 font-bold text-xs bg-white">
              {data.rut || '-'}
            </td>
          </tr>

          {/* Fila: Patentes Tracto y Rampla */}
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[10px] bg-white">
              Patente tracto
            </td>
            <td className="border border-black px-3 py-1.5 font-black text-sm font-mono tracking-widest text-center bg-white">
              {data.tractorPlate || '-'}
            </td>
            <td className="border border-black px-2 py-1 font-bold text-[10px] text-center w-28 bg-white">
              PTTE. RAMPLA
            </td>
            <td className="border border-black px-3 py-1.5 font-black text-sm font-mono tracking-widest text-center bg-white">
              {data.trailerPlate || '-'}
            </td>
          </tr>

          {/* Encabezados de Columnas: Kilos, Doc. Transporte, Sellos */}
          <tr className="bg-slate-200">
            <td colSpan={1} className="border border-black bg-white"></td>
            <td className="border border-black px-2 py-0.5 font-bold text-[10px] text-center w-28">
              KILOS
            </td>
            <td className="border border-black px-2 py-0.5 font-bold text-[10px] text-center">
              Doc. Transporte
            </td>
            <td className="border border-black px-2 py-0.5 font-bold text-[10px] text-center w-28">
              Sellos
            </td>
          </tr>

          {/* Destino y Valores Principales */}
          <tr>
            <td className="border border-black p-2 font-black text-xs bg-white align-top">
              <span className="text-[9px] font-bold block uppercase text-slate-700">DESTINO</span>
              {data.destino || 'Centro Distrib.- P1'}
            </td>
            <td className="border border-black px-2 py-2 font-black text-sm text-center bg-white align-middle">
              {data.kilos || ''}
            </td>
            <td className="border border-black px-2 py-2 font-black text-sm text-center bg-white align-middle">
              {data.docTransporte || ''}
            </td>
            <td className="border border-black px-2 py-2 font-black text-sm text-center bg-white align-middle">
              {data.sellos || ''}
            </td>
          </tr>

          {/* Encabezado Detalle (Embalajes) */}
          <tr className="bg-slate-200">
            <td className="border border-black px-2 py-0.5 font-bold text-[10px]">
              DETALLE (EMBALAJES)
            </td>
            <td className="border border-black px-2 py-0.5 font-bold text-[10px] text-center">
              CANTIDAD
            </td>
            <td className="border border-black px-2 py-0.5 bg-white"></td>
            <td className="border border-black px-2 py-0.5 bg-white"></td>
          </tr>

          {/* Fila Entrega */}
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[10px] bg-white">
              ENTREGA :
            </td>
            <td className="border border-black px-2 py-1 bg-white"></td>
            <td className="border border-black px-2 py-1 font-black text-sm text-center bg-white">
              {data.entregaNum || ''}
            </td>
            <td className="border border-black px-2 py-1 bg-white"></td>
          </tr>

          {/* Fila BANDEJAS */}
          <tr>
            <td className="border border-black px-2 py-1 font-black text-xs bg-white">
              BANDEJAS
            </td>
            <td className="border border-black px-2 py-1 font-black text-sm text-center bg-white">
              {data.bandejas || ''}
            </td>
            <td className="border border-black px-2 py-1 bg-white"></td>
            <td className="border border-black px-2 py-1 bg-white"></td>
          </tr>

          {/* Fila PALLET MADERA */}
          <tr>
            <td className="border border-black px-2 py-1 font-black text-xs bg-white">
              PALLET MADERA
            </td>
            <td className="border border-black px-2 py-1 font-black text-sm text-center bg-white">
              {data.palletMadera || ''}
            </td>
            <td className="border border-black px-2 py-1 bg-white"></td>
            <td className="border border-black px-2 py-1 bg-white"></td>
          </tr>

          {/* Fila PALLETS PLASTICOS */}
          <tr>
            <td className="border border-black px-2 py-1 font-black text-xs bg-white">
              PALLETS PLASTICOS
            </td>
            <td className="border border-black px-2 py-1 font-black text-sm text-center bg-white">
              {data.palletPlasticos || ''}
            </td>
            <td className="border border-black px-2 py-1 bg-white"></td>
            <td className="border border-black px-2 py-1 bg-white"></td>
          </tr>

          {/* Filas vacías de detalle */}
          <tr>
            <td className="border border-black px-2 py-2 bg-white min-h-[22px]"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 bg-white min-h-[22px]"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
          </tr>

          {/* Totales y Gran Cuadro de Número de Viaje / Vuelta */}
          <tr>
            <td className="border border-black px-2 py-1 font-black text-xs text-center bg-slate-200">
              TOTALES
            </td>
            <td className="border border-black px-2 py-1 font-black text-sm text-center bg-white">
              {data.kilos || ''}
            </td>
            <td colSpan={2} rowSpan={4} className="border border-black px-2 py-2 text-center align-middle bg-slate-100">
              <span className="text-[10px] font-bold block text-slate-500 uppercase tracking-widest mb-1">N° Viaje / Vuelta</span>
              <div className="font-black text-5xl tracking-tight leading-none text-black">
                {data.vuelta || '1°'}
              </div>
            </td>
          </tr>

          {/* Folios SAP */}
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[10px] bg-white">
              Folios Sap
            </td>
            <td className="border border-black px-2 py-1 font-black text-xs bg-white">
              {data.foliosSap || ''}
            </td>
          </tr>

          {/* Folios Legales */}
          <tr>
            <td className="border border-black px-2 py-1 font-bold text-[10px] bg-white">
              Folios Legales
            </td>
            <td className="border border-black px-2 py-1 font-black text-xs bg-white">
              {data.foliosLegales || ''}
            </td>
          </tr>

          {/* Fila extra para anotaciones */}
          <tr>
            <td className="border border-black px-2 py-2 bg-white min-h-[20px]"></td>
            <td className="border border-black px-2 py-2 bg-white"></td>
          </tr>

          {/* Supervisor de Carga y Jefatura */}
          <tr>
            <td colSpan={4} className="border border-black px-3 py-2 bg-white text-[10px] font-bold space-y-1">
              <div>SUPERVISOR CARGA :</div>
              <div>JEFE DE DISTRIBUCION Y ENCAJADO: . {data.supervisorName || 'DAGOBERTO VALENZUELA J.'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Recibo Conforme */}
      <div className="mt-4 pt-2 text-[10px] font-bold text-slate-800">
        RECIBO CONFORME ............................................
      </div>
    </div>
  );
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

const formatDurationMs = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined || ms < 0 || isNaN(ms)) return '—';
  const totalMin = Math.floor(ms / (60 * 1000));
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min} min`;
};

const formatWhatsAppUrl = (phone: string | null | undefined, driverName: string, tractorPlate?: string | null) => {
  if (!phone || !phone.trim()) return null;
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return null;

  if (cleanPhone.length === 9 && cleanPhone.startsWith('9')) {
    cleanPhone = `56${cleanPhone}`;
  } else if (cleanPhone.length === 8) {
    cleanPhone = `569${cleanPhone}`;
  } else if (!cleanPhone.startsWith('56') && cleanPhone.length <= 9) {
    cleanPhone = `56${cleanPhone}`;
  }

  const msg = encodeURIComponent(`Hola ${driverName}, te contactamos desde Control Inbound CiAL Alimentos sobre tu camión patente ${tractorPlate || ''}.`);
  return `https://wa.me/${cleanPhone}?text=${msg}`;
};

export const cleanRutKey = (rut?: string | null): string => {
  if (!rut) return '';
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
};

export const formatRutChile = (rutStr?: string | null): string => {
  if (!rutStr) return '';
  const cleaned = cleanRutKey(rutStr);
  if (cleaned.length < 2) return rutStr.trim();
  const dv = cleaned.slice(-1);
  let cuerpo = cleaned.slice(0, -1);
  cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${dv}`;
};

export const cleanPlateKey = (plate?: string | null): string => {
  if (!plate) return '';
  return plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
};

export const normalizePlate = (plate?: string | null): string => {
  if (!plate) return '';
  const clean = cleanPlateKey(plate);
  if (/^[A-Z]{4}\d{2}$/.test(clean)) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  if (/^[A-Z]{2}\d{4}$/.test(clean)) {
    return `${clean.slice(0, 2)}-${clean.slice(2)}`;
  }
  return plate.trim().toUpperCase();
};

export const isSamePlate = (p1?: string | null, p2?: string | null): boolean => {
  const c1 = cleanPlateKey(p1);
  const c2 = cleanPlateKey(p2);
  return Boolean(c1 && c2 && c1 === c2);
};

export const normalizeSearchText = (str?: string | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export default function App({ currentUser: propUser }: AppProps = {}) {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(propUser ?? null);

  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUser(user);
      });
    }
  }, [propUser]);

  const isNexusOwner = isUserOwner(currentUser?.email);

  const [activeTab, setActiveTab] = useState<'yard' | 'planta2' | 'scheduler' | 'history' | 'reports' | 'users'>('yard');

  // Redirigir fuera de la pestaña de usuarios si el usuario conectado no es Nexus Owner
  useEffect(() => {
    if (activeTab === 'users' && !isNexusOwner) {
      setActiveTab('yard');
    }
  }, [activeTab, isNexusOwner]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [mobileYardColumn, setMobileYardColumn] = useState<'all' | 'cita' | 'espera' | 'anden' | 'completado'>('all');
  const [mobilePlanta2Column, setMobilePlanta2Column] = useState<'all' | 'planta_carga' | 'en_ruta' | 'patio_cd' | 'completado'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPlanta2AddModal, setShowPlanta2AddModal] = useState(false);
  const [isPlanta2HeaderCollapsed, setIsPlanta2HeaderCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('planta2_header_collapsed') === 'true';
    }
    return false;
  });

  const togglePlanta2Header = (collapsed: boolean) => {
    setIsPlanta2HeaderCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('planta2_header_collapsed', String(collapsed));
    }
  };
  const [selectedTruckForTimeline, setSelectedTruckForTimeline] = useState<YardOperation | null>(null);
  const [isEditingTimelinePhone, setIsEditingTimelinePhone] = useState(false);
  const [timelinePhoneInput, setTimelinePhoneInput] = useState('');
  const [savingTimelinePhone, setSavingTimelinePhone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Datos de Supabase
  const [trucks, setTrucks] = useState<YardOperation[]>([]);
  const [docks, setDocks] = useState<Dock[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // States para Notificaciones Móviles, Audio Háptico y PWA
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => getNotificationPermissionState());
  const [notificationsActive, setNotificationsActive] = useState<boolean>(() => areNotificationsEnabled());
  const [soundActive, setSoundActive] = useState<boolean>(() => isSoundEnabled());
  const [patioModeActive, setPatioModeActive] = useState<boolean>(() => isBackgroundPatioModeActive());
  const [showPhoneConfigGuide, setShowPhoneConfigGuide] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const alertedOvertimeIds = useRef<Set<string>>(new Set());
  const initialOvertimeRecorded = useRef(false);
  const trucksRef = useRef<YardOperation[]>([]);
  trucksRef.current = trucks;
  const docksRef = useRef<Dock[]>([]);
  docksRef.current = docks;

  // States para Módulo Nexus Owner - Usuarios
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userDomainFilter, setUserDomainFilter] = useState<'all' | 'cial' | 'other'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  
  // Modales de administración de usuarios
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<AdminUser | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPasswordPlain, setShowAdminPasswordPlain] = useState(false);
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState<string | null>(null);
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Cial2026!');
  const [showNewUserPasswordPlain, setShowNewUserPasswordPlain] = useState(false);
  const [newUserRole, setNewUserRole] = useState('Gestor Inbound');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  // States para Documento Control de Carga (Planta 2)
  const [showCargoDocModal, setShowCargoDocModal] = useState(false);
  const [selectedTruckForCargoDoc, setSelectedTruckForCargoDoc] = useState<YardOperation | null>(null);
  const [cargoDocData, setCargoDocData] = useState<CargoDocState>({
    anden: '',
    fecha: formatChileanDate(),
    driver: '',
    rut: '',
    tractorPlate: '',
    trailerPlate: '',
    destino: 'Centro Distrib.- P1',
    kilos: '',
    docTransporte: '',
    sellos: '',
    entregaNum: '',
    bandejas: '',
    palletMadera: '',
    palletPlasticos: '',
    vuelta: '1°',
    foliosSap: '',
    foliosLegales: '',
    supervisorName: 'DAGOBERTO VALENZUELA J.'
  });
  const [cargoDocSaveMsg, setCargoDocSaveMsg] = useState<string | null>(null);

  // States para campos opcionales directos en Modal Registrar Carga Planta 2
  const [p2Kilos, setP2Kilos] = useState('');
  const [p2DocTransporte, setP2DocTransporte] = useState('');
  const [p2Sellos, setP2Sellos] = useState('');
  const [p2Entrega, setP2Entrega] = useState('');
  const [p2Bandejas, setP2Bandejas] = useState('');
  const [p2PalletMadera, setP2PalletMadera] = useState('');
  const [p2PalletPlasticos, setP2PalletPlasticos] = useState('');
  const [p2Vuelta, setP2Vuelta] = useState('1°');
  const [p2Anden, setP2Anden] = useState('');

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

  // States para Fijación de Restricciones por Temperatura (Congelado / Refrigerado / Mixto / Bloqueado)
  const [scheduleRestrictions, setScheduleRestrictions] = useState<ScheduleRestriction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_schedule_restrictions');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [restrictionDate, setRestrictionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [restrictionDockId, setRestrictionDockId] = useState<string>('todos');
  const [restrictionStartHour, setRestrictionStartHour] = useState<number>(8);
  const [restrictionEndHour, setRestrictionEndHour] = useState<number>(20);
  const [restrictionTypeSelected, setRestrictionTypeSelected] = useState<RestrictionType>('congelado');
  const [restrictionNote, setRestrictionNote] = useState<string>('');
  const [savingRestriction, setSavingRestriction] = useState(false);

  // States para Reglas Semanales Recurrentes y Hora de Almuerzo
  const [recurringRules, setRecurringRules] = useState<ScheduleRecurringRule[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_schedule_recurring_rules');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_RECURRING_RULES;
  });

  const [lunchBreakConfig, setLunchBreakConfig] = useState<{
    enabled: boolean;
    hour: number;
    docks: 'todos' | string;
    days: number[]; // e.g. [1, 2, 3, 4, 5] (Lunes a Viernes)
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_lunch_break_config');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { enabled: true, hour: 13, docks: 'todos', days: [1, 2, 3, 4, 5] };
  });

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringModalTab, setRecurringModalTab] = useState<'semanal' | 'almuerzo'>('semanal');
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1); // 1=Lunes
  const [newRuleHour, setNewRuleHour] = useState<number>(11);
  const [newRuleType, setNewRuleType] = useState<RestrictionType>('congelado');
  const [newRuleDockId, setNewRuleDockId] = useState<string>('todos');
  const [newRuleNote, setNewRuleNote] = useState<string>('');
  
  // States para Historial de Operaciones
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<string>('todos');
  const [historyOpType, setHistoryOpType] = useState<string>('todos');
  const [historyCargoType, setHistoryCargoType] = useState<string>('todos');

  // States para Modificar Contraseña
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Sincronizar en ambas bases de datos para que funcione idéntico en despacho y dock
      const { data: { user: curUser } } = await supabase.auth.getUser();
      if (curUser?.email) {
        await Promise.allSettled([
          supabase.rpc('admin_set_user_password_by_email', { target_email: curUser.email, new_password: newPassword }),
          supabaseMain.rpc('admin_set_user_password_by_email', { target_email: curUser.email, new_password: newPassword })
        ]);
      }

      setPasswordSuccess('✅ Contraseña actualizada con éxito en ambas plataformas.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess(null);
      }, 1800);
    } catch (err: any) {
      console.error('Error al actualizar contraseña:', err);
      setPasswordError('Error al cambiar la contraseña: ' + (err.message || 'Intente nuevamente.'));
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 15;


  // Reloj de cabecera
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar datos y suscripción Realtime en vivo
  useEffect(() => {
    fetchData();

    // Suscripción Realtime WebSocket para cambios en vivo en yard_operations, docks, etc.
    const channel = supabase
      .channel('dock-realtime-inbound')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: activeSchema,
          table: 'yard_operations'
        },
        (payload: any) => {
          console.log('[Realtime] yard_operations cambiado:', payload.eventType);
          if (payload.eventType === 'INSERT' && payload.new) {
            setTrucks(prev => {
              if (prev.some(t => t.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });

            // 1. Llegada a Patio en INSERT
            if (payload.new.status === 'espera') {
              const plate = payload.new.patent || payload.new.tractor_plate || 'S/P';
              const driver = payload.new.driver || 'Chofer';
              sendMobileNotification({
                title: '🚛 Llegada a Patio',
                body: `Camión ${plate} / ${driver} acaba de anunciar llegada a Patio.`,
                type: 'arrival',
                tag: `arrival-${payload.new.id}`
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const oldTruck = trucksRef.current.find(t => t.id === payload.new.id);
            const oldStatus = oldTruck?.status || payload.old?.status;
            const newStatus = payload.new.status;

            // 1. Llegada a Patio: Transición a espera
            if (newStatus === 'espera' && oldStatus && oldStatus !== 'espera') {
              const plate = payload.new.patent || payload.new.tractor_plate || 'S/P';
              const driver = payload.new.driver || 'Chofer';
              sendMobileNotification({
                title: '🚛 Llegada a Patio',
                body: `Camión ${plate} / ${driver} acaba de anunciar llegada a Patio.`,
                type: 'arrival',
                tag: `arrival-${payload.new.id}`
              });
            }

            // 2. Asignación de Andén: Transición a 'anden' o cambio de dock_id
            if (newStatus === 'anden' && (oldStatus !== 'anden' || (oldTruck && oldTruck.dock_id !== payload.new.dock_id))) {
              const plate = payload.new.patent || payload.new.tractor_plate || 'S/P';
              const dockObj = docksRef.current.find(d => d.id === payload.new.dock_id) || payload.new.dock;
              const rawName = dockObj?.name || 'Andén';
              const dockName = rawName.toLowerCase().includes('andén') || rawName.toLowerCase().includes('anden') ? rawName : `Andén ${rawName}`;
              sendMobileNotification({
                title: '🚪 Asignación de Andén',
                body: `Camión ${plate} asignado al ${dockName} para descarga.`,
                type: 'assignment',
                tag: `assignment-${payload.new.id}`
              });
            }

            setTrucks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setTrucks(prev => prev.filter(t => t.id !== payload.old.id));
          }
          fetchData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: activeSchema,
          table: 'docks'
        },
        (payload: any) => {
          console.log('[Realtime] docks cambiado:', payload.eventType);
          if (payload.eventType === 'UPDATE' && payload.new) {
            setDocks(prev => prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d));
          }
          fetchData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: activeSchema,
          table: 'drivers'
        },
        () => {
          fetchData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: activeSchema,
          table: 'vehicles'
        },
        () => {
          fetchData(false);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Inbound] Estado de canal:', status);
        setIsRealtimeActive(status === 'SUBSCRIBED');
      });

    // Heartbeat / Sondeo periódico cada 20s como red de seguridad
    const heartbeat = setInterval(() => {
      fetchData(false);
    }, 20000);

    return () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, []);

  // Inicialización de Service Worker PWA y captura de evento de instalación
  useEffect(() => {
    registerServiceWorker().then(() => {
      setNotificationPermission(getNotificationPermissionState());
    });

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // 3. ⚠️ Alertas de Demora: «Camión en Andén X superó el tiempo estimado de descarga»
  useEffect(() => {
    if (trucks.length === 0) return;
    const nowMs = Date.now();
    const andenedTrucks = trucks.filter(t => t.status === 'anden' && t.start_time);

    // En la primera carga de datos, registrar los camiones que YA estaban con demora
    // para no disparar ráfagas de alarmas, sonido y vibraciones instantáneas apenas abre la app
    if (!initialOvertimeRecorded.current) {
      andenedTrucks.forEach(truck => {
        const startTime = new Date(truck.start_time!).getTime();
        let durationMs = PERMITTED_OPERATION_TIME_MS;
        if (truck.scheduled_entry_time && truck.scheduled_end_time) {
          const schStart = new Date(truck.scheduled_entry_time).getTime();
          const schEnd = new Date(truck.scheduled_end_time).getTime();
          const diff = schEnd - schStart;
          if (diff > 0) durationMs = diff;
        }
        if (startTime + durationMs - nowMs < 0) {
          alertedOvertimeIds.current.add(truck.id);
        }
      });
      initialOvertimeRecorded.current = true;
      return;
    }

    andenedTrucks.forEach(truck => {
      const startTime = new Date(truck.start_time!).getTime();
      let durationMs = PERMITTED_OPERATION_TIME_MS;
      if (truck.scheduled_entry_time && truck.scheduled_end_time) {
        const schStart = new Date(truck.scheduled_entry_time).getTime();
        const schEnd = new Date(truck.scheduled_end_time).getTime();
        const diff = schEnd - schStart;
        if (diff > 0) durationMs = diff;
      }

      const limitTime = startTime + durationMs;
      const isOvertime = limitTime - nowMs < 0;

      if (isOvertime && !alertedOvertimeIds.current.has(truck.id)) {
        alertedOvertimeIds.current.add(truck.id);
        const dockObj = docksRef.current.find(d => d.id === truck.dock_id) || truck.dock;
        const rawName = dockObj?.name || 'Andén';
        const dockName = rawName.toLowerCase().includes('andén') || rawName.toLowerCase().includes('anden') ? rawName : `Andén ${rawName}`;
        const plate = truck.patent || truck.tractor_plate || '';

        sendMobileNotification({
          title: '⚠️ Alerta de Demora',
          body: `Camión ${plate ? `[${plate}] ` : ''}en ${dockName} superó el tiempo estimado de descarga.`,
          type: 'alert',
          tag: `overtime-${truck.id}`
        });
      }
    });

    // Limpiar camiones que ya no están en andén
    const currentAndenIds = new Set(andenedTrucks.map(t => t.id));
    alertedOvertimeIds.current.forEach(id => {
      if (!currentAndenIds.has(id)) {
        alertedOvertimeIds.current.delete(id);
      }
    });
  }, [trucks, currentTime]);

  // Cargar usuarios cuando se selecciona la pestaña de usuarios
  useEffect(() => {
    if (activeTab === 'users') {
      fetchAdminUsers();
    }
  }, [activeTab]);

  const fetchAdminUsers = async () => {
    if (!isNexusOwner) {
      setAdminUsers([]);
      return;
    }
    setLoadingAdminUsers(true);
    try {
      // Consultar tanto en cliente actual como en supabaseMain (despacho) para garantizar visualización de todos los usuarios
      const [resCurrent, resMain] = await Promise.allSettled([
        supabase.rpc('admin_get_users'),
        supabaseMain.rpc('admin_get_users')
      ]);

      const usersMap = new Map<string, AdminUser>();

      if (resCurrent.status === 'fulfilled' && resCurrent.value.data) {
        resCurrent.value.data.forEach((u: AdminUser) => usersMap.set(u.email.toLowerCase(), u));
      }
      if (resMain.status === 'fulfilled' && resMain.value.data) {
        resMain.value.data.forEach((u: AdminUser) => {
          const key = u.email.toLowerCase();
          if (!usersMap.has(key)) {
            usersMap.set(key, u);
          } else {
            const existing = usersMap.get(key)!;
            if (u.last_sign_in_at && (!existing.last_sign_in_at || new Date(u.last_sign_in_at) > new Date(existing.last_sign_in_at))) {
              usersMap.set(key, { ...existing, last_sign_in_at: u.last_sign_in_at });
            }
          }
        });
      }

      const merged = Array.from(usersMap.values());
      setAdminUsers(merged);
    } catch (err: any) {
      console.error('Error al cargar usuarios de administración:', err);
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    if (!isNexusOwner) {
      setAdminPasswordError('Acceso denegado: solo el administrador Ariel Mella (ariel.mella@cial.cl) puede gestionar contraseñas.');
      return;
    }
    setAdminPasswordError(null);
    setAdminPasswordSuccess(null);

    if (adminNewPassword.length < 6) {
      setAdminPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setSavingAdminPassword(true);
    try {
      // Sincronizar actualización de contraseña en AMBAS bases de datos (dock y despacho) por correo
      const [r1, r2] = await Promise.allSettled([
        supabase.rpc('admin_set_user_password_by_email', {
          target_email: selectedUserForPassword.email,
          new_password: adminNewPassword
        }),
        supabaseMain.rpc('admin_set_user_password_by_email', {
          target_email: selectedUserForPassword.email,
          new_password: adminNewPassword
        })
      ]);

      const success = (r1.status === 'fulfilled' && r1.value.data?.success) || 
                      (r2.status === 'fulfilled' && r2.value.data?.success);

      if (!success) {
        const errMsg = (r1.status === 'fulfilled' ? r1.value.data?.error : null) ||
                       (r2.status === 'fulfilled' ? r2.value.data?.error : null) ||
                       'Error al cambiar contraseña';
        throw new Error(errMsg);
      }

      setAdminPasswordSuccess(`✅ Contraseña actualizada exitosamente para ${selectedUserForPassword.email} (válida en Despacho y Dock)`);
      setTimeout(() => {
        setSelectedUserForPassword(null);
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        setAdminPasswordSuccess(null);
      }, 1800);
      fetchAdminUsers();
    } catch (err: any) {
      console.error('Error in admin_set_user_password:', err);
      setAdminPasswordError(err.message || 'Error al actualizar contraseña.');
    } finally {
      setSavingAdminPassword(false);
    }
  };

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNexusOwner) {
      setCreateUserError('Acceso denegado: solo el administrador Ariel Mella (ariel.mella@cial.cl) puede crear usuarios.');
      return;
    }
    setCreateUserError(null);
    setCreateUserSuccess(null);

    if (!newUserEmail.includes('@')) {
      setCreateUserError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (newUserPassword.length < 6) {
      setCreateUserError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      // Crear en ambas bases de datos con la misma contraseña y confirmación automática
      const cleanEmail = newUserEmail.trim().toLowerCase();
      const [r1, r2] = await Promise.allSettled([
        supabase.rpc('admin_create_user', {
          new_email: cleanEmail,
          new_password: newUserPassword,
          new_role: newUserRole
        }),
        supabaseMain.rpc('admin_create_user', {
          new_email: cleanEmail,
          new_password: newUserPassword,
          new_role: newUserRole
        })
      ]);

      const success = (r1.status === 'fulfilled' && r1.value.data?.success) || 
                      (r2.status === 'fulfilled' && r2.value.data?.success);

      if (!success) {
        const errMsg = (r1.status === 'fulfilled' ? r1.value.data?.error : null) ||
                       (r2.status === 'fulfilled' ? r2.value.data?.error : null) ||
                       'Error al crear usuario';
        throw new Error(errMsg);
      }

      setCreateUserSuccess(`✅ Usuario ${newUserEmail} creado y confirmado en Despacho y Dock.`);
      setNewUserEmail('');
      setNewUserPassword('Cial2026!');
      setTimeout(() => {
        setShowCreateUserModal(false);
        setCreateUserSuccess(null);
      }, 1800);
      fetchAdminUsers();
    } catch (err: any) {
      console.error('Error in admin_create_user:', err);
      setCreateUserError(err.message || 'Error al crear usuario.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAdminToggleBan = async (user: AdminUser) => {
    if (!isNexusOwner) {
      alert('Acceso denegado: solo el administrador Ariel Mella (ariel.mella@cial.cl) puede bloquear o desbloquear usuarios.');
      return;
    }
    if (isUserOwner(user.email)) {
      alert('No es posible bloquear la cuenta del Administrador Owner.');
      return;
    }
    const action = user.is_banned ? 'desbloquear' : 'bloquear';
    if (!window.confirm(`¿Estás seguro de que deseas ${action} el acceso para ${user.email}?`)) {
      return;
    }

    try {
      await Promise.allSettled([
        supabase.rpc('admin_toggle_user_ban', { target_user_id: user.id, should_ban: !user.is_banned }),
        supabaseMain.rpc('admin_toggle_user_ban', { target_user_id: user.id, should_ban: !user.is_banned })
      ]);
      fetchAdminUsers();
    } catch (err: any) {
      console.error('Error toggling user ban:', err);
      alert('Error al modificar estado del usuario: ' + err.message);
    }
  };

  const fetchData = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setLoading(true);
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

      // Cargar restricciones de bloques por fecha
      try {
        const { data: restData } = await supabase.from('schedule_restrictions').select('*');
        if (restData && restData.length > 0) {
          setScheduleRestrictions(restData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('nexus_schedule_restrictions', JSON.stringify(restData));
          }
        }
      } catch (e) {
        console.warn('Error menor al cargar schedule_restrictions:', e);
      }

      // Cargar reglas recurrentes semanales
      try {
        const { data: recData } = await supabase.from('schedule_recurring_rules').select('*');
        if (recData && recData.length > 0) {
          setRecurringRules(recData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('nexus_schedule_recurring_rules', JSON.stringify(recData));
          }
        }
      } catch (e) {
        console.warn('Error menor al cargar schedule_recurring_rules:', e);
      }

      setDocks(docksData || []);
      setTrucks(operationsData || []);
      setDrivers(driversData || []);
      setVehicles(vehiclesData || []);
    } catch (err: any) {
      console.error('Error cargando datos de Supabase:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const getRestrictionForSlot = (dockId: string, hour: number, date: Date): ScheduleRestriction | null => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab

    // 1. Prioridad: Verificar si hay anulación explícita para esta fecha y hora exacta
    const specific = scheduleRestrictions.find(r => r.schedule_date === dateStr && r.hour === hour && r.dock_id === dockId);
    if (specific) {
      return specific.restriction_type !== 'mixto' ? specific : null;
    }
    const general = scheduleRestrictions.find(r => r.schedule_date === dateStr && r.hour === hour && (!r.dock_id || r.dock_id === 'todos'));
    if (general) {
      return general.restriction_type !== 'mixto' ? general : null;
    }

    // 2. Verificar Hora de Almuerzo configurada
    if (
      lunchBreakConfig.enabled &&
      lunchBreakConfig.hour === hour &&
      lunchBreakConfig.days.includes(dayOfWeek) &&
      (lunchBreakConfig.docks === 'todos' || lunchBreakConfig.docks === dockId)
    ) {
      return {
        schedule_date: dateStr,
        hour: hour,
        dock_id: dockId,
        restriction_type: 'bloqueado',
        note: '🍱 Hora de Almuerzo Operativo'
      };
    }

    // 3. Verificar Reglas Semanales Recurrentes Predeterminadas
    const recurringMatch = recurringRules.find(r => 
      r.day_of_week === dayOfWeek && 
      r.hour === hour && 
      (!r.dock_id || r.dock_id === 'todos' || r.dock_id === dockId) &&
      r.is_active !== false &&
      r.restriction_type !== 'mixto'
    );

    if (recurringMatch) {
      return {
        schedule_date: dateStr,
        hour: hour,
        dock_id: dockId,
        restriction_type: recurringMatch.restriction_type,
        note: recurringMatch.note || (recurringMatch.restriction_type === 'congelado' ? 'Solo Congelado (Regla Semanal)' : recurringMatch.restriction_type === 'refrigerado' ? 'Solo Refrigerado (Regla Semanal)' : 'Bloqueado (Regla Semanal)')
      };
    }

    return null;
  };

  const handleAddRecurringRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: ScheduleRecurringRule = {
      day_of_week: selectedDayTab,
      hour: newRuleHour,
      dock_id: newRuleDockId === 'todos' ? null : newRuleDockId,
      restriction_type: newRuleType,
      note: newRuleNote.trim() || undefined,
      is_active: true
    };

    try {
      await supabase.from('schedule_recurring_rules').upsert([newRule], { onConflict: 'day_of_week,hour,dock_id' });
    } catch (err) {
      console.warn('Fallback local para regla recurrente:', err);
    }

    setRecurringRules(prev => {
      const filtered = prev.filter(r => !(r.day_of_week === selectedDayTab && r.hour === newRuleHour && (r.dock_id === (newRuleDockId === 'todos' ? null : newRuleDockId))));
      const updated = [...filtered, newRule];
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_schedule_recurring_rules', JSON.stringify(updated));
      }
      return updated;
    });

    setNewRuleNote('');
  };

  const handleDeleteRecurringRule = async (ruleToDelete: ScheduleRecurringRule) => {
    try {
      await supabase
        .from('schedule_recurring_rules')
        .delete()
        .match({ day_of_week: ruleToDelete.day_of_week, hour: ruleToDelete.hour, dock_id: ruleToDelete.dock_id });
    } catch (err) {
      console.warn('Fallback local para borrar regla recurrente:', err);
    }

    setRecurringRules(prev => {
      const updated = prev.filter(r => !(r.day_of_week === ruleToDelete.day_of_week && r.hour === ruleToDelete.hour && r.dock_id === ruleToDelete.dock_id));
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_schedule_recurring_rules', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleResetToCialDefaults = async () => {
    try {
      await supabase.from('schedule_recurring_rules').delete().neq('day_of_week', 99);
      await supabase.from('schedule_recurring_rules').insert(INITIAL_RECURRING_RULES);
    } catch (err) {
      console.warn('Fallback local reset:', err);
    }

    setRecurringRules(INITIAL_RECURRING_RULES);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_schedule_recurring_rules', JSON.stringify(INITIAL_RECURRING_RULES));
    }
  };

  const handleSaveLunchConfig = (config: typeof lunchBreakConfig) => {
    setLunchBreakConfig(config);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_lunch_break_config', JSON.stringify(config));
    }
  };

  const handleQuickToggleSlotRestriction = async (dockId: string, hour: number, date: Date, nextType: RestrictionType) => {
    const dateStr = date.toISOString().split('T')[0];
    const item: ScheduleRestriction = {
      schedule_date: dateStr,
      hour: hour,
      dock_id: dockId,
      restriction_type: nextType
    };

    try {
      if (nextType === 'mixto') {
        await supabase
          .from('schedule_restrictions')
          .delete()
          .match({ schedule_date: dateStr, hour: hour, dock_id: dockId });
      } else {
        await supabase
          .from('schedule_restrictions')
          .upsert([item], { onConflict: 'schedule_date,hour,dock_id' });
      }
    } catch (err) {
      console.warn('Upsert fallback local:', err);
    }

    setScheduleRestrictions(prev => {
      const filtered = prev.filter(r => !(r.schedule_date === dateStr && r.hour === hour && r.dock_id === dockId));
      const updated = nextType === 'mixto' ? filtered : [...filtered, item];
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_schedule_restrictions', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSaveBulkRestriction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRestriction(true);
    try {
      const targetDocks = restrictionDockId === 'todos' ? docks : docks.filter(d => d.id === restrictionDockId);
      const newItems: ScheduleRestriction[] = [];
      const minH = Math.min(restrictionStartHour, restrictionEndHour);
      const maxH = Math.max(restrictionStartHour, restrictionEndHour);

      for (let h = minH; h <= maxH; h++) {
        for (const d of targetDocks) {
          newItems.push({
            schedule_date: restrictionDate,
            hour: h,
            dock_id: d.id,
            restriction_type: restrictionTypeSelected,
            note: restrictionNote.trim() || undefined
          });
        }
      }

      // Guardar en Supabase
      try {
        if (restrictionTypeSelected === 'mixto') {
          for (const item of newItems) {
            await supabase
              .from('schedule_restrictions')
              .delete()
              .match({ schedule_date: item.schedule_date, hour: item.hour, dock_id: item.dock_id });
          }
        } else {
          await supabase
            .from('schedule_restrictions')
            .upsert(newItems, { onConflict: 'schedule_date,hour,dock_id' });
        }
      } catch (err) {
        console.warn('Fallback a almacenamiento local:', err);
      }

      setScheduleRestrictions(prev => {
        const filtered = prev.filter(r => {
          const matchesDate = r.schedule_date === restrictionDate;
          const matchesHour = r.hour >= minH && r.hour <= maxH;
          const matchesDock = restrictionDockId === 'todos' || r.dock_id === restrictionDockId;
          return !(matchesDate && matchesHour && matchesDock);
        });
        const updated = restrictionTypeSelected === 'mixto' ? filtered : [...filtered, ...newItems];
        if (typeof window !== 'undefined') {
          localStorage.setItem('nexus_schedule_restrictions', JSON.stringify(updated));
        }
        return updated;
      });

      setShowRestrictionModal(false);
      setRestrictionNote('');
    } catch (err) {
      console.error('Error guardando restricción:', err);
    } finally {
      setSavingRestriction(false);
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
      setManualDriverName(driver.name);
      setDriverRut(driver.rut);
      setDriverPhone(driver.phone || '');
      
      if (driver.default_tractor) {
        const matchingTractor = vehicles.find(v => isSamePlate(v.plate, driver.default_tractor) && v.type === 'Tractor');
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
        const matchingTrailer = vehicles.find(v => isSamePlate(v.plate, driver.default_trailer) && v.type === 'Rampla');
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

  const handleDriverRutChange = (val: string) => {
    setDriverRut(val);
    const cleanTyped = cleanRutKey(val);
    if (cleanTyped.length >= 7) {
      const match = drivers.find(d => cleanRutKey(d.rut) === cleanTyped);
      if (match) {
        if (!selectedDriverId || selectedDriverId === 'manual') {
          if (!manualDriverName.trim()) {
            setManualDriverName(match.name);
          }
          if (!driverPhone.trim() && match.phone) {
            setDriverPhone(match.phone);
          }
          if (match.default_tractor && !selectedTractorId && !manualTractorPlate) {
            const vhc = vehicles.find(v => isSamePlate(v.plate, match.default_tractor) && v.type === 'Tractor');
            if (vhc) {
              setSelectedTractorId(vhc.id);
              setIsManualTractor(false);
            } else {
              setManualTractorPlate(match.default_tractor);
              setIsManualTractor(true);
            }
          }
          if (match.default_trailer && !selectedTrailerId && !manualTrailerPlate) {
            const trl = vehicles.find(v => isSamePlate(v.plate, match.default_trailer) && v.type === 'Rampla');
            if (trl) {
              setSelectedTrailerId(trl.id);
              setIsManualTrailer(false);
            } else {
              setManualTrailerPlate(match.default_trailer);
              setIsManualTrailer(true);
            }
          }
        }
      }
    }
  };

  const matchedDriverByRut = cleanRutKey(driverRut).length >= 7
    ? drivers.find(d => cleanRutKey(d.rut) === cleanRutKey(driverRut))
    : null;

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
   // Guardar o actualizar automáticamente perfiles de Chofer y Vehículos (creación fantasma y actualización por RUT)
  const ensureDriverAndVehiclesSaved = async (
    driverName: string,
    rut: string | null,
    phone: string | null,
    tractorPlate: string | null,
    trailerPlate: string | null
  ): Promise<string | null> => {
    let finalId: string | null = null;

    try {
      // 1. Guardar Tractor en vehicles si es nuevo
      if (tractorPlate && tractorPlate.trim()) {
        const normTractor = normalizePlate(tractorPlate);
        const tractorKey = cleanPlateKey(normTractor);
        if (tractorKey) {
          const exists = vehicles.some(v => cleanPlateKey(v.plate) === tractorKey);
          if (!exists) {
            const { data: newVhc, error: vErr } = await supabase
              .from('vehicles')
              .insert([{ plate: normTractor, type: 'Tractor' }])
              .select();
            if (!vErr && newVhc && newVhc[0]) {
              setVehicles(prev => [...prev, newVhc[0]]);
            } else if (vErr && vErr.code === '23505') {
              const { data: dbVhc } = await supabase
                .from('vehicles')
                .select('*')
                .eq('plate', normTractor)
                .maybeSingle();
              if (dbVhc) {
                setVehicles(prev => [...prev, dbVhc]);
              }
            }
          }
        }
      }

      // 2. Guardar Rampla en vehicles si es nueva
      if (trailerPlate && trailerPlate.trim()) {
        const normTrailer = normalizePlate(trailerPlate);
        const trailerKey = cleanPlateKey(normTrailer);
        if (trailerKey) {
          const exists = vehicles.some(v => cleanPlateKey(v.plate) === trailerKey);
          if (!exists) {
            const { data: newTrl, error: tErr } = await supabase
              .from('vehicles')
              .insert([{ plate: normTrailer, type: 'Rampla' }])
              .select();
            if (!tErr && newTrl && newTrl[0]) {
              setVehicles(prev => [...prev, newTrl[0]]);
            } else if (tErr && tErr.code === '23505') {
              const { data: dbTrl } = await supabase
                .from('vehicles')
                .select('*')
                .eq('plate', normTrailer)
                .maybeSingle();
              if (dbTrl) {
                setVehicles(prev => [...prev, dbTrl]);
              }
            }
          }
        }
      }

      // 3. Chofer: Crear o actualizar por RUT
      const cleanName = driverName ? driverName.trim() : '';
      const rawRut = rut ? rut.trim() : '';
      const rutKey = cleanRutKey(rawRut);
      const formattedRut = rawRut ? formatRutChile(rawRut) : '';
      const cleanPhone = phone ? phone.trim() : null;
      const cleanTractor = tractorPlate ? normalizePlate(tractorPlate) : null;
      const cleanTrailer = trailerPlate ? normalizePlate(trailerPlate) : null;

      // Buscar si el chofer ya existe por RUT (clave única natural) o por nombre
      let existingDriver = drivers.find(d => {
        if (rutKey && cleanRutKey(d.rut) === rutKey) return true;
        if (!rutKey && cleanName && d.name.toLowerCase() === cleanName.toLowerCase()) return true;
        return false;
      });

      if (!existingDriver && formattedRut) {
        const { data: dbDrv } = await supabase
          .from('drivers')
          .select('*')
          .eq('rut', formattedRut)
          .maybeSingle();
        if (dbDrv) {
          existingDriver = dbDrv;
          setDrivers(prev => [...prev, dbDrv]);
        }
      }

      if (existingDriver) {
        finalId = existingDriver.id;
        const phoneChanged = cleanPhone !== null && cleanPhone !== (existingDriver.phone || '');
        const nameChanged = Boolean(cleanName && cleanName !== existingDriver.name);
        const tractorChanged = Boolean(cleanTractor && cleanTractor !== existingDriver.default_tractor);
        const trailerChanged = Boolean(cleanTrailer && cleanTrailer !== existingDriver.default_trailer);

        if (phoneChanged || nameChanged || tractorChanged || trailerChanged) {
          const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString()
          };
          if (cleanPhone !== null) updatePayload.phone = cleanPhone;
          if (nameChanged) updatePayload.name = cleanName;
          if (tractorChanged) updatePayload.default_tractor = cleanTractor;
          if (trailerChanged) updatePayload.default_trailer = cleanTrailer;

          const { data: updatedDrv, error: uErr } = await supabase
            .from('drivers')
            .update(updatePayload)
            .eq('id', existingDriver.id)
            .select();

          if (!uErr && updatedDrv && updatedDrv[0]) {
            setDrivers(prev => prev.map(d => d.id === existingDriver!.id ? updatedDrv[0] : d));
          } else {
            setDrivers(prev => prev.map(d => d.id === existingDriver!.id ? { ...d, ...updatePayload } : d));
          }
        }
      } else if (cleanName || formattedRut) {
        // Chofer nuevo -> Creación fantasma en dock.drivers
        const validRut = formattedRut.length >= 5 ? formattedRut : (rutKey ? rutKey : `S/RUT-${Date.now().toString().slice(-6)}`);
        const { data: newDrv, error: dErr } = await supabase
          .from('drivers')
          .insert([{
            name: cleanName || `Chofer ${validRut}`,
            rut: validRut,
            phone: cleanPhone,
            default_tractor: cleanTractor,
            default_trailer: cleanTrailer
          }])
          .select();

        if (!dErr && newDrv && newDrv[0]) {
          finalId = newDrv[0].id;
          setDrivers(prev => [...prev, newDrv[0]]);
        } else if (dErr && dErr.code === '23505') {
          // Conflicto de RUT: ya existe en DB, actualizar su teléfono
          const { data: conflictedDrv } = await supabase
            .from('drivers')
            .select('*')
            .eq('rut', validRut)
            .maybeSingle();
          if (conflictedDrv) {
            finalId = conflictedDrv.id;
            if (cleanPhone && cleanPhone !== conflictedDrv.phone) {
              await supabase
                .from('drivers')
                .update({ phone: cleanPhone, updated_at: new Date().toISOString() })
                .eq('id', conflictedDrv.id);
              conflictedDrv.phone = cleanPhone;
            }
            setDrivers(prev => {
              const idx = prev.findIndex(d => d.id === conflictedDrv.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = conflictedDrv;
                return copy;
              }
              return [...prev, conflictedDrv];
            });
          }
        }
      }
    } catch (err) {
      console.warn('Advertencia al guardar perfil de chofer o vehículos:', err);
    }

    return finalId;
  };

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    let finalDriverName = '';
    let finalDriverId: string | null = null;

    if (selectedDriverId === 'manual') {
      if (!manualDriverName.trim() && !driverRut.trim()) {
        setErrorMsg('Por favor ingrese el nombre o RUT del conductor.');
        return;
      }
      finalDriverName = manualDriverName.trim() || `Chofer ${driverRut.trim()}`;
    } else {
      const drv = drivers.find(d => d.id === selectedDriverId);
      if (drv) {
        finalDriverName = drv.name;
        finalDriverId = drv.id;
      } else if (manualDriverName.trim()) {
        finalDriverName = manualDriverName.trim();
      }
    }

    if (!finalDriverName) {
      setErrorMsg('Por favor selecciona o ingresa un conductor.');
      return;
    }

    if (!finalTractor) {
      setErrorMsg('Debe especificar un tractor.');
      return;
    }

    const savedId = await ensureDriverAndVehiclesSaved(
      finalDriverName,
      driverRut,
      driverPhone,
      finalTractor,
      finalTrailer
    );
    if (savedId) {
      finalDriverId = savedId;
    }

    const formattedDriverRut = driverRut.trim() ? formatRutChile(driverRut.trim()) : '';

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
      rut: formattedDriverRut || null,
      phone: driverPhone.trim() || null,
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
          rut: formattedDriverRut || null,
          phone: driverPhone.trim() || null,
          tractor_plate: finalTractor,
          trailer_plate: finalTrailer || null,
          patent: finalTractor,
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
      setErrorMsg('No se pudo registrar la operación en la base de datos: ' + (err.message || ''));
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

  // Despachar camión desde Planta 2 a Ruta
  const handleDispatchPlanta2 = async (truckId: string) => {
    setErrorMsg(null);
    const nowISO = new Date().toISOString();

    // UI Optimista
    setTrucks(prev => prev.map(t => {
      if (t.id === truckId) {
        return {
          ...t,
          status: 'en_ruta' as const,
          dispatch_time: nowISO
        };
      }
      return t;
    }));

    try {
      const { error } = await supabase
        .from('yard_operations')
        .update({
          status: 'en_ruta',
          dispatch_time: nowISO
        })
        .eq('id', truckId);

      if (error) throw error;
      fetchData(false);
    } catch (err: any) {
      console.error('Error al despachar desde Planta 2:', err);
      setErrorMsg('Error al despachar el camión desde Planta 2.');
      fetchData(false);
    }
  };

  // Crear despacho nuevo en Planta 2
  const handleAddPlanta2Truck = async (e: React.FormEvent, openCargoDocAfter = false) => {
    e.preventDefault();
    setErrorMsg(null);

    let finalTractor = isManualTractor ? manualTractorPlate.trim().toUpperCase() : (vehicles.find(v => v.id === selectedTractorId)?.plate || '');
    let finalTrailer = isManualTrailer ? manualTrailerPlate.trim().toUpperCase() : (vehicles.find(v => v.id === selectedTrailerId)?.plate || '');

    if (!finalTractor) {
      setErrorMsg('Por favor seleccione o ingrese la patente del tractor.');
      return;
    }

    let finalDriverName = '';
    let finalDriverId: string | null = null;

    if (selectedDriverId === 'manual') {
      if (!manualDriverName.trim() && !driverRut.trim()) {
        setErrorMsg('Por favor ingrese el nombre o RUT del chofer.');
        return;
      }
      finalDriverName = manualDriverName.trim() || `Chofer ${driverRut.trim()}`;
    } else {
      const driverObj = drivers.find(d => d.id === selectedDriverId);
      if (driverObj) {
        finalDriverName = driverObj.name;
        finalDriverId = driverObj.id;
      } else if (manualDriverName.trim()) {
        finalDriverName = manualDriverName.trim();
      } else {
        setErrorMsg('Por favor seleccione un chofer de la lista o ingrese uno nuevo.');
        return;
      }
    }

    const savedId = await ensureDriverAndVehiclesSaved(
      finalDriverName,
      driverRut,
      driverPhone,
      finalTractor,
      finalTrailer
    );
    if (savedId) {
      finalDriverId = savedId;
    }

    const finalRut = driverRut.trim() ? formatRutChile(driverRut.trim()) : null;
    const finalPhone = driverPhone.trim() || null;

    const carrierVal = cargoType === 'Otro' ? (customCargoType.trim() || 'Otro') : cargoType;
    const nowISO = new Date().toISOString();

    const newOpPayload = {
      driver_id: finalDriverId,
      driver: finalDriverName,
      rut: finalRut,
      phone: finalPhone,
      tractor_plate: finalTractor,
      trailer_plate: finalTrailer || null,
      carrier: carrierVal,
      type: 'Descarga' as const,
      status: 'planta_carga' as const,
      origin: 'planta_2' as const,
      plant_loading_time: nowISO,
      entry_time: nowISO,
      patent: finalTractor
    };

    try {
      const { data, error } = await supabase
        .from('yard_operations')
        .insert([newOpPayload])
        .select(`*, dock:dock_id ( name )`);

      if (error) throw error;

      const createdTruck = data && data[0] ? data[0] : null;

      if (createdTruck) {
        setTrucks(prev => [createdTruck, ...prev]);

        // Guardar datos extras del Control de Carga si fueron ingresados o si se pidió abrir la hoja
        const initialDocData: CargoDocState = {
          anden: p2Anden.trim(),
          fecha: formatChileanDate(createdTruck.plant_loading_time || createdTruck.entry_time),
          driver: createdTruck.driver || finalDriverName,
          rut: createdTruck.rut || finalRut || '',
          tractorPlate: createdTruck.tractor_plate || finalTractor,
          trailerPlate: createdTruck.trailer_plate || finalTrailer || '',
          destino: 'Centro Distrib.- P1',
          kilos: p2Kilos.trim(),
          docTransporte: p2DocTransporte.trim(),
          sellos: p2Sellos.trim(),
          entregaNum: p2Entrega.trim(),
          bandejas: p2Bandejas.trim(),
          palletMadera: p2PalletMadera.trim(),
          palletPlasticos: p2PalletPlasticos.trim(),
          vuelta: p2Vuelta || '1°',
          foliosSap: '',
          foliosLegales: '',
          supervisorName: 'DAGOBERTO VALENZUELA J.'
        };

        try {
          localStorage.setItem(`nexus_cargo_doc_${createdTruck.id}`, JSON.stringify(initialDocData));
        } catch (storageErr) {
          console.error('Error guardando en localStorage:', storageErr);
        }

        if (openCargoDocAfter) {
          setCargoDocData(initialDocData);
          setSelectedTruckForCargoDoc(createdTruck);
          setShowCargoDocModal(true);
        }
      }

      setShowPlanta2AddModal(false);
      
      // Limpiar modal
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
      setP2Kilos('');
      setP2DocTransporte('');
      setP2Sellos('');
      setP2Entrega('');
      setP2Bandejas('');
      setP2PalletMadera('');
      setP2PalletPlasticos('');
      setP2Vuelta('1°');
      setP2Anden('');
      
      fetchData();
    } catch (err: any) {
      console.error('Error ingresando despacho Planta 2:', err);
      setErrorMsg('No se pudo registrar el despacho en Planta 2: ' + (err.message || ''));
    }
  };

  // Funciones para Gestión de Documento Oficial "Control de Carga" (Planta 2)
  const openCargoDocForTruck = (truck: YardOperation) => {
    setSelectedTruckForCargoDoc(truck);
    setCargoDocSaveMsg(null);

    // 1. Verificar si existen datos guardados en localStorage
    const saved = localStorage.getItem(`nexus_cargo_doc_${truck.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCargoDocData(parsed);
        setShowCargoDocModal(true);
        return;
      } catch (e) {
        console.error('Error al recuperar datos guardados de Control de Carga:', e);
      }
    }

    // 2. Pre-rellenar con datos de la operación
    const defaultAnden = truck.dock?.name ? (truck.dock.name.replace(/[^0-9]/g, '') || truck.dock.name) : '';
    setCargoDocData({
      anden: defaultAnden,
      fecha: formatChileanDate(truck.plant_loading_time || truck.entry_time),
      driver: truck.driver || '',
      rut: truck.rut || '',
      tractorPlate: truck.tractor_plate || truck.patent || '',
      trailerPlate: truck.trailer_plate || '',
      destino: 'Centro Distrib.- P1',
      kilos: '',
      docTransporte: '',
      sellos: '',
      entregaNum: '',
      bandejas: '',
      palletMadera: '',
      palletPlasticos: '',
      vuelta: '1°',
      foliosSap: '',
      foliosLegales: '',
      supervisorName: 'DAGOBERTO VALENZUELA J.'
    });
    setShowCargoDocModal(true);
  };

  // Abrir Control de Carga directamente con vista previa desde el modal de ingreso de Planta 2
  const openCargoDocFromAddModal = () => {
    const finalTractor = isManualTractor 
      ? manualTractorPlate.trim().toUpperCase() 
      : (vehicles.find(v => v.id === selectedTractorId)?.plate || manualTractorPlate.trim().toUpperCase() || '');
    const finalTrailer = isManualTrailer 
      ? manualTrailerPlate.trim().toUpperCase() 
      : (vehicles.find(v => v.id === selectedTrailerId)?.plate || manualTrailerPlate.trim().toUpperCase() || '');
    
    let finalDriverName = '';
    if (selectedDriverId === 'manual') {
      finalDriverName = manualDriverName.trim() || (driverRut.trim() ? `Chofer ${driverRut.trim()}` : '');
    } else {
      const driverObj = drivers.find(d => d.id === selectedDriverId);
      finalDriverName = driverObj?.name || manualDriverName.trim() || '';
    }

    const finalRut = driverRut.trim() ? formatRutChile(driverRut.trim()) : (drivers.find(d => d.id === selectedDriverId)?.rut || '');

    setCargoDocData(prev => ({
      ...prev,
      driver: finalDriverName || prev.driver,
      rut: finalRut || prev.rut,
      tractorPlate: finalTractor || prev.tractorPlate,
      trailerPlate: finalTrailer || prev.trailerPlate,
      fecha: prev.fecha || formatChileanDate(),
      destino: prev.destino || 'Centro Distrib.- P1',
      kilos: p2Kilos.trim() || prev.kilos,
      docTransporte: p2DocTransporte.trim() || prev.docTransporte,
      sellos: p2Sellos.trim() || prev.sellos,
      entregaNum: p2Entrega.trim() || prev.entregaNum,
      bandejas: p2Bandejas.trim() || prev.bandejas,
      palletMadera: p2PalletMadera.trim() || prev.palletMadera,
      palletPlasticos: p2PalletPlasticos.trim() || prev.palletPlasticos,
      vuelta: p2Vuelta || prev.vuelta || '1°',
      anden: p2Anden.trim() || prev.anden
    }));

    const draftTruck: YardOperation = {
      id: 'draft-p2-new',
      driver: finalDriverName || 'Chofer Despacho',
      rut: finalRut || '',
      phone: driverPhone.trim() || '',
      tractor_plate: finalTractor || 'S/P',
      trailer_plate: finalTrailer || '',
      patent: finalTractor || 'S/P',
      driver_id: selectedDriverId !== 'manual' && selectedDriverId ? selectedDriverId : null,
      carrier: cargoType === 'Otro' ? (customCargoType.trim() || 'Otro') : cargoType,
      type: 'Descarga',
      status: 'planta_carga',
      origin: 'planta_2',
      dock_id: null,
      entry_time: new Date().toISOString(),
      plant_loading_time: new Date().toISOString(),
      start_time: null,
      end_time: null,
      exit_time: null
    };

    setSelectedTruckForCargoDoc(draftTruck);
    setShowCargoDocModal(true);
  };

  const handleCloseCargoDocModal = () => {
    if (selectedTruckForCargoDoc?.id === 'draft-p2-new') {
      if (cargoDocData.kilos) setP2Kilos(cargoDocData.kilos);
      if (cargoDocData.docTransporte) setP2DocTransporte(cargoDocData.docTransporte);
      if (cargoDocData.sellos) setP2Sellos(cargoDocData.sellos);
      if (cargoDocData.entregaNum) setP2Entrega(cargoDocData.entregaNum);
      if (cargoDocData.bandejas) setP2Bandejas(cargoDocData.bandejas);
      if (cargoDocData.palletMadera) setP2PalletMadera(cargoDocData.palletMadera);
      if (cargoDocData.palletPlasticos) setP2PalletPlasticos(cargoDocData.palletPlasticos);
      if (cargoDocData.vuelta) setP2Vuelta(cargoDocData.vuelta);
      if (cargoDocData.anden) setP2Anden(cargoDocData.anden);
      if (cargoDocData.driver && (!manualDriverName || selectedDriverId === 'manual')) {
        setManualDriverName(cargoDocData.driver);
      }
      if (cargoDocData.rut) setDriverRut(cargoDocData.rut);
      if (cargoDocData.tractorPlate) {
        setManualTractorPlate(cargoDocData.tractorPlate);
        setIsManualTractor(true);
      }
      if (cargoDocData.trailerPlate) {
        setManualTrailerPlate(cargoDocData.trailerPlate);
        setIsManualTrailer(true);
      }
    }
    setShowCargoDocModal(false);
  };

  const handleSaveCargoDoc = async () => {
    if (!selectedTruckForCargoDoc) return;

    // Si es un borrador nuevo originado desde el modal de ingreso de Planta 2
    if (selectedTruckForCargoDoc.id === 'draft-p2-new') {
      const tractorToSave = (cargoDocData.tractorPlate || selectedTruckForCargoDoc.tractor_plate || '').trim().toUpperCase();
      const trailerToSave = (cargoDocData.trailerPlate || selectedTruckForCargoDoc.trailer_plate || '').trim().toUpperCase();
      const driverNameToSave = (cargoDocData.driver || selectedTruckForCargoDoc.driver || '').trim() || 'Chofer Planta 2';
      const rutToSave = (cargoDocData.rut || selectedTruckForCargoDoc.rut || '').trim();
      const phoneToSave = selectedTruckForCargoDoc.phone || null;

      if (!tractorToSave || tractorToSave === 'S/P' || tractorToSave === 'S/T') {
        alert('Por favor ingrese la patente del tractor antes de guardar.');
        return;
      }

      try {
        const savedDriverId = await ensureDriverAndVehiclesSaved(
          driverNameToSave,
          rutToSave,
          phoneToSave || '',
          tractorToSave,
          trailerToSave
        );

        const nowISO = new Date().toISOString();
        const newOpPayload = {
          driver_id: savedDriverId || selectedTruckForCargoDoc.driver_id || null,
          driver: driverNameToSave,
          rut: rutToSave ? formatRutChile(rutToSave) : null,
          phone: phoneToSave,
          tractor_plate: tractorToSave,
          trailer_plate: trailerToSave || null,
          carrier: selectedTruckForCargoDoc.carrier || 'Refrigerado',
          type: 'Descarga' as const,
          status: 'planta_carga' as const,
          origin: 'planta_2' as const,
          plant_loading_time: nowISO,
          entry_time: nowISO,
          patent: tractorToSave
        };

        const { data, error } = await supabase
          .from('yard_operations')
          .insert([newOpPayload])
          .select(`*, dock:dock_id ( name )`);

        if (error) throw error;

        if (data && data[0]) {
          const created = data[0];
          setTrucks(prev => [created, ...prev]);
          setSelectedTruckForCargoDoc(created);
          try {
            localStorage.setItem(`nexus_cargo_doc_${created.id}`, JSON.stringify(cargoDocData));
          } catch (storageErr) {
            console.error('Error al guardar en localStorage:', storageErr);
          }
        }

        setShowPlanta2AddModal(false);
        setCargoDocSaveMsg('¡Despacho registrado en Planta 2 y Control de Carga guardado!');
        setTimeout(() => setCargoDocSaveMsg(null), 3000);
        fetchData();
      } catch (err: any) {
        console.error('Error al guardar despacho y control de carga:', err);
        alert('No se pudo registrar el despacho: ' + (err.message || ''));
      }
      return;
    }

    // Camión ya existente en base de datos
    try {
      localStorage.setItem(`nexus_cargo_doc_${selectedTruckForCargoDoc.id}`, JSON.stringify(cargoDocData));
      setCargoDocSaveMsg('¡Datos de Control de Carga guardados correctamente!');
      setTimeout(() => setCargoDocSaveMsg(null), 3000);
    } catch (e) {
      console.error('Error al guardar datos de carga:', e);
    }
  };

  const handlePrintCargoDoc = async () => {
    await handleSaveCargoDoc();
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Guardar celular del chofer desde el modal de trazabilidad (actualiza ticket y ficha de chofer)
  const handleSaveTimelinePhone = async () => {
    if (!selectedTruckForTimeline) return;
    setSavingTimelinePhone(true);
    const newPhone = timelinePhoneInput.trim();

    try {
      // 1. Actualizar en yard_operations
      const { error: opErr } = await supabase
        .from('yard_operations')
        .update({ phone: newPhone || null })
        .eq('id', selectedTruckForTimeline.id);
      if (opErr) throw opErr;

      // 2. Actualizar en drivers por driver_id o por RUT
      const driverId = selectedTruckForTimeline.driver_id;
      const rutKey = cleanRutKey(selectedTruckForTimeline.rut);

      if (driverId) {
        await supabase
          .from('drivers')
          .update({ phone: newPhone || null, updated_at: new Date().toISOString() })
          .eq('id', driverId);
      } else if (rutKey) {
        const matched = drivers.find(d => cleanRutKey(d.rut) === rutKey);
        if (matched) {
          await supabase
            .from('drivers')
            .update({ phone: newPhone || null, updated_at: new Date().toISOString() })
            .eq('id', matched.id);
        }
      }

      // 3. Actualizar estado local
      setSelectedTruckForTimeline(prev => prev ? { ...prev, phone: newPhone || null } : null);
      setTrucks(prev => prev.map(t => t.id === selectedTruckForTimeline.id ? { ...t, phone: newPhone || null } : t));
      setDrivers(prev => prev.map(d => {
        if ((driverId && d.id === driverId) || (rutKey && cleanRutKey(d.rut) === rutKey)) {
          return { ...d, phone: newPhone || null };
        }
        return d;
      }));

      setIsEditingTimelinePhone(false);
    } catch (err: any) {
      console.error('Error actualizando teléfono del chofer:', err);
      setErrorMsg('No se pudo actualizar el teléfono: ' + (err?.message || ''));
    } finally {
      setSavingTimelinePhone(false);
    }
  };

  // Mover camión de Cita o En Ruta a Patio (Espera)
  const handleMoveToYard = async (truckId: string) => {
    setErrorMsg(null);
    const nowISO = new Date().toISOString();
    const truck = trucks.find(t => t.id === truckId);

    // UI Optimista
    setTrucks(prev => prev.map(t => {
      if (t.id === truckId) {
        return { 
          ...t, 
          status: 'espera' as const,
          entry_time: nowISO,
          dispatch_time: t.dispatch_time || (t.origin === 'planta_2' ? nowISO : null)
        };
      }
      return t;
    }));

    if (truck) {
      const plate = truck.patent || truck.tractor_plate || 'S/P';
      const driver = truck.driver || 'Chofer';
      sendMobileNotification({
        title: '🚛 Llegada a Patio',
        body: `Camión ${plate} / ${driver} acaba de anunciar llegada a Patio.`,
        type: 'arrival',
        tag: `arrival-${truckId}`
      });
    }

    try {
      const updatePayload: Record<string, any> = {
        status: 'espera',
        entry_time: nowISO
      };
      if (truck?.origin === 'planta_2' && !truck.dispatch_time) {
        updatePayload.dispatch_time = nowISO;
      }

      const { error } = await supabase
        .from('yard_operations')
        .update(updatePayload)
        .eq('id', truckId);

      if (error) throw error;
      fetchData(false);
    } catch (err: any) {
      console.error('Error al registrar entrada a patio:', err);
      setErrorMsg('Error al registrar el ingreso físico del camión al patio: ' + (err.message || ''));
      fetchData(false);
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
      if (truck.origin === 'planta_2') {
        updateData = { status: 'en_ruta' };
      } else {
        updateData = { status: 'cita' };
      }
    } else if (currentStatus === 'en_ruta') {
      updateData = { status: 'planta_carga', dispatch_time: null };
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
      return;
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
      (sourceStatus === 'anden' && (targetStatus === 'espera' || targetStatus === 'cita')) ||
      (sourceStatus === 'completado' && (targetStatus === 'anden' || targetStatus === 'espera' || targetStatus === 'cita'))
    ) {
      handleRevertStatus(truck);
      return;
    }

    // Avanzar hacia adelante
    if ((sourceStatus === 'cita' || sourceStatus === 'en_ruta' || sourceStatus === 'planta_carga') && targetStatus === 'espera') {
      handleMoveToYard(truckId);
    } else if ((sourceStatus === 'espera' || sourceStatus === 'cita' || sourceStatus === 'en_ruta' || sourceStatus === 'planta_carga') && targetStatus === 'anden') {
      setDraggedTruckForDock(truck);
      const availableDocks = docks.filter(d => d.status === 'Disponible');
      if (availableDocks.length === 0) {
        setErrorMsg('No hay andenes disponibles en este momento.');
        return;
      }
      setSelectedDockIdForDrag(availableDocks[0].id);
      setShowDockSelectModal(true);
    } else if ((sourceStatus === 'anden' || sourceStatus === 'espera') && targetStatus === 'completado') {
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

    setDocks(prev => prev.map(d => d.id === dockId ? { ...d, status: 'Ocupado' as const } : d));

    const truck = trucks.find(t => t.id === truckId);
    if (truck) {
      const plate = truck.patent || truck.tractor_plate || 'S/P';
      const rawName = selectedDock.name || 'Andén';
      const dockName = rawName.toLowerCase().includes('andén') || rawName.toLowerCase().includes('anden') ? rawName : `Andén ${rawName}`;
      sendMobileNotification({
        title: '🚪 Asignación de Andén',
        body: `Camión ${plate} asignado al ${dockName} para descarga.`,
        type: 'assignment',
        tag: `assignment-${truckId}`
      });
    }

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

  const filteredTrucks = trucks.filter(truck => {
    if (!searchQuery.trim()) return true;
    const q = normalizeSearchText(searchQuery);
    const qRut = cleanRutKey(searchQuery);
    const qPlate = cleanPlateKey(searchQuery);

    const driverMatch = normalizeSearchText(truck.driver).includes(q);
    const carrierMatch = normalizeSearchText(truck.carrier).includes(q);
    const tractorMatch = normalizeSearchText(truck.tractor_plate).includes(q) || (Boolean(qPlate) && cleanPlateKey(truck.tractor_plate).includes(qPlate));
    const trailerMatch = normalizeSearchText(truck.trailer_plate).includes(q) || (Boolean(qPlate) && cleanPlateKey(truck.trailer_plate).includes(qPlate));
    const rutMatch = normalizeSearchText(truck.rut).includes(q) || (Boolean(qRut) && cleanRutKey(truck.rut).includes(qRut));
    const phoneMatch = normalizeSearchText(truck.phone).includes(q) || (Boolean(truck.phone) && (truck.phone || '').includes(searchQuery.trim()));
    const patentMatch = normalizeSearchText(truck.patent).includes(q);

    return driverMatch || carrierMatch || tractorMatch || trailerMatch || rutMatch || phoneMatch || patentMatch;
  });

  const getGroupedCompletedTrucks = () => {
    const completed = filteredTrucks.filter(t => t.status === 'completado')
      .sort((a, b) => {
        const timeA = a.exit_time ? new Date(a.exit_time).getTime() : (a.end_time ? new Date(a.end_time).getTime() : 0);
        const timeB = b.exit_time ? new Date(b.exit_time).getTime() : (b.end_time ? new Date(b.end_time).getTime() : 0);
        return timeB - timeA;
      });

    const groups: { [key: string]: YardOperation[] } = {};
    completed.forEach(truck => {
      const dateStr = truck.exit_time || truck.end_time || truck.entry_time;
      if (!dateStr) return;
      const dateObj = new Date(dateStr);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const localDate = `${yyyy}-${mm}-${dd}`;
      
      if (!groups[localDate]) {
        groups[localDate] = [];
      }
      groups[localDate].push(truck);
    });

    return groups;
  };

  const formatGroupDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                    
    const isYesterday = date.getDate() === yesterday.getDate() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getFullYear() === yesterday.getFullYear();

    if (isToday) return `Hoy (${day}/${month})`;
    if (isYesterday) return `Ayer (${day}/${month})`;
    
    const dayName = date.toLocaleDateString('es-CL', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${capitalizedDay} (${day}/${month})`;
  };

  const handleUpdateDockStatus = async (dockId: string, newStatus: 'Disponible' | 'Ocupado' | 'Mantenimiento') => {
    setErrorMsg(null);

    if (newStatus === 'Mantenimiento') {
      const activeTruckInDock = trucks.find(t => t.dock_id === dockId && t.status === 'anden');
      if (activeTruckInDock) {
        if (!window.confirm(`El andén tiene un camión activo (${activeTruckInDock.driver}). ¿Estás seguro de poner el andén en Mantenimiento? El camión permanecerá en andén pero se marcará como mantenimiento.`)) {
          return;
        }
      }
    }

    setDocks(prev => prev.map(d => {
      if (d.id === dockId) {
        return { ...d, status: newStatus };
      }
      return d;
    }));

    try {
      const { error } = await supabase
        .from('docks')
        .update({ status: newStatus })
        .eq('id', dockId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      console.error('Error al actualizar estado del andén:', err);
      setErrorMsg('Error al actualizar el estado del andén en el servidor.');
      fetchData();
    }
  };

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

  // Control de Notificaciones Móviles y PWA
  const handleToggleNotifications = async () => {
    if (notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationPermission('granted');
        setNotificationsActive(true);
        setNotificationsEnabled(true);
        sendMobileNotification({
          title: '🔔 Notificaciones Activadas',
          body: 'Recibirás avisos de llegada a patio, asignación de andén y demoras.',
          type: 'arrival'
        });
      } else {
        alert('Para recibir alertas en tu celular, debes permitir las notificaciones en la ventana del navegador.');
      }
    } else {
      const next = !notificationsActive;
      setNotificationsActive(next);
      setNotificationsEnabled(next);
    }
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      playNotificationSound('arrival');
    }
  };

  const handlePromptInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      alert('Para instalar en Android:\n1. Toca el menú (⋮) de Google Chrome.\n2. Toca "Instalar aplicación" o "Agregar a pantalla principal".\n\nPara instalar en iPhone (Safari):\n1. Toca el botón Compartir (cuadrado con flecha).\n2. Selecciona "Agregar al inicio".');
    }
  };

  const handleTogglePatioMode = async () => {
    const active = await toggleBackgroundPatioMode();
    setPatioModeActive(active);
    if (active) {
      sendMobileNotification({
        title: '📻 Modo Guardia Activo',
        body: 'Nexus Dock permanecerá despierto y sonará en tu bolsillo incluso con la pantalla bloqueada.',
        type: 'arrival',
        tag: 'patio-mode-active'
      });
    }
  };

  // Disparadores de Prueba en Celular
  const handleTestArrival = () => {
    sendMobileNotification({
      title: '🚛 Llegada a Patio',
      body: 'Camión AB-CD-12 / Pedro Godoy acaba de anunciar llegada a Patio.',
      type: 'arrival',
      tag: 'test-arrival'
    });
  };

  const handleTestAssignment = () => {
    sendMobileNotification({
      title: '🚪 Asignación de Andén',
      body: 'Camión AB-CD-12 asignado al Andén 3 para descarga.',
      type: 'assignment',
      tag: 'test-assignment'
    });
  };

  const handleTestDelay = () => {
    sendMobileNotification({
      title: '⚠️ Alerta de Demora',
      body: 'Camión en Andén 3 superó el tiempo estimado de descarga.',
      type: 'alert',
      tag: 'test-delay'
    });
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex font-sans">
      
      {/* Overlay Backdrop Móvil */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Barra Lateral Izquierda (Sidebar Verde CiAL - Responsive Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0a5c36] text-white flex flex-col shadow-2xl select-none
        transition-transform duration-300 ease-in-out shrink-0
        md:static md:w-64 md:translate-x-0 md:shadow-lg md:z-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Logotipo / Cabecera Sidebar con la imagen oficial de CiAL Alimentos */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#08482a]">
          <div className="flex items-center gap-3">
            <img 
              src={cialLogo} 
              alt="CiAL Alimentos" 
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm" 
            />
            <div>
              <h2 className="text-sm font-extrabold tracking-wider leading-none">Control</h2>
              <span className="text-xs text-emerald-300 font-semibold tracking-wide uppercase">Inbound</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links Navegación */}
        <nav className="flex-1 px-4 py-4 sm:py-6 space-y-1.5 sm:space-y-2 overflow-y-auto">
          <button 
            onClick={() => {
              setActiveTab('yard');
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${activeTab === 'yard' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
          >
            <Monitor className="w-5 h-5 shrink-0" />
            Panel Inbound
          </button>

          <button 
            onClick={() => {
              setActiveTab('planta2');
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${activeTab === 'planta2' ? 'bg-white/15 text-white shadow-sm ring-1 ring-cyan-400/40' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Factory className="w-5 h-5 shrink-0 text-cyan-300" />
              <span>Despacho Planta 2</span>
            </div>
            {trucks.filter(t => t.origin === 'planta_2' && (t.status === 'planta_carga' || t.status === 'en_ruta')).length > 0 && (
              <span className="bg-cyan-400 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-sm">
                {trucks.filter(t => t.origin === 'planta_2' && (t.status === 'planta_carga' || t.status === 'en_ruta')).length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('scheduler');
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${activeTab === 'scheduler' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
          >
            <Calendar className="w-5 h-5 shrink-0" />
            Agendamiento Andenes
          </button>

          <div className="pt-3 border-t border-white/10 mt-3">
            <span className="px-4 text-[10px] font-bold text-emerald-300/80 uppercase tracking-widest block mb-2">Logs & Historial</span>
            <button
              onClick={() => {
                setActiveTab('history');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'history' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
            >
              <History className="w-4 h-4 shrink-0" />
              Historial Operaciones
            </button>
            <button
              onClick={() => {
                setActiveTab('reports');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'reports' ? 'bg-white/15 text-white shadow-sm' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              Reportes de Eficiencia
            </button>
          </div>

          {isNexusOwner && (
            <div className="pt-3 border-t border-white/10 mt-3">
              <span className="px-4 text-[10px] font-bold text-amber-300/90 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-amber-400" />
                Nexus Owner
              </span>
              <button
                onClick={() => {
                  setActiveTab('users');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'users' ? 'bg-amber-400/20 text-amber-200 shadow-sm ring-1 ring-amber-400/40' : 'text-emerald-100 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Gestión Usuarios</span>
                </div>
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded font-black uppercase">
                  Owner
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* Usuario & Opciones de Cuenta */}
        <div className="p-3 border-t border-white/10 bg-[#08482a] space-y-2">
          {/* Identificación de Usuario */}
          <div className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
              isNexusOwner ? 'bg-amber-400 text-slate-950' : 'bg-emerald-800 text-white'
            }`}>
              {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-white text-xs font-bold truncate block leading-tight">
                {currentUser?.email || 'Usuario'}
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 mt-0.5 ${
                isNexusOwner ? 'text-amber-300' : 'text-emerald-300/80'
              }`}>
                {isNexusOwner && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                {isNexusOwner ? 'Administrador' : formatUserRole(currentUser?.user_metadata?.role || currentUser?.app_metadata?.role)}
              </span>
            </div>
          </div>

          {/* Botón Acceso Rápido a Notificaciones Móviles */}
          <button
            type="button"
            onClick={() => {
              setShowNotificationModal(true);
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center justify-between w-full text-emerald-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold text-xs"
            title="Configurar notificaciones en celular"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
              <span>Alertas en Celular</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
              notificationsActive ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-white/70'
            }`}>
              {notificationsActive ? 'On' : 'Off'}
            </span>
          </button>

          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="flex items-center gap-2 w-full text-emerald-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold text-xs"
            title="Cambiar contraseña de la cuenta"
          >
            <Key className="w-3.5 h-3.5 shrink-0 text-cyan-300" />
            <span>Modificar Contraseña</span>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 w-full text-red-300 hover:text-red-200 hover:bg-red-900/20 px-3 py-2 rounded-xl transition-all cursor-pointer font-bold text-xs"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Area Derecha */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        
        {/* Cabecera Unificada Responsiva */}
        <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-4 shadow-sm select-none shrink-0 min-h-[56px]">
          
          {/* Botón Hamburguesa Móvil + Título & Reloj */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-700 hover:text-[#0a5c36] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight leading-tight truncate">
                  {activeTab === 'yard' && 'Monitoreo Activo de Patio'}
                  {activeTab === 'planta2' && 'Gestión Despacho Planta 2'}
                  {activeTab === 'scheduler' && 'Matriz de Agendamiento'}
                  {activeTab === 'history' && 'Historial Operaciones'}
                  {activeTab === 'reports' && 'Reportes & Métricas'}
                  {activeTab === 'users' && 'Gestión de Usuarios'}
                </h1>
                
                {/* Badge Realtime en Vivo */}
                <span className={`inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${
                  isRealtimeActive 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  <Radio className={`w-2.5 h-2.5 ${isRealtimeActive ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
                  <span>{isRealtimeActive ? 'En Vivo' : 'Conectando'}</span>
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold hidden sm:flex items-center gap-1 mt-0.5 leading-none">
                <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{formatHeaderDate(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* Grupo de Control Unificado (Derecha / Buscador + Acciones) */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end">
            
            {/* Buscador Integrado con botón limpiar */}
            <div className="relative flex-1 md:w-72 lg:w-80 min-w-0">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar chofer, tractor, patente, rut..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 sm:pl-9 pr-7 text-xs w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botón de Notificaciones Móviles y PWA */}
            <button 
              type="button"
              onClick={() => setShowNotificationModal(true)}
              title={
                patioModeActive
                  ? "Modo Guardia Activo (Alerta con pantalla bloqueada activada)"
                  : notificationsActive 
                    ? "Notificaciones Activas - Clic para probar o configurar" 
                    : "Activar Notificaciones en Celular"
              }
              className={`relative p-2 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-sm flex items-center justify-center shrink-0 ${
                patioModeActive
                  ? 'border-emerald-500 bg-emerald-100 text-[#0a5c36] ring-2 ring-emerald-500/30'
                  : notificationsActive 
                    ? 'border-emerald-300 bg-emerald-50 text-[#0a5c36]' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500'
              }`}
            >
              {patioModeActive ? (
                <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
              ) : notificationsActive ? (
                <BellRing className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              {(patioModeActive || notificationsActive) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              )}
            </button>

            {/* Botón de Refrescar */}
            <button 
              type="button"
              onClick={() => fetchData()}
              title="Refrescar datos en vivo"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer active:scale-95 shadow-sm flex items-center justify-center shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Botón de Registrar Ingreso (según tab) */}
            {activeTab === 'planta2' ? (
              <button 
                type="button"
                onClick={() => {
                  const now = new Date();
                  setScheduledEntryTime(formatLocalDatetime(now));
                  setShowPlanta2AddModal(true);
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-800 hover:to-blue-800 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ingresar Despacho Planta 2</span>
                <span className="sm:hidden">+ Despacho</span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1 bg-[#0a5c36] hover:bg-[#08482a] text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ingresar Camión / Cita</span>
                <span className="sm:hidden">+ Ingresar</span>
              </button>
            )}
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Banner de error */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-700 text-sm shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error del Servidor:</span> {errorMsg}
              </div>
            </div>
          )}

          {/* Banner de búsqueda activa con acceso directo a camiones en ruta */}
          {searchQuery.trim() && (
            <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs text-slate-800 font-bold">
                    Búsqueda: <span className="text-emerald-800 font-black font-mono">"{searchQuery}"</span> ({filteredTrucks.length} transporte{filteredTrucks.length !== 1 ? 's' : ''} encontrado{filteredTrucks.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 self-end sm:self-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpiar filtro</span>
                </button>
              </div>

              {/* Si entre los resultados hay camiones en ruta o en carga, mostrar acción directa de llegada */}
              {filteredTrucks.some(t => t.status === 'en_ruta' || (t.origin === 'planta_2' && t.status === 'planta_carga')) && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-cyan-800 tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                      Transporte en Ruta Encontrado:
                    </span>
                    {filteredTrucks.filter(t => t.status === 'en_ruta' || (t.origin === 'planta_2' && t.status === 'planta_carga')).map(t => (
                      <p key={t.id} className="text-xs font-bold text-slate-800">
                        {t.driver} • TR: {t.tractor_plate || t.patent} {t.trailer_plate ? `• R: ${t.trailer_plate}` : ''} ({t.carrier})
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {filteredTrucks.filter(t => t.status === 'en_ruta' || (t.origin === 'planta_2' && t.status === 'planta_carga')).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleMoveToYard(t.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>📥 Registrar Llegada a Patio</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kanban / Contenedor principal */}
          {loading && trucks.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <RefreshCw className="w-10 h-10 text-[#0a5c36] animate-spin mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Cargando datos de patio...</p>
            </div>
          ) : activeTab === 'yard' ? (
            
            <div className="space-y-4">
              {/* Selector de Columnas Móvil (md:hidden) */}
              <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
                <button
                  type="button"
                  onClick={() => setMobileYardColumn('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobileYardColumn === 'all' ? 'bg-[#0a5c36] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Todas ({filteredTrucks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileYardColumn('cita')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobileYardColumn === 'cita' ? 'bg-yellow-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Citas & Ruta ({filteredTrucks.filter(t => t.status === 'cita' || t.status === 'en_ruta' || (searchQuery.trim().length > 0 && t.origin === 'planta_2' && t.status === 'planta_carga')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileYardColumn('espera')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobileYardColumn === 'espera' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Espera ({filteredTrucks.filter(t => t.status === 'espera').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileYardColumn('anden')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobileYardColumn === 'anden' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  En Andén ({filteredTrucks.filter(t => t.status === 'anden').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileYardColumn('completado')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobileYardColumn === 'completado' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Recibidos ({filteredTrucks.filter(t => t.status === 'completado').length})
                </button>
              </div>

              {/* Pestaña: Kanban Board para Monitor de 4 columnas */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* 1. Columna: Citas & En Ruta (Planta 2) */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'cita')}
                  className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 flex-col min-h-[500px] ${
                    mobileYardColumn !== 'all' && mobileYardColumn !== 'cita' ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                      <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Citas & En Ruta</h3>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                      {filteredTrucks.filter(t => t.status === 'cita' || t.status === 'en_ruta' || (searchQuery.trim().length > 0 && t.origin === 'planta_2' && t.status === 'planta_carga')).length}
                    </span>
                  </div>
                  
                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {filteredTrucks.filter(t => t.status === 'cita' || t.status === 'en_ruta' || (searchQuery.trim().length > 0 && t.origin === 'planta_2' && t.status === 'planta_carga'))
                      .sort((a, b) => {
                        const aIsPriority = a.status === 'en_ruta' || a.status === 'planta_carga';
                        const bIsPriority = b.status === 'en_ruta' || b.status === 'planta_carga';
                        if (aIsPriority && !bIsPriority) return -1;
                        if (!aIsPriority && bIsPriority) return 1;
                        if (a.status === 'en_ruta' && b.status === 'en_ruta') {
                          const timeA = a.dispatch_time ? new Date(a.dispatch_time).getTime() : 0;
                          const timeB = b.dispatch_time ? new Date(b.dispatch_time).getTime() : 0;
                          return timeB - timeA;
                        }
                        return new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime();
                      })
                      .map(truck => (
                      <div 
                        key={truck.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, truck.id, truck.status)}
                        className={`p-5 rounded-2xl space-y-3 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md border ${
                          truck.status === 'en_ruta' 
                            ? 'bg-gradient-to-b from-cyan-50/70 to-white border-2 border-cyan-400' 
                            : truck.status === 'planta_carga'
                            ? 'bg-gradient-to-b from-amber-50/70 to-white border-2 border-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {truck.status === 'en_ruta' && (
                          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-t-xl -mx-5 -mt-5 mb-2 flex items-center justify-between shadow-sm">
                            <span className="flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 animate-pulse text-cyan-200" />
                              EN RUTA DESDE PLANTA 2
                            </span>
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-black">En Carretera</span>
                          </div>
                        )}

                        {truck.status === 'planta_carga' && (
                          <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-t-xl -mx-5 -mt-5 mb-2 flex items-center justify-between shadow-sm">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-200" />
                              EN CARGA EN PLANTA 2 (ENCONTRADO EN BÚSQUEDA)
                            </span>
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-black">Planta 2</span>
                          </div>
                        )}

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
                          <div className="flex items-center justify-between gap-1">
                            <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap"><User className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{truck.driver}</span></p>
                            {truck.phone && (
                              <a
                                href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                                title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                              >
                                <MessageSquare className="w-3 h-3 fill-current" />
                                <span>WSP</span>
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                          <p className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-500">Carga:</span> <span className="text-slate-700 font-semibold">{truck.carrier}</span></p>
                          
                          {truck.status === 'en_ruta' ? (
                            <p className="flex items-center gap-2 text-cyan-800 font-bold">
                              <Clock className="w-4 h-4 text-cyan-600" /> 
                              <span>Despachado P2: {truck.dispatch_time ? new Date(truck.dispatch_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
                            </p>
                          ) : (
                            <p className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400" /> 
                              <span>Programado: {new Date(truck.entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                          )}

                          {truck.scheduled_entry_time && truck.scheduled_end_time && (
                            <p className="text-[10px] text-[#0a5c36] font-bold pl-6">
                              Citación: {new Date(truck.scheduled_entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} - {new Date(truck.scheduled_end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 space-y-1.5">
                          <button
                            onClick={() => handleMoveToYard(truck.id)}
                            className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-[#0a5c36] text-[#0a5c36] hover:text-white border border-[#0a5c36]/20 text-xs py-2.5 rounded-xl font-bold w-full transition-colors active:scale-98 cursor-pointer shadow-sm"
                          >
                            {truck.status === 'en_ruta' || truck.status === 'planta_carga' ? '📥 Registrar Llegada a Patio' : 'Registrar Entrada Patio'}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTruckForTimeline(truck);
                            }}
                            className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-800 font-bold w-full py-1 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5 text-cyan-600" />
                            Ver Trazabilidad
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTrucks.filter(t => t.status === 'cita' || t.status === 'en_ruta' || (searchQuery.trim().length > 0 && t.origin === 'planta_2' && t.status === 'planta_carga')).length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-sm font-semibold">No hay citas ni camiones en ruta</div>
                    )}
                  </div>
                </div>
              
              {/* 2. Columna: Espera en Patio */}
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'espera')}
                className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 flex-col min-h-[500px] ${
                  mobileYardColumn !== 'all' && mobileYardColumn !== 'espera' ? 'hidden md:flex' : 'flex'
                }`}
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
                        <div className="flex items-center justify-between gap-1">
                          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap"><User className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{truck.driver}</span></p>
                          {truck.phone && (
                            <a
                              href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                              title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                            >
                              <MessageSquare className="w-3 h-3 fill-current" />
                              <span>WSP</span>
                            </a>
                          )}
                        </div>
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
                className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-5 flex-col min-h-[500px] ${
                  mobileYardColumn !== 'all' && mobileYardColumn !== 'anden' ? 'hidden md:flex' : 'flex'
                }`}
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
                          <div className="flex items-center justify-between gap-1">
                            <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap"><User className="w-4 h-4 text-slate-400 shrink-0" /> <span className="font-bold text-slate-700">{truck.driver}</span></p>
                            {truck.phone && (
                              <a
                                href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                                title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                              >
                                <MessageSquare className="w-3 h-3 fill-current" />
                                <span>WSP</span>
                              </a>
                            )}
                          </div>
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
                className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-5 flex-col min-h-[500px] ${
                  mobileYardColumn !== 'all' && mobileYardColumn !== 'completado' ? 'hidden md:flex' : 'flex'
                }`}
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
                
                <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                  {(() => {
                    const grouped = getGroupedCompletedTrucks();
                    const dates = Object.keys(grouped);

                    if (dates.length === 0) {
                      return <div className="text-center py-16 text-slate-400 text-sm font-semibold">Sin despachos hoy</div>;
                    }

                    return dates.map(dateStr => (
                      <div key={dateStr} className="space-y-3">
                        {/* Cabecera divisoria del día */}
                        <div className="relative flex items-center justify-center my-4 select-none">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200/80"></div>
                          </div>
                          <span className="relative px-3 py-1 text-[9px] text-slate-500 font-extrabold uppercase bg-slate-100 rounded-full border border-slate-200 shadow-xs">
                            {formatGroupDate(dateStr)}
                          </span>
                        </div>

                        {/* Listado de tarjetas ultra-compactas de este día */}
                        <div className="space-y-2">
                          {grouped[dateStr].map(truck => {
                            const compliance = checkExitCompliance(truck);
                            return (
                              <div 
                                key={truck.id} 
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, truck.id, truck.status)}
                                onClick={() => setSelectedTruckForTimeline(truck)}
                                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-400 p-3 rounded-2xl shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group select-none opacity-95 hover:opacity-100 relative overflow-hidden"
                                title="Haz clic para ver trazabilidad de tiempos y detalles"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${compliance === 'A Tiempo' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-extrabold text-xs text-slate-800 truncate group-hover:text-[#0a5c36]">
                                        {truck.driver}
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                                        {truck.end_time ? new Date(truck.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="font-mono text-[10px] font-extrabold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 border border-slate-200">
                                        TR: {truck.tractor_plate || 'S/T'}
                                      </span>
                                      {truck.dock?.name && (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                          {truck.dock.name}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400 font-semibold truncate">
                                        • {truck.carrier}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevertStatus(truck);
                                    }}
                                    title="Regresar a Andén"
                                    className="p-1 text-slate-300 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                                    className="p-1 text-slate-300 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <Activity className="w-4 h-4 text-slate-400 group-hover:text-[#0a5c36] transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </section>
            </div>
          ) : activeTab === 'planta2' ? (
            
            /* ====================================================
               PESTAÑA: MÓDULO DESPACHO PLANTA 2
               ==================================================== */
            <section className="space-y-6">
              
              {/* Header Banner & KPIs Planta 2 (Expandible / Compactable) */}
              {!isPlanta2HeaderCollapsed ? (
                /* Modo Expandido Completo */
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#08482a] text-white border border-slate-700/60 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all animate-fadeIn">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-inner">
                          <Factory className="w-3.5 h-3.5" />
                          Planta 2 — CiAL Alimentos
                        </span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight text-white">
                        Despacho y Control de Ruta Planta 2
                      </h2>
                      <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
                        Gestión operativa de camiones en Planta 2. Registre despachos directo a ruta sin cita previa y realice el seguimiento continuo de tiempos hasta su arribo y descarga en el Centro de Distribución (Patio).
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => {
                          const now = new Date();
                          setScheduledEntryTime(formatLocalDatetime(now));
                          setShowPlanta2AddModal(true);
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg hover:shadow-cyan-400/25 transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        Ingresar Despacho Planta 2
                      </button>

                      <button
                        onClick={() => togglePlanta2Header(true)}
                        title="Ocultar o compactar este panel"
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white px-3 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-white/10"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Compactar</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                      <div className="text-[10px] text-cyan-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-cyan-400" />
                        En Carga P2
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {trucks.filter(t => t.origin === 'planta_2' && t.status === 'planta_carga').length}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                      <div className="text-[10px] text-blue-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        En Ruta a Patio
                      </div>
                      <div className="text-2xl font-black text-cyan-300 mt-1">
                        {trucks.filter(t => t.origin === 'planta_2' && t.status === 'en_ruta').length}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                      <div className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        En Patio CD
                      </div>
                      <div className="text-2xl font-black text-emerald-300 mt-1">
                        {trucks.filter(t => t.origin === 'planta_2' && (t.status === 'espera' || t.status === 'anden')).length}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
                      <div className="text-[10px] text-purple-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                        Despachados Hoy
                      </div>
                      <div className="text-2xl font-black text-white mt-1">
                        {trucks.filter(t => t.origin === 'planta_2' && t.status === 'completado').length}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Modo Compacto / Oculto */
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#08482a] text-white border border-slate-700/60 rounded-2xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 transition-all animate-fadeIn">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Factory className="w-3 h-3 text-cyan-400" />
                      Planta 2
                    </span>

                    {/* Mini KPI Pills */}
                    <div className="flex items-center gap-1.5">
                      <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[11px] font-bold text-cyan-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <strong className="text-white font-black">{trucks.filter(t => t.origin === 'planta_2' && t.status === 'planta_carga').length}</strong> Carga
                      </span>
                      <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[11px] font-bold text-blue-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        <strong className="text-white font-black">{trucks.filter(t => t.origin === 'planta_2' && t.status === 'en_ruta').length}</strong> Ruta
                      </span>
                      <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <strong className="text-white font-black">{trucks.filter(t => t.origin === 'planta_2' && (t.status === 'espera' || t.status === 'anden')).length}</strong> Patio
                      </span>
                      <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-[11px] font-bold text-purple-200 hidden md:flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        <strong className="text-white font-black">{trucks.filter(t => t.origin === 'planta_2' && t.status === 'completado').length}</strong> Entregados
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const now = new Date();
                        setScheduledEntryTime(formatLocalDatetime(now));
                        setShowPlanta2AddModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-md hover:shadow-cyan-400/25 transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      Ingresar Despacho Planta 2
                    </button>

                    <button
                      onClick={() => togglePlanta2Header(false)}
                      title="Expandir panel de información y métricas"
                      className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/10"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span className="hidden sm:inline">Expandir</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de Columnas Móvil para Planta 2 (md:hidden) */}
              <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
                <button
                  type="button"
                  onClick={() => setMobilePlanta2Column('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobilePlanta2Column === 'all' ? 'bg-[#0a5c36] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Todas ({filteredTrucks.filter(t => t.origin === 'planta_2').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePlanta2Column('planta_carga')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobilePlanta2Column === 'planta_carga' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  1. En Carga ({filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'planta_carga').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePlanta2Column('en_ruta')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobilePlanta2Column === 'en_ruta' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  2. En Ruta ({filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'en_ruta').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePlanta2Column('patio_cd')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobilePlanta2Column === 'patio_cd' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  3. En Patio ({filteredTrucks.filter(t => t.origin === 'planta_2' && (t.status === 'espera' || t.status === 'anden')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePlanta2Column('completado')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mobilePlanta2Column === 'completado' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  4. Entregados ({filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'completado').length})
                </button>
              </div>

              {/* Kanban Board Planta 2 (4 Columnas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* 1. Columna: En Carga (Planta 2) */}
                <div className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 flex-col min-h-[500px] ${
                  mobilePlanta2Column !== 'all' && mobilePlanta2Column !== 'planta_carga' ? 'hidden md:flex' : 'flex'
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                      <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">1. En Carga (Planta 2)</h3>
                    </div>
                    <span className="bg-cyan-100 text-cyan-800 text-xs px-3 py-1 rounded-full font-black shadow-sm">
                      {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'planta_carga').length}
                    </span>
                  </div>

                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'planta_carga')
                      .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
                      .map(truck => (
                      <div 
                        key={truck.id} 
                        className="bg-white border border-cyan-200 p-5 rounded-2xl space-y-3 shadow-sm hover:border-cyan-400 transition-all hover:shadow-md relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="font-mono text-xs bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-cyan-900 font-black tracking-wider">
                              TR: {truck.tractor_plate || 'S/T'}
                            </span>
                            <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wider">
                              R: {truck.trailer_plate || 'S/R'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTruck(truck.id)}
                            title="Eliminar despacho"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-xs space-y-1.5 text-slate-600 font-medium pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-1">
                            <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                              <User className="w-4 h-4 text-slate-400 shrink-0" /> 
                              <span className="font-bold text-slate-800">{truck.driver}</span>
                            </p>
                            {truck.phone && (
                              <a
                                href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                                title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                              >
                                <MessageSquare className="w-3 h-3 fill-current" />
                                <span>WSP</span>
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                          <p className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-500">Carga:</span> <span className="text-slate-700 font-semibold">{truck.carrier}</span></p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-600" /> 
                            <span>Inicio Carga: {new Date(truck.plant_loading_time || truck.entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                        </div>

                        <div className="pt-2 space-y-2">
                          <button
                            onClick={() => handleDispatchPlanta2(truck.id)}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs py-2.5 rounded-xl font-black w-full transition-all active:scale-98 cursor-pointer shadow-md shadow-cyan-600/20"
                          >
                            <Send className="w-3.5 h-3.5" />
                            🚀 Despachar (En Ruta a CD)
                          </button>
                          <button
                            onClick={() => openCargoDocForTruck(truck)}
                            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 text-xs py-2 rounded-xl font-bold w-full transition-all active:scale-98 cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-600" />
                            📄 Control de Carga
                          </button>
                          <button
                            onClick={() => setSelectedTruckForTimeline(truck)}
                            className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 font-bold w-full py-1 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5 text-cyan-600" />
                            Ver Trazabilidad
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'planta_carga').length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs font-semibold">No hay camiones en carga en Planta 2</div>
                    )}
                  </div>
                </div>

                {/* 2. Columna: En Ruta (Camino a Patio CD) */}
                <div className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 flex-col min-h-[500px] ${
                  mobilePlanta2Column !== 'all' && mobilePlanta2Column !== 'en_ruta' ? 'hidden md:flex' : 'flex'
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                      <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">2. En Ruta (Hacia CD)</h3>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-black shadow-sm">
                      {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'en_ruta').length}
                    </span>
                  </div>

                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'en_ruta')
                      .sort((a, b) => new Date(b.dispatch_time || b.entry_time).getTime() - new Date(a.dispatch_time || a.entry_time).getTime())
                      .map(truck => (
                      <div 
                        key={truck.id} 
                        className="bg-gradient-to-b from-blue-50/50 to-white border-2 border-blue-400/60 p-5 rounded-2xl space-y-3 shadow-md hover:border-blue-500 transition-all relative overflow-hidden"
                      >
                        <div className="bg-blue-600 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full flex items-center justify-between shadow-sm">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 animate-bounce" />
                            EN CARRETERA / RUTA
                          </span>
                          <span className="text-[9px] opacity-90">Planta 2 ➔ CD</span>
                        </div>

                        <div className="flex justify-between items-start gap-2 pt-1">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="font-mono text-xs bg-white border border-blue-200 px-2 py-0.5 rounded text-blue-900 font-black tracking-wider">
                              TR: {truck.tractor_plate || 'S/T'}
                            </span>
                            <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wider">
                              R: {truck.trailer_plate || 'S/R'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRevertStatus(truck)}
                            title="Regresar a En Carga"
                            className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-xs space-y-1.5 text-slate-600 font-medium pt-1 border-t border-blue-100">
                          <div className="flex items-center justify-between gap-1">
                            <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                              <User className="w-4 h-4 text-blue-600 shrink-0" /> 
                              <span className="font-bold text-slate-800">{truck.driver}</span>
                            </p>
                            {truck.phone && (
                              <a
                                href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                                title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                              >
                                <MessageSquare className="w-3 h-3 fill-current" />
                                <span>WSP</span>
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                          <p className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-500">Carga:</span> <span className="text-slate-700 font-semibold">{truck.carrier}</span></p>
                          <p className="flex items-center gap-2 text-blue-700 font-bold">
                            <Clock className="w-4 h-4 text-blue-600" /> 
                            <span>Despachado: {truck.dispatch_time ? new Date(truck.dispatch_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
                          </p>
                        </div>

                        <div className="pt-2 space-y-2">
                          <button
                            onClick={() => handleMoveToYard(truck.id)}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 rounded-xl font-bold w-full transition-all cursor-pointer shadow-sm"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            📥 Registrar Llegada a Patio
                          </button>
                          <button
                            onClick={() => openCargoDocForTruck(truck)}
                            className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] py-1.5 rounded-xl font-bold w-full transition-all cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            📄 Control de Carga
                          </button>
                          <button
                            onClick={() => setSelectedTruckForTimeline(truck)}
                            className="flex items-center justify-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-bold w-full py-1 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Ver Trazabilidad
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'en_ruta').length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs font-semibold">No hay camiones en ruta actualmente</div>
                    )}
                  </div>
                </div>

                {/* 3. Columna: En Patio CD / Andén (Seguimiento P2) */}
                <div className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 flex-col min-h-[500px] ${
                  mobilePlanta2Column !== 'all' && mobilePlanta2Column !== 'patio_cd' ? 'hidden md:flex' : 'flex'
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">3. En Patio / Andén</h3>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-black shadow-sm">
                      {filteredTrucks.filter(t => t.origin === 'planta_2' && (t.status === 'espera' || t.status === 'anden')).length}
                    </span>
                  </div>

                  <div className="space-y-4 flex-1 overflow-y-auto">
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && (t.status === 'espera' || t.status === 'anden'))
                      .sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
                      .map(truck => (
                      <div 
                        key={truck.id} 
                        className="bg-white border border-emerald-200 p-5 rounded-2xl space-y-3 shadow-sm hover:border-emerald-400 transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            truck.status === 'anden' 
                              ? 'bg-purple-100 text-purple-900 border-purple-300' 
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {truck.status === 'anden' ? `🏗️ Operando: ${truck.dock?.name || 'Andén'}` : '⏳ Espera en Patio'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">CD Central</span>
                        </div>

                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-extrabold tracking-wider">
                              TR: {truck.tractor_plate || 'S/T'}
                            </span>
                            <span className="font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wider">
                              R: {truck.trailer_plate || 'S/R'}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs space-y-1.5 text-slate-600 font-medium pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-1">
                            <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                              <User className="w-4 h-4 text-slate-400 shrink-0" /> 
                              <span className="font-bold text-slate-800">{truck.driver}</span>
                            </p>
                            {truck.phone && (
                              <a
                                href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs shrink-0"
                                title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                              >
                                <MessageSquare className="w-3 h-3 fill-current" />
                                <span>WSP</span>
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 pl-6">RUT: {truck.rut || 'N/A'} • Tel: {truck.phone || 'N/A'}</p>
                          <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-600" /> <span>Llegada Patio: {new Date(truck.entry_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <button
                            onClick={() => openCargoDocForTruck(truck)}
                            className="flex items-center justify-center gap-1.5 text-[11px] text-cyan-800 hover:text-cyan-950 font-bold w-full py-1 cursor-pointer bg-cyan-50/60 hover:bg-cyan-100/60 rounded-lg transition-all"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-700" />
                            📄 Control de Carga
                          </button>
                          <button
                            onClick={() => setSelectedTruckForTimeline(truck)}
                            className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-900 font-bold w-full py-1 cursor-pointer"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            Ver Trazabilidad Completa
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && (t.status === 'espera' || t.status === 'anden')).length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs font-semibold">No hay camiones de P2 en patio actualmente</div>
                    )}
                  </div>
                </div>

                {/* 4. Columna: Entregados / Completados */}
                <div className={`bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[500px] ${
                  mobilePlanta2Column !== 'all' && mobilePlanta2Column !== 'completado' ? 'hidden md:flex' : 'flex'
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                      <h3 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">4. Entregados P2</h3>
                    </div>
                    <span className="bg-slate-200 text-slate-800 text-xs px-3 py-1 rounded-full font-black shadow-sm">
                      {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'completado').length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'completado')
                      .sort((a, b) => new Date(b.end_time || b.entry_time).getTime() - new Date(a.end_time || a.entry_time).getTime())
                      .map(truck => (
                      <div 
                        key={truck.id} 
                        onClick={() => setSelectedTruckForTimeline(truck)}
                        className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-cyan-400 p-3 rounded-2xl shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between gap-3 group select-none relative overflow-hidden"
                        title="Haz clic para ver trazabilidad de tiempos y detalles"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-xs text-slate-800 truncate group-hover:text-cyan-900">
                                {truck.driver}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                                {truck.end_time ? new Date(truck.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-extrabold bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 border border-slate-200">
                                TR: {truck.tractor_plate || 'S/T'}
                              </span>
                              {truck.trailer_plate && (
                                <span className="font-mono text-[10px] font-bold bg-slate-50 px-1 py-0.2 rounded text-slate-500 border border-slate-200">
                                  R: {truck.trailer_plate}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-semibold truncate">
                                • {truck.carrier}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {truck.phone && (
                            <a
                              href={formatWhatsAppUrl(truck.phone, truck.driver, truck.tractor_plate) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs"
                              title={`Hablar por WhatsApp con ${truck.driver} (${truck.phone})`}
                            >
                              <MessageSquare className="w-3 h-3 fill-current" />
                              <span>WSP</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCargoDocForTruck(truck);
                            }}
                            title="Ver o reimprimir Control de Carga"
                            className="p-1 text-slate-400 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTruck(truck.id);
                            }}
                            title="Eliminar registro"
                            className="p-1 text-slate-300 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Activity className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                    {filteredTrucks.filter(t => t.origin === 'planta_2' && t.status === 'completado').length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs font-semibold">No hay despachos de P2 finalizados hoy</div>
                    )}
                  </div>
                </div>

              </div>
            </section>
          ) : activeTab === 'scheduler' ? (
            
            /* Pestaña: Agendamiento Andenes (Matriz Horaria) */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              
              {/* Barra de Controles Superiores */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900">Planificador Horario de Andenes</h3>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Control Inbound
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">Visualización, fijación de temperatura (Congelado/Refrigerado) y reservas diarias</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Botón Plantilla Semanal y Almuerzo */}
                  <button
                    type="button"
                    onClick={() => setShowRecurringModal(true)}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#0a5c36]" />
                    <span>Plantilla Semanal & Almuerzo</span>
                  </button>

                  {/* Botón Fijar Bloques Horarios por Fecha */}
                  <button
                    type="button"
                    onClick={() => {
                      setRestrictionDate(selectedScheduleDate.toISOString().split('T')[0]);
                      setShowRestrictionModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Fijar Bloque Fecha</span>
                  </button>

                  {/* Control de Navegación de Fecha */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-xs">
                    <button 
                      type="button"
                      onClick={handlePrevDay}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors font-bold text-xs cursor-pointer"
                    >
                      &larr; Ant
                    </button>
                    <input 
                      type="date"
                      value={selectedScheduleDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedScheduleDate(new Date(e.target.value + 'T12:00:00'));
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                    />
                    <button 
                      type="button"
                      onClick={handleNextDay}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors font-bold text-xs cursor-pointer"
                    >
                      Sig &rarr;
                    </button>
                    <button 
                      type="button"
                      onClick={handleSetToday}
                      className="px-2.5 py-1 bg-[#0a5c36] text-white hover:bg-[#08482a] rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ml-0.5"
                    >
                      Hoy
                    </button>
                  </div>
                </div>
              </div>

              {/* Leyenda de Estados y Restricciones */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></span> Citas</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300"></span> En Andén</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300"></span> Recibidos</span>
                  <span className="flex items-center gap-1.5 bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-md font-extrabold">
                    <Snowflake className="w-3 h-3 text-sky-600" />
                    Solo Congelado
                  </span>
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-extrabold">
                    <Thermometer className="w-3 h-3 text-emerald-600" />
                    Solo Refrigerado
                  </span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300"></span> Bloqueado / Mantenimiento</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold hidden lg:inline">
                  💡 Pasa el cursor sobre un bloque libre para fijar tipo o reservar
                </span>
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
                            <select
                              value={dock.status}
                              onChange={(e) => handleUpdateDockStatus(dock.id, e.target.value as any)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0a5c36]/20 transition-all ${
                                dock.status === 'Disponible' 
                                   ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                  : dock.status === 'Ocupado' 
                                  ? 'bg-teal-50 text-teal-700 border-teal-200 animate-pulse hover:bg-teal-100' 
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              }`}
                            >
                              <option value="Disponible">Disponible</option>
                              <option value="Ocupado" disabled={dock.status !== 'Ocupado'}>Ocupado</option>
                              <option value="Mantenimiento">Mantenimiento</option>
                            </select>
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
                            const restriction = getRestrictionForSlot(dock.id, hour, selectedScheduleDate);
                            const isCongeladoOnly = restriction?.restriction_type === 'congelado';
                            const isRefrigeradoOnly = restriction?.restriction_type === 'refrigerado';
                            const isBlocked = restriction?.restriction_type === 'bloqueado';

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

                            if (isBlocked && ops.length === 0) {
                              return (
                                <td 
                                  key={dock.id} 
                                  className="p-2 border-r border-slate-200 last:border-r-0 bg-slate-100/70 text-center relative group min-h-[60px]"
                                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(148, 163, 184, 0.08) 10px, rgba(148, 163, 184, 0.08) 20px)' }}
                                >
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="text-[9px] font-black text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full border border-slate-300">
                                      🚫 Bloqueado
                                    </span>
                                    {restriction?.note && (
                                      <span className="text-[8px] text-slate-400 font-medium truncate max-w-[110px]">{restriction.note}</span>
                                    )}
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/60 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickToggleSlotRestriction(dock.id, hour, selectedScheduleDate, 'mixto')}
                                      className="bg-white hover:bg-slate-100 text-slate-800 px-2 py-1 rounded text-[9px] font-bold shadow-xs cursor-pointer"
                                    >
                                      Desbloquear
                                    </button>
                                  </div>
                                </td>
                              );
                            }

                            let slotBgClass = '';
                            if (isCongeladoOnly) slotBgClass = 'bg-sky-50/30';
                            if (isRefrigeradoOnly) slotBgClass = 'bg-emerald-50/30';

                            return (
                              <td 
                                key={dock.id} 
                                className={`p-2 border-r border-slate-200 last:border-r-0 align-top relative group min-h-[60px] ${slotBgClass}`}
                              >
                                {/* Badge de fijación de temperatura si está configurada */}
                                {(isCongeladoOnly || isRefrigeradoOnly) && (
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 border shadow-2xs ${
                                      isCongeladoOnly 
                                        ? 'bg-sky-100 text-sky-900 border-sky-200' 
                                        : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                    }`}>
                                      {isCongeladoOnly ? <Snowflake className="w-2.5 h-2.5 text-sky-600" /> : <Thermometer className="w-2.5 h-2.5 text-emerald-600" />}
                                      <span>{isCongeladoOnly ? 'Solo Congelado' : 'Solo Refrigerado'}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickToggleSlotRestriction(dock.id, hour, selectedScheduleDate, 'mixto')}
                                      title="Quitar restricción y volver a Mixto"
                                      className="text-slate-300 hover:text-red-500 text-[10px] font-bold px-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}

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
                                                  className="p-0.5 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
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
                                                className="p-0.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          <p className="font-bold truncate text-slate-800">{op.driver}</p>
                                          <p className="text-[9px] text-slate-500 truncate font-semibold">
                                            {op.carrier === 'Congelado' ? '❄️ Congelado' : op.carrier === 'Refrigerado' ? '🥬 Refrigerado' : `📦 ${op.carrier}`} • {op.type}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* Celda Vacía - Hover Agendar Cita & Fijar Restricción Rápida */
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50/95 backdrop-blur-2xs p-1.5 z-10">
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
                                        
                                        // Si el slot tiene fijación de temperatura, setearla por defecto
                                        if (isCongeladoOnly) setCargoType('Congelado');
                                        if (isRefrigeradoOnly) setCargoType('Refrigerado');

                                        setShowAddModal(true);
                                      }}
                                      className="flex items-center gap-1 bg-[#0a5c36] hover:bg-[#08482a] text-white px-2 py-1 rounded-lg text-[9px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer w-full justify-center"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      Reservar
                                    </button>

                                    {/* Selector rápido de fijación de temperatura para este slot */}
                                    <div className="flex items-center justify-center gap-1 w-full pt-0.5 border-t border-slate-200/80">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickToggleSlotRestriction(dock.id, hour, selectedScheduleDate, 'congelado')}
                                        title="Fijar este bloque como Solo Congelado"
                                        className={`px-1.5 py-0.5 rounded text-[9px] transition-colors cursor-pointer ${isCongeladoOnly ? 'bg-sky-200 text-sky-900 font-extrabold' : 'hover:bg-sky-100 text-sky-700 bg-sky-50'}`}
                                      >
                                        ❄️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickToggleSlotRestriction(dock.id, hour, selectedScheduleDate, 'refrigerado')}
                                        title="Fijar este bloque como Solo Refrigerado"
                                        className={`px-1.5 py-0.5 rounded text-[9px] transition-colors cursor-pointer ${isRefrigeradoOnly ? 'bg-emerald-200 text-emerald-900 font-extrabold' : 'hover:bg-emerald-100 text-emerald-700 bg-emerald-50'}`}
                                      >
                                        🥬
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickToggleSlotRestriction(dock.id, hour, selectedScheduleDate, 'bloqueado')}
                                        title="Bloquear este bloque para recepción"
                                        className={`px-1.5 py-0.5 rounded text-[9px] transition-colors cursor-pointer ${isBlocked ? 'bg-red-200 text-red-900 font-extrabold' : 'hover:bg-red-100 text-red-700 bg-red-50'}`}
                                      >
                                        🚫
                                      </button>
                                      {(isCongeladoOnly || isRefrigeradoOnly || isBlocked) && (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickToggleSlotRestriction(dock.id, hour, selectedScheduleDate, 'mixto')}
                                          title="Restablecer a Mixto / Libre"
                                          className="px-1 py-0.5 rounded text-[9px] hover:bg-slate-200 text-slate-600 cursor-pointer"
                                        >
                                          🔄
                                        </button>
                                      )}
                                    </div>
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
                  const matchSearch = !historySearch || [t.driver, t.tractor_plate, t.trailer_plate, t.carrier].some(f => f?.toLowerCase().includes(searchLower));
                  const mappedHistoryStatus = historyStatus === 'en_patio' ? 'espera' : historyStatus === 'en_anden' ? 'anden' : historyStatus;
                  const matchStatus = historyStatus === 'todos' || t.status === mappedHistoryStatus;
                  const matchOp = historyOpType === 'todos' || t.type === historyOpType;
                  const matchCargo = historyCargoType === 'todos' || t.carrier === historyCargoType;
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
                            const appointmentDate = t.scheduled_entry_time ? new Date(t.scheduled_entry_time) : null;
                            const endDate = t.end_time ? new Date(t.end_time) : null;
                            return (
                              <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-800">{t.driver}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{t.carrier || '—'}</p>
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-700">{t.tractor_plate || '—'}</td>
                                <td className="px-4 py-3 font-mono text-slate-500">{t.trailer_plate || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.type === 'Descarga' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-semibold">{t.carrier || '—'}</td>
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

          ) : activeTab === 'reports' ? (

            /* ====================================================
               PESTAÑA: REPORTES DE EFICIENCIA
               ==================================================== */
            (() => {
              const total = trucks.length;
              const completados = trucks.filter(t => t.status === 'completado');
              const enAndenes = trucks.filter(t => t.status === 'anden');
              const enPatio   = trucks.filter(t => t.status === 'espera');
              const citasHoy  = trucks.filter(t => t.status === 'cita');

              // Tiempo promedio en andén (minutos)
              const tiemposAnden = completados
                .filter(t => t.end_time && t.scheduled_entry_time)
                .map(t => (new Date(t.end_time!).getTime() - new Date(t.scheduled_entry_time!).getTime()) / 60000);
              const avgAnden = tiemposAnden.length > 0
                ? Math.round(tiemposAnden.reduce((a, b) => a + b, 0) / tiemposAnden.length)
                : null;

              const cargas    = trucks.filter(t => t.type === 'Carga').length;
              const descargas = trucks.filter(t => t.type === 'Descarga').length;

              const cargaDist: Record<string, number> = {};
              trucks.forEach(t => { const k = t.carrier || 'Sin definir'; cargaDist[k] = (cargaDist[k] || 0) + 1; });

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
                        const activeTruck = trucks.find(t => t.dock_id === dock.id && t.status === 'anden');
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

          ) : activeTab === 'users' ? (
            /* ====================================================
               PESTAÑA: GESTIÓN DE USUARIOS (NEXUS OWNER)
               ==================================================== */
            (() => {
              if (!isNexusOwner) {
                return (
                  <section className="bg-white border border-red-200 rounded-3xl p-10 text-center shadow-sm space-y-4 max-w-xl mx-auto my-12">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
                      <Shield className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900">Acceso Restringido</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      El módulo de <strong>Gestión de Usuarios (Nexus Owner)</strong> está reservado exclusivamente para el Administrador <strong>ariel.mella@cial.cl</strong>. Tu cuenta actual no posee privilegios administrativos para acceder a este panel.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('yard')}
                      className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Volver al Control de Patio</span>
                    </button>
                  </section>
                );
              }

              const cialUsersCount = adminUsers.filter(u => u.email.endsWith('@cial.cl')).length;
              const activeCount = adminUsers.filter(u => !u.is_banned).length;
              const bannedCount = adminUsers.filter(u => u.is_banned).length;
              const recentLoginsCount = adminUsers.filter(u => {
                if (!u.last_sign_in_at) return false;
                const diffDays = (new Date().getTime() - new Date(u.last_sign_in_at).getTime()) / (1000 * 3600 * 24);
                return diffDays <= 7;
              }).length;

              const filteredUsers = adminUsers.filter(u => {
                const roleName = formatUserRole(u.user_metadata?.role || u.app_metadata?.role || u.role);
                const matchesSearch = !userSearchQuery.trim() || 
                  u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  roleName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
                
                let matchesDomain = true;
                if (userDomainFilter === 'cial') {
                  matchesDomain = u.email.toLowerCase().endsWith('@cial.cl');
                } else if (userDomainFilter === 'other') {
                  matchesDomain = !u.email.toLowerCase().endsWith('@cial.cl');
                }

                let matchesStatus = true;
                if (userStatusFilter === 'active') {
                  matchesStatus = !u.is_banned;
                } else if (userStatusFilter === 'banned') {
                  matchesStatus = u.is_banned;
                }

                return matchesSearch && matchesDomain && matchesStatus;
              });

              return (
                <section className="space-y-5">
                  {/* Header del Módulo */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-md">
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900">Control de Usuarios & Accesos</h2>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Nexus Owner
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">
                            Monitoreo de cuentas activas, restablecimiento directo de contraseñas y permisos
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={fetchAdminUsers}
                        disabled={loadingAdminUsers}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        title="Refrescar lista de usuarios"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminUsers ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewUserEmail('');
                          setNewUserPassword('Cial2026!');
                          setCreateUserError(null);
                          setCreateUserSuccess(null);
                          setShowCreateUserModal(true);
                        }}
                        className="flex items-center gap-2 bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md shadow-[#0a5c36]/20 transition-all active:scale-95 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Crear Usuario</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Usuarios</span>
                        <p className="text-2xl font-black text-slate-900 mt-1">{adminUsers.length}</p>
                        <span className="text-[10px] text-emerald-600 font-bold">En base de datos</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Cuentas @cial.cl</span>
                        <p className="text-2xl font-black text-emerald-700 mt-1">{cialUsersCount}</p>
                        <span className="text-[10px] text-slate-400 font-semibold">Acceso corporativo</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Activos Últimos 7 Días</span>
                        <p className="text-2xl font-black text-cyan-700 mt-1">{recentLoginsCount}</p>
                        <span className="text-[10px] text-cyan-600 font-bold">Sesiones recientes</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Estado Acceso</span>
                        <p className="text-2xl font-black text-slate-900 mt-1">{activeCount} / {bannedCount}</p>
                        <span className="text-[10px] text-slate-500 font-semibold">{activeCount} habilitados · {bannedCount} bloqueados</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                        <KeyRound className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Barra de Filtros */}
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-wrap gap-3 items-center justify-between">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar por correo electrónico o rol..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs w-full font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setUserDomainFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            userDomainFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Todos los Dominios
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserDomainFilter('cial')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            userDomainFilter === 'cial' ? 'bg-[#0a5c36] text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Solo @cial.cl
                        </button>
                      </div>

                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36] cursor-pointer"
                      >
                        <option value="all">Estado: Todos</option>
                        <option value="active">Estado: Habilitados</option>
                        <option value="banned">Estado: Bloqueados</option>
                      </select>
                    </div>
                  </div>

                  {/* Tabla de Usuarios */}
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            <th className="py-4 px-6">Usuario / Correo</th>
                            <th className="py-4 px-6">Rol / Permiso</th>
                            <th className="py-4 px-6">Último Inicio de Sesión</th>
                            <th className="py-4 px-6">Fecha Registro</th>
                            <th className="py-4 px-6 text-center">Estado</th>
                            <th className="py-4 px-6 text-right">Acciones Owner</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredUsers.map((u) => {
                            const isCial = u.email.toLowerCase().endsWith('@cial.cl');
                            const isOwner = isUserOwner(u.email);

                            return (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                      isOwner ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                      isCial ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {u.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-slate-800 text-xs truncate">
                                          {u.email}
                                        </span>
                                        {isOwner && (
                                          <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-300">
                                            Owner
                                          </span>
                                        )}
                                        {isCial && !isOwner && (
                                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-emerald-200">
                                            CiAL
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                        ID: {u.id.slice(0, 13)}...
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-xl text-[11px] border ${
                                    isOwner ? 'bg-amber-50 text-amber-900 border-amber-200' : 'text-slate-700 bg-slate-100 border-slate-200'
                                  }`}>
                                    {isOwner ? <Crown className="w-3 h-3 text-amber-500" /> : <Shield className="w-3 h-3 text-[#0a5c36]" />}
                                    {isOwner ? 'Administrador' : formatUserRole(u.user_metadata?.role || u.app_metadata?.role || u.role)}
                                  </span>
                                </td>

                                <td className="py-4 px-6">
                                  {u.last_sign_in_at ? (
                                    <div>
                                      <span className="font-bold text-slate-700 block">
                                        {new Date(u.last_sign_in_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-semibold font-mono">
                                        {new Date(u.last_sign_in_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-medium italic text-[11px]">Sin registros</span>
                                  )}
                                </td>

                                <td className="py-4 px-6 text-slate-500 font-semibold">
                                  {new Date(u.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>

                                <td className="py-4 px-6 text-center">
                                  {u.is_banned ? (
                                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-black">
                                      <UserX className="w-3 h-3" />
                                      Bloqueado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black">
                                      <UserCheck className="w-3 h-3" />
                                      Activo
                                    </span>
                                  )}
                                </td>

                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Botón Cambiar Contraseña */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedUserForPassword(u);
                                        setAdminNewPassword('');
                                        setAdminConfirmPassword('');
                                        setAdminPasswordError(null);
                                        setAdminPasswordSuccess(null);
                                        setShowAdminPasswordPlain(false);
                                      }}
                                      className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                                      title="Cambiar contraseña de este usuario directamente"
                                    >
                                      <KeyRound className="w-3.5 h-3.5 text-sky-600" />
                                      <span>Cambiar Clave</span>
                                    </button>

                                    {/* Botón Bloquear / Desbloquear (no permitido para Owner) */}
                                    {!isOwner ? (
                                      <button
                                        type="button"
                                        onClick={() => handleAdminToggleBan(u)}
                                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                          u.is_banned
                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                        }`}
                                        title={u.is_banned ? 'Desbloquear acceso' : 'Bloquear acceso'}
                                      >
                                        {u.is_banned ? <LockOpen className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                      </button>
                                    ) : (
                                      <span className="p-1.5 opacity-30 cursor-not-allowed" title="No es posible bloquear al Administrador Owner">
                                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {filteredUsers.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                                {loadingAdminUsers ? 'Cargando usuarios desde Supabase...' : 'No se encontraron usuarios que coincidan con la búsqueda.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              );
            })()

          ) : null}
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
                    onChange={(e) => handleDriverRutChange(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36]"
                    required
                  />
                  {matchedDriverByRut ? (
                    <div className="mt-1 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Chofer registrado: <strong>{matchedDriverByRut.name}</strong></span>
                    </div>
                  ) : cleanRutKey(driverRut).length >= 7 ? (
                    <div className="mt-1 text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Nuevo chofer (creación fantasma automática)</span>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Teléfono {matchedDriverByRut && <span className="text-[10px] text-emerald-600 font-bold">(Actualizable)</span>}
                  </label>
                  <input 
                    type="text" 
                    placeholder="56912345678"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white focus:ring-1 focus:ring-[#0a5c36]"
                  />
                  {matchedDriverByRut && (
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Si cambias el celular, se actualizará su ficha en el sistema.
                    </span>
                  )}
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

              {/* Validación Inteligente de Restricción de Bloque Horario */}
              {(() => {
                const selectedDateStr = scheduledEntryTime ? scheduledEntryTime.split('T')[0] : citaDate;
                const selectedHour = scheduledEntryTime ? new Date(scheduledEntryTime).getHours() : (citaTime ? parseInt(citaTime.split(':')[0]) : null);
                const targetDockId = selectedDockIdInModal;
                
                if (selectedHour !== null && targetDockId) {
                  const targetDockName = docks.find(d => d.id === targetDockId)?.name || 'Andén';
                  const restriction = getRestrictionForSlot(targetDockId, selectedHour, new Date(selectedDateStr + 'T12:00:00'));
                  
                  if (restriction && restriction.restriction_type !== 'mixto') {
                    const isCongeladoBlocked = restriction.restriction_type === 'refrigerado' && cargoType === 'Congelado';
                    const isRefrigeradoBlocked = restriction.restriction_type === 'congelado' && cargoType === 'Refrigerado';
                    const isEntirelyBlocked = restriction.restriction_type === 'bloqueado';

                    if (isEntirelyBlocked) {
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-red-900 text-xs animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">⛔ Bloque Horario Bloqueado</p>
                            <p className="text-[11px] text-red-700 mt-0.5">
                              El <strong>{targetDockName}</strong> a las <strong>{selectedHour}:00 hrs</strong> está configurado como Bloqueado para recepción {restriction.note ? `("${restriction.note}")` : ''}.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (isCongeladoBlocked || isRefrigeradoBlocked) {
                      return (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">
                              ⚠️ Restricción de Bloque: {restriction.restriction_type === 'congelado' ? '❄️ Solo Congelado' : '🥬 Solo Refrigerado'}
                            </p>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              El <strong>{targetDockName}</strong> a las <strong>{selectedHour}:00 hrs</strong> está fijado para <strong>{restriction.restriction_type === 'congelado' ? 'Solo Congelado' : 'Solo Refrigerado'}</strong>, pero la carga seleccionada es <strong>"{cargoType}"</strong>.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 flex items-center gap-2 text-sky-900 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="text-[11px] font-semibold">
                          Bloque compatible: {targetDockName} fijado para {restriction.restriction_type === 'congelado' ? '❄️ Solo Congelado' : '🥬 Solo Refrigerado'}.
                        </span>
                      </div>
                    );
                  }
                }
                return null;
              })()}
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
      {/* Modal Ingresar Despacho Planta 2 */}
      {showPlanta2AddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowPlanta2AddModal(false)} />
          
          <form 
            onSubmit={handleAddPlanta2Truck}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg relative z-10 space-y-5 shadow-2xl text-slate-800 animate-fadeIn"
          >
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-cyan-200">
                  Planta 2
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Ingreso Directo sin Cita</span>
              </div>
              <h3 className="font-extrabold text-xl text-slate-900 mt-1">Ingresar Despacho — Planta 2</h3>
              <p className="text-xs text-slate-500 font-semibold">Registra el inicio de carga del camión en Planta 2 para envío a Patio CD.</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* Chofer */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Conductor / Chofer</label>
                <select 
                  value={selectedDriverId} 
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                  required
                >
                  <option value="">-- Seleccionar Chofer Registrado --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.rut})</option>
                  ))}
                  <option value="manual">+ Ingresar Chofer Manualmente</option>
                </select>

                {selectedDriverId === 'manual' && (
                  <div className="mt-3">
                    <input 
                      type="text" 
                      placeholder="Nombre Completo Chofer *"
                      value={manualDriverName}
                      onChange={(e) => setManualDriverName(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full font-bold focus:outline-none focus:border-[#0a5c36]"
                      required={selectedDriverId === 'manual'}
                    />
                  </div>
                )}

                {/* RUT y Teléfono siempre visibles y editables */}
                <div className="grid grid-cols-2 gap-2 mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">RUT Chofer</label>
                    <input 
                      type="text" 
                      placeholder="12.345.678-9"
                      value={driverRut}
                      onChange={(e) => handleDriverRutChange(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0a5c36] w-full"
                    />
                    {matchedDriverByRut ? (
                      <span className="text-[10px] text-emerald-700 font-bold block mt-0.5 truncate">
                        ✓ {matchedDriverByRut.name}
                      </span>
                    ) : cleanRutKey(driverRut).length >= 7 ? (
                      <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                        + Nuevo chofer
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Teléfono {matchedDriverByRut && <span className="text-[9px] text-emerald-600 font-bold">(Actualizable)</span>}
                    </label>
                    <input 
                      type="text" 
                      placeholder="56912345678"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0a5c36] w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Tractor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tractor (Patente)</label>
                {!isManualTractor ? (
                  <div className="flex gap-2">
                    <select 
                      value={selectedTractorId}
                      onChange={(e) => setSelectedTractorId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm flex-1 text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                      required
                    >
                      <option value="">-- Seleccionar Tractor --</option>
                      {vehicles.filter(v => v.type === 'Tractor').map(v => (
                        <option key={v.id} value={v.id}>{v.plate}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setIsManualTractor(true)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                    >
                      Manual
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ej: DRCX-73" 
                      value={manualTractorPlate} 
                      onChange={(e) => setManualTractorPlate(e.target.value)} 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm flex-1 font-bold tracking-wider uppercase focus:outline-none focus:border-[#0a5c36]" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsManualTractor(false)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                    >
                      Lista
                    </button>
                  </div>
                )}
              </div>

              {/* Rampla */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rampla (Opcional)</label>
                {!isManualTrailer ? (
                  <div className="flex gap-2">
                    <select 
                      value={selectedTrailerId}
                      onChange={(e) => setSelectedTrailerId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm flex-1 text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36]"
                    >
                      <option value="">-- Sin Rampla / Seleccionar --</option>
                      {vehicles.filter(v => v.type === 'Rampla').map(v => (
                        <option key={v.id} value={v.id}>{v.plate}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => setIsManualTrailer(true)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                    >
                      Manual
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ej: PWWK-59" 
                      value={manualTrailerPlate} 
                      onChange={(e) => setManualTrailerPlate(e.target.value)} 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm flex-1 font-bold tracking-wider uppercase focus:outline-none focus:border-[#0a5c36]" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsManualTrailer(false)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                    >
                      Lista
                    </button>
                  </div>
                )}
              </div>

              {/* Tipo de Carga */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Carga</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Semi Elaborado', 'Refrigerado', 'Congelado', 'Otro'].map(type => (
                    <button 
                      type="button"
                      key={type}
                      onClick={() => setCargoType(type)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${cargoType === type ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-extrabold shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {cargoType === 'Otro' && (
                  <input 
                    type="text" 
                    placeholder="Especifique tipo de carga..."
                    value={customCargoType}
                    onChange={(e) => setCustomCargoType(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] mt-2"
                    required={cargoType === 'Otro'}
                  />
                )}
              </div>

              {/* Botón para Abrir Control de Carga con Vista Previa Directa */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={openCargoDocFromAddModal}
                  className="flex items-center justify-between w-full p-3 rounded-2xl bg-gradient-to-r from-cyan-50 via-emerald-50 to-cyan-50 border-2 border-cyan-400 hover:border-cyan-600 text-cyan-950 font-black text-xs transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-xs text-slate-900">
                        Datos extras Control de Carga (Kilos, Sellos, Embalajes)
                      </span>
                      <span className="block text-[10px] text-cyan-800 font-semibold mt-0.5">
                        Abre la hoja oficial con vista previa en vivo para completar e imprimir
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white px-3.5 py-1.5 rounded-xl font-black shadow-sm flex items-center gap-1.5 shrink-0 ml-2">
                    Completar ahora ➔
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-2.5 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowPlanta2AddModal(false)}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors hover:bg-slate-100 cursor-pointer order-last sm:order-first"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                onClick={(e) => handleAddPlanta2Truck(e, false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition-all cursor-pointer shadow-sm"
              >
                🏭 Registrar Carga
              </button>
              <button 
                type="button"
                onClick={openCargoDocFromAddModal}
                className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition-all cursor-pointer shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📄 Control de Carga con Vista Previa</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Trazabilidad & Timeline de Tiempos del Camión */}
      {selectedTruckForTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity" 
            onClick={() => setSelectedTruckForTimeline(null)}
          />
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-2xl relative z-10 space-y-6 shadow-2xl text-slate-800 animate-fadeIn">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                    selectedTruckForTimeline.origin === 'planta_2' 
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-200' 
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {selectedTruckForTimeline.origin === 'planta_2' ? '🏭 Origen: Planta 2' : '🏢 Origen: Patio CD Directo'}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    ID: {selectedTruckForTimeline.id.slice(0, 8)}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-slate-900 mt-2">
                  Trazabilidad de Tiempos del Camión
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Seguimiento del comportamiento operativo y tiempos transcurridos en cada etapa
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedTruckForTimeline(null);
                  setIsEditingTimelinePhone(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Ficha Resumen Camión */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Chofer / Identificación</span>
                <div className="mt-0.5">
                  <span className="font-extrabold text-slate-800 block">{selectedTruckForTimeline.driver}</span>
                  {selectedTruckForTimeline.rut && (
                    <span className="text-[10px] font-mono text-slate-500 font-semibold block">
                      RUT: {selectedTruckForTimeline.rut}
                    </span>
                  )}
                  
                  {!isEditingTimelinePhone ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {selectedTruckForTimeline.phone || 'Sin celular'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTimelinePhoneInput(selectedTruckForTimeline.phone || '');
                          setIsEditingTimelinePhone(true);
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                        title="Actualizar celular del chofer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {selectedTruckForTimeline.phone && (
                        <a
                          href={formatWhatsAppUrl(selectedTruckForTimeline.phone, selectedTruckForTimeline.driver, selectedTruckForTimeline.tractor_plate) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-0.5 rounded-lg text-[9px] font-black transition-all cursor-pointer shadow-xs"
                          title={`Hablar por WhatsApp con ${selectedTruckForTimeline.driver} (${selectedTruckForTimeline.phone})`}
                        >
                          <MessageSquare className="w-3 h-3 fill-current" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={timelinePhoneInput}
                          onChange={(e) => setTimelinePhoneInput(e.target.value)}
                          placeholder="56912345678"
                          className="bg-white border border-emerald-500 rounded-lg px-2 py-0.5 text-xs font-mono text-slate-800 w-28 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={savingTimelinePhone}
                          onClick={handleSaveTimelinePhone}
                          className="bg-[#0a5c36] hover:bg-[#08482a] text-white text-[10px] font-bold px-2 py-1 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {savingTimelinePhone ? '...' : 'OK'}
                        </button>
                        <button
                          type="button"
                          disabled={savingTimelinePhone}
                          onClick={() => setIsEditingTimelinePhone(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold px-1.5 py-1 rounded-lg cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-[9px] text-emerald-700 font-semibold block leading-tight">
                        Se actualizará en ticket y chofer
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tractor / Rampla</span>
                <span className="font-mono font-extrabold text-slate-800">
                  {selectedTruckForTimeline.tractor_plate || '—'} / {selectedTruckForTimeline.trailer_plate || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Carga</span>
                <span className="font-bold text-slate-700">{selectedTruckForTimeline.carrier}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Estado Actual</span>
                <span className="font-extrabold text-[#0a5c36] uppercase">{selectedTruckForTimeline.status}</span>
              </div>
            </div>

            {/* Visual Timeline (Línea de Tiempo Operativa) */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0a5c36]" />
                Línea de Tiempo de Operación
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                
                {/* 1. Inicio Carga en Planta 2 */}
                {selectedTruckForTimeline.origin === 'planta_2' && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                      1
                    </div>
                    <div className="bg-cyan-50/60 border border-cyan-200 p-3.5 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                          <Factory className="w-3.5 h-3.5 text-cyan-600" />
                          Inicio Carga en Planta 2
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {selectedTruckForTimeline.plant_loading_time || selectedTruckForTimeline.entry_time
                            ? new Date(selectedTruckForTimeline.plant_loading_time || selectedTruckForTimeline.entry_time).toLocaleString('es-CL')
                            : '—'}
                        </div>
                      </div>
                      {selectedTruckForTimeline.dispatch_time && (
                        <div className="text-right">
                          <span className="text-[10px] text-cyan-700 font-bold block">Tiempo Carga P2</span>
                          <span className="text-xs font-black text-cyan-900">
                            {formatDurationMs(new Date(selectedTruckForTimeline.dispatch_time).getTime() - new Date(selectedTruckForTimeline.plant_loading_time || selectedTruckForTimeline.entry_time).getTime())}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Despacho Salida Planta 2 */}
                {selectedTruckForTimeline.origin === 'planta_2' && (
                  <div className="relative">
                    <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                      selectedTruckForTimeline.dispatch_time ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      2
                    </div>
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      selectedTruckForTimeline.dispatch_time ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                      <div>
                        <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-blue-600" />
                          Despachado (Salida Planta 2 en Ruta)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {selectedTruckForTimeline.dispatch_time
                            ? new Date(selectedTruckForTimeline.dispatch_time).toLocaleString('es-CL')
                            : 'Pendiente de despacho'}
                        </div>
                      </div>
                      {selectedTruckForTimeline.dispatch_time && selectedTruckForTimeline.status !== 'en_ruta' && (
                        <div className="text-right">
                          <span className="text-[10px] text-blue-700 font-bold block">Tiempo en Ruta</span>
                          <span className="text-xs font-black text-blue-900">
                            {formatDurationMs(new Date(selectedTruckForTimeline.entry_time).getTime() - new Date(selectedTruckForTimeline.dispatch_time).getTime())}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Llegada a Patio CD */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                    selectedTruckForTimeline.status !== 'cita' && selectedTruckForTimeline.status !== 'planta_carga' && selectedTruckForTimeline.status !== 'en_ruta'
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedTruckForTimeline.origin === 'planta_2' ? '3' : '1'}
                  </div>
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    selectedTruckForTimeline.status !== 'cita' && selectedTruckForTimeline.status !== 'planta_carga' && selectedTruckForTimeline.status !== 'en_ruta'
                      ? 'bg-emerald-50/60 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <div>
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Llegada Registrada a Patio CD
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selectedTruckForTimeline.status !== 'cita' && selectedTruckForTimeline.status !== 'planta_carga' && selectedTruckForTimeline.status !== 'en_ruta'
                          ? new Date(selectedTruckForTimeline.entry_time).toLocaleString('es-CL')
                          : 'En tránsito o pendiente de llegada'}
                      </div>
                    </div>
                    {selectedTruckForTimeline.start_time && (
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-700 font-bold block">Tiempo Espera Patio</span>
                        <span className="text-xs font-black text-emerald-900">
                          {formatDurationMs(new Date(selectedTruckForTimeline.start_time).getTime() - new Date(selectedTruckForTimeline.entry_time).getTime())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Inicio Descarga en Andén */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                    selectedTruckForTimeline.start_time ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedTruckForTimeline.origin === 'planta_2' ? '4' : '2'}
                  </div>
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    selectedTruckForTimeline.start_time ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <div>
                      <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        Inicio de Descarga en {selectedTruckForTimeline.dock?.name || 'Andén'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selectedTruckForTimeline.start_time
                          ? new Date(selectedTruckForTimeline.start_time).toLocaleString('es-CL')
                          : 'Pendiente de asignación a andén'}
                      </div>
                    </div>
                    {selectedTruckForTimeline.end_time && selectedTruckForTimeline.start_time && (
                      <div className="text-right">
                        <span className="text-[10px] text-purple-700 font-bold block">Tiempo Descarga</span>
                        <span className="text-xs font-black text-purple-900">
                          {formatDurationMs(new Date(selectedTruckForTimeline.end_time).getTime() - new Date(selectedTruckForTimeline.start_time).getTime())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Término Descarga & Salida */}
                <div className="relative">
                  <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${
                    selectedTruckForTimeline.end_time ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {selectedTruckForTimeline.origin === 'planta_2' ? '5' : '3'}
                  </div>
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    selectedTruckForTimeline.end_time ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                        Término de Operación & Salida
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selectedTruckForTimeline.end_time
                          ? new Date(selectedTruckForTimeline.end_time).toLocaleString('es-CL')
                          : 'En proceso'}
                      </div>
                    </div>
                    {selectedTruckForTimeline.end_time && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-600 font-bold block">Ciclo Total</span>
                        <span className="text-xs font-black text-slate-900">
                          {formatDurationMs(
                            new Date(selectedTruckForTimeline.end_time).getTime() - 
                            new Date(selectedTruckForTimeline.plant_loading_time || selectedTruckForTimeline.entry_time).getTime()
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {selectedTruckForTimeline.origin === 'planta_2' ? (
                <button
                  type="button"
                  onClick={() => {
                    const truck = selectedTruckForTimeline;
                    setSelectedTruckForTimeline(null);
                    openCargoDocForTruck(truck);
                  }}
                  className="flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <FileText className="w-4 h-4 text-cyan-700" />
                  <span>📄 Ver / Imprimir Control de Carga</span>
                </button>
              ) : <div />}

              <button
                onClick={() => {
                  setSelectedTruckForTimeline(null);
                  setIsEditingTimelinePhone(false);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Cerrar Trazabilidad
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Modificar Contraseña */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            onClick={() => { setShowChangePasswordModal(false); setPasswordError(null); setPasswordSuccess(null); }} 
          />
          
          <form 
            onSubmit={handleChangePassword}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md relative z-10 space-y-5 shadow-2xl text-slate-800 animate-fadeIn"
          >
            <div className="border-b border-slate-100 pb-3">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200">
                Seguridad de la Cuenta
              </span>
              <h3 className="font-extrabold text-xl text-slate-900 mt-1">Modificar Contraseña</h3>
              <p className="text-xs text-slate-500 font-semibold">Ingrese su nueva contraseña para actualizar el acceso.</p>
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-bold animate-fadeIn">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold animate-fadeIn">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                <input 
                  type="password" 
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  placeholder="Repita la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="pt-3 flex gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => { setShowChangePasswordModal(false); setPasswordError(null); setPasswordSuccess(null); }}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSubmittingPassword}
                className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition-all cursor-pointer shadow-md shadow-[#0a5c36]/20"
              >
                {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Fijación de Bloques Horarios (Congelado / Refrigerado / Mixto / Bloqueado) */}
      {showRestrictionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRestrictionModal(false)}></div>
          
          <form 
            onSubmit={handleSaveBulkRestriction}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 w-full max-w-lg relative z-10 space-y-5 shadow-2xl text-slate-800 animate-fadeIn"
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-xs">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-lg text-slate-900">Fijar Bloques por Temperatura</h3>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Establece restricciones de carga (Congelado / Refrigerado / Bloqueo) para horas y andenes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRestrictionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Aplicación</label>
                <input 
                  type="date"
                  value={restrictionDate}
                  onChange={(e) => setRestrictionDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  required
                />
              </div>

              {/* Andén */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Andén Destino</label>
                <select
                  value={restrictionDockId}
                  onChange={(e) => setRestrictionDockId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white cursor-pointer"
                >
                  <option value="todos">🌟 Todos los Andenes (1 al {docks.length || 5})</option>
                  {docks.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
                  ))}
                </select>
              </div>

              {/* Rango de Horas */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hora Inicio</label>
                  <select
                    value={restrictionStartHour}
                    onChange={(e) => setRestrictionStartHour(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 hrs</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Hora Término</label>
                  <select
                    value={restrictionEndHour}
                    onChange={(e) => setRestrictionEndHour(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 hrs</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo de Fijación de Temperatura */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Restricción de Carga</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRestrictionTypeSelected('congelado')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      restrictionTypeSelected === 'congelado'
                        ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm ring-2 ring-sky-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-sky-50/50'
                    }`}
                  >
                    <Snowflake className="w-5 h-5 text-sky-600" />
                    <span className="text-xs font-extrabold">❄️ Solo Congelado</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Solo recepción congelados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestrictionTypeSelected('refrigerado')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      restrictionTypeSelected === 'refrigerado'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-emerald-50/50'
                    }`}
                  >
                    <Thermometer className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-extrabold">🥬 Solo Refrigerado</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Solo recepción refrigerados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestrictionTypeSelected('mixto')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      restrictionTypeSelected === 'mixto'
                        ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-sm ring-2 ring-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="w-5 h-5 text-slate-600" />
                    <span className="text-xs font-extrabold">🔄 Mixto / Libre</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Admite todo tipo de carga</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRestrictionTypeSelected('bloqueado')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      restrictionTypeSelected === 'bloqueado'
                        ? 'bg-red-50 border-red-400 text-red-900 shadow-sm ring-2 ring-red-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-red-50/50'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-xs font-extrabold">🚫 Bloquear Horario</span>
                    <span className="text-[10px] text-slate-400 font-semibold">No disponible para recepción</span>
                  </button>
                </div>
              </div>

              {/* Nota / Motivo */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Motivo / Observación (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Cámara de congelado al límite, mantenimiento..."
                  value={restrictionNote}
                  onChange={(e) => setRestrictionNote(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-3 flex gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowRestrictionModal(false)}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={savingRestriction}
                className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition-all cursor-pointer shadow-md shadow-[#0a5c36]/20"
              >
                {savingRestriction ? 'Guardando...' : 'Aplicar Restricción'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Plantilla Semanal y Hora de Almuerzo */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRecurringModal(false)}></div>
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 w-full max-w-2xl relative z-10 space-y-5 shadow-2xl text-slate-800 animate-fadeIn max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-[#0a5c36] text-white shadow-xs">
                    <UtensilsCrossed className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-lg text-slate-900">Plantilla Semanal & Configuración</h3>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Reglas predeterminadas automáticas por día de la semana y horario de colación
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecurringModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Pestañas del Modal */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setRecurringModalTab('semanal')}
                className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  recurringModalTab === 'semanal'
                    ? 'border-[#0a5c36] text-[#0a5c36]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                📅 Reglas por Día (Lunes a Viernes)
              </button>
              <button
                type="button"
                onClick={() => setRecurringModalTab('almuerzo')}
                className={`pb-2.5 px-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  recurringModalTab === 'almuerzo'
                    ? 'border-[#0a5c36] text-[#0a5c36]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                🍱 Hora de Almuerzo Operativo
              </button>
            </div>

            {recurringModalTab === 'semanal' ? (
              <div className="space-y-5">
                {/* Selector de Día de la Semana */}
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
                  {[
                    { day: 1, label: 'Lunes' },
                    { day: 2, label: 'Martes' },
                    { day: 3, label: 'Miércoles' },
                    { day: 4, label: 'Jueves' },
                    { day: 5, label: 'Viernes' },
                    { day: 6, label: 'Sábado' },
                    { day: 0, label: 'Domingo' }
                  ].map(d => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setSelectedDayTab(d.day)}
                      className={`flex-1 min-w-[70px] py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                        selectedDayTab === d.day
                          ? 'bg-[#0a5c36] text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white/60'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Lista de reglas activas para el día seleccionado */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Reglas activas para los {[
                        'Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'
                      ][selectedDayTab]}:
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {recurringRules.filter(r => r.day_of_week === selectedDayTab).length} regla(s)
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {recurringRules
                      .filter(r => r.day_of_week === selectedDayTab)
                      .sort((a, b) => a.hour - b.hour)
                      .map((rule, idx) => {
                        const dockName = rule.dock_id ? (docks.find(d => d.id === rule.dock_id)?.name || 'Andén') : 'Todos los Andenes';
                        let tagBg = 'bg-slate-100 text-slate-800 border-slate-200';
                        let tagLabel = 'Mixto';
                        if (rule.restriction_type === 'congelado') {
                          tagBg = 'bg-sky-50 text-sky-900 border-sky-200';
                          tagLabel = '❄️ Solo Congelado';
                        } else if (rule.restriction_type === 'refrigerado') {
                          tagBg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
                          tagLabel = '🥬 Solo Refrigerado';
                        } else if (rule.restriction_type === 'bloqueado') {
                          tagBg = 'bg-red-50 text-red-900 border-red-200';
                          tagLabel = '🚫 Bloqueado';
                        }

                        return (
                          <div 
                            key={rule.id || `${rule.day_of_week}-${rule.hour}-${idx}`}
                            className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-xs font-black bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-800 shadow-2xs">
                                {rule.hour.toString().padStart(2, '0')}:00 hrs
                              </span>
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${tagBg}`}>
                                {tagLabel}
                              </span>
                              <div className="min-w-0">
                                <span className="text-[11px] font-bold text-slate-700 block truncate">
                                  {dockName}
                                </span>
                                {rule.note && (
                                  <span className="text-[10px] text-slate-400 font-medium truncate block">
                                    {rule.note}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteRecurringRule(rule)}
                              title="Eliminar regla predeterminada"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                    {recurringRules.filter(r => r.day_of_week === selectedDayTab).length === 0 && (
                      <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-semibold">
                        Sin restricciones fijadas para este día (Recepción libre/mixta)
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulario para agregar nueva regla recurrente */}
                <form onSubmit={handleAddRecurringRule} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[10px] font-extrabold text-[#0a5c36] uppercase tracking-wider block">
                    + Agregar Regla a los {['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'][selectedDayTab]}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Hora</label>
                      <select
                        value={newRuleHour}
                        onChange={(e) => setNewRuleHour(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                      >
                        {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                          <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 hrs</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipo Restricción</label>
                      <select
                        value={newRuleType}
                        onChange={(e) => setNewRuleType(e.target.value as RestrictionType)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                      >
                        <option value="congelado">❄️ Solo Congelado</option>
                        <option value="refrigerado">🥬 Solo Refrigerado</option>
                        <option value="bloqueado">🚫 Bloqueado</option>
                        <option value="mixto">🔄 Mixto / Libre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Andén</label>
                      <select
                        value={newRuleDockId}
                        onChange={(e) => setNewRuleDockId(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                      >
                        <option value="todos">Todos los Andenes</option>
                        {docks.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <input 
                      type="text" 
                      placeholder="Motivo / Nota de la regla (Opcional)..."
                      value={newRuleNote}
                      onChange={(e) => setNewRuleNote(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0a5c36]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      Guardar Regla
                    </button>
                  </div>
                </form>

                {/* Botón Restablecer */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetToCialDefaults}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restablecer reglas predeterminadas CiAL (Lun-Vie)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRecurringModal(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Listo
                  </button>
                </div>
              </div>
            ) : (
              /* Pestaña: Configuración de Hora de Almuerzo */
              <div className="space-y-5">
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🍱</span>
                      <div>
                        <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Bloqueo de Hora de Almuerzo</h4>
                        <p className="text-[11px] text-amber-700 font-medium">
                          Bloquea automáticamente la recepción durante el horario de colación en los andenes seleccionados.
                        </p>
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={lunchBreakConfig.enabled}
                        onChange={(e) => handleSaveLunchConfig({ ...lunchBreakConfig, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0a5c36]"></div>
                    </label>
                  </div>
                </div>

                {lunchBreakConfig.enabled && (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Hora de Almuerzo</label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[12, 13, 14].map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => handleSaveLunchConfig({ ...lunchBreakConfig, hour: h })}
                            className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                              lunchBreakConfig.hour === h
                                ? 'bg-[#0a5c36] text-white border-[#0a5c36] shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {h.toString().padStart(2, '0')}:00 hrs
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Días que aplica</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { day: 1, label: 'Lunes' },
                          { day: 2, label: 'Martes' },
                          { day: 3, label: 'Miércoles' },
                          { day: 4, label: 'Jueves' },
                          { day: 5, label: 'Viernes' },
                          { day: 6, label: 'Sábado' },
                          { day: 0, label: 'Domingo' }
                        ].map(d => {
                          const isSelected = lunchBreakConfig.days.includes(d.day);
                          return (
                            <button
                              key={d.day}
                              type="button"
                              onClick={() => {
                                const newDays = isSelected 
                                  ? lunchBreakConfig.days.filter(x => x !== d.day) 
                                  : [...lunchBreakConfig.days, d.day];
                                handleSaveLunchConfig({ ...lunchBreakConfig, days: newDays });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black shadow-2xs'
                                  : 'bg-white text-slate-400 border-slate-200'
                              }`}
                            >
                              {isSelected ? '✓ ' : ''}{d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Andenes afectados</label>
                      <select
                        value={lunchBreakConfig.docks}
                        onChange={(e) => handleSaveLunchConfig({ ...lunchBreakConfig, docks: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs w-full font-bold text-slate-700 focus:outline-none focus:border-[#0a5c36]"
                      >
                        <option value="todos">🌟 Todos los Andenes (1 al {docks.length || 5})</option>
                        {docks.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRecurringModal(false)}
                    className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    Guardar y Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Admin: Cambiar Contraseña de Usuario */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedUserForPassword(null)}></div>
          
          <form 
            onSubmit={handleAdminChangePassword}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 w-full max-w-md relative z-10 space-y-4 shadow-2xl text-slate-800 animate-fadeIn"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-sky-100 text-sky-800">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Cambiar Contraseña</h3>
                  <p className="text-xs text-slate-500 font-semibold">{selectedUserForPassword.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForPassword(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {adminPasswordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adminPasswordError}</span>
              </div>
            )}

            {adminPasswordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{adminPasswordSuccess}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Nueva Contraseña</label>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = 'Cial2026!';
                      setAdminNewPassword(sample);
                      setAdminConfirmPassword(sample);
                      setShowAdminPasswordPlain(true);
                    }}
                    className="text-[10px] text-[#0a5c36] font-bold hover:underline cursor-pointer"
                  >
                    Usar predeterminada (Cial2026!)
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showAdminPasswordPlain ? "text" : "password"} 
                    placeholder="Mínimo 6 caracteres"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPasswordPlain(!showAdminPasswordPlain)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAdminPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Confirmar Nueva Contraseña</label>
                <input 
                  type={showAdminPasswordPlain ? "text" : "password"} 
                  placeholder="Repetir nueva contraseña"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div className="pt-3 flex gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setSelectedUserForPassword(null)}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={savingAdminPassword}
                className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition-all cursor-pointer shadow-md shadow-[#0a5c36]/20"
              >
                {savingAdminPassword ? 'Guardando...' : 'Guardar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Admin: Crear Nuevo Usuario */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateUserModal(false)}></div>
          
          <form 
            onSubmit={handleAdminCreateUser}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 w-full max-w-md relative z-10 space-y-4 shadow-2xl text-slate-800 animate-fadeIn"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-500 font-semibold">Confirmación automática instantánea</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createUserError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}

            {createUserSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{createUserSuccess}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  placeholder="ejemplo.nombre@cial.cl"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Contraseña Inicial</label>
                <div className="relative">
                  <input 
                    type={showNewUserPasswordPlain ? "text" : "password"} 
                    placeholder="Mínimo 6 caracteres"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full text-slate-800 font-bold focus:outline-none focus:border-[#0a5c36] focus:bg-white pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPasswordPlain(!showNewUserPasswordPlain)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewUserPasswordPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Rol / Asignación</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full font-bold text-slate-800 focus:outline-none focus:border-[#0a5c36] focus:bg-white cursor-pointer"
                >
                  <option value="Gestor Inbound">Gestor Inbound</option>
                  <option value="Gestor Planta 2">Gestor Planta 2</option>
                  <option value="Supervisor CD">Supervisor CD</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex gap-3 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex-1 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={creatingUser}
                className="bg-[#0a5c36] hover:bg-[#08482a] text-white px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition-all cursor-pointer shadow-md shadow-[#0a5c36]/20"
              >
                {creatingUser ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Oficial de Control de Carga (Planta 2 a Planta 1) */}
      {showCargoDocModal && selectedTruckForCargoDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={handleCloseCargoDocModal}
          />

          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col relative z-10 shadow-2xl overflow-hidden animate-fadeIn text-slate-800">
            {/* Encabezado del Modal */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 px-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
                  <img src={laPreferidaLogo} alt="La Preferida" className="h-8 w-auto object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 leading-tight">Control de Carga Oficial</h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      selectedTruckForCargoDoc.id === 'draft-p2-new'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-cyan-100 text-cyan-800 border-cyan-200'
                    }`}>
                      {selectedTruckForCargoDoc.id === 'draft-p2-new' ? 'Planta 2 ➔ Planta 1 (Nuevo Despacho)' : 'Planta 2 ➔ Planta 1'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Camión: {cargoDocData.tractorPlate || selectedTruckForCargoDoc.tractor_plate || 'Por ingresar'} • Conductor: {cargoDocData.driver || selectedTruckForCargoDoc.driver || 'Por ingresar'}
                  </p>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCargoDoc}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{selectedTruckForCargoDoc.id === 'draft-p2-new' ? 'Registrar y Guardar' : 'Guardar'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintCargoDoc}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-cyan-600/25 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>{selectedTruckForCargoDoc.id === 'draft-p2-new' ? '🖨️ Registrar e Imprimir' : '🖨️ Imprimir Hoja'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseCargoDocModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mensaje de confirmación al guardar */}
            {cargoDocSaveMsg && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cargoDocSaveMsg}</span>
              </div>
            )}

            {/* Contenido en 2 columnas: Formulario a la izquierda y Vista Previa a la derecha */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              
              {/* Columna Izquierda: Formulario de Edición */}
              <div className="lg:col-span-5 p-6 space-y-4 overflow-y-auto max-h-[78vh]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">Datos del Documento</h4>
                  <span className="text-[11px] font-bold text-cyan-700">Edición en tiempo real</span>
                </div>

                {/* 1. Destino y Ruta */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Destino</label>
                  <input
                    type="text"
                    value={cargoDocData.destino}
                    onChange={(e) => setCargoDocData(prev => ({ ...prev, destino: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setCargoDocData(prev => ({ ...prev, destino: 'Centro Distrib.- P1' }))}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold cursor-pointer transition-colors"
                    >
                      Centro Distrib.- P1
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargoDocData(prev => ({ ...prev, destino: 'PLANTA 1 NCD' }))}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold cursor-pointer transition-colors"
                    >
                      PLANTA 1 NCD
                    </button>
                  </div>
                </div>

                {/* 2. Andén y Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Andén</label>
                    <input
                      type="text"
                      placeholder="Ej: 10"
                      value={cargoDocData.anden}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, anden: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Fecha (DD-MM-YYYY)</label>
                    <input
                      type="text"
                      value={cargoDocData.fecha}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, fecha: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white text-center"
                    />
                  </div>
                </div>

                {/* 3. Conductor y RUT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Conductor</label>
                    <input
                      type="text"
                      value={cargoDocData.driver}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, driver: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">RUT Conductor</label>
                    <input
                      type="text"
                      value={cargoDocData.rut}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, rut: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* 4. Patentes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Patente Tracto</label>
                    <input
                      type="text"
                      value={cargoDocData.tractorPlate}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, tractorPlate: e.target.value.toUpperCase() }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-black font-mono text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Patente Rampla</label>
                    <input
                      type="text"
                      value={cargoDocData.trailerPlate}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, trailerPlate: e.target.value.toUpperCase() }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs w-full font-black font-mono text-slate-800 focus:outline-none focus:border-cyan-600 focus:bg-white text-center"
                    />
                  </div>
                </div>

                {/* 5. Kilos, Doc. Transporte, Sellos */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Despacho & Pesaje
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Kilos</label>
                      <input
                        type="text"
                        placeholder="8.000"
                        value={cargoDocData.kilos}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, kilos: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Doc. Transporte</label>
                      <input
                        type="text"
                        placeholder="3428711"
                        value={cargoDocData.docTransporte}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, docTransporte: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Sellos</label>
                      <input
                        type="text"
                        placeholder="125198"
                        value={cargoDocData.sellos}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, sellos: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">N° de Entrega</label>
                    <input
                      type="text"
                      placeholder="81479576"
                      value={cargoDocData.entregaNum}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, entregaNum: e.target.value }))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>

                {/* 6. Detalles de Embalajes */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Detalle de Embalajes
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Bandejas</label>
                      <input
                        type="text"
                        placeholder="260"
                        value={cargoDocData.bandejas}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, bandejas: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pallet Madera</label>
                      <input
                        type="text"
                        placeholder="0"
                        value={cargoDocData.palletMadera}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, palletMadera: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pallets Plásticos</label>
                      <input
                        type="text"
                        placeholder="25"
                        value={cargoDocData.palletPlasticos}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, palletPlasticos: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Vueltas, Folios SAP y Supervisor */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">N° de Viaje / Vuelta</label>
                    <div className="flex gap-1.5">
                      {['1°', '2°', '3°', '4°', '5°'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCargoDocData(prev => ({ ...prev, vuelta: v }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            cargoDocData.vuelta === v 
                              ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' 
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Folios SAP</label>
                      <input
                        type="text"
                        placeholder="Ej: 601874638"
                        value={cargoDocData.foliosSap}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, foliosSap: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Folios Legales</label>
                      <input
                        type="text"
                        placeholder="Ej: 848762"
                        value={cargoDocData.foliosLegales}
                        onChange={(e) => setCargoDocData(prev => ({ ...prev, foliosLegales: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Supervisor de Carga</label>
                    <input
                      type="text"
                      value={cargoDocData.supervisorName}
                      onChange={(e) => setCargoDocData(prev => ({ ...prev, supervisorName: e.target.value }))}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full font-bold text-slate-800 focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>

              </div>

              {/* Columna Derecha: Vista Previa Real de la Hoja de Impresión */}
              <div className="lg:col-span-7 p-6 bg-slate-200/70 flex flex-col items-center justify-start overflow-y-auto max-h-[78vh]">
                <div className="w-full flex items-center justify-between pb-3 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-cyan-600" />
                    Vista previa exacta para imprimir (Formato Carta)
                  </span>
                  <span className="text-[10px] bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-500 font-mono">
                    1 Hoja
                  </span>
                </div>

                {/* Hoja Blanca con diseño exacto del documento */}
                <div className="bg-white border border-slate-300 shadow-xl p-8 rounded-xl w-full max-w-[620px] transition-all">
                  <ControlDeCargaDocument data={cargoDocData} />
                </div>
              </div>

            </div>

            {/* Footer del Modal */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCloseCargoDocModal}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCargoDoc}
                  className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {selectedTruckForCargoDoc.id === 'draft-p2-new' ? '💾 Registrar Despacho Planta 2' : '💾 Guardar Datos'}
                </button>
                <button
                  type="button"
                  onClick={handlePrintCargoDoc}
                  className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-cyan-600/25 active:scale-95 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>{selectedTruckForCargoDoc.id === 'draft-p2-new' ? '🖨️ Registrar e Imprimir Hoja Oficial' : '🖨️ Imprimir Hoja Oficial'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración y Prueba de Notificaciones Móviles */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            
            {/* Cabecera */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0a5c36] to-[#0d7343] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
                  <Smartphone className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Notificaciones en Celular
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    Alertas en tiempo real para Gestor Inbound
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowNotificationModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              
              {/* Estado de Permiso de Notificación del Sistema */}
              <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {notificationsActive ? (
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <BellOff className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {notificationsActive ? 'Alertas Activadas' : 'Alertas Desactivadas'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {notificationPermission === 'granted' 
                          ? 'Permiso de notificaciones concedido' 
                          : 'Requiere permiso del navegador'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm ${
                      notificationsActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                        : 'bg-[#0a5c36] text-white hover:bg-[#08482a]'
                    }`}
                  >
                    {notificationsActive ? 'Pausar' : 'Activar Alertas'}
                  </button>
                </div>

                {notificationPermission !== 'granted' && (
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                    💡 <strong>Tip:</strong> Al tocar <em>"Activar Alertas"</em>, presiona <strong>"Permitir"</strong> cuando tu celular o navegador te pregunte.
                  </div>
                )}
              </div>

              {/* Modo Guardia en Patio (Keep-Alive con pantalla bloqueada) */}
              <div className={`p-4 rounded-2xl border transition-all ${
                patioModeActive 
                  ? 'bg-emerald-950/5 border-emerald-500/40 ring-1 ring-emerald-500/30' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      patioModeActive ? 'bg-[#0a5c36] text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <Radio className={`w-4 h-4 ${patioModeActive ? 'animate-pulse text-emerald-300' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-850">Modo Guardia en Patio</span>
                        {patioModeActive && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {patioModeActive 
                          ? 'Alerta sonora y vibración habilitadas con pantalla apagada en el bolsillo.' 
                          : 'Evita que el celular congele la conexión al apagar la pantalla.'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePatioMode}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                      patioModeActive
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {patioModeActive ? 'Desactivar' : 'Activar Modo'}
                  </button>
                </div>
              </div>

              {/* Ajuste de Sonido y Vibración */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    {soundActive ? <Volume2 className="w-4 h-4 text-[#0a5c36]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Sonido y Chimes Acústicos</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {soundActive ? 'Reproduce tono WAV en altavoz + vibración' : 'Silencioso (solo visual)'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    soundActive 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  {soundActive ? 'Activado' : 'Silenciado'}
                </button>
              </div>

              {/* Botones de Prueba en Vivo (los 3 tipos solicitados) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
                  Probar Alertas en este Celular
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={handleTestArrival}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group active:scale-98"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">🚛</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Llegada a Patio</div>
                        <div className="text-[10px] text-slate-500 truncate">«Camión [Patente / Chofer] acaba de anunciar llegada a Patio»</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                      Probar
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestAssignment}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-left transition-all cursor-pointer group active:scale-98"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">🚪</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-900">Asignación de Andén</div>
                        <div className="text-[10px] text-slate-500 truncate">«Camión [Patente] asignado al Andén X para descarga»</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                      Probar
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestDelay}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 text-left transition-all cursor-pointer group active:scale-98"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">⚠️</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-amber-900">Alerta de Demora</div>
                        <div className="text-[10px] text-slate-500 truncate">«Camión en Andén X superó el tiempo estimado de descarga»</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                      Probar
                    </span>
                  </button>
                </div>
              </div>

              {/* Guía Desplegable de Configuración de Celular */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPhoneConfigGuide(prev => !prev)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-50/80 border border-amber-200 hover:bg-amber-100/70 text-left transition-all cursor-pointer text-amber-950 font-bold text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚙️</span>
                    <span>¿Por qué no suena con la pantalla apagada? (Solución)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-amber-800 transition-transform ${showPhoneConfigGuide ? 'rotate-180' : ''}`} />
                </button>

                {showPhoneConfigGuide && (
                  <div className="mt-2 p-3.5 rounded-2xl bg-white border border-amber-200 text-slate-700 text-[11px] space-y-2.5 animate-in fade-in duration-150">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      📱 Ajustes obligatorios de Android y iPhone:
                    </div>
                    
                    <div className="space-y-1">
                      <strong className="text-slate-900 block">1. Activar "Modo Guardia en Patio" arriba:</strong>
                      <p className="text-slate-600">
                        Al apagar la pantalla, los teléfonos congelan el navegador para ahorrar batería. Al encender el <strong>Modo Guardia</strong>, el sistema mantiene la conexión activa en segundo plano.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <strong className="text-slate-900 block">2. En Android (Samsung, Xiaomi, Motorola):</strong>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        <li>Mantén presionado el ícono de <strong>Nexus Dock</strong> en la pantalla -&gt; Toca el botón <strong>(i)</strong> de Información.</li>
                        <li>Entra a <strong>Notificaciones</strong> -&gt; Categorías -&gt; Asegúrate de que esté en <strong>«Alerta / Con sonido y vibración»</strong> (no en Silencioso).</li>
                        <li>Entra a <strong>Batería</strong> -&gt; Selecciona <strong>«Sin restricciones»</strong>.</li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <strong className="text-slate-900 block">3. Verificar volumen de Notificaciones:</strong>
                      <p className="text-slate-600">
                        Asegúrate de que el teléfono no esté en modo <em>«No molestar»</em> o con el volumen de notificaciones en cero.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de Instalación PWA */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePromptInstall}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition-all active:scale-98 cursor-pointer shadow-md"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Instalar Nexus Dock en la Pantalla de Inicio</span>
                </button>
              </div>

            </div>

            {/* Pie */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Exclusivo de Impresión (activado por @media print) */}
      {showCargoDocModal && (
        <div id="printable-cargo-doc" className="hidden print:block">
          <ControlDeCargaDocument data={cargoDocData} />
        </div>
      )}
    </div>
  );
}
