// controllers/ticket.controller.ts

import { Request, Response } from 'express';
import { TicketService } from '../services/ticket.service';
import { 
  CreateTicketInput, 
  UpdateTicketInput, 
  CreateCommentInput,
  TicketFilter 
} from '../types/ticket.types';

const ticketService = new TicketService();

export class TicketController {
  /**
   * Obtener todos los tickets del usuario
   */
  static async getAll(req: Request, res: Response) {
    try {
      const filters: TicketFilter = {
        type: req.query.type as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        orderBy: req.query.orderBy as any || 'createdAt',
        order: (req.query.order as any) || 'DESC'
      };

      const userId = (req as any).user?.userId;
      const role   = (req as any).user?.role || '';
      const isStaff = ['admin', 'coordinator', 'supervisor'].includes(role);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const result = await ticketService.getAllTickets(filters, userId, isStaff);
      
      res.json({
        success: true,
        data: {
          tickets: result.tickets,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          hasMore: result.hasMore
        },
        message: 'Tickets obtenidos exitosamente'
      });
      
    } catch (error: any) {
      console.error('❌ Error en TicketController.getAll:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener tickets'
      });
    }
  }

  /**
   * Obtener ticket por ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId  = (req as any).user?.userId;
      const role    = (req as any).user?.role || '';
      const isStaff = ['admin', 'coordinator', 'supervisor'].includes(role);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const ticket = await ticketService.getTicketById(id, userId, isStaff);
      
      res.json({
        success: true,
        data: ticket
      });
    } catch (error: any) {
      console.error('❌ Error en TicketController.getById:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Crear nuevo ticket
   */
  static async create(req: Request, res: Response) {
    try {
      const data: CreateTicketInput = req.body;
      const userId = (req as any).user?.userId;
      const userName = (req as any).user?.name || 'Usuario';
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }

      // Validaciones
      if (!data.type || !data.priority || !data.subject || !data.description) {
        return res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos'
        });
      }

      if (data.subject.length < 5 || data.subject.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'El asunto debe tener entre 5 y 200 caracteres'
        });
      }

      if (data.description.length < 10 || data.description.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'La descripción debe tener entre 10 y 2000 caracteres'
        });
      }

      const ticket = await ticketService.createTicket(data, userId, userName);
      
      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Ticket creado exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error en TicketController.create:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al crear ticket'
      });
    }
  }

  /**
   * Actualizar ticket
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateTicketInput = req.body;
      const userId  = (req as any).user?.userId;
      const role    = (req as any).user?.role || '';
      const isStaff = ['admin', 'coordinator', 'supervisor'].includes(role);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const ticket = await ticketService.updateTicket(id, data, userId, isStaff);
      
      res.json({
        success: true,
        data: ticket,
        message: 'Ticket actualizado exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error en TicketController.update:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Eliminar ticket
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId  = (req as any).user?.userId;
      const role    = (req as any).user?.role || '';
      const isStaff = ['admin', 'coordinator', 'supervisor'].includes(role);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      await ticketService.deleteTicket(id, userId, isStaff);
      
      res.json({
        success: true,
        message: 'Ticket eliminado exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error en TicketController.delete:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
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
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const stats = await ticketService.getStatistics(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('❌ Error en TicketController.getStatistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener estadísticas'
      });
    }
  }

  /**
   * Agregar comentario a ticket
   */
  static async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: CreateCommentInput = req.body;
      const userId = (req as any).user?.userId;
      const userName = (req as any).user?.name || 'Usuario';
      const role     = (req as any).user?.role || '';
      const isStaff  = ['admin', 'coordinator', 'supervisor'].includes(role);

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }

      if (!data.message || data.message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'El mensaje es requerido'
        });
      }

      if (data.message.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'El mensaje no puede exceder 1000 caracteres'
        });
      }

      const comment = await ticketService.addComment(id, data, userId, userName, isStaff);
      
      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comentario agregado exitosamente'
      });
    } catch (error: any) {
      console.error('❌ Error en TicketController.addComment:', error);
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }
}