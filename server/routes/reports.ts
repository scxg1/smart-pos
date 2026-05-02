import { Router, Request, Response } from 'express';
import { queryAll } from '../db';

const router = Router();

function getDateFilter(from?: string, to?: string): string {
  const parts: string[] = [];
  if (from) {
    parts.push(`created_at >= '${from.replace(/[^0-9\-]/g, '')} 00:00:00'`);
  }
  if (to) {
    parts.push(`created_at <= '${to.replace(/[^0-9\-]/g, '')} 23:59:59'`);
  }
  return parts.length > 0 ? ' AND ' + parts.join(' AND ') : '';
}

router.get('/summary', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter = getDateFilter(from as string, to as string);

    const summary = queryAll(`SELECT COUNT(*) as invoice_count, COALESCE(SUM(total), 0) as total_sales, COALESCE(SUM(profit), 0) as total_profit, COALESCE(SUM(cost_total), 0) as total_cost FROM sales WHERE 1=1 ${dateFilter}`)[0];

    const profitMargin = summary.total_sales > 0
      ? ((summary.total_profit / summary.total_sales) * 100).toFixed(1)
      : '0';

    res.json({ ...summary, profit_margin: profitMargin });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/daily', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter = getDateFilter(from as string, to as string);

    const daily = queryAll(`SELECT DATE(created_at) as date, COALESCE(SUM(total),0) as total, COALESCE(SUM(profit),0) as profit, COUNT(*) as count FROM sales WHERE 1=1 ${dateFilter} GROUP BY DATE(created_at) ORDER BY date`);
    res.json(daily);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-products', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter = getDateFilter(from as string, to as string);

    const topProducts = queryAll(`SELECT si.name, SUM(si.quantity) as qty_sold, SUM(si.subtotal) as revenue, SUM(si.quantity * si.cost_price) as cost FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE 1=1 ${dateFilter} GROUP BY si.product_id ORDER BY qty_sold DESC LIMIT 10`);

    const enriched = topProducts.map(p => ({
      ...p,
      profit: (p.revenue || 0) - (p.cost || 0),
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-category', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const dateFilter = getDateFilter(from as string, to as string);

    const byCategory = queryAll(`SELECT p.category, SUM(si.subtotal) as total, SUM(si.quantity) as qty FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE 1=1 ${dateFilter} GROUP BY p.category ORDER BY total DESC`);
    res.json(byCategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
