"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const migrate_1 = require("./migrate");
dotenv_1.default.config();
const pool = promise_1.default.createPool({
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
        await (0, migrate_1.migrate)(pool);
    }
    finally {
        conn.release();
    }
}
initDatabase().catch((err) => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});
exports.default = pool;
//# sourceMappingURL=index.js.map