import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, transaction, invalidateAIMemory } from '../db';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', '..', 'uploads');
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

router.get('/', authenticate, (_req: Request, res: Response) => {
  try {
    const products = queryAll('SELECT * FROM products ORDER BY id DESC');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/low-stock', authenticate, (_req: Request, res: Response) => {
  try {
    const products = queryAll('SELECT * FROM products WHERE stock < 5');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, upload.single('image'), (req: Request, res: Response) => {
  try {
    const { name, category, barcode, cost_price, selling_price, stock, unit, profit_margin } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : '';

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'اسم المنتج مطلوب' });
      return;
    }

    const costPrice = cost_price !== '' && cost_price !== undefined ? parseFloat(cost_price) : null;
    const sellingPrice = selling_price !== '' && selling_price !== undefined ? parseFloat(selling_price) : null;
    const stockVal = parseInt(stock) || 0;
    const profitMargin = parseFloat(profit_margin) || 0;

    transaction(() => {
      run(
        `INSERT INTO products (name, category, barcode, cost_price, selling_price, stock, unit, image_path, profit_margin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name.trim(), category || 'عام', barcode || '', costPrice, sellingPrice, stockVal, unit || 'قطعة', image_path, profitMargin]
      );
    });
    invalidateAIMemory();

    const product = queryOne('SELECT * FROM products ORDER BY id DESC LIMIT 1');
    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, upload.single('image'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, barcode, cost_price, selling_price, stock, unit, profit_margin } = req.body;

    const existing = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }

    let imagePath = req.body.current_image || existing.image_path || '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const costPrice = cost_price !== '' && cost_price !== undefined ? parseFloat(cost_price) : null;
    const sellingPrice = selling_price !== '' && selling_price !== undefined ? parseFloat(selling_price) : null;
    const stockVal = parseInt(stock) || 0;
    const profitMargin = profit_margin !== '' && profit_margin !== undefined ? parseFloat(profit_margin) : existing.profit_margin || 0;

    transaction(() => {
      run(
        `UPDATE products SET name=?, category=?, barcode=?, cost_price=?, selling_price=?, stock=?, unit=?, image_path=?, profit_margin=? WHERE id=?`,
        [name || existing.name, category || existing.category, barcode ?? existing.barcode, costPrice, sellingPrice, stockVal, unit || existing.unit, imagePath, profitMargin, id]
      );
    });
    invalidateAIMemory();

    const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'المنتج غير موجود' });
      return;
    }
    transaction(() => {
      run('DELETE FROM products WHERE id = ?', [id]);
    });
    invalidateAIMemory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
