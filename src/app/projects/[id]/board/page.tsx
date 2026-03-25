import { PrismaClient } from '@prisma/client';
import { Board } from '@/components/board/Board';
import { Task, ListData } from '@/components/board/types';
import { notFound } from 'next/navigation';

const prisma = new PrismaClient();

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;

  const project = await prisma.projects.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    notFound();
  }

  // Fetch tasks directly since taskList is gone. We'll derive columns from status.
  const rawTasks = await prisma.tasks.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'asc' },
    include: {
      task_labels: { include: { labels: true } },
      task_checklists: { include: { task_checklist_items: { orderBy: { position: 'asc' } } } },
      task_comments: { orderBy: { created_at: 'asc' } },
      task_attachments: true
    }
  });

  const lists = [
    { id: 'list_ideas', name: 'Ideas', position: 0, tasks: rawTasks.filter(t => t.status === 'ideas') },
    { id: 'list_pending', name: 'Pending', position: 1, tasks: rawTasks.filter(t => t.status === 'pending') },
    { id: 'list_in_progress', name: 'In Progress', position: 2, tasks: rawTasks.filter(t => t.status === 'in_progress') },
    { id: 'list_under_review', name: 'Under Review', position: 3, tasks: rawTasks.filter(t => t.status === 'under_review') },
    { id: 'list_completed', name: 'Completed', position: 4, tasks: rawTasks.filter(t => t.status === 'completed') },
    { id: 'list_blocked', name: 'Blocked', position: 5, tasks: rawTasks.filter(t => t.status === 'blocked') }
  ];

  const labels = await prisma.labels.findMany({
    where: { project_id: projectId }
  });

  // Preload default labels for new projects if empty
  if (labels.length === 0) {
    const defaultLabels = [
      { name: '> 30 Minutes', color: '#10b981', workspace_id: project.workspace_id },
      { name: '30 min - 1 Hour', color: '#eab308', workspace_id: project.workspace_id },
      { name: '1-3 Hours', color: '#f97316', workspace_id: project.workspace_id },
      { name: '3-5 Hours', color: '#ea580c', workspace_id: project.workspace_id },
      { name: '1 Day', color: '#ef4444', workspace_id: project.workspace_id },
      { name: '2+ Days', color: '#b91c1c', workspace_id: project.workspace_id }
    ];
    await prisma.labels.createMany({
      data: defaultLabels.map(l => ({ ...l, project_id: projectId }))
    });
    // Re-fetch
    labels.push(...(await prisma.labels.findMany({ where: { project_id: projectId } })));
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
