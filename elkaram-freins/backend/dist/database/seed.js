"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const helpers_1 = require("../utils/helpers");
async function seed() {
    const [catCount] = await index_1.default.execute('SELECT COUNT(*) as count FROM categories');
    if (catCount[0].count > 0) {
        console.log('Database already seeded.');
        process.exit(0);
    }
    console.log('Seeding database...');
    await index_1.default.execute('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [(0, helpers_1.generateId)(), 'Freins', 'Systèmes et pièces de freinage']);
    await index_1.default.execute('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [(0, helpers_1.generateId)(), 'Embrayage', 'Systèmes et pièces d\'embrayage']);
    console.log('  Categories created.');
    const [catFreinsRows] = await index_1.default.execute("SELECT id FROM categories WHERE name = 'Freins'");
    const [catEmbrayageRows] = await index_1.default.execute("SELECT id FROM categories WHERE name = 'Embrayage'");
    const catFreins = catFreinsRows[0]?.id;
    const catEmbrayage = catEmbrayageRows[0]?.id;
    const products = [
        [(0, helpers_1.generateId)(), 'FR-001', 'Plaquette de frein avant', 'Plaquette de frein avant pour véhicules légers', catFreins, '2001234567890', 1500, 2800, 2200, 50, 10, 'jeu'],
        [(0, helpers_1.generateId)(), 'FR-002', 'Disque de frein', 'Disque de frein ventilé diamètre 280mm', catFreins, '2001234567891', 3500, 5800, 4800, 20, 5, 'pièce'],
        [(0, helpers_1.generateId)(), 'FR-003', 'Kit d\'embrayage complet', 'Kit embrayage complet avec butée', catEmbrayage, '2001234567892', 12000, 18500, 15000, 10, 3, 'kit'],
        [(0, helpers_1.generateId)(), 'FR-004', 'Câble d\'embrayage', 'Câble d\'embrayage universel', catEmbrayage, '2001234567893', 800, 1500, 1200, 100, 20, 'pièce'],
        [(0, helpers_1.generateId)(), 'FR-005', 'Maître-cylindre de frein', 'Maître-cylindre de frein double circuit', catFreins, '2001234567894', 4500, 7500, 6000, 15, 5, 'pièce'],
    ];
    for (const p of products) {
        await index_1.default.execute('INSERT INTO products (id, reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', p);
    }
    console.log('  Products created.');
    const clients = [
        [(0, helpers_1.generateId)(), 'CLT-001', 'Ahmed Benali', 'Garage Benali', '15 Rue Didouche Mourad, Alger', '0550 12 34 56', 'benali@email.dz', '1990123456789'],
        [(0, helpers_1.generateId)(), 'CLT-002', 'Karim Ouali', 'SARL Ouali Transport', 'Zone Industrielle Oued Smar, Alger', '0551 23 45 67', 'ouali@email.dz', '1991123456789'],
        [(0, helpers_1.generateId)(), 'CLT-003', 'Société Auto Plus', 'Auto Plus Algérie', 'Route de Baraki, Birkhadem', '0552 34 56 78', 'contact@autoplus.dz', '1992123456789'],
    ];
    for (const c of clients) {
        await index_1.default.execute('INSERT INTO clients (id, code, name, company, address, phone, email, fiscal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', c);
    }
    console.log('  Clients created.');
    const suppliers = [
        [(0, helpers_1.generateId)(), 'FRN-001', 'Brembo Algérie', 'Brembo SPA', 'Route de l\'Arbaa, Eucalyptus', '023 45 67 89', 'contact@brembo.dz', '0990123456789'],
        [(0, helpers_1.generateId)(), 'FRN-002', 'Valeo Algérie', 'Valeo Algeria', 'Zone Industrielle Rouiba', '023 56 78 90', 'info@valeo.dz', '0991123456789'],
    ];
    for (const s of suppliers) {
        await index_1.default.execute('INSERT INTO suppliers (id, code, name, company, address, phone, email, fiscal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', s);
    }
    console.log('  Suppliers created.');
    console.log('Seeding complete!');
    process.exit(0);
}
seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map