import { AppDataSource } from '../config/database';
import { PanicEvent } from '../models/PanicEvent.entity';
import { User } from '../models/User.entity';
import { socketManager, SocketEvents } from '../config/socket.manager';
import { ImageUtils } from '../utils/image.utils';

export class PanicService {
  private panicRepository = AppDataSource.getRepository(PanicEvent);
  private userRepository = AppDataSource.getRepository(User);
  private socketManager = socketManager;

  /**
   * ✅ MEJORADO: Serializar correctamente el evento antes de emitir
   */
  private serializePanicEvent(panicEvent: PanicEvent): any {
    return {
      id: panicEvent.id,
      userId: panicEvent.userId,
      userName: panicEvent.userName,
      status: panicEvent.status,
      timestamp: panicEvent.timestamp?.toISOString() || new Date().toISOString(),
      attendedBy: panicEvent.attendedBy || null,
      attendedAt: panicEvent.attendedAt?.toISOString() || null,
      resolvedAt: panicEvent.resolvedAt?.toISOString() || null,
      notes: panicEvent.notes || null,
      attachments: panicEvent.attachments || [],
      createdAt: panicEvent.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: panicEvent.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Crear nuevo evento de pánico
   */
  async createPanicEvent(
    userId: string,
    userName: string
  ): Promise<PanicEvent> {
    try {
      const panicEvent = this.panicRepository.create({
        userId,
        userName,
        status: 'active',
        timestamp: new Date(),
      });

      await this.panicRepository.save(panicEvent);

      console.log('🚨 Evento de pánico creado:', {
        id: panicEvent.id,
        user: userName,
      });
      
      // ✅ MEJORADO: Serializar y emitir evento WebSocket
      const serializedEvent = this.serializePanicEvent(panicEvent);
      
      this.socketManager.emitPanicEvent(
        SocketEvents.PANIC_CREATED, 
        serializedEvent
      );
      
      console.log('📡 Evento PANIC_CREATED emitido correctamente');
      
      return panicEvent;
    } catch (error) {
      console.error('❌ Error en PanicService.createPanicEvent:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los eventos de pánico
   */
  async getAllPanicEvents(filters: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PanicEvent[]> {
    try {
      const { status, startDate, endDate } = filters;

      let query = this.panicRepository.createQueryBuilder('panic')
        .leftJoinAndSelect('panic.attendedByUser', 'user');

      if (status) {
        query = query.where('panic.status = :status', { status });
      }

      if (startDate) {
        query = query.andWhere('panic.timestamp >= :startDate', { startDate });
      }
      
      if (endDate) {
        query = query.andWhere('panic.timestamp <= :endDate', { endDate });
      }
      
      query = query.orderBy('panic.timestamp', 'DESC');
      
      const events = await query.getMany();
      
      console.log(`📋 Eventos de pánico obtenidos: ${events.length}`);
      
      return events;
    } catch (error) {
      console.error('❌ Error en PanicService.getAllPanicEvents:', error);
      throw error;
    }
  }

  /**
   * ✅ MEJORADO: Actualizar estado de evento de pánico
   */
  async updatePanicStatus(
    id: string, 
    status: 'active' | 'attended' | 'resolved', 
    notes: string | undefined,
    userId: string,
    userName: string
  ): Promise<PanicEvent> {
    try {
      const panicEvent = await this.panicRepository.findOne({ where: { id } });
      
      if (!panicEvent) {
        throw new Error('Evento de pánico no encontrado');
      }
      
      const previousStatus = panicEvent.status;
      
      // Actualizar estado
      panicEvent.status = status;
      panicEvent.attendedBy = userName;
      panicEvent.attendedAt = new Date();
      
      if (notes) {
        panicEvent.notes = notes;
      }
      
      if (status === 'resolved') {
        panicEvent.resolvedAt = new Date();
      }
      
      await this.panicRepository.save(panicEvent);
      
      console.log('✅ Estado de pánico actualizado:', {
        id: panicEvent.id,
        previousStatus,
        newStatus: status,
        attendedBy: userName
      });
      
      // ✅ MEJORADO: Serializar y emitir evento WebSocket
      const serializedEvent = this.serializePanicEvent(panicEvent);
      
      // Emitir evento de actualización
      this.socketManager.emitPanicEvent(
        SocketEvents.PANIC_UPDATED, 
        {
          ...serializedEvent,
          previousStatus,
          newStatus: status,
          updatedBy: userId,
          updatedByName: userName,
        }
      );
      
      console.log('📡 Evento PANIC_UPDATED emitido correctamente');
      
      // Si se resolvió, emitir evento específico
      if (status === 'resolved') {
        this.socketManager.emitPanicEvent(
          SocketEvents.PANIC_RESOLVED, 
          {
            ...serializedEvent,
            resolvedBy: userId,
            resolvedByName: userName,
          }
        );
        
        console.log('📡 Evento PANIC_RESOLVED emitido correctamente');
      }
      
      return panicEvent;
    } catch (error) {
      console.error('❌ Error en PanicService.updatePanicStatus:', error);
      throw error;
    }
  }

  /**
   * Obtener evento de pánico por ID
   */
  async getPanicEventById(id: string): Promise<PanicEvent> {
    try {
      const panicEvent = await this.panicRepository.findOne({ 
        where: { id },
        relations: ['attendedByUser']
      });
      
      if (!panicEvent) {
        throw new Error('Evento de pánico no encontrado');
      }
      
      return panicEvent;
    } catch (error) {
      console.error('❌ Error en PanicService.getPanicEventById:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de pánico
   */
  async getPanicStatistics(): Promise<any> {
    try {
      const total = await this.panicRepository.count();
      
      const active = await this.panicRepository.count({ where: { status: 'active' } });
      const attended = await this.panicRepository.count({ where: { status: 'attended' } });
      const resolved = await this.panicRepository.count({ where: { status: 'resolved' } });
      
      const stats = {
        total,
        byStatus: { active, attended, resolved },
        today: await this.getTodayCount(),
      };
      
      console.log('📊 Estadísticas de pánico:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ Error en PanicService.getPanicStatistics:', error);
      throw error;
    }
  }

  /**
   * Subir imagen adjunta a un evento de pánico
   * Comprime a WebP, guarda en /uploads/panic/, actualiza la BD y emite WebSocket
   */
  async uploadPanicImage(id: string, file: Express.Multer.File, userId: string) {
    try {
      const panicEvent = await this.panicRepository.findOne({ where: { id } });

      if (!panicEvent) {
        throw new Error('Evento de pánico no encontrado');
      }

      console.log(`📤 Procesando imagen para evento de pánico ${id}...`);

      const isValid = await ImageUtils.validateImage(file.path);
      if (!isValid) {
        throw new Error('El archivo no es una imagen válida');
      }

      const compressedPath = await ImageUtils.compressImage(file.path, {
        quality: 40,
        maxWidth: 800,
        maxHeight: 800,
      });

      const imageUrl = await ImageUtils.moveToUploads(compressedPath, 'panic');

      panicEvent.attachments = [...(panicEvent.attachments || []), imageUrl];
      await this.panicRepository.save(panicEvent);

      console.log(`✅ Imagen guardada: ${imageUrl}`);

      const serializedEvent = this.serializePanicEvent(panicEvent);
      this.socketManager.emitPanicEvent(SocketEvents.PANIC_UPDATED, serializedEvent);

      return {
        success: true,
        message: 'Imagen adjuntada exitosamente',
        data: {
          url: imageUrl,
          panicEvent: serializedEvent,
        },
      };
    } catch (error: any) {
      console.error('❌ Error en uploadPanicImage:', error);
      throw error;
    }
  }

  /**
   * Obtener eventos de hoy
   */
  private async getTodayCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return await this.panicRepository.createQueryBuilder('panic')
      .where('panic.timestamp >= :today', { today })
      .andWhere('panic.timestamp < :tomorrow', { tomorrow })
      .getCount();
  }
}

// Exportar instancia única
export const panicService = new PanicService();