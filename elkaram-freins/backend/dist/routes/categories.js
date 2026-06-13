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
router.get('/', async (req, res) => {
    try {
        const [categories] = await database_1.default.execute(`
      SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND active = 1) as product_count
      FROM categories c ORDER BY c.name
    `);
        res.json(categories);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
    }
});
router.post('/', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Le nom de la catégorie est requis' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM categories WHERE name = ?', [name]);
        if (existingRows.length > 0) {
            res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
            return;
        }
        const id = (0, helpers_1.generateId)();
        await database_1.default.execute('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [id, name, description || '']);
        const [catRows] = await database_1.default.execute('SELECT * FROM categories WHERE id = ?', [id]);
        res.status(201).json(catRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
    }
});
router.put('/:id', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const [existingRows] = await database_1.default.execute('SELECT id FROM categories WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Catégorie non trouvée' });
            return;
        }
        if (name) {
            const [dupRows] = await database_1.default.execute('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]);
            if (dupRows.length > 0) {
                res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà' });
                return;
            }
        }
        const updates = [];
        const params = [];
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        params.push(id);
        await database_1.default.execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);
        const [catRows] = await database_1.default.execute('SELECT * FROM categories WHERE id = ?', [id]);
        res.json(catRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour de la catégorie' });
    }
});
router.delete('/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM categories WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Catégorie non trouvée' });
            return;
        }
        const [hasProducts] = await database_1.default.execute('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
        if (hasProducts[0].count > 0) {
            res.status(400).json({ error: 'Impossible de supprimer une catégorie contenant des produits' });
            return;
        }
        await database_1.default.execute('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ message: 'Catégorie supprimée avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map