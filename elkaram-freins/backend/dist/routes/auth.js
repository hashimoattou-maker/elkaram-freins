"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = 'elkaram-jwt-secret-2024';
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
            return;
        }
        const [rows] = await database_1.default.execute('SELECT * FROM users WHERE username = ? AND active = 1', [username]);
        const user = rows[0];
        if (!user) {
            res.status(401).json({ error: 'Identifiants invalides' });
            return;
        }
        const valid = bcryptjs_1.default.compareSync(password, user.password);
        if (!valid) {
            res.status(401).json({ error: 'Identifiants invalides' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
        await database_1.default.execute('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)', [user.id, 'login', 'user', user.id, 'Connexion réussie']);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const [rows] = await database_1.default.execute('SELECT id, username, email, full_name as fullName, role, active, created_at FROM users WHERE id = ?', [req.user.id]);
        const user = rows[0];
        if (!user) {
            res.status(404).json({ error: 'Utilisateur non trouvé' });
            return;
        }
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map