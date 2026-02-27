import io, { Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 🔥 IMPORTAR LA CONFIGURACIÓN CENTRALIZADA
import { SOCKET_URL, SOCKET_CONFIG } from '../config/api.config';

// Tipos de eventos (debe coincidir con el backend)
export enum SocketEvents {
  MINUTE_CREATED = 'minute:created',
  MINUTE_UPDATED = 'minute:updated',
  MINUTE_DELETED = 'minute:deleted',
  MINUTE_STATUS_CHANGED = 'minute:status_changed',
  MINUTE_ASSIGNED = 'minute:assigned',
  MINUTE_ATTACHMENT_ADDED = 'minute:attachment_added',
  MINUTE_ATTACHMENT_DELETED = 'minute:attachment_deleted',
  
  BIKE_CREATED = 'bike:created',
  BIKE_UPDATED = 'bike:updated',
  BIKE_DELETED = 'bike:deleted',
  BIKE_STATUS_CHANGED = 'bike:status_changed',
  
  PANIC_CREATED = 'panic:created',
  PANIC_UPDATED = 'panic:updated',
  PANIC_RESOLVED = 'panic:resolved',
  
  USER_UPDATED = 'user:updated',
  USER_STATUS_CHANGED = 'user:status_changed',
  
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  ERROR = 'error',
  SOCKET_CONNECTED = 'socket:connected'
}

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type SocketEventListener = (...args: any[]) => void;

interface SocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private status: SocketStatus = 'disconnected';
  private error: string | null = null;
  private listeners: Map<string, Set<SocketEventListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private url: string;
  private options: SocketOptions;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  private constructor(options: SocketOptions = {}) {
    // 🔥 USAR LA URL DE LA CONFIGURACIÓN CENTRALIZADA
    this.url = options.url || SOCKET_URL;
    this.options = {
      autoConnect: true,
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts || 10,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay || 1000,
      reconnectionDelayMax: SOCKET_CONFIG.reconnectionDelayMax || 5000,
      timeout: 20000,
      ...options
    };
    
    console.log('🔧 SocketManager inicializado con URL:', this.url);
  }

  static getInstance(options?: SocketOptions): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager(options);
    }
    return SocketManager.instance;
  }

  /**
   * Conectar al servidor Socket.IO
   */
  async connect(token?: string): Promise<boolean> {
    // Si ya hay una conexión en progreso, devolver esa promesa
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Si ya está conectado, resolver inmediatamente
    if (this.isConnected()) {
      return Promise.resolve(true);
    }

    // Obtener token si no se proporcionó
    let authToken = token;
    if (!authToken) {
      authToken = await AsyncStorage.getItem('auth_token') || undefined;
    }
    
    if (!authToken) {
      this.setStatus('error', 'No hay token de autenticación');
      return Promise.reject(new Error('No hay token de autenticación'));
    }

    this.setStatus('connecting');
    this.error = null;

    console.log('🔌 Conectando a Socket.IO:', this.url);

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // 🔥 CORREGIDO: Crear nueva conexión usando la configuración centralizada
        const socketOptions: any = {
          transports: SOCKET_CONFIG.transports,
          auth: { token: authToken },
          reconnection: true,
          reconnectionAttempts: this.options.reconnectionAttempts,
          reconnectionDelay: this.options.reconnectionDelay,
          reconnectionDelayMax: this.options.reconnectionDelayMax,
          timeout: this.options.timeout,
          autoConnect: this.options.autoConnect,
          forceNew: true
        };

        this.socket = io(this.url, socketOptions);

        this.setupEventListeners(resolve, reject);

        // Timeout de conexión
        const timeout = setTimeout(() => {
          if (!this.isConnected()) {
            this.setStatus('error', 'Timeout de conexión');
            this.connectionPromise = null;
            reject(new Error('Timeout de conexión'));
          }
        }, this.options.timeout);

        // Limpiar timeout cuando se resuelva
        this.socket?.once('connect', () => clearTimeout(timeout));
        this.socket?.once('connect_error', () => clearTimeout(timeout));

        // Configurar verificación periódica de conexión
        this.startConnectionCheck();

      } catch (error) {
        this.setStatus('error', error instanceof Error ? error.message : 'Error de conexión');
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Configurar listeners de conexión
   */
  private setupEventListeners(
    resolve: (value: boolean) => void,
    reject: (reason?: any) => void
  ): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado a Socket.IO, ID:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.error = null;
      this.connectionPromise = null;
      
      // Emitir evento de conexión exitosa
      this.emitToListeners(SocketEvents.CONNECT, { socketId: this.socket?.id });
      resolve(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Desconectado de Socket.IO:', reason);
      this.setStatus('disconnected');
      
      // Si la desconexión fue intencional, no reconectar
      if (reason === 'io server disconnect') {
        this.setStatus('error', 'Desconectado por el servidor');
      }
      
      this.emitToListeners(SocketEvents.DISCONNECT, { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.setStatus('error', 'Máximo de intentos de reconexión alcanzado');
        this.connectionPromise = null;
        reject(error);
      } else {
        this.setStatus('reconnecting');
      }
      
      this.emitToListeners(SocketEvents.CONNECT_ERROR, { error: error.message });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión #${attemptNumber}`);
      this.setStatus('reconnecting');
      this.emitToListeners('reconnect_attempt', { attemptNumber });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconectado después de ${attemptNumber} intentos`);
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.error = null;
      this.emitToListeners('reconnect', { attemptNumber });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🚨 Falló la reconexión');
      this.setStatus('error', 'No se pudo reconectar');
      this.connectionPromise = null;
      this.emitToListeners('reconnect_failed');
    });

    this.socket.on(SocketEvents.ERROR, (data) => {
      console.error('❌ Error del servidor:', data);
      this.error = data.message || 'Error desconocido';
      this.emitToListeners(SocketEvents.ERROR, data);
    });

    this.socket.on(SocketEvents.SOCKET_CONNECTED, (data) => {
      console.log('📡 Confirmación de conexión:', data);
      // Unirse automáticamente a la sala de minutas
      this.joinRoom('minutes');
    });

    // ✅ SOLUCIÓN: Capturar TODOS los eventos del servidor y redistribuirlos
    this.socket.onAny((event: string, ...args: any[]) => {
      console.log(`📡 [Socket] Evento recibido: ${event}`, args[0]);
      // Redistribuir a los listeners locales
      this.emitToListeners(event, args[0]);
    });
  }

  /**
   * Iniciar verificación periódica de conexión
   */
  private startConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      if (this.socket && !this.socket.connected && this.status !== 'connecting') {
        console.log('⚠️ Conexión perdida, intentando reconectar...');
        this.setStatus('reconnecting');
        this.socket.connect();
      }
    }, 30000); // Verificar cada 30 segundos
  }

  /**
   * Establecer estado del socket
   */
  private setStatus(status: SocketStatus, error?: string): void {
    this.status = status;
    if (error) {
      this.error = error;
    }
  }

  /**
   * Emitir evento a todos los listeners registrados
   */
  private emitToListeners(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener de ${event}:`, error);
        }
      });
    }
  }

  /**
   * Registrar listener para un evento
   */
  on(event: string, callback: SocketEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)?.add(callback);
    
    // ✅ YA NO REGISTRAMOS EN EL SOCKET DIRECTAMENTE
    // El listener genérico onAny() se encarga de redistribuir todos los eventos
    
    // Retornar función para remover el listener
    return () => this.off(event, callback);
  }

  /**
   * Remover listener
   */
  off(event: string, callback?: SocketEventListener): void {
    if (callback) {
      // Remover de los listeners locales
      this.listeners.get(event)?.delete(callback);
    } else {
      // Remover todos los listeners de este evento
      this.listeners.delete(event);
    }
  }

  /**
   * Emitir evento al servidor
   */
  emit(event: string, data?: any): boolean {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket no conectado, no se puede emitir:', event);
      return false;
    }
    
    this.socket?.emit(event, data);
    return true;
  }

  /**
   * Unirse a una sala
   */
  joinRoom(room: string): boolean {
    if (!this.isConnected()) {
      console.warn('⚠️ Socket no conectado, no se puede unir a sala:', room);
      return false;
    }
    
    this.socket?.emit('join_room', room);
    console.log(`👥 Solicitando unirse a sala: ${room}`);
    return true;
  }

  /**
   * Salir de una sala
   */
  leaveRoom(room: string): boolean {
    if (!this.isConnected()) {
      return false;
    }
    
    this.socket?.emit('leave_room', room);
    console.log(`👥 Saliendo de sala: ${room}`);
    return true;
  }

  /**
   * Desconectar del servidor
   */
  disconnect(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    if (this.socket) {
      console.log('🔌 Desconectando Socket.IO');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.status = 'disconnected';
    this.connectionPromise = null;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Obtener estado de conexión
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtener estado actual
   */
  getStatus(): SocketStatus {
    return this.status;
  }

  /**
   * Obtener último error
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Obtener ID del socket
   */
  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Obtener instancia del socket (para casos avanzados)
   */
  getSocket(): Socket | null {
    return this.socket || null;
  }

  /**
   * Verificar si hay listeners para un evento
   */
  hasListeners(event: string): boolean {
    return this.listeners.has(event) && (this.listeners.get(event)?.size || 0) > 0;
  }

  /**
   * Obtener todos los eventos registrados
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// Exportar singleton
export const socketManager = SocketManager.getInstance();