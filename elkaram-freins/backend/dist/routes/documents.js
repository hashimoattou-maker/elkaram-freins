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
async function getNextDocNumber(type) {
    const prefixMap = {
        devis: 'DEV', commande_client: 'CC', bon_livraison: 'BL',
        facture_vente: 'FV', avoir_vente: 'AV', bon_commande: 'BC',
        bon_achat: 'BA', facture_achat: 'FA', avoir_achat: 'AA',
    };
    const prefix = prefixMap[type] || 'DOC';
    const year = new Date().getFullYear();
    const [rows] = await database_1.default.execute("SELECT doc_number FROM documents WHERE doc_type = ? AND doc_number LIKE ? ORDER BY doc_number DESC LIMIT 1", [type, `${prefix}-${year}-%`]);
    let nextNum = 1;
    if (rows.length > 0) {
        const parts = rows[0].doc_number.split('-');
        nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
}
async function updateStockForDocument(doc, lines, movementType) {
    for (const line of lines) {
        if (!line.product_id)
            continue;
        const [productRows] = await database_1.default.execute('SELECT stock FROM products WHERE id = ?', [line.product_id]);
        if (productRows.length === 0)
            continue;
        const qty = movementType === 'sortie' ? -line.quantity : line.quantity;
        await database_1.default.execute("UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?", [qty, line.product_id]);
        await database_1.default.execute(`INSERT INTO stock_movements (id, product_id, document_id, movement_type, quantity, unit_price, reference, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, helpers_1.generateId)(), line.product_id, doc.id, movementType === 'entrée' ? 'entrée' : 'sortie',
            line.quantity, line.unit_price, doc.doc_number, `Document: ${doc.doc_number}`, doc.validated_by]);
    }
}
function mapDoc(d) {
    if (!d)
        return d;
    const discount = d.discount_percent && Number(d.discount_percent) > 0 ? Number(d.discount_percent) : Number(d.discount_amount || 0);
    const discountType = d.discount_percent && Number(d.discount_percent) > 0 ? 'percentage' : 'fixed';
    return {
        id: d.id,
        docNumber: d.doc_number,
        docType: d.doc_type,
        date: d.date,
        dueDate: d.due_date,
        status: d.status,
        clientId: d.client_id,
        clientName: d.client_name,
        client: d.client_name ? { id: d.client_id, name: d.client_name, code: d.client_code, phone: d.client_phone, email: d.client_email, address: d.client_address, fiscalId: d.client_fiscal_id } : undefined,
        supplierId: d.supplier_id,
        supplierName: d.supplier_name,
        supplier: d.supplier_name ? { id: d.supplier_id, name: d.supplier_name, code: d.supplier_code } : undefined,
        matricule: d.matricule || '',
        subtotal: Number(d.subtotal || 0),
        taxRate: Number(d.tax_rate || 0),
        taxAmount: Number(d.tax_amount || 0),
        discount,
        discountType,
        shipping: Number(d.shipping_cost || 0),
        total: Number(d.total || 0),
        paidAmount: Number(d.paid_amount || 0),
        notes: d.notes,
        terms: d.terms_conditions,
        convertedFromId: d.converted_from_id,
        convertedToId: d.converted_to_id,
        designId: d.design_id,
        createdBy: d.created_by,
        createdByName: d.created_by_name,
        validatedBy: d.validated_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
    };
}
function mapLine(l) {
    if (!l)
        return l;
    const qty = Number(l.quantity || 0);
    const price = Number(l.unit_price || 0);
    const tax = Number(l.tax_rate || 0);
    const disc = Number(l.discount_percent || 0);
    const totalHt = Number(l.total_ht) || (qty * price - disc);
    const totalTtc = Number(l.total_ttc) || (totalHt * (1 + tax / 100));
    return {
        id: l.id,
        documentId: l.document_id,
        productId: l.product_id,
        productReference: l.product_reference,
        productName: l.product_name,
        lineNumber: l.line_number,
        description: l.description,
        quantity: qty,
        unit: l.unit,
        unitPrice: price,
        taxRate: tax,
        discountPercent: disc,
        discount: Number(l.discount_amount || 0),
        totalHt,
        totalTtc,
        total: totalHt,
        taxAmount: totalTtc - totalHt,
    };
}
function mapLineRequest(l) {
    return {
        product_id: l.productId || l.product_id || null,
        description: l.description || '',
        quantity: l.quantity || 1,
        unit: l.unit || 'piece',
        unit_price: l.unitPrice ?? l.unit_price ?? 0,
        tax_rate: l.taxRate ?? l.tax_rate ?? 0,
        discount_percent: l.discountPercent ?? l.discount_percent ?? 0,
        discount_amount: l.discount ?? l.discount_amount ?? 0,
        total_ht: l.totalHt ?? l.total_ht ?? null,
        total_ttc: l.totalTtc ?? l.total_ttc ?? null,
    };
}
router.get('/', async (req, res) => {
    try {
        const { doc_type, docType, status, client_id, clientId, supplier_id, supplierId, date_from, date_to, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        let where = 'WHERE 1=1';
        const params = [];
        const docTypeFilter = (doc_type || docType);
        const clientIdFilter = (client_id || clientId);
        const supplierIdFilter = (supplier_id || supplierId);
        if (docTypeFilter) {
            where += ' AND d.doc_type = ?';
            params.push(docTypeFilter);
        }
        if (status) {
            where += ' AND d.status = ?';
            params.push(status);
        }
        if (clientIdFilter) {
            where += ' AND d.client_id = ?';
            params.push(clientIdFilter);
        }
        if (supplierIdFilter) {
            where += ' AND d.supplier_id = ?';
            params.push(supplierIdFilter);
        }
        if (date_from) {
            where += ' AND d.date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            where += ' AND d.date <= ?';
            params.push(date_to);
        }
        const [countRows] = await database_1.default.execute(`SELECT COUNT(*) as count FROM documents d ${where}`, params);
        const [documents] = await database_1.default.execute(`
      SELECT d.*, c.name as client_name, s.name as supplier_name, u.full_name as created_by_name
      FROM documents d
      LEFT JOIN clients c ON c.id = d.client_id
      LEFT JOIN suppliers s ON s.id = d.supplier_id
      LEFT JOIN users u ON u.id = d.created_by
      ${where}
      ORDER BY d.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params);
        res.json({
            data: documents.map(mapDoc),
            total: countRows[0].count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(countRows[0].count / limitNum),
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const [docRows] = await database_1.default.execute(`
      SELECT d.*, c.name as client_name, c.code as client_code, c.phone as client_phone, c.email as client_email, c.address as client_address,
             s.name as supplier_name, s.code as supplier_code, u.full_name as created_by_name
      FROM documents d
      LEFT JOIN clients c ON c.id = d.client_id
      LEFT JOIN suppliers s ON s.id = d.supplier_id
      LEFT JOIN users u ON u.id = d.created_by
      WHERE d.id = ?
    `, [req.params.id]);
        if (docRows.length === 0) {
            res.status(404).json({ error: 'Document non trouvé' });
            return;
        }
        const doc = docRows[0];
        const [lines] = await database_1.default.execute(`
      SELECT dl.*, p.reference as product_reference, p.name as product_name
      FROM document_lines dl
      LEFT JOIN products p ON p.id = dl.product_id
      WHERE dl.document_id = ?
      ORDER BY dl.line_number
    `, [req.params.id]);
        const [companyRows] = await database_1.default.execute('SELECT * FROM company_settings WHERE id = 1');
        res.json({ ...mapDoc(doc), lines: lines.map(mapLine), company: companyRows[0] });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du document' });
    }
});
router.post('/', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        const { docType, date, dueDate, clientId, supplierId, matricule, taxRate, discount, discountType, shipping, notes, terms, lines: rawLines, designId } = req.body;
        if (!docType || !rawLines || !Array.isArray(rawLines) || rawLines.length === 0) {
            res.status(400).json({ error: 'Type de document et lignes sont requis' });
            return;
        }
        const docNumber = await getNextDocNumber(docType);
        const id = (0, helpers_1.generateId)();
        const lines = rawLines.map(mapLineRequest);
        const computed = (0, helpers_1.calculateTotals)(lines);
        const discountPercent = discountType === 'percentage' ? (discount || 0) : 0;
        const discountAmount = discountType === 'fixed' ? (discount || 0) : 0;
        const finalDiscountAmount = discountType === 'fixed' ? discountAmount : ((discountPercent || 0) / 100) * computed.subtotal;
        const taxable = computed.subtotal - finalDiscountAmount;
        const taxAmount = taxable * ((taxRate || 0) / 100);
        const finalTotal = taxable + taxAmount + (shipping || 0);
        await conn.beginTransaction();
        await conn.execute(`
      INSERT INTO documents (id, doc_number, doc_type, date, due_date, status, client_id, supplier_id, matricule, subtotal, tax_rate, tax_amount, discount_percent, discount_amount, shipping_cost, total, notes, terms_conditions, design_id, created_by)
      VALUES (?, ?, ?, ?, ?, 'brouillon', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, docNumber, docType, date || new Date().toISOString(), dueDate || null,
            clientId || null, supplierId || null, matricule || '',
            computed.subtotal, taxRate || 0, Math.round(taxAmount * 100) / 100, discountPercent, discountAmount,
            shipping || 0, Math.round(finalTotal * 100) / 100, notes || '', terms || '', designId || null, req.user.id
        ]);
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const lineId = (0, helpers_1.generateId)();
            const qty = line.quantity || 1;
            const price = line.unit_price || 0;
            const lineTax = line.tax_rate || 0;
            const lineDisc = line.discount_percent || 0;
            const lineTotalHt = qty * price - lineDisc;
            const lineTotalTtc = lineTotalHt * (1 + lineTax / 100);
            await conn.execute(`
        INSERT INTO document_lines (id, document_id, product_id, line_number, description, quantity, unit, unit_price, tax_rate, discount_percent, total_ht, total_ttc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [lineId, id, line.product_id || null, index + 1,
                line.description || '', qty, 'piece', price, lineTax, lineDisc,
                Math.round(lineTotalHt * 100) / 100, Math.round(lineTotalTtc * 100) / 100
            ]);
        }
        await conn.commit();
        const [docResult] = await database_1.default.execute(`
      SELECT d.*, c.name as client_name, s.name as supplier_name
      FROM documents d LEFT JOIN clients c ON c.id = d.client_id LEFT JOIN suppliers s ON s.id = d.supplier_id
      WHERE d.id = ?
    `, [id]);
        const [docLines] = await database_1.default.execute('SELECT * FROM document_lines WHERE document_id = ? ORDER BY line_number', [id]);
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'create', 'document', id, `Création document ${docNumber}`]);
        res.status(201).json({ ...mapDoc(docResult[0]), lines: docLines.map(mapLine) });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de la création du document' });
    }
    finally {
        conn.release();
    }
});
router.put('/:id', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        const [existingRows] = await conn.execute('SELECT id, status FROM documents WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Document non trouvé' });
            return;
        }
        const existing = existingRows[0];
        if (existing.status !== 'brouillon') {
            res.status(400).json({ error: 'Seuls les documents en brouillon peuvent être modifiés' });
            return;
        }
        const { date, dueDate, clientId, supplierId, matricule, taxRate, discount, discountType, shipping, notes, terms, lines: rawLines, designId } = req.body;
        if (rawLines && Array.isArray(rawLines) && rawLines.length > 0) {
            const lines = rawLines.map(mapLineRequest);
            const computed = (0, helpers_1.calculateTotals)(lines);
            const discountPercent = discountType === 'percentage' ? (discount || 0) : 0;
            const discountAmount = discountType === 'fixed' ? (discount || 0) : 0;
            const finalDiscountAmount = discountType === 'fixed' ? discountAmount : ((discountPercent || 0) / 100) * computed.subtotal;
            const taxable = computed.subtotal - finalDiscountAmount;
            const taxAmount = taxable * ((taxRate || 0) / 100);
            const finalTotal = taxable + taxAmount + (shipping || 0);
            await conn.beginTransaction();
            await conn.execute(`
        UPDATE documents SET date = ?, due_date = ?, client_id = ?, supplier_id = ?, subtotal = ?, tax_rate = ?, tax_amount = ?, discount_percent = ?, discount_amount = ?, shipping_cost = ?, total = ?, notes = ?, terms_conditions = ?, design_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [date || existing.date, dueDate || null, clientId || null, supplierId || null,
                computed.subtotal, taxRate || 0, Math.round(taxAmount * 100) / 100, discountPercent, discountAmount,
                shipping || 0, Math.round(finalTotal * 100) / 100, notes || '', terms || '', designId || null, id
            ]);
            await conn.execute('DELETE FROM document_lines WHERE document_id = ?', [id]);
            for (let index = 0; index < lines.length; index++) {
                const line = lines[index];
                const lineId = (0, helpers_1.generateId)();
                const qty = line.quantity || 1;
                const price = line.unit_price || 0;
                const lineTax = line.tax_rate || 0;
                const lineDisc = line.discount_percent || 0;
                const lineTotalHt = qty * price - lineDisc;
                const lineTotalTtc = lineTotalHt * (1 + lineTax / 100);
                await conn.execute(`
          INSERT INTO document_lines (id, document_id, product_id, line_number, description, quantity, unit, unit_price, tax_rate, discount_percent, total_ht, total_ttc)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [lineId, id, line.product_id || null, index + 1, line.description || '', qty, 'piece', price, lineTax, lineDisc,
                    Math.round(lineTotalHt * 100) / 100, Math.round(lineTotalTtc * 100) / 100
                ]);
            }
            await conn.commit();
        }
        else {
            const updates = [];
            const params = [];
            if (date) {
                updates.push('date = ?');
                params.push(date);
            }
            if (dueDate !== undefined) {
                updates.push('due_date = ?');
                params.push(dueDate);
            }
            if (clientId !== undefined) {
                updates.push('client_id = ?');
                params.push(clientId);
            }
            if (supplierId !== undefined) {
                updates.push('supplier_id = ?');
                params.push(supplierId);
            }
            if (matricule !== undefined) {
                updates.push('matricule = ?');
                params.push(matricule);
            }
            if (notes !== undefined) {
                updates.push('notes = ?');
                params.push(notes);
            }
            if (terms !== undefined) {
                updates.push('terms_conditions = ?');
                params.push(terms);
            }
            if (designId !== undefined) {
                updates.push('design_id = ?');
                params.push(designId);
            }
            updates.push('updated_at = NOW()');
            params.push(id);
            await database_1.default.execute(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        const [docRows] = await database_1.default.execute('SELECT * FROM documents WHERE id = ?', [id]);
        const [docLines] = await database_1.default.execute('SELECT * FROM document_lines WHERE document_id = ? ORDER BY line_number', [id]);
        res.json({ ...mapDoc(docRows[0]), lines: docLines.map(mapLine) });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de la mise à jour du document' });
    }
    finally {
        conn.release();
    }
});
router.delete('/:id', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const [existingRows] = await database_1.default.execute('SELECT id, status FROM documents WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            res.status(404).json({ error: 'Document non trouvé' });
            return;
        }
        if (existingRows[0].status === 'annulé') {
            res.status(400).json({ error: 'Le document est déjà annulé' });
            return;
        }
        await database_1.default.execute("UPDATE documents SET status = 'annulé', updated_at = NOW() WHERE id = ?", [id]);
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'cancel', 'document', id, 'Annulation de document']);
        res.json({ message: 'Document annulé avec succès' });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'annulation du document' });
    }
});
router.post('/:id/validate', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        const [docRows] = await conn.execute('SELECT * FROM documents WHERE id = ?', [id]);
        if (docRows.length === 0) {
            res.status(404).json({ error: 'Document non trouvé' });
            return;
        }
        const doc = docRows[0];
        if (doc.status !== 'brouillon') {
            res.status(400).json({ error: 'Seuls les documents en brouillon peuvent être validés' });
            return;
        }
        const [lines] = await conn.execute('SELECT * FROM document_lines WHERE document_id = ?', [id]);
        const saleDocs = ['facture_vente', 'bon_livraison', 'commande_client', 'avoir_achat'];
        const purchaseDocs = ['bon_achat', 'facture_achat', 'bon_commande', 'avoir_vente'];
        let movementType = 'sortie';
        if (purchaseDocs.includes(doc.doc_type)) {
            movementType = 'entrée';
        }
        else if (doc.doc_type === 'avoir_vente') {
            movementType = 'entrée';
        }
        else if (doc.doc_type === 'avoir_achat') {
            movementType = 'sortie';
        }
        await conn.beginTransaction();
        await conn.execute("UPDATE documents SET status = 'confirmé', validated_by = ?, updated_at = NOW() WHERE id = ?", [req.user.id, id]);
        doc.validated_by = req.user.id;
        for (const line of lines) {
            if (!line.product_id)
                continue;
            const qty = movementType === 'sortie' ? -line.quantity : line.quantity;
            await conn.execute("UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?", [qty, line.product_id]);
            await conn.execute(`INSERT INTO stock_movements (id, product_id, document_id, movement_type, quantity, unit_price, reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, helpers_1.generateId)(), line.product_id, doc.id, movementType === 'entrée' ? 'entrée' : 'sortie', line.quantity, line.unit_price, doc.doc_number, `Document: ${doc.doc_number}`, req.user.id]);
        }
        if (doc.client_id) {
            const [balRows] = await conn.execute("SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as bal FROM documents WHERE client_id = ? AND status = 'confirmé'", [doc.client_id]);
            await conn.execute("UPDATE clients SET balance = ?, updated_at = NOW() WHERE id = ?", [Number(balRows[0].bal || 0), doc.client_id]);
        }
        if (doc.supplier_id) {
            const [balRows] = await conn.execute("SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as bal FROM documents WHERE supplier_id = ? AND status = 'confirmé'", [doc.supplier_id]);
            await conn.execute("UPDATE suppliers SET balance = ?, updated_at = NOW() WHERE id = ?", [Number(balRows[0].bal || 0), doc.supplier_id]);
        }
        await conn.commit();
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'validate', 'document', id, `Validation document ${doc.doc_number}`]);
        res.json({ message: 'Document validé avec succès', doc_number: doc.doc_number });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de la validation du document' });
    }
    finally {
        conn.release();
    }
});
router.post('/:id/convert', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    const conn = await database_1.default.getConnection();
    try {
        const { id } = req.params;
        const { target_type, targetType } = req.body;
        const targetTypeValue = targetType || target_type;
        if (!targetTypeValue) {
            res.status(400).json({ error: 'Type de document cible requis' });
            return;
        }
        const [sourceDocRows] = await conn.execute('SELECT * FROM documents WHERE id = ?', [id]);
        if (sourceDocRows.length === 0) {
            res.status(404).json({ error: 'Document source non trouvé' });
            return;
        }
        const sourceDoc = sourceDocRows[0];
        const [sourceLines] = await conn.execute('SELECT * FROM document_lines WHERE document_id = ? ORDER BY line_number', [id]);
        const newDocNumber = await getNextDocNumber(targetTypeValue);
        const newId = (0, helpers_1.generateId)();
        const computed = (0, helpers_1.calculateTotals)(sourceLines);
        await conn.beginTransaction();
        await conn.execute(`
      INSERT INTO documents (id, doc_number, doc_type, date, due_date, status, client_id, supplier_id, company_name, company_address, company_fiscal_id, contact_name, contact_phone, contact_email, subtotal, tax_rate, tax_amount, discount_percent, discount_amount, shipping_cost, total, notes, terms_conditions, converted_from_id, design_id, created_by)
      VALUES (?, ?, ?, ?, ?, 'brouillon', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, newDocNumber, targetTypeValue, new Date().toISOString(), sourceDoc.due_date,
            sourceDoc.client_id, sourceDoc.supplier_id, sourceDoc.company_name, sourceDoc.company_address,
            sourceDoc.company_fiscal_id, sourceDoc.contact_name, sourceDoc.contact_phone, sourceDoc.contact_email,
            computed.subtotal, sourceDoc.tax_rate, computed.tax_amount, sourceDoc.discount_percent,
            sourceDoc.discount_amount, sourceDoc.shipping_cost, Math.round((computed.total + (sourceDoc.shipping_cost || 0) - (sourceDoc.discount_amount || 0)) * 100) / 100,
            sourceDoc.notes, sourceDoc.terms_conditions, id, sourceDoc.design_id, req.user.id
        ]);
        for (let index = 0; index < sourceLines.length; index++) {
            const line = sourceLines[index];
            await conn.execute(`
        INSERT INTO document_lines (id, document_id, product_id, line_number, description, quantity, unit, unit_price, tax_rate, discount_percent, total_ht, total_ttc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [(0, helpers_1.generateId)(), newId, line.product_id, index + 1, line.description,
                line.quantity, line.unit, line.unit_price, line.tax_rate, line.discount_percent, line.total_ht, line.total_ttc
            ]);
        }
        await conn.execute("UPDATE documents SET status = 'converti', converted_to_id = ?, updated_at = NOW() WHERE id = ?", [newId, id]);
        await conn.commit();
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'convert', 'document', id, `Conversion de ${sourceDoc.doc_number} vers ${newDocNumber}`]);
        const [newDocRows] = await database_1.default.execute('SELECT * FROM documents WHERE id = ?', [newId]);
        const [newLines] = await database_1.default.execute('SELECT * FROM document_lines WHERE document_id = ? ORDER BY line_number', [newId]);
        res.status(201).json({ ...mapDoc(newDocRows[0]), lines: newLines.map(mapLine) });
    }
    catch (err) {
        await conn.rollback();
        res.status(500).json({ error: 'Erreur lors de la conversion du document' });
    }
    finally {
        conn.release();
    }
});
router.get('/:id/pdf', async (req, res) => {
    try {
        const [docRows] = await database_1.default.execute(`
      SELECT d.*, c.name as client_name, c.code as client_code, c.phone as client_phone, c.email as client_email, c.address as client_address, c.fiscal_id as client_fiscal_id,
             u.full_name as created_by_name
      FROM documents d
      LEFT JOIN clients c ON c.id = d.client_id
      LEFT JOIN users u ON u.id = d.created_by
      WHERE d.id = ?
    `, [req.params.id]);
        if (docRows.length === 0) {
            res.status(404).json({ error: 'Document non trouvé' });
            return;
        }
        const doc = docRows[0];
        const [lines] = await database_1.default.execute(`
      SELECT dl.*, p.reference as product_reference, p.name as product_name
      FROM document_lines dl LEFT JOIN products p ON p.id = dl.product_id
      WHERE dl.document_id = ? ORDER BY dl.line_number
    `, [req.params.id]);
        const [companyRows] = await database_1.default.execute('SELECT * FROM company_settings WHERE id = 1');
        let design = null;
        if (doc.design_id) {
            const [designRows] = await database_1.default.execute('SELECT * FROM document_designs WHERE id = ?', [doc.design_id]);
            design = designRows[0] || null;
        }
        res.json({
            document: mapDoc(doc),
            lines: lines.map(mapLine),
            company: companyRows[0],
            design
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});
router.post('/:id/payment', (0, auth_1.requireRole)('admin', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Montant de paiement invalide' });
            return;
        }
        const [docRows] = await database_1.default.execute('SELECT * FROM documents WHERE id = ?', [id]);
        if (docRows.length === 0) {
            res.status(404).json({ error: 'Document non trouvé' });
            return;
        }
        const doc = docRows[0];
        if (doc.status !== 'confirmé') {
            res.status(400).json({ error: 'Seuls les documents confirmés peuvent être payés' });
            return;
        }
        const newPaid = Number(doc.paid_amount || 0) + Number(amount);
        if (newPaid > Number(doc.total)) {
            res.status(400).json({ error: 'Le montant payé dépasse le total du document' });
            return;
        }
        await database_1.default.execute("UPDATE documents SET paid_amount = ?, updated_at = NOW() WHERE id = ?", [newPaid, id]);
        if (doc.client_id) {
            const [balRows] = await database_1.default.execute("SELECT COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as bal FROM documents WHERE client_id = ? AND status = 'confirmé'", [doc.client_id]);
            await database_1.default.execute("UPDATE clients SET balance = ?, updated_at = NOW() WHERE id = ?", [Number(balRows[0].bal || 0), doc.client_id]);
        }
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [req.user.id, 'payment', 'document', id, `Paiement de ${amount} DA sur ${doc.doc_number}`]);
        res.json({ message: 'Paiement enregistré', paid_amount: newPaid, remaining: Number(doc.total) - newPaid });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'enregistrement du paiement' });
    }
});
exports.default = router;
//# sourceMappingURL=documents.js.map