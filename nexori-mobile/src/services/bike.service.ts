import api from './api';

export interface Bike {
  id: string;
  serialNumber: string; // Ahora lo genera el backend automáticamente (BIKE-001, BIKE-002...)
  brand: string;
  model: string;
  color: string;
  ownerName: string;
  ownerDocument: string;
  ownerPhone?: string; // 🆕 Campo nuevo (opcional)
  location?: string;
  status: 'inside' | 'outside';
  qrCode?: string;
  lastCheckIn?: string;
  lastCheckOut?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BikeFilters {
  search?: string;
  status?: 'inside' | 'outside' | 'all';
}

// 🆕 Tipo para crear bicicleta (sin serialNumber - se genera automáticamente)
export interface CreateBikeData {
  brand: string;
  model: string;
  color: string;
  ownerName: string;
  ownerDocument: string;
  ownerPhone?: string; // Opcional
  location?: string;
  notes?: string;
}

class BikeService {
  async getAll(filters: BikeFilters = {}) {
    try {
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;

      const response = await api.get('/bikes', { params });
      return response.data.data.bikes;
    } catch (error) {
      console.error('Error fetching bikes:', error);
      throw error;
    }
  }

  // 🔥 ACTUALIZADO: Ahora recibe CreateBikeData (sin serialNumber)
  async create(bikeData: CreateBikeData) {
    try {
      const response = await api.post('/bikes', bikeData);
      return response.data.data.bike;
    } catch (error) {
      console.error('Error creating bike:', error);
      throw error;
    }
  }

  async checkIn(id: string, notes?: string) {
    try {
      const response = await api.post(`/bikes/${id}/check-in`, { notes });
      return response.data.data.bike;
    } catch (error) {
      console.error('Error checking in bike:', error);
      throw error;
    }
  }

  async checkOut(id: string, notes?: string) {
    try {
      const response = await api.post(`/bikes/${id}/check-out`, { notes });
      return response.data.data.bike;
    } catch (error) {
      console.error('Error checking out bike:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<CreateBikeData>) {
    try {
      const response = await api.put(`/bikes/${id}`, data);
      return response.data.data.bike;
    } catch (error) {
      console.error('Error updating bike:', error);
      throw error;
    }
  }

  async resendWhatsApp(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/bikes/${id}/resend-whatsapp`);
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || 'No se pudo reenviar el QR';
      return { success: false, message };
    }
  }
}

export default new BikeService();