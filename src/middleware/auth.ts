import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: '未授权，请先登录' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crm-secret-key-2026') as JWTPayload;
    (request as any).user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Token无效或已过期' });
  }
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'crm-secret-key-2026', {
    expiresIn: '7d'
  });
}
