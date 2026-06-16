"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/company', async (req, res) => {
    try {
        const [rows] = await database_1.default.execute('SELECT * FROM company_settings WHERE id = 1');
        if (rows.length === 0) {
            res.status(404).json({ error: 'Paramètres non trouvés' });
            return;
        }
        res.json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
    }
});
router.put('/company', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { company_name, address, phone, email, website, fiscal_id, ice, logo_width, logo_height, currency, tax_rate, default_document_design } = req.body;
        const updates = [];
        const params = [];
        if (company_name) {
            updates.push('company_name = ?');
            params.push(company_name);
        }
        if (address !== undefined) {
            updates.push('address = ?');
            params.push(address);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            params.push(phone);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }
        if (website !== undefined) {
            updates.push('website = ?');
            params.push(website);
        }
        if (fiscal_id !== undefined) {
            updates.push('fiscal_id = ?');
            params.push(fiscal_id);
        }
        if (ice !== undefined) {
            updates.push('ice = ?');
            params.push(ice);
        }
        if (logo_width) {
            updates.push('logo_width = ?');
            params.push(logo_width);
        }
        if (logo_height) {
            updates.push('logo_height = ?');
            params.push(logo_height);
        }
        if (currency) {
            updates.push('currency = ?');
            params.push(currency);
        }
        if (tax_rate !== undefined) {
            updates.push('tax_rate = ?');
            params.push(tax_rate);
        }
        if (default_document_design) {
            updates.push('default_document_design = ?');
            params.push(default_document_design);
        }
        if (updates.length === 0) {
            res.status(400).json({ error: 'Aucun champ à mettre à jour' });
            return;
        }
        updates.push('updated_at = NOW()');
        await database_1.default.execute(`UPDATE company_settings SET ${updates.join(', ')} WHERE id = 1`, params);
        const [rows] = await database_1.default.execute('SELECT * FROM company_settings WHERE id = 1');
        res.json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
    }
});
router.post('/logo', (0, auth_1.requireRole)('admin'), upload_1.upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Fichier logo requis' });
            return;
        }
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        await database_1.default.execute("UPDATE company_settings SET logo_base64 = ?, updated_at = NOW() WHERE id = 1", [base64]);
        res.json({ logo_base64: base64 });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors du téléchargement du logo' });
    }
});
router.get('/columns/:documentType', async (req, res) => {
    try {
        const [columns] = await database_1.default.execute('SELECT * FROM document_columns WHERE document_type = ? ORDER BY id', [req.params.documentType]);
        res.json(columns);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des colonnes' });
    }
});
router.put('/columns', (0, auth_1.requireRole)('admin'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        const { columns } = req.body;
        if (!Array.isArray(columns)) {
            res.status(400).json({ error: 'Liste de colonnes requise' });
            return;
        }
        await conn.beginTransaction();
        for (const col of columns) {
            await conn.execute('UPDATE document_columns SET visible = ? WHERE document_type = ? AND column_name = ?', [col.visible ? 1 : 0, col.document_type, col.column_name]);
        }
        await conn.commit();
        res.json({ message: 'Colonnes mises à jour' });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de la mise à jour des colonnes' });
    }
    finally {
        conn.release();
    }
});
router.get('/designs', async (req, res) => {
    try {
        const [designs] = await database_1.default.execute('SELECT * FROM document_designs ORDER BY is_default DESC, name');
        res.json(designs);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des designs' });
    }
});
router.post('/designs', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { name, primary_color, secondary_color, font_family, show_logo, show_borders, header_style, is_default } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Nom du design requis' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM document_designs WHERE name = ?', [name]);
        if (existingRows.length > 0) {
            res.status(409).json({ error: 'Un design avec ce nom existe déjà' });
            return;
        }
        const [result] = await database_1.default.execute(`
      INSERT INTO document_designs (name, primary_color, secondary_color, font_family, show_logo, show_borders, header_style, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, primary_color || '#1e40af', secondary_color || '#f59e0b', font_family || 'Inter',
            show_logo !== undefined ? (show_logo ? 1 : 0) : 1, show_borders !== undefined ? (show_borders ? 1 : 0) : 1,
            header_style || 'modern', is_default ? 1 : 0]);
        const designId = result.insertId;
        if (is_default) {
            await database_1.default.execute('UPDATE document_designs SET is_default = 0 WHERE id != ?', [designId]);
        }
        const [designRows] = await database_1.default.execute('SELECT * FROM document_designs WHERE id = ?', [designId]);
        res.status(201).json(designRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création du design' });
    }
});
router.put('/designs/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM document_designs WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Design non trouvé' });
            return;
        }
        const { name, primary_color, secondary_color, font_family, show_logo, show_borders, header_style, is_default } = req.body;
        const updates = [];
        const params = [];
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (primary_color) {
            updates.push('primary_color = ?');
            params.push(primary_color);
        }
        if (secondary_color) {
            updates.push('secondary_color = ?');
            params.push(secondary_color);
        }
        if (font_family) {
            updates.push('font_family = ?');
            params.push(font_family);
        }
        if (show_logo !== undefined) {
            updates.push('show_logo = ?');
            params.push(show_logo ? 1 : 0);
        }
        if (show_borders !== undefined) {
            updates.push('show_borders = ?');
            params.push(show_borders ? 1 : 0);
        }
        if (header_style) {
            updates.push('header_style = ?');
            params.push(header_style);
        }
        if (is_default !== undefined) {
            updates.push('is_default = ?');
            params.push(is_default ? 1 : 0);
        }
        if (updates.length === 0) {
            res.status(400).json({ error: 'Aucun champ à mettre à jour' });
            return;
        }
        params.push(id);
        await database_1.default.execute(`UPDATE document_designs SET ${updates.join(', ')} WHERE id = ?`, params);
        if (is_default) {
            await database_1.default.execute('UPDATE document_designs SET is_default = 0 WHERE id != ?', [id]);
        }
        const [designRows] = await database_1.default.execute('SELECT * FROM document_designs WHERE id = ?', [id]);
        res.json(designRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du design' });
    }
});
router.delete('/designs/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id, is_default FROM document_designs WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Design non trouvé' });
            return;
        }
        if (existingRows[0].is_default) {
            res.status(400).json({ error: 'Impossible de supprimer le design par défaut' });
            return;
        }
        await database_1.default.execute('DELETE FROM document_designs WHERE id = ?', [id]);
        res.json({ message: 'Design supprimé avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression du design' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map