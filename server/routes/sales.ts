import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, getDb, scheduleSave, invalidateAIMemory } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
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

router.get('/:id', (req: Request, res: Response) => {
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

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { customer_id, items, discount, tax, payment_method, note, total, cost_total, profit } = req.body;

    db.run(
      `INSERT INTO sales (customer_id, total, cost_total, profit, discount, tax, payment_method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id || null, total, cost_total, profit, discount || 0, tax || 0, payment_method || 'نقدي', note || '']
    );

    const saleResult = db.exec('SELECT last_insert_rowid() as id');
    const saleId = saleResult[0].values[0][0];
    const receiptNumber = Number(saleId) + 1000;

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

    const { scheduleSave } = require('../db');
    scheduleSave();
    invalidateAIMemory();

    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [saleId]);
    const saleItems = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

    res.status(201).json({ ...sale, items: saleItems, receiptNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
