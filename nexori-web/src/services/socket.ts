import { io, Socket } from 'socket.io-client';

// Configuración del servidor (ajusta según tu .env)
const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: Map<string, Set<Function>> = new Map();

  /**
   * Conectar al servidor Socket.IO
   */
  connect(token?: string): Socket {
    if (this.socket?.connected) {
      console.log('✅ Socket ya está conectado');
      return this.socket;
    }

    console.log('🔌 Conectando a Socket.IO:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token, // Token JWT para autenticación
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      // ✅ IMPORTANTE: Permitir que el cliente reciba sus propios eventos
      withCredentials: true,
    });

    this.setupEventListeners();
    return this.socket;
  }

  /**
   * Configurar listeners de eventos de conexión
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado a Socket.IO:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Desconectado de Socket.IO:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🚨 Máximo de intentos de reconexión alcanzado');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión #${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🚨 Falló la reconexión. Por favor, recarga la página.');
    });

    // ✅ IMPORTANTE: Escuchar todos los eventos para debug
    this.socket.onAny((event, ...args) => {
      console.log(`📡 Evento recibido: ${event}`, args);
    });
  }

  /**
   * Unirse a una sala específica (por rol)
   */
  joinRoom(room: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket no conectado. No se puede unir a la sala:', room);
      return;
    }

    console.log('👥 Uniéndose a la sala:', room);
    this.socket.emit('join_room', room);
  }

  /**
   * Escuchar un evento
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('⚠️ Socket no inicializado');
      return;
    }
    
    // Guardar para referencia
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    this.socket.on(event, callback);
  }

  /**
   * Dejar de escuchar un evento
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
      this.eventListeners.get(event)?.delete(callback);
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event);
    }
  }

  /**
   * Emitir un evento
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket no conectado. No se puede emitir:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Desconectar del servidor
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Desconectando Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.eventListeners.clear();
    }
  }

  /**
   * Obtener el estado de conexión
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtener la instancia del socket (para casos avanzados)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Re-conectar manualmente
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Exportar una única instancia (singleton)
export const socketService = new SocketService();