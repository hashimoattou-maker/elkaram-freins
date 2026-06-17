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
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as count FROM suppliers ${where}`, params);
        const [suppliers] = await database_1.default.execute(`
      SELECT * FROM suppliers ${where} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offset}
    `, params);
        res.json({
            data: suppliers,
            total: countRows[0].count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(countRows[0].count / limitNum),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
    }
});
router.get('/export', async (req, res) => {
    try {
        const [suppliers] = await database_1.default.execute('SELECT code, name, company, address, phone, email, fiscal_id, ice, notes FROM suppliers WHERE active = 1 ORDER BY name');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(suppliers);
        XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=fournisseurs.xlsx');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'exportation' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const [supplierRows] = await database_1.default.execute('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (supplierRows.length === 0) {
            res.status(404).json({ error: 'Fournisseur non trouvé' });
            return;
        }
        const [documents] = await database_1.default.execute(`
      SELECT id, doc_number, doc_type, date, total, status, created_at
      FROM documents WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]);
        const [totalDueRows] = await database_1.default.execute(`
      SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as total_due
      FROM documents WHERE supplier_id = ? AND status = 'confirmé'
    `, [req.params.id]);
        res.json({
            ...supplierRows[0],
            balance: Number(supplierRows[0].balance || 0),
            documents: documents.map((d) => ({ ...d, total: Number(d.total || 0) })),
            total_due: Number(totalDueRows[0].total_due || 0)
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur' });
    }
});
router.post('/', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { code, name, company, address, phone, email, fiscal_id, ice, notes } = req.body;
        if (!code || !name) {
            res.status(400).json({ error: 'Code et nom sont requis' });
            return;
        }
        const [existingRows] = await database_1.default.execute('SELECT id FROM suppliers WHERE code = ?', [code]);
        if (existingRows.length > 0) {
            res.status(409).json({ error: 'Un fournisseur avec ce code existe déjà' });
            return;
        }
        const id = (0, helpers_1.generateId)();
        await database_1.default.execute(`INSERT INTO suppliers (id, code, name, company, address, phone, email, fiscal_id, ice, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, code, name, company || '', address || '', phone || '', email || '', fiscal_id || '', ice || '', notes || '']);
        const [supplierRows] = await database_1.default.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
        res.status(201).json(supplierRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
    }
});
router.put('/:id', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM suppliers WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Fournisseur non trouvé' });
            return;
        }
        const { code, name, company, address, phone, email, fiscal_id, ice, balance, notes, active } = req.body;
        if (code) {
            const [dupRows] = await database_1.default.execute('SELECT id FROM suppliers WHERE code = ? AND id != ?', [code, id]);
            if (dupRows.length > 0) {
                res.status(409).json({ error: 'Un fournisseur avec ce code existe déjà' });
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
        await database_1.default.execute(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`, params);
        const [supplierRows] = await database_1.default.execute('SELECT * FROM suppliers WHERE id = ?', [id]);
        res.json(supplierRows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du fournisseur' });
    }
});
router.delete('/:id', (0, auth_1.requireRole)('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id FROM suppliers WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Fournisseur non trouvé' });
            return;
        }
        await database_1.default.execute("UPDATE suppliers SET active = 0, updated_at = NOW() WHERE id = ?", [id]);
        res.json({ message: 'Fournisseur désactivé avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la désactivation du fournisseur' });
    }
});
router.post('/import-excel', (0, auth_1.requireRole)('admin', 'user'), upload_1.upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Fichier requis' });
            return;
        }
        const replace = req.body.replace === 'true' || req.body.replace === '1';
        const wb = XLSX.read(req.file.buffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (raw.length < 2) {
            res.status(400).json({ error: 'Le fichier est vide ou ne contient qu\'une en-tête' });
            return;
        }
        const headers = raw[0].map((h) => String(h).trim());
        const dataRows = raw.slice(1);
        const findCol = (candidates) => {
            for (const c of candidates) {
                const idx = headers.findIndex((h) => h.toLowerCase() === c.toLowerCase());
                if (idx !== -1)
                    return idx;
            }
            return -1;
        };
        const colCode = findCol(['code', 'Code', 'CODE']);
        const colName = findCol(['name', 'Name', 'Nom', 'nom']);
        const colCompany = findCol(['company', 'Company', 'Société', 'societe', 'Societe', 'SOCIETE', 'society']);
        const colPhone = findCol(['phone', 'Phone', 'Téléphone', 'telephone', 'Tel', 'tel']);
        const colEmail = findCol(['email', 'Email']);
        const colAddress = findCol(['address', 'Address', 'Adresse', 'adresse']);
        const colFiscal = findCol(['fiscal_id', 'Fiscal ID', 'N° fiscal', 'fiscal']);
        const colIce = findCol(['ice', 'ICE', 'N° ICE']);
        const colNotes = findCol(['notes', 'Notes', 'Remarques']);
        const mapped = dataRows.map((row) => ({
            code: colCode !== -1 ? String(row[colCode] || '').trim() : '',
            name: colName !== -1 ? String(row[colName] || '').trim() : '',
            company: colCompany !== -1 ? String(row[colCompany] || '').trim() : '',
            phone: colPhone !== -1 ? String(row[colPhone] || '').trim() : '',
            email: colEmail !== -1 ? String(row[colEmail] || '').trim() : '',
            address: colAddress !== -1 ? String(row[colAddress] || '').trim() : '',
            fiscal_id: colFiscal !== -1 ? String(row[colFiscal] || '').trim() : '',
            ice: colIce !== -1 ? String(row[colIce] || '').trim() : '',
            notes: colNotes !== -1 ? String(row[colNotes] || '').trim() : '',
        }));
        const validRows = mapped.filter((row) => row.code || row.company);
        const conn = await database_1.default.getConnection();
        try {
            await conn.beginTransaction();
            if (replace) {
                await conn.query('UPDATE suppliers SET active = 0, updated_at = NOW() WHERE active = 1');
            }
            const [existingRows] = await conn.query('SELECT code FROM suppliers WHERE active = 1');
            const existingCodes = new Set(existingRows.map((r) => String(r.code || '').toLowerCase()));
            let imported = 0;
            let updated = 0;
            let skipped = 0;
            for (const row of validRows) {
                const code = row.code || row.company.substring(0, 20);
                if (existingCodes.has(code.toLowerCase())) {
                    try {
                        await conn.query(`UPDATE suppliers SET name = ?, company = ?, address = ?, phone = ?, email = ?, fiscal_id = ?, ice = ?, notes = ?, updated_at = NOW()
               WHERE LOWER(code) = LOWER(?) AND active = 1`, [row.name || row.company || '', row.company || '',
                            row.address || '', row.phone || '', row.email || '', row.fiscal_id || '',
                            row.ice || '', row.notes || '', code]);
                        updated++;
                    }
                    catch {
                        skipped++;
                    }
                    continue;
                }
                try {
                    await conn.query(`INSERT INTO suppliers (id, code, name, company, address, phone, email, fiscal_id, ice, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, helpers_1.generateId)(), code, row.name || row.company || '', row.company || '',
                        row.address || '', row.phone || '', row.email || '', row.fiscal_id || '',
                        row.ice || '', row.notes || '']);
                    existingCodes.add(code.toLowerCase());
                    imported++;
                }
                catch {
                    skipped++;
                }
            }
            await conn.commit();
            res.json({
                imported,
                updated,
                skipped,
                errors: dataRows.length - imported - updated - skipped,
                total: dataRows.length,
                colMap: { code: colCode, name: colName, company: colCompany, phone: colPhone, email: colEmail, address: colAddress, fiscal_id: colFiscal, ice: colIce },
                headers,
            });
        }
        finally {
            conn.release();
        }
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'importation: ' + (err.message || String(err)) });
    }
});
exports.default = router;
//# sourceMappingURL=suppliers.js.map