import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, invalidateAIMemory } from '../db';

const router = Router();

// GET all customers
router.get('/', (_req: Request, res: Response) => {
  try {
    const customers = queryAll('SELECT * FROM customers ORDER BY id DESC');
    // Add last visit info
    const enriched = customers.map(customer => {
      const lastSale = queryOne(
        'SELECT created_at FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1',
        [customer.id]
      );
      return { ...customer, last_visit: lastSale?.created_at || null };
    });
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    run('INSERT INTO customers (name, phone) VALUES (?, ?)', [name, phone || '']);
    const customer = queryOne('SELECT * FROM customers ORDER BY id DESC LIMIT 1');
    invalidateAIMemory();
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;
    run('UPDATE customers SET name=?, phone=? WHERE id=?', [name, phone || '', id]);
    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    invalidateAIMemory();
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', (req: Request, res: Response) => {
  try {
    run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    invalidateAIMemory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET customer purchase history
router.get('/:id/sales', (req: Request, res: Response) => {
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
