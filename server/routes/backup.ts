import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getDb, scheduleSave } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'smart-pos.db')
  : path.join(__dirname, '..', 'data', 'smart-pos.db');
const BACKUPS_DIR = path.join(path.dirname(DB_PATH), 'backups');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureBackupsDir();
    cb(null, BACKUPS_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, 'restore-temp.db');
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.db') {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  },
});

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// Verify the uploaded file starts with the SQLite magic bytes "SQLite format 3\0"
function isSQLiteFile(filePath: string): boolean {
  try {
    const MAGIC = Buffer.from('53514c69746520666f726d6174203300', 'hex');
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);
    return header.equals(MAGIC);
  } catch {
    return false;
  }
}

router.post('/now', authenticate, requireRole('مدير'), (_req: Request, res: Response) => {
  try {
    ensureBackupsDir();

    if (!fs.existsSync(DB_PATH)) {
      res.status(404).json({ success: false, message: 'Database file not found' });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `smart-pos-${timestamp}.db`;
    const backupPath = path.join(BACKUPS_DIR, filename);

    fs.copyFileSync(DB_PATH, backupPath);

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('smart-pos-') && f.endsWith('.db'))
      .sort();

    while (files.length > 7) {
      const oldest = files.shift()!;
      fs.unlinkSync(path.join(BACKUPS_DIR, oldest));
    }

    res.json({ success: true, message: 'تم النسخ الاحتياطي بنجاح', file: filename });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/restore', authenticate, requireRole('مدير'), upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const tempPath = req.file.path;

    if (!isSQLiteFile(tempPath)) {
      fs.unlinkSync(tempPath);
      res.status(400).json({ success: false, message: 'الملف المرفوع ليس قاعدة بيانات SQLite صالحة' });
      return;
    }

    ensureBackupsDir();
    fs.copyFileSync(tempPath, DB_PATH);
    fs.unlinkSync(tempPath);

    res.json({ success: true, message: 'تمت الاستعادة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/list', authenticate, (_req: Request, res: Response) => {
  try {
    ensureBackupsDir();

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('smart-pos-') && f.endsWith('.db'));

    const backups = files.map(filename => {
      const filePath = path.join(BACKUPS_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created_at: stats.mtime.toISOString(),
      };
    });

    backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
