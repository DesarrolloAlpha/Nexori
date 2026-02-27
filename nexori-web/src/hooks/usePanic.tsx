import { useState, useEffect, useCallback, useRef } from 'react';
import { socketManager, SocketEvents } from '@/services/socket.manager';
import { apiService } from '@/services/api'; // ✅ Usar apiService que ya existe

// ===== TIPOS =====
export type PanicStatus = 'active' | 'attended' | 'resolved';

export interface PanicEvent {
  id: string;
  userId: string;
  userName: string;
  status: PanicStatus;
  timestamp: string;
  attendedBy?: string;
  attendedAt?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsePanicReturn {
  // Estados
  events: PanicEvent[];
  activeAlerts: PanicEvent[];
  inProgressAlerts: PanicEvent[];
  resolvedAlerts: PanicEvent[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  
  // Estadísticas
  stats: {
    active: number;
    inProgress: number;
    resolved: number;
    total: number;
  };
  
  // Funciones
  fetchEvents: () => Promise<void>;
  createPanic: () => Promise<PanicEvent | null>;
  updateStatus: (id: string, status: PanicStatus, notes?: string) => Promise<PanicEvent | null>;
  refresh: () => Promise<void>;
  
  // Utilidades
  getEventById: (id: string) => PanicEvent | undefined;
}

/**
 * ✅ Hook personalizado para manejar eventos de pánico con WebSocket
 * Sigue exactamente el mismo patrón que useMinutes
 */
export const usePanic = (): UsePanicReturn => {
  // ===== ESTADOS =====
  const [events, setEvents] = useState<PanicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // ===== REFS =====
  const isFetchingRef = useRef(false);
  const processedEventIds = useRef<Set<string>>(new Set());
  const socketListenersRegistered = useRef(false);

  // ===== ESTADOS DERIVADOS =====
  const activeAlerts = events.filter(e => e.status === 'active');
  const inProgressAlerts = events.filter(e => e.status === 'attended');
  const resolvedAlerts = events.filter(e => e.status === 'resolved');
  
  const stats = {
    active: activeAlerts.length,
    inProgress: inProgressAlerts.length,
    resolved: resolvedAlerts.length,
    total: events.length,
  };

  // ===== CONEXIÓN SOCKET =====
  useEffect(() => {
    const connectSocket = async () => {
      try {
        if (socketManager.isConnected()) {
          console.log('✅ Socket ya conectado');
          setIsConnected(true);
          return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('⚠️ No hay token, no se puede conectar socket');
          return;
        }
        
        await socketManager.connect(token);
        setIsConnected(true);
        console.log('✅ Socket conectado desde usePanic');
      } catch (error) {
        console.error('❌ Error conectando socket:', error);
        setError('No se pudo conectar al servidor en tiempo real');
        setIsConnected(false);
      }
    };

    connectSocket();
  }, []);

  // ===== LISTENERS DE SOCKET =====
  useEffect(() => {
    // Evitar registrar listeners múltiples veces
    if (socketListenersRegistered.current) {
      return;
    }
    
    console.log('🔌 Configurando listeners de Socket.IO en usePanic');
    socketListenersRegistered.current = true;

    // ===== HANDLER: PANIC CREATED =====
    const handlePanicCreated = (data: PanicEvent) => {
      console.log('📡 [usePanic] Recibido panic:created', data);
      
      // Evitar duplicados en caso de múltiples emisiones
      if (processedEventIds.current.has(data.id)) {
        console.log('   ⚠️ Evento ya procesado, ignorando');
        return;
      }
      
      processedEventIds.current.add(data.id);
      
      // Limpiar después de 10 segundos
      setTimeout(() => {
        processedEventIds.current.delete(data.id);
      }, 10000);

      setEvents(prevEvents => {
        // Verificar que no exista ya
        if (prevEvents.some(e => e.id === data.id)) {
          console.log('   ⚠️ Evento ya existe en el estado');
          return prevEvents;
        }
        
        console.log('   ✅ Agregando nueva alerta de pánico:', data.userName);
        return [data, ...prevEvents];
      });
    };

    // ===== HANDLER: PANIC UPDATED =====
    const handlePanicUpdated = (data: PanicEvent) => {
      console.log('📡 [usePanic] Recibido panic:updated', data.id, data.status);
      
      setEvents(prevEvents => {
        const updated = prevEvents.map(event =>
          event.id === data.id ? { ...event, ...data } : event
        );
        
        // Log para debug
        const oldEvent = prevEvents.find(e => e.id === data.id);
        if (oldEvent && oldEvent.status !== data.status) {
          console.log(`   Estado cambiado: ${oldEvent.status} → ${data.status}`);
        }
        
        return updated;
      });
    };

    // ===== HANDLER: PANIC RESOLVED =====
    const handlePanicResolved = (data: PanicEvent) => {
      console.log('📡 [usePanic] Recibido panic:resolved', data.id);
      
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === data.id ? { ...event, ...data, status: 'resolved' } : event
        )
      );
    };

    // ===== HANDLER: CONNECT =====
    const handleConnect = () => {
      console.log('✅ Socket conectado en usePanic');
      setIsConnected(true);
      setError(null);
      
      // Unirse a la sala de pánico
      socketManager.joinRoom('panic');
      console.log('📍 Unido a sala: panic');
    };

    // ===== HANDLER: DISCONNECT =====
    const handleDisconnect = () => {
      console.log('🔴 Socket desconectado en usePanic');
      setIsConnected(false);
    };

    // ===== HANDLER: ERROR =====
    const handleError = (errorData: any) => {
      console.error('❌ Error en socket (usePanic):', errorData);
      setError(typeof errorData === 'string' ? errorData : errorData.message || 'Error de conexión');
    };

    // ===== REGISTRAR LISTENERS =====
    socketManager.on(SocketEvents.PANIC_CREATED, handlePanicCreated);
    socketManager.on(SocketEvents.PANIC_UPDATED, handlePanicUpdated);
    socketManager.on(SocketEvents.PANIC_RESOLVED, handlePanicResolved);
    socketManager.on(SocketEvents.CONNECT, handleConnect);
    socketManager.on(SocketEvents.DISCONNECT, handleDisconnect);
    socketManager.on(SocketEvents.ERROR, handleError);

    // Si ya está conectado, unirse a la sala inmediatamente
    if (socketManager.isConnected()) {
      socketManager.joinRoom('panic');
      setIsConnected(true);
    }

    // ===== CLEANUP =====
    return () => {
      console.log('🧹 Limpiando listeners de usePanic');
      socketManager.off(SocketEvents.PANIC_CREATED, handlePanicCreated);
      socketManager.off(SocketEvents.PANIC_UPDATED, handlePanicUpdated);
      socketManager.off(SocketEvents.PANIC_RESOLVED, handlePanicResolved);
      socketManager.off(SocketEvents.CONNECT, handleConnect);
      socketManager.off(SocketEvents.DISCONNECT, handleDisconnect);
      socketManager.off(SocketEvents.ERROR, handleError);
      
      socketListenersRegistered.current = false;
    };
  }, []);

  // ===== FUNCIONES API =====

  /**
   * Obtener todos los eventos de pánico
   */
  const fetchEvents = useCallback(async () => {
    // Evitar múltiples llamadas simultáneas
    if (isFetchingRef.current) {
      console.log('⚠️ Ya hay una petición en curso, ignorando');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('📥 Obteniendo eventos de pánico...');
      
      // ✅ USAR EL MÉTODO QUE YA EXISTE EN TU API
      const fetchedEvents = await apiService.getPanicEvents();
      
      console.log(`✅ Eventos cargados: ${fetchedEvents.length}`);
      setEvents(fetchedEvents);
    } catch (error: any) {
      console.error('❌ Error fetching panic events:', error);
      const errorMessage = error.message || 'Error al cargar alertas';
      setError(errorMessage);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  /**
   * Crear nueva alerta de pánico
   */
  const createPanic = useCallback(async (): Promise<PanicEvent | null> => {
    try {
      setError(null);

      console.log('🚨 Creando alerta de pánico');

      const newEvent = await apiService.createPanicEvent();
      
      console.log('✅ Alerta de pánico creada:', newEvent.id);
      
      // No es necesario agregar manualmente, el socket lo hará
      
      return newEvent;
    } catch (error: any) {
      console.error('❌ Error creating panic:', error);
      const errorMessage = error.message || 'Error al crear alerta';
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Actualizar estado de evento
   */
  const updateStatus = useCallback(async (
    id: string, 
    status: PanicStatus, 
    notes?: string
  ): Promise<PanicEvent | null> => {
    try {
      setError(null);
      
      console.log(`📝 Actualizando estado de ${id} a ${status}`);
      
      // ✅ USAR EL MÉTODO QUE YA EXISTE EN TU API
      const updatedEvent = await apiService.updatePanicStatus(id, status, notes);
      
      console.log('✅ Estado actualizado correctamente');
      
      // Actualización optimista (el socket también actualizará)
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === id ? updatedEvent : event
        )
      );
      
      return updatedEvent;
    } catch (error: any) {
      console.error('❌ Error updating panic status:', error);
      const errorMessage = error.message || 'Error al actualizar estado';
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Refrescar datos
   */
  const refresh = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  /**
   * Obtener evento por ID
   */
  const getEventById = useCallback((id: string) => {
    return events.find(e => e.id === id);
  }, [events]);

  // ===== CARGA INICIAL =====
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ===== RETURN =====
  return {
    // Estados
    events,
    activeAlerts,
    inProgressAlerts,
    resolvedAlerts,
    loading,
    error,
    isConnected,
    
    // Estadísticas
    stats,
    
    // Funciones
    fetchEvents,
    createPanic,
    updateStatus,
    refresh,
    
    // Utilidades
    getEventById,
  };
};