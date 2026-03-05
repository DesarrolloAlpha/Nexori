export type BikeStatus = 'inside' | 'outside';

export interface Bike {
  id: string;
  qrCode?: string;
  serialNumber: string;
  brand: string;
  model: string;
  color: string;
  ownerName: string;
  ownerDocument: string;
  ownerPhone?: string;
  location: string;
  status: BikeStatus;
  notes?: string;
  photoUri?: string;
  lastCheckIn?: string;
  lastCheckOut?: string;
  entryDate?: string;
  exitDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BikeHistoryEntry {
  id: string;
  bikeId: string;
  action: 'entry' | 'exit';
  date: string;
  guardName: string;
  observations?: string;
}