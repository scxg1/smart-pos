import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run, getDb, scheduleSave, buildAIContext, invalidateAIMemory } from '../db';

const router = Router();

const ZAI_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const ZAI_KEY = process.env.ZAI_API_KEY;

async function callZAI(messages: any[]): Promise<string> {
  const res = await fetch(`${ZAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZAI_KEY}`
    },
    body: JSON.stringify({ model: 'glm-5.1', messages, max_tokens: 600, temperature: 0.5 })
  });
  const data = await res.json();
  if (data.choices && data.choices[0]) {
    return data.choices[0].message.content;
  }
  throw new Error(data.error?.message || 'Z.AI API error');
}

const SYSTEM_PROMPT = `أنت مدير نظام نقطة البيع الذكي. لديك صلاحيات كاملة.

═══ قواعد الرد ═══
- أجب بالعربية فقط
- تحدث بلباقة وقدم التفاصيل عند الحاجة. لا تكن مطولاً جداً لكن أعطِ إجابة كافية ومفيدة.
- يمكنك تحليل الملفات والبيانات وتقديم رؤى تفصيلية.
- لا تضع مقدمات أو خاتمات غير ضرورية
- استخدم ج.م للعملة
- عند عرض أرقام، اكتبها مباشرة بدون شرح طويل`;

function executeAction(action: any): { success: boolean; message: string; data?: any } {
  try {
    switch (action.type) {
      case 'add_product': {
        const { name, category, barcode, cost_price, selling_price, stock, unit, image_keyword } = action.data;
        if (!name || selling_price === undefined) {
          return { success: false, message: 'اسم المنتج وسعر البيع مطلوبان' };
        }
        const imagePath = image_keyword ? `https://tse1.mm.bing.net/th?q=${encodeURIComponent(image_keyword + ' product')}&w=400&h=400&c=7&rs=1&p=0&dpr=3&pid=1.7&mkt=en-US&adlt=moderate` : '';
        run(
          `INSERT INTO products (name, category, barcode, cost_price, selling_price, stock, unit, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, category || 'عام', barcode || '', cost_price || 0, selling_price, stock || 0, unit || 'قطعة', imagePath]
        );
        invalidateAIMemory();
        return { success: true, message: `تم إضافة "${name}" بسعر ${selling_price} ج.م` };
      }
      case 'update_product': {
        const { id, name, category, cost_price, selling_price, stock, unit, image_keyword } = action.data;
        if (!id) return { success: false, message: 'معرف المنتج مطلوب' };

        const current = queryOne(`SELECT * FROM products WHERE id = ?`, [id]);
        if (!current) return { success: false, message: 'المنتج غير موجود' };

        let imgSql = '';
        let imgVal = [];
        if (image_keyword) {
          imgSql = `, image_path = ?`;
          imgVal = [`https://tse1.mm.bing.net/th?q=${encodeURIComponent(image_keyword + ' product')}&w=400&h=400&c=7&rs=1&p=0&dpr=3&pid=1.7&mkt=en-US&adlt=moderate`];
        }

        run(
          `UPDATE products SET 
            name = COALESCE(?, name),
            category = COALESCE(?, category),
            cost_price = COALESCE(?, cost_price),
            selling_price = COALESCE(?, selling_price),
            stock = COALESCE(?, stock),
            unit = COALESCE(?, unit)
            ${imgSql}
           WHERE id = ?`,
          [
            name ?? null, 
            category ?? null, 
            cost_price ?? null, 
            selling_price ?? null, 
            stock ?? null, 
            unit ?? null, 
            ...imgVal, 
            id
          ]
        );
        invalidateAIMemory();
        return { success: true, message: `تم تحديث المنتج بنجاح` };
      }
      case 'delete_product': {
        const { id, name: productName } = action.data;
        const pid = id;
        if (!pid) return { success: false, message: 'رقم أو اسم المنتج مطلوب' };
        const product = queryOne('SELECT * FROM products WHERE id = ?', [pid]);
        if (!product) return { success: false, message: 'المنتج غير موجود' };
        run('DELETE FROM products WHERE id = ?', [pid]);
        invalidateAIMemory();
        return { success: true, message: `تم حذف "${product.name}"` };
      }
      case 'add_customer': {
        const { name, phone } = action.data;
        if (!name) return { success: false, message: 'اسم العميل مطلوب' };
        run('INSERT INTO customers (name, phone, total_purchases) VALUES (?, ?, 0)', [name, phone || '']);
        invalidateAIMemory();
        return { success: true, message: `تم إضافة العميل "${name}"` };
      }
      case 'update_customer': {
        const { id, ...updates } = action.data;
        if (!id) return { success: false, message: 'رقم العميل مطلوب' };
        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
        if (!customer) return { success: false, message: 'العميل غير موجود' };
        const fields: string[] = [];
        const values: any[] = [];
        for (const [key, value] of Object.entries(updates)) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
        if (fields.length === 0) return { success: false, message: 'لا توجد بيانات للتحديث' };
        values.push(id);
        run(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values);
        invalidateAIMemory();
        return { success: true, message: `تم تحديث العميل "${customer.name}"` };
      }
      case 'delete_customer': {
        const { id } = action.data;
        if (!id) return { success: false, message: 'رقم العميل مطلوب' };
        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
        if (!customer) return { success: false, message: 'العميل غير موجود' };
        run('DELETE FROM customers WHERE id = ?', [id]);
        invalidateAIMemory();
        return { success: true, message: `تم حذف العميل "${customer.name}"` };
      }
      case 'update_stock': {
        const { id, stock } = action.data;
        if (!id || stock === undefined) return { success: false, message: 'رقم المنتج والكمية مطلوبان' };
        const product = queryOne('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) return { success: false, message: 'المنتج غير موجود' };
        run('UPDATE products SET stock = ? WHERE id = ?', [stock, id]);
        invalidateAIMemory();
        return { success: true, message: `مخزون "${product.name}" أصبح ${stock}` };
      }
      case 'create_sale': {
        const { items, payment_method, customer_id, discount } = action.data;
        if (!items || !Array.isArray(items) || items.length === 0) {
          return { success: false, message: 'حدد المنتجات والكميات' };
        }

        const db = getDb();
        let total = 0;
        let cost_total = 0;
        const saleItems: any[] = [];

        for (const item of items) {
          const product = queryOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
          if (!product) return { success: false, message: `المنتج رقم ${item.product_id} غير موجود` };
          if (product.stock < (item.quantity || 1)) {
            return { success: false, message: `"${product.name}" المخزون غير كافٍ (${product.stock} متاح)` };
          }

          const qty = item.quantity || 1;
          const unit_price = product.selling_price;
          const cost_price = product.cost_price;
          const subtotal = unit_price * qty;
          total += subtotal;
          cost_total += cost_price * qty;
          saleItems.push({ product_id: product.id, name: product.name, quantity: qty, unit_price, cost_price, subtotal });
        }

        const discountPct = discount || 0;
        const discountAmount = total * discountPct / 100;
        const afterDiscount = total - discountAmount;
        const taxRate = 0;
        const tax = afterDiscount * taxRate;
        const finalTotal = afterDiscount + tax;
        const profit = finalTotal - cost_total - tax;

        db.run(
          `INSERT INTO sales (customer_id, total, cost_total, profit, discount, tax, payment_method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [customer_id || null, finalTotal, cost_total, profit, discountPct, tax, payment_method || 'نقدي', 'بيع عبر المساعد الذكي']
        );

        const saleResult = db.exec('SELECT last_insert_rowid() as id');
        const saleId = saleResult[0].values[0][0];

        for (const si of saleItems) {
          db.run(
            `INSERT INTO sale_items (sale_id, product_id, name, quantity, unit_price, cost_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [saleId, si.product_id, si.name, si.quantity, si.unit_price, si.cost_price, si.subtotal]
          );
          db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [si.quantity, si.product_id]);
        }

        if (customer_id) {
          db.run(`UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?`, [finalTotal, customer_id]);
        }

        scheduleSave();
        invalidateAIMemory();

        const itemsSummary = saleItems.map(si => `${si.name} ×${si.quantity}`).join('، ');
        return {
          success: true,
          message: `تم البيع: ${itemsSummary} — الإجمالي ${finalTotal.toFixed(2)} ج.م (فاتورة #${Number(saleId) + 1000})`,
          data: { saleId, total: finalTotal, items: saleItems }
        };
      }
      default:
        return { success: false, message: 'نوع الإجراء غير معروف' };
    }
  } catch (err: any) {
    return { success: false, message: `خطأ: ${err.message}` };
  }
}

router.get('/test', async (_req: Request, res: Response) => {
  try {
    const reply = await callZAI([
      { role: 'user', content: 'قل مرحباً بكلمة واحدة' }
    ]);
    res.json({ success: true, message: reply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/insights', async (req: Request, res: Response) => {
  try {
    const { period } = req.body;
    const context = buildAIContext();

    const reply = await callZAI([
      { role: 'system', content: `أنت محلل مبيعات. لديك:\n\n${context}\n\nقدم 3 رؤى مختصرة جداً. كل رؤية في سطر واحد فقط.` },
      { role: 'user', content: `حلل مبيعات ${period === 'today' ? 'اليوم' : period === 'week' ? 'الأسبوع' : 'الشهر'}` }
    ]);

    const insights = reply.split('\n').filter((l: string) => l.trim()).map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').trim()).slice(0, 3);
    res.json({ insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upsell', async (req: Request, res: Response) => {
  try {
    const { cartItems } = req.body;
    const itemsStr = cartItems.map((i: any) => `${i.name} (${i.category})`).join('، ');

    const reply = await callZAI([
      { role: 'system', content: 'أنت بائع. أجب بجملة واحدة فقط.' },
      { role: 'user', content: `سلة: ${itemsStr}. اقترح منتجاً إضافياً.` }
    ]);

    res.json({ suggestion: reply.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forecast', async (req: Request, res: Response) => {
  try {
    const { productId } = req.body;
    const product = queryAll(`SELECT name, stock FROM products WHERE id = ?`, [productId])[0];
    const salesData = queryAll(`
      SELECT DATE(s.created_at) as date, SUM(si.quantity) as qty
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id = ? AND s.created_at >= datetime('now','localtime','-30 days')
      GROUP BY DATE(s.created_at) ORDER BY date
    `, [productId]);

    const reply = await callZAI([
      { role: 'system', content: 'أجب بإيجاز في جملتين فقط.' },
      { role: 'user', content: `بيانات: ${JSON.stringify({ product, sales: salesData })}. كم يوم سيكفي المخزون؟` }
    ]);

    res.json({ forecast: reply.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', (_req: Request, res: Response) => {
  try {
    const sessions = queryAll(`
      SELECT s.*, (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as msg_count
      FROM chat_sessions s ORDER BY updated_at DESC
    `);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions', (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    run('INSERT INTO chat_sessions (title) VALUES (?)', [title || 'محادثة جديدة']);
    const session = queryAll('SELECT * FROM chat_sessions ORDER BY id DESC LIMIT 1')[0];
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/sessions/:id', (req: Request, res: Response) => {
  try {
    run('UPDATE chat_sessions SET title = ?, updated_at = datetime("now","localtime") WHERE id = ?',
      [req.body.title, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sessions/:id', (req: Request, res: Response) => {
  try {
    run('DELETE FROM chat_messages WHERE session_id = ?', [req.params.id]);
    run('DELETE FROM chat_sessions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id/messages', (req: Request, res: Response) => {
  try {
    const messages = queryAll(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC',
      [req.params.id]
    );
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, session_id } = req.body as {
      messages: { role: string; content: string }[];
      session_id?: number;
    };

    const context = buildAIContext();
    const products = queryAll('SELECT id, name, selling_price, cost_price, stock, category, unit FROM products ORDER BY name');
    const customers = queryAll('SELECT id, name, phone, total_purchases FROM customers ORDER BY name');

    const systemPrompt = `${SYSTEM_PROMPT}

═══ بيانات المتجر ═══
${context}

═══ المنتجات ═══
${JSON.stringify(products.slice(0, 200), null, 0)}

═══ العملاء ═══
${JSON.stringify(customers.slice(0, 100), null, 0)}

═══ الإجراءات ═══
عندما يطلب المستخدم إجراءً، ضع JSON بين [ACTION] و [/ACTION]:

أنواع الإجراءات:
1. add_product: {name, category?, barcode?, cost_price?, selling_price, stock?, unit?, image_keyword?: "كلمة باللغة الإنجليزية حصراً تصف المنتج للبحث عن صورة"}
2. update_product: {id, name?, category?, cost_price?, selling_price?, stock?, unit?, image_keyword?: "كلمة باللغة الإنجليزية حصراً تصف المنتج للبحث عن صورة"}
3. delete_product: {id}
4. add_customer: {name, phone?}
5. update_customer: {id, name?, phone?}
6. delete_customer: {id}
7. update_stock: {id, stock}
8. create_sale: {items: [{product_id, quantity}], payment_method?, customer_id?, discount?}

أمثلة:
- "أضف حليب بسعر 15" → [ACTION]{"type":"add_product","data":{"name":"حليب","selling_price":15,"cost_price":10,"stock":50,"image_keyword":"milk"}}[/ACTION]
- "تعديل صورة الرز" → [ACTION]{"type":"update_product","data":{"id":RICE_ID,"image_keyword":"rice"}}[/ACTION]
- "بيع قهوة 2" → [ACTION]{"type":"create_sale","data":{"items":[{"product_id":PRODUCT_ID,"quantity":2}],"payment_method":"نقدي"}}[/ACTION]
- "تم بيع شاي 3 وفطير 1" → [ACTION]{"type":"create_sale","data":{"items":[{"product_id":TEA_ID,"quantity":3},{"product_id":PIE_ID,"quantity":1}]}}[/ACTION]
- "احذف المنتج رقم 5" → [ACTION]{"type":"delete_product","data":{"id":5}}[/ACTION]
- "احذف العميل رقم 3" → [ACTION]{"type":"delete_customer","data":{"id":3}}[/ACTION]
- "أضف عميل اسمه أحمد" → [ACTION]{"type":"add_customer","data":{"name":"أحمد","phone":""}}[/ACTION]

مهم جداً لعمليات البيع:
- ابحث عن المنتج بالاسم في قائمة المنتجات أعلاه واستخدم الـ id الخاص به
- إذا لم تجد المنتج، أخبر المستخدم أن المنتج غير موجود
- كن دقيقاً في الأرقام`;

    const reply = await callZAI([
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10),
    ]);

    let actionResults: any[] = [];
    let cleanReply = reply;

    const actionRegex = /\[ACTION\](.*?)\[\/ACTION\]/gs;
    const actionMatches = reply.match(actionRegex);

    if (actionMatches) {
      for (const match of actionMatches) {
        const jsonStr = match.replace('[ACTION]', '').replace('[/ACTION]', '').trim();
        try {
          const action = JSON.parse(jsonStr);
          const result = executeAction(action);
          actionResults.push(result);
        } catch (e) {
          actionResults.push({ success: false, message: 'خطأ في تحليل الإجراء' });
        }
      }
      cleanReply = reply.replace(actionRegex, '').trim();
    }

    if (session_id) {
      const userMsg = messages[messages.length - 1];
      if (userMsg) {
        run('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
          [session_id, 'user', userMsg.content]);
        const assistantContent = actionResults.length > 0
          ? cleanReply + '\n' + actionResults.map(r => r.success ? `✅ ${r.message}` : `❌ ${r.message}`).join('\n')
          : cleanReply;
        run('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)',
          [session_id, 'assistant', assistantContent]);
        run('UPDATE chat_sessions SET updated_at = datetime("now","localtime") WHERE id = ?', [session_id]);
      }
    }

    res.json({ reply: cleanReply, actions: actionResults });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
