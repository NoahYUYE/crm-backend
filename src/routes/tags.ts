import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().default('#7C3AED')
});

const groupSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().default('#7C3AED'),
  description: z.string().optional()
});

export async function tagRoutes(fastify: FastifyInstance) {
  // Get all tags
  fastify.get('/tags', { preHandler: [authenticate] }, async () => {
    const tags = await prisma.tag.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return tags;
  });

  // Create tag
  fastify.post('/tags', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = tagSchema.parse(request.body);
    
    const tag = await prisma.tag.create({
      data: body
    });
    
    return tag;
  });

  // Update tag
  fastify.put('/tags/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const body = tagSchema.partial().parse(request.body);
    
    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: body
    });
    
    return tag;
  });

  // Delete tag
  fastify.delete('/tags/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    
    await prisma.tag.delete({
      where: { id: parseInt(id) }
    });
    
    return { message: '删除成功' };
  });

  // Add tag to customer
  fastify.post('/customers/:customerId/tags/:tagId', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId, tagId } = request.params as any;
    
    const existing = await prisma.customerTag.findUnique({
      where: {
        customerId_tagId: {
          customerId: parseInt(customerId),
          tagId: parseInt(tagId)
        }
      }
    });

    if (existing) {
      return reply.status(400).send({ error: '标签已存在' });
    }

    await prisma.customerTag.create({
      data: {
        customerId: parseInt(customerId),
        tagId: parseInt(tagId)
      }
    });

    return { message: '添加成功' };
  });

  // Remove tag from customer
  fastify.delete('/customers/:customerId/tags/:tagId', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId, tagId } = request.params as any;
    
    await prisma.customerTag.delete({
      where: {
        customerId_tagId: {
          customerId: parseInt(customerId),
          tagId: parseInt(tagId)
        }
      }
    });

    return { message: '删除成功' };
  });
}

export async function groupRoutes(fastify: FastifyInstance) {
  // Get all groups
  fastify.get('/groups', { preHandler: [authenticate] }, async () => {
    const groups = await prisma.customerGroup.findMany({
      include: {
        _count: {
          select: { customers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return groups;
  });

  // Create group
  fastify.post('/groups', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = groupSchema.parse(request.body);
    
    const group = await prisma.customerGroup.create({
      data: body
    });
    
    return group;
  });

  // Update group
  fastify.put('/groups/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const body = groupSchema.partial().parse(request.body);
    
    const group = await prisma.customerGroup.update({
      where: { id: parseInt(id) },
      data: body
    });
    
    return group;
  });

  // Delete group
  fastify.delete('/groups/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    
    // Remove group from customers first
    await prisma.customer.updateMany({
      where: { groupId: parseInt(id) },
      data: { groupId: null }
    });

    await prisma.customerGroup.delete({
      where: { id: parseInt(id) }
    });
    
    return { message: '删除成功' };
  });
}
