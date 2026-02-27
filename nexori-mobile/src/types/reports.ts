export type ReportModule = 'minutes' | 'bikes' | 'panic' | 'all';

export interface ReportFilters {
  module: ReportModule;
  dateFrom: string;
  dateTo: string;
  
  // Filtros de Minutas
  minuteCategories?: string[];
  minuteStatuses?: string[];
  minutePriorities?: string[];
  
  // Filtros de Bicicletas
  bikeStatuses?: string[];
  
  // Filtros de Pánico
  panicAreas?: string[];
  panicStatuses?: string[];
}

export interface ReportData {
  module: ReportModule;
  totalRecords: number;
  filteredRecords: number;
  summary: Record<string, number>;
  data: any[];
}