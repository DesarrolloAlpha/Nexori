import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bike, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  X,
  ArrowRight,
  Bell,
  Settings,
  BarChart3,
  PieChart,
  Shield,
  ChevronRight,
  MoreVertical,
  Zap,
  Globe,
  Shield as ShieldIcon,
  Clock,
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';
import { apiService } from '@/services/api';
import { socketManager, SocketEvents } from '@/services/socket.manager';
import type { Bike as BikeType, PanicEvent, User } from '@/types';
import type { Minute } from '@/types/minute';
import Loading from '@/components/common/Loading';
import ToastContainer from '@/components/common/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import TicketNotificationIcon from '@/components/common/TicketNotificationIcon';
import './Dashboard.css';

// Tipos para estadísticas procesadas
interface ProcessedStats {
  bikes: {
    total: number;
    inside: number;
    outside: number;
    maintenance: number;
    insidePercentage: number;
    outsidePercentage: number;
    trend: number;
  };
  panic: {
    total: number;
    active: number;
    attended: number;
    resolved: number;
    trend: number;
  };
  minutes: {
    total: number;
    pending: number;
    reviewed: number;
    closed: number;
    trend: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    activePercentage: number;
    trend: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'bike' | 'panic' | 'minute';
  icon: 'checkin' | 'checkout' | 'alert' | 'document';
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  user: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

interface WeeklyData {
  day: string;
  checkIns: number;
  checkOuts: number;
  totalActivity: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

// Custom Tooltip premium
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="modern-tooltip">
        <div className="tooltip-label">{label}</div>
        <div className="tooltip-content">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="tooltip-item">
              <div 
                className="tooltip-indicator" 
                style={{ 
                  background: entry.color || '#0066FF',
                  boxShadow: `0 0 0 3px ${entry.color}20`
                }}
              />
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-value">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ProcessedStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);
  const { toasts, removeToast, success, error: showError } = useToast();
  const navigate = useNavigate();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Formatear tiempo relativo
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace unos segundos';
    if (diffMins === 1) return 'Hace 1 minuto';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  // Procesar estadísticas
  const processStats = useCallback((
    bikesData: BikeType[],
    panicData: PanicEvent[],
    minutesData: Minute[],
    usersData: User[]
  ): ProcessedStats => {
    const bikesInside = bikesData.filter(b => b.status === 'inside').length;
    const bikesOutside = bikesData.filter(b => b.status === 'outside').length;
    const bikesMaintenance = bikesData.filter(b => b.status === 'maintenance').length;
    const bikesTotal = bikesData.length;

    const panicActive = panicData.filter(p => p.status === 'active').length;
    const panicAttended = panicData.filter(p => p.status === 'attended').length;
    const panicResolved = panicData.filter(p => p.status === 'resolved').length;
    const panicTotal = panicData.length;

    const minutesPending = minutesData.filter(m => m.status === 'pending').length;
    const minutesReviewed = minutesData.filter(m => m.status === 'reviewed').length;
    const minutesClosed = minutesData.filter(m => m.status === 'closed').length;
    const minutesTotal = minutesData.length;

    const usersActive = usersData.filter(u => u.isActive).length;
    const usersInactive = usersData.filter(u => !u.isActive).length;
    const usersTotal = usersData.length;

    // Las tendencias requieren datos históricos que aún no están disponibles.
    const bikesTrend = 0;
    const panicTrend = 0;
    const minutesTrend = 0;
    const usersTrend = 0;

    return {
      bikes: {
        total: bikesTotal,
        inside: bikesInside,
        outside: bikesOutside,
        maintenance: bikesMaintenance,
        insidePercentage: bikesTotal > 0 ? Math.round((bikesInside / bikesTotal) * 100) : 0,
        outsidePercentage: bikesTotal > 0 ? Math.round((bikesOutside / bikesTotal) * 100) : 0,
        trend: bikesTrend,
      },
      panic: {
        total: panicTotal,
        active: panicActive,
        attended: panicAttended,
        resolved: panicResolved,
        trend: panicTrend,
      },
      minutes: {
        total: minutesTotal,
        pending: minutesPending,
        reviewed: minutesReviewed,
        closed: minutesClosed,
        trend: minutesTrend,
      },
      users: {
        total: usersTotal,
        active: usersActive,
        inactive: usersInactive,
        activePercentage: usersTotal > 0 ? Math.round((usersActive / usersTotal) * 100) : 0,
        trend: usersTrend,
      },
    };
  }, []);

  // Generar datos semanales
  const generateWeeklyData = useCallback((bikesData: BikeType[]): WeeklyData[] => {
    const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const now = new Date();
    const weekData: WeeklyData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayIndex = date.getDay();
      const dayName = daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1];

      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const checkIns = bikesData.filter(bike => {
        const bikeDate = new Date(bike.createdAt);
        return bikeDate >= dayStart && bikeDate <= dayEnd && bike.status === 'inside';
      }).length;

      const checkOuts = bikesData.filter(bike => {
        const updateDate = bike.updatedAt ? new Date(bike.updatedAt) : new Date(bike.createdAt);
        return updateDate >= dayStart && updateDate <= dayEnd && bike.status === 'outside';
      }).length;

      weekData.push({
        day: dayName,
        checkIns,
        checkOuts,
        totalActivity: checkIns + checkOuts,
      });
    }

    return weekData;
  }, []);

  // Generar datos de categorías
  const generateCategoryData = useCallback((
    panicData: PanicEvent[],
    minutesData: Minute[]
  ): CategoryData[] => {
    const panicActive = panicData.filter(p => p.status === 'active').length;
    const minutesPending = minutesData.filter(m => m.status === 'pending').length;
    const minutesReviewed = minutesData.filter(m => m.status === 'reviewed').length;

    return [
      { name: 'Pánico Activo', value: panicActive, color: '#EF4444' },
      { name: 'Minutas Pendientes', value: minutesPending, color: '#F59E0B' },
      { name: 'Minutas Revisadas', value: minutesReviewed, color: '#3B82F6' },
    ].filter(item => item.value > 0);
  }, []);

  // Generar actividades recientes
  const generateRecentActivities = useCallback((
    bikesData: BikeType[],
    panicData: PanicEvent[],
    minutesData: Minute[]
  ): RecentActivity[] => {
    const activities: RecentActivity[] = [];

    const recentCheckIns = [...bikesData]
      .filter(bike => bike.status === 'inside')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map(bike => ({
        id: `bike-in-${bike.id}`,
        type: 'bike' as const,
        icon: 'checkin' as const,
        title: 'Bicicleta ingresada',
        description: `Serie ${bike.serialNumber} - ${bike.brand} ${bike.model}`,
        timestamp: bike.createdAt,
        timeAgo: getTimeAgo(new Date(bike.createdAt)),
        user: bike.ownerName || 'Sistema',
        status: 'success' as const,
      }));

    const recentPanics = [...panicData]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 2)
      .map(panic => ({
        id: `panic-${panic.id}`,
        type: 'panic' as const,
        icon: 'alert' as const,
        title: 'Alerta de pánico',
        description: `Usuario: ${panic.userName} - ${panic.status}`,
        timestamp: panic.timestamp,
        timeAgo: getTimeAgo(new Date(panic.timestamp)),
        user: panic.userName || 'Anónimo',
        status: (panic.status === 'active' ? 'error' : panic.status === 'attended' ? 'warning' : 'success') as 'success' | 'warning' | 'error' | 'info',
      }));

    const recentMinutes = [...minutesData]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map(minute => ({
        id: `minute-${minute.id}`,
        type: 'minute' as const,
        icon: 'document' as const,
        title: 'Nueva minuta',
        description: minute.title,
        timestamp: minute.createdAt,
        timeAgo: getTimeAgo(new Date(minute.createdAt)),
        user: minute.reportedByName || 'Sistema',
        status: 'info' as const,
      }));

    activities.push(...recentCheckIns, ...recentPanics, ...recentMinutes);
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, 8);
  }, []);

  // Cargar datos
  const loadDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const [bikesData, panicData, minutesData, usersData] = await Promise.all([
        apiService.getBikes(),
        apiService.getPanicEvents(),
        apiService.getMinutes(),
        apiService.getUsers(),
      ]);

      const processedStats = processStats(
        bikesData,
        panicData,
        minutesData,
        usersData
      );
      setStats(processedStats);

      const weekData = generateWeeklyData(bikesData);
      setWeeklyData(weekData);

      const catData = generateCategoryData(panicData, minutesData);
      setCategoryData(catData);

      const activities = generateRecentActivities(
        bikesData,
        panicData,
        minutesData
      );
      setRecentActivities(activities);

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      showError(err.response?.data?.message || 'Error al cargar los datos del dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [processStats, generateWeeklyData, generateCategoryData, generateRecentActivities, showError]);

  useEffect(() => {
    loadDashboardData();

    refreshIntervalRef.current = setInterval(() => {
      loadDashboardData();
    }, 300000);

    // Conectar socket y suscribirse a eventos relevantes
    // El socketManager lee el token de localStorage automáticamente
    socketManager.connect().then(() => {
      socketManager.joinRoom('minutes');
      socketManager.joinRoom('bikes');
      socketManager.joinRoom('panic');
    }).catch((err) => {
      console.warn('⚠️ Socket no disponible en Dashboard:', err.message);
    });

    // Función con debounce para evitar múltiples recargas seguidas
    // si llegan varios eventos casi al mismo tiempo (ej: bulk updates)
    const handleSocketEvent = (eventName: string) => {
      console.log(`📡 Dashboard - evento socket recibido: ${eventName}`);
      if (socketDebounceRef.current) {
        clearTimeout(socketDebounceRef.current);
      }
      socketDebounceRef.current = setTimeout(() => {
        loadDashboardData();
      }, 500);
    };

    // Suscribirse a todos los eventos que afectan las métricas del dashboard
    const bikeEvents = [
      SocketEvents.BIKE_CREATED,
      SocketEvents.BIKE_UPDATED,
      SocketEvents.BIKE_DELETED,
      SocketEvents.BIKE_STATUS_CHANGED,
    ];
    const panicEvents = [
      SocketEvents.PANIC_CREATED,
      SocketEvents.PANIC_UPDATED,
      SocketEvents.PANIC_RESOLVED,
    ];
    const minuteEvents = [
      SocketEvents.MINUTE_CREATED,
      SocketEvents.MINUTE_UPDATED,
      SocketEvents.MINUTE_DELETED,
      SocketEvents.MINUTE_STATUS_CHANGED,
      SocketEvents.MINUTE_ASSIGNED,
    ];

    const allEvents = [...bikeEvents, ...panicEvents, ...minuteEvents];
    const handlers: Array<() => void> = [];

    allEvents.forEach((event) => {
      const handler = () => handleSocketEvent(event);
      handlers.push(socketManager.on(event, handler));
    });

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (socketDebounceRef.current) {
        clearTimeout(socketDebounceRef.current);
      }
      // Remover todos los listeners registrados (sin desconectar el socket global)
      handlers.forEach((unsubscribe) => unsubscribe());
    };
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData();
    success('Dashboard actualizado en tiempo real');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case 'checkin':
        return <ArrowRight size={16} className="rotate-down" />;
      case 'checkout':
        return <ArrowRight size={16} className="rotate-up" />;
      case 'alert':
        return <AlertTriangle size={16} />;
      case 'document':
        return <FileText size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!stats) {
    return (
      <div className="error-container">
        <AlertTriangle size={48} />
        <h2>Error al cargar el dashboard</h2>
        <button onClick={handleRefresh} className="btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  return (
<div className="modern-dashboard">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* HEADER CORPORATIVO PREMIUM */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Command Center Pro</h1>
          <p className="header-subtitle">
            <span className="status-indicator">
              <span className="status-dot"></span>
              SISTEMA ACTIVO
            </span>
            <span className="divider">•</span>
            <span>Monitoreo en tiempo real</span>
            <span className="divider">•</span>
            <span className="time-info">
              <Clock size={14} />
              Última actualización: {lastUpdated.getHours().toString().padStart(2, '0')}:{lastUpdated.getMinutes().toString().padStart(2, '0')}
            </span>
          </p>
        </div>
        <div className="header-right">
          {/* Icono de Tickets con notificación */}
          <TicketNotificationIcon />
          
          {/* Botón de actualizar */}
          <button 
            className="btn-icon-modern" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Sincronizar datos en vivo"
          >
            <RefreshCw size={18} className={isRefreshing ? 'spinning' : ''} />
          </button>
          
          {/* Configuración */}
          <button className="btn-icon-modern" title="Configuración del sistema">
            <Settings size={18} />
          </button>
          
          {/* Visión general */}
          <button className="btn-icon-modern" title="Visión general">
            <Globe size={18} />
          </button>
          
          {/* Centro de alertas */}
          <button 
            className="btn-icon-modern notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Centro de alertas"
          >
            <Bell size={18} />
            {recentActivities.filter(a => a.status === 'error').length > 0 && (
              <span className="notification-badge">
                {recentActivities.filter(a => a.status === 'error').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LAYOUT PRINCIPAL - CORREGIDO SIN CORTES */}
      <div className="dashboard-layout">
        {/* CONTENIDO PRINCIPAL */}
        <div className="dashboard-main">
          <div className="dashboard-content">
            {/* KPI CARDS PREMIUM */}
            <div className="kpi-grid">
              {/* BICICLETAS */}
              <div className="kpi-card primary" onClick={() => handleNavigate('/bikes')}>
                <div className="kpi-header">
                  <div className="kpi-icon bikes">
                    <Bike size={22} />
                  </div>
                  <div className={`kpi-trend ${stats.bikes.trend >= 0 ? 'positive' : 'negative'}`}>
                    {stats.bikes.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{Math.abs(stats.bikes.trend)}%</span>
                  </div>
                </div>
                <div className="kpi-content">
                  <h3 className="kpi-title">BICICLETERO</h3>
                  <div className="kpi-value">{stats.bikes.total}</div>
                </div>
                <div className="kpi-meta">
                  <span className="meta-item success">
                    <span className="meta-dot"></span>
                    {stats.bikes.inside} en campus
                  </span>
                  <span className="meta-item info">
                    <span className="meta-dot"></span>
                    {stats.bikes.outside} en uso
                  </span>
                  {stats.bikes.maintenance > 0 && (
                    <span className="meta-item warning">
                      <span className="meta-dot"></span>
                      {stats.bikes.maintenance} mantenimiento
                    </span>
                  )}
                </div>
              </div>

              {/* PÁNICO */}
              <div className="kpi-card danger" onClick={() => handleNavigate('/panic')}>
                <div className="kpi-header">
                  <div className="kpi-icon panic">
                    <ShieldIcon size={22} />
                  </div>
                  <div className={`kpi-trend ${stats.panic.trend <= 0 ? 'positive' : 'negative'}`}>
                    {stats.panic.trend <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{Math.abs(stats.panic.trend)}%</span>
                  </div>
                </div>
                <div className="kpi-content">
                  <h3 className="kpi-title">ALERTAS DE PÁNICO</h3>
                  <div className="kpi-value">{stats.panic.active}</div>
                </div>
                <div className="kpi-meta">
                  <span className="meta-item error">
                    <span className="meta-dot"></span>
                    {stats.panic.active} activas
                  </span>
                  <span className="meta-item success">
                    <span className="meta-dot"></span>
                    {stats.panic.resolved} resueltas
                  </span>
                  <span className="meta-item warning">
                    <span className="meta-dot"></span>
                    {stats.panic.attended} atendiendo
                  </span>
                </div>
              </div>

              {/* MINUTAS */}
              <div className="kpi-card warning" onClick={() => handleNavigate('/minutes')}>
                <div className="kpi-header">
                  <div className="kpi-icon minutes">
                    <FileText size={22} />
                  </div>
                  <div className={`kpi-trend ${stats.minutes.trend <= 0 ? 'positive' : 'negative'}`}>
                    {stats.minutes.trend <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{Math.abs(stats.minutes.trend)}%</span>
                  </div>
                </div>
                <div className="kpi-content">
                  <h3 className="kpi-title">MINUTAS</h3>
                  <div className="kpi-value">{stats.minutes.total}</div>
                </div>
                <div className="kpi-meta">
                  <span className="meta-item warning">
                    <span className="meta-dot"></span>
                    {stats.minutes.pending} pendientes
                  </span>
                  <span className="meta-item info">
                    <span className="meta-dot"></span>
                    {stats.minutes.reviewed} revisión
                  </span>
                  <span className="meta-item success">
                    <span className="meta-dot"></span>
                    {stats.minutes.closed} cerradas
                  </span>
                </div>
              </div>

              {/* USUARIOS */}
              <div className="kpi-card success" onClick={() => handleNavigate('/users')}>
                <div className="kpi-header">
                  <div className="kpi-icon users">
                    <Users size={22} />
                  </div>
                  <div className={`kpi-trend ${stats.users.trend >= 0 ? 'positive' : 'negative'}`}>
                    {stats.users.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{Math.abs(stats.users.trend)}%</span>
                  </div>
                </div>
                <div className="kpi-content">
                  <h3 className="kpi-title">COLABORADORES</h3>
                  <div className="kpi-value">{stats.users.active}</div>
                </div>
                <div className="kpi-meta">
                  <span className="meta-item success">
                    <span className="meta-dot"></span>
                    {stats.users.activePercentage}% activos
                  </span>
                  <span className="meta-item secondary">
                    <span className="meta-dot"></span>
                    {stats.users.total} registrados
                  </span>
                  <span className="meta-item info">
                    <span className="meta-dot"></span>
                    {stats.users.inactive} inactivos
                  </span>
                </div>
              </div>
            </div>

            {/* GRÁFICAS PREMIUM */}
            <div className="charts-grid">
              {/* GRÁFICA DE ACTIVIDAD */}
              <div className="chart-card modern">
                <div className="chart-header">
                  <div className="chart-title-group">
                    <h3>Actividad Operacional</h3>
                    <p className="chart-subtitle">Movimiento de activos en los últimos 7 días</p>
                  </div>
                  <button className="btn-chart-action" title="Opciones de análisis">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="chart-content">
                  {weeklyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                        <XAxis 
                          dataKey="day" 
                          stroke="#64748B"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748B"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                        <Bar 
                          dataKey="checkIns" 
                          name="Ingresos"
                          fill="url(#colorPrimary)" 
                          radius={[6, 6, 0, 0]}
                          barSize={24}
                        />
                        <Bar 
                          dataKey="checkOuts" 
                          name="Salidas"
                          fill="url(#colorSecondary)" 
                          radius={[6, 6, 0, 0]}
                          barSize={24}
                        />
                        <defs>
                          <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0066FF" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#0066FF" stopOpacity={0.3}/>
                          </linearGradient>
                          <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                          </linearGradient>
                        </defs>
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data">
                      <BarChart3 size={32} />
                      <p>No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>

              {/* GRÁFICA DE ESTADO - ESTILO PREMIUM */}
              <div className="chart-card modern">
                <div className="chart-header">
                  <div className="chart-title-group">
                    <h3>Estado del Sistema</h3>
                    <p className="chart-subtitle">Distribución de tareas y alertas activas</p>
                  </div>
                  <button className="btn-chart-action" title="Opciones de visualización">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="chart-content pie-chart-container">
                  {categoryData.length > 0 ? (
                    <>
                      <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="#FFFFFF"
                              strokeWidth={2}
                            >
                              {categoryData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              content={<CustomTooltip />}
                              cursor={{ fill: 'transparent' }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        {/* Centro con total */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#0F172A',
                            lineHeight: 1,
                            marginBottom: '3px',
                          }}>
                            {categoryData.reduce((sum, item) => sum + item.value, 0)}
                          </div>
                          <div style={{
                            fontSize: '0.6875rem',
                            fontWeight: '600',
                            color: '#64748B',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            Total
                          </div>
                        </div>
                      </div>
                      <div className="pie-legend">
                        {categoryData.map((item, index) => (
                          <div key={index} className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: item.color }} />
                            <span className="legend-label">{item.name}</span>
                            <span className="legend-value">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="no-data">
                      <PieChart size={32} />
                      <p>Sin alertas ni minutas activas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACCIONES RÁPIDAS PREMIUM */}
            <div className="quick-actions-section">
              <div className="section-header">
                <div>
                  <h3 className="section-title">Acciones Inmediatas</h3>
                  <p className="section-subtitle">Gestiona operaciones críticas en un clic</p>
                </div>
                <div className="status-indicator">
                  <Zap size={14} />
                  <span>MODO RÁPIDO</span>
                </div>
              </div>
              <div className="quick-actions-grid">
                <button
                  className="quick-action-card"
                  onClick={() => handleNavigate('/bikes')}
                >
                  <div className="action-icon bikes">
                    <Bike size={18} />
                  </div>
                  <span>Registrar Activo</span>
                  <ChevronRight size={16} className="action-arrow" />
                </button>
                <button
                  className="quick-action-card"
                  onClick={() => handleNavigate('/minutes')}
                >
                  <div className="action-icon minutes">
                    <FileText size={18} />
                  </div>
                  <span>Crear Informe</span>
                  <ChevronRight size={16} className="action-arrow" />
                </button>
                <button
                  className="quick-action-card"
                  onClick={() => handleNavigate('/users')}
                >
                  <div className="action-icon users">
                    <Users size={18} />
                  </div>
                  <span>Nuevo Usuario</span>
                  <ChevronRight size={16} className="action-arrow" />
                </button>
                <button 
                  className="quick-action-card"
                  onClick={() => handleNavigate('/panic')}
                >
                  <div className="action-icon panic">
                    <Shield size={18} />
                  </div>
                  <span>Centro de Crisis</span>
                  <ChevronRight size={16} className="action-arrow" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR DE ALERTAS - RESTAURADO */}
        {showNotifications && (
          <div className="dashboard-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-header">
                <div className="sidebar-title-group">
                  <h3>Centro de Comando</h3>
                  <div className="live-indicator">
                    <span className="live-dot"></span>
                    <span>TRANSMISIÓN EN VIVO</span>
                  </div>
                </div>
                <button 
                  className="btn-close-sidebar"
                  onClick={() => setShowNotifications(false)}
                  title="Minimizar panel"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="sidebar-content">
                {recentActivities.length === 0 ? (
                  <div className="no-activity-modern">
                    <Activity size={32} />
                    <p>No hay actividad reciente</p>
                  </div>
                ) : (
                  <div className="activity-list-modern">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className={`activity-item-modern status-${activity.status}`}>
                        <div className={`activity-icon-modern ${activity.status}`}>
                          {getActivityIcon(activity.icon)}
                        </div>
                        <div className="activity-content-modern">
                          <div className="activity-title-modern">{activity.title}</div>
                          <div className="activity-description-modern">{activity.description}</div>
                          <div className="activity-meta-modern">
                            <span className="activity-user-modern">{activity.user}</span>
                            <span className="activity-divider">•</span>
                            <span className="activity-time-modern">{activity.timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 

export default Dashboard;