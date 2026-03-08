import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';

const followUpSchema = z.object({
  type: z.enum(['电话', '邮件', '面谈', '微信', '会议', '其他']),
  content: z.string().min(1),
  nextFollowUp: z.string().optional()
});

export async function followUpRoutes(fastify: FastifyInstance) {
  // Get follow-ups for a customer
  fastify.get('/customers/:customerId/followups', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request.params as any;
    const user = (request as any).user;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return reply.status(404).send({ error: '客户不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && customer.ownerId !== user.userId) {
      return reply.status(403).send({ error: '无权限查看此客户的跟进记录' });
    }

    const followUps = await prisma.followUp.findMany({
      where: { customerId: parseInt(customerId) },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return followUps;
  });

  // Create follow-up
  fastify.post('/customers/:customerId/followups', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request.params as any;
    const user = (request as any).user;
    const body = followUpSchema.parse(request.body);

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return reply.status(404).send({ error: '客户不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && customer.ownerId !== user.userId) {
      return reply.status(403).send({ error: '无权限添加跟进记录' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        customerId: parseInt(customerId),
        type: body.type,
        content: body.content,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
        createdById: user.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update customer's updatedAt to reflect recent activity
    await prisma.customer.update({
      where: { id: parseInt(customerId) },
      data: { updatedAt: new Date() }
    });

    return followUp;
  });

  // Update follow-up
  fastify.put('/followups/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = (request as any).user;
    const body = followUpSchema.partial().parse(request.body);

    const existing = await prisma.followUp.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true }
    });

    if (!existing) {
      return reply.status(404).send({ error: '跟进记录不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && existing.createdById !== user.userId) {
      return reply.status(403).send({ error: '无权限编辑此跟进记录' });
    }

    const followUp = await prisma.followUp.update({
      where: { id: parseInt(id) },
      data: {
        ...body,
        nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return followUp;
  });

  // Delete follow-up
  fastify.delete('/followups/:id', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = (request as any).user;

    const existing = await prisma.followUp.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return reply.status(404).send({ error: '跟进记录不存在' });
    }

    // Check permission
    if (user.role !== 'admin' && existing.createdById !== user.userId) {
      return reply.status(403).send({ error: '无权限删除此跟进记录' });
    }

    await prisma.followUp.delete({
      where: { id: parseInt(id) }
    });

    return { message: '删除成功' };
  });
}
