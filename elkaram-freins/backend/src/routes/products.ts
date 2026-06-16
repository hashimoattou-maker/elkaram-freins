import { Router, Response } from 'express';
import pool from '../database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateId, generateBarcode } from '../utils/helpers';
import { upload } from '../middleware/upload';
import * as XLSX from 'xlsx';

const router = Router();

router.use(authenticate);

function mapProduct(p: any): any {
  if (!p) return p;
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

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, category_id, active, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params: any[] = [];

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
    } else {
      where += ' AND p.active = 1';
    }

    const [countRows] = await pool.execute(`SELECT COUNT(*) as count FROM products p ${where}`, params) as any;
    const [products] = await pool.execute(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params) as any;

    res.json({
      data: products.map(mapProduct),
      total: countRows[0].count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(countRows[0].count / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
});

router.get('/barcode/:barcode', async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.barcode = ?
    `, [req.params.barcode]) as any;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }
    res.json(mapProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la recherche du produit' });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const [products] = await pool.execute(`
      SELECT p.reference, p.name, p.description, c.name as category_name, p.barcode,
             p.purchase_price, p.selling_price, p.wholesale_price, p.stock, p.min_stock, p.unit
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 ORDER BY p.name
    `) as any;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(products);
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=produits.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'exportation' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [req.params.id]) as any;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }
    res.json(mapProduct(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
  }
});

router.post('/', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit } = req.body;

    if (!reference || !name) {
      res.status(400).json({ error: 'Référence et nom sont requis' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM products WHERE reference = ?', [reference]) as any;
    if (existingRows.length > 0) {
      res.status(409).json({ error: 'Un produit avec cette référence existe déjà' });
      return;
    }

    const finalBarcode = barcode || generateBarcode();
    const id = generateId();

    await pool.execute(
      `INSERT INTO products (id, reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, name, description || '', category_id || null, finalBarcode, purchase_price || 0, selling_price || 0, wholesale_price || 0, stock || 0, min_stock || 5, unit || 'piece']
    );

    const [productRows] = await pool.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [id]) as any;

    res.status(201).json(mapProduct(productRows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du produit' });
  }
});

router.put('/:id', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM products WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }

    const { reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit, active } = req.body;

    if (reference) {
      const [dupRows] = await pool.execute('SELECT id FROM products WHERE reference = ? AND id != ?', [reference, id]) as any;
      if (dupRows.length > 0) {
        res.status(409).json({ error: 'Un produit avec cette référence existe déjà' });
        return;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (reference) { updates.push('reference = ?'); params.push(reference); }
    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id || null); }
    if (barcode !== undefined) { updates.push('barcode = ?'); params.push(barcode); }
    if (purchase_price !== undefined) { updates.push('purchase_price = ?'); params.push(purchase_price); }
    if (selling_price !== undefined) { updates.push('selling_price = ?'); params.push(selling_price); }
    if (wholesale_price !== undefined) { updates.push('wholesale_price = ?'); params.push(wholesale_price); }
    if (stock !== undefined) { updates.push('stock = ?'); params.push(stock); }
    if (min_stock !== undefined) { updates.push('min_stock = ?'); params.push(min_stock); }
    if (unit) { updates.push('unit = ?'); params.push(unit); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour' });
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

    const [productRows] = await pool.execute(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [id]) as any;
    res.json(mapProduct(productRows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
  }
});

router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM products WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Produit non trouvé' });
      return;
    }
    await pool.execute("UPDATE products SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
    res.json({ message: 'Produit désactivé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la désactivation du produit' });
  }
});

router.post('/generate-barcode', async (req: AuthRequest, res: Response) => {
  try {
    let barcode = generateBarcode();
    let attempts = 0;
    let [existingRows] = await pool.execute('SELECT id FROM products WHERE barcode = ?', [barcode]) as any;
    while (existingRows.length > 0 && attempts < 10) {
      barcode = generateBarcode();
      [existingRows] = await pool.execute('SELECT id FROM products WHERE barcode = ?', [barcode]) as any;
      attempts++;
    }
    res.json({ barcode });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la génération du code-barres' });
  }
});

router.post('/import-excel', requireRole('admin', 'user'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier requis' });
      return;
    }

    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws) as any[];

    const validRows = data.filter((row) => row.reference && row.name);
    const errors = data.length - validRows.length;

    if (validRows.length === 0) {
      res.json({ imported: 0, errors, total: data.length });
      return;
    }

    const refs = validRows.map((r: any) => String(r.reference));
    const ph = refs.map(() => '?').join(',');
    const [existing] = await conn.query(
      `SELECT reference FROM products WHERE reference IN (${ph})`,
      refs
    ) as any[];
    const existingRefs = new Set(existing.map((r: any) => r.reference));

    const catCache: Record<string, string> = {};
    const [allCats] = await conn.execute('SELECT id, name FROM categories') as any[];
    for (const c of allCats) { catCache[c.name] = c.id; }

    const toInsert = validRows.filter((r: any) => !existingRefs.has(r.reference));

    await conn.beginTransaction();
    const BATCH = 100;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const rows: any[][] = batch.map((row: any) => {
        let categoryId: string | null = null;
        if (row.category_name && catCache[row.category_name]) {
          categoryId = catCache[row.category_name];
        }
        return [
          generateId(), row.reference, row.name, row.description || '', categoryId,
          row.barcode || generateBarcode(), row.purchase_price || 0, row.selling_price || 0,
          row.wholesale_price || 0, row.stock || 0, row.min_stock || 5, row.unit || 'piece'
        ];
      });
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flat = rows.flat();
      await conn.query(
        `INSERT INTO products (id, reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit) VALUES ${placeholders}`,
        flat
      );
    }
    await conn.commit();

    res.json({ imported: toInsert.length, errors: errors + existingRefs.size, total: data.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Erreur lors de l\'importation' });
  } finally {
    conn.release();
  }
});

export default router;
