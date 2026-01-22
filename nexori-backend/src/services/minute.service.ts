import { AppDataSource } from '../config/database';
import { VirtualMinute } from '../models/VirtualMinute.entity';
import { User } from '../models/User.entity';
import { 
  CreateMinuteInput, 
  UpdateMinuteInput, 
  MinuteFilter,
  MinutesPaginated,
  MinuteStats
} from '../types/minute.types';
import { Like, FindOptionsWhere } from 'typeorm';

// Importamos io del server (necesitarás ajustar esta importación según tu estructura)
// import { io } from '../server';

export class MinuteService {
  private minuteRepository = AppDataSource.getRepository(VirtualMinute);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Obtener todas las minutas con filtros y paginación
   */
  async getAllMinutes(
    filters: MinuteFilter, 
    userId?: string
  ): Promise<MinutesPaginated> {
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

    const skip = (page - 1) * limit;
    const where: any = {};

    // Filtro por estado
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filtro por tipo
    if (type) {
      where.type = type;
    }

    // Filtro por prioridad
    if (priority) {
      where.priority = priority;
    }

    // Filtro por usuario (si es operador, ver solo las asignadas)
    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.role === 'operator') {
        where.assignedTo = userId;
      }
    }

    // Construir query con búsqueda
    const query = this.minuteRepository.createQueryBuilder('minute')
      .where(where);

    // Aplicar búsqueda en múltiples campos (usando ILIKE para case-insensitive)
    if (search) {
      query.andWhere(
        '(LOWER(minute.title) LIKE LOWER(:search) OR LOWER(minute.description) LIKE LOWER(:search) OR LOWER(minute.location) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // Ordenar y paginar
    query.orderBy(`minute.${orderBy}`, order)
         .skip(skip)
         .take(limit);

    // Ejecutar query
    const [minutes, total] = await query.getManyAndCount();

    // Transformar a response
    const responseMinutes = minutes.map(minute => this.mapToResponse(minute));

    return {
      minutes: responseMinutes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + minutes.length < total
    };
  }

  /**
   * Obtener minuta por ID
   */
  async getMinuteById(id: string, userId?: string): Promise<any> {
    const minute = await this.minuteRepository.findOne({
      where: { id },
      relations: ['reportedByUser', 'assignedToUser']
    });

    if (!minute) {
      throw new Error('Minuta no encontrada');
    }

    // Verificar permisos (operadores solo ven las asignadas)
    if (userId && minute.assignedTo !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.role === 'operator') {
        throw new Error('No tienes permisos para ver esta minuta');
      }
    }

    return this.mapToResponse(minute);
  }

  /**
   * Crear nueva minuta
   */
  async createMinute(data: CreateMinuteInput, userId: string): Promise<any> {
    try {
      console.log('📝 Creando minuta para userId:', userId);
      
      // ✅ Validar que userId existe
      if (!userId) {
        throw new Error('UserId es requerido para crear minuta');
      }
      // Obtener usuario
      const user = await this.userRepository.findOne({ where: { id: userId } });     
      if (!user) {
        throw new Error(`Usuario con ID ${userId} no encontrado`);
      }
      console.log('👤 Usuario encontrado:', user.name);

    // Crear minuta
    const minute = this.minuteRepository.create({
      ...data,
      reportedBy: userId, // ← Usar el userId
      reportedByName: `${user.name} - ${this.getRoleLabel(user.role)}`,
      reportedByUser: user,
      status: 'pending',
      attachments: data.attachments || [],
    });

    const savedMinute = await this.minuteRepository.save(minute);
    console.log('✅ Minuta creada con ID:', savedMinute.id);

    // Emitir evento WebSocket - Comentado temporalmente
    // this.emitWebSocketEvent('minute_created', {
    //   ...this.mapToResponse(savedMinute),
    //   priority: data.priority
    // });

    // Notificar por alta prioridad
    if (data.priority === 'high') {
      // this.emitWebSocketEvent('high_priority_minute', this.mapToResponse(savedMinute));
      console.log('Alta prioridad minuta creada:', savedMinute.id);
    }

    console.log('Minuta creada:', savedMinute.id);

    return this.mapToResponse(savedMinute);
    
    } catch (error) {
      console.error('❌ Error en createMinute:', error);
      throw error;
    }
  }

/**
 * Actualizar minuta
 */
async updateMinute(
  id: string, 
  data: UpdateMinuteInput, 
  userId: string
): Promise<any> {
  console.log(`🔄 Actualizando minuta ${id} por usuario ${userId}`);
  
  const minute = await this.minuteRepository.findOne({ where: { id } });
  
  if (!minute) {
    throw new Error('Minuta no encontrada');
  }

  // Obtener usuario que realiza la acción
  const user = await this.userRepository.findOne({ where: { id: userId } });
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  console.log(`👤 Usuario: ${user.name}, Rol: ${user.role}`);

  // Lógica de permisos mejorada
  if (user.role === 'operator') {
    if (data.status === 'in_progress' && minute.status === 'pending') {
      console.log('✅ Operador tomando acción en minuta pendiente');
      data.assignedTo = userId;
      data.assignedToName = user.name;
    }
    else if (minute.assignedTo !== userId) {
      throw new Error('No tienes permisos para editar esta minuta');
    }
  }

  // Guardar quién realizó la acción y cuándo
  const now = new Date();
  
  if (data.status === 'resolved' && minute.status !== 'resolved') {
    data.resolvedAt = now;
    data.resolvedBy = userId;
    data.resolvedByName = user.name;
    console.log(`✅ Minuta resuelta por ${user.name}`);
  }
  
  if (data.status === 'closed' && minute.status !== 'closed') {
    data.closedAt = now;
    data.closedBy = userId;
    data.closedByName = user.name;
    console.log(`✅ Minuta cerrada por ${user.name}`);
  }

  // Actualizar minuta
  Object.assign(minute, data);
  const updatedMinute = await this.minuteRepository.save(minute);



      // Emitir evento de actualización
      // this.emitWebSocketEvent('minute_updated', {
      //   ...this.mapToResponse(updatedMinute),
      //   updatedBy: userId
      // });

  console.log('✅ Minuta actualizada:', updatedMinute.id);

  return this.mapToResponse(updatedMinute);
}

  /**
   * Eliminar minuta (soft delete)
   */
  async deleteMinute(id: string, userId: string): Promise<{ success: boolean }> {
    const minute = await this.minuteRepository.findOne({ where: { id } });
    
    if (!minute) {
      throw new Error('Minuta no encontrada');
    }

    // Solo administradores pueden eliminar
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.role !== 'admin') {
      throw new Error('No tienes permisos para eliminar minutas');
    }

    await this.minuteRepository.softDelete(id);

    // Emitir evento de eliminación
    // this.emitWebSocketEvent('minute_deleted', { id });

    console.log('Minuta eliminada:', id);

    return { success: true };
  }

  /**
   * Obtener estadísticas
   */
  async getStatistics(userId?: string): Promise<MinuteStats> {
    const query = this.minuteRepository.createQueryBuilder('minute');
    
    // Filtrar por usuario si es operador
    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.role === 'operator') {
        query.where({ assignedTo: userId });
      }
    }

    const total = await query.getCount();

    // Contar por estado
    const statusCounts = await query
      .select('minute.status, COUNT(*) as count')
      .groupBy('minute.status')
      .getRawMany();

    // Contar por tipo
    const typeCounts = await query
      .select('minute.type, COUNT(*) as count')
      .groupBy('minute.type')
      .getRawMany();

    // Contar por prioridad
    const priorityCounts = await query
      .select('minute.priority, COUNT(*) as count')
      .groupBy('minute.priority')
      .getRawMany();

    // Transformar resultados
    const stats: MinuteStats = {
      total,
      pending: this.getCount(statusCounts, 'pending'),
      in_progress: this.getCount(statusCounts, 'in_progress'),
      resolved: this.getCount(statusCounts, 'resolved'),
      closed: this.getCount(statusCounts, 'closed'),
      byType: {
        incident: this.getCount(typeCounts, 'incident'),
        novelty: this.getCount(typeCounts, 'novelty'),
        observation: this.getCount(typeCounts, 'observation')
      },
      byPriority: {
        high: this.getCount(priorityCounts, 'high'),
        medium: this.getCount(priorityCounts, 'medium'),
        low: this.getCount(priorityCounts, 'low')
      }
    };

    return stats;
  }

  /**
   * Asignar minuta a usuario
   */
  async assignMinute(minuteId: string, assignToId: string, userId: string): Promise<any> {
    const minute = await this.minuteRepository.findOne({ where: { id: minuteId } });
    const assignUser = await this.userRepository.findOne({ where: { id: assignToId } });
    
    if (!minute || !assignUser) {
      throw new Error('Minuta o usuario no encontrado');
    }

    // Verificar permisos (solo admin/supervisor pueden asignar)
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !['admin', 'supervisor'].includes(user.role)) {
      throw new Error('No tienes permisos para asignar minutas');
    }

    minute.assignedTo = assignToId;
    minute.assignedToName = assignUser.name; // CAMBIADO: fullName -> name
    minute.status = 'in_progress';
    
    const updatedMinute = await this.minuteRepository.save(minute);

    // Emitir evento de asignación
    // this.emitWebSocketEvent('minute_assigned', {
    //   minuteId,
    //   assignedTo: assignToId,
    //   assignedByName: assignUser.name,
    //   assignedBy: userId
    // });

    console.log('Minuta asignada:', minuteId, 'a', assignUser.name);

    return this.mapToResponse(updatedMinute);
  }

    /**
   * Subir archivo adjunto a minuta
   */
  async uploadAttachment(
    minuteId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<any> {
    try {
      console.log(`📎 Subiendo archivo para minuta ${minuteId} por usuario ${userId}`);
      
      // 1. Verificar que la minuta existe
      const minute = await this.minuteRepository.findOne({ 
        where: { id: minuteId },
        relations: ['reportedByUser', 'assignedToUser']
      });
      
      if (!minute) {
        throw new Error('Minuta no encontrada');
      }

      // 2. Verificar permisos (reportante, asignado, o admin/supervisor)
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const userRole = user?.role;
      
      const isOwner = minute.reportedBy === userId;
      const isAssigned = minute.assignedTo === userId;
      const canManage = ['admin', 'supervisor', 'coordinator'].includes(userRole || '');
      
      if (!isOwner && !isAssigned && !canManage) {
        throw new Error('No tienes permisos para subir archivos a esta minuta');
      }

      // 3. Crear nombre único para el archivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const originalName = file.originalname;
      const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
      const safeFileName = `${timestamp}_${randomString}${fileExtension}`;
      
      // 4. Guardar información del archivo (en producción, subirías a S3/Cloud Storage)
      // Para desarrollo: guardar en carpeta uploads
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, safeFileName);
      
      // Mover el archivo del temp al destino final
      fs.copyFileSync(file.path, filePath);
      
      // 5. Crear objeto de metadata del archivo
      const attachmentData = {
        filename: safeFileName,
        originalName: originalName,
        path: filePath,
        url: `/uploads/${safeFileName}`, // URL accesible
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: userId,
        uploadedByName: user?.name || 'Usuario',
        uploadedAt: new Date(),
      };

      // 6. Actualizar la minuta con el nuevo archivo
      const currentAttachments = minute.attachments || [];
      const updatedAttachments = [...currentAttachments, JSON.stringify(attachmentData)];
      
      minute.attachments = updatedAttachments;
      
      // 7. Agregar registro en la descripción
      const uploadRecord = `\n\n--- ARCHIVO ADJUNTO [${new Date().toLocaleString()}] ---\nArchivo: ${originalName}\nSubido por: ${user?.name}\nTamaño: ${Math.round(file.size / 1024)}KB`;
      minute.description = minute.description + uploadRecord;
      
      // 8. Guardar cambios
      const updatedMinute = await this.minuteRepository.save(minute);
      
      console.log(`✅ Archivo subido: ${originalName} para minuta ${minuteId}`);
      
      // 9. Emitir evento WebSocket (si está configurado)
      // this.emitWebSocketEvent('minute_attachment_uploaded', {
      //   minuteId,
      //   attachment: attachmentData,
      //   uploadedBy: userId
      // });

      return {
        success: true,
        data: {
          ...attachmentData,
          minuteId: minuteId
        },
        message: 'Archivo subido exitosamente'
      };
      
    } catch (error: any) {
      console.error('❌ Error en uploadAttachment:', error);
      throw new Error(`Error al subir archivo: ${error.message}`);
    }
  }

  /**
   * Eliminar archivo adjunto
   */
  async deleteAttachment(
    minuteId: string,
    attachmentIndex: number,
    userId: string
  ): Promise<any> {
    try {
      const minute = await this.minuteRepository.findOne({ where: { id: minuteId } });
      
      if (!minute) {
        throw new Error('Minuta no encontrada');
      }

      // Verificar permisos
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const isOwner = minute.reportedBy === userId;
      const canManage = ['admin', 'supervisor'].includes(user?.role || '');
      
      if (!isOwner && !canManage) {
        throw new Error('No tienes permisos para eliminar archivos de esta minuta');
      }

      const attachments = minute.attachments || [];
      
      if (attachmentIndex < 0 || attachmentIndex >= attachments.length) {
        throw new Error('Archivo no encontrado');
      }

      // Eliminar archivo físico
      const attachmentData = JSON.parse(attachments[attachmentIndex]);
      const fs = require('fs');
      
      if (fs.existsSync(attachmentData.path)) {
        fs.unlinkSync(attachmentData.path);
      }

      // Eliminar de la lista
      attachments.splice(attachmentIndex, 1);
      minute.attachments = attachments;
      
      await this.minuteRepository.save(minute);
      
      return { success: true, message: 'Archivo eliminado exitosamente' };
      
    } catch (error: any) {
      console.error('Error en deleteAttachment:', error);
      throw error;
    }
  }

  // Helper para mapear entidad a response
  private mapToResponse(minute: VirtualMinute): any {
    // Parsear attachments de string JSON a objetos
    const parsedAttachments = (minute.attachments || []).map((att: string) => {
      try {
        return JSON.parse(att);
      } catch {
        return { filename: att, originalName: 'Archivo adjunto' };
      }
    });

    return {
      id: minute.id,
      title: minute.title,
      description: minute.description,
      type: minute.type,
      status: minute.status,
      priority: minute.priority,
      reportedBy: minute.reportedBy,
      reportedByName: minute.reportedByName,
      location: minute.location,
      assignedTo: minute.assignedTo,
      assignedToName: minute.assignedToName,
      attachments: parsedAttachments, // ← CAMBIADO: ahora es array de objetos
      resolvedAt: minute.resolvedAt,
      resolvedBy: minute.resolvedBy,
      resolvedByName: minute.resolvedByName,
      closedAt: minute.closedAt,
      closedBy: minute.closedBy,
      closedByName: minute.closedByName,
      createdAt: minute.createdAt,
      updatedAt: minute.updatedAt,
      reportedByUser: minute.reportedByUser ? {
        id: minute.reportedByUser.id,
        name: minute.reportedByUser.name,
        email: minute.reportedByUser.email
      } : null,
      assignedToUser: minute.assignedToUser ? {
        id: minute.assignedToUser.id,
        name: minute.assignedToUser.name,
        email: minute.assignedToUser.email
      } : null
    };
  }

  // Helper para obtener conteos
  private getCount(counts: any[], key: string): number {
    const item = counts.find(c => 
      c.minute_status === key || 
      c.minute_type === key || 
      c.minute_priority === key ||
      c.status === key || 
      c.type === key || 
      c.priority === key
    );
    return item ? parseInt(item.count) : 0;
  }
  
  private getRoleLabel(role: string): string {
    const roleLabels: Record<string, string> = {
      'admin': 'Administrador',
      'coordinator': 'Coordinador',
      'supervisor': 'Supervisor',
      'operator': 'Operador',
      'guard': 'Guarda',
    };
    
    return roleLabels[role] || role;
  }

  // Helper para emitir eventos WebSocket (temporalmente comentado)
  // private emitWebSocketEvent(event: string, data: any): void {
  //   if (global.io) {
  //     global.io.emit(event, data);
  //   } else {
  //     console.log(`[WebSocket] Evento ${event}:`, data);
  //   }
  // }
}