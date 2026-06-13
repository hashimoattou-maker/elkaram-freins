"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = 'elkaram-jwt-secret-2024';
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token d\'authentification manquant' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            full_name: decoded.full_name,
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Token invalide ou expiré' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Accès refusé - permissions insuffisantes' });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map