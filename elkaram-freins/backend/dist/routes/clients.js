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
router.get('/', async (req, res) => {
    try {
        const { search, active, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        let where = 'WHERE 1=1';
        const params = [];
        if (search) {
            where += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ? OR company LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        if (active !== undefined) {
            where += ' AND active = ?';
            params.push(active === 'true' || active === '1' ? 1 : 0);
        }
        else {
            where += ' AND active = 1';
        }
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as count FROM clients ${where}`, params);
        const [clients] = await database_1.default.execute(`
      SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}
    `, params);
        res.json({
            data: clients,
            total: countRows[0].count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(countRows[0].count / limitNum),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
    }
});
router.get('/export', async (req, res) => {
    try {
        const [clients] = await database_1.default.execute('SELECT code, name, company, address, phone, email, fiscal_id, commercial_id, credit_limit, balance, notes FROM clients WHERE active = 1 ORDER BY name');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(clients);
        XLSX.utils.book_append_sheet(wb, ws, 'Clients');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=clients.xlsx');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'exportation des clients' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const [clientRows] = await database_1.default.execute('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (clientRows.length === 0) {
            res.status(404).json({ error: 'Client non trouvé' });
            return;
        }
        const [documents] = await database_1.default.execute(`
      SELECT id, doc_number, doc_type, date, total, status, created_at
      FROM documents WHERE client_id = ? ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]);
        const [totalDueRows] = await database_1.default.execute(`
      SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as total_due
      FROM documents WHERE client_id = ? AND status = 'confirmé'
    `, [req.params.id]);
        res.json({
            ...clientRows[0],
            credit_limit: Number(clientRows[0].credit_limit || 0),
            balance: Number(clientRows[0].balance || 0),
            documents: documents.map((d) => ({ ...d, total: Number(d.total || 0) })),
            total_due: Number(totalDueRows[0].total_due || 0)
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du client' });
    }
});
router.post('/', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, notes } = req.body;
        if (!code || !name) {
            res.status(400).json({ error: 'Code et nom sont requis' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM clients WHERE code = ?', [code]);
        if (existingRows.length > 0) {
            res.status(409).json({ error: 'Un client avec ce code existe déjà' });
            return;
        }
        const id = (0, helpers_1.generateId)();
        await database_1.default.execute(`INSERT INTO clients (id, code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, code, name, company || '', address || '', phone || '', email || '', fiscal_id || '', ice || '', commercial_id || '', article_id || '', credit_limit || 0, notes || '']);
        const [clientRows] = await database_1.default.execute('SELECT * FROM clients WHERE id = ?', [id]);
        res.status(201).json(clientRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création du client' });
    }
});
router.put('/:id', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM clients WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Client non trouvé' });
            return;
        }
        const { code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, balance, notes, active } = req.body;
        if (code) {
            const [dupRows] = await database_1.default.execute('SELECT id FROM clients WHERE code = ? AND id != ?', [code, id]);
            if (dupRows.length > 0) {
                res.status(409).json({ error: 'Un client avec ce code existe déjà' });
                return;
            }
        }
        const updates = [];
        const params = [];
        if (code) {
            updates.push('code = ?');
            params.push(code);
        }
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (company !== undefined) {
            updates.push('company = ?');
            params.push(company);
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
        if (fiscal_id !== undefined) {
            updates.push('fiscal_id = ?');
            params.push(fiscal_id);
        }
        if (ice !== undefined) {
            updates.push('ice = ?');
            params.push(ice);
        }
        if (commercial_id !== undefined) {
            updates.push('commercial_id = ?');
            params.push(commercial_id);
        }
        if (article_id !== undefined) {
            updates.push('article_id = ?');
            params.push(article_id);
        }
        if (credit_limit !== undefined) {
            updates.push('credit_limit = ?');
            params.push(credit_limit);
        }
        if (balance !== undefined) {
            updates.push('balance = ?');
            params.push(balance);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
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
        await database_1.default.execute(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, params);
        const [clientRows] = await database_1.default.execute('SELECT * FROM clients WHERE id = ?', [id]);
        res.json(clientRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du client' });
    }
});
router.delete('/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM clients WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Client non trouvé' });
            return;
        }
        await database_1.default.execute("UPDATE clients SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
        res.json({ message: 'Client désactivé avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation du client' });
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
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });
        const mapKeys = (row) => ({
            code: row.code || row.Code || row.CODE || '',
            name: row.name || row.Name || row.Nom || row.nom || '',
            company: row.company || row.Company || row.Société || row.societe || row['Societe'] || row.society || '',
            address: row.address || row.Address || row.Adresse || row.adresse || '',
            phone: row.phone || row.Phone || row.Téléphone || row.telephone || row.Tel || row.tel || '',
            email: row.email || row.Email || '',
            fiscal_id: row.fiscal_id || row['Fiscal ID'] || row['N° fiscal'] || '',
            ice: row.ice || row.ICE || row['N° ICE'] || '',
            commercial_id: row.commercial_id || row.commercial || '',
            article_id: row.article_id || '',
            credit_limit: row.credit_limit || row['Crédit'] || 0,
            notes: row.notes || row.Notes || row.Remarques || '',
        });
        const mapped = data.map(mapKeys);
        const validRows = mapped.filter((row) => row.code && (row.name || row.company));
        const errors = data.length - validRows.length;
        if (validRows.length === 0) {
            res.json({ imported: 0, errors, total: data.length });
            return;
        }
        const [existingRows] = await conn.query('SELECT code FROM clients');
        const existingCodes = new Set(existingRows.map((r) => String(r.code)));
        const toInsert = validRows.filter((r) => !existingCodes.has(String(r.code)));
        await conn.beginTransaction();
        let imported = 0;
        for (const row of toInsert) {
            try {
                await conn.query(`INSERT INTO clients (id, code, name, company, address, phone, email, fiscal_id, ice, commercial_id, article_id, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, helpers_1.generateId)(), String(row.code), row.name || row.company || '', row.company || '',
                    row.address || '', row.phone || '', row.email || '', row.fiscal_id || '',
                    row.ice || '', row.commercial_id || '', row.article_id || '',
                    row.credit_limit || 0, row.notes || '']);
                imported++;
            }
            catch { /* skip duplicate or invalid */ }
        }
        await conn.commit();
        res.json({ imported, errors: errors + (toInsert.length - imported), total: data.length });
    }
    catch (err) {
        console.error('Client import error:', err);
        await conn.rollback().catch(() => { });
        res.status(500).json({ error: 'Erreur lors de l\'importation des clients' });
    }
    finally {
        conn.release();
    }
});
exports.default = router;
//# sourceMappingURL=clients.js.map