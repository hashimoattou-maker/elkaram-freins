import { Router, Response } from 'express';
import pool from '../database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import fs from 'fs';

const router = Router();

router.use(authenticate);

router.get('/company', async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM company_settings WHERE id = 1') as any;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Paramètres non trouvés' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
  }
});

router.put('/company', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { company_name, address, phone, email, website, fiscal_id, ice, logo_width, logo_height, currency, tax_rate, default_document_design } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (company_name) { updates.push('company_name = ?'); params.push(company_name); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (website !== undefined) { updates.push('website = ?'); params.push(website); }
    if (fiscal_id !== undefined) { updates.push('fiscal_id = ?'); params.push(fiscal_id); }
    if (ice !== undefined) { updates.push('ice = ?'); params.push(ice); }
    if (logo_width) { updates.push('logo_width = ?'); params.push(logo_width); }
    if (logo_height) { updates.push('logo_height = ?'); params.push(logo_height); }
    if (currency) { updates.push('currency = ?'); params.push(currency); }
    if (tax_rate !== undefined) { updates.push('tax_rate = ?'); params.push(tax_rate); }
    if (default_document_design) { updates.push('default_document_design = ?'); params.push(default_document_design); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour' });
      return;
    }

    updates.push('updated_at = NOW()');
    await pool.execute(`UPDATE company_settings SET ${updates.join(', ')} WHERE id = 1`, params);

    const [rows] = await pool.execute('SELECT * FROM company_settings WHERE id = 1') as any;
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
  }
});

router.post('/logo', requireRole('admin'), upload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier logo requis' });
      return;
    }
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await pool.execute("UPDATE company_settings SET logo_base64 = ?, updated_at = NOW() WHERE id = 1", [base64]);
    res.json({ logo_base64: base64 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du téléchargement du logo' });
  }
});

router.get('/columns/:documentType', async (req: AuthRequest, res: Response) => {
  try {
    const [columns] = await pool.execute('SELECT * FROM document_columns WHERE document_type = ? ORDER BY id', [req.params.documentType]);
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des colonnes' });
  }
});

router.put('/columns', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const { columns } = req.body;
    if (!Array.isArray(columns)) {
      res.status(400).json({ error: 'Liste de colonnes requise' });
      return;
    }

    await conn.beginTransaction();
    for (const col of columns) {
      await conn.execute('UPDATE document_columns SET visible = ? WHERE document_type = ? AND column_name = ?',
        [col.visible ? 1 : 0, col.document_type, col.column_name]);
    }
    await conn.commit();

    res.json({ message: 'Colonnes mises à jour' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Erreur lors de la mise à jour des colonnes' });
  } finally {
    conn.release();
  }
});

router.get('/designs', async (req: AuthRequest, res: Response) => {
  try {
    const [designs] = await pool.execute('SELECT * FROM document_designs ORDER BY is_default DESC, name');
    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des designs' });
  }
});

router.post('/designs', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, primary_color, secondary_color, font_family, show_logo, show_borders, header_style, is_default } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nom du design requis' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM document_designs WHERE name = ?', [name]) as any;
    if (existingRows.length > 0) {
      res.status(409).json({ error: 'Un design avec ce nom existe déjà' });
      return;
    }

    const [result] = await pool.execute(`
      INSERT INTO document_designs (name, primary_color, secondary_color, font_family, show_logo, show_borders, header_style, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, primary_color || '#1e40af', secondary_color || '#f59e0b', font_family || 'Inter',
      show_logo !== undefined ? (show_logo ? 1 : 0) : 1, show_borders !== undefined ? (show_borders ? 1 : 0) : 1,
      header_style || 'modern', is_default ? 1 : 0]) as any;

    const designId = result.insertId;

    if (is_default) {
      await pool.execute('UPDATE document_designs SET is_default = 0 WHERE id != ?', [designId]);
    }

    const [designRows] = await pool.execute('SELECT * FROM document_designs WHERE id = ?', [designId]) as any;
    res.status(201).json(designRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du design' });
  }
});

router.put('/designs/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM document_designs WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Design non trouvé' });
      return;
    }

    const { name, primary_color, secondary_color, font_family, show_logo, show_borders, header_style, is_default } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (primary_color) { updates.push('primary_color = ?'); params.push(primary_color); }
    if (secondary_color) { updates.push('secondary_color = ?'); params.push(secondary_color); }
    if (font_family) { updates.push('font_family = ?'); params.push(font_family); }
    if (show_logo !== undefined) { updates.push('show_logo = ?'); params.push(show_logo ? 1 : 0); }
    if (show_borders !== undefined) { updates.push('show_borders = ?'); params.push(show_borders ? 1 : 0); }
    if (header_style) { updates.push('header_style = ?'); params.push(header_style); }
    if (is_default !== undefined) { updates.push('is_default = ?'); params.push(is_default ? 1 : 0); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour' });
      return;
    }

    params.push(id);
    await pool.execute(`UPDATE document_designs SET ${updates.join(', ')} WHERE id = ?`, params);

    if (is_default) {
      await pool.execute('UPDATE document_designs SET is_default = 0 WHERE id != ?', [id]);
    }

    const [designRows] = await pool.execute('SELECT * FROM document_designs WHERE id = ?', [id]) as any;
    res.json(designRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du design' });
  }
});

router.delete('/designs/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id, is_default FROM document_designs WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Design non trouvé' });
      return;
    }
    if (existingRows[0].is_default) {
      res.status(400).json({ error: 'Impossible de supprimer le design par défaut' });
      return;
    }
    await pool.execute('DELETE FROM document_designs WHERE id = ?', [id]);
    res.json({ message: 'Design supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression du design' });
  }
});

export default router;
