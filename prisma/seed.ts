import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

// Use the correct database path - prisma creates it in the project root
const dbPath = '/workspace/crm-backend/dev.db';
console.log('Database path:', dbPath);

const adapter = new PrismaLibSql({
  url: `file:${dbPath}`
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      email: 'admin@crm.com',
      password: adminPassword,
      name: '管理员',
      role: 'admin'
    }
  });

  // Create member user
  const memberPassword = await bcrypt.hash('member123', 10);
  const member = await prisma.user.upsert({
    where: { email: 'member@crm.com' },
    update: {},
    create: {
      email: 'member@crm.com',
      password: memberPassword,
      name: '销售员',
      role: 'member'
    }
  });

  console.log('Created users:', { admin: admin.email, member: member.email });

  // Create tags (use create for new, skip if exists)
  const existingTags = await prisma.tag.findMany();
  
  if (existingTags.length === 0) {
    await prisma.tag.createMany({
      data: [
        { name: '重点客户', color: '#EF4444' },
        { name: '潜在客户', color: '#F59E0B' },
        { name: '长期合作', color: '#10B981' },
        { name: '高意向', color: '#8B5CF6' }
      ]
    });
  }

  const tags = await prisma.tag.findMany();
  console.log('Created tags:', tags.map(t => t.name));

  // Create groups
  const existingGroups = await prisma.customerGroup.findMany();
  
  if (existingGroups.length === 0) {
    await prisma.customerGroup.createMany({
      data: [
        { name: '重点跟进', color: '#EF4444', description: '需要重点跟进的客户' },
        { name: '一般客户', color: '#3B82F6', description: '普通客户' },
        { name: '合作伙伴', color: '#10B981', description: '战略合作伙伴' }
      ]
    });
  }

  const groups = await prisma.customerGroup.findMany();
  console.log('Created groups:', groups.map(g => g.name));

  // Create sample customers (only if not exist)
  const existingCustomers = await prisma.customer.findMany();
  
  if (existingCustomers.length === 0) {
    await prisma.customer.createMany({
      data: [
        {
          companyName: '科技有限公司',
          contact: '张三',
          phone: '13800138000',
          email: 'zhangsan@tech.com',
          position: '技术总监',
          source: '线上推广',
          industry: '互联网',
          companySize: '200-500人',
          revenue: '5000万-1亿',
          level: 'A',
          ownerId: admin.id,
          groupId: groups[0].id
        },
        {
          companyName: '实业集团',
          contact: '李四',
          phone: '13800138001',
          email: 'lisi@group.com',
          position: '采购经理',
          source: '展会',
          industry: '制造业',
          companySize: '500人以上',
          revenue: '1亿以上',
          level: 'B',
          ownerId: admin.id,
          groupId: groups[2].id
        },
        {
          companyName: '创新企业',
          contact: '王五',
          phone: '13800138002',
          email: 'wangwu@startup.com',
          position: '创始人',
          source: '朋友推荐',
          industry: '互联网',
          companySize: '50人以下',
          revenue: '1000万以下',
          level: 'C',
          ownerId: member.id,
          groupId: groups[1].id
        }
      ]
    });
  }

  const customers = await prisma.customer.findMany();
  console.log('Created customers:', customers.map(c => c.companyName));

  // Add tags to customers (only if not exist)
  const existingCustomerTags = await prisma.customerTag.findMany();
  
  if (existingCustomerTags.length === 0) {
    await prisma.customerTag.createMany({
      data: [
        { customerId: 1, tagId: tags[0].id },
        { customerId: 2, tagId: tags[2].id }
      ]
    });
  }

  console.log('Added tags to customers');

  // Create follow-ups (only if not exist)
  const existingFollowUps = await prisma.followUp.findMany();
  
  if (existingFollowUps.length === 0) {
    await prisma.followUp.createMany({
      data: [
        {
          customerId: 1,
          type: '电话',
          content: '初次沟通，了解客户需求，客户对我们的产品非常感兴趣，表示会进一步评估。',
          createdById: admin.id
        },
        {
          customerId: 1,
          type: '面谈',
          content: '上门拜访，展示产品Demo，客户反馈积极，希望安排下次方案演示。',
          nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdById: admin.id
        },
        {
          customerId: 2,
          type: '邮件',
          content: '发送产品资料和报价单，客户表示需要内部讨论。',
          createdById: admin.id
        }
      ]
    });
  }

  console.log('Created follow-ups');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
