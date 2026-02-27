export type UserRole = 'admin' | 'coordinator' | 'supervisor' | 'operator' | 'guard' | 'locatario';

export interface User {
  id: string;
  email: string;
  name: string;
  localName?: string;
  adminName?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}