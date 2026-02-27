// types/tickets.ts (FRONTEND - React Native)

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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

export interface CreateTicketData {
  type: TicketType;
  priority: TicketPriority;
  subject: string;
  description: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
}