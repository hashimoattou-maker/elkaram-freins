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

    const [countRows] = await pool.execute(`SELECT COUNT(*) as count FROM clients ${where}`, params) as any;
    const [clients] = await pool.execute(`
      SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}
    `, params) as any;

    res.json({
      data: clients,
      total: countRows[0].count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(countRows[0].count / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
  }
});

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const [clients] = await pool.execute('SELECT code, name, company, address, phone, email, fiscal_id, commercial_id, credit_limit, balance, notes FROM clients WHERE active = 1 ORDER BY name') as any;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(clients);
    XLSX.utils.book_append_sheet(wb, ws, 'Clients');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'exportation des clients' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const [clientRows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [req.params.id]) as any;
    if (clientRows.length === 0) {
      res.status(404).json({ error: 'Client non trouvé' });
      return;
    }

    const [documents] = await pool.execute(`
      SELECT id, doc_number, doc_type, date, total, status, created_at
      FROM documents WHERE client_id = ? ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]) as any;

    const [totalDueRows] = await pool.execute(`
      SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as total_due
      FROM documents WHERE client_id = ? AND status = 'confirmé'
    `, [req.params.id]) as any;

    res.json({
      ...clientRows[0],
      credit_limit: Number(clientRows[0].credit_limit || 0),
      balance: Number(clientRows[0].balance || 0),
      documents: documents.map((d: any) => ({ ...d, total: Number(d.total || 0) })),
      total_due: Number(totalDueRows[0].total_due || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du client' });
  }
});

router.post('/', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, notes } = req.body;
    if (!code || !name) {
      res.status(400).json({ error: 'Code et nom sont requis' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM clients WHERE code = ?', [code]) as any;
    if (existingRows.length > 0) {
      res.status(409).json({ error: 'Un client avec ce code existe déjà' });
      return;
    }

    const id = generateId();
    await pool.execute(
      `INSERT INTO clients (id, code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, company || '', address || '', phone || '', email || '', fiscal_id || '', ice || '', commercial_id || '', article_id || '', credit_limit || 0, notes || '']
    );

    const [clientRows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [id]) as any;
    res.status(201).json(clientRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du client' });
  }
});

router.put('/:id', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM clients WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Client non trouvé' });
      return;
    }

    const { code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, balance, notes, active } = req.body;

    if (code) {
      const [dupRows] = await pool.execute('SELECT id FROM clients WHERE code = ? AND id != ?', [code, id]) as any;
      if (dupRows.length > 0) {
        res.status(409).json({ error: 'Un client avec ce code existe déjà' });
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
    if (commercial_id !== undefined) { updates.push('commercial_id = ?'); params.push(commercial_id); }
    if (article_id !== undefined) { updates.push('article_id = ?'); params.push(article_id); }
    if (credit_limit !== undefined) { updates.push('credit_limit = ?'); params.push(credit_limit); }
    if (balance !== undefined) { updates.push('balance = ?'); params.push(balance); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour' });
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, params);

    const [clientRows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [id]) as any;
    res.json(clientRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du client' });
  }
});

router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM clients WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Client non trouvé' });
      return;
    }
    await pool.execute("UPDATE clients SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
    res.json({ message: 'Client désactivé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la désactivation du client' });
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
    let imported = 0;
    let errors = 0;

    await conn.beginTransaction();
    for (const row of data) {
      try {
        if (!row.code || !row.name) { errors++; continue; }
        const [existsRows] = await conn.execute('SELECT id FROM clients WHERE code = ?', [row.code]) as any;
        if (existsRows.length > 0) { errors++; continue; }
        await conn.execute(
          `INSERT INTO clients (id, code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), row.code, row.name, row.company || '', row.address || '', row.phone || '', row.email || '', row.fiscal_id || '', row.ice || '', row.commercial_id || '', row.article_id || '', row.credit_limit || 0, row.notes || '']
        );
        imported++;
      } catch { errors++; }
    }
    await conn.commit();

    res.json({ imported, errors, total: data.length });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Erreur lors de l\'importation des clients' });
  } finally {
    conn.release();
  }
});

export default router;
