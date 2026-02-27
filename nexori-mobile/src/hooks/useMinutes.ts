import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import minuteService, { MinuteFilters } from '../services/minute.service';
import { Minute, Category, Status, Priority } from '../types/minutes';
import { socketManager, SocketEvents } from '../services/socket.manager';
import { useAuth } from '../contexts/AuthContext';
import { offlineQueue } from '../services/offlineQueue.service';

interface UseMinutesReturn {
  minutes: Minute[];
  loading: boolean;
  refreshing: boolean;
  isOnline: boolean;
  pendingCount: number;
  stats: {
    pending: number;
    reviewed: number;
    closed: number;
    total: number;
  };
  loadMinutes: () => Promise<void>;
  loadStatistics: () => Promise<void>;
  refreshMinutes: () => Promise<void>;
  createMinute: (data: {
    title: string;
    description: string;
    priority: Priority;
    category: Category;
    location?: string;
  }) => Promise<boolean>;
  updateMinuteStatus: (id: string, status: Status) => Promise<boolean>;
  deleteMinute: (id: string) => Promise<boolean>;
}

// ── Mapeador backend → Minute ────────────────────────────────────────────────
const mapBackendToMinute = (raw: any): Minute => ({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  date: raw.createdAt,
  createdBy: raw.reportedByName,
  status: raw.status as Status,
  priority: raw.priority as Priority,
  category: raw.type as Category,
  location: raw.location,
  assignedTo: raw.assignedToName,
  attachments: raw.attachments || [],
  // Trazabilidad
  reviewedBy: raw.resolvedByName,
  reviewedAt: raw.resolvedAt,
  closedBy: raw.closedByName,
  closedAt: raw.closedAt,
});

// ── Convierte una op pendiente de la cola en Minute temporal ─────────────────
const opToTempMinute = (op: any, userName: string): Minute => ({
  id: op.tempId || `TEMP_${op.id}`,
  title: op.payload.title,
  description: op.payload.description,
  date: new Date(op.timestamp).toISOString(),
  createdBy: userName,
  status: 'pending',
  priority: op.payload.priority,
  category: op.payload.type as Category,
  location: op.payload.location,
  attachments: [],
});

// ── Hook principal ───────────────────────────────────────────────────────────
export const useMinutes = (filters: MinuteFilters = {}): UseMinutesReturn => {
  const { token, user } = useAuth();
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(offlineQueue.isOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState({ pending: 0, reviewed: 0, closed: 0, total: 0 });

  const socketInitialized = useRef(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const refreshPendingCount = useCallback(async () => {
    const count = await offlineQueue.pendingCount();
    setPendingCount(count);
  }, []);

  /**
   * Mezcla los datos del servidor con los items pendientes de la cola.
   * Los items pendientes se muestran encabezando la lista con ID 'TEMP_*'.
   */
  const mergeWithPending = useCallback(async (serverMinutes: Minute[]): Promise<Minute[]> => {
    const pendingOps = await offlineQueue.getQueueByEntity('minute');
    const pendingCreates = pendingOps.filter(op => op.op === 'create');

    if (pendingCreates.length === 0) return serverMinutes;

    const existingIds = new Set(serverMinutes.map(m => m.id));
    const tempItems = pendingCreates
      .filter(op => op.tempId && !existingIds.has(op.tempId))
      .map(op => opToTempMinute(op, user?.name || 'Sin sincronizar'));

    return [...tempItems, ...serverMinutes];
  }, [user]);

  // ── Cargar minutas ─────────────────────────────────────────────────────────
  const loadMinutes = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      if (!offlineQueue.isOnline) {
        // Sin conexión: mostrar caché + pendientes de la cola
        const cached = await offlineQueue.getCache<Minute[]>('minute');
        if (cached) {
          const merged = await mergeWithPending(cached);
          setMinutes(merged);
        }
        return;
      }

      const result = await minuteService.getAll(filters);
      if (result.success && result.data) {
        const serverMinutes = result.data.minutes;
        // Guardar en caché (solo datos reales del servidor)
        await offlineQueue.setCache('minute', serverMinutes);
        // Mostrar merged (server + pendientes locales)
        const merged = await mergeWithPending(serverMinutes);
        setMinutes(merged);
      } else {
        Alert.alert('Error', result.error || 'Error al cargar minutas');
      }
    } catch {
      // Error de red: caer al caché
      const cached = await offlineQueue.getCache<Minute[]>('minute');
      if (cached) {
        const merged = await mergeWithPending(cached);
        setMinutes(merged);
      }
    } finally {
      setLoading(false);
    }
  }, [token, JSON.stringify(filters), mergeWithPending]);

  // ── Cargar estadísticas ────────────────────────────────────────────────────
  const loadStatistics = useCallback(async () => {
    if (!token || !offlineQueue.isOnline) return;
    try {
      const result = await minuteService.getStatistics();
      if (result.success && result.data) setStats(result.data);
    } catch {
      // silencioso offline
    }
  }, [token]);

  // ── Refrescar todo ─────────────────────────────────────────────────────────
  const refreshMinutes = useCallback(async () => {
    setRefreshing(true);
    await loadMinutes();
    await loadStatistics();
    await refreshPendingCount();
    setRefreshing(false);
  }, [loadMinutes, loadStatistics, refreshPendingCount]);

  // ── Crear minuta ───────────────────────────────────────────────────────────
  const createMinute = useCallback(async (data: {
    title: string;
    description: string;
    priority: Priority;
    category: Category;
    location?: string;
  }) => {
    if (!token) { Alert.alert('Error', 'No autenticado'); return false; }

    // ── Sin conexión: encolar y agregar item temporal ──────────────────────
    if (!offlineQueue.isOnline) {
      const tempId = `TEMP_${Date.now()}`;
      await offlineQueue.enqueue({
        entity: 'minute',
        op: 'create',
        payload: {
          title: data.title,
          description: data.description,
          type: data.category,
          priority: data.priority,
          location: data.location,
        },
        tempId,
      });

      const tempMinute: Minute = {
        id: tempId,
        title: data.title,
        description: data.description,
        date: new Date().toISOString(),
        createdBy: user?.name || 'Tú',
        status: 'pending',
        priority: data.priority,
        category: data.category,
        location: data.location,
        attachments: [],
      };

      setMinutes(prev => [tempMinute, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
      await refreshPendingCount();

      Alert.alert(
        'Guardado sin conexión',
        'La minuta se sincronizará automáticamente cuando se restaure la conexión.',
        [{ text: 'Entendido' }]
      );
      return true;
    }

    // ── Con conexión: flujo normal ─────────────────────────────────────────
    try {
      const result = await minuteService.create(data);
      if (result.success) {
        return true;
      } else {
        Alert.alert('Error', result.error || 'Error al crear minuta');
        return false;
      }
    } catch {
      Alert.alert('Error', 'No se pudo crear la minuta');
      return false;
    }
  }, [token, user, refreshPendingCount]);

  // ── Actualizar estado de minuta ────────────────────────────────────────────
  const updateMinuteStatus = useCallback(async (id: string, status: Status) => {
    if (!token) { Alert.alert('Error', 'No autenticado'); return false; }

    // ── Sin conexión: encolar + actualización optimista ────────────────────
    if (!offlineQueue.isOnline) {
      // No actualizar items temporales que aún no llegaron al servidor
      if (id.startsWith('TEMP_')) {
        Alert.alert('Sin conexión', 'Este elemento aún no se ha sincronizado.');
        return false;
      }

      await offlineQueue.enqueue({
        entity: 'minute',
        op: 'update',
        payload: { id, status },
      });

      // Actualización optimista del estado local
      const prevStatus = minutes.find(m => m.id === id)?.status;
      setMinutes(prev => prev.map(m => m.id === id ? { ...m, status } : m));
      setStats(prev => {
        const s = { ...prev };
        if (prevStatus) s[prevStatus] = Math.max(0, s[prevStatus] - 1);
        s[status] = (s[status] || 0) + 1;
        return s;
      });
      await refreshPendingCount();
      return true;
    }

    // ── Con conexión: flujo normal ─────────────────────────────────────────
    try {
      const result = await minuteService.update(id, { status });
      if (result.success) {
        return true;
      } else {
        Alert.alert('Error', result.error || 'Error al actualizar minuta');
        return false;
      }
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la minuta');
      return false;
    }
  }, [token, minutes, refreshPendingCount]);

  // ── Eliminar minuta ────────────────────────────────────────────────────────
  const deleteMinute = useCallback(async (id: string) => {
    if (!token) { Alert.alert('Error', 'No autenticado'); return false; }

    // ── Sin conexión ───────────────────────────────────────────────────────
    if (!offlineQueue.isOnline) {
      if (id.startsWith('TEMP_')) {
        // Eliminar directo de cola y lista local (nunca llegó al servidor)
        const q = await offlineQueue.getQueueByEntity('minute');
        const op = q.find(o => o.tempId === id);
        if (op) {
          const all = await offlineQueue['readQueue']();
          await offlineQueue['writeQueue'](all.filter(o => o.id !== op.id));
        }
        setMinutes(prev => prev.filter(m => m.id !== id));
        setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1), pending: Math.max(0, prev.pending - 1) }));
        await refreshPendingCount();
        return true;
      }

      // Para items del servidor: encolar eliminación
      await offlineQueue.enqueue({ entity: 'minute', op: 'delete', payload: { id } });
      setMinutes(prev => prev.filter(m => m.id !== id));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      await refreshPendingCount();
      return true;
    }

    // ── Con conexión: flujo normal ─────────────────────────────────────────
    try {
      const result = await minuteService.delete(id);
      if (result.success) {
        return true;
      } else {
        Alert.alert('Error', result.error || 'Error al eliminar minuta');
        return false;
      }
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la minuta');
      return false;
    }
  }, [token, refreshPendingCount]);

  // ── Init offline queue + listener de sync ────────────────────────────────
  useEffect(() => {
    offlineQueue.init();

    // Cuando se sincroniza la cola → recargar minutas desde servidor
    const unsubSync = offlineQueue.onSync(entity => {
      if (entity === 'minute') refreshMinutes();
    });

    // Cambios de red → actualizar indicador
    const { default: NetInfo } = require('@react-native-community/netinfo');
    const unsubNet = NetInfo.addEventListener((state: any) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
      refreshPendingCount();
    });

    refreshPendingCount();

    return () => {
      unsubSync();
      unsubNet();
    };
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || socketInitialized.current) return;

    if (!socketManager.isConnected()) {
      socketManager.connect(token).catch(err => console.error('Socket error:', err));
    }

    setTimeout(() => {
      if (socketManager.isConnected()) socketManager.joinRoom('minutes');
    }, 1000);

    const handleMinuteCreated = (raw: any) => {
      const newMinute = mapBackendToMinute(raw);
      setMinutes(prev => {
        // Reemplazar item temporal si existe (mismo title + category)
        const withoutTemp = prev.filter(m => {
          if (!m.id.startsWith('TEMP_')) return true;
          return !(m.title === newMinute.title && m.category === newMinute.category);
        });
        if (withoutTemp.some(m => m.id === newMinute.id)) return withoutTemp;
        return [newMinute, ...withoutTemp];
      });
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + (newMinute.status === 'pending' ? 1 : 0),
      }));
      if (newMinute.priority === 'high') {
        Alert.alert('🚨 Nueva Minuta de Alta Prioridad', newMinute.title);
      }
    };

    const handleMinuteUpdated = (raw: any) => {
      const updated = mapBackendToMinute(raw);
      setMinutes(prev => prev.map(m => m.id === updated.id ? updated : m));
    };

    const handleMinuteDeleted = (data: { id: string }) => {
      setMinutes(prev => prev.filter(m => m.id !== data.id));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    };

    const handleStatusChanged = (data: { id: string; previousStatus: Status; newStatus: Status }) => {
      setMinutes(prev => prev.map(m => m.id === data.id ? { ...m, status: data.newStatus } : m));
      setStats(prev => {
        const s = { ...prev };
        if (data.previousStatus in s) s[data.previousStatus as keyof typeof s] = Math.max(0, (s[data.previousStatus as keyof typeof s] as number) - 1);
        if (data.newStatus in s) (s[data.newStatus as keyof typeof s] as any)++;
        return s;
      });
    };

    const handleMinuteAssigned = (raw: any) => {
      const assigned = mapBackendToMinute(raw);
      setMinutes(prev => prev.map(m => m.id === assigned.id ? assigned : m));
      if (user && raw.assignedTo === user.id) {
        Alert.alert('📌 Nueva Minuta Asignada', `Te han asignado: ${assigned.title}`);
      }
    };

    const handleAttachment = (data: { minute?: any }) => {
      if (!data.minute) return;
      const updated = mapBackendToMinute(data.minute);
      setMinutes(prev => prev.map(m => m.id === updated.id ? updated : m));
    };

    const unsubCreated  = socketManager.on(SocketEvents.MINUTE_CREATED, handleMinuteCreated);
    const unsubUpdated  = socketManager.on(SocketEvents.MINUTE_UPDATED, handleMinuteUpdated);
    const unsubDeleted  = socketManager.on(SocketEvents.MINUTE_DELETED, handleMinuteDeleted);
    const unsubStatus   = socketManager.on(SocketEvents.MINUTE_STATUS_CHANGED, handleStatusChanged);
    const unsubAssigned = socketManager.on(SocketEvents.MINUTE_ASSIGNED, handleMinuteAssigned);
    const unsubAttAdd   = socketManager.on(SocketEvents.MINUTE_ATTACHMENT_ADDED, handleAttachment);
    const unsubAttDel   = socketManager.on(SocketEvents.MINUTE_ATTACHMENT_DELETED, handleAttachment);

    socketInitialized.current = true;

    return () => {
      unsubCreated(); unsubUpdated(); unsubDeleted();
      unsubStatus(); unsubAssigned(); unsubAttAdd(); unsubAttDel();
    };
  }, [token, user]);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      loadMinutes();
      loadStatistics();
    }
  }, [token, loadMinutes, loadStatistics]);

  return {
    minutes,
    loading,
    refreshing,
    isOnline,
    pendingCount,
    stats,
    loadMinutes,
    loadStatistics,
    refreshMinutes,
    createMinute,
    updateMinuteStatus,
    deleteMinute,
  };
};
