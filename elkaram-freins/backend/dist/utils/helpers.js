"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocNumber = generateDocNumber;
exports.generateBarcode = generateBarcode;
exports.calculateTotals = calculateTotals;
exports.formatCurrency = formatCurrency;
exports.generateId = generateId;
exports.nowISO = nowISO;
const uuid_1 = require("uuid");
const docPrefixes = {
    devis: 'DEV',
    commande_client: 'CC',
    bon_livraison: 'BL',
    facture_vente: 'FV',
    avoir_vente: 'AV',
    bon_commande: 'BC',
    bon_achat: 'BA',
    facture_achat: 'FA',
    avoir_achat: 'AA',
};
function generateDocNumber(type) {
    const prefix = docPrefixes[type] || 'DOC';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${year}-${random}`;
}
function generateBarcode() {
    const random = Math.floor(Math.random() * 1000000000000);
    const code = random.toString().padStart(12, '0');
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return code + check;
}
function calculateTotals(lines) {
    let subtotal = 0;
    let totalTax = 0;
    for (const line of lines) {
        const lineTotal = line.quantity * line.unit_price;
        const discount = (line.discount_percent || 0) / 100;
        const lineAfterDiscount = lineTotal * (1 - discount);
        const tax = (line.tax_rate || 0) / 100;
        const taxAmount = lineAfterDiscount * tax;
        subtotal += lineAfterDiscount;
        totalTax += taxAmount;
    }
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: Math.round(totalTax * 100) / 100,
        total: Math.round((subtotal + totalTax) * 100) / 100,
    };
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
function generateId() {
    return (0, uuid_1.v4)();
}
function nowISO() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}
//# sourceMappingURL=helpers.js.map