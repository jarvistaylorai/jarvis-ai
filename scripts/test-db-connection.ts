/**
 * Test Database Connection
 * Verifies the pooled connection is working
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection(): Promise<void> {
  console.log('Testing database connection...\n');
  
  try {
    // Test basic query
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW()`;
    const serverTime = result?.[0]?.now ?? 'unknown';
    console.log('✓ Database connected successfully');
    console.log('  Server time:', serverTime);
    
    // Test agent count
    const agentCount = await prisma.agents.count();
    console.log(`✓ Agents table accessible: ${agentCount} agents found`);
    
    // Test task count
    const taskCount = await prisma.tasks.count();
    console.log(`✓ Tasks table accessible: ${taskCount} tasks found`);
    
    // Test project count
    const projectCount = await prisma.projects.count();
    console.log(`✓ Projects table accessible: ${projectCount} projects found`);
    
    console.log('\n✅ All database connections working!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
