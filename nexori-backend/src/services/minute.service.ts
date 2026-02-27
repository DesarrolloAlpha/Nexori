import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
// ✅ CORREGIDO: Rutas según tu estructura (src/models/)
import { VirtualMinute } from '../models/VirtualMinute.entity';
import { User } from '../models/User.entity';
import { 
  CreateMinuteInput, 
  UpdateMinuteInput, 
  MinuteFilter,
  MinuteResponse,
  MinutesPaginated,
  MinuteStats
} from '../types/minute.types';
import { SocketEvents, socketManager } from '../config/socket.manager';
// 🆕 IMPORTAR ImageUtils
import { ImageUtils } from '../utils/image.utils';
import path from 'path';

class MinuteService {
  private minuteRepository: Repository<VirtualMinute>;
  private userRepository: Repository<User>;

  constructor() {
    this.minuteRepository = AppDataSource.getRepository(VirtualMinute);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Obtener todas las minutas con filtros y paginación
   */
  async getAllMinutes(filters: MinuteFilter, userId?: string): Promise<MinutesPaginated> {
    const {
      status,
      search,
      type,
      priority,
      page = 1,
      limit = 20,
      orderBy = 'createdAt',
      order = 'DESC'
    } = filters;

    const queryBuilder = this.minuteRepository.createQueryBuilder('minute');

    if (status && status !== 'all') {
      queryBuilder.andWhere('minute.status = :status', { status });
    }

    if (type && type !== 'all') {
      queryBuilder.andWhere('minute.type = :type', { type });
    }

    if (priority && priority !== 'all') {
      queryBuilder.andWhere('minute.priority = :priority', { priority });
    }

    if (search) {
      queryBuilder.andWhere(
        '(minute.title ILIKE :search OR minute.description ILIKE :search OR minute.location ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.orderBy(`minute.${orderBy}`, order);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [minutes, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      minutes: minutes.map(m => this.toResponse(m)),
      total,
      page,
      totalPages,
      hasMore
    };
  }

  /**
   * Obtener minuta por ID
   */
  async getMinuteById(id: string, userId?: string): Promise<MinuteResponse> {
    const minute = await this.minuteRepository.findOne({ where: { id } });

    if (!minute) {
      throw new Error('Minuta no encontrada');
    }

    return this.toResponse(minute);
  }

  /**
   * Crear nueva minuta
   */
  async createMinute(data: CreateMinuteInput, userId: string): Promise<MinuteResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const minute = this.minuteRepository.create({
      ...data,
      reportedBy: userId,
      // ✅ CORREGIDO: Usar user.name en lugar de firstName + lastName
      reportedByName: data.reportedByName || user.name,
      status: 'pending',
      attachments: data.attachments || []
    });

    const savedMinute = await this.minuteRepository.save(minute);

    const response = this.toResponse(savedMinute);
    socketManager.emitMinuteEvent(SocketEvents.MINUTE_CREATED, response);

    return response;
  }

  /**
   * Actualizar minuta
   */
  async updateMinute(id: string, data: UpdateMinuteInput, userId: string): Promise<MinuteResponse> {
    const minute = await this.minuteRepository.findOne({ where: { id } });

    if (!minute) {
      throw new Error('Minuta no encontrada');
    }

    if (data.status === 'reviewed' && !minute.resolvedAt) {
      minute.resolvedAt = new Date();
      minute.resolvedBy = userId;
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        // ✅ CORREGIDO: Usar user.name
        minute.resolvedByName = user.name;
      }
    }

    if (data.status === 'closed' && !minute.closedAt) {
      minute.closedAt = new Date();
      minute.closedBy = userId;
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        // ✅ CORREGIDO: Usar user.name
        minute.closedByName = user.name;
      }
    }

    Object.assign(minute, data);
    const updatedMinute = await this.minuteRepository.save(minute);

    const response = this.toResponse(updatedMinute);
    socketManager.emitMinuteEvent(SocketEvents.MINUTE_UPDATED, response);

    return response;
  }

  /**
   * Eliminar minuta
   * 🆕 MODIFICADO: Ahora elimina imágenes del filesystem
   */
  async deleteMinute(id: string, userId: string): Promise<boolean> {
    const minute = await this.minuteRepository.findOne({ where: { id } });

    if (!minute) {
      throw new Error('Minuta no encontrada');
    }

    // 🆕 AGREGADO: Eliminar imágenes asociadas del sistema de archivos
    if (minute.attachments && minute.attachments.length > 0) {
      minute.attachments.forEach((imageUrl: string) => {
        try {
          ImageUtils.deleteImage(imageUrl);
        } catch (error) {
          console.error(`⚠️ Error al eliminar imagen ${imageUrl}:`, error);
          // Continuar aunque falle la eliminación de una imagen
        }
      });
    }

    await this.minuteRepository.remove(minute);

    socketManager.emitMinuteEvent(SocketEvents.MINUTE_DELETED, { id: id });

    return true;
  }

  /**
   * Obtener estadísticas
   */
  async getStatistics(userId?: string): Promise<MinuteStats> {
    const queryBuilder = this.minuteRepository.createQueryBuilder('minute');

    const [total, pending, reviewed, closed] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().where('minute.status = :status', { status: 'pending' }).getCount(),
      queryBuilder.clone().where('minute.status = :status', { status: 'reviewed' }).getCount(),
      queryBuilder.clone().where('minute.status = :status', { status: 'closed' }).getCount()
    ]);

    const byType = {
      anotacion: await queryBuilder.clone().where('minute.type = :type', { type: 'anotacion' }).getCount(),
      hurto: await queryBuilder.clone().where('minute.type = :type', { type: 'hurto' }).getCount(),
      novedad_vehiculo: await queryBuilder.clone().where('minute.type = :type', { type: 'novedad_vehiculo' }).getCount(),
      objetos_abandonados: await queryBuilder.clone().where('minute.type = :type', { type: 'objetos_abandonados' }).getCount(),
      novedad: await queryBuilder.clone().where('minute.type = :type', { type: 'novedad' }).getCount(),
      observacion: await queryBuilder.clone().where('minute.type = :type', { type: 'observacion' }).getCount(),
      recomendacion: await queryBuilder.clone().where('minute.type = :type', { type: 'recomendacion' }).getCount(),
      incidente: await queryBuilder.clone().where('minute.type = :type', { type: 'incidente' }).getCount(),
      emergencia: await queryBuilder.clone().where('minute.type = :type', { type: 'emergencia' }).getCount(),
      mantenimiento: await queryBuilder.clone().where('minute.type = :type', { type: 'mantenimiento' }).getCount(),
      persona_sospechosa: await queryBuilder.clone().where('minute.type = :type', { type: 'persona_sospechosa' }).getCount()
    };

    const byPriority = {
      high: await queryBuilder.clone().where('minute.priority = :priority', { priority: 'high' }).getCount(),
      medium: await queryBuilder.clone().where('minute.priority = :priority', { priority: 'medium' }).getCount(),
      low: await queryBuilder.clone().where('minute.priority = :priority', { priority: 'low' }).getCount()
    };

    return {
      total,
      pending,
      reviewed,
      closed,
      byType,
      byPriority
    };
  }

  /**
   * Asignar minuta a usuario
   */
  async assignMinute(id: string, assignToId: string, userId: string): Promise<MinuteResponse> {
    const minute = await this.minuteRepository.findOne({ where: { id } });

    if (!minute) {
      throw new Error('Minuta no encontrada');
    }

    const assignedUser = await this.userRepository.findOne({ where: { id: assignToId } });

    if (!assignedUser) {
      throw new Error('Usuario a asignar no encontrado');
    }

    minute.assignedTo = assignToId;
    // ✅ CORREGIDO: Usar assignedUser.name
    minute.assignedToName = assignedUser.name;

    const updatedMinute = await this.minuteRepository.save(minute);

    const response = this.toResponse(updatedMinute);
    socketManager.emitMinuteEvent(SocketEvents.MINUTE_UPDATED, response);

    return response;
  }

  /**
   * 🆕 NUEVO: Subir imagen adjunta CON COMPRESIÓN AUTOMÁTICA
   * Este método ahora:
   * - Valida que sea una imagen válida
   * - Comprime a WebP con calidad 40%
   * - Redimensiona a máximo 800x800px
   * - Mueve a /uploads/minutes/
   * - Guarda URL en la base de datos
   * - Notifica vía WebSocket
   */
  async uploadAttachment(minuteId: string, file: Express.Multer.File, userId: string) {
    try {
      const minute = await this.minuteRepository.findOne({ where: { id: minuteId } });

      if (!minute) {
        throw new Error('Minuta no encontrada');
      }

      console.log(`📤 Procesando imagen para minuta ${minuteId}...`);
      console.log(`   Archivo original: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);

      // 1️⃣ Validar que sea una imagen válida (no corrupta)
      const isValid = await ImageUtils.validateImage(file.path);
      if (!isValid) {
        throw new Error('El archivo no es una imagen válida');
      }

      // 2️⃣ Comprimir imagen a WebP con calidad baja
      console.log('   🔄 Comprimiendo imagen...');
      const compressedPath = await ImageUtils.compressImage(file.path, {
        quality: 40,    // Calidad baja para pruebas (ajustable)
        maxWidth: 800,  // Ancho máximo
        maxHeight: 800  // Alto máximo
      });

      // 3️⃣ Mover a carpeta permanente /uploads/minutes/
      const imageUrl = await ImageUtils.moveToUploads(compressedPath, 'minutes');

      // 4️⃣ Agregar URL a la minuta en BD
      minute.attachments = [...(minute.attachments || []), imageUrl];
      await this.minuteRepository.save(minute);

      console.log(`✅ Imagen guardada: ${imageUrl}`);

      // 5️⃣ Preparar respuesta y notificar vía WebSocket
      const response = this.toResponse(minute);
      socketManager.emitMinuteEvent(SocketEvents.MINUTE_UPDATED, response);

      return {
        success: true,
        message: 'Imagen adjuntada exitosamente',
        data: {
          url: imageUrl,
          minute: response
        }
      };
    } catch (error: any) {
      console.error('❌ Error en uploadAttachment:', error);
      throw error;
    }
  }

  /**
   * 🆕 NUEVO: Eliminar imagen adjunta
   * - Elimina del sistema de archivos
   * - Elimina de la base de datos
   * - Notifica vía WebSocket
   */
  async deleteAttachment(minuteId: string, attachmentIndex: number, userId: string) {
    try {
      const minute = await this.minuteRepository.findOne({ where: { id: minuteId } });

      if (!minute) {
        throw new Error('Minuta no encontrada');
      }

      if (!minute.attachments || minute.attachments.length === 0) {
        throw new Error('Esta minuta no tiene archivos adjuntos');
      }

      if (attachmentIndex < 0 || attachmentIndex >= minute.attachments.length) {
        throw new Error('Índice de archivo inválido');
      }

      const imageUrl = minute.attachments[attachmentIndex];

      // Eliminar del sistema de archivos
      try {
        ImageUtils.deleteImage(imageUrl);
      } catch (error) {
        console.error(`⚠️ Error al eliminar imagen ${imageUrl}:`, error);
        // Continuar aunque falle la eliminación física
      }

      // Eliminar de la base de datos
      minute.attachments = minute.attachments.filter((_: string, index: number) => index !== attachmentIndex);
      await this.minuteRepository.save(minute);

      const response = this.toResponse(minute);
      socketManager.emitMinuteEvent(SocketEvents.MINUTE_UPDATED, response);

      return {
        success: true,
        message: 'Imagen eliminada exitosamente',
        data: response
      };
    } catch (error: any) {
      console.error('❌ Error en deleteAttachment:', error);
      throw error;
    }
  }

  /**
   * Convertir entidad a respuesta
   */
  private toResponse(minute: VirtualMinute): MinuteResponse {
    return {
      id: minute.id,
      title: minute.title,
      description: minute.description,
      type: minute.type,
      status: minute.status,
      priority: minute.priority,
      reportedBy: minute.reportedBy,
      reportedByName: minute.reportedByName,
      location: minute.location || '',
      assignedTo: minute.assignedTo,
      assignedToName: minute.assignedToName,
      attachments: minute.attachments || [],
      resolvedAt: minute.resolvedAt,
      resolvedBy: minute.resolvedBy,
      resolvedByName: minute.resolvedByName,
      closedAt: minute.closedAt,
      closedBy: minute.closedBy,
      closedByName: minute.closedByName,
      createdAt: minute.createdAt,
      updatedAt: minute.updatedAt
    };
  }
}

export const minuteService = new MinuteService();
