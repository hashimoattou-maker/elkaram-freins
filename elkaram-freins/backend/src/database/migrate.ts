import type { Pool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

export async function migrate(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // Users
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('admin','user','viewer') NOT NULL DEFAULT 'user',
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Company settings
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id INT PRIMARY KEY CHECK(id = 1),
        company_name VARCHAR(255) NOT NULL DEFAULT 'EL Karam Freins SARL',
        address TEXT,
        phone VARCHAR(255),
        email VARCHAR(255),
        website VARCHAR(255),
        fiscal_id VARCHAR(255),
        ice VARCHAR(255),
        logo_path VARCHAR(255),
        logo_width INT DEFAULT 150,
        logo_height INT DEFAULT 60,
        currency VARCHAR(10) DEFAULT 'MAD',
        tax_rate DECIMAL(5,2) DEFAULT 20.0,
        default_document_design VARCHAR(255) DEFAULT 'classic',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Document columns
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS document_columns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_type VARCHAR(255) NOT NULL,
        column_name VARCHAR(255) NOT NULL,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE(document_type, column_name)
      )
    `);

    // Document designs
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS document_designs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        primary_color VARCHAR(20) DEFAULT '#1e40af',
        secondary_color VARCHAR(20) DEFAULT '#f59e0b',
        font_family VARCHAR(50) DEFAULT 'Inter',
        show_logo TINYINT(1) DEFAULT 1,
        show_borders TINYINT(1) DEFAULT 1,
        header_style VARCHAR(50) DEFAULT 'modern',
        is_default TINYINT(1) DEFAULT 0
      )
    `);

    // Categories
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        reference VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id VARCHAR(36),
        barcode VARCHAR(255) UNIQUE,
        purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        wholesale_price DECIMAL(10,2) DEFAULT 0,
        stock INT NOT NULL DEFAULT 0,
        min_stock INT DEFAULT 5,
        unit VARCHAR(50) DEFAULT 'piece',
        active TINYINT(1) NOT NULL DEFAULT 1,
        image_path VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Clients
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        address TEXT,
        phone VARCHAR(255),
        email VARCHAR(255),
        fiscal_id VARCHAR(255),
        ice VARCHAR(255),
        commercial_id VARCHAR(255),
        article_id VARCHAR(255),
        credit_limit DECIMAL(10,2) DEFAULT 0,
        balance DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Suppliers
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        address TEXT,
        phone VARCHAR(255),
        email VARCHAR(255),
        fiscal_id VARCHAR(255),
        balance DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        doc_number VARCHAR(255) NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        due_date DATE,
        status ENUM('brouillon','confirmé','annulé','converti') NOT NULL DEFAULT 'brouillon',
        client_id VARCHAR(36),
        supplier_id VARCHAR(36),
        company_name VARCHAR(255),
        company_address TEXT,
        company_fiscal_id VARCHAR(255),
        contact_name VARCHAR(255),
        contact_phone VARCHAR(255),
        contact_email VARCHAR(255),
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_percent DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        terms_conditions TEXT,
        converted_from_id VARCHAR(36),
        converted_to_id VARCHAR(36),
        design_id INT,
        created_by VARCHAR(36),
        validated_by VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (converted_from_id) REFERENCES documents(id),
        FOREIGN KEY (design_id) REFERENCES document_designs(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Document lines
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS document_lines (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36),
        line_number INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        unit VARCHAR(50) DEFAULT 'piece',
        unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        discount_percent DECIMAL(10,2) DEFAULT 0,
        total_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Stock movements
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        document_id VARCHAR(36),
        movement_type ENUM('entrée','sortie','ajustement') NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) DEFAULT 0,
        reference VARCHAR(255),
        notes TEXT,
        created_by VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )
    `);

    // Audit log
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255),
        entity_id VARCHAR(255),
        details TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)',
      'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type)',
      'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)',
      'CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_supplier ON documents(supplier_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date)',
      'CREATE INDEX IF NOT EXISTS idx_document_lines_document ON document_lines(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type)',
      'CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active)',
      'CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active)',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)',
    ];
    for (const idx of indexes) {
      try { await conn.execute(idx); } catch { /* index may already exist */ }
    }

    try { await conn.execute("ALTER TABLE documents ADD COLUMN matricule VARCHAR(255) DEFAULT '' AFTER supplier_id"); } catch { /* column may already exist */ }

    // Seed default admin user
    const [userRows] = await conn.execute('SELECT COUNT(*) as count FROM users') as any;
    if (userRows[0].count === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await conn.execute(
        'INSERT IGNORE INTO users (id, username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['u-admin', 'admin', 'admin@elkaram.dz', hashedPassword, 'Administrateur', 'admin']
      );
    }

    // Seed default designs
    const [designRows] = await conn.execute('SELECT COUNT(*) as count FROM document_designs') as any;
    if (designRows[0].count === 0) {
      const designs = [
        ['classique', '#1e40af', '#f59e0b', 'Inter', 'classic', 1],
        ['moderne', '#0f766e', '#14b8a6', 'Inter', 'modern', 0],
        ['professionnel', '#374151', '#3b82f6', 'Roboto', 'professional', 0],
        ['minimaliste', '#6b7280', '#9ca3af', 'Inter', 'minimal', 0],
      ];
      for (const d of designs) {
        await conn.execute(
          'INSERT IGNORE INTO document_designs (name, primary_color, secondary_color, font_family, header_style, is_default) VALUES (?, ?, ?, ?, ?, ?)',
          d
        );
      }
    }

    // Seed default company settings
    const [settingsRows] = await conn.execute('SELECT COUNT(*) as count FROM company_settings') as any;
    if (settingsRows[0].count === 0) {
      await conn.execute(
        'INSERT IGNORE INTO company_settings (id, company_name, currency, tax_rate) VALUES (?, ?, ?, ?)',
        [1, 'EL Karam Freins SARL', 'MAD', 20.0]
      );
    }

    // Seed default document columns
    const [colRows] = await conn.execute('SELECT COUNT(*) as count FROM document_columns') as any;
    if (colRows[0].count === 0) {
      const docTypes = [
        'devis', 'commande_client', 'bon_livraison', 'facture_vente',
        'avoir_vente', 'bon_commande', 'bon_achat', 'facture_achat', 'avoir_achat',
      ];
      const columns = ['ref', 'Article', 'Qte', 'prix_ht', 'prix_unitaire', 'total_ttc', 'tva_%', 'montant_tva'];
      for (const dt of docTypes) {
        for (const col of columns) {
          await conn.execute(
            'INSERT IGNORE INTO document_columns (document_type, column_name, visible) VALUES (?, ?, ?)',
            [dt, col, 1]
          );
        }
      }
    }
  } finally {
    conn.release();
  }
}
