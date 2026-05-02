import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database;
const DB_PATH = path.join(__dirname, '..', 'data', 'smart-pos.db');

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  });

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Database loaded from disk');
  } else {
    db = new SQL.Database();
    console.log('🆕 New database created');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'عام',
      barcode TEXT DEFAULT '',
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'قطعة',
      image_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      total_purchases REAL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      total REAL DEFAULT 0,
      cost_total REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'نقدي',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      name TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      subtotal REAL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    )
  `);

  const defaultSettings: Record<string, string> = {
    store_name: 'نقطة البيع الذكية',
    store_address: '',
    store_phone: '',
    store_tax_number: '',
    receipt_header: 'مرحباً بكم',
    receipt_footer: 'شكراً لزيارتكم',
    tax_enabled: 'true',
    tax_rate: '15',
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = db.exec(`SELECT value FROM settings WHERE key = ?`, [key]);
    if (existing.length === 0) {
      db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    }
  }

  saveDb();
  console.log('✅ Database initialized successfully');
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDb();
    saveTimer = null;
  }, 1000);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function queryAll(sql: string, params: any[] = []): any[] {
  const result = getDb().exec(sql, params);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): void {
  getDb().run(sql, params);
  scheduleSave();
}

// ═══ Active Memory Cache for AI ═══
interface AIMemory {
  context: string;
  lastBuilt: number;
  dirty: boolean;
}

let aiMemory: AIMemory = {
  context: '',
  lastBuilt: 0,
  dirty: true,
};

export function invalidateAIMemory(): void {
  aiMemory.dirty = true;
}

export function isAIMemoryDirty(): boolean {
  return aiMemory.dirty || (Date.now() - aiMemory.lastBuilt > 5 * 60 * 1000);
}

export function buildAIContext(): string {
  if (!isAIMemoryDirty() && aiMemory.context) {
    return aiMemory.context;
  }

  const settings = queryAll(`SELECT key, value FROM settings`) as { key: string; value: string }[];
  const settingsMap: Record<string, string> = {};
  settings.forEach(s => { settingsMap[s.key] = s.value; });

  const products = queryAll(`SELECT name, selling_price, cost_price, stock, category, barcode FROM products ORDER BY name`);
  const lowStock = queryAll(`SELECT name, stock FROM products WHERE stock < 5 ORDER BY stock`);
  const customers = queryAll(`SELECT name, phone, total_purchases FROM customers ORDER BY total_purchases DESC`);

  const todaySales = queryAll(`
    SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(profit),0) as profit
    FROM sales WHERE DATE(created_at) = DATE('now', 'localtime')
  `);
  const weekSales = queryAll(`
    SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(profit),0) as profit
    FROM sales WHERE created_at >= datetime('now','localtime','-7 days')
  `);
  const monthSales = queryAll(`
    SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(profit),0) as profit
    FROM sales WHERE created_at >= datetime('now','localtime','-30 days')
  `);
  const topProducts = queryAll(`
    SELECT si.name, SUM(si.quantity) as qty, SUM(si.quantity * si.unit_price) as revenue
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= datetime('now','localtime','-30 days')
    GROUP BY si.product_id ORDER BY qty DESC LIMIT 10
  `);
  const categories = queryAll(`
    SELECT category, COUNT(*) as count, SUM(stock) as total_stock
    FROM products GROUP BY category
  `);
  const recentSales = queryAll(`
    SELECT id, total, profit, payment_method, created_at FROM sales ORDER BY id DESC LIMIT 20
  `);
  const dailySales = queryAll(`
    SELECT DATE(created_at) as date, COALESCE(SUM(total),0) as total, COALESCE(SUM(profit),0) as profit
    FROM sales WHERE created_at >= datetime('now','localtime','-30 days')
    GROUP BY DATE(created_at) ORDER BY date DESC
  `);

  aiMemory.context = `═══ معلومات المتجر ═══
الاسم: ${settingsMap['store_name'] || 'غير محدد'}
رقم الهاتف: ${settingsMap['store_phone'] || 'غير محدد'}
العنوان: ${settingsMap['store_address'] || 'غير محدد'}
الضريبة: ${settingsMap['tax_enabled'] === 'true' ? `مفعّلة (${settingsMap['tax_rate'] || '15'}%)` : 'معطّلة'}
العملة: جنيه مصري (ج.م)

═══ إحصائيات اليوم ═══
عدد الفواتير: ${(todaySales[0] as any)?.count || 0}
إجمالي المبيعات: ${Number((todaySales[0] as any)?.total || 0).toFixed(2)} ج.م
صافي الأرباح: ${Number((todaySales[0] as any)?.profit || 0).toFixed(2)} ج.م

═══ إحصائيات آخر 7 أيام ═══
عدد الفواتير: ${(weekSales[0] as any)?.count || 0}
إجمالي المبيعات: ${Number((weekSales[0] as any)?.total || 0).toFixed(2)} ج.م
صافي الأرباح: ${Number((weekSales[0] as any)?.profit || 0).toFixed(2)} ج.م

═══ إحصائيات آخر 30 يوم ═══
عدد الفواتير: ${(monthSales[0] as any)?.count || 0}
إجمالي المبيعات: ${Number((monthSales[0] as any)?.total || 0).toFixed(2)} ج.م
صافي الأرباح: ${Number((monthSales[0] as any)?.profit || 0).toFixed(2)} ج.م

═══ المنتجات (${products.length} منتج) ═══
${JSON.stringify(products.slice(0, 100), null, 0)}

═══ منتجات على وشك النفاد (مخزون أقل من 5) ═══
${lowStock.length > 0 ? JSON.stringify(lowStock, null, 0) : 'لا توجد منتجات بمخزون منخفض'}

═══ الفئات ═══
${JSON.stringify(categories, null, 0)}

═══ أكثر المنتجات مبيعاً (آخر 30 يوم) ═══
${JSON.stringify(topProducts, null, 0)}

═══ العملاء (${customers.length} عميل) ═══
${JSON.stringify(customers.slice(0, 50), null, 0)}

═══ آخر الفواتير ═══
${JSON.stringify(recentSales, null, 0)}

═══ المبيعات اليومية (آخر 30 يوم) ═══
${JSON.stringify(dailySales, null, 0)}`;

  aiMemory.lastBuilt = Date.now();
  aiMemory.dirty = false;
  return aiMemory.context;
}
