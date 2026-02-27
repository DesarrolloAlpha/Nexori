import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { User, LoginCredentials, RegisterData } from '@/types';

// ================================================
// Tipos del Contexto
// ================================================

interface AuthContextType {
  user: User | null;
  token: string | null; // ✅ AGREGADO
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// ================================================
// Creación del Contexto
// ================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================================================
// Provider del Contexto
// ================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // ✅ AGREGADO
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Verificar si hay una sesión activa al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token'); // ✅ RENOMBRADO
      const savedUser = localStorage.getItem('user');

      if (storedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(storedToken); // ✅ AGREGADO
          
          // Validar token con el backend
          try {
            const profile = await apiService.getProfile();
            setUser(profile);
            localStorage.setItem('user', JSON.stringify(profile));
          } catch (error) {
            // Si el token no es válido, limpiar
            console.error('Token inválido:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setToken(null); // ✅ AGREGADO
          }
        } catch (error) {
          console.error('Error al verificar autenticación:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          setToken(null); // ✅ AGREGADO
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔐 Intentando login con:', credentials.email);
      
      const response = await apiService.login(credentials);
      
      console.log('✅ Login exitoso:', response);
      
      // Extraer datos de la respuesta
      const { token, refreshToken, user: userData } = response.data;

      // Guardar en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Actualizar estado
      setUser(userData);
      setToken(token); // ✅ AGREGADO
      
      // Navegar al dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      // Extraer mensaje de error
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Error al iniciar sesión';
      
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      console.log('📝 Intentando registro con:', userData.email);
      
      const response = await apiService.register(userData);
      
      console.log('✅ Registro exitoso:', response);
      
      // Extraer datos de la respuesta
      const { token, refreshToken, user: newUser } = response.data;

      // Guardar en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Actualizar estado
      setUser(newUser);
      setToken(token); // ✅ AGREGADO
      
      // Navegar al dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      
      // Extraer mensaje de error
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Error al registrarse';
      
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Limpiar siempre, incluso si hay error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setToken(null); // ✅ AGREGADO
      navigate('/login');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    token, // ✅ AGREGADO
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ================================================
// Hook personalizado
// ================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};