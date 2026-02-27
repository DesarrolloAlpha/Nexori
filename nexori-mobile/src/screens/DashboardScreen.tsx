import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedTabScreen } from '../components/AnimatedTabScreen';
import { tw, designTokens, getColorWithOpacity } from '../utils/tw';
import { useFocusEffect } from '@react-navigation/native';

// Servicios
import minuteService from '../services/minute.service';
import bikeService from '../services/bike.service';
import panicService from '../services/panic.service';
import { socketManager, SocketEvents } from '../services/socket.manager';

const { colors, shadows } = designTokens;

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  
  // Estados para datos reales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bikesData, setBikesData] = useState({
    inside: 0,
    outside: 0,
    totalToday: 0,
  });
  const [minutesStats, setMinutesStats] = useState({
    pending: 0,
    reviewed: 0,
    closed: 0,
    total: 0,
  });
  const [panicStats, setPanicStats] = useState({
    alertsToday: 0,
    lastAlert: 'Sin alertas',
    avgResponseTime: '--',
    systemStatus: 'activo',
  });
  const [minutesByPriority, setMinutesByPriority] = useState([
    { priority: 'Alta', count: 0, color: colors.status.error, icon: 'warning' as const },
    { priority: 'Media', count: 0, color: colors.status.warning, icon: 'alert-circle' as const },
    { priority: 'Baja', count: 0, color: colors.status.success, icon: 'information-circle' as const },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Función para cargar todos los datos
  const loadDashboardData = useCallback(async () => {
    try {
      // Cargar datos en paralelo
      const [bikesResponse, minutesStatsResponse, minutesResponse, panicResponse] = await Promise.all([
        bikeService.getAll({}),
        minuteService.getStatistics(),
        minuteService.getAll({ limit: 100 }),
        panicService.getAllEvents(),
      ]);

      // Procesar datos de bicicletas
      const bikes = bikesResponse || [];
      const insideBikes = bikes.filter((b: any) => b.status === 'inside').length;
      const outsideBikes = bikes.filter((b: any) => b.status === 'outside').length;
      
      // Contar bicicletas de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayBikes = bikes.filter((b: any) => {
        const checkInDate = b.lastCheckIn ? new Date(b.lastCheckIn) : null;
        return checkInDate && checkInDate >= today;
      }).length;

      setBikesData({
        inside: insideBikes,
        outside: outsideBikes,
        totalToday: todayBikes,
      });

      // Procesar estadísticas de minutas
      if (minutesStatsResponse.success && minutesStatsResponse.data) {
        setMinutesStats(minutesStatsResponse.data);
      }

      // Procesar minutas por prioridad
      if (minutesResponse.success && minutesResponse.data) {
        const minutes = minutesResponse.data.minutes;
        const pendingMinutes = minutes.filter((m: any) => m.status === 'pending');
        
        const highPriority = pendingMinutes.filter((m: any) => m.priority === 'high').length;
        const mediumPriority = pendingMinutes.filter((m: any) => m.priority === 'medium').length;
        const lowPriority = pendingMinutes.filter((m: any) => m.priority === 'low').length;

        setMinutesByPriority([
          { priority: 'Alta', count: highPriority, color: colors.status.error, icon: 'warning' as const },
          { priority: 'Media', count: mediumPriority, color: colors.status.warning, icon: 'alert-circle' as const },
          { priority: 'Baja', count: lowPriority, color: colors.status.success, icon: 'information-circle' as const },
        ]);
      }

      // Procesar eventos de pánico
      if (panicResponse.success && panicResponse.data) {
        const events = panicResponse.data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayEvents = events.filter((e: any) => {
          const eventDate = new Date(e.timestamp);
          return eventDate >= today;
        });

        // Encontrar última alerta
        let lastAlertText = 'Sin alertas';
        if (events.length > 0) {
          const lastEvent = events[0]; // Ya viene ordenado DESC del backend
          const lastEventDate = new Date(lastEvent.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - lastEventDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          if (diffDays > 0) {
            lastAlertText = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
          } else if (diffHours > 0) {
            lastAlertText = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
          } else if (diffMins > 0) {
            lastAlertText = `Hace ${diffMins} min`;
          } else {
            lastAlertText = 'Hace un momento';
          }
        }

        // Calcular tiempo promedio de respuesta en minutos
        const attendedEvents = events.filter((e: any) => e.attendedAt && e.timestamp);
        let avgResponseTime = '--';
        if (attendedEvents.length > 0) {
          const totalResponseTime = attendedEvents.reduce((sum: number, e: any) => {
            const created = new Date(e.timestamp).getTime();
            const attended = new Date(e.attendedAt).getTime();
            return sum + (attended - created);
          }, 0);
          const avgMs = totalResponseTime / attendedEvents.length;
          const avgMin = Math.floor(avgMs / 60000); // Convertir a minutos
          avgResponseTime = avgMin > 0 ? `${avgMin} min` : '< 1 min';
        }

        setPanicStats({
          alertsToday: todayEvents.length,
          lastAlert: lastAlertText,
          avgResponseTime: avgResponseTime,
          systemStatus: 'activo',
        });
      }

      // Procesar actividad reciente - combinar últimos movimientos
      const activities: any[] = [];
      
      // Últimas bicicletas registradas
      const recentBikes = bikes
        .sort((a: any, b: any) => new Date(b.lastCheckIn || b.createdAt).getTime() - new Date(a.lastCheckIn || a.createdAt).getTime())
        .slice(0, 2);
      
      recentBikes.forEach((bike: any) => {
        const bikeDate = new Date(bike.lastCheckIn || bike.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - bikeDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        let timeText = '';
        if (diffHours > 0) {
          timeText = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        } else if (diffMins > 0) {
          timeText = `Hace ${diffMins} min`;
        } else {
          timeText = 'Hace un momento';
        }
        
        activities.push({
          id: `bike-${bike.id}`,
          type: 'bike',
          bikeId: bike.id,
          title: bike.status === 'inside' ? 'Bicicleta ingresada' : 'Bicicleta retirada',
          description: `${bike.brand} ${bike.model} - ${bike.ownerName}`,
          time: timeText,
          timestamp: bikeDate.getTime(),
          icon: 'bicycle' as const,
          color: bike.status === 'inside' ? colors.status.success : colors.status.warning,
          bgColor: bike.status === 'inside' ? colors.status.successLight : colors.status.warningLight,
        });
      });

      // Últimas minutas
      if (minutesResponse.success && minutesResponse.data) {
        const recentMinutes = minutesResponse.data.minutes.slice(0, 2);
        recentMinutes.forEach((minute: any) => {
          const minuteDate = new Date(minute.date);
          const now = new Date();
          const diffMs = now.getTime() - minuteDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          
          let timeText = '';
          if (diffHours > 0) {
            timeText = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
          } else if (diffMins > 0) {
            timeText = `Hace ${diffMins} min`;
          } else {
            timeText = 'Hace un momento';
          }
          
          activities.push({
            id: `minute-${minute.id}`,
            type: 'minute',
            minuteId: minute.id,
            title: 'Minuta creada',
            description: minute.title,
            time: timeText,
            timestamp: minuteDate.getTime(),
            icon: 'document-text' as const,
            color: colors.status.info,
            bgColor: colors.status.infoLight,
          });
        });
      }

      // Últimos eventos de pánico atendidos
      if (panicResponse.success && panicResponse.data) {
        const attendedPanic = panicResponse.data
          .filter((e: any) => e.status === 'attended' || e.status === 'resolved')
          .slice(0, 1);
        
        attendedPanic.forEach((panic: any) => {
          const panicDate = new Date(panic.attendedAt || panic.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - panicDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          
          let timeText = '';
          if (diffHours > 0) {
            timeText = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
          } else if (diffMins > 0) {
            timeText = `Hace ${diffMins} min`;
          } else {
            timeText = 'Hace un momento';
          }
          
          activities.push({
            id: `panic-${panic.id}`,
            type: 'panic',
            panicId: panic.id,
            title: 'Alerta atendida',
            description: `Alerta de ${panic.userName}`,
            time: timeText,
            timestamp: panicDate.getTime(),
            icon: 'checkmark-circle' as const,
            color: colors.status.success,
            bgColor: colors.status.successLight,
          });
        });
      }

      // Ordenar por timestamp descendente y tomar los 3 más recientes
      const sortedActivities = activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);
      
      setRecentActivity(sortedActivities);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cargar datos al montar
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Recargar datos cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Función para refrescar
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Socket.IO — actualización en tiempo real
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => loadDashboardData(), 800);
  }, [loadDashboardData]);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        if (!socketManager.isConnected()) await socketManager.connect();
      } catch {
        console.warn('Dashboard: socket no disponible, usando polling');
      }
    };
    connectSocket();

    const unsubscribers = [
      socketManager.on(SocketEvents.BIKE_CREATED, debouncedReload),
      socketManager.on(SocketEvents.BIKE_UPDATED, debouncedReload),
      socketManager.on(SocketEvents.BIKE_DELETED, debouncedReload),
      socketManager.on(SocketEvents.BIKE_STATUS_CHANGED, debouncedReload),
      socketManager.on(SocketEvents.PANIC_CREATED, debouncedReload),
      socketManager.on(SocketEvents.PANIC_UPDATED, debouncedReload),
      socketManager.on(SocketEvents.PANIC_RESOLVED, debouncedReload),
      socketManager.on(SocketEvents.MINUTE_CREATED, debouncedReload),
      socketManager.on(SocketEvents.MINUTE_UPDATED, debouncedReload),
      socketManager.on(SocketEvents.MINUTE_DELETED, debouncedReload),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [debouncedReload]);

  // Calcular cambios (simulado para mantener el diseño)
  const bikesInsideChange = bikesData.totalToday > 0 ? `+${Math.min(bikesData.totalToday, 5)}` : '0';
  const bikesOutsideChange = bikesData.outside > 0 ? `+${Math.min(bikesData.outside, 3)}` : '0';
  const bikesTotalChange = bikesData.inside > 0 ? `+${Math.min(bikesData.inside - bikesData.outside, 5)}` : '0';
  const minutesChange = minutesStats.pending > 0 ? `+${minutesStats.pending}` : '0';

  const summaryStats = [
    {
      icon: 'arrow-down-circle' as const,
      value: String(bikesData.totalToday),
      label: 'Bicicletas ingresadas',
      sublabel: 'Hoy',
      change: bikesInsideChange,
      changePositive: bikesData.totalToday > 0,
      color: colors.status.success,
      bgColor: colors.status.successLight,
      progress: Math.min((bikesData.totalToday / 20) * 1.0, 1),
    },
    {
      icon: 'arrow-up-circle' as const,
      value: String(bikesData.outside),
      label: 'Bicicletas retiradas',
      sublabel: 'Hoy',
      change: bikesOutsideChange,
      changePositive: true,
      color: colors.status.warning,
      bgColor: colors.status.warningLight,
      progress: Math.min((bikesData.outside / 20) * 1.0, 1),
    },
    {
      icon: 'bicycle' as const,
      value: String(bikesData.inside),
      label: 'Dentro del establecimiento',
      sublabel: 'Ahora',
      change: bikesTotalChange,
      changePositive: bikesData.inside >= bikesData.outside,
      color: colors.accent,
      bgColor: getColorWithOpacity(colors.accent, 0.15),
      progress: Math.min((bikesData.inside / 30) * 1.0, 1),
    },
    {
      icon: 'document-text' as const,
      value: String(minutesStats.pending),
      label: 'Minutas pendientes',
      sublabel: 'Por revisar',
      change: minutesChange,
      changePositive: false,
      color: colors.status.info,
      bgColor: colors.status.infoLight,
      progress: Math.min((minutesStats.pending / 10) * 1.0, 1),
    },
  ];

  const quickActions = [
    { 
      icon: 'bicycle' as const, 
      label: 'Registrar\nBicicleta', 
      color: colors.accent,
      bgColor: getColorWithOpacity(colors.accent, 0.15)
    },
    { 
      icon: 'document-text' as const, 
      label: 'Nueva\nMinuta', 
      color: colors.status.info,
      bgColor: colors.status.infoLight
    },
    { 
      icon: 'search' as const, 
      label: 'Buscar\nRegistro', 
      color: colors.secondary,
      bgColor: getColorWithOpacity(colors.secondary, 0.15)
    },
    { 
      icon: 'stats-chart' as const, 
      label: 'Ver\nReportes', 
      color: colors.status.warning,
      bgColor: colors.status.warningLight
    },
  ];

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      coordinator: 'Coordinador',
      supervisor: 'Supervisor',
      operator: 'Operador',
      guard: 'Guardia',
    };
    return roles[role] || role;
  };

  const currentDate = new Date();
  const dateFormatted = currentDate.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  // Funciones de navegación
  const handleQuickAction = (index: number) => {
    switch(index) {
      case 0: // Registrar Bicicleta
        navigation.navigate('Bicicletas');
        break;
      case 1: // Nueva Minuta
        navigation.navigate('Minutas');
        break;
      case 2: // Buscar Registro
        navigation.navigate('Bicicletas');
        break;
      case 3: // Ver Reportes
        navigation.navigate('Reports');
        break;
    }
  };

  const handleActivityPress = (activity: any) => {
    switch(activity.type) {
      case 'bike':
        navigation.navigate('Bicicletas');
        break;
      case 'minute':
        navigation.navigate('Minutas');
        break;
      case 'panic':
        navigation.navigate('Alertas'); // PanicAttentionScreen
        break;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw('flex-1 bg-background items-center justify-center')}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[tw('mt-4 text-base'), { color: colors.text.secondary }]}>
          Cargando dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <AnimatedTabScreen>
    <>
      {/* StatusBar unificado con el header */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.primary}
      />
      
      <SafeAreaView style={tw('flex-1 bg-primary')} edges={['top']}>
        <View style={tw('flex-1 bg-background')}>
          {/* Header Premium */}
          <View style={[tw('bg-primary px-6 pb-6'), { paddingTop: Platform.OS === 'android' ? 16 : 8 }]}>
            {/* Top bar con usuario y notificaciones */}
            <View style={tw('flex-row items-center justify-between mb-6')}>
              {/* Usuario */}
              <View style={tw('flex-row items-center flex-1')}>
                <View style={[
                  tw('w-12 h-12 rounded-2xl items-center justify-center mr-3'), 
                  { backgroundColor: colors.accent },
                  shadows.md
                ]}>
                  <Text style={tw('text-white text-lg font-bold')}>
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </Text>
                </View>
                <View>
                  <Text style={tw('text-white text-base font-bold')}>
                    {user?.name || 'Administrador'}
                  </Text>
                  <Text style={[tw('text-xs'), { color: getColorWithOpacity(colors.text.light, 0.7) }]}>
                    {user?.role ? getRoleLabel(user.role) : 'Usuario'}
                  </Text>
                </View>
              </View>

              {/* Notificaciones */}
              <TouchableOpacity 
                style={[
                  tw('w-11 h-11 rounded-xl items-center justify-center'), 
                  { backgroundColor: getColorWithOpacity(colors.surface, 0.15) }
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.surface} />
                {/* Badge de notificaciones */}
                {minutesStats.pending > 0 && (
                  <View style={[
                    tw('absolute top-2 right-2 w-2 h-2 rounded-full'),
                    { backgroundColor: colors.status.error }
                  ]} />
                )}
              </TouchableOpacity>
            </View>

            {/* Título y fecha */}
            <Text style={tw('text-white text-2xl font-bold mb-1')}>
              Control de Seguridad
            </Text>
            <View style={tw('flex-row items-center mb-5')}>
              <Ionicons name="calendar-outline" size={14} color={getColorWithOpacity(colors.text.light, 0.7)} style={tw('mr-2')} />
              <Text style={[tw('text-sm capitalize'), { color: getColorWithOpacity(colors.text.light, 0.75) }]}>
                {dateFormatted}
              </Text>
            </View>

            {/* Búsqueda mejorada */}
            <View style={[
              tw('flex-row items-center rounded-xl px-4'), 
              { 
                backgroundColor: getColorWithOpacity(colors.surface, 0.15),
                height: 48
              }
            ]}>
              <Ionicons name="search" size={20} color={getColorWithOpacity(colors.text.light, 0.6)} />
              <TextInput
                placeholder="Buscar bicicleta, minuta..."
                placeholderTextColor={getColorWithOpacity(colors.text.light, 0.5)}
                style={[
                  tw('flex-1 ml-3'),
                  { color: colors.surface, fontSize: 15 }
                ]}
              />
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {/* Resumen del día mejorado */}
            <View style={tw('px-6 mt-6')}>
              <View style={tw('flex-row items-center justify-between mb-4')}>
                <View>
                  <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                    Módulo de Bicicletas
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[
                    tw('px-3 py-2 rounded-lg flex-row items-center'),
                    { backgroundColor: getColorWithOpacity(colors.accent, 0.1) }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Bicicletas')}
                >
                  <Text style={[tw('text-xs font-bold mr-1'), { color: colors.accent }]}>
                    Ver Todo
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Grid de estadísticas de bicicletas */}
              <View style={tw('flex-row flex-wrap')}>
                {summaryStats.slice(0, 3).map((stat, index) => (
                  <View 
                    key={index}
                    style={[
                      tw('mb-4'),
                      index === 2 ? { width: '100%' } : { 
                        width: '50%', 
                        paddingRight: index % 2 === 0 ? 8 : 0, 
                        paddingLeft: index % 2 === 1 ? 8 : 0 
                      }
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        tw('bg-surface rounded-2xl p-4'),
                        shadows.sm,
                        { borderLeftWidth: 3, borderLeftColor: stat.color }
                      ]}
                    >
                      <View style={tw('flex-row items-center justify-between mb-3')}>
                        <View style={[
                          tw('w-11 h-11 rounded-xl items-center justify-center'), 
                          { backgroundColor: stat.bgColor }
                        ]}>
                          <Ionicons name={stat.icon} size={22} color={stat.color} />
                        </View>
                        
                        <View style={[
                          tw('px-2 py-1 rounded-lg flex-row items-center'),
                          { backgroundColor: stat.changePositive ? colors.status.successLight : colors.status.errorLight }
                        ]}>
                          <Ionicons 
                            name={stat.changePositive ? "trending-up" : "trending-down"} 
                            size={10} 
                            color={stat.changePositive ? colors.status.success : colors.status.error}
                            style={tw('mr-0.5')}
                          />
                          <Text style={[
                            tw('text-xs font-bold'), 
                            { color: stat.changePositive ? colors.status.success : colors.status.error }
                          ]}>
                            {stat.change}
                          </Text>
                        </View>
                      </View>

                      <Text style={[tw('text-3xl font-bold mb-1'), { color: colors.primary }]}>
                        {stat.value}
                      </Text>

                      <Text style={[tw('text-xs font-semibold mb-1'), { color: colors.text.primary }]}>
                        {stat.label}
                      </Text>
                      <Text style={[tw('text-xs mb-3'), { color: colors.text.disabled }]}>
                        {stat.sublabel}
                      </Text>

                      <View style={[tw('w-full h-1.5 rounded-full'), { backgroundColor: colors.border.light }]}>
                        <View 
                          style={[
                            tw('h-1.5 rounded-full'),
                            { 
                              width: `${stat.progress * 100}%`,
                              backgroundColor: stat.color 
                            }
                          ]} 
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Módulo de Pánico */}
            <View style={tw('px-6 mt-6')}>
              <Text style={[tw('text-lg font-bold mb-4'), { color: colors.primary }]}>
                Módulo de Pánico
              </Text>

              <View style={[
                tw('bg-surface rounded-2xl p-5'),
                shadows.sm,
                { borderLeftWidth: 4, borderLeftColor: panicStats.alertsToday === 0 ? colors.status.success : colors.status.error }
              ]}>
                <View style={tw('flex-row items-center mb-4')}>
                  <View style={[
                    tw('w-12 h-12 rounded-xl items-center justify-center mr-4'),
                    { backgroundColor: panicStats.alertsToday === 0 ? colors.status.successLight : colors.status.errorLight }
                  ]}>
                    <Ionicons 
                      name={panicStats.alertsToday === 0 ? "shield-checkmark" : "alert"} 
                      size={24} 
                      color={panicStats.alertsToday === 0 ? colors.status.success : colors.status.error} 
                    />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs font-bold uppercase tracking-wide mb-1'), { color: colors.text.secondary }]}>
                      Sistema de Pánico
                    </Text>
                    <Text style={[tw('text-base font-bold'), { color: colors.primary }]}>
                      {panicStats.alertsToday} alertas hoy
                    </Text>
                  </View>
                  
                  <View style={[
                    tw('px-3 py-1 rounded-lg'),
                    { backgroundColor: colors.status.successLight }
                  ]}>
                    <Text style={[tw('text-xs font-bold'), { color: colors.status.success }]}>
                      ACTIVO
                    </Text>
                  </View>
                </View>

                <View style={[tw('h-px mb-4'), { backgroundColor: colors.border.light }]} />

                <View style={tw('flex-row')}>
                  <View style={tw('flex-1')}>
                    <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                      Última alerta
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {panicStats.lastAlert}
                    </Text>
                  </View>
                  <View style={tw('flex-1 items-end')}>
                    <Text style={[tw('text-xs mb-1'), { color: colors.text.secondary }]}>
                      Tiempo de respuesta
                    </Text>
                    <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                      {panicStats.avgResponseTime}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Módulo de Minutas */}
            <View style={tw('px-6 mt-6')}>
              <Text style={[tw('text-lg font-bold mb-4'), { color: colors.primary }]}>
                Módulo de Minutas
              </Text>

              <View style={[tw('bg-surface rounded-2xl p-5'), shadows.sm]}>
                <View style={tw('flex-row items-center justify-between mb-4')}>
                  <View style={tw('flex-row items-center')}>
                    <View style={[
                      tw('w-12 h-12 rounded-xl items-center justify-center mr-3'),
                      { backgroundColor: colors.status.infoLight }
                    ]}>
                      <Text style={[tw('text-2xl font-bold'), { color: colors.status.info }]}>
                        {summaryStats[3].value}
                      </Text>
                    </View>
                    <View>
                      <Text style={[tw('text-xs font-bold uppercase tracking-wide mb-1'), { color: colors.text.secondary }]}>
                        Total Pendientes
                      </Text>
                      <Text style={[tw('text-sm'), { color: colors.text.secondary }]}>
                        Por revisar hoy
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Minutas')}>
                    <Ionicons name="chevron-forward" size={24} color={colors.text.disabled} />
                  </TouchableOpacity>
                </View>

                <View style={[tw('h-px mb-4'), { backgroundColor: colors.border.light }]} />

                <Text style={[tw('text-xs font-bold uppercase tracking-wide mb-3'), { color: colors.text.secondary }]}>
                  Por Prioridad
                </Text>

                {minutesByPriority.map((item, index) => (
                  <View 
                    key={index}
                    style={[
                      tw('flex-row items-center justify-between py-3'),
                      index < minutesByPriority.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.light }
                    ]}
                  >
                    <View style={tw('flex-row items-center flex-1')}>
                      <View style={[
                        tw('w-8 h-8 rounded-lg items-center justify-center mr-3'),
                        { backgroundColor: getColorWithOpacity(item.color, 0.15) }
                      ]}>
                        <Ionicons name={item.icon} size={16} color={item.color} />
                      </View>
                      <Text style={[tw('text-sm font-semibold'), { color: colors.primary }]}>
                        Prioridad {item.priority}
                      </Text>
                    </View>
                    <View style={[
                      tw('px-3 py-1 rounded-lg'),
                      { backgroundColor: getColorWithOpacity(item.color, 0.15) }
                    ]}>
                      <Text style={[tw('text-sm font-bold'), { color: item.color }]}>
                        {item.count}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Acciones Rápidas */}
            <View style={tw('px-6 mt-6')}>
              <Text style={[tw('text-lg font-bold mb-4'), { color: colors.primary }]}>
                Acciones Rápidas
              </Text>

              <View style={tw('flex-row flex-wrap')}>
                {quickActions.map((action, index) => (
                  <View
                    key={index}
                    style={[
                      tw('mb-3'),
                      { 
                        width: '25%',
                        paddingHorizontal: 4
                      }
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleQuickAction(index)}
                      style={[
                        tw('items-center justify-center p-3 rounded-2xl'),
                        { backgroundColor: action.bgColor }
                      ]}
                    >
                      <View style={[
                        tw('w-12 h-12 rounded-xl items-center justify-center mb-2'),
                        { backgroundColor: colors.surface }
                      ]}>
                        <Ionicons name={action.icon} size={22} color={action.color} />
                      </View>
                      <Text style={[tw('text-xs font-semibold text-center'), { color: colors.primary, lineHeight: 14 }]}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Actividad reciente mejorada */}
            <View style={tw('px-6 mt-6')}>
              <View style={tw('flex-row items-center justify-between mb-4')}>
                <Text style={[tw('text-lg font-bold'), { color: colors.primary }]}>
                  Actividad Reciente
                </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Bicicletas')}>
                  <Text style={[tw('text-sm font-bold'), { color: colors.accent }]}>
                    Ver todo
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[tw('bg-surface rounded-2xl overflow-hidden'), shadows.sm]}>
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        tw('flex-row items-center p-5'),
                        index < recentActivity.length - 1 && { 
                          borderBottomWidth: 1, 
                          borderBottomColor: colors.border.light 
                        }
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleActivityPress(activity)}
                    >
                    <View style={tw('items-center mr-4')}>
                      <View style={[
                        tw('w-11 h-11 rounded-xl items-center justify-center'), 
                        { backgroundColor: activity.bgColor }
                      ]}>
                        <Ionicons name={activity.icon} size={20} color={activity.color} />
                      </View>
                      {index < recentActivity.length - 1 && (
                        <View style={[
                          tw('w-0.5 mt-2'),
                          { 
                            height: 40, 
                            backgroundColor: colors.border.light,
                            position: 'absolute',
                            top: 44
                          }
                        ]} />
                      )}
                    </View>

                    <View style={tw('flex-1')}>
                      <Text style={[tw('text-sm font-bold mb-1'), { color: colors.primary }]}>
                        {activity.title}
                      </Text>
                      <Text style={[tw('text-xs mb-2'), { color: colors.text.secondary }]}>
                        {activity.description}
                      </Text>
                      <View style={tw('flex-row items-center')}>
                        <Ionicons 
                          name="time-outline" 
                          size={12} 
                          color={colors.text.disabled} 
                          style={tw('mr-1')}
                        />
                        <Text style={[tw('text-xs'), { color: colors.text.disabled }]}>
                          {activity.time}
                        </Text>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.text.disabled} />
                  </TouchableOpacity>
                ))
                ) : (
                  <View style={tw('p-5 items-center')}>
                    <Ionicons name="time-outline" size={32} color={colors.text.disabled} style={tw('mb-2')} />
                    <Text style={[tw('text-sm'), { color: colors.text.secondary }]}>
                      No hay actividad reciente
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* FAB mejorado */}
          <TouchableOpacity
            style={[
              tw('absolute bottom-6 right-6 w-16 h-16 rounded-2xl items-center justify-center'),
              { backgroundColor: colors.accent },
              shadows.xl
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={32} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
    </AnimatedTabScreen>
  );
}