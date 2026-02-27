import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketManager, SocketEvents } from '../services/socket.manager';
import panicService from '../services/panic.service';
import { PanicEvent, PanicPriority, PanicStatus } from '../types/panic';
import { notificationService } from '../services/notification.service';
import AlarmSound from '../utils/AlarmSound';
import { useAuth } from './AuthContext';

type PanicRole = 'admin' | 'coordinator' | 'supervisor' | 'operator' | 'guard' | 'locatario';

type PanicSettings = {
  backgroundMonitoringEnabled: boolean;
  quickAccessShortcutEnabled: boolean;
};

const PANIC_SETTINGS_KEY = 'panic_settings';
const ALERT_MONITOR_ROLES: Array<PanicRole> = ['admin', 'coordinator', 'supervisor'];
const PANIC_TRIGGER_ROLES: Array<PanicRole> = ['admin', 'coordinator', 'locatario'];

export interface PanicContextValue {
  events: PanicEvent[];
  activeAlerts: PanicEvent[];
  inProgressAlerts: PanicEvent[];
  resolvedAlerts: PanicEvent[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  stats: {
    active: number;
    inProgress: number;
    resolved: number;
    total: number;
  };
  fetchEvents: (showAlert?: boolean) => Promise<void>;
  createPanic: (priority?: PanicPriority) => Promise<PanicEvent | null>;
  updateStatus: (id: string, status: PanicStatus, notes?: string) => Promise<PanicEvent | null>;
  refresh: () => Promise<void>;
  getEventById: (id: string) => PanicEvent | undefined;
  // Settings
  backgroundMonitoringEnabled: boolean;
  quickAccessShortcutEnabled: boolean;
  setBackgroundMonitoring: (enabled: boolean) => Promise<void>;
  setQuickAccessShortcut: (enabled: boolean) => Promise<void>;
  canMonitorAlerts: boolean;
  canTriggerPanic: boolean;
  appIsInBackground: boolean;
}

const PanicContext = createContext<PanicContextValue | undefined>(undefined);

interface PanicProviderProps {
  children: ReactNode;
}

export const PanicProvider = ({ children }: PanicProviderProps) => {
  const value = useProvidePanic();
  return <PanicContext.Provider value={value}>{children}</PanicContext.Provider>;
};

export const usePanicContext = (): PanicContextValue => {
  const context = useContext(PanicContext);
  if (!context) {
    throw new Error('usePanic debe usarse dentro de PanicProvider');
  }
  return context;
};

function useProvidePanic(): PanicContextValue {
  const { user } = useAuth();
  const role = user?.role as PanicRole | undefined;
  const isAuthenticated = Boolean(user);
  const canMonitorAlerts = role ? ALERT_MONITOR_ROLES.includes(role) : false;
  const canTriggerPanic = role ? PANIC_TRIGGER_ROLES.includes(role) : false;

  const [events, setEvents] = useState<PanicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PanicSettings>({
    backgroundMonitoringEnabled: true,
    quickAccessShortcutEnabled: true,
  });
  const [appIsInBackground, setAppIsInBackground] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(socketManager.isConnected());

  const isFetchingRef = useRef(false);
  const processedEventIds = useRef<Set<string>>(new Set());
  const socketListenersRegistered = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const activeAlerts = events.filter(e => e.status === 'active');
  const inProgressAlerts = events.filter(e => e.status === 'attended');
  const resolvedAlerts = events.filter(e => e.status === 'resolved');
  const backgroundMonitoringEnabled = settings.backgroundMonitoringEnabled;
  const quickAccessShortcutEnabled = settings.quickAccessShortcutEnabled;

  const stats = {
    active: activeAlerts.length,
    inProgress: inProgressAlerts.length,
    resolved: resolvedAlerts.length,
    total: events.length,
  };

  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(PANIC_SETTINGS_KEY);
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (err) {
      console.error('Error loading panic settings', err);
    }
  }, []);

  const persistSettings = async (updated: PanicSettings) => {
    try {
      await AsyncStorage.setItem(PANIC_SETTINGS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Error saving panic settings', err);
    }
  };

  const setBackgroundMonitoring = async (enabled: boolean) => {
    const updated = { ...settings, backgroundMonitoringEnabled: enabled };
    setSettings(updated);
    await persistSettings(updated);
    if (!enabled) {
      AlarmSound.stop();
    }
  };

  const setQuickAccessShortcut = async (enabled: boolean) => {
    const updated = { ...settings, quickAccessShortcutEnabled: enabled };
    setSettings(updated);
    await persistSettings(updated);
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Setup alarm audio once
  useEffect(() => {
    AlarmSound.setup();
    return () => {
      AlarmSound.stop();
    };
  }, []);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        setAppIsInBackground(false);
        notificationService.dismissPanicShortcutNotification().catch(console.error);
      } else if (nextState.match(/inactive|background/)) {
        setAppIsInBackground(true);
      }
      appStateRef.current = nextState;
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const shouldSound = isAuthenticated && canMonitorAlerts && backgroundMonitoringEnabled && activeAlerts.length > 0;
    if (shouldSound) {
      AlarmSound.play().catch(console.error);
    } else {
      AlarmSound.stop();
    }
  }, [activeAlerts.length, canMonitorAlerts, backgroundMonitoringEnabled, isAuthenticated]);

  useEffect(() => {
    const shouldShowAttentionShortcut =
      isAuthenticated &&
      quickAccessShortcutEnabled &&
      canMonitorAlerts &&
      appIsInBackground;

    const shouldShowPanicShortcut =
      !shouldShowAttentionShortcut &&
      isAuthenticated &&
      quickAccessShortcutEnabled &&
      !canMonitorAlerts &&
      canTriggerPanic &&
      appIsInBackground;

    if (shouldShowAttentionShortcut) {
      notificationService.showPanicShortcutNotification('attention').catch(console.error);
    } else if (shouldShowPanicShortcut) {
      notificationService.showPanicShortcutNotification('panic').catch(console.error);
    } else {
      notificationService.dismissPanicShortcutNotification().catch(console.error);
    }
  }, [
    appIsInBackground,
    quickAccessShortcutEnabled,
    canTriggerPanic,
    canMonitorAlerts,
    isAuthenticated,
  ]);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        if (!isAuthenticated) {
          return;
        }
        if (socketManager.isConnected()) {
          setIsSocketConnected(true);
          return;
        }
        await socketManager.connect();
        setIsSocketConnected(true);
        console.log('✅ Socket conectado desde PanicProvider');
      } catch (err) {
        console.error('❌ Error conectando socket:', err);
        setError('No se pudo conectar al servidor en tiempo real');
      }
    };
    connectSocket();
  }, [isAuthenticated]);

  const fetchEvents = useCallback(async (showAlert: boolean = false) => {
    if (!isAuthenticated || isFetchingRef.current) {
      return;
    }
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      const result = await panicService.getAllEvents();
      if (result.success && result.data) {
        setEvents(result.data);
      } else if (showAlert) {
        Alert.alert('Error', result.error || 'No se pudieron cargar las alertas');
      }
    } catch (err) {
      console.error('❌ Error fetching panic events:', err);
      setError('Error al cargar alertas');
      if (showAlert) {
        Alert.alert('Error', 'Ocurrió un error al cargar las alertas');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated]);

  const createPanic = useCallback(async (priority: PanicPriority = 'high') => {
    try {
      setError(null);
      const result = await panicService.createPanic({ priority });
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Error al crear alerta');
    } catch (err) {
      console.error('❌ Error creating panic:', err);
      const message = err instanceof Error ? err.message : 'Error al crear alerta';
      setError(message);
      Alert.alert('Error', message);
      return null;
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: PanicStatus, notes?: string) => {
    try {
      setError(null);
      const result = await panicService.updateStatus(id, { status, notes });
      if (result.success && result.data) {
        setEvents(prev => prev.map(event => (event.id === id ? result.data! : event)));
        return result.data;
      }
      throw new Error(result.error || 'Error al actualizar estado');
    } catch (err) {
      console.error('❌ Error updating panic status:', err);
      const message = err instanceof Error ? err.message : 'Error al actualizar estado';
      setError(message);
      Alert.alert('Error', message);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchEvents(true);
  }, [fetchEvents]);

  const getEventById = useCallback((id: string) => {
    return events.find(e => e.id === id);
  }, [events]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    } else {
      setEvents([]);
      setLoading(false);
      AlarmSound.stop();
      setIsSocketConnected(false);
    }
  }, [fetchEvents, isAuthenticated]);

  useEffect(() => {
    if (socketListenersRegistered.current) {
      return;
    }
    socketListenersRegistered.current = true;

    const handlePanicCreated = (data: PanicEvent) => {
      if (processedEventIds.current.has(data.id)) return;
      processedEventIds.current.add(data.id);
      setTimeout(() => processedEventIds.current.delete(data.id), 10000);

      setEvents(prev => {
        if (prev.some(e => e.id === data.id)) return prev;
        notificationService.sendPanicNotification(data.userName, data.priority).catch(console.error);
        return [data, ...prev];
      });
    };

    const handlePanicUpdated = (data: PanicEvent) => {
      setEvents(prev =>
        prev.map(event => (event.id === data.id ? { ...event, ...data } : event))
      );
    };

    const handlePanicResolved = (data: PanicEvent) => {
      setEvents(prev =>
        prev.map(event =>
          event.id === data.id ? { ...event, ...data, status: 'resolved' } : event
        )
      );
    };

    const handleConnect = () => {
      setError(null);
      setIsSocketConnected(true);
      socketManager.joinRoom('panic');
    };

    const handleDisconnect = () => {
      console.log('🔴 Socket desconectado en PanicProvider');
      setIsSocketConnected(false);
    };

    const handleError = (err: any) => {
      console.error('❌ Error en socket (PanicProvider):', err);
      setError(typeof err === 'string' ? err : err?.message || 'Error de conexión');
    };

    socketManager.on(SocketEvents.PANIC_CREATED, handlePanicCreated);
    socketManager.on(SocketEvents.PANIC_UPDATED, handlePanicUpdated);
    socketManager.on(SocketEvents.PANIC_RESOLVED, handlePanicResolved);
    socketManager.on(SocketEvents.CONNECT, handleConnect);
    socketManager.on(SocketEvents.DISCONNECT, handleDisconnect);
    socketManager.on(SocketEvents.ERROR, handleError);

    if (socketManager.isConnected()) {
      socketManager.joinRoom('panic');
    }

    return () => {
      socketManager.off(SocketEvents.PANIC_CREATED, handlePanicCreated);
      socketManager.off(SocketEvents.PANIC_UPDATED, handlePanicUpdated);
      socketManager.off(SocketEvents.PANIC_RESOLVED, handlePanicResolved);
      socketManager.off(SocketEvents.CONNECT, handleConnect);
      socketManager.off(SocketEvents.DISCONNECT, handleDisconnect);
      socketManager.off(SocketEvents.ERROR, handleError);
      socketListenersRegistered.current = false;
    };
  }, [fetchEvents, isAuthenticated]);

  return {
    events,
    activeAlerts,
    inProgressAlerts,
    resolvedAlerts,
    loading,
    error,
    isConnected: isSocketConnected,
    stats,
    fetchEvents,
    createPanic,
    updateStatus,
    refresh,
    getEventById,
    backgroundMonitoringEnabled,
    quickAccessShortcutEnabled,
    setBackgroundMonitoring,
    setQuickAccessShortcut,
    canMonitorAlerts,
    canTriggerPanic,
    appIsInBackground,
  };
}
