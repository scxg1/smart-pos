import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, transaction, invalidateAIMemory } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (_req: Request, res: Response) => {
  try {
    const expenses = queryAll(`SELECT * FROM expenses ORDER BY expense_date DESC, id DESC`);
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const { description, amount, category, expense_date, note } = req.body;
    if (!description || !description.trim()) {
      res.status(400).json({ error: 'الوصف مطلوب' });
      return;
    }
    if (amount === undefined || amount === null || Number(amount) < 0) {
      res.status(400).json({ error: 'المبلغ مطلوب ويجب أن يكون رقماً صحيحاً' });
      return;
    }
    transaction(() => {
      run(
        `INSERT INTO expenses (description, amount, category, expense_date, note) VALUES (?, ?, ?, ?, ?)`,
        [description.trim(), Number(amount), category || 'عام', expense_date || new Date().toISOString().split('T')[0], note || '']
      );
    });
    invalidateAIMemory();
    const expense = queryAll('SELECT * FROM expenses ORDER BY id DESC LIMIT 1')[0];
    res.status(201).json(expense);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { description, amount, category, expense_date, note } = req.body;
    const existing = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'المصروف غير موجود' });
      return;
    }
    if (amount !== undefined && amount !== null && Number(amount) < 0) {
      res.status(400).json({ error: 'المبلغ يجب أن يكون رقماً صحيحاً' });
      return;
    }
    transaction(() => {
      run(
        `UPDATE expenses SET description=COALESCE(?,description), amount=COALESCE(?,amount), category=COALESCE(?,category), expense_date=COALESCE(?,expense_date), note=COALESCE(?,note) WHERE id=?`,
        [description ?? null, amount != null ? Number(amount) : null, category ?? null, expense_date ?? null, note ?? null, req.params.id]
      );
    });
    invalidateAIMemory();
    res.json(queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const existing = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'المصروف غير موجود' });
      return;
    }
    transaction(() => {
      run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    });
    invalidateAIMemory();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', authenticate, (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const parts: string[] = [];
    const params: string[] = [];
    if (from) { parts.push(`expense_date >= ?`); params.push(String(from)); }
    if (to)   { parts.push(`expense_date <= ?`); params.push(String(to)); }
    const where = parts.length ? ' AND ' + parts.join(' AND ') : '';

    const total = queryAll(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE 1=1 ${where}`, params)[0];
    const byCategory = queryAll(
      `SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count
       FROM expenses WHERE 1=1 ${where} GROUP BY category ORDER BY total DESC`,
      params
    );
    res.json({ total: total.total, byCategory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
