"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const clients_1 = __importDefault(require("./routes/clients"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const documents_1 = __importDefault(require("./routes/documents"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const settings_1 = __importDefault(require("./routes/settings"));
const stock_1 = __importDefault(require("./routes/stock"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/products', products_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/clients', clients_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/stock', stock_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const frontendDist = path_1.default.resolve(__dirname, '../public');
console.log('Serving frontend from:', frontendDist);
app.use(express_1.default.static(frontendDist));
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(frontendDist, 'index.html'));
});
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    const message = err.message || 'Erreur interne du serveur';
    const status = err.status || 500;
    res.status(status).json({ error: message });
});
app.listen(PORT, () => {
    console.log(`EL Karam Freins SARL - Application lancée sur http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map