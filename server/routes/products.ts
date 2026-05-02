import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, invalidateAIMemory } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split('/')[1]);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const products = queryAll('SELECT * FROM products ORDER BY id DESC');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/low-stock', (_req: Request, res: Response) => {
  try {
    const products = queryAll('SELECT * FROM products WHERE stock < 5');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('image'), (req: Request, res: Response) => {
  try {
    const { name, category, barcode, cost_price, selling_price, stock, unit } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : '';

    run(
      `INSERT INTO products (name, category, barcode, cost_price, selling_price, stock, unit, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || 'عام', barcode || '', parseFloat(cost_price) || 0, parseFloat(selling_price) || 0, parseInt(stock) || 0, unit || 'قطعة', image_path]
    );

    const product = queryOne('SELECT * FROM products ORDER BY id DESC LIMIT 1');
    invalidateAIMemory();
    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', upload.single('image'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, barcode, cost_price, selling_price, stock, unit } = req.body;

    let imagePath = req.body.current_image || '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    run(
      `UPDATE products SET name=?, category=?, barcode=?, cost_price=?, selling_price=?, stock=?, unit=?, image_path=? WHERE id=?`,
      [name, category || 'عام', barcode || '', parseFloat(cost_price) || 0, parseFloat(selling_price) || 0, parseInt(stock) || 0, unit || 'قطعة', imagePath, id]
    );

    const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    invalidateAIMemory();
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    run('DELETE FROM products WHERE id = ?', [id]);
    invalidateAIMemory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
