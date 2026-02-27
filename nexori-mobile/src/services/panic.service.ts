import api from './api';
import { CreatePanicData, UpdatePanicStatusData, PanicEvent } from '../types/panic';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class PanicService {
  /**
   * Crear nueva alerta de pánico
   */
  async createPanic(data: CreatePanicData): Promise<ApiResponse<PanicEvent>> {
    try {
      console.log('📤 [PanicService] Creando alerta de pánico:', data);
      const response = await api.post('/panic', data);
      
      console.log('📥 [PanicService] Respuesta recibida:', response.data);
      
      return {
        success: true,
        data: response.data.data.panicEvent,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('❌ [PanicService] Error creating panic event:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al enviar alerta de pánico',
      };
    }
  }

  /**
   * Obtener todos los eventos de pánico
   */
  async getAllEvents(): Promise<ApiResponse<PanicEvent[]>> {
    try {
      console.log('📤 [PanicService] Obteniendo todos los eventos...');
      const response = await api.get('/panic');
      
      console.log('📥 [PanicService] Eventos recibidos:', response.data.data.events.length);
      
      return {
        success: true,
        data: response.data.data.events,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('❌ [PanicService] Error fetching panic events:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al obtener eventos',
      };
    }
  }

  /**
   * Actualizar estado de evento de pánico
   */
  async updateStatus(id: string, data: UpdatePanicStatusData): Promise<ApiResponse<PanicEvent>> {
    try {
      console.log('📤 [PanicService] Actualizando estado:', id, data);
      const response = await api.put(`/panic/${id}/status`, data);
      
      console.log('📥 [PanicService] Estado actualizado:', response.data);
      
      return {
        success: true,
        data: response.data.data.panicEvent,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('❌ [PanicService] Error updating panic status:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al actualizar estado',
      };
    }
  }

  /**
   * Subir imagen adjunta a un evento de pánico
   */
  async uploadImage(panicId: string, imageUri: string): Promise<ApiResponse<{ url: string; panicEvent: PanicEvent }>> {
    try {
      const formData = new FormData();

      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await api.post(`/panic/${panicId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('❌ [PanicService] Error uploading image:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al subir imagen',
      };
    }
  }

  /**
   * Obtener evento por ID
   */
  async getEventById(id: string): Promise<ApiResponse<PanicEvent>> {
    try {
      console.log('📤 [PanicService] Obteniendo evento:', id);
      const response = await api.get(`/panic/${id}`);
      
      console.log('📥 [PanicService] Evento recibido:', response.data);
      
      return {
        success: true,
        data: response.data.data.panicEvent,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('❌ [PanicService] Error fetching panic event:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al obtener evento',
      };
    }
  }
}

export default new PanicService();