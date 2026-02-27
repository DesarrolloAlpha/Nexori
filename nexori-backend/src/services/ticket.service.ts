// services/ticket.service.ts - VERSIÓN TYPEORM

import { AppDataSource } from '../config/database';
import { Ticket, TicketComment } from '../models/Ticket.entity';
import { 
  CreateTicketInput, 
  UpdateTicketInput,
  CreateCommentInput,
  TicketFilter,
  TicketStats
} from '../types/ticket.types';
import { Like, ILike } from 'typeorm';

export class TicketService {
  private ticketRepository = AppDataSource.getRepository(Ticket);
  private commentRepository = AppDataSource.getRepository(TicketComment);

  /**
   * Obtener todos los tickets con filtros
   */
  async getAllTickets(filters: TicketFilter, userId: string, isStaff = false) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;
      const orderBy = filters.orderBy || 'createdAt';
      const order = filters.order || 'DESC';

      let query = this.ticketRepository
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.comments', 'comment');

      // El staff (admin/coordinator/supervisor) ve todos los tickets;
      // los usuarios normales solo ven los suyos propios.
      if (!isStaff) {
        query = query.andWhere('ticket.userId = :userId', { userId });
      }

      if (filters.type) {
        query = query.andWhere('ticket.type = :type', { type: filters.type });
      }

      if (filters.status) {
        query = query.andWhere('ticket.status = :status', { status: filters.status });
      }

      if (filters.priority) {
        query = query.andWhere('ticket.priority = :priority', { priority: filters.priority });
      }

      if (filters.search) {
        query = query.andWhere(
          '(ticket.subject ILIKE :search OR ticket.description ILIKE :search OR CAST(ticket.id AS TEXT) ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      // Ordenamiento
      query = query.orderBy(`ticket.${orderBy}`, order as 'ASC' | 'DESC');

      // Paginación
      query = query.skip(skip).take(limit);

      const [tickets, total] = await query.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        tickets,
        total,
        page,
        totalPages,
        hasMore: page < totalPages
      };
    } catch (error: any) {
      console.error('❌ Error en TicketService.getAllTickets:', error);
      throw new Error('Error al obtener tickets');
    }
  }

  /**
   * Obtener un ticket por ID
   */
  async getTicketById(id: string, userId: string, isStaff = false): Promise<Ticket> {
    try {
      const ticket = await this.ticketRepository.findOne({
        where: isStaff ? { id } : { id, userId },
        relations: ['comments'],
        order: {
          comments: {
            createdAt: 'ASC'
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado o no tienes permisos para verlo');
      }

      return ticket;
    } catch (error: any) {
      console.error('❌ Error en TicketService.getTicketById:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo ticket
   */
  async createTicket(data: CreateTicketInput, userId: string, userName: string): Promise<Ticket> {
    try {
      const ticket = this.ticketRepository.create({
        type: data.type,
        priority: data.priority,
        subject: data.subject,
        description: data.description,
        userId,
        createdByName: userName,
        status: 'open',
      });

      return await this.ticketRepository.save(ticket);
    } catch (error: any) {
      console.error('❌ Error en TicketService.createTicket:', error);
      throw new Error('Error al crear ticket');
    }
  }

  /**
   * Actualizar ticket
   */
  async updateTicket(id: string, data: UpdateTicketInput, userId: string, isStaff = false): Promise<Ticket> {
    try {
      const ticket = await this.ticketRepository.findOne({
        where: isStaff ? { id } : { id, userId }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado o no tienes permisos para modificarlo');
      }

      // Actualizar campos
      if (data.type) ticket.type = data.type;
      if (data.priority) ticket.priority = data.priority;
      if (data.subject) ticket.subject = data.subject;
      if (data.description) ticket.description = data.description;
      if (data.assignedToId !== undefined) ticket.assignedToId = data.assignedToId;
      if (data.assignedToName !== undefined) ticket.assignedToName = data.assignedToName;

      if (data.status) {
        ticket.status = data.status;
        
        // Si se marca como resuelto, guardar la fecha
        if (data.status === 'resolved' && !ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }
        
        // Si se marca como cerrado, guardar la fecha
        if (data.status === 'closed' && !ticket.closedAt) {
          ticket.closedAt = new Date();
        }
      }

      return await this.ticketRepository.save(ticket);
    } catch (error: any) {
      console.error('❌ Error en TicketService.updateTicket:', error);
      throw error;
    }
  }

  /**
   * Eliminar ticket
   */
  async deleteTicket(id: string, userId: string, isStaff = false): Promise<void> {
    try {
      const result = await this.ticketRepository.delete(
        isStaff ? { id } : { id, userId }
      );

      if (result.affected === 0) {
        throw new Error('Ticket no encontrado o no tienes permisos para eliminarlo');
      }
    } catch (error: any) {
      console.error('❌ Error en TicketService.deleteTicket:', error);
      throw error;
    }
  }

  /**
   * Agregar comentario a ticket
   */
  async addComment(
    ticketId: string, 
    data: CreateCommentInput, 
    userId: string, 
    userName: string,
    isStaff: boolean = false
  ): Promise<TicketComment> {
    try {
      // Verificar que el ticket existe y el usuario tiene acceso
      const ticket = await this.ticketRepository.findOne({
        where: isStaff ? { id: ticketId } : { id: ticketId, userId }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado o no tienes permisos');
      }

      const comment = this.commentRepository.create({
        ticketId,
        userId,
        authorName: userName,
        message: data.message,
        isStaff,
      });

      return await this.commentRepository.save(comment);
    } catch (error: any) {
      console.error('❌ Error en TicketService.addComment:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de tickets
   */
  async getStatistics(userId: string): Promise<TicketStats> {
    try {
      const [total, open, inProgress, resolved, closed, urgent] = await Promise.all([
        this.ticketRepository.count({ where: { userId } }),
        this.ticketRepository.count({ where: { userId, status: 'open' } }),
        this.ticketRepository.count({ where: { userId, status: 'in_progress' } }),
        this.ticketRepository.count({ where: { userId, status: 'resolved' } }),
        this.ticketRepository.count({ where: { userId, status: 'closed' } }),
        this.ticketRepository
          .createQueryBuilder('ticket')
          .where('ticket.userId = :userId', { userId })
          .andWhere('ticket.priority = :priority', { priority: 'urgent' })
          .andWhere('ticket.status NOT IN (:...statuses)', { statuses: ['resolved', 'closed'] })
          .getCount(),
      ]);

      return {
        total,
        open,
        inProgress,
        resolved,
        closed,
        urgent,
      };
    } catch (error: any) {
      console.error('❌ Error en TicketService.getStatistics:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }
}