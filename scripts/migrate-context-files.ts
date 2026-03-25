import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const agentsDir = path.join(process.cwd(), 'agents');
  
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const agentFolders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    console.log(`Found ${agentFolders.length} agent folder(s) in /agents directory: ${agentFolders.join(', ')}`);

    for (const folder of agentFolders) {
      // Find the corresponding agent in the database by handle
      const agent = await prisma.agents.findFirst({
        where: { handle: folder },
      });

      if (!agent) {
        console.warn(`WARNING: No database agent found matching handle '${folder}'. Skipping folder.`);
        continue;
      }

      console.log(`Migrating files for agent '${folder}' (ID: ${agent.id})...`);

      const folderPath = path.join(agentsDir, folder);
      const files = await fs.readdir(folderPath);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(folderPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Upsert into the new table
        await prisma.agent_context_files.upsert({
          where: {
            agent_id_file_name: {
              agent_id: agent.id,
              file_name: file,
            },
          },
          update: {
            content: content,
          },
          create: {
            agent_id: agent.id,
            file_name: file,
            content: content,
          },
        });
        
        console.log(`  - Migrated ${file}`);
      }
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
