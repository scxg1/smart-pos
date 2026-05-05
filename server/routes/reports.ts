import { Router, Request, Response } from 'express';
import { queryAll, queryOne } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// Build a parameterized date filter — returns [sqlFragment, params[]]
function buildDateFilter(from?: string, to?: string, tableAlias?: string): [string, string[]] {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const parts: string[] = [];
  const params: string[] = [];
  if (from) {
    parts.push(`${prefix}created_at >= ?`);
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    parts.push(`${prefix}created_at <= ?`);
    params.push(`${to} 23:59:59`);
  }
  return [parts.length ? ' AND ' + parts.join(' AND ') : '', params];
}

function buildExpenseDateFilter(from?: string, to?: string): [string, string[]] {
  const parts: string[] = [];
  const params: string[] = [];
  if (from) { parts.push(`expense_date >= ?`); params.push(from); }
  if (to)   { parts.push(`expense_date <= ?`); params.push(to); }
  return [parts.length ? ' AND ' + parts.join(' AND ') : '', params];
}

router.get('/summary', authenticate, (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const [dateFilter, dateParams] = buildDateFilter(from as string, to as string);

    const summary = queryAll(
      `SELECT COUNT(*) as invoice_count, COALESCE(SUM(total),0) as total_sales,
              COALESCE(SUM(profit),0) as total_profit, COALESCE(SUM(cost_total),0) as total_cost
       FROM sales WHERE 1=1 ${dateFilter}`,
      dateParams
    )[0];

    const linkSetting = queryOne(`SELECT value FROM settings WHERE key = 'link_expenses_to_profit'`);
    let expenses_total = 0;
    if (linkSetting?.value === 'true') {
      const [expFilter, expParams] = buildExpenseDateFilter(from as string, to as string);
      const expResult = queryAll(
        `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE 1=1 ${expFilter}`,
        expParams
      )[0];
      expenses_total = expResult?.total || 0;
    }

    const net_profit = summary.total_profit - expenses_total;
    const profitMargin = summary.total_sales > 0
      ? ((net_profit / summary.total_sales) * 100).toFixed(1)
      : '0';

    res.json({ ...summary, total_profit: net_profit, expenses_total, profit_margin: profitMargin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily', authenticate, (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const [dateFilter, dateParams] = buildDateFilter(from as string, to as string);
    const daily = queryAll(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total),0) as total,
              COALESCE(SUM(profit),0) as profit, COUNT(*) as count
       FROM sales WHERE 1=1 ${dateFilter} GROUP BY DATE(created_at) ORDER BY date`,
      dateParams
    );
    res.json(daily);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-products', authenticate, (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const [dateFilter, dateParams] = buildDateFilter(from as string, to as string, 's');
    const topProducts = queryAll(
      `SELECT si.name, SUM(si.quantity) as qty_sold, SUM(si.subtotal) as revenue,
              SUM(si.quantity * si.cost_price) as cost
       FROM sale_items si JOIN sales s ON si.sale_id = s.id
       WHERE 1=1 ${dateFilter} GROUP BY si.product_id ORDER BY qty_sold DESC LIMIT 10`,
      dateParams
    );
    res.json(topProducts.map(p => ({ ...p, profit: (p.revenue || 0) - (p.cost || 0) })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-category', authenticate, (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const [dateFilter, dateParams] = buildDateFilter(from as string, to as string, 's');
    const byCategory = queryAll(
      `SELECT p.category, SUM(si.subtotal) as total, SUM(si.quantity) as qty
       FROM sale_items si JOIN products p ON si.product_id = p.id
       JOIN sales s ON si.sale_id = s.id
       WHERE 1=1 ${dateFilter} GROUP BY p.category ORDER BY total DESC`,
      dateParams
    );
    res.json(byCategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
