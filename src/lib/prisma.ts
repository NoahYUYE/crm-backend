import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Use the correct database path - prisma creates it in the project root
const dbPath = '/workspace/crm-backend/dev.db';

const adapter = new PrismaLibSql({
  url: `file:${dbPath}`
});

const prisma = new PrismaClient({ adapter });

export default prisma;
