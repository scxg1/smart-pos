import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, transaction, invalidateAIMemory } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (_req: Request, res: Response) => {
  try {
    const customers = queryAll(`
      SELECT c.*,
             (SELECT created_at FROM sales WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_visit
      FROM customers c
      ORDER BY c.id DESC
    `);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'اسم العميل مطلوب' });
      return;
    }
    transaction(() => {
      run('INSERT INTO customers (name, phone, total_purchases) VALUES (?, ?, 0)', [name.trim(), phone || '']);
    });
    invalidateAIMemory();
    const customer = queryOne('SELECT * FROM customers ORDER BY id DESC LIMIT 1');
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    const existing = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }
    transaction(() => {
      run('UPDATE customers SET name=?, phone=? WHERE id=?', [
        name !== undefined ? name : existing.name,
        phone !== undefined ? phone : existing.phone,
        id
      ]);
    });
    invalidateAIMemory();
    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const existing = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'العميل غير موجود' });
      return;
    }
    transaction(() => {
      run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    });
    invalidateAIMemory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/sales', authenticate, (req: Request, res: Response) => {
  try {
    const sales = queryAll('SELECT * FROM sales WHERE customer_id = ? ORDER BY id DESC', [req.params.id]);
    const salesWithItems = sales.map(sale => {
      const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      return { ...sale, items };
    });
    res.json(salesWithItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
