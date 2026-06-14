export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "user";
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  barcode?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  unit: string;
  active: boolean;
  imagePath?: string;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  company?: string;
  address?: string;
  phone?: string;
  email?: string;
  fiscalId?: string;
  ice?: string;
  commercialId?: string;
  articleId?: string;
  creditLimit: number;
  balance: number;
  notes?: string;
  active: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  company?: string;
  address?: string;
  phone?: string;
  email?: string;
  fiscalId?: string;
  ice?: string;
  commercialId?: string;
  articleId?: string;
  creditLimit: number;
  balance: number;
  notes?: string;
  active: boolean;
}

export interface Document {
  id: string;
  docNumber: string;
  docType: DocumentType;
  date: string;
  dueDate?: string;
  status: DocumentStatus;
  clientId?: string;
  client?: Client;
  supplierId?: string;
  supplier?: Supplier;
  matricule?: string;
  lines: DocumentLine[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  discountType: "percentage" | "fixed";
  shipping: number;
  total: number;
  paidAmount: number;
  notes?: string;
  terms?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentLine {
  id?: number;
  productId?: string;
  product?: Product;
  ref?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate?: number;
  totalHt?: number;
  totalTtc?: number;
  total?: number;
  taxAmount?: number;
}

export type DocumentType =
  | "devis"
  | "commande_client"
  | "bon_livraison"
  | "facture_vente"
  | "avoir_vente"
  | "bon_commande"
  | "bon_achat"
  | "facture_achat"
  | "avoir_achat";

export type DocumentStatus = "brouillon" | "confirmé" | "annulé" | "converti";

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  productReference?: string;
  type: "entrée" | "sortie" | "ajustement";
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reason?: string;
  documentId?: string;
  documentRef?: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalClients: number;
  totalSuppliers: number;
  lowStockCount: number;
  monthlyRevenue: { month: string; revenue: number }[];
  recentDocuments: Document[];
  topProducts: {
    productId: string;
    productName: string;
    productReference: string;
    totalSold: number;
    totalRevenue: number;
  }[];
  lowStockProducts: Product[];
  totalRevenue: number;
  totalPurchases: number;
  pendingInvoices: number;
}

export interface CompanySettings {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  fiscalId?: string;
  ice?: string;
  logo?: string;
  logoWidth: number;
  logoHeight: number;
  currency: string;
  taxRate: number;
  defaultDesignId?: number;
}

export interface DocumentDesign {
  id: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showLogo: boolean;
  showBorders: boolean;
  headerStyle: "modern" | "classic" | "professional" | "minimal";
  isDefault: boolean;
}

export interface ColumnSetting {
  type: string;
  columns: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ImportResult {
  imported: number;
  errors: number;
  total: number;
}

export interface StockAdjustment {
  productId: string;
  quantity: number;
  type: "entrée" | "sortie" | "ajustement";
  reason?: string;
}

export interface PaymentData {
  amount: number;
  method: string;
  date: string;
  reference?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
