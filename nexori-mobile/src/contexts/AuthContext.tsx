import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';
import api from '../services/api';
import { User, LoginCredentials, AuthContextType, UserRole } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Función para convertir role string a UserRole
  const convertToUserRole = (roleString: string): UserRole => {
    const validRoles: UserRole[] = ['admin', 'coordinator', 'supervisor', 'operator', 'guard', 'locatario'];
    
    if (validRoles.includes(roleString as UserRole)) {
      return roleString as UserRole;
    }
    
    // Valor por defecto si no coincide
    console.warn(`Role inválido recibido: ${roleString}, usando 'operator' por defecto`);
    return 'operator';
  };

  // Cargar credenciales guardadas al iniciar
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          
          // Convertir role a UserRole
          const typedUser: User = {
            ...parsedUser,
            role: convertToUserRole(parsedUser.role)
          };
          
          setUser(typedUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verificar si el token aún es válido
          const profileResult = await authService.getProfile();
          if (!profileResult.success) {
            // Token inválido, intentar refresh
            const refreshResult = await authService.refreshToken();
            if (!refreshResult.success) {
              // Limpiar si el refresh también falla
              await authService.logout();
              setUser(null);
              setToken(null);
            } else if (refreshResult.data?.user) {
              const refreshedUser = {
                ...refreshResult.data.user,
                role: convertToUserRole(refreshResult.data.user.role)
              };
              setToken(refreshResult.data.token || null);
              setUser(refreshedUser);
            }
          }
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStoredAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.data) {
        // Convertir role a UserRole
        const typedUser: User = {
          ...result.data.user,
          role: convertToUserRole(result.data.user.role)
        };
        
        setUser(typedUser);
        setToken(result.data.token);
      } else {
        throw new Error(result.error || 'Error en el inicio de sesión');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};