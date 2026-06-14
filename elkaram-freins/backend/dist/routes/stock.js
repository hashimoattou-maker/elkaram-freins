"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/movements', async (req, res) => {
    try {
        const { product_id, movement_type, date_from, date_to, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        let where = 'WHERE 1=1';
        const params = [];
        if (product_id) {
            where += ' AND sm.product_id = ?';
            params.push(product_id);
        }
        if (movement_type) {
            where += ' AND sm.movement_type = ?';
            params.push(movement_type);
        }
        if (date_from) {
            where += ' AND sm.created_at >= ?';
            params.push(date_from);
        }
        if (date_to) {
            where += ' AND sm.created_at <= ?';
            params.push(date_to);
        }
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as count FROM stock_movements sm ${where}`, params);
        const [movements] = await database_1.default.execute(`
      SELECT sm.*, p.name as product_name, p.reference as product_reference
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ${where}
      ORDER BY sm.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params);
        res.json({
            data: movements,
            total: countRows[0].count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(countRows[0].count / limitNum),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des mouvements de stock' });
    }
});
router.post('/adjust', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        const { product_id, quantity, reason, notes } = req.body;
        if (!product_id || quantity === undefined) {
            res.status(400).json({ error: 'Produit et quantité sont requis' });
            return;
        }
        const [productRows] = await conn.execute('SELECT id, stock, purchase_price FROM products WHERE id = ? AND active = 1', [product_id]);
        if (productRows.length === 0) {
            res.status(404).json({ error: 'Produit non trouvé' });
            return;
        }
        const product = productRows[0];
        const qty = parseFloat(quantity);
        if (isNaN(qty)) {
            res.status(400).json({ error: 'Quantité invalide' });
            return;
        }
        const id = (0, helpers_1.generateId)();
        await conn.beginTransaction();
        await conn.execute("UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?", [qty, product_id]);
        await conn.execute(`INSERT INTO stock_movements (id, product_id, movement_type, quantity, unit_price, reference, notes, created_by)
       VALUES (?, ?, 'ajustement', ?, ?, ?, ?, ?)`, [id, product_id, Math.abs(qty), product.purchase_price, reason || '', notes || `Ajustement: ${reason || 'manuel'}`, req.user.id]);
        await conn.commit();
        const [updatedRows] = await database_1.default.execute('SELECT * FROM products WHERE id = ?', [product_id]);
        const updatedProduct = updatedRows[0];
        if (updatedProduct) {
            updatedProduct.purchase_price = Number(updatedProduct.purchase_price || 0);
            updatedProduct.selling_price = Number(updatedProduct.selling_price || 0);
            updatedProduct.wholesale_price = Number(updatedProduct.wholesale_price || 0);
        }
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'stock_adjust', 'product', product_id, `Ajustement de stock: ${qty > 0 ? '+' : ''}${qty}`]);
        res.json({ message: 'Stock ajusté avec succès', product: updatedProduct, movement_id: id });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de l\'ajustement du stock' });
    }
    finally {
        conn.release();
    }
});
router.get('/low-stock', async (req, res) => {
    try {
        const [products] = await database_1.default.execute(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = 1 AND p.stock <= p.min_stock
      ORDER BY (p.stock * 1.0 / CASE WHEN p.min_stock = 0 THEN 1 ELSE p.min_stock END) ASC
    `);
        const lowStockCount = products.length;
        const criticalCount = products.filter((p) => Number(p.stock) === 0).length;
        res.json({
            count: lowStockCount,
            critical_count: criticalCount,
            products: products.map((p) => ({
                ...p,
                purchase_price: Number(p.purchase_price || 0),
                selling_price: Number(p.selling_price || 0),
                stock: Number(p.stock || 0),
                min_stock: Number(p.min_stock || 0),
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des produits en stock faible' });
    }
});
router.get('/report', async (req, res) => {
    try {
        const [products] = await database_1.default.execute(`
      SELECT p.id, p.reference, p.name, p.stock, p.min_stock, p.purchase_price, p.selling_price, p.unit,
             (p.stock * p.purchase_price) as stock_value,
             (p.stock * p.selling_price) as selling_value,
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = 1
      ORDER BY stock_value DESC
    `);
        const totalProducts = products.length;
        const totalStockValue = products.reduce((sum, p) => sum + (parseFloat(p.stock_value) || 0), 0);
        const totalSellingValue = products.reduce((sum, p) => sum + (parseFloat(p.selling_value) || 0), 0);
        const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
        res.json({
            summary: {
                totalProducts,
                totalStock,
                totalStockValue: Math.round(totalStockValue * 100) / 100,
                totalSellingValue: Math.round(totalSellingValue * 100) / 100,
                potentialMargin: Math.round((totalSellingValue - totalStockValue) * 100) / 100,
            },
            products: products.map((p) => ({
                ...p,
                stock: Number(p.stock || 0),
                min_stock: Number(p.min_stock || 0),
                purchase_price: Number(p.purchase_price || 0),
                selling_price: Number(p.selling_price || 0),
                stock_value: Number(p.stock_value || 0),
                selling_value: Number(p.selling_value || 0),
            })),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la génération du rapport de stock' });
    }
});
exports.default = router;
//# sourceMappingURL=stock.js.map