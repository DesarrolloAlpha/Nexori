import api from './api';
import { Minute, Category, Status, Priority } from '../types/minutes';

export interface MinuteFilters {
  search?: string;
  category?: Category | 'all';
  status?: Status | 'all';
  priority?: Priority | 'all';
  page?: number;
  limit?: number;
}

export interface MinuteStats {
  pending: number;
  reviewed: number;
  closed: number;
  total: number;
}

export interface CreateMinuteData {
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  location?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class MinuteService {
  async getAll(filters: MinuteFilters = {}): Promise<ApiResponse<{ minutes: Minute[]; total: number; page: number; totalPages: number }>> {
    try {
      const params: Record<string, any> = {};
      
      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'all') params.type = filters.category;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.priority && filters.priority !== 'all') params.priority = filters.priority;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      const response = await api.get('/minutes', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener minutas');
      }
      
      const backendData = response.data.data;
      
      const minutes: Minute[] = backendData.minutes.map((backendMinute: any) => ({
        id: backendMinute.id,
        title: backendMinute.title,
        description: backendMinute.description,
        date: backendMinute.createdAt,
        createdBy: backendMinute.reportedByName || 'Usuario',
        status: backendMinute.status as Status,
        priority: backendMinute.priority as Priority,
        category: backendMinute.type as Category,
        location: backendMinute.location,
        assignedTo: backendMinute.assignedToName,
        attachments: backendMinute.attachments || [],
      }));

      return {
        success: true,
        data: {
          minutes,
          total: backendData.total,
          page: backendData.page,
          totalPages: backendData.totalPages,
        }
      };
    } catch (error: any) {
      console.error('Error fetching minutes:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al obtener minutas',
      };
    }
  }

  async getStatistics(): Promise<ApiResponse<MinuteStats>> {
    try {
      const response = await api.get('/minutes/statistics');
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener estadísticas');
      }
      
      const backendStats = response.data.data;
      
      return {
        success: true,
        data: {
          pending: backendStats.pending || 0,
          reviewed: backendStats.reviewed || 0,
          closed: backendStats.closed || 0,
          total: backendStats.total || 0,
        }
      };
    } catch (error: any) {
      console.error('Error fetching statistics:', error.response?.data || error.message);
      return {
        success: false,
        data: { pending: 0, reviewed: 0, closed: 0, total: 0 },
        error: error.response?.data?.error || error.message || 'Error al obtener estadísticas',
      };
    }
  }

  async create(minuteData: CreateMinuteData): Promise<ApiResponse<Minute>> {
    try {
      const response = await api.post('/minutes', {
        title: minuteData.title,
        description: minuteData.description,
        type: minuteData.category,
        priority: minuteData.priority,
        location: minuteData.location,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al crear minuta');
      }

      const backendMinute = response.data.data;
      const minute: Minute = {
        id: backendMinute.id,
        title: backendMinute.title,
        description: backendMinute.description,
        date: backendMinute.createdAt,
        createdBy: backendMinute.reportedByName || 'Usuario Actual',
        status: backendMinute.status as Status,
        priority: backendMinute.priority as Priority,
        category: backendMinute.type as Category,
        location: backendMinute.location,
        assignedTo: backendMinute.assignedToName,
        attachments: backendMinute.attachments || [],
      };

      return {
        success: true,
        data: minute,
        message: response.data.message || 'Minuta creada exitosamente',
      };
    } catch (error: any) {
      console.error('Error creating minute:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al crear minuta',
      };
    }
  }

  /**
   * 🆕 NUEVO: Subir imagen a una minuta existente
   */
  async uploadImage(minuteId: string, imageUri: string): Promise<ApiResponse<{ url: string; minute: Minute }>> {
    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      
      // Extraer nombre del archivo de la URI
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // Agregar imagen al FormData
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      console.log(`📤 Subiendo imagen para minuta ${minuteId}...`);

      const response = await api.post(`/minutes/${minuteId}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al subir imagen');
      }

      const backendMinute = response.data.data.minute;
      const minute: Minute = {
        id: backendMinute.id,
        title: backendMinute.title,
        description: backendMinute.description,
        date: backendMinute.createdAt,
        createdBy: backendMinute.reportedByName || 'Usuario',
        status: backendMinute.status as Status,
        priority: backendMinute.priority as Priority,
        category: backendMinute.type as Category,
        location: backendMinute.location,
        assignedTo: backendMinute.assignedToName,
        attachments: backendMinute.attachments || [],
      };

      console.log('✅ Imagen subida exitosamente');

      return {
        success: true,
        data: {
          url: response.data.data.url,
          minute,
        },
        message: response.data.message || 'Imagen subida exitosamente',
      };
    } catch (error: any) {
      console.error('Error uploading image:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al subir imagen',
      };
    }
  }

  /**
   * 🆕 NUEVO: Eliminar imagen de una minuta
   */
  async deleteImage(minuteId: string, imageIndex: number): Promise<ApiResponse<Minute>> {
    try {
      console.log(`🗑️ Eliminando imagen ${imageIndex} de minuta ${minuteId}...`);

      const response = await api.delete(`/minutes/${minuteId}/attachments/${imageIndex}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al eliminar imagen');
      }

      const backendMinute = response.data.data;
      const minute: Minute = {
        id: backendMinute.id,
        title: backendMinute.title,
        description: backendMinute.description,
        date: backendMinute.createdAt,
        createdBy: backendMinute.reportedByName || 'Usuario',
        status: backendMinute.status as Status,
        priority: backendMinute.priority as Priority,
        category: backendMinute.type as Category,
        location: backendMinute.location,
        assignedTo: backendMinute.assignedToName,
        attachments: backendMinute.attachments || [],
      };

      console.log('✅ Imagen eliminada exitosamente');

      return {
        success: true,
        data: minute,
        message: response.data.message || 'Imagen eliminada exitosamente',
      };
    } catch (error: any) {
      console.error('Error deleting image:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al eliminar imagen',
      };
    }
  }

  async update(id: string, updates: Partial<Minute>): Promise<ApiResponse<Minute>> {
    try {
      const response = await api.put(`/minutes/${id}`, {
        ...updates,
        type: updates.category,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al actualizar minuta');
      }

      const backendMinute = response.data.data;
      const minute: Minute = {
        id: backendMinute.id,
        title: backendMinute.title,
        description: backendMinute.description,
        date: backendMinute.createdAt,
        createdBy: backendMinute.reportedByName || 'Usuario',
        status: backendMinute.status as Status,
        priority: backendMinute.priority as Priority,
        category: backendMinute.type as Category,
        location: backendMinute.location,
        assignedTo: backendMinute.assignedToName,
        attachments: backendMinute.attachments || [],
      };

      return {
        success: true,
        data: minute,
        message: response.data.message || 'Minuta actualizada exitosamente',
      };
    } catch (error: any) {
      console.error('Error updating minute:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al actualizar minuta',
      };
    }
  }

  async markAsReviewed(id: string): Promise<ApiResponse<Minute>> {
    return this.update(id, { status: 'reviewed' });
  }

  async closeMinute(id: string): Promise<ApiResponse<Minute>> {
    return this.update(id, { status: 'closed' });
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/minutes/${id}`);
      return {
        success: true,
        message: 'Minuta eliminada exitosamente',
      };
    } catch (error: any) {
      console.error('Error deleting minute:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar minuta',
      };
    }
  }

  async getById(id: string): Promise<ApiResponse<Minute>> {
    try {
      const response = await api.get(`/minutes/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener minuta');
      }
      
      const backendMinute = response.data.data;
      
      const minute: Minute = {
        id: backendMinute.id,
        title: backendMinute.title,
        description: backendMinute.description,
        date: backendMinute.createdAt,
        createdBy: backendMinute.reportedByName || 'Usuario',
        status: backendMinute.status as Status,
        priority: backendMinute.priority as Priority,
        category: backendMinute.type as Category,
        location: backendMinute.location,
        assignedTo: backendMinute.assignedToName,
        attachments: backendMinute.attachments || [],
      };

      return {
        success: true,
        data: minute,
      };
    } catch (error: any) {
      console.error('Error fetching minute:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al obtener minuta',
      };
    }
  }
}

export default new MinuteService();