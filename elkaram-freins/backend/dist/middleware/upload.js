"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path_1.default.resolve(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
];
function fileFilter(_req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Type de fichier non autorisé. Formats acceptés: jpg, png, gif, webp, xlsx, xls'));
    }
}
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});
//# sourceMappingURL=upload.js.map