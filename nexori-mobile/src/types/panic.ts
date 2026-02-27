export type PanicStatus = 'active' | 'attended' | 'resolved';

export interface PanicEvent {
  id: string;
  userId: string;
  userName: string;
  localName?: string;
  adminName?: string;
  localNumber?: string;
  status: PanicStatus;
  timestamp: string;
  attendedBy?: string;
  attendedAt?: string;
  resolvedAt?: string;
  notes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePanicData {}

export interface UpdatePanicStatusData {
  status: PanicStatus;
  notes?: string;
}
