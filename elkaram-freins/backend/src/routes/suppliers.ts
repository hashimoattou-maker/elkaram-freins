import { Router, Response } from 'express';
import pool from '../database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/helpers';
import { upload } from '../middleware/upload';
import * as XLSX from 'xlsx';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, active, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      where += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR company LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (active !== undefined) {
      where += ' AND active = ?';
      params.push(active === 'true' || active === '1' ? 1 : 0);
    } else {
      where += ' AND active = 1';
    }

    const [countRows] = await pool.execute(`SELECT COUNT(*) as count FROM suppliers ${where}`, params) as any;
    const [suppliers] = await pool.execute(`
      SELECT * FROM suppliers ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}
    `, params) as any;

    res.json({
      data: suppliers,
      total: countRows[0].count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(countRows[0].count / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const [suppliers] = await pool.execute('SELECT code, name, company, address, phone, email, fiscal_id, ice, notes FROM suppliers WHERE active = 1 ORDER BY name') as any;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(suppliers);
    XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=fournisseurs.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'exportation' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const [supplierRows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [req.params.id]) as any;
    if (supplierRows.length === 0) {
      res.status(404).json({ error: 'Fournisseur non trouvé' });
      return;
    }

    const [documents] = await pool.execute(`
      SELECT id, doc_number, doc_type, date, total, status, created_at
      FROM documents WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]) as any;

    const [totalDueRows] = await pool.execute(`
      SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as total_due
      FROM documents WHERE supplier_id = ? AND status = 'confirmé'
    `, [req.params.id]) as any;

    res.json({
      ...supplierRows[0],
      balance: Number(supplierRows[0].balance || 0),
      documents: documents.map((d: any) => ({ ...d, total: Number(d.total || 0) })),
      total_due: Number(totalDueRows[0].total_due || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur' });
  }
});

router.post('/', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, company, address, phone, email, fiscal_id, ice, notes } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Code et nom sont requis' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM suppliers WHERE code = ?', [code]) as any;
    if (existingRows.length > 0) {
      res.status(409).json({ error: 'Un fournisseur avec ce code existe déjà' });
      return;
    }

    const id = generateId();
    await pool.execute(
      `INSERT INTO suppliers (id, code, name, company, address, phone, email, fiscal_id, ice, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, company || '', address || '', phone || '', email || '', fiscal_id || '', ice || '', notes || '']
    );

    const [supplierRows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]) as any;
    res.status(201).json(supplierRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
  }
});

router.put('/:id', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM suppliers WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Fournisseur non trouvé' });
      return;
    }

    const { code, name, company, address, phone, email, fiscal_id, ice, balance, notes, active } = req.body;

    if (code) {
      const [dupRows] = await pool.execute('SELECT id FROM suppliers WHERE code = ? AND id != ?', [code, id]) as any;
      if (dupRows.length > 0) {
        res.status(409).json({ error: 'Un fournisseur avec ce code existe déjà' });
        return;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (code) { updates.push('code = ?'); params.push(code); }
    if (name) { updates.push('name = ?'); params.push(name); }
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (fiscal_id !== undefined) { updates.push('fiscal_id = ?'); params.push(fiscal_id); }
    if (ice !== undefined) { updates.push('ice = ?'); params.push(ice); }
    if (balance !== undefined) { updates.push('balance = ?'); params.push(balance); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour' });
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`, params);

    const [supplierRows] = await pool.execute('SELECT * FROM suppliers WHERE id = ?', [id]) as any;
    res.json(supplierRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du fournisseur' });
  }
});

router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM suppliers WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Fournisseur non trouvé' });
      return;
    }
    await pool.execute("UPDATE suppliers SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
    res.json({ message: 'Fournisseur désactivé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la désactivation du fournisseur' });
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

    const validRows = data.filter((row) => row.code && (row.name || row.company));
    const errors = data.length - validRows.length;

    if (validRows.length === 0) {
      res.json({ imported: 0, errors, total: data.length });
      return;
    }

    const [existingRows] = await conn.query('SELECT code FROM suppliers') as any[];
    const existingCodes = new Set(existingRows.map((r: any) => String(r.code)));

    const toInsert = validRows.filter((r: any) => !existingCodes.has(String(r.code)));

    await conn.beginTransaction();
    let imported = 0;
    for (const row of toInsert) {
      try {
        await conn.query(
          `INSERT INTO suppliers (id, code, name, company, address, phone, email, fiscal_id, ice, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), String(row.code), row.name || row.company || '', row.company || '',
           row.address || '', row.phone || '', row.email || '', row.fiscal_id || '',
           row.ice || '', row.notes || '']
        );
        imported++;
      } catch { /* skip */ }
    }
    await conn.commit();

    res.json({ imported, errors: errors + (toInsert.length - imported), total: data.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Erreur lors de l\'importation' });
  } finally {
    conn.release();
  }
});

export default router;
