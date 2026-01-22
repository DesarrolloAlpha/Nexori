export interface CreateMinuteInput {
  title: string;
  description: string;
  type: 'incident' | 'novelty' | 'observation';
  location?: string;
  priority: 'low' | 'medium' | 'high';
  reportedByName: string;
  attachments?: string[];
}

export interface UpdateMinuteInput {
  title?: string;
  description?: string;
  type?: 'incident' | 'novelty' | 'observation';
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
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
  type: 'incident' | 'novelty' | 'observation';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  reportedBy: string;
  reportedByName: string;
  location: string;
  assignedTo?: string;
  assignedToName?: string;
  attachments: string[];
  resolvedAt?: Date;
  closedAt?: Date;
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
  in_progress: number;
  resolved: number;
  closed: number;
  byType: {
    incident: number;
    novelty: number;
    observation: number;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}