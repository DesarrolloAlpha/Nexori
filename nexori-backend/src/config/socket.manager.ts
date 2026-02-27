import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

// Interfaz para el payload del token
interface TokenPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Interfaz para los métodos que expone el SocketManager
export interface ISocketManager {
  [x: string]: any;
  emitMinuteEvent(event: SocketEvents | string, data: any): void;
  emitBikeEvent(event: SocketEvents | string, data: any): void;
  emitPanicEvent(event: SocketEvents | string, data: any): void;
  emitToRoom(room: string, event: SocketEvents | string, data: any): void;
  emitToRooms(rooms: string[], event: SocketEvents | string, data: any): void;
  getStats(): any;
  getIO(): Server | null;
  isClientConnected(socketId: string): boolean;
}

// Tipos de eventos estandarizados
export enum SocketEvents {
  // Minutas
  MINUTE_CREATED = 'minute:created',
  MINUTE_UPDATED = 'minute:updated',
  MINUTE_DELETED = 'minute:deleted',
  MINUTE_STATUS_CHANGED = 'minute:status_changed',
  MINUTE_ASSIGNED = 'minute:assigned',
  MINUTE_ATTACHMENT_ADDED = 'minute:attachment_added',
  MINUTE_ATTACHMENT_DELETED = 'minute:attachment_deleted',
  
  // Bicicletas
  BIKE_CREATED = 'bike:created',
  BIKE_UPDATED = 'bike:updated',
  BIKE_DELETED = 'bike:deleted',
  BIKE_STATUS_CHANGED = 'bike:status_changed',
  
  // Pánico
  PANIC_CREATED = 'panic:created',
  PANIC_UPDATED = 'panic:updated',
  PANIC_RESOLVED = 'panic:resolved',
  PANIC_DELETED = 'panic:deleted',
  
  // Usuarios
  USER_UPDATED = 'user:updated',
  USER_STATUS_CHANGED = 'user:status_changed',
  
  // Generales
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room'
}

// Configuración de salas por rol
export const ROOMS_BY_ROLE = {
  admin: ['admins', 'minutes', 'bikes', 'panic', 'all'],
  coordinator: ['coordinators', 'minutes', 'bikes', 'panic', 'all'],
  supervisor: ['supervisors', 'minutes', 'bikes', 'panic', 'all'],
  operator: ['operators', 'minutes', 'panic', 'all'],
  guard: ['guards', 'minutes', 'panic', 'all'],
  user: ['users', 'panic', 'all'],
  locatario: ['locatarios'],
};

class SocketManagerImpl implements ISocketManager {
  private io: Server | null = null;
  private connectedClients: Map<string, { socketId: string, userId: string, role: string }> = new Map();
  private readonly JWT_SECRET = process.env.JWT_SECRET!;

  /**
   * Inicializar Socket.IO con el servidor HTTP
   */
  initialize(httpServer: HttpServer): void {
    if (this.io) {
      console.log('⚠️ Socket.IO ya está inicializado');
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }

    console.log('🔌 Inicializando Socket.IO Manager...');
    
    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Permitir conexiones desde cualquier origen en desarrollo
          if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
          }
          
          // En producción, validar orígenes permitidos
          const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          callback(new Error('Origen no permitido por CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000, // 60 segundos
      pingInterval: 25000, // 25 segundos
      connectTimeout: 45000, // 45 segundos
      maxHttpBufferSize: 1e6 // 1 MB
    });

    this.setupConnectionHandlers();
    console.log('✅ Socket.IO Manager inicializado correctamente');
  }

  /**
   * Configurar manejadores de conexión
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      console.log(`🟢 Cliente conectado: ${socket.id}`);

      // Obtener token de autenticación
      const token = socket.handshake.auth.token;
      if (!token) {
        console.warn(`⚠️ Cliente ${socket.id} intentó conectar sin token`);
        socket.emit(SocketEvents.ERROR, { message: 'Token de autenticación requerido' });
        socket.disconnect();
        return;
      }

      // Verificar token JWT
      try {
        const decoded = this.verifyToken(token);
        if (!decoded) {
          throw new Error('Token inválido');
        }

        // Guardar cliente conectado
        this.connectedClients.set(socket.id, {
          socketId: socket.id,
          userId: decoded.userId,
          role: decoded.role
        });

        // Unir al cliente a las salas según su rol
        const rooms = ROOMS_BY_ROLE[decoded.role as keyof typeof ROOMS_BY_ROLE] || ['users', 'panic', 'all'];
        rooms.forEach(room => {
          socket.join(room);
          console.log(`   📍 Cliente ${socket.id} unido a sala: ${room}`);
        });

        // Emitir confirmación de conexión
        socket.emit('socket:connected', {
          message: 'Conectado al servidor de tiempo real',
          socketId: socket.id,
          rooms
        });

        console.log(`✅ Cliente autenticado: ${decoded.userId} (${decoded.role}) en socket ${socket.id}`);

      } catch (error) {
        console.error(`❌ Error de autenticación para socket ${socket.id}:`, error);
        socket.emit(SocketEvents.ERROR, { message: 'Autenticación fallida' });
        socket.disconnect();
      }

      // Manejador para unirse a sala específica
      socket.on(SocketEvents.JOIN_ROOM, (room: string) => {
        socket.join(room);
        console.log(`   📍 Cliente ${socket.id} se unió a sala: ${room}`);
      });

      // Manejador para salir de sala
      socket.on(SocketEvents.LEAVE_ROOM, (room: string) => {
        socket.leave(room);
        console.log(`   📍 Cliente ${socket.id} salió de sala: ${room}`);
      });

      // Manejador de desconexión
      socket.on(SocketEvents.DISCONNECT, (reason) => {
        const client = this.connectedClients.get(socket.id);
        console.log(`🔴 Cliente desconectado: ${socket.id}`, {
          userId: client?.userId,
          reason
        });
        this.connectedClients.delete(socket.id);
      });

      // Manejador de errores
      socket.on(SocketEvents.ERROR, (error) => {
        console.error(`❌ Error en socket ${socket.id}:`, error);
      });
    });
  }

  /**
   * Verificar token JWT
   */
  private verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      console.error('Error verificando token:', error);
      return null;
    }
  }

  /**
   * Emitir evento a todas las salas relevantes para minutas.
   * Usa chaining de socket.io para que cada socket reciba el evento UNA sola vez,
   * aunque esté suscrito a múltiples salas del listado.
   */
  emitMinuteEvent(event: SocketEvents | string, data: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO no disponible, no se puede emitir evento:', event);
      return;
    }

    this.io.to('admins').to('coordinators').to('supervisors').to('minutes').emit(event, data);
    console.log(`📡 Evento de minuta emitido: ${event}`);
  }

  /**
   * Emitir evento de bicicleta.
   * Usa chaining de socket.io para evitar duplicados.
   */
  emitBikeEvent(event: SocketEvents | string, data: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO no disponible, no se puede emitir evento:', event);
      return;
    }

    this.io.to('admins').to('coordinators').to('supervisors').to('bikes').emit(event, data);
    console.log(`📡 Evento de bicicleta emitido: ${event}`);
  }

  /**
   * Emitir evento de pánico a TODAS las salas relevantes.
   * Usa chaining de socket.io para evitar duplicados a usuarios en múltiples salas.
   */
  emitPanicEvent(event: SocketEvents | string, data: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO no disponible, no se puede emitir evento:', event);
      return;
    }

    this.io
      .to('admins').to('coordinators').to('supervisors')
      .to('operators').to('guards').to('panic').to('all')
      .emit(event, data);

    console.log(`🚨 Evento de PÁNICO emitido: ${event}`, {
      eventType: event,
      eventId: data.id,
      status: data.status,
      priority: data.priority
    });
  }

  /**
   * Emitir evento a una sala específica
   */
  emitToRoom(room: string, event: SocketEvents | string, data: any): void {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
    console.log(`📡 Evento emitido a sala '${room}': ${event}`);
  }

  /**
   * Emitir evento a múltiples salas sin duplicados.
   * Usa chaining de socket.io.
   */
  emitToRooms(rooms: string[], event: SocketEvents | string, data: any): void {
    if (!this.io || rooms.length === 0) return;
    let emitter = this.io.to(rooms[0]);
    for (let i = 1; i < rooms.length; i++) {
      emitter = emitter.to(rooms[i]);
    }
    emitter.emit(event, data);
    console.log(`📡 Evento emitido a ${rooms.length} salas: ${event}`);
  }

  /**
   * Obtener estadísticas de conexión
   */
  getStats(): any {
    return {
      totalConnected: this.connectedClients.size,
      clients: Array.from(this.connectedClients.values()),
      rooms: this.io?.sockets.adapter.rooms ? 
        Array.from(this.io.sockets.adapter.rooms.keys()) : []
    };
  }

  /**
   * Obtener instancia de IO
   */
  getIO(): Server | null {
    return this.io;
  }

  /**
   * Verificar si un cliente está conectado
   */
  isClientConnected(socketId: string): boolean {
    return this.connectedClients.has(socketId);
  }
}

// Crear y exportar la instancia única
const socketManagerInstance = new SocketManagerImpl();

// Exportar la interfaz y la instancia
export type { SocketManagerImpl as SocketManager };
export const socketManager: ISocketManager = socketManagerInstance;