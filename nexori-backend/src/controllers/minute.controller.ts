import { Request, Response } from 'express';
// 🔥 CORRECCIÓN: Importar desde el archivo del servicio, no desde server
import { minuteService } from '../services/minute.service';
import { 
  CreateMinuteInput, 
  UpdateMinuteInput, 
  MinuteFilter 
} from '../types/minute.types';

export class MinuteController {
  /**
   * Obtener todas las minutas
   */
  static async getAll(req: Request, res: Response) {
    try {
      const filters: MinuteFilter = {
        status: req.query.status as string,
        search: req.query.search as string,
        type: req.query.type as string,
        priority: req.query.priority as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        orderBy: req.query.orderBy as any || 'createdAt',
        order: (req.query.order as any) || 'DESC'
      };

      // Obtener userId del token JWT
      const userId = (req as any).user?.userId;
      
      const result = await minuteService.getAllMinutes(filters, userId);
      
      res.json({
        success: true,
        data: {
          minutes: result.minutes,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasMore: result.hasMore
        },
        message: 'Minutas obtenidas exitosamente'
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener minutas'
      });
    }
  }

  /**
   * Obtener minuta por ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;
      
      const minute = await minuteService.getMinuteById(id, userId);
      res.json({
        success: true,
        data: minute
      });
    } catch (error: any) {
      res.status(error.message.includes('no encontrada') ? 404 : 403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Crear nueva minuta
   */
  static async create(req: Request, res: Response) {
    try {
      const data: CreateMinuteInput = req.body;
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado. No se pudo obtener el ID del usuario.' 
        });
      }

      // Validaciones básicas
      if (!data.title || !data.description) {
        return res.status(400).json({
          success: false,
          error: 'Título y descripción son requeridos'
        });
      }

      const minute = await minuteService.createMinute(data, userId);
      
      res.status(201).json({
        success: true,
        data: minute,
        message: 'Minuta creada exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error en MinuteController.create:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al crear minuta'
      });
    }
  }

  /**
   * Actualizar minuta
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateMinuteInput = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }

      const minute = await minuteService.updateMinute(id, data, userId);
      
      res.json({
        success: true,
        data: minute,
        message: 'Minuta actualizada exitosamente'
      });
    } catch (error: any) {
      res.status(error.message.includes('no encontrada') ? 404 : 403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Eliminar minuta
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }

      await minuteService.deleteMinute(id, userId);
      
      res.json({
        success: true,
        message: 'Minuta eliminada exitosamente'
      });
    } catch (error: any) {
      res.status(error.message.includes('no encontrada') ? 404 : 403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas
   */
  static async getStatistics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const stats = await minuteService.getStatistics(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener estadísticas'
      });
    }
  }

  /**
   * Asignar minuta a usuario
   */
  static async assign(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assignToId } = req.body;
      const userId = (req as any).user?.userId;

      if (!assignToId) {
        return res.status(400).json({
          success: false,
          error: 'ID del usuario a asignar es requerido'
        });
      }

      const minute = await minuteService.assignMinute(id, assignToId, userId);
      
      res.json({
        success: true,
        data: minute,
        message: 'Minuta asignada exitosamente'
      });
    } catch (error: any) {
      res.status(error.message.includes('no encontrada') ? 404 : 403).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Subir archivo adjunto
   */
  static async uploadAttachment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = (req as any).file;
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Archivo es requerido'
        });
      }

      // Validar tipo de archivo
      const allowedMimeTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de archivo no permitido. Use imágenes (JPEG, PNG, GIF) o PDF/DOC'
        });
      }

      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: 'Archivo demasiado grande. Máximo 10MB'
        });
      }

      // Usar el servicio para subir el archivo
      const result = await minuteService.uploadAttachment(id, file, userId);
      
      res.json(result);
      
    } catch (error: any) {
      console.error('❌ Error en MinuteController.uploadAttachment:', error);
      
      const statusCode = error.message.includes('no encontrada') ? 404 : 
                        error.message.includes('permisos') ? 403 : 
                        error.message.includes('Tipo de archivo') ? 400 : 
                        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Error al subir archivo'
      });
    }
  }

  /**
   * Eliminar archivo adjunto
   */
  static async deleteAttachment(req: Request, res: Response) {
    try {
      const { id, attachmentIndex } = req.params;
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }

      const index = parseInt(attachmentIndex);
      if (isNaN(index) || index < 0) {
        return res.status(400).json({
          success: false,
          error: 'Índice de archivo inválido'
        });
      }

      const result = await minuteService.deleteAttachment(id, index, userId);
      
      res.json(result);
      
    } catch (error: any) {
      console.error('❌ Error en MinuteController.deleteAttachment:', error);
      
      const statusCode = error.message.includes('no encontrada') ? 404 : 
                        error.message.includes('permisos') ? 403 : 
                        error.message.includes('no encontrado') ? 404 : 
                        500;
      
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Error al eliminar archivo'
      });
    }
  }
}