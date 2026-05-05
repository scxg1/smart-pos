import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne, queryAll, run } from '../db';
import { authenticate, AuthRequest, JWT_SECRET } from '../middleware/auth';
const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const payload = { id: user.id, username: user.username, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  return res.json({ token, user: payload });
});

router.get('/me', authenticate, (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user!.id]);
  if (!user) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  const valid = bcrypt.compareSync(currentPassword, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user!.id]);

  return res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

router.get('/users', authenticate, (req: AuthRequest, res) => {
  if (req.user!.role !== 'مدير') {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  const users = queryAll('SELECT id, username, role, display_name, created_at FROM users ORDER BY id');
  return res.json(users);
});

router.post('/users', authenticate, (req: AuthRequest, res) => {
  if (req.user!.role !== 'مدير') {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  const { username, password, role, display_name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  run('INSERT INTO users (username, password, role, display_name) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, role || 'كاشير', display_name || '']);
  return res.json({ success: true, message: 'تم إضافة المستخدم' });
});

router.delete('/users/:id', authenticate, (req: AuthRequest, res) => {
  if (req.user!.role !== 'مدير') {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  const id = Number(req.params.id);
  if (id === req.user!.id) {
    return res.status(400).json({ error: 'لا يمكنك حذف حسابك' });
  }
  run('DELETE FROM users WHERE id = ?', [id]);
  return res.json({ success: true, message: 'تم حذف المستخدم' });
});

export default router;
