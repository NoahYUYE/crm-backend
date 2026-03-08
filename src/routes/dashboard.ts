import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard stats
  fastify.get('/dashboard', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const customerWhere: any = {};
    if (user.role !== 'admin') {
      customerWhere.ownerId = user.userId;
    }

    // Total customers
    const totalCustomers = await prisma.customer.count({ where: customerWhere });

    // New customers today
    const newToday = await prisma.customer.count({
      where: {
        ...customerWhere,
        createdAt: { gte: today }
      }
    });

    // New customers this week
    const newThisWeek = await prisma.customer.count({
      where: {
        ...customerWhere,
        createdAt: { gte: weekAgo }
      }
    });

    // New customers this month
    const newThisMonth = await prisma.customer.count({
      where: {
        ...customerWhere,
        createdAt: { gte: monthAgo }
      }
    });

    // Customers by level
    const customersByLevel = await prisma.customer.groupBy({
      by: ['level'],
      where: customerWhere,
      _count: true
    });

    // Customers by source
    const customersBySource = await prisma.customer.groupBy({
      by: ['source'],
      where: customerWhere,
      _count: true
    });

    // Recent follow-ups
    const recentFollowUps = await prisma.followUp.findMany({
      where: user.role !== 'admin' 
        ? { createdById: user.userId }
        : {},
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contact: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Upcoming follow-ups
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        ...(user.role !== 'admin' ? { createdById: user.userId } : {}),
        nextFollowUp: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contact: true
          }
        }
      },
      orderBy: { nextFollowUp: 'asc' },
      take: 5
    });

    // Overdue follow-ups (past due)
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        ...(user.role !== 'admin' ? { createdById: user.userId } : {}),
        nextFollowUp: {
          lt: now
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contact: true
          }
        }
      },
      orderBy: { nextFollowUp: 'asc' },
      take: 5
    });

    // All customers with upcoming/overdue for timeline
    const customersWithFollowUps = await prisma.customer.findMany({
      where: customerWhere,
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    // Calculate recent activity (customers updated in last 7 days)
    const recentlyActive = customersWithFollowUps.filter(c => {
      const lastFollowUp = c.followUps[0];
      if (!lastFollowUp) return false;
      const followUpDate = new Date(lastFollowUp.createdAt);
      return followUpDate >= weekAgo;
    }).length;

    return {
      stats: {
        totalCustomers,
        newToday,
        newThisWeek,
        newThisMonth,
        recentlyActive
      },
      customersByLevel: customersByLevel.map(c => ({
        level: c.level,
        count: c._count
      })),
      customersBySource: customersBySource.map(c => ({
        source: c.source,
        count: c._count
      })),
      recentFollowUps,
      upcomingFollowUps,
      overdueFollowUps
    };
  });
}
