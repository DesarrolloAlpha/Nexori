// Agrega estos tipos junto con los que ya tienes:

export type MinuteStatus = 'pending' | 'reviewed' | 'closed';
export type MinuteType = 'anotacion' | 'hurto' | 'novedad_vehiculo' | 'objetos_abandonados' |
                        'novedad' | 'observacion' | 'recomendacion' | 'nueva_marca' |
                        'incidente' | 'emergencia' | 'mantenimiento' | 'persona_sospechosa';
export type MinutePriority = 'low' | 'medium' | 'high';

export interface Minute {
  id: string;
  title: string;
  description: string;
  type: MinuteType;
  reportedBy: string;
  reportedByName: string;
  location?: string;
  status: MinuteStatus;
  priority: MinutePriority;
  assignedTo?: string;
  assignedToName?: string;
  attachments?: string[];
  resolvedAt?: string;
  closedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  closedBy?: string;
  closedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MinuteFormData {
  title: string;
  description: string;
  type: MinuteType;
  location: string;
  priority: MinutePriority;
  reportedBy: string;
  reportedByName: string;
  assignedTo?: string;
  assignedToName?: string;
}

export interface MinuteStatusUpdate {
  status: MinuteStatus;
  assignedTo?: string;
  assignedToName?: string;
  resolvedByName?: string;
  closedByName?: string;
}