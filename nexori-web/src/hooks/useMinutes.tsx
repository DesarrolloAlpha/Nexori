import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService } from '@/services/api';
import { Minute, MinuteStatus, MinuteType, MinutePriority, MinuteFormData } from '@/types/minute';
import { socketManager, SocketEvents } from '@/services/socket.manager';
import { useToast } from './useToast';

// ========================================
// TIPOS
// ========================================
export interface MinuteFilters {
  search?: string;
  type?: MinuteType | 'all';
  status?: MinuteStatus | 'all';
  priority?: MinutePriority | 'all';
  page?: number;
  limit?: number;
}

interface UseMinutesReturn {
  minutes: Minute[];
  loading: boolean;
  refreshing: boolean;
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
    priority: MinutePriority;
    type: MinuteType;
    location?: string;
  }) => Promise<boolean>;
  updateMinuteStatus: (id: string, status: MinuteStatus) => Promise<boolean>;
  deleteMinute: (id: string) => Promise<boolean>;
}

export const useMinutes = (filters: MinuteFilters = {}): UseMinutesReturn => {
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    reviewed: 0,
    closed: 0,
    total: 0,
  });

  // Ref para evitar múltiples inicializaciones
  const socketInitialized = useRef(false);
  const { success, error: showError } = useToast();

  // ========================================
  // CARGAR MINUTAS
  // ========================================
  const loadMinutes = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No hay token, omitiendo carga de minutas');
      return;
    }

    setLoading(true);
    try {
      // Convertir filtros al formato que espera el API
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.type && filters.type !== 'all') params.type = filters.type;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      const minutesData = await apiService.getMinutes(params);
      setMinutes(minutesData);
    } catch (error) {
      console.error('Error loading minutes:', error);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  // ========================================
  // CARGAR ESTADÍSTICAS
  // ========================================
  const loadStatistics = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const statsData = await apiService.getMinuteStatistics();
      setStats({
        pending: statsData.pending || 0,
        reviewed: statsData.reviewed || 0,
        closed: statsData.closed || 0,
        total: statsData.total || 0,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }, []);

  // ========================================
  // REFRESCAR DATOS
  // ========================================
  const refreshMinutes = useCallback(async () => {
    setRefreshing(true);
    await loadMinutes();
    await loadStatistics();
    setRefreshing(false);
  }, [loadMinutes, loadStatistics]);

  // ========================================
  // CREAR MINUTA
  // ========================================
  const createMinute = useCallback(async (data: {
    title: string;
    description: string;
    priority: MinutePriority;
    type: MinuteType;
    location?: string;
  }) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      console.error('No autenticado');
      showError('No estás autenticado');
      return false;
    }

    try {
      // Parsear usuario del localStorage
      const user = JSON.parse(userStr);
      
      // Agregar campos requeridos por MinuteFormData
      const minuteData: MinuteFormData = {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        location: data.location || '',
        reportedBy: user.id,
        reportedByName: user.name,
      };

      await apiService.createMinute(minuteData);
      // NO agregamos aquí porque el WebSocket lo hará automáticamente
      console.log('✅ Minuta creada, esperando evento WebSocket...');
      success('Minuta creada exitosamente');
      return true;
    } catch (error) {
      console.error('Error creating minute:', error);
      showError('Error al crear minuta');
      return false;
    }
  }, [success, showError]);

  // ========================================
  // ACTUALIZAR ESTADO DE MINUTA
  // ========================================
  const updateMinuteStatus = useCallback(async (id: string, status: MinuteStatus) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No autenticado');
      showError('No estás autenticado');
      return false;
    }

    try {
      await apiService.updateMinuteStatus(id, status);
      // NO actualizamos aquí porque el WebSocket lo hará automáticamente
      console.log('✅ Minuta actualizada, esperando evento WebSocket...');
      success('Estado actualizado correctamente');
      return true;
    } catch (error) {
      console.error('Error updating minute:', error);
      showError('Error al actualizar minuta');
      return false;
    }
  }, [success, showError]);

  // ========================================
  // ELIMINAR MINUTA
  // ========================================
  const deleteMinute = useCallback(async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No autenticado');
      showError('No estás autenticado');
      return false;
    }

    try {
      await apiService.deleteMinute(id);
      // NO eliminamos aquí porque el WebSocket lo hará automáticamente
      console.log('✅ Minuta eliminada, esperando evento WebSocket...');
      success('Minuta eliminada correctamente');
      return true;
    } catch (error) {
      console.error('Error deleting minute:', error);
      showError('Error al eliminar minuta');
      return false;
    }
  }, [success, showError]);

  // ========================================
  // WEBSOCKET: CONFIGURAR LISTENERS
  // ========================================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || socketInitialized.current) return;

    console.log('🔌 Configurando listeners WebSocket para minutas...');

    // Conectar socket si no está conectado
    if (!socketManager.isConnected()) {
      socketManager.connect(token).catch(error => {
        console.error('Error conectando socket:', error);
      });
    }

    // Unirse a la sala de minutas
    setTimeout(() => {
      if (socketManager.isConnected()) {
        socketManager.joinRoom('minutes');
      }
    }, 1000);

    // ========================================
    // LISTENER: Nueva minuta creada
    // ========================================
    const handleMinuteCreated = (newMinute: Minute) => {
      console.log('📝 WebSocket: Nueva minuta recibida', newMinute.id);
      setMinutes(prev => {
        // Evitar duplicados
        if (prev.some(m => m.id === newMinute.id)) return prev;
        return [newMinute, ...prev];
      });

      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + (newMinute.status === 'pending' ? 1 : 0),
      }));

      // Mostrar notificación para alta prioridad
      if (newMinute.priority === 'high') {
        // Aquí podrías mostrar una notificación toast
        console.log('🚨 Minuta de alta prioridad:', newMinute.title);
      }
    };

    // ========================================
    // LISTENER: Minuta actualizada
    // ========================================
    const handleMinuteUpdated = (updatedMinute: Minute) => {
      console.log('🔄 WebSocket: Minuta actualizada', updatedMinute.id);
      setMinutes(prev => prev.map(m =>
        m.id === updatedMinute.id ? updatedMinute : m
      ));
    };

    // ========================================
    // LISTENER: Minuta eliminada
    // ========================================
    const handleMinuteDeleted = (data: { id: string }) => {
      console.log('🗑️ WebSocket: Minuta eliminada', data.id);
      setMinutes(prev => {
        const filtered = prev.filter(m => m.id !== data.id);
        return filtered;
      });

      // Actualizar estadísticas (necesitamos recargarlas)
      loadStatistics();
    };

    // ========================================
    // LISTENER: Estado cambiado
    // ========================================
    const handleStatusChanged = (data: {
      id: string;
      previousStatus: MinuteStatus;
      newStatus: MinuteStatus;
      [key: string]: any;
    }) => {
      console.log('📊 WebSocket: Estado cambiado', data.id, data.previousStatus, '->', data.newStatus);

      // Actualizar la minuta
      setMinutes(prev => prev.map(m =>
        m.id === data.id ? { ...m, status: data.newStatus } : m
      ));

      // Actualizar estadísticas
      setStats(prev => {
        const newStats = { ...prev };

        // Decrementar el estado anterior
        if (data.previousStatus === 'pending') newStats.pending = Math.max(0, newStats.pending - 1);
        if (data.previousStatus === 'reviewed') newStats.reviewed = Math.max(0, newStats.reviewed - 1);
        if (data.previousStatus === 'closed') newStats.closed = Math.max(0, newStats.closed - 1);

        // Incrementar el nuevo estado
        if (data.newStatus === 'pending') newStats.pending++;
        if (data.newStatus === 'reviewed') newStats.reviewed++;
        if (data.newStatus === 'closed') newStats.closed++;

        return newStats;
      });
    };

    // ========================================
    // LISTENER: Minuta asignada
    // ========================================
    const handleMinuteAssigned = (data: Minute & { assignedBy: string; assignedByName: string }) => {
      console.log('📌 WebSocket: Minuta asignada', data.id);
      setMinutes(prev => prev.map(m =>
        m.id === data.id ? data : m
      ));
    };

    // ========================================
    // LISTENER: Archivo adjuntado
    // ========================================
    const handleAttachmentAdded = (data: { minute: Minute; attachment: any }) => {
      console.log('📎 WebSocket: Archivo adjuntado a minuta', data.minute.id);
      setMinutes(prev => prev.map(m =>
        m.id === data.minute.id ? data.minute : m
      ));
    };

    // ========================================
    // LISTENER: Archivo eliminado
    // ========================================
    const handleAttachmentDeleted = (data: { minute: Minute }) => {
      console.log('🗑️ WebSocket: Archivo eliminado de minuta', data.minute.id);
      setMinutes(prev => prev.map(m =>
        m.id === data.minute.id ? data.minute : m
      ));
    };

    // ========================================
    // REGISTRAR LISTENERS usando socketManager
    // ========================================
    const unsubMinuteCreated = socketManager.on(SocketEvents.MINUTE_CREATED, handleMinuteCreated);
    const unsubMinuteUpdated = socketManager.on(SocketEvents.MINUTE_UPDATED, handleMinuteUpdated);
    const unsubMinuteDeleted = socketManager.on(SocketEvents.MINUTE_DELETED, handleMinuteDeleted);
    const unsubStatusChanged = socketManager.on(SocketEvents.MINUTE_STATUS_CHANGED, handleStatusChanged);
    const unsubMinuteAssigned = socketManager.on(SocketEvents.MINUTE_ASSIGNED, handleMinuteAssigned);
    const unsubAttachmentAdded = socketManager.on(SocketEvents.MINUTE_ATTACHMENT_ADDED, handleAttachmentAdded);
    const unsubAttachmentDeleted = socketManager.on(SocketEvents.MINUTE_ATTACHMENT_DELETED, handleAttachmentDeleted);

    socketInitialized.current = true;
    console.log('✅ WebSocket listeners configurados para minutas');

    // ========================================
    // CLEANUP
    // ========================================
    return () => {
      console.log('🔌 Limpiando listeners de WebSocket...');
      unsubMinuteCreated();
      unsubMinuteUpdated();
      unsubMinuteDeleted();
      unsubStatusChanged();
      unsubMinuteAssigned();
      unsubAttachmentAdded();
      unsubAttachmentDeleted();
      
      socketInitialized.current = false;
      
      // NO desconectar el socket aquí porque otros componentes pueden necesitarlo
      // Solo limpiamos los listeners
    };
  }, [loadStatistics]); // Dependencia: loadStatistics

  // ========================================
  // CARGAR DATOS INICIALES
  // ========================================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadMinutes();
      loadStatistics();
    }
  }, [loadMinutes, loadStatistics]);

  return {
    minutes,
    loading,
    refreshing,
    stats,
    loadMinutes,
    loadStatistics,
    refreshMinutes,
    createMinute,
    updateMinuteStatus,
    deleteMinute,
  };
};