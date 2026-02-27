import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'coordinator' | 'supervisor' | 'operator' | 'guard';
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean;
      lastLogin?: string;
    };
    token: string;
    refreshToken: string;
  };
  message?: string;
  error?: string;
}

class AuthService {
  async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', loginData);
      
      if (response.data.success && response.data.data) {
        // Guardar token y usuario
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        await AsyncStorage.setItem('refresh_token', response.data.data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Configurar token en headers de axios
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error en el inicio de sesión',
      };
    }
  }

  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/register', registerData);
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error en el registro',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Limpiar almacenamiento local
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');
      
      // Eliminar token de headers de axios
      delete api.defaults.headers.common['Authorization'];
      
      // Opcional: llamar al endpoint de logout del backend
      // await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        return { success: false, error: 'No hay refresh token disponible' };
      }

      const response = await api.post('/auth/refresh-token', { refreshToken });
      
      if (response.data.success && response.data.data) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        await AsyncStorage.setItem('refresh_token', response.data.data.refreshToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Refresh token error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al refrescar token',
      };
    }
  }

  async getProfile(): Promise<AuthResponse> {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error: any) {
      console.error('Get profile error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al obtener perfil',
      };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const user = await AsyncStorage.getItem('user');
      
      if (!token || !user) {
        return false;
      }

      // Verificar si el token está expirado (opcional)
      // Podrías verificar la expiración del JWT aquí
      
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        return JSON.parse(userString);
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  }
}

export default new AuthService();