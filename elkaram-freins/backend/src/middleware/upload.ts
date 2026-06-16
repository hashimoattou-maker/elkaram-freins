import multer from 'multer';

const storage = multer.memoryStorage();

const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés: jpg, png, gif, webp, xlsx, xls'));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
