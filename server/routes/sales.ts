import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, getDb, scheduleSave, transaction, invalidateAIMemory } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function generateReceiptNumber(db: any): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}-`;

  const lastSale = db.exec(
    `SELECT receipt_number FROM sales WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [prefix + '%']
  );
  let seq = 1;
  if (lastSale.length > 0 && lastSale[0].values[0]?.[0]) {
    const lastNum = String(lastSale[0].values[0][0]);
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

router.get('/', authenticate, (_req: Request, res: Response) => {
  try {
    const sales = queryAll('SELECT * FROM sales ORDER BY id DESC');
    const salesWithItems = sales.map(sale => {
      const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      return { ...sale, items };
    });
    res.json(salesWithItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', authenticate, (req: Request, res: Response) => {
  try {
    const { q, from, to, payment_method, min_total, max_total, page = '1', limit = '20' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push(`(s.receipt_number LIKE ? OR s.note LIKE ? OR EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = s.id AND si.name LIKE ?))`);
      const term = `%${q}%`;
      params.push(term, term, term);
    }
    if (from) { conditions.push(`DATE(s.created_at) >= ?`); params.push(from); }
    if (to) { conditions.push(`DATE(s.created_at) <= ?`); params.push(to); }
    if (payment_method) { conditions.push(`s.payment_method = ?`); params.push(payment_method); }
    if (min_total) { conditions.push(`s.total >= ?`); params.push(Number(min_total)); }
    if (max_total) { conditions.push(`s.total <= ?`); params.push(Number(max_total)); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const countResult = queryAll(`SELECT COUNT(*) as total FROM sales s ${where}`, params);
    const total = countResult[0]?.total || 0;

    const sales = queryAll(
      `SELECT s.* FROM sales s ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const salesWithItems = sales.map(sale => {
      const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      const customer = sale.customer_id ? queryOne('SELECT id, name, phone FROM customers WHERE id = ?', [sale.customer_id]) : null;
      return { ...sale, items, customer };
    });

    res.json({
      data: salesWithItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
    res.json({ ...sale, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const { customer_id, items, discount, tax, payment_method, note, total, cost_total, profit } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'حدد منتجاً واحداً على الأقل' });
      return;
    }

    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'number') {
        res.status(400).json({ error: 'معرف المنتج غير صالح' });
        return;
      }
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ error: `كمية غير صالحة للمنتج: ${item.name}` });
        return;
      }
      if (Number(item.unit_price) < 0) {
        res.status(400).json({ error: `سعر غير صالح للمنتج: ${item.name}` });
        return;
      }
    }

    if (total !== undefined && (typeof total !== 'number' || total < 0)) {
      res.status(400).json({ error: 'قيمة الإجمالي غير صالحة' });
      return;
    }

    let saleId: number;
    let receiptNumber: string;

    transaction((db) => {
      receiptNumber = generateReceiptNumber(db);

      db.run(
        `INSERT INTO sales (customer_id, total, cost_total, profit, discount, tax, payment_method, note, receipt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_id || null, total, cost_total, profit, discount || 0, tax || 0, payment_method || 'نقدي', note || '', receiptNumber]
      );

      const saleResult = db.exec('SELECT last_insert_rowid() as id');
      saleId = saleResult[0].values[0][0] as number;

      for (const item of items) {
        db.run(
          `INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, cost_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [saleId, item.product_id, item.name, item.quantity, item.unit_price, item.cost_price, item.subtotal]
        );
        db.run(
          `UPDATE products SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.product_id]
        );
      }

      if (customer_id) {
        db.run(
          `UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?`,
          [total, customer_id]
        );
      }
    });

    invalidateAIMemory();

    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [saleId]);
    const saleItems = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

    res.status(201).json({ ...sale, items: saleItems, receiptNumber });
  } catch (err: any) {
    console.error('POST /sales error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
