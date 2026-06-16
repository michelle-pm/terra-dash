export interface ImportRun {
  id: string;
  fileName: string;
  fileType: 'yearly_revenue_report' | 'price_list';
  uploadedBy: string;
  uploadedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  rowsParsed: number;
  rowsInserted: number;
  rowsUpdated: number;
  warnings: string[];
  errors: string[];
  status: 'pending_confirmation' | 'confirmed';
}

export interface CorrectionLog {
  id: string;
  date: string; // YYYY-MM-DD
  entityType: 'revenue' | 'price';
  entityId: string; // "date-unit" or "date-category"
  fieldName: string;
  oldValue: string | number;
  newValue: string | number;
  sourceFile: string;
  user: string;
  changedAt: string;
}

export interface RevenueData {
  date: string; // YYYY-MM-DD
  weekday: string; // e.g. Пн, Вт...
  sourceCategory: string; // e.g. "Полусфера Neodome"
  unitName: string; // e.g. "П01"
  actualRevenue: number;
  importId: string;
  isEmpty?: boolean; // True if the cell was blank/empty in the Excel file
}

export interface PriceData {
  category: string; // Price list category name, e.g. "Полусфера Neodome"
  originalCategory?: string; // Original spreadsheet category name, e.g. "Полусфера Neodome (без завтрака)"
  date: string; // YYYY-MM-DD
  price: number;
  importId: string;
}

export interface CategoryMapping {
  reportCategory: string;
  priceListCategory: string;
}

export interface TariffUpdate {
  category: string;
  date: string; // YYYY-MM-DD
  price: number;
}

export interface Booking {
  code: string;
  source: string;
  group?: string;
  bookingDate: string; // YYYY-MM-DD
  cancelDate: string | null; // YYYY-MM-DD or null
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  category: string;
  roomNum: string;
  guest: string;
  adults: number;
  children: number;
  balance: number;
  total: number;
  manager?: string;
}
