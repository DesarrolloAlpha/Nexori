// ================================================
// Tipos de Usuario
// ================================================

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
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// ================================================
// Tipos de Bicicleta
// ================================================

export interface Bike {
  id: string;
  serialNumber: string;
  brand: string;
  model: string;
  color: string;
  ownerName: string;
  ownerDocument: string;
  status: 'inside' | 'outside' | 'maintenance';
  location?: string;
  notes?: string;
  qrCode: string;
  lastCheckIn?: string;
  lastCheckOut?: string;
  checkInBy?: string;
  checkOutBy?: string;
  registeredById?: string;
  createdAt: string;
  updatedAt: string;
}

export type BikeStatus = Bike['status'];

export interface BikeFormData {
  serialNumber: string;
  brand: string;
  model: string;
  color: string;
  ownerName: string;
  ownerDocument: string;
  status?: BikeStatus;
  location?: string;
  notes?: string;
  qrCode?: string;
}

// ================================================
// Tipos de Evento de Pánico
// ================================================

export interface PanicEvent {
  id: string;
  userId: string;
  userName: string;
  status: 'active' | 'attended' | 'resolved';
  timestamp: string;
  attendedBy?: string;
  attendedAt?: string;
  resolvedAt?: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export type PanicStatus = PanicEvent['status'];

// ================================================
// Tipos de Dashboard
// ================================================

export interface DashboardStats {
  totalBikes: number;
  availableBikes: number;
  bikesInUse: number;
  bikesInMaintenance: number;
  totalUsers: number;
  activeUsers: number;
  activePanicEvents: number;
  resolvedPanicEvents: number;
}

export interface BikesByStatus {
  available: number;
  in_use: number;
  maintenance: number;
  lost: number;
}

// ================================================
// Tipos de Respuesta API
// ================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================================
// Tipos de Formularios
// ================================================

export interface FormErrors {
  [key: string]: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

// ================================================
// Tipos de Navegación
// ================================================

export interface NavItem {
  name: string;
  path: string;
  icon?: React.ComponentType<any>;
  badge?: number;
}

// ================================================
// Tipos de Notificación
// ================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
