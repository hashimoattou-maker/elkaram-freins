import { Router, Response } from 'express';
import pool from '../database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/helpers';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [categories] = await pool.execute(`
      SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND active = 1) as product_count
      FROM categories c ORDER BY c.name
    `);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

router.post('/', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Le nom de la catégorie est requis' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM categories WHERE name = ?', [name]) as any;
    if (existingRows.length > 0) {
      res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
      return;
    }

    const id = generateId();
    await pool.execute('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [id, name, description || '']);

    const [catRows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]) as any;
    res.status(201).json(catRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
  }
});

router.put('/:id', requireRole('admin', 'user'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const [existingRows] = await pool.execute('SELECT id FROM categories WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }

    if (name) {
      const [dupRows] = await pool.execute('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]) as any;
      if (dupRows.length > 0) {
        res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
        return;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    params.push(id);

    await pool.execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    const [catRows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]) as any;
    res.json(catRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la catégorie' });
  }
});

router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.execute('SELECT id FROM categories WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Catégorie non trouvée' });
      return;
    }

    const [hasProducts] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]) as any;
    if (hasProducts[0].count > 0) {
      res.status(400).json({ error: 'Impossible de supprimer une catégorie contenant des produits' });
      return;
    }

    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
  }
});

export default router;
