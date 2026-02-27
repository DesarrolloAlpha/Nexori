export interface CreateMinuteInput {
  title: string;
  description: string;
  type: 'anotacion' | 'hurto' | 'novedad_vehiculo' | 'objetos_abandonados' |
        'novedad' | 'observacion' | 'recomendacion' | 'nueva_marca' | 'incidente' |
        'emergencia' | 'mantenimiento' | 'persona_sospechosa';
  location?: string;
  priority: 'low' | 'medium' | 'high';
  reportedByName: string;
  attachments?: string[];
}

export interface UpdateMinuteInput {
  title?: string;
  description?: string;
  type?: 'anotacion' | 'hurto' | 'novedad_vehiculo' | 'objetos_abandonados' |
         'novedad' | 'observacion' | 'recomendacion' | 'nueva_marca' | 'incidente' |
         'emergencia' | 'mantenimiento' | 'persona_sospechosa';
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'reviewed' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  attachments?: string[];
  resolvedAt?: Date;
  closedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
  closedBy?: string;
  closedByName?: string;
}

export interface MinuteFilter {
  status?: string;
  search?: string;
  type?: string;
  priority?: string;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'priority';
  order?: 'ASC' | 'DESC';
}

export interface MinuteResponse {
  id: string;
  title: string;
  description: string;
  type: 'anotacion' | 'hurto' | 'novedad_vehiculo' | 'objetos_abandonados' |
        'novedad' | 'observacion' | 'recomendacion' | 'nueva_marca' | 'incidente' |
        'emergencia' | 'mantenimiento' | 'persona_sospechosa';
  status: 'pending' | 'reviewed' | 'closed';
  priority: 'low' | 'medium' | 'high';
  reportedBy: string;
  reportedByName: string;
  location: string;
  assignedTo?: string;
  assignedToName?: string;
  attachments: string[];
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
  closedAt?: Date;
  closedBy?: string;
  closedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MinutesPaginated {
  minutes: MinuteResponse[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MinuteStats {
  total: number;
  pending: number;
  reviewed: number;
  closed: number;
  byType: {
    anotacion: number;
    hurto: number;
    novedad_vehiculo: number;
    objetos_abandonados: number;
    novedad: number;
    observacion: number;
    recomendacion: number;
    incidente: number;
    emergencia: number;
    mantenimiento: number;
    persona_sospechosa: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}