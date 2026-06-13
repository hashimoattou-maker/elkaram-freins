import { Router, Response } from 'express';
import pool from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [productsRows] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE active = 1') as any;
    const [clientsRows] = await pool.execute('SELECT COUNT(*) as count FROM clients WHERE active = 1') as any;
    const [suppliersRows] = await pool.execute('SELECT COUNT(*) as count FROM suppliers WHERE active = 1') as any;
    const [lowStockRows] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE active = 1 AND stock <= min_stock') as any;
    const [revenueRows] = await pool.execute("SELECT COALESCE(SUM(total), 0) as total FROM documents WHERE doc_type IN ('facture_vente', 'bon_livraison') AND status = 'confirmé'") as any;
    const [purchaseRows] = await pool.execute("SELECT COALESCE(SUM(total), 0) as total FROM documents WHERE doc_type IN ('facture_achat', 'bon_achat') AND status = 'confirmé'") as any;
    const [pendingRows] = await pool.execute("SELECT COUNT(*) as count FROM documents WHERE doc_type = 'facture_vente' AND status NOT IN ('payée', 'converti', 'annulé')") as any;

    const year = new Date().getFullYear();

    const [monthlyRevenue] = await pool.execute(`
      SELECT MONTH(date) as month, COALESCE(SUM(total), 0) as total
      FROM documents
      WHERE doc_type IN ('facture_vente', 'bon_livraison')
        AND status = 'confirmé'
        AND YEAR(date) = ?
      GROUP BY MONTH(date)
      ORDER BY month
    `, [String(year)]) as any;

    const initMonthly = (): { month: string; revenue: number }[] =>
      Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1).padStart(2, '0'), revenue: 0 }));

    const revenueData = initMonthly();
    for (const r of monthlyRevenue as any[]) {
      const idx = revenueData.findIndex(m => m.month === String(r.month).padStart(2, '0'));
      if (idx >= 0) revenueData[idx].revenue = parseFloat(r.total);
    }

    const [recentDocuments] = await pool.execute(`
      SELECT d.id, d.doc_number as docNumber, d.doc_type as docType, d.date, d.total, d.status
      FROM documents d
      ORDER BY d.created_at DESC LIMIT 10
    `) as any;

    const [topProducts] = await pool.execute(`
      SELECT p.id as productId, p.name as productName, p.reference as productReference, SUM(dl.quantity) as totalSold, SUM(dl.total_ht) as totalRevenue
      FROM document_lines dl
      JOIN products p ON p.id = dl.product_id
      JOIN documents d ON d.id = dl.document_id
      WHERE d.doc_type IN ('facture_vente', 'bon_livraison') AND d.status = 'confirmé'
      GROUP BY p.id ORDER BY totalSold DESC LIMIT 10
    `) as any;

    const [lowStockProducts] = await pool.execute(`
      SELECT id, reference, name, stock, min_stock as minStock, unit, selling_price, purchase_price, category_id, active, description
      FROM products WHERE active = 1 AND stock <= min_stock
      ORDER BY stock ASC LIMIT 10
    `) as any;

    res.json({
      totalProducts: productsRows[0].count,
      totalClients: clientsRows[0].count,
      totalSuppliers: suppliersRows[0].count,
      lowStockCount: lowStockRows[0].count,
      totalRevenue: parseFloat(revenueRows[0].total),
      totalPurchases: parseFloat(purchaseRows[0].total),
      pendingInvoices: pendingRows[0].count,
      monthlyRevenue: revenueData,
      recentDocuments,
      topProducts,
      lowStockProducts,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
