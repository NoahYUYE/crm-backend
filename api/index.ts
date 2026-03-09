import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'crm-secret-key-2026';

const users = [
  { id: 1, email: 'admin@crm.com', password: bcrypt.hashSync('admin123', 10), name: 'Admin', role: 'admin' }
];

const customers = [
  { id: 1, companyName: '阿里巴巴', contact: '张三', phone: '13800138000', source: '官网', level: 'A', ownerId: 1, createdAt: new Date().toISOString() },
  { id: 2, companyName: '腾讯科技', contact: '李四', phone: '13900139000', source: '展会', level: 'B', ownerId: 1, createdAt: new Date().toISOString() }
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;
  const path = url?.split('?')[0] || '/';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Login
    if (path === '/api/login' && method === 'POST') {
      const { email, password } = req.body as any;
      const user = users.find(u => u.email === email);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }

    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = jwt.verify(token, JWT_SECRET) as any;

    // Dashboard
    if (path === '/api/dashboard' && method === 'GET') {
      return res.status(200).json({ totalCustomers: customers.length, levelStats: [], sourceStats: [], recentCustomers: customers });
    }

    // Customers
    if (path === '/api/customers' && method === 'GET') {
      return res.status(200).json({ data: customers, total: customers.length });
    }

    // Tags & Groups
    if (path === '/api/tags' && method === 'GET') {
      return res.status(200).json([{ id: 1, name: '重点客户', color: '#EF4444' }]);
    }
    if (path === '/api/groups' && method === 'GET') {
      return res.status(200).json([{ id: 1, name: '大客户', color: '#7C3AED' }]);
    }
    if (path === '/api/me' && method === 'GET') {
      return res.status(200).json({ id: user.id, email: user.email, name: 'Admin', role: user.role });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
