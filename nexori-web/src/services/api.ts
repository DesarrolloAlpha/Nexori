import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  UserRole,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  Bike,
  BikeFormData,
  PanicEvent,
  DashboardStats,
  ApiResponse,
} from '@/types';
import type {
  Minute,
  MinuteFormData,
  MinuteStatus
} from '@/types/minute';

// ================================================
// Configuración de Axios
// ================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log('📥 API Response:', response.config.url, response.status);
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        console.error('❌ Response Error:', error.response?.status, error.message);
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ================================================
  // Autenticación
  // ================================================

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data } = await this.api.post<AuthResponse>('/auth/login', credentials);
      if (!data.success || !data.data?.token) {
        throw new Error('Respuesta inválida del servidor');
      }
      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const { data } = await this.api.post<AuthResponse>('/auth/register', userData);
      if (!data.success || !data.data?.token) {
        throw new Error('Respuesta inválida del servidor');
      }
      return data;
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async getProfile(): Promise<User> {
    try {
      const { data } = await this.api.get<ApiResponse<{ user: User }>>('/auth/profile');
      if (!data.success || !data.data?.user) {
        throw new Error('No se pudo obtener el perfil');
      }
      return data.data.user;
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const { data } = await this.api.post<ApiResponse>('/auth/refresh-token', { refreshToken });
      if (!data.success || !data.data) {
        throw new Error('No se pudo refrescar el token');
      }
      return data.data;
    } catch (error: any) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // ================================================
  // Usuarios
  // ================================================

  async getUsers(): Promise<User[]> {
    try {
      const { data } = await this.api.get('/users');
      if (Array.isArray(data)) return data;
      if (data.success && data.data?.users && Array.isArray(data.data.users)) return data.data.users;
      if (data.data && Array.isArray(data.data)) return data.data;
      console.error('Formato de respuesta inesperado:', data);
      return [];
    } catch (error: any) {
      console.error('Get users error:', error);
      return [];
    }
  }

  async getUserById(id: string): Promise<User> {
    const { data } = await this.api.get<User>(`/users/${id}`);
    return data;
  }

  async createUser(userData: { name: string; email: string; password: string; role: UserRole; localName?: string; adminName?: string }): Promise<User> {
    try {
      const { data } = await this.api.post<ApiResponse<{ user: User }>>('/users', userData);
      if (!data.success || !data.data?.user) throw new Error('No se pudo crear el usuario');
      return data.data.user;
    } catch (error: any) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const { data } = await this.api.put<ApiResponse<{ user: User }>>(`/users/${id}`, updates);
      if (!data.success || !data.data?.user) throw new Error('No se pudo actualizar el usuario');
      return data.data.user;
    } catch (error: any) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const { data } = await this.api.delete<ApiResponse>(`/users/${id}`);
      if (!data.success) throw new Error('No se pudo eliminar el usuario');
    } catch (error: any) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  async toggleUserStatus(id: string): Promise<User> {
    try {
      const { data } = await this.api.patch<ApiResponse<{ user: User }>>(`/users/${id}/toggle-status`);
      if (!data.success || !data.data?.user) throw new Error('No se pudo cambiar el estado');
      return data.data.user;
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  }

  // ================================================
  // Bicicletas
  // ================================================

  async getBikes(status?: string, search?: string): Promise<Bike[]> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (search) params.search = search;
      const { data } = await this.api.get<ApiResponse<{ bikes: Bike[] }>>('/bikes', { params });
      if (!data.success || !data.data?.bikes) throw new Error('No se pudieron obtener las bicicletas');
      return data.data.bikes;
    } catch (error: any) {
      console.error('Get bikes error:', error);
      throw error;
    }
  }

  async getBikeById(id: string): Promise<Bike> {
    try {
      const { data } = await this.api.get<ApiResponse<{ bike: Bike }>>(`/bikes/${id}`);
      if (!data.success || !data.data?.bike) throw new Error('No se pudo obtener la bicicleta');
      return data.data.bike;
    } catch (error: any) {
      console.error('Get bike error:', error);
      throw error;
    }
  }

  async createBike(bikeData: BikeFormData): Promise<Bike> {
    try {
      const { data } = await this.api.post<ApiResponse<{ bike: Bike }>>('/bikes', bikeData);
      if (!data.success || !data.data?.bike) throw new Error('No se pudo crear la bicicleta');
      return data.data.bike;
    } catch (error: any) {
      console.error('Create bike error:', error);
      throw error;
    }
  }

  async updateBike(id: string, updates: Partial<BikeFormData>): Promise<Bike> {
    try {
      const { data } = await this.api.put<ApiResponse<{ bike: Bike }>>(`/bikes/${id}`, updates);
      if (!data.success || !data.data?.bike) throw new Error('No se pudo actualizar la bicicleta');
      return data.data.bike;
    } catch (error: any) {
      console.error('Update bike error:', error);
      throw error;
    }
  }

  async deleteBike(id: string): Promise<void> {
    try {
      const { data } = await this.api.delete<ApiResponse>(`/bikes/${id}`);
      if (!data.success) throw new Error('No se pudo eliminar la bicicleta');
    } catch (error: any) {
      console.error('Delete bike error:', error);
      throw error;
    }
  }

  async checkInBike(id: string, notes?: string): Promise<Bike> {
    try {
      const { data } = await this.api.post<ApiResponse<{ bike: Bike }>>(`/bikes/${id}/check-in`, { notes });
      if (!data.success || !data.data?.bike) throw new Error('No se pudo ingresar la bicicleta');
      return data.data.bike;
    } catch (error: any) {
      console.error('Check-in bike error:', error);
      throw error;
    }
  }

  async checkOutBike(id: string, notes?: string): Promise<Bike> {
    try {
      const { data } = await this.api.post<ApiResponse<{ bike: Bike }>>(`/bikes/${id}/check-out`, { notes });
      if (!data.success || !data.data?.bike) throw new Error('No se pudo retirar la bicicleta');
      return data.data.bike;
    } catch (error: any) {
      console.error('Check-out bike error:', error);
      throw error;
    }
  }

  async getBikeHistory(id: string): Promise<any> {
    try {
      const { data } = await this.api.get<ApiResponse<{ history: any }>>(`/bikes/${id}/history`);
      if (!data.success || !data.data?.history) throw new Error('No se pudo obtener el historial');
      return data.data.history;
    } catch (error: any) {
      console.error('Get bike history error:', error);
      throw error;
    }
  }

  // ================================================
  // Minutas
  // ✅ CORREGIDO: el backend devuelve data directo (sin wrapper { minute })
  // en create, update, getById y assign
  // ================================================

  async getMinutes(params?: {
    status?: string;
    search?: string;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<Minute[]> {
    try {
      // ✅ getAll sí devuelve data: { minutes: [...] }
      const { data } = await this.api.get<ApiResponse<{ minutes: Minute[] }>>('/minutes', { params });
      if (!data.success || !data.data?.minutes) throw new Error('No se pudieron obtener las minutas');
      return data.data.minutes;
    } catch (error: any) {
      console.error('Get minutes error:', error);
      throw error;
    }
  }

  async getMinuteById(id: string): Promise<Minute> {
    try {
      // ✅ getById devuelve data: minute (directo)
      const { data } = await this.api.get<ApiResponse<Minute>>(`/minutes/${id}`);
      if (!data.success || !data.data) throw new Error('No se pudo obtener la minuta');
      return data.data;
    } catch (error: any) {
      console.error('Get minute error:', error);
      throw error;
    }
  }

  async createMinute(minuteData: MinuteFormData): Promise<Minute> {
    try {
      // ✅ create devuelve data: minute (directo, sin wrapper { minute })
      const { data } = await this.api.post<ApiResponse<Minute>>('/minutes', minuteData);
      if (!data.success || !data.data) throw new Error('No se pudo crear la minuta');
      return data.data;
    } catch (error: any) {
      console.error('Create minute error:', error);
      throw error;
    }
  }

  async updateMinute(id: string, updates: Partial<MinuteFormData>): Promise<Minute> {
    try {
      // ✅ update devuelve data: minute (directo)
      const { data } = await this.api.put<ApiResponse<Minute>>(`/minutes/${id}`, updates);
      if (!data.success || !data.data) throw new Error('No se pudo actualizar la minuta');
      return data.data;
    } catch (error: any) {
      console.error('Update minute error:', error);
      throw error;
    }
  }

  async deleteMinute(id: string): Promise<void> {
    try {
      const { data } = await this.api.delete<ApiResponse>(`/minutes/${id}`);
      if (!data.success) throw new Error('No se pudo eliminar la minuta');
    } catch (error: any) {
      console.error('Delete minute error:', error);
      throw error;
    }
  }

  async assignMinute(minuteId: string, assignToId: string): Promise<Minute> {
    try {
      // ✅ assign devuelve data: minute (directo)
      const { data } = await this.api.post<ApiResponse<Minute>>(
        `/minutes/${minuteId}/assign`,
        { assignToId }
      );
      if (!data.success || !data.data) throw new Error('No se pudo asignar la minuta');
      return data.data;
    } catch (error: any) {
      console.error('Assign minute error:', error);
      throw error;
    }
  }

  async uploadMinuteAttachment(minuteId: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await this.api.post<ApiResponse>(
        `/minutes/${minuteId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (!data.success) throw new Error('No se pudo subir el archivo adjunto');
      return data.data;
    } catch (error: any) {
      console.error('Upload attachment error:', error);
      throw error;
    }
  }

  async deleteMinuteAttachment(minuteId: string, attachmentIndex: number): Promise<void> {
    try {
      const { data } = await this.api.delete<ApiResponse>(
        `/minutes/${minuteId}/attachments/${attachmentIndex}`
      );
      if (!data.success) throw new Error('No se pudo eliminar el archivo adjunto');
    } catch (error: any) {
      console.error('Delete attachment error:', error);
      throw error;
    }
  }

  async getMinuteStatistics(): Promise<any> {
    try {
      const { data } = await this.api.get<ApiResponse>('/minutes/statistics');
      if (!data.success || !data.data) throw new Error('No se pudieron obtener las estadísticas');
      return data.data;
    } catch (error: any) {
      console.error('Get minute statistics error:', error);
      throw error;
    }
  }

  async updateMinuteStatus(id: string, status: MinuteStatus): Promise<Minute> {
    try {
      // ✅ No hay endpoint /status separado, usa el update normal
      const { data } = await this.api.put<ApiResponse<Minute>>(`/minutes/${id}`, { status });
      if (!data.success || !data.data) throw new Error('No se pudo actualizar el estado de la minuta');
      return data.data;
    } catch (error: any) {
      console.error('Update minute status error:', error);
      throw error;
    }
  }

  // ================================================
  // Eventos de Pánico
  // ================================================

  async getPanicEvents(status?: string, priority?: string): Promise<PanicEvent[]> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const { data } = await this.api.get<ApiResponse<{ events: PanicEvent[] }>>('/panic', { params });
      if (!data.success || !data.data?.events) throw new Error('No se pudieron obtener los eventos');
      return data.data.events;
    } catch (error: any) {
      console.error('Get panic events error:', error);
      throw error;
    }
  }

  async createPanicEvent(): Promise<PanicEvent> {
    try {
      const { data } = await this.api.post<ApiResponse<{ panicEvent: PanicEvent }>>('/panic', {});
      if (!data.success || !data.data?.panicEvent) throw new Error('No se pudo crear el evento de pánico');
      return data.data.panicEvent;
    } catch (error: any) {
      console.error('Create panic event error:', error);
      throw error;
    }
  }

  async updatePanicStatus(id: string, status: 'active' | 'attended' | 'resolved', notes?: string): Promise<PanicEvent> {
    try {
      const { data } = await this.api.put<ApiResponse<{ panicEvent: PanicEvent }>>(`/panic/${id}/status`, { status, notes });
      if (!data.success || !data.data?.panicEvent) throw new Error('No se pudo actualizar el estado');
      return data.data.panicEvent;
    } catch (error: any) {
      console.error('Update panic status error:', error);
      throw error;
    }
  }

  // ================================================
  // Dashboard y Estadísticas
  // ================================================

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [bikes, panicEvents] = await Promise.all([
        this.getBikes().catch(() => []),
        this.getPanicEvents().catch(() => []),
        this.getMinutes().catch(() => []),
      ]);

      let users: User[] = [];
      try {
        users = await this.getUsers();
      } catch (error) {
        console.warn('Usuarios endpoint no disponible, usando valores por defecto');
      }

      const stats: DashboardStats = {
        totalBikes: bikes.length,
        availableBikes: bikes.filter((b) => b.status === 'inside').length,
        bikesInUse: bikes.filter((b) => b.status === 'outside').length,
        bikesInMaintenance: bikes.filter((b) => b.status === 'maintenance').length,
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.isActive).length,
        activePanicEvents: panicEvents.filter((e) => e.status === 'active').length,
        resolvedPanicEvents: panicEvents.filter((e) => e.status === 'resolved').length,
      };

      return stats;
    } catch (error: any) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalBikes: 0,
        availableBikes: 0,
        bikesInUse: 0,
        bikesInMaintenance: 0,
        totalUsers: 0,
        activeUsers: 0,
        activePanicEvents: 0,
        resolvedPanicEvents: 0,
      };
    }
  }

  // ================================================
  // Health Check
  // ================================================

  async healthCheck(): Promise<boolean> {
    try {
      const { data } = await this.api.get('/health');
      return data.status === 'success';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;