import axios from "axios";
import { validate, zDashboardStats } from "./schemas";
import type {
  AuthResponse,
  LoginCredentials,
  User,
  Product,
  Client,
  Supplier,
  Document,
  DocumentType,
  Category,
  StockMovement,
  DashboardStats,
  CompanySettings,
  DocumentDesign,
  ColumnSetting,
  PaginatedResponse,
  ImportResult,
  StockAdjustment,
  PaymentData,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>("/auth/login", credentials).then((r) => r.data),
  getMe: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const products = {
  getProducts: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Product>>("/products", { params }).then((r) => r.data),
  getProduct: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  createProduct: (data: Partial<Product>) =>
    api.post<Product>("/products", data).then((r) => r.data),
  updateProduct: (id: string, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data).then((r) => r.data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
  generateBarcode: () => api.post("/products/generate-barcode").then((r) => r.data),
  getByBarcode: (barcode: string) =>
    api.get<Product>(`/products/barcode/${barcode}`).then((r) => r.data),
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ImportResult>("/products/import-excel", fd, { timeout: 120000, headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  exportExcel: () => api.get("/products/export", { responseType: "blob" }).then((r) => r.data),
};

export const clients = {
  getClients: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Client>>("/clients", { params }).then((r) => r.data),
  getClient: (id: string) => api.get<Client>(`/clients/${id}`).then((r) => r.data),
  createClient: (data: Partial<Client>) =>
    api.post<Client>("/clients", data).then((r) => r.data),
  updateClient: (id: string, data: Partial<Client>) =>
    api.put<Client>(`/clients/${id}`, data).then((r) => r.data),
  deleteClient: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ImportResult>("/clients/import-excel", fd, { timeout: 120000, headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  exportExcel: () => api.get("/clients/export", { responseType: "blob" }).then((r) => r.data),
};

export const suppliers = {
  getSuppliers: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Supplier>>("/suppliers", { params }).then((r) => r.data),
  getSupplier: (id: string) => api.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),
  createSupplier: (data: Partial<Supplier>) =>
    api.post<Supplier>("/suppliers", data).then((r) => r.data),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    api.put<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
  deleteSupplier: (id: string) => api.delete(`/suppliers/${id}`).then((r) => r.data),
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ImportResult>("/suppliers/import-excel", fd, { timeout: 120000, headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  exportExcel: () => api.get("/suppliers/export", { responseType: "blob" }).then((r) => r.data),
};

export const documents = {
  getDocuments: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<Document>>("/documents", { params }).then((r) => r.data),
  getDocument: (id: string) => api.get<Document>(`/documents/${id}`).then((r) => r.data),
  createDocument: (data: Partial<Document>) =>
    api.post<Document>("/documents", data).then((r) => r.data),
  updateDocument: (id: string, data: Partial<Document>) =>
    api.put<Document>(`/documents/${id}`, data).then((r) => r.data),
  deleteDocument: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
  validateDocument: (id: string) =>
    api.post<Document>(`/documents/${id}/validate`).then((r) => r.data),
  convertDocument: (id: string, targetType: DocumentType) =>
    api.post<Document>(`/documents/${id}/convert`, { targetType }).then((r) => r.data),
  getDocumentPDF: (id: string) =>
    api.get(`/documents/${id}/pdf`, { responseType: "blob" }).then((r) => r.data),
  recordPayment: (id: string, data: PaymentData) =>
    api.post<Document>(`/documents/${id}/payment`, data).then((r) => r.data),
};

export const dashboard = {
  getStats: () =>
    api.get<DashboardStats>("/dashboard/stats").then((r) => {
      validate(zDashboardStats, r.data, "DashboardStats");
      return r.data as DashboardStats;
    }),
};

function mapDesign(d: any): DocumentDesign {
  return {
    id: d.id,
    name: d.name,
    primaryColor: d.primary_color,
    secondaryColor: d.secondary_color,
    fontFamily: d.font_family,
    showLogo: Boolean(d.show_logo),
    showBorders: Boolean(d.show_borders),
    headerStyle: d.header_style,
    isDefault: Boolean(d.is_default),
  };
}

function unmapDesign(data: Partial<DocumentDesign>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.primaryColor !== undefined) body.primary_color = data.primaryColor;
  if (data.secondaryColor !== undefined) body.secondary_color = data.secondaryColor;
  if (data.fontFamily !== undefined) body.font_family = data.fontFamily;
  if (data.showLogo !== undefined) body.show_logo = data.showLogo;
  if (data.showBorders !== undefined) body.show_borders = data.showBorders;
  if (data.headerStyle !== undefined) body.header_style = data.headerStyle;
  if (data.isDefault !== undefined) body.is_default = data.isDefault;
  return body;
}

export const settings = {
  getCompany: () =>
    api.get<any>("/settings/company").then((r) => {
      const d = r.data;
      return {
        id: d.id,
        name: d.company_name,
        address: d.address,
        phone: d.phone,
        email: d.email,
        website: d.website,
        fiscalId: d.fiscal_id,
        ice: d.ice,
        logo: d.logo_base64 || d.logo_path,
        logoWidth: d.logo_width || 200,
        logoHeight: d.logo_height || 100,
        currency: d.currency,
        taxRate: d.tax_rate,
        defaultDesignId: undefined,
      } as CompanySettings;
    }),
  updateCompany: (data: Partial<CompanySettings>) => {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.company_name = data.name;
    if (data.address !== undefined) body.address = data.address;
    if (data.phone !== undefined) body.phone = data.phone;
    if (data.email !== undefined) body.email = data.email;
    if (data.website !== undefined) body.website = data.website;
    if (data.fiscalId !== undefined) body.fiscal_id = data.fiscalId;
    if (data.ice !== undefined) body.ice = data.ice;
    if (data.logoWidth !== undefined) body.logo_width = data.logoWidth;
    if (data.logoHeight !== undefined) body.logo_height = data.logoHeight;
    if (data.currency !== undefined) body.currency = data.currency;
    if (data.taxRate !== undefined) body.tax_rate = data.taxRate;
    if (data.defaultDesignId !== undefined) body.default_document_design = data.defaultDesignId;
    return api.put<any>("/settings/company", body).then((r) => r.data);
  },
  uploadLogo: async (file: File) => {
    const fd = new FormData();
    fd.append("logo", file);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/settings/logo", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { logoPath: data.logo_path };
  },
  getColumns: (docType: string) =>
    api.get<any[]>(`/settings/columns/${docType}`).then((r) => ({
      type: docType,
      columns: r.data
        .filter((col: any) => col.visible)
        .map((col: any) => col.column_name),
    })),
  updateColumns: (docType: string, allColumns: string[], visibleColumns: string[]) => {
    const columns = allColumns.map((col) => ({
      document_type: docType,
      column_name: col,
      visible: visibleColumns.includes(col),
    }));
    return api.put("/settings/columns", { columns }).then((r) => r.data);
  },
  getDesigns: () =>
    api.get<any[]>("/settings/designs").then((r) => r.data.map(mapDesign)),
  createDesign: (data: Partial<DocumentDesign>) =>
    api.post<any>("/settings/designs", unmapDesign(data)).then((r) => mapDesign(r.data)),
  updateDesign: (id: number, data: Partial<DocumentDesign>) =>
    api.put<any>(`/settings/designs/${id}`, unmapDesign(data)).then((r) => mapDesign(r.data)),
  deleteDesign: (id: number) => api.delete(`/settings/designs/${id}`).then((r) => r.data),
};

export const users = {
  getUsers: () => api.get<User[]>("/users").then((r) => r.data),
  createUser: (data: Partial<User>) => api.post<User>("/users", data).then((r) => r.data),
  updateUser: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

export const stock = {
  getMovements: (params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<StockMovement>>("/stock/movements", { params }).then((r) => r.data),
  adjustStock: (data: StockAdjustment) =>
    api.post<StockMovement>("/stock/adjust", data).then((r) => r.data),
  getLowStock: () => api.get<Product[]>("/stock/low-stock").then((r) => r.data),
  getStockReport: () => api.get("/stock/report", { responseType: "blob" }).then((r) => r.data),
};

export const categories = {
  getCategories: () => api.get<Category[]>("/categories").then((r) => r.data),
  createCategory: (data: Partial<Category>) =>
    api.post<Category>("/categories", data).then((r) => r.data),
  updateCategory: (id: string, data: Partial<Category>) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`).then((r) => r.data),
};

export default api;
