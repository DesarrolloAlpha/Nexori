import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_CONFIG } from '../config/api.config';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = SOCKET_CONFIG.reconnectionAttempts;

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
      transports: SOCKET_CONFIG.transports as any,
      reconnection: SOCKET_CONFIG.reconnection,
      reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
      reconnectionDelayMax: SOCKET_CONFIG.reconnectionDelayMax,
      reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
      auth: {
        token, // Token JWT para autenticación
      },
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

    this.socket.on('disconnect', (reason: string) => {
      console.warn('🔌 Desconectado de Socket.IO:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Error de conexión Socket.IO:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🚨 Máximo de intentos de reconexión alcanzado');
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Intento de reconexión #${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🚨 Falló la reconexión. Por favor, reinicia la app.');
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
    this.socket.on(event, callback);
  }

  /**
   * Dejar de escuchar un evento
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
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
}

// Exportar una única instancia (singleton)
export const socketService = new SocketService();