import { z } from "zod";

export const zDocumentLine = z.object({
  id: z.number().optional(),
  productId: z.string().optional(),
  ref: z.string().optional().nullable(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number(),
  taxRate: z.number().optional(),
  totalHt: z.number().optional(),
  totalTtc: z.number().optional(),
  total: z.number().optional(),
  taxAmount: z.number().optional(),
});

export const zDocument = z.object({
  id: z.string(),
  docNumber: z.string(),
  docType: z.string(),
  date: z.string(),
  dueDate: z.string().optional().nullable(),
  status: z.string(),
  clientId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  lines: z.array(zDocumentLine),
  subtotal: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  discount: z.number(),
  discountType: z.string(),
  shipping: z.number(),
  total: z.number(),
  paidAmount: z.number(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional().nullable(),
});

export const zRecentDocDashboard = z.object({
  id: z.string(),
  docNumber: z.string(),
  docType: z.string(),
  date: z.string(),
  total: z.number(),
  status: z.string(),
});

export const zDashboardStats = z.object({
  totalProducts: z.number(),
  totalClients: z.number(),
  totalSuppliers: z.number(),
  lowStockCount: z.number(),
  monthlyRevenue: z.array(z.object({
    month: z.string(),
    revenue: z.number(),
  })),
  recentDocuments: z.array(zRecentDocDashboard),
  topProducts: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    productReference: z.string(),
    totalSold: z.number(),
    totalRevenue: z.number(),
  })),
  lowStockProducts: z.array(z.object({
    id: z.string(),
    reference: z.string(),
    name: z.string(),
    stock: z.number(),
    minStock: z.number(),
    unit: z.string(),
  })),
  totalRevenue: z.number(),
  totalPurchases: z.number(),
  pendingInvoices: z.number(),
});

export const zUser = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(["admin", "manager", "user"]),
  active: z.boolean(),
  createdAt: z.string(),
});

export const zProduct = z.object({
  id: z.string(),
  reference: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  purchasePrice: z.number(),
  sellingPrice: z.number(),
  wholesalePrice: z.number(),
  stock: z.number(),
  minStock: z.number(),
  unit: z.string(),
  active: z.boolean(),
  imagePath: z.string().optional().nullable(),
});

export const zClient = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  fiscalId: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  commercialId: z.string().optional().nullable(),
  articleId: z.string().optional().nullable(),
  creditLimit: z.number(),
  balance: z.number(),
  notes: z.string().optional().nullable(),
  active: z.boolean(),
});

export const zSupplier = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  fiscalId: z.string().optional().nullable(),
  ice: z.string().optional().nullable(),
  commercialId: z.string().optional().nullable(),
  articleId: z.string().optional().nullable(),
  creditLimit: z.number(),
  balance: z.number(),
  notes: z.string().optional().nullable(),
  active: z.boolean(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Validation échouée pour ${label}: ${issues}`);
  }
  return result.data;
}
