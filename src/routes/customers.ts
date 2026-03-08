import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const customerSchema = z.object({
  companyName: z.string().min(1),
  contact: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  position: z.string().optional(),
  source: z.string(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  revenue: z.string().optional(),
  address: z.string().optional(),
  remark: z.string().optional(),
  level: z.enum(['A', 'B', 'C', 'D']).optional().default('C'),
  groupId: z.number().optional()
});

const updateCustomerSchema = customerSchema.partial();

export async function customerRoutes(fastify: FastifyInstance) {
  // Get all customers (with filters)
  fastify.get('/customers', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { 
      search, 
      level, 
      source, 
      industry, 
      groupId,
      tagId,
      page = '1', 
      limit = '20' 
    } = request.query as any;

    const where: any = {};

    // Non-admin users can only see their own customers
    if (user.role !== 'admin') {
      where.ownerId = user.userId;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contact: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (level) where.level = level;
    if (source) where.source = source;
    if (industry) where.industry = industry;
    if (groupId) where.groupId = parseInt(groupId);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          group: true,
          tags: {
            include: {
              tag: true
            }
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.customer.count({ where })
    ]);

    // Filter by tag if specified
    let filteredCustomers = customers;
    if (tagId) {
      filteredCustomers = customers.filter(c => 
        c.tags.some(t => t.tagId === parseInt(tagId))
      );
    }

    return {
      data: filteredCustomers.map(c => ({
        ...c,
        tags: c.tags.map(t => t.tag)
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    };
  });

  // Get customer by ID
  fastify.get('/customers/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = (request as any).user;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        group: true,
        tags: {
          include: {
            tag: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        followUps: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      return reply.status(404).send({ error: '客户不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && customer.ownerId !== user.userId) {
      return reply.status(403).send({ error: '无权限查看此客户' });
    }

    return {
      ...customer,
      tags: customer.tags.map(t => t.tag)
    };
  });

  // Create customer
  fastify.post('/customers', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = customerSchema.parse(request.body);

    // Generate customer number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.customer.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0))
        }
      }
    });
    const customerNo = `KH-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        ...body,
        ownerId: user.userId
      },
      include: {
        group: true,
        tags: {
          include: {
            tag: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return {
      ...customer,
      tags: customer.tags.map(t => t.tag)
    };
  });

  // Update customer
  fastify.put('/customers/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = (request as any).user;
    const body = updateCustomerSchema.parse(request.body);

    const existing = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return reply.status(404).send({ error: '客户不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && existing.ownerId !== user.userId) {
      return reply.status(403).send({ error: '无权限编辑此客户' });
    }

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: body,
      include: {
        group: true,
        tags: {
          include: {
            tag: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return {
      ...customer,
      tags: customer.tags.map(t => t.tag)
    };
  });

  // Delete customer
  fastify.delete('/customers/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = (request as any).user;

    const existing = await prisma.customer.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return reply.status(404).send({ error: '客户不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && existing.ownerId !== user.userId) {
      return reply.status(403).send({ error: '无权限删除此客户' });
    }

    await prisma.customer.delete({
      where: { id: parseInt(id) }
    });

    return { message: '删除成功' };
  });
}
