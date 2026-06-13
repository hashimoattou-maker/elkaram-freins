"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    try {
        const [users] = await database_1.default.execute('SELECT id, username, email, full_name as fullName, role, active, created_at FROM users ORDER BY full_name');
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
});
router.post('/', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Accès refusé' });
            return;
        }
        const { username, email, password, full_name, role } = req.body;
        if (!username || !email || !password || !full_name) {
            res.status(400).json({ error: 'Tous les champs requis sont obligatoires' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingRows.length > 0) {
            res.status(409).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
            return;
        }
        const id = (0, helpers_1.generateId)();
        const hashed = bcryptjs_1.default.hashSync(password, 10);
        await database_1.default.execute('INSERT INTO users (id, username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)', [id, username, email, hashed, full_name, role || 'user']);
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'create', 'user', id, `Création utilisateur ${username}`]);
        const [userRows] = await database_1.default.execute('SELECT id, username, email, full_name as fullName, role, active, created_at FROM users WHERE id = ?', [id]);
        res.status(201).json(userRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Accès refusé' });
            return;
        }
        const { id } = req.params;
        const { email, full_name, role, password, active } = req.body;
        const [existingRows] = await database_1.default.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Utilisateur non trouvé' });
            return;
        }
        const updates = [];
        const params = [];
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (full_name) {
            updates.push('full_name = ?');
            params.push(full_name);
        }
        if (role) {
            updates.push('role = ?');
            params.push(role);
        }
        if (active !== undefined) {
            updates.push('active = ?');
            params.push(active);
        }
        if (password) {
            updates.push('password = ?');
            params.push(bcryptjs_1.default.hashSync(password, 10));
        }
        if (updates.length === 0) {
            res.status(400).json({ error: 'Aucun champ à mettre à jour' });
            return;
        }
        updates.push('updated_at = NOW()');
        params.push(id);
        await database_1.default.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'update', 'user', id, 'Mise à jour utilisateur']);
        const [userRows] = await database_1.default.execute('SELECT id, username, email, full_name as fullName, role, active, created_at FROM users WHERE id = ?', [id]);
        res.json(userRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Accès refusé' });
            return;
        }
        const { id } = req.params;
        if (id === req.user.id) {
            res.status(400).json({ error: 'Vous ne pouvez pas vous désactiver vous-même' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Utilisateur non trouvé' });
            return;
        }
        await database_1.default.execute("UPDATE users SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'deactivate', 'user', id, 'Désactivation utilisateur']);
        res.json({ message: 'Utilisateur désactivé avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation de l\'utilisateur' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map