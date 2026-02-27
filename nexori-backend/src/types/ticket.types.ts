// types/ticket.types.ts

export type TicketType = 'bug' | 'feature' | 'feedback' | 'question' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  userId: string;
  createdByName: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  authorName: string;
  message: string;
  isStaff: boolean;
  createdAt: Date;
}

export interface CreateTicketInput {
  type: TicketType;
  priority: TicketPriority;
  subject: string;
  description: string;
}

export interface UpdateTicketInput {
  type?: TicketType;
  priority?: TicketPriority;
  status?: TicketStatus;
  subject?: string;
  description?: string;
  assignedToId?: string;
  assignedToName?: string;
}

export interface CreateCommentInput {
  message: string;
}

export interface TicketFilter {
  type?: string;
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'priority';
  order?: 'ASC' | 'DESC';
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
}