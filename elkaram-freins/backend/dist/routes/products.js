"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const helpers_1 = require("../utils/helpers");
const upload_1 = require("../middleware/upload");
const XLSX = __importStar(require("xlsx"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
function mapProduct(p) {
    if (!p)
        return p;
    return {
        ...p,
        purchasePrice: Number(p.purchase_price || 0),
        sellingPrice: Number(p.selling_price || 0),
        wholesalePrice: Number(p.wholesale_price || 0),
        purchase_price: Number(p.purchase_price || 0),
        selling_price: Number(p.selling_price || 0),
        wholesale_price: Number(p.wholesale_price || 0),
        stock: Number(p.stock || 0),
        min_stock: Number(p.min_stock || 0),
        categoryId: p.category_id,
        categoryName: p.category_name,
    };
}
router.get('/', async (req, res) => {
    try {
        const { search, category_id, active, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        let where = 'WHERE 1=1';
        const params = [];
        if (search) {
            where += ' AND (p.name LIKE ? OR p.reference LIKE ? OR p.barcode LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        if (category_id) {
            where += ' AND p.category_id = ?';
            params.push(category_id);
        }
        if (active !== undefined) {
            where += ' AND p.active = ?';
            params.push(active === 'true' || active === '1' ? 1 : 0);
        }
        else {
            where += ' AND p.active = 1';
        }
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as count FROM products p ${where}`, params);
        const [products] = await database_1.default.execute(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params);
        res.json({
            data: products.map(mapProduct),
            total: countRows[0].count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(countRows[0].count / limitNum),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
});
router.get('/barcode/:barcode', async (req, res) => {
    try {
        const [rows] = await database_1.default.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.barcode = ?
    `, [req.params.barcode]);
        if (rows.length === 0) {
            res.status(404).json({ error: 'Produit non trouvé' });
            return;
        }
        res.json(mapProduct(rows[0]));
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la recherche du produit' });
    }
});
router.get('/export', async (req, res) => {
    try {
        const [products] = await database_1.default.execute(`
      SELECT p.reference, p.name, p.description, c.name as category_name, p.barcode,
             p.purchase_price, p.selling_price, p.wholesale_price, p.stock, p.min_stock, p.unit
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 ORDER BY p.name
    `);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(products);
        XLSX.utils.book_append_sheet(wb, ws, 'Produits');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=produits.xlsx');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'exportation' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await database_1.default.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [req.params.id]);
        if (rows.length === 0) {
            res.status(404).json({ error: 'Produit non trouvé' });
            return;
        }
        res.json(mapProduct(rows[0]));
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
    }
});
router.post('/', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit } = req.body;
        if (!reference || !name) {
            res.status(400).json({ error: 'Référence et nom sont requis' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM products WHERE reference = ?', [reference]);
        if (existingRows.length > 0) {
            res.status(409).json({ error: 'Un produit avec cette référence existe déjà' });
            return;
        }
        const finalBarcode = barcode || (0, helpers_1.generateBarcode)();
        const id = (0, helpers_1.generateId)();
        await database_1.default.execute(`INSERT INTO products (id, reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, reference, name, description || '', category_id || null, finalBarcode, purchase_price || 0, selling_price || 0, wholesale_price || 0, stock || 0, min_stock || 5, unit || 'piece']);
        const [productRows] = await database_1.default.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [id]);
        res.status(201).json(mapProduct(productRows[0]));
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création du produit' });
    }
});
router.put('/:id', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM products WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Produit non trouvé' });
            return;
        }
        const { reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit, active } = req.body;
        if (reference) {
            const [dupRows] = await database_1.default.execute('SELECT id FROM products WHERE reference = ? AND id != ?', [reference, id]);
            if (dupRows.length > 0) {
                res.status(409).json({ error: 'Un produit avec cette référence existe déjà' });
                return;
            }
        }
        const updates = [];
        const params = [];
        if (reference) {
            updates.push('reference = ?');
            params.push(reference);
        }
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (category_id !== undefined) {
            updates.push('category_id = ?');
            params.push(category_id || null);
        }
        if (barcode !== undefined) {
            updates.push('barcode = ?');
            params.push(barcode);
        }
        if (purchase_price !== undefined) {
            updates.push('purchase_price = ?');
            params.push(purchase_price);
        }
        if (selling_price !== undefined) {
            updates.push('selling_price = ?');
            params.push(selling_price);
        }
        if (wholesale_price !== undefined) {
            updates.push('wholesale_price = ?');
            params.push(wholesale_price);
        }
        if (stock !== undefined) {
            updates.push('stock = ?');
            params.push(stock);
        }
        if (min_stock !== undefined) {
            updates.push('min_stock = ?');
            params.push(min_stock);
        }
        if (unit) {
            updates.push('unit = ?');
            params.push(unit);
        }
        if (active !== undefined) {
            updates.push('active = ?');
            params.push(active);
        }
        if (updates.length === 0) {
            res.status(400).json({ error: 'Aucun champ à mettre à jour' });
            return;
        }
        updates.push('updated_at = NOW()');
        params.push(id);
        await database_1.default.execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
        const [productRows] = await database_1.default.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [id]);
        res.json(mapProduct(productRows[0]));
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
    }
});
router.delete('/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM products WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Produit non trouvé' });
            return;
        }
        await database_1.default.execute("UPDATE products SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
        res.json({ message: 'Produit désactivé avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation du produit' });
    }
});
router.post('/generate-barcode', async (req, res) => {
    try {
        let barcode = (0, helpers_1.generateBarcode)();
        let attempts = 0;
        let [existingRows] = await database_1.default.execute('SELECT id FROM products WHERE barcode = ?', [barcode]);
        while (existingRows.length > 0 && attempts < 10) {
            barcode = (0, helpers_1.generateBarcode)();
            [existingRows] = await database_1.default.execute('SELECT id FROM products WHERE barcode = ?', [barcode]);
            attempts++;
        }
        res.json({ barcode });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la génération du code-barres' });
    }
});
router.post('/import-excel', (0, auth_1.requireRole)('admin', 'user'), upload_1.upload.single('file'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Fichier requis' });
            return;
        }
        const wb = XLSX.read(req.file.buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const validRows = data.filter((row) => row.reference && row.name);
        const errors = data.length - validRows.length;
        if (validRows.length === 0) {
            res.json({ imported: 0, errors, total: data.length });
            return;
        }
        const [existingRows] = await conn.query('SELECT reference FROM products');
        const existingRefs = new Set(existingRows.map((r) => String(r.reference)));
        const catCache = {};
        const [allCats] = await conn.query('SELECT id, name FROM categories');
        for (const c of allCats) {
            catCache[c.name] = c.id;
        }
        const toInsert = validRows.filter((r) => !existingRefs.has(String(r.reference)));
        await conn.beginTransaction();
        let imported = 0;
        for (const row of toInsert) {
            try {
                let categoryId = null;
                if (row.category_name && catCache[row.category_name]) {
                    categoryId = catCache[row.category_name];
                }
                await conn.query(`INSERT INTO products (id, reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, helpers_1.generateId)(), row.reference, row.name, row.description || '', categoryId,
                    row.barcode || (0, helpers_1.generateBarcode)(), row.purchase_price || 0, row.selling_price || 0,
                    row.wholesale_price || 0, row.stock || 0, row.min_stock || 5, row.unit || 'piece']);
                imported++;
            }
            catch { /* skip */ }
        }
        await conn.commit();
        res.json({ imported, errors: errors + (toInsert.length - imported), total: data.length });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de l\'importation' });
    }
    finally {
        conn.release();
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map