'use client';

import React, { useState, useMemo } from 'react';
import { CheckSquare, MessageSquare, Paperclip, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { Agent, Task, Project, Alert, TelemetryEvent } from '@/types/contracts';

interface GlobalTaskListProps {
  initialTasks: unknown[];
  projects: Project[];
  allLabels: unknown[];
}

export function GlobalTaskList({ initialTasks, projects, allLabels }: GlobalTaskListProps) {
  const [projectIdFilter, setProjectIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      if (projectIdFilter !== 'all' && task.project_id !== projectIdFilter) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [initialTasks, projectIdFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <select 
          className="bg-slate-800 border-none rounded-lg text-sm px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          value={projectIdFilter}
          onChange={(e) => setProjectIdFilter(e.target.value)}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select 
          className="bg-slate-800 border-none rounded-lg text-sm px-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full bg-slate-800 border-none rounded-lg text-sm pl-9 pr-3 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Task List (Table or Grid style) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4">Task</th>
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">Status / Labels</th>
              <th className="px-6 py-4">Metrics</th>
              <th className="px-6 py-4">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No tasks found matching your filters.
                </td>
              </tr>
            ) : null}
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-200 mb-1">{task.title}</div>
                  <div className="text-xs text-slate-500 truncate max-w-xs">{task.description || 'No description'}</div>
                </td>
                <td className="px-6 py-4">
                  <Link href={`/projects/${task.project_id}/board`} className="text-blue-400 hover:text-blue-300 font-medium">
                    {task.project?.name || 'Unknown'}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {task.labels?.map((tl: Record<string, unknown>) => (
                      <span key={tl.label.id} className="w-8 h-2 rounded-full" style={{ backgroundColor: tl.label.color }} title={tl.label.name} />
                    ))}
                    {(!task.labels || task.labels.length === 0) && <span className="text-slate-500 text-xs italic">No labels</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 flex items-center gap-3">
                   {task.checklists?.length > 0 && (
                     <div className="flex items-center gap-1.5" title="Checklists">
                       <CheckSquare className="w-4 h-4" />
                       <span className="text-xs">{task.checklists.reduce((acc: number, c: any) => acc + c.items.filter((i: Record<string, any>) => i.is_completed).length, 0)}/{task.checklists.reduce((acc: number, c: any) => acc + c.items.length, 0)}</span>
                     </div>
                   )}
                   {task.comments?.length > 0 && (
                     <div className="flex items-center gap-1.5" title="Comments">
                       <MessageSquare className="w-4 h-4" />
                       <span className="text-xs">{task.comments.length}</span>
                     </div>
                   )}
                   {task.attachments?.length > 0 && (
                     <div className="flex items-center gap-1.5" title="Attachments">
                       <Paperclip className="w-4 h-4" />
                       <span className="text-xs">{task.attachments.length}</span>
                     </div>
                   )}
                </td>
                <td className="px-6 py-4">
                   {task.assigned_to ? (
                     <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200" title={task.assigned_to}>
                       {task.assigned_to.charAt(0).toUpperCase()}
                     </div>
                   ) : (
                     <span className="text-slate-600 text-xs">Unassigned</span>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
