import pool from './index';
import { generateId } from '../utils/helpers';

async function seed() {
  const [catCount] = await pool.execute('SELECT COUNT(*) as count FROM categories') as any;
  if (catCount[0].count > 0) {
    console.log('Database already seeded.');
    process.exit(0);
  }

  console.log('Seeding database...');

  await pool.execute('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [generateId(), 'Freins', 'Systèmes et pièces de freinage']);
  await pool.execute('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)', [generateId(), 'Embrayage', 'Systèmes et pièces d\'embrayage']);
  console.log('  Categories created.');

  const [catFreinsRows] = await pool.execute("SELECT id FROM categories WHERE name = 'Freins'") as any;
  const [catEmbrayageRows] = await pool.execute("SELECT id FROM categories WHERE name = 'Embrayage'") as any;
  const catFreins = catFreinsRows[0]?.id;
  const catEmbrayage = catEmbrayageRows[0]?.id;

  const products = [
    [generateId(), 'FR-001', 'Plaquette de frein avant', 'Plaquette de frein avant pour véhicules légers', catFreins, '2001234567890', 1500, 2800, 2200, 50, 10, 'jeu'],
    [generateId(), 'FR-002', 'Disque de frein', 'Disque de frein ventilé diamètre 280mm', catFreins, '2001234567891', 3500, 5800, 4800, 20, 5, 'pièce'],
    [generateId(), 'FR-003', 'Kit d\'embrayage complet', 'Kit embrayage complet avec butée', catEmbrayage, '2001234567892', 12000, 18500, 15000, 10, 3, 'kit'],
    [generateId(), 'FR-004', 'Câble d\'embrayage', 'Câble d\'embrayage universel', catEmbrayage, '2001234567893', 800, 1500, 1200, 100, 20, 'pièce'],
    [generateId(), 'FR-005', 'Maître-cylindre de frein', 'Maître-cylindre de frein double circuit', catFreins, '2001234567894', 4500, 7500, 6000, 15, 5, 'pièce'],
  ];
  for (const p of products) {
    await pool.execute(
      'INSERT INTO products (id, reference, name, description, category_id, barcode, purchase_price, selling_price, wholesale_price, stock, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      p
    );
  }
  console.log('  Products created.');

  const clients = [
    [generateId(), 'CLT-001', 'Ahmed Benali', 'Garage Benali', '15 Rue Didouche Mourad, Alger', '0550 12 34 56', 'benali@email.dz', '1990123456789'],
    [generateId(), 'CLT-002', 'Karim Ouali', 'SARL Ouali Transport', 'Zone Industrielle Oued Smar, Alger', '0551 23 45 67', 'ouali@email.dz', '1991123456789'],
    [generateId(), 'CLT-003', 'Société Auto Plus', 'Auto Plus Algérie', 'Route de Baraki, Birkhadem', '0552 34 56 78', 'contact@autoplus.dz', '1992123456789'],
  ];
  for (const c of clients) {
    await pool.execute(
      'INSERT INTO clients (id, code, name, company, address, phone, email, fiscal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      c
    );
  }
  console.log('  Clients created.');

  const suppliers = [
    [generateId(), 'FRN-001', 'Brembo Algérie', 'Brembo SPA', 'Route de l\'Arbaa, Eucalyptus', '023 45 67 89', 'contact@brembo.dz', '0990123456789'],
    [generateId(), 'FRN-002', 'Valeo Algérie', 'Valeo Algeria', 'Zone Industrielle Rouiba', '023 56 78 90', 'info@valeo.dz', '0991123456789'],
  ];
  for (const s of suppliers) {
    await pool.execute(
      'INSERT INTO suppliers (id, code, name, company, address, phone, email, fiscal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      s
    );
  }
  console.log('  Suppliers created.');

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
