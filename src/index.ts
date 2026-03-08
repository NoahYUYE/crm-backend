import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth';
import { customerRoutes } from './routes/customers';
import { tagRoutes, groupRoutes } from './routes/tags';
import { followUpRoutes } from './routes/followups';
import { dashboardRoutes } from './routes/dashboard';

const fastify = Fastify({
  logger: true
});

// Register CORS
fastify.register(cors, {
  origin: true,
  credentials: true
});

// Register routes
fastify.register(authRoutes, { prefix: '/api' });
fastify.register(customerRoutes, { prefix: '/api' });
fastify.register(tagRoutes, { prefix: '/api' });
fastify.register(groupRoutes, { prefix: '/api' });
fastify.register(followUpRoutes, { prefix: '/api' });
fastify.register(dashboardRoutes, { prefix: '/api' });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
