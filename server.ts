import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'crm-secret-key-2026';
const PORT = process.env.PORT || 3001;

// In-memory database
interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

interface Customer {
  id: number;
  companyName: string;
  contact: string;
  phone: string;
  email?: string;
  position?: string;
  source: string;
  industry?: string;
  companySize?: string;
  revenue?: string;
  address?: string;
  remark?: string;
  level: string;
  ownerId: number;
  groupId?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: Date;
}

interface CustomerGroup {
  id: number;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
}

// Seed data
let users: User[] = [
  { id: 1, email: 'admin@crm.com', password: bcrypt.hashSync('admin123', 10), name: 'Admin', role: 'admin' },
  { id: 2, email: 'member@crm.com', password: bcrypt.hashSync('member123', 10), name: 'Member', role: 'member' }
];

let customers: Customer[] = [
  { id: 1, companyName: '阿里巴巴', contact: '张三', phone: '13800138000', email: 'zhangsan@alibaba.com', source: '官网', industry: '电商', level: 'A', ownerId: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, companyName: '腾讯科技', contact: '李四', phone: '13900139000', source: '展会', industry: '互联网', level: 'B', ownerId: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, companyName: '字节跳动', contact: '王五', phone: '13700137000', source: '推荐', industry: '互联网', level: 'A', ownerId: 1, createdAt: new Date(), updatedAt: new Date() }
];

let tags: Tag[] = [
  { id: 1, name: '重点客户', color: '#EF4444', createdAt: new Date() },
  { id: 2, name: '潜在客户', color: '#3B82F6', createdAt: new Date() },
  { id: 3, name: '已签约', color: '#10B981', createdAt: new Date() }
];

let groups: CustomerGroup[] = [
  { id: 1, name: '大客户', color: '#7C3AED', description: '重要客户', createdAt: new Date() },
  { id: 2, name: '中小客户', color: '#3B82F6', createdAt: new Date() }
];

let nextId = { users: 3, customers: 4, tags: 4, groups: 3 };

// Auth middleware
const auth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/api/register', (req, res) => {
  const { email, password, name, role } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  const user = { id: nextId.users++, email, password: bcrypt.hashSync(password, 10), name, role: role || 'member' };
  users.push(user);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/me', auth, (req: any) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.get('/api/customers', auth, (req: any) => {
  const { search, level, source, industry, page = 1, limit = 20 } = req.query;
  let result = customers.filter(c => c.ownerId === req.user.id);
  
  if (search) {
    const s = (search as string).toLowerCase();
    result = result.filter(c => c.companyName.toLowerCase().includes(s) || c.contact.toLowerCase().includes(s));
  }
  if (level) result = result.filter(c => c.level === level);
  if (source) result = result.filter(c => c.source === source);
  if (industry) result = result.filter(c => c.industry === industry);
  
  const start = (parseInt(page as string) - 1) * parseInt(limit as string);
  res.json({ data: result.slice(start, start + parseInt(limit as string)), total: result.length });
});

app.post('/api/customers', auth, (req, res) => {
  const customer = { 
    id: nextId.customers++, 
    ...req.body, 
    ownerId: req.user.id, 
    createdAt: new Date(), 
    updatedAt: new Date() 
  };
  customers.push(customer);
  res.status(201).json(customer);
});

app.get('/api/customers/:id', auth, (req, res) => {
  const customer = customers.find(c => c.id === parseInt(req.params.id) && c.ownerId === req.user.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

app.put('/api/customers/:id', auth, (req, res) => {
  const index = customers.findIndex(c => c.id === parseInt(req.params.id) && c.ownerId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  customers[index] = { ...customers[index], ...req.body, updatedAt: new Date() };
  res.json(customers[index]);
});

app.delete('/api/customers/:id', auth, (req, res) => {
  const index = customers.findIndex(c => c.id === parseInt(req.params.id) && c.ownerId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  customers.splice(index, 1);
  res.json({ success: true });
});

app.get('/api/tags', auth, (req, res) => res.json(tags));
app.post('/api/tags', auth, (req, res) => {
  const tag = { id: nextId.tags++, ...req.body, createdAt: new Date() };
  tags.push(tag);
  res.status(201).json(tag);
});

app.get('/api/groups', auth, (req, res) => res.json(groups));
app.post('/api/groups', auth, (req, res) => {
  const group = { id: nextId.groups++, ...req.body, createdAt: new Date() };
  groups.push(group);
  res.status(201).json(group);
});

app.get('/api/dashboard', auth, (req, res) => {
  const userCustomers = customers.filter(c => c.ownerId === req.user.id);
  const levelStats = Object.entries(userCustomers.reduce((acc, c) => {
    acc[c.level] = (acc[c.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([level, count]) => ({ level, count }));
  const sourceStats = Object.entries(userCustomers.reduce((acc, c) => {
    acc[c.source] = (acc[c.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([source, count]) => ({ source, count }));
  
  res.json({
    totalCustomers: userCustomers.length,
    levelStats,
    sourceStats,
    recentCustomers: userCustomers.slice(0, 5)
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
