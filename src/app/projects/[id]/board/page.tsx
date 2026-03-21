import { PrismaClient } from '@prisma/client';
import { Board } from '@/components/board/Board';
import { Task, ListData } from '@/components/board/types';
import { notFound } from 'next/navigation';

const prisma = new PrismaClient();

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    notFound();
  }

  // Fetch lists with nested tasks, labels, etc.
  const lists = await prisma.taskList.findMany({
    where: { project_id: projectId },
    orderBy: { position: 'asc' },
    include: {
      tasks: {
        orderBy: { position: 'asc' },
        include: {
          labels: { include: { label: true } },
          checklists: { include: { items: { orderBy: { position: 'asc' } } } },
          comments: { orderBy: { created_at: 'asc' } },
          attachments: true
        }
      }
    }
  });

  const labels = await prisma.taskLabel.findMany({
    where: { project_id: projectId }
  });

  // Preload default labels for new projects if empty
  if (labels.length === 0) {
    const defaultLabels = [
      { name: '> 30 Minutes', color: '#10b981' },   // green
      { name: '30 min - 1 Hour', color: '#eab308' }, // yellow
      { name: '1-3 Hours', color: '#f97316' },       // orange
      { name: '3-5 Hours', color: '#ea580c' },       // dark orange
      { name: '1 Day', color: '#ef4444' },           // light red
      { name: '2+ Days', color: '#b91c1c' }          // red
    ];
    await prisma.taskLabel.createMany({
      data: defaultLabels.map(l => ({ ...l, project_id: projectId }))
    });
    // Re-fetch
    labels.push(...(await prisma.taskLabel.findMany({ where: { project_id: projectId } })));
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">{project.name} Board</h1>
          <p className="text-sm text-slate-400">Manage tasks and workflow</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-xs font-bold">U</div>
             <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-600 flex items-center justify-center text-xs font-bold">A</div>
           </div>
           <button className="bg-slate-800 hover:bg-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
             Share
           </button>
        </div>
      </header>

      {/* Board Client Component */}
      <Board 
        initialLists={lists as unknown as ListData[]} 
        projectId={projectId} 
        onTaskClick={() => {}} // Board.tsx will handle opening modals internally if we refactor, but wait, TaskModal isn't integrated yet.
      />
    </div>
  );
}
