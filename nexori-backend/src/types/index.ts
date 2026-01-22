export type UserRole = 'admin' | 'coordinator' | 'supervisor' | 'operator' | 'guard';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface WebSocketMessage {
  type: 'panic_alert' | 'bike_check_in' | 'bike_check_out' | 'minute_created' | 'user_connected' | 'user_disconnected';
  data: any;
  timestamp: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface FilterParams {
  status?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
}