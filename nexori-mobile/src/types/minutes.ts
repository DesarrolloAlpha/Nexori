// Tipos compartidos para el módulo de Minutas

export type Category =
  | 'anotacion'
  | 'hurto'
  | 'novedad_vehiculo'
  | 'objetos_abandonados'
  | 'novedad'
  | 'observacion'
  | 'recomendacion'
  | 'nueva_marca'
  | 'incidente'
  | 'emergencia'
  | 'mantenimiento'
  | 'persona_sospechosa';

export type Status = 'pending' | 'reviewed' | 'closed';

export type Priority = 'high' | 'medium' | 'low';

export interface Minute {
  id: string;
  title: string;
  description: string;
  date: string;
  createdBy: string;
  status: Status;
  priority: Priority;
  category: Category;
  location?: string;
  assignedTo?: string;
  attachments?: any[];
  // Trazabilidad
  reviewedBy?: string;
  reviewedAt?: string;
  closedBy?: string;
  closedAt?: string;
}