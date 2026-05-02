import { Router, Request, Response } from 'express';
import { queryAll, run } from '../db';

const router = Router();

// GET all settings as key/value object
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = queryAll('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update multiple settings
router.put('/', (req: Request, res: Response) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
