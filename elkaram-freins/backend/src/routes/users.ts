import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils/helpers';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [users] = await pool.execute('SELECT id, username, email, full_name, role, active, created_at FROM users ORDER BY full_name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    const { username, email, password, full_name, role } = req.body;
    if (!username || !email || !password || !full_name) {
      res.status(400).json({ error: 'Tous les champs requis sont obligatoires' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]) as any;
    if (existingRows.length > 0) {
      res.status(409).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
      return;
    }

    const id = generateId();
    const hashed = bcrypt.hashSync(password, 10);
    await pool.execute(
      'INSERT INTO users (id, username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, email, hashed, full_name, role || 'user']
    );

    await pool.execute(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, 'create', 'user', id, `Création utilisateur ${username}`]
    );

    const [userRows] = await pool.execute(
      'SELECT id, username, email, full_name, role, active, created_at FROM users WHERE id = ?',
      [id]
    ) as any;
    res.status(201).json(userRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    const { id } = req.params;
    const { email, full_name, role, password, active } = req.body;

    const [existingRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (email) { updates.push('email = ?'); params.push(email); }
    if (full_name) { updates.push('full_name = ?'); params.push(full_name); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active); }
    if (password) {
      updates.push('password = ?');
      params.push(bcrypt.hashSync(password, 10));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Aucun champ à mettre à jour' });
      return;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    await pool.execute(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, 'update', 'user', id, 'Mise à jour utilisateur']
    );

    const [userRows] = await pool.execute(
      'SELECT id, username, email, full_name, role, active, created_at FROM users WHERE id = ?',
      [id]
    ) as any;
    res.json(userRows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    const { id } = req.params;
    if (id === req.user!.id) {
      res.status(400).json({ error: 'Vous ne pouvez pas vous désactiver vous-même' });
      return;
    }

    const [existingRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]) as any;
    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    await pool.execute("UPDATE users SET active = 0, updated_at = NOW() WHERE id = ?", [id]);

    await pool.execute(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, 'deactivate', 'user', id, 'Désactivation utilisateur']
    );

    res.json({ message: 'Utilisateur désactivé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la désactivation de l\'utilisateur' });
  }
});

export default router;
