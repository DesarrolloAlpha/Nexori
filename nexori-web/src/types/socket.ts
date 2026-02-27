// Tipos para eventos de Socket.IO

/**
 * Evento de alerta de pánico
 */
export interface PanicAlertEvent {
  id: string;
  userId: string;
  userName: string;
  status: 'active' | 'attended' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  timestamp: string | Date;
  attendedBy?: string;
  attendedAt?: string | Date;
  resolvedAt?: string | Date;
  notes?: string;
}

/**
 * Evento de bicicleta (check-in/check-out)
 */
export interface BikeEvent {
  id: string;
  bikeNumber: string;
  userId: string;
  userName: string;
  action: 'check_in' | 'check_out';
  timestamp: string | Date;
  location?: string;
}

/**
 * Evento de minuta virtual
 */
export interface MinuteEvent {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  priority: 'low' | 'medium' | 'high';
  type: string;
  timestamp: string | Date;
  assignedTo?: string[];
}

/**
 * Eventos que el servidor EMITE al cliente
 */
export interface ServerToClientEvents {
  // Pánico
  new_panic_alert: (data: PanicAlertEvent) => void;
  panic_status_updated: (data: PanicAlertEvent) => void;

  // Bicicletas
  bike_checked_in: (data: BikeEvent) => void;
  bike_checked_out: (data: BikeEvent) => void;

  // Minutas
  new_minute: (data: MinuteEvent) => void;
  high_priority_minute: (data: MinuteEvent) => void;
}

/**
 * Eventos que el cliente EMITE al servidor
 */
export interface ClientToServerEvents {
  join_room: (room: string) => void;
  panic_alert: (data: Partial<PanicAlertEvent>) => void;
  bike_check_in: (data: Partial<BikeEvent>) => void;
  bike_check_out: (data: Partial<BikeEvent>) => void;
  minute_created: (data: Partial<MinuteEvent>) => void;
}