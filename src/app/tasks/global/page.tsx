import { PrismaClient } from '@prisma/client';
import { GlobalTaskList } from '@/components/tasks/GlobalTaskList';

const prisma = new PrismaClient();

export default async function GlobalTasksPage() {
  // Fetch all tasks with their project details, labels, etc.
  const tasks = await prisma.task.findMany({
    include: {
      project: true,
      labels: { include: { label: true } },
      checklists: { include: { items: true } },
      comments: true,
      attachments: true,
    },
    orderBy: {
      id: 'desc'
    }
  });

  const projects = await prisma.project.findMany({
    select: { id: true, name: true }
  });

  const labels = await prisma.taskLabel.findMany({
    distinct: ['name']
  });

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 p-6 overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Global Tasks</h1>
        <p className="text-sm text-slate-400">View and filter tasks across all projects</p>
      </header>

      {/* GlobalTaskList handles the client-side filtering and rendering */}
      <GlobalTaskList initialTasks={tasks} projects={projects} allLabels={labels} />
    </div>
  );
}
