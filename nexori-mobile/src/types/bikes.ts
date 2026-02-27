export type BikeStatus = 'inside' | 'outside';

export interface Bike {
  id: string;
  qrCode: string; // ← El código QR único
  serialNumber: string;
  brand: string;
  model: string;
  color: string;
  ownerName: string;
  ownerDocument: string;
  location: string;
  status: BikeStatus;
  photoUri?: string;
  lastCheckIn?: string;
  lastCheckOut?: string; 
  entryDate?: string;
  exitDate?: string; // ← Foto de la bicicleta (opcional)
}

export interface BikeHistoryEntry {
  id: string;
  bikeId: string;
  action: 'entry' | 'exit';
  date: string;
  guardName: string;
  observations?: string;
}