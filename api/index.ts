import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'crm-secret-key-2026';

// In-memory database
const users = [
  { id: 1, email: 'admin@crm.com', password: bcrypt.hashSync('admin123', 10), name: 'Admin', role: 'admin' },
  { id: 2, email: 'member@crm.com', password: bcrypt.hashSync('member123', 10), name: 'Member', role: 'member' }
];

const customers = [
  { id: 1, companyName: '阿里巴巴', contact: '张三', phone: '13800138000', email: 'zhangsan@alibaba.com', source: '官网', industry: '电商', level: 'A', ownerId: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 2, companyName: '腾讯科技', contact: '李四', phone: '13900139000', source: '展会', industry: '互联网', level: 'B', ownerId: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 3, companyName: '字节跳动', contact: '王五', phone: '13700137000', source: '推荐', industry: '互联网', level: 'A', ownerId: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const tags = [
  { id: 1, name: '重点客户', color: '#EF4444', createdAt: new Date().toISOString() },
  { id: 2, name: '潜在客户', color: '#3B82F6', createdAt: new Date().toISOString() },
  { id: 3, name: '已签约', color: '#10B981', createdAt: new Date().toISOString() }
];

const groups = [
  { id: 1, name: '大客户', color: '#7C3AED', description: '重要客户', createdAt: new Date().toISOString() },
  { id: 2, name: '中小客户', color: '#3B82F6', createdAt: new Date().toISOString() }
];

let nextId = { users: 3, customers: 4, tags: 4, groups: 3 };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Parse body for POST/PUT
    let body = {};
    if (method === 'POST' || method === 'PUT') {
      body = await req.json();
    }

    // Auth
    if (path === '/api/login' && method === 'POST') {
      const { email, password } = body as any;
      const user = users.find(u => u.email === email);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }), { headers });
    }

    if (path === '/api/register' && method === 'POST') {
      const { email, password, name, role } = body as any;
      if (users.find(u => u.email === email)) {
        return new Response(JSON.stringify({ error: 'Email already exists' }), { status: 400, headers });
      }
      const user = { id: nextId.users++, email, password: bcrypt.hashSync(password, 10), name, role: role || 'member' };
      users.push(user);
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }), { headers });
    }

    // Check auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }
    const token = authHeader.replace('Bearer ', '');
    let user;
    try {
      user = jwt.verify(token, JWT_SECRET) as any;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
    }

    // /api/me
    if (path === '/api/me' && method === 'GET') {
      const u = users.find(u => u.id === user.id);
      return new Response(JSON.stringify(u ? { id: u.id, email: u.email, name: u.name, role: u.role } : {}), { headers });
    }

    // /api/customers
    if (path === '/api/customers' && method === 'GET') {
      const { search, level, source, industry, page = '1', limit = '20' } = Object.fromEntries(url.searchParams);
      let result = customers.filter(c => c.ownerId === user.id);
      if (search) { const s = (search as string).toLowerCase(); result = result.filter(c => c.companyName.toLowerCase().includes(s) || c.contact.toLowerCase().includes(s)); }
      if (level) result = result.filter(c => c.level === level);
      if (source) result = result.filter(c => c.source === source);
      if (industry) result = result.filter(c => c.industry === industry);
      const start = (parseInt(page) - 1) * parseInt(limit);
      return new Response(JSON.stringify({ data: result.slice(start, start + parseInt(limit)), total: result.length }), { headers });
    }

    if (path === '/api/customers' && method === 'POST') {
      const customer = { id: nextId.customories++, ...body, ownerId: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      customers.push(customer as any);
      return new Response(JSON.stringify(customer), { status: 201, headers });
    }

    // /api/customers/:id
    const customerMatch = path.match(/^\/api\/customers\/(\d+)$/);
    if (customerMatch) {
      const id = parseInt(customerMatch[1]);
      if (method === 'GET') {
        const c = customers.find(c => c.id === id && c.ownerId === user.id);
        return new Response(JSON.stringify(c || {}), { headers });
      }
      if (method === 'PUT') {
        const idx = customers.findIndex(c => c.id === id && c.ownerId === user.id);
        if (idx >= 0) { customers[idx] = { ...customers[idx], ...body, updatedAt: new Date().toISOString() }; return new Response(JSON.stringify(customers[idx]), { headers }); }
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
      }
      if (method === 'DELETE') {
        const idx = customers.findIndex(c => c.id === id && c.ownerId === user.id);
        if (idx >= 0) { customers.splice(idx, 1); return new Response(JSON.stringify({ success: true }), { headers }); }
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
      }
    }

    // /api/tags
    if (path === '/api/tags' && method === 'GET') return new Response(JSON.stringify(tags), { headers });
    if (path === '/api/tags' && method === 'POST') {
      const tag = { id: nextId.tags++, ...body, createdAt: new Date().toISOString() };
      tags.push(tag as any);
      return new Response(JSON.stringify(tag), { status: 201, headers });
    }

    // /api/groups
    if (path === '/api/groups' && method === 'GET') return new Response(JSON.stringify(groups), { headers });
    if (path === '/api/groups' && method === 'POST') {
      const group = { id: nextId.groups++, ...body, createdAt: new Date().toISOString() };
      groups.push(group as any);
      return new Response(JSON.stringify(group), { status: 201, headers });
    }

    // /api/dashboard
    if (path === '/api/dashboard' && method === 'GET') {
      const userCustomers = customers.filter(c => c.ownerId === user.id);
      const levelStats = Object.entries(userCustomers.reduce((acc: any, c) => { acc[c.level] = (acc[c.level] || 0) + 1; return acc; }, {})).map(([level, count]) => ({ level, count }));
      const sourceStats = Object.entries(userCustomers.reduce((acc: any, c) => { acc[c.source] = (acc[c.source] || 0) + 1; return acc; }, {})).map(([source, count]) => ({ source, count }));
      return new Response(JSON.stringify({ totalCustomers: userCustomers.length, levelStats, sourceStats, recentCustomers: userCustomers.slice(0, 5) }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}
