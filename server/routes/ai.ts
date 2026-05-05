import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, transaction, scheduleSave, buildAIContext, invalidateAIMemory } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

const ZAI_KEY = process.env.ZAI_API_KEY;

function checkAIConfig(): string | null {
  if (!ZAI_KEY) return 'مفتاح API غير مضبوط. أضف ZAI_API_KEY في ملف .env';
  return null;
}

type AITier = 'fast' | 'action' | 'analysis';

function classifyMessage(content: string): AITier {
  const ACTION = ['أضف', 'احذف', 'عدل', 'تحديث', 'بيع', 'غير', 'حذف', 'إضافة', 'تعديل', 'أنشئ', 'أضيف', 'امسح', 'تم بيع', 'مصروف', 'نفقة', 'صرف'];
  const ANALYSIS = ['تحليل', 'تقرير', 'إحصاء', 'مقارنة', 'أداء', 'ملخص', 'إجمالي', 'أرباح الشهر', 'مبيعات الشهر', 'توقع',
    'أرباح', 'ربح', 'خسارة', 'مبيعات', 'إيرادات', 'مصروفات اليوم', 'صافي', 'أحدث'];
  if (ACTION.some(kw => content.includes(kw))) return 'action';
  if (ANALYSIS.some(kw => content.includes(kw))) return 'analysis';
  return 'fast';
}

interface AIResponse {
  content: string;
  tool_calls?: any[];
}

async function callAI(messages: any[], tier: AITier = 'action', tools?: any[]): Promise<AIResponse> {
  const tokenMap: Record<AITier, number> = { fast: 1024, action: 4096, analysis: 8192 };
  const tempMap: Record<AITier, number> = { fast: 0.5, action: 0.3, analysis: 0.7 };
  const maxTokens = tokenMap[tier];
  const temperature = tempMap[tier];
  const maxRetries = 3;
  const timeoutMs = 120000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body: any = { model: 'glm-4-plus', messages, max_tokens: maxTokens, temperature };
      if (tools && tools.length > 0) body.tools = tools;

      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Bearer ${ZAI_KEY}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error('مفتاح API غير صالح. حدّث ZAI_API_KEY في ملف .env');
      }

      if (res.status === 429 || res.status >= 500) {
        const wait = Math.min(attempt * 5, 15);
        console.warn(`Z.AI error ${res.status}, retry ${attempt}/${maxRetries} in ${wait}s`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const message = data.choices?.[0]?.message;
      if (message) {
        return {
          content: message.content || '',
          tool_calls: message.tool_calls
        };
      }
      if (data.error) throw new Error(data.error.message || 'API error');
      throw new Error('No response from AI');
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error('انتهت مهلة الطلب.');
        break;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 3000));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('AI request failed');
}

const SYSTEM_BASE = `أنت مدير نظام نقطة البيع الذكية. أجب بالعربية فقط، بإيجاز ودقة. استخدم ج.م للعملة.`;

const SYSTEM_ACTION = `${SYSTEM_BASE}

لديك صلاحيات كاملة لتنفيذ الإجراءات على قاعدة البيانات عبر الأدوات المتاحة لك (Functions/Tools).
هامش الربح (profit_margin): نسبة مئوية من إجمالي المبيعات بالجنيه المصري. مثال: profit_margin=10 يعني 10 ج.م ربح لكل 100 ج.م مبيعات.

قواعد مهمة جداً ومقيدة:
- MUST use actual product IDs from the list below when updating, deleting, or selling.
- selling_price و cost_price يمكن أن تكونا null
- استخدم دائماً أداة "execute_action" المتاحة لك لتنفيذ أي إضافة، تعديل، حذف، أو بيع.
- بعد كل إجراء اكتب رسالة تأكيد قصيرة للمستخدم تبلغه بنجاح العملية.
- لا تخترع أرقام id أبداً.`;

const SYSTEM_ANALYSIS = `${SYSTEM_BASE}
قدم تحليلاً دقيقاً للبيانات. اذكر الأرقام المهمة وقدم توصيات عملية.`;

function buildSystemPrompt(tier: AITier, products: any[], customers: any[], context: string, expenses: any[] = []): string {
  if (tier === 'fast') return SYSTEM_BASE;

  const prodStr = JSON.stringify(products.slice(0, 100), null, 0);
  const custStr = JSON.stringify(customers.slice(0, 50), null, 0);

  if (tier === 'action') {
    const expStr = expenses.length > 0 ? `\n═══ المصروفات (${expenses.length}) ═══\n${JSON.stringify(expenses.slice(0, 20), null, 0)}` : '';
    return `${SYSTEM_ACTION}

${context}

═══ المنتجات (${products.length}) ═══
${prodStr}
═══ العملاء (${customers.length}) ═══
${custStr}${expStr}`;
  }

  return `${SYSTEM_ANALYSIS}
═══ بيانات المتجر ═══
${context}
═══ المنتجات (${products.length}) ═══
${prodStr}
═══ العملاء (${customers.length}) ═══
${custStr}`;
}

function executeAction(action: any): { success: boolean; message: string; data?: any } {
  const type = action.type;
  const d = action.data || {};

  if (d.product_id !== undefined && d.id === undefined) d.id = d.product_id;
  if (d.customer_id !== undefined && d.id === undefined) d.id = d.customer_id;
  if (d.expense_id !== undefined && d.id === undefined) d.id = d.expense_id;

  try {
    switch (type) {
      case 'batch_add_products': {
        if (!d.products || !Array.isArray(d.products)) {
          return { success: false, message: 'قائمة المنتجات مطلوبة للإضافة المتعددة' };
        }
        let addedCount = 0;
        transaction((db) => {
          for (const prod of d.products) {
            if (!prod.name) continue;
            const cp = prod.cost_price !== undefined && prod.cost_price !== null ? Number(prod.cost_price) : null;
            const sp = prod.selling_price !== undefined && prod.selling_price !== null ? Number(prod.selling_price) : null;
            const pm = prod.profit_margin ? Number(prod.profit_margin) : 0;
            db.run(`INSERT INTO products (name, category, barcode, cost_price, selling_price, stock, unit, image_path, profit_margin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [String(prod.name).trim(), prod.category || 'عام', prod.barcode || '', cp, sp, parseInt(prod.stock) || 0, prod.unit || 'قطعة', '', pm]);
            addedCount++;
          }
        });
        invalidateAIMemory();
        return { success: true, message: `تم إضافة ${addedCount} منتج بنجاح دفعة واحدة` };
      }
      case 'add_product': {
        const { name, category, barcode, cost_price, selling_price, stock, unit, profit_margin, image_keyword } = d;
        if (!name) return { success: false, message: 'اسم المنتج مطلوب' };
        const imagePath = image_keyword
          ? `https://tse1.mm.bing.net/th?q=${encodeURIComponent(image_keyword + ' product')}&w=400&h=400&c=7&rs=1&p=0&dpr=3&pid=1.7&mkt=en-US&adlt=moderate`
          : '';
        const cp = cost_price !== undefined && cost_price !== null ? Number(cost_price) : null;
        const sp = selling_price !== undefined && selling_price !== null ? Number(selling_price) : null;
        const pm = profit_margin ? Number(profit_margin) : 0;
        transaction(() => {
          run(`INSERT INTO products (name, category, barcode, cost_price, selling_price, stock, unit, image_path, profit_margin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [String(name).trim(), category || 'عام', barcode || '', cp, sp, parseInt(stock) || 0, unit || 'قطعة', imagePath, pm]);
        });
        invalidateAIMemory();
        const added = queryOne('SELECT * FROM products ORDER BY id DESC LIMIT 1');
        return { success: true, message: `تم إضافة "${name}" بنجاح (id:${added?.id})`, data: added };
      }
      case 'update_product': {
        const { id } = d;
        if (!id) return { success: false, message: 'معرف المنتج مطلوب' };
        const current = queryOne('SELECT * FROM products WHERE id = ?', [id]);
        if (!current) return { success: false, message: `المنتج رقم ${id} غير موجود` };
        let imgSql = '';
        let imgVal: any[] = [];
        if (d.image_keyword) {
          imgSql = `, image_path = ?`;
          imgVal = [`https://tse1.mm.bing.net/th?q=${encodeURIComponent(d.image_keyword + ' product')}&w=400&h=400&c=7&rs=1&p=0&dpr=3&pid=1.7&mkt=en-US&adlt=moderate`];
        }
        const cp = d.cost_price !== undefined ? (d.cost_price === null ? null : Number(d.cost_price)) : null;
        const sp = d.selling_price !== undefined ? (d.selling_price === null ? null : Number(d.selling_price)) : null;
        const pm = d.profit_margin !== undefined ? Number(d.profit_margin) : null;
        transaction(() => {
          run(`UPDATE products SET name=COALESCE(?,name), category=COALESCE(?,category), cost_price=COALESCE(?,cost_price), selling_price=COALESCE(?,selling_price), stock=COALESCE(?,stock), unit=COALESCE(?,unit), profit_margin=COALESCE(?,profit_margin)${imgSql} WHERE id=?`,
            [d.name ?? null, d.category ?? null, cp, sp, d.stock ?? null, d.unit ?? null, pm, ...imgVal, id]);
        });
        invalidateAIMemory();
        return { success: true, message: `تم تحديث المنتج "${d.name || current.name}"` };
      }
      case 'delete_product': {
        const { id } = d;
        if (!id) return { success: false, message: 'رقم المنتج مطلوب' };
        const p = queryOne('SELECT * FROM products WHERE id = ?', [id]);
        if (!p) return { success: false, message: `المنتج رقم ${id} غير موجود` };
        transaction(() => { run('DELETE FROM products WHERE id = ?', [id]); });
        invalidateAIMemory();
        return { success: true, message: `تم حذف "${p.name}"` };
      }
      case 'batch_update_products': {
        if (!d.products || !Array.isArray(d.products)) {
          return { success: false, message: 'قائمة المنتجات مطلوبة للتعديل المتعدد' };
        }
        let okCount = 0;
        const errors: string[] = [];
        transaction(() => {
          for (const prod of d.products) {
            const pid = prod.id || prod.product_id;
            if (!pid) { errors.push('منتج بدون id تم تخطيه'); continue; }
            const current = queryOne('SELECT * FROM products WHERE id = ?', [pid]);
            if (!current) { errors.push(`المنتج رقم ${pid} غير موجود`); continue; }
            const cp = prod.cost_price !== undefined ? (prod.cost_price === null ? null : Number(prod.cost_price)) : null;
            const sp = prod.selling_price !== undefined ? (prod.selling_price === null ? null : Number(prod.selling_price)) : null;
            const pm = prod.profit_margin !== undefined ? Number(prod.profit_margin) : null;
            run(`UPDATE products SET name=COALESCE(?,name), category=COALESCE(?,category), cost_price=COALESCE(?,cost_price), selling_price=COALESCE(?,selling_price), stock=COALESCE(?,stock), unit=COALESCE(?,unit), profit_margin=COALESCE(?,profit_margin) WHERE id=?`,
              [prod.name ?? null, prod.category ?? null, cp, sp, prod.stock ?? null, prod.unit ?? null, pm, pid]);
            okCount++;
          }
        });
        invalidateAIMemory();
        const msg = errors.length > 0
          ? `تم تحديث ${okCount} منتج. أخطاء: ${errors.join('، ')}`
          : `تم تحديث ${okCount} منتج بنجاح دفعة واحدة`;
        return { success: okCount > 0, message: msg };
      }
      case 'batch_delete_products': {
        const ids = d.ids || d.product_ids;
        if (!ids || !Array.isArray(ids)) {
          return { success: false, message: 'قائمة أرقام المنتجات مطلوبة للحذف المتعدد' };
        }
        let okCount = 0;
        const names: string[] = [];
        transaction(() => {
          for (const pid of ids) {
            const p = queryOne('SELECT * FROM products WHERE id = ?', [pid]);
            if (!p) continue;
            run('DELETE FROM products WHERE id = ?', [pid]);
            names.push(p.name);
            okCount++;
          }
        });
        invalidateAIMemory();
        return { success: okCount > 0, message: `تم حذف ${okCount} منتج: ${names.join('، ')}` };
      }
      case 'add_customer': {
        const { name, phone } = d;
        if (!name) return { success: false, message: 'اسم العميل مطلوب' };
        transaction(() => {
          run('INSERT INTO customers (name, phone, total_purchases) VALUES (?, ?, 0)', [String(name).trim(), phone || '']);
        });
        invalidateAIMemory();
        const added = queryOne('SELECT * FROM customers ORDER BY id DESC LIMIT 1');
        return { success: true, message: `تم إضافة العميل "${name}" (id:${added?.id})`, data: added };
      }
      case 'update_customer': {
        const { id, name, phone } = d;
        if (!id) return { success: false, message: 'رقم العميل مطلوب' };
        const c = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
        if (!c) return { success: false, message: `العميل رقم ${id} غير موجود` };
        transaction(() => {
          run('UPDATE customers SET name=?, phone=? WHERE id = ?', [
            name !== undefined ? name : c.name, phone !== undefined ? phone : c.phone, id
          ]);
        });
        invalidateAIMemory();
        return { success: true, message: `تم تحديث العميل "${name || c.name}"` };
      }
      case 'delete_customer': {
        const { id } = d;
        if (!id) return { success: false, message: 'رقم العميل مطلوب' };
        const c = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
        if (!c) return { success: false, message: `العميل رقم ${id} غير موجود` };
        transaction(() => { run('DELETE FROM customers WHERE id = ?', [id]); });
        invalidateAIMemory();
        return { success: true, message: `تم حذف العميل "${c.name}"` };
      }
      case 'update_stock': {
        const { id, stock } = d;
        if (!id || stock === undefined) return { success: false, message: 'رقم المنتج والكمية مطلوبان' };
        const p = queryOne('SELECT * FROM products WHERE id = ?', [id]);
        if (!p) return { success: false, message: `المنتج رقم ${id} غير موجود` };
        transaction(() => { run('UPDATE products SET stock = ? WHERE id = ?', [Number(stock), id]); });
        invalidateAIMemory();
        return { success: true, message: `مخزون "${p.name}" أصبح ${stock}` };
      }
      case 'create_sale': {
        const { items, payment_method, customer_id, discount } = d;
        if (!items?.length) return { success: false, message: 'حدد المنتجات والكميات' };
        let total = 0, cost_total = 0;
        const saleItems: any[] = [];
        for (const item of items) {
          const p = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
          if (!p) return { success: false, message: `المنتج رقم ${item.product_id} غير موجود` };
          if (p.selling_price === null || p.selling_price === undefined)
            return { success: false, message: `"${p.name}" ليس له سعر بيع` };
          const qty = Number(item.quantity) || 1;
          if (p.stock < qty) return { success: false, message: `"${p.name}" المخزون غير كافٍ (${p.stock})` };
          const sub = p.selling_price * qty;
          let itemCostPrice = (p.cost_price || 0);
          if ((!itemCostPrice || itemCostPrice <= 0) && p.profit_margin > 0) {
            itemCostPrice = p.selling_price * (1 - p.profit_margin / 100);
          }
          total += sub;
          cost_total += itemCostPrice * qty;
          saleItems.push({ product_id: p.id, name: p.name, quantity: qty, unit_price: p.selling_price, cost_price: itemCostPrice, subtotal: sub });
        }
        const disc = discount || 0;
        const afterDisc = total * (1 - disc / 100);
        const profit = afterDisc - cost_total;
        let saleId: number;
        let receiptNumber: string;
        transaction((db) => {
          const now = new Date();
          const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
          const last = db.exec(`SELECT receipt_number FROM sales WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1`, [prefix + '%']);
          let seq = 1;
          if (last.length > 0 && last[0].values[0]?.[0]) {
            const parts = String(last[0].values[0][0]).split('-');
            if (parts.length === 3) seq = parseInt(parts[2], 10) + 1;
          }
          receiptNumber = `${prefix}${String(seq).padStart(4, '0')}`;
          db.run(`INSERT INTO sales (customer_id, total, cost_total, profit, discount, tax, payment_method, note, receipt_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id || null, afterDisc, cost_total, profit, disc, 0, payment_method || 'نقدي', 'بيع عبر المساعد الذكي', receiptNumber]);
          saleId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
          for (const si of saleItems) {
            db.run(`INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, cost_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [saleId, si.product_id, si.name, si.quantity, si.unit_price, si.cost_price, si.subtotal]);
            db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [si.quantity, si.product_id]);
          }
          if (customer_id) db.run(`UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?`, [afterDisc, customer_id]);
        });
        invalidateAIMemory();
        const summary = saleItems.map(si => `${si.name} ×${si.quantity}`).join('، ');
        return { success: true, message: `تم البيع: ${summary} — الإجمالي ${afterDisc.toFixed(2)} ج.م`, data: { saleId, total: afterDisc, receiptNumber } };
      }
      case 'add_expense': {
        const { description, amount, category, expense_date, note } = d;
        if (!description) return { success: false, message: 'وصف المصروف مطلوب' };
        if (amount === undefined || amount === null || Number(amount) < 0) return { success: false, message: 'المبلغ مطلوب' };
        transaction(() => {
          run(`INSERT INTO expenses (description, amount, category, expense_date, note) VALUES (?, ?, ?, ?, ?)`,
            [String(description).trim(), Number(amount), category || 'عام', expense_date || new Date().toISOString().split('T')[0], note || '']);
        });
        invalidateAIMemory();
        return { success: true, message: `تم تسجيل مصروف "${description}" بقيمة ${Number(amount).toFixed(2)} ج.م` };
      }
      case 'update_expense': {
        const { id } = d;
        if (!id) return { success: false, message: 'رقم المصروف مطلوب' };
        const existing = queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
        if (!existing) return { success: false, message: `المصروف رقم ${id} غير موجود` };
        if (d.amount !== undefined && d.amount !== null && Number(d.amount) < 0) return { success: false, message: 'المبلغ غير صالح' };
        transaction(() => {
          run(`UPDATE expenses SET description=COALESCE(?,description), amount=COALESCE(?,amount), category=COALESCE(?,category), expense_date=COALESCE(?,expense_date), note=COALESCE(?,note) WHERE id=?`,
            [d.description ?? null, d.amount != null ? Number(d.amount) : null, d.category ?? null, d.expense_date ?? null, d.note ?? null, id]);
        });
        invalidateAIMemory();
        return { success: true, message: 'تم تحديث المصروف' };
      }
      case 'delete_expense': {
        const { id } = d;
        if (!id) return { success: false, message: 'رقم المصروف مطلوب' };
        const existing = queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
        if (!existing) return { success: false, message: `المصروف رقم ${id} غير موجود` };
        transaction(() => { run('DELETE FROM expenses WHERE id = ?', [id]); });
        invalidateAIMemory();
        return { success: true, message: `تم حذف المصروف "${existing.description}"` };
      }
      default:
        return { success: false, message: `نوع إجراء غير معروف: "${type}"` };
    }
  } catch (err: any) {
    console.error(`executeAction error (${type}):`, err.message);
    return { success: false, message: `خطأ في تنفيذ الإجراء: ${err.message}` };
  }
}

// ═══ Routes ═══

router.get('/test', authenticate, async (_req: Request, res: Response) => {
  const err = checkAIConfig();
  if (err) { res.status(400).json({ success: false, error: err }); return; }
  try {
    const reply = await callAI([{ role: 'user', content: 'قل مرحباً بكلمة واحدة' }], 'fast');
    res.json({ success: true, message: reply.content });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/insights', authenticate, async (req: Request, res: Response) => {
  try {
    const { period } = req.body;
    const context = buildAIContext();
    const reply = await callAI([
      { role: 'system', content: `أنت محلل مبيعات. لديك:\n\n${context}\n\nقدم 3 رؤى مختصرة.` },
      { role: 'user', content: `حلل مبيعات ${period === 'today' ? 'اليوم' : period === 'week' ? 'الأسبوع' : 'الشهر'}` }
    ], 'analysis');
    const insights = reply.content.split('\n').filter((l: string) => l.trim()).map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').trim()).slice(0, 3);
    res.json({ insights });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/upsell', authenticate, async (req: Request, res: Response) => {
  try {
    const { cartItems } = req.body;
    const itemsStr = cartItems.map((i: any) => i.name).join('، ');
    const reply = await callAI([
      { role: 'system', content: 'أنت بائع. أجب بجملة واحدة فقط.' },
      { role: 'user', content: `سلة: ${itemsStr}. اقترح منتجاً إضافياً.` }
    ], 'fast');
    res.json({ suggestion: reply.content.trim() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/forecast', authenticate, async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    const product = queryAll(`SELECT name, stock FROM products WHERE id = ?`, [productId])[0];
    const salesData = queryAll(`SELECT DATE(s.created_at) as date, SUM(si.quantity) as qty FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE si.product_id = ? AND s.created_at >= datetime('now','localtime','-30 days') GROUP BY DATE(s.created_at)`, [productId]);
    const reply = await callAI([
      { role: 'system', content: 'أجب بجملتين فقط.' },
      { role: 'user', content: `بيانات: ${JSON.stringify({ product, sales: salesData })}. كم يوم سيكفي المخزون؟` }
    ], 'fast');
    res.json({ forecast: reply.content.trim() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/sessions', authenticate, (_req: Request, res: Response) => {
  try {
    res.json(queryAll(`SELECT s.*, (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as msg_count FROM chat_sessions s ORDER BY updated_at DESC`));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sessions', authenticate, (req: Request, res: Response) => {
  try {
    run('INSERT INTO chat_sessions (title) VALUES (?)', [req.body.title || 'محادثة جديدة']);
    res.status(201).json(queryAll('SELECT * FROM chat_sessions ORDER BY id DESC LIMIT 1')[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/sessions/:id', authenticate, (req: Request, res: Response) => {
  try {
    run('UPDATE chat_sessions SET title = ?, updated_at = datetime("now","localtime") WHERE id = ?', [req.body.title, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/sessions/:id', authenticate, (req: Request, res: Response) => {
  try {
    transaction(() => {
      run('DELETE FROM chat_messages WHERE session_id = ?', [req.params.id]);
      run('DELETE FROM chat_sessions WHERE id = ?', [req.params.id]);
    });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/sessions/:id/messages', authenticate, (req: Request, res: Response) => {
  try {
    res.json(queryAll('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC', [req.params.id]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/chat', authenticate, async (req: Request, res: Response) => {
  const configErr = checkAIConfig();
  if (configErr) { res.status(400).json({ error: configErr }); return; }
  try {
    const { messages, session_id } = req.body as { messages: { role: string; content: string }[]; session_id?: number };
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    // For chat, we always use the 'action' tier so the AI has full access to context and tools.
    // This entirely prevents hallucinations for queries that lacked keywords.
    const tier = 'action';

    const products = queryAll('SELECT id, name, selling_price, cost_price, stock, category, unit, profit_margin FROM products ORDER BY name');
    const customers = queryAll('SELECT id, name, phone, total_purchases FROM customers ORDER BY name');
    const expenses = queryAll('SELECT id, description, amount, category, expense_date FROM expenses ORDER BY id DESC LIMIT 20');
    
    // We also include analysis context (like total profits/sales) to stop hallucinations about numbers
    invalidateAIMemory();
    const context = buildAIContext();

    const systemPrompt = buildSystemPrompt(tier, products, customers, context, expenses);
    const msgWindow = 8;
    const recentMessages = messages.slice(-msgWindow);

    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages,
    ];

    const tools = tier === 'action' ? [{
      type: "function",
      function: {
        name: "execute_action",
        description: "Executes an action on the POS database: add/update/delete products, customers, expenses, or create sales.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["batch_add_products", "add_product", "update_product", "batch_update_products", "delete_product", "batch_delete_products", "add_customer", "update_customer", "delete_customer", "update_stock", "create_sale", "add_expense", "update_expense", "delete_expense"],
              description: "نوع الإجراء المطلوب تنفيذه. استخدم batch_add_products لإضافة عدة منتجات دفعة واحدة، batch_update_products لتعديل عدة منتجات دفعة واحدة (أرسل products كمصفوفة كل عنصر يحتوي id + الحقول المراد تعديلها)، batch_delete_products لحذف عدة منتجات (أرسل ids كمصفوفة أرقام)."
            },
            data: {
              type: "object",
              description: "بيانات الإجراء. لإضافة منتج: name, category, cost_price, selling_price, stock. لإضافة عدة منتجات: products (مصفوفة). لتعديل عدة منتجات: products (مصفوفة كل عنصر فيه id + الحقول). لحذف عدة منتجات: ids (مصفوفة أرقام). وللمبيعات: items: [{product_id, quantity}], payment_method. للمصروفات: description, amount, category, expense_date. لتحديث أو حذف عنصر واحد: id مطلوب."
            }
          },
          required: ["type", "data"]
        }
      }
    }] : undefined;

    const reply = await callAI(aiMessages, tier, tools);

    let actionResults: any[] = [];
    let cleanReply = reply.content || '';

    if (reply.tool_calls && reply.tool_calls.length > 0) {
      for (const tc of reply.tool_calls) {
        if (tc.function?.name === 'execute_action') {
          try {
            const actionArgs = JSON.parse(tc.function.arguments);
            const result = executeAction(actionArgs);
            actionResults.push(result);
            console.log(`AI Tool Call: ${actionArgs.type} -> ${result.success ? 'OK' : 'FAIL'}: ${result.message}`);
          } catch (parseErr: any) {
            actionResults.push({ success: false, message: `خطأ في أداة الذكاء الاصطناعي: ${parseErr.message}` });
            console.error('Tool parse error:', tc.function.arguments);
          }
        }
      }
    }

    // After any successful write actions, append fresh live counts as verification
    const hasSuccessfulWrites = actionResults.some(r => r.success);
    let verificationNote = '';
    if (hasSuccessfulWrites) {
      const freshProductCount = queryAll('SELECT COUNT(*) as cnt FROM products')[0]?.cnt ?? 0;
      const freshCustomerCount = queryAll('SELECT COUNT(*) as cnt FROM customers')[0]?.cnt ?? 0;
      verificationNote = `\n[تحقق مباشر من قاعدة البيانات: ${freshProductCount} منتج، ${freshCustomerCount} عميل]`;
    }

    if (session_id) {
      const userMsg = messages[messages.length - 1];
      if (userMsg) {
        run('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [session_id, 'user', userMsg.content]);
        const assistantContent = actionResults.length > 0
          ? cleanReply + '\n' + actionResults.map(r => r.success ? `✅ ${r.message}` : `❌ ${r.message}`).join('\n') + verificationNote
          : cleanReply;
        run('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [session_id, 'assistant', assistantContent]);
        run('UPDATE chat_sessions SET updated_at = datetime("now","localtime") WHERE id = ?', [session_id]);
      }
    }

    res.json({ reply: cleanReply, actions: actionResults, verificationNote });
  } catch (err: any) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message || 'خطأ في الاتصال بالذكاء الاصطناعي' });
  }
});

export default router;
