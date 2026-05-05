import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDb, run, getDb, scheduleSave, invalidateAIMemory } from './db';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import customersRouter from './routes/customers';
import reportsRouter from './routes/reports';
import settingsRouter from './routes/settings';
import aiRouter from './routes/ai';
import authRouter from './routes/auth';
import backupRouter from './routes/backup';
import expensesRouter from './routes/expenses';
import { authenticate, requireRole, AuthRequest } from './middleware/auth';

const app = express();
const PORT = 3001;

const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/backup', backupRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);

app.post('/api/db/reset', authenticate, requireRole('مدير'), (req: AuthRequest, res) => {
  try {
    const db = getDb();
    db.run('DELETE FROM sale_items');
    db.run('DELETE FROM sales');
    db.run('DELETE FROM customers');
    db.run('DELETE FROM products');
    db.run('DELETE FROM chat_messages');
    db.run('DELETE FROM chat_sessions');
    db.run('DELETE FROM sqlite_sequence');
    scheduleSave();
    invalidateAIMemory();
    res.json({ success: true, message: 'تم تنظيف قاعدة البيانات بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
