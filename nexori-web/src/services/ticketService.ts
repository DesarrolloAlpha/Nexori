// services/ticketService.ts

import axios from 'axios';
import type { TicketStats } from '@/types/ticket';
import type { ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface TicketFilters {
  search?: string;
  type?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

class TicketService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Interceptor para agregar token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Obtener todos los tickets
   */
  async getAll(filters: TicketFilters = {}) {
    try {
      const params: any = {};
      
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      const { data } = await this.api.get<ApiResponse>('/tickets', { params });
      
      if (!data.success || !data.data) {
        throw new Error('No se pudieron obtener los tickets');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  /**
   * Obtener ticket por ID
   */
  async getById(id: string) {
    try {
      const { data } = await this.api.get<ApiResponse>(`/tickets/${id}`);
      
      if (!data.success || !data.data) {
        throw new Error('No se pudo obtener el ticket');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStatistics(): Promise<TicketStats> {
    try {
      const { data } = await this.api.get<ApiResponse<TicketStats>>('/tickets/statistics');
      
      if (!data.success || !data.data) {
        throw new Error('No se pudieron obtener las estadísticas');
      }
      
      return data.data;
    } catch (error: any) {
      console.error('Error fetching ticket statistics:', error);
      // Retornar stats vacías en caso de error
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
      };
    }
  }

  /**
   * Actualizar estado del ticket
   */
  async updateStatus(id: string, status: string) {
    try {
      const { data } = await this.api.put<ApiResponse>(`/tickets/${id}`, { status });
      
      if (!data.success || !data.data) {
        throw new Error('No se pudo actualizar el estado');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Asignar ticket
   */
  async assign(id: string, assignedToId: string, assignedToName: string) {
    try {
      const { data } = await this.api.put<ApiResponse>(`/tickets/${id}`, {
        assignedToId,
        assignedToName,
      });
      
      if (!data.success || !data.data) {
        throw new Error('No se pudo asignar el ticket');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  }

  /**
   * Agregar comentario
   */
  async addComment(ticketId: string, message: string) {
    try {
      const { data } = await this.api.post<ApiResponse>(`/tickets/${ticketId}/comments`, {
        message,
      });
      
      if (!data.success || !data.data) {
        throw new Error('No se pudo agregar el comentario');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Eliminar ticket
   */
  async delete(id: string) {
    try {
      const { data } = await this.api.delete<ApiResponse>(`/tickets/${id}`);
      
      if (!data.success) {
        throw new Error('No se pudo eliminar el ticket');
      }
      
      return data;
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  }
}

export const ticketService = new TicketService();