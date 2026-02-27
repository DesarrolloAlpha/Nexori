// services/ticket.service.ts (FRONTEND - React Native)

import api from './api';
import type {
  Ticket,
  TicketComment,
  TicketType,
  TicketStatus,
  TicketPriority,
  CreateTicketData,
  TicketStats,
} from '../types/tickets';

export interface TicketFilters {
  search?: string;
  type?: TicketType | 'all';
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ── Helpers de mapeo ───────────────────────────────────────────────────────

/** Convierte el objeto TicketComment del backend al tipo frontend. */
function mapComment(c: any): TicketComment {
  return {
    id: c.id,
    ticketId: c.ticketId,
    author: c.authorName,        // backend usa authorName, frontend usa author
    message: c.message,
    isStaff: c.isStaff ?? false,
    createdAt: c.createdAt,
  };
}

/** Convierte un ticket del backend al tipo frontend. */
function mapTicket(bt: any): Ticket {
  return {
    id: bt.id,
    type: bt.type,
    priority: bt.priority,
    status: bt.status,
    subject: bt.subject,
    description: bt.description,
    createdBy: bt.createdByName,  // backend usa createdByName, frontend usa createdBy
    createdAt: bt.createdAt,
    updatedAt: bt.updatedAt,
    resolvedAt: bt.resolvedAt,
    closedAt: bt.closedAt,
    comments: (bt.comments || []).map(mapComment),
  };
}

// ── Servicio ───────────────────────────────────────────────────────────────

class TicketService {
  /**
   * Obtener todos los tickets
   */
  async getAll(
    filters: TicketFilters = {}
  ): Promise<ApiResponse<{ tickets: Ticket[]; total: number; page: number; totalPages: number }>> {
    try {
      const params: Record<string, any> = {};

      if (filters.search) params.search = filters.search;
      if (filters.type && filters.type !== 'all') params.type = filters.type;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      const response = await api.get('/tickets', { params });
      const backendData = response.data.data;

      return {
        success: true,
        data: {
          tickets: (backendData.tickets || []).map(mapTicket),
          total: backendData.total,
          page: backendData.page,
          totalPages: backendData.totalPages,
        },
      };
    } catch (error: any) {
      console.error('Error fetching tickets:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener tickets',
      };
    }
  }

  /**
   * Obtener ticket por ID
   */
  async getById(id: string): Promise<ApiResponse<Ticket>> {
    try {
      const response = await api.get(`/tickets/${id}`);
      return {
        success: true,
        data: mapTicket(response.data.data),
      };
    } catch (error: any) {
      console.error('Error fetching ticket:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener ticket',
      };
    }
  }

  /**
   * Crear nuevo ticket
   */
  async create(ticketData: CreateTicketData): Promise<ApiResponse<Ticket>> {
    try {
      const response = await api.post('/tickets', {
        type: ticketData.type,
        priority: ticketData.priority,
        subject: ticketData.subject,
        description: ticketData.description,
      });

      return {
        success: true,
        data: mapTicket(response.data.data),
        message: response.data.message || 'Ticket creado exitosamente',
      };
    } catch (error: any) {
      console.error('Error creating ticket:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear ticket',
      };
    }
  }

  /**
   * Actualizar ticket
   */
  async update(id: string, updates: Partial<Ticket>): Promise<ApiResponse<Ticket>> {
    try {
      const response = await api.put(`/tickets/${id}`, updates);
      return {
        success: true,
        data: mapTicket(response.data.data),
        message: response.data.message || 'Ticket actualizado exitosamente',
      };
    } catch (error: any) {
      console.error('Error updating ticket:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar ticket',
      };
    }
  }

  /**
   * Eliminar ticket
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/tickets/${id}`);
      return {
        success: true,
        message: 'Ticket eliminado exitosamente',
      };
    } catch (error: any) {
      console.error('Error deleting ticket:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar ticket',
      };
    }
  }

  /**
   * Agregar comentario
   */
  async addComment(ticketId: string, message: string): Promise<ApiResponse<TicketComment>> {
    try {
      const response = await api.post(`/tickets/${ticketId}/comments`, { message });
      return {
        success: true,
        data: mapComment(response.data.data),
        message: response.data.message || 'Comentario agregado exitosamente',
      };
    } catch (error: any) {
      console.error('Error adding comment:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al agregar comentario',
      };
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStatistics(): Promise<ApiResponse<TicketStats>> {
    try {
      const response = await api.get('/tickets/statistics');
      const stats = response.data.data;

      return {
        success: true,
        data: {
          total: stats.total || 0,
          open: stats.open || 0,
          inProgress: stats.inProgress || 0,
          resolved: stats.resolved || 0,
          closed: stats.closed || 0,
          urgent: stats.urgent || 0,
        },
      };
    } catch (error: any) {
      console.error('Error fetching statistics:', error.response?.data || error.message);
      return {
        success: false,
        data: { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, urgent: 0 },
        error: error.response?.data?.error || 'Error al obtener estadísticas',
      };
    }
  }
}

export default new TicketService();
