"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats', async (req, res) => {
    try {
        const [productsRows] = await database_1.default.execute('SELECT COUNT(*) as count FROM products WHERE active = 1');
        const [clientsRows] = await database_1.default.execute('SELECT COUNT(*) as count FROM clients WHERE active = 1');
        const [suppliersRows] = await database_1.default.execute('SELECT COUNT(*) as count FROM suppliers WHERE active = 1');
        const [lowStockRows] = await database_1.default.execute('SELECT COUNT(*) as count FROM products WHERE active = 1 AND stock <= min_stock');
        const [revenueRows] = await database_1.default.execute("SELECT COALESCE(SUM(total), 0) as total FROM documents WHERE doc_type IN ('facture_vente', 'bon_livraison') AND status = 'confirmé'");
        const [purchaseRows] = await database_1.default.execute("SELECT COALESCE(SUM(total), 0) as total FROM documents WHERE doc_type IN ('facture_achat', 'bon_achat') AND status = 'confirmé'");
        const [pendingRows] = await database_1.default.execute("SELECT COUNT(*) as count FROM documents WHERE doc_type = 'facture_vente' AND status NOT IN ('payée', 'converti', 'annulé')");
        const year = new Date().getFullYear();
        const [monthlyRevenue] = await database_1.default.execute(`
      SELECT MONTH(date) as month, COALESCE(SUM(total), 0) as total
      FROM documents
      WHERE doc_type IN ('facture_vente', 'bon_livraison')
        AND status = 'confirmé'
        AND YEAR(date) = ?
      GROUP BY MONTH(date)
      ORDER BY month
    `, [String(year)]);
        const initMonthly = () => Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1).padStart(2, '0'), revenue: 0 }));
        const revenueData = initMonthly();
        for (const r of monthlyRevenue) {
            const idx = revenueData.findIndex(m => m.month === String(r.month).padStart(2, '0'));
            if (idx >= 0)
                revenueData[idx].revenue = parseFloat(r.total);
        }
        const [recentDocuments] = await database_1.default.execute(`
      SELECT d.id, d.doc_number as docNumber, d.doc_type as docType, d.date, d.total, d.status
      FROM documents d
      ORDER BY d.created_at DESC LIMIT 10
    `);
        const [topProducts] = await database_1.default.execute(`
      SELECT p.id as productId, p.name as productName, p.reference as productReference, SUM(dl.quantity) as totalSold, SUM(dl.total_ht) as totalRevenue
      FROM document_lines dl
      JOIN products p ON p.id = dl.product_id
      JOIN documents d ON d.id = dl.document_id
      WHERE d.doc_type IN ('facture_vente', 'bon_livraison') AND d.status = 'confirmé'
      GROUP BY p.id ORDER BY totalSold DESC LIMIT 10
    `);
        const [lowStockProducts] = await database_1.default.execute(`
      SELECT id, reference, name, stock, min_stock as minStock, unit, selling_price, purchase_price, category_id, active, description
      FROM products WHERE active = 1 AND stock <= min_stock
      ORDER BY stock ASC LIMIT 10
    `);
        res.json({
            totalProducts: Number(productsRows[0].count),
            totalClients: Number(clientsRows[0].count),
            totalSuppliers: Number(suppliersRows[0].count),
            lowStockCount: Number(lowStockRows[0].count),
            totalRevenue: Number(revenueRows[0].total),
            totalPurchases: Number(purchaseRows[0].total),
            pendingInvoices: Number(pendingRows[0].count),
            monthlyRevenue: revenueData,
            recentDocuments: recentDocuments.map((d) => ({ ...d, total: Number(d.total) })),
            topProducts: topProducts.map((p) => ({ ...p, totalSold: Number(p.totalSold), totalRevenue: Number(p.totalRevenue) })),
            lowStockProducts: lowStockProducts.map((p) => ({
                ...p,
                selling_price: Number(p.selling_price || 0),
                purchase_price: Number(p.purchase_price || 0),
                stock: Number(p.stock || 0),
                minStock: Number(p.minStock || 0),
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map