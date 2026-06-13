import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { migrate } from './migrate';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'elkaram_freins',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    await migrate(pool);
  } finally {
    conn.release();
  }
}

initDatabase().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

export default pool;
