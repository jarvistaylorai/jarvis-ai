'use client';
import Image from 'next/image';

import React, { useState, useRef, useEffect } from 'react';
import { Task, Label } from './types';
import { 
  X, CheckSquare, Paperclip, MessageSquare, Plus, AlignLeft, 
  Tag, Users, Trash2, Calendar, Eye, ChevronDown, ChevronLeft, ChevronRight,
  ExternalLink, MoreHorizontal, Image as ImageIcon, Bold, Italic, List, Link2, Type,
  ChevronsLeft, ChevronsRight, ArrowRight, Copy, Layers, FileText, Share2, Archive, UserPlus, Target, GripVertical, FolderKanban
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Agent, Task, Project, Alert, TelemetryEvent, Objective } from '@contracts';

function SortableLabel({ label, taskLabelIds, onToggle, onClickExternal }: { label: Label, taskLabelIds: Set<string>, onToggle: (l: Label) => void, onClickExternal: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: label.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group relative">
      <div {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white shrink-0">
        <GripVertical size={14} />
      </div>
      <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => onToggle(label)}>
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${taskLabelIds.has(label.id) ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 bg-transparent'}`}>
          {taskLabelIds.has(label.id) && <CheckSquare size={10} className="text-white" />}
        </div>
        <div className="flex-1 px-3 py-2 rounded-lg text-sm font-bold text-black" style={{ backgroundColor: label.color }}>
          {label.name}
        </div>
      </div>
      <button className="p-1 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all absolute right-0 bg-[#0f0f11] rounded shadow-[0_0_10px_#0f0f11]" onClick={onClickExternal}><ExternalLink size={12} /></button>
    </div>
  );
}

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdateTask: (updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  projectLabels: Label[];
  onLabelsChange: React.Dispatch<React.SetStateAction<Label[]>>;
  listName?: string;
  activeWorkspace?: string;
}

type PopoverType = null | 'add' | 'labels' | 'dates' | 'checklist' | 'members' | 'more' | 'attachment' | 'objective' | 'project';

export function TaskModal({ task: initialTask, onClose, onUpdateTask, onDeleteTask, projectLabels,
  onLabelsChange,
  listName,
  activeWorkspace = 'business'
}: TaskModalProps) {
  const [task, setTask] = useState<Task>(initialTask);
  const [localLabels, setLocalLabels] = useState<Label[]>(projectLabels);
  
  useEffect(() => {
     const fetchScopedLabels = async () => {
        const pid = task.project_id || 'global';
        try {
           const res = await fetch(`/api/labels?project_id=${pid}&workspace=${activeWorkspace}`);
           if (res.ok) setLocalLabels(await res.json());
        } catch (e) {}
     };
     fetchScopedLabels();
  }, [task.project_id, activeWorkspace]);

  const handleLocalUpdateTask = (updates: Partial<Task>) => {
    setTask((prev: Task) => ({ ...prev, ...updates }));
    onUpdateTask(updates);
  };

  const [desc, setDesc] = useState(task.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDirty, setDescDirty] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [labelSearch, setLabelSearch] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('Checklist');
  const [memberSearch, setMemberSearch] = useState('');
  const [addingItemToChecklist, setAddingItemToChecklist] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [attachLink, setAttachLink] = useState('');
  const [attachDisplayText, setAttachDisplayText] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#4ade80');
  const [isUploading, setIsUploading] = useState(false);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [startDate, setStartDate] = useState(task.start_date || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [dueTime, setDueTime] = useState('12:00 AM');
  const [hasStartDate, setHasStartDate] = useState(!!task.start_date);
  const [hasDueDate, setHasDueDate] = useState(!!task.due_date);
  const [hiddenChecklists, setHiddenChecklists] = useState<Record<string, boolean>>({});
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
      if (activePopover === 'more' && moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopover]);

  // Fetch objectives for phase picker and projects for project picker
  useEffect(() => {
    const fetchObjectives = async () => {
      try {
        const res = await fetch('/api/objectives');
        if (res.ok) setObjectives(await res.json());
      } catch (err) { console.error(err); }
    };
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const json = await res.json();
          setProjects(Array.isArray(json) ? json : (json.data || []));
        }
      } catch (err) { console.error(err); }
    };
    fetchObjectives();
    fetchProjects();
  }, []);

  const handleUpdateDesc = () => {
    handleLocalUpdateTask({ description: desc });
    setIsEditingDesc(false);
    setDescDirty(false);
  };

  const handleSaveTitle = async () => {
    const trimmed = editedTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
      return;
    }
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed })
      });
      handleLocalUpdateTask({ title: trimmed });
    } catch (err) { console.error(err); }
    setIsEditingTitle(false);
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent, author: 'Roy Taylor' })
      });
      if (res.ok) {
        const comment = await res.json();
        handleLocalUpdateTask({ comments: [...(task.comments || []), comment] });
        setCommentContent('');
      }
    } catch(err) { console.error(err) }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setDeletingAttachmentId(attachmentId);
  };

  const confirmDeleteAttachment = async () => {
    if (!deletingAttachmentId) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments/${deletingAttachmentId}`, { method: 'DELETE' });
      if (res.ok) {
        handleLocalUpdateTask({
          attachments: task.attachments?.filter((a: Agent) => a.id !== deletingAttachmentId)
        });
      }
      setDeletingAttachmentId(null);
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleteTask) onDeleteTask(task.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`/api/tasks/${task.id}/comment/${commentId}`, { method: 'DELETE' });
      handleLocalUpdateTask({ comments: (task.comments || []).filter(c => c.id !== commentId) });
    } catch(err) { console.error(err) }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    try {
      await fetch(`/api/tasks/${task.id}/comment/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingCommentContent })
      });
      handleLocalUpdateTask({ 
        comments: (task.comments || []).map(c => c.id === commentId ? { ...c, content: editingCommentContent } : c) 
      });
      setEditingCommentId(null);
    } catch(err) { console.error(err) }
  };

  const handleSaveDates = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          due_date: hasDueDate && dueDate ? new Date(dueDate).toISOString() : null,
          start_date: hasStartDate && startDate ? new Date(startDate).toISOString() : null
        })
      });
      handleLocalUpdateTask({ 
        due_date: hasDueDate && dueDate ? new Date(dueDate).toISOString() : null,
        start_date: hasStartDate && startDate ? new Date(startDate).toISOString() : null
      });
      setActivePopover(null);
    } catch(err) { console.error(err) }
  };

  const handleAddChecklist = async () => {
    const title = newChecklistTitle.trim() || 'Checklist';
    try {
      const res = await fetch(`/api/tasks/${task.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (res.ok) {
        const checklist = await res.json();
        handleLocalUpdateTask({ checklists: [...(task.checklists || []), { ...checklist, items: [] }] });
        setNewChecklistTitle('Checklist');
        setActivePopover(null);
      }
    } catch(err) { console.error(err) }
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    if (!newItemContent.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/checklist/${checklistId}/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newItemContent.trim() })
      });
      if (res.ok) {
        const item = await res.json();
        const updatedChecklists = (task.checklists || []).map(cl =>
          cl.id === checklistId ? { ...cl, items: [...cl.items, item] } : cl
        );
        handleLocalUpdateTask({ checklists: updatedChecklists });
        setNewItemContent('');
      }
    } catch(err) { console.error(err) }
  };

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, isCompleted: boolean) => {
    try {
      await fetch(`/api/tasks/${task.id}/checklist/${checklistId}/item/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted })
      });
      const updatedChecklists = (task.checklists || []).map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map(i => i.id === itemId ? { ...i, is_completed: isCompleted } : i) }
          : cl
      );
      handleLocalUpdateTask({ checklists: updatedChecklists });
    } catch(err) { console.error(err) }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      await fetch(`/api/tasks/${task.id}/checklist/${checklistId}`, { method: 'DELETE' });
      handleLocalUpdateTask({ checklists: (task.checklists || []).filter(cl => cl.id !== checklistId) });
    } catch(err) { console.error(err) }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await fetch(`/api/labels?workspace=${activeWorkspace}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: task.project_id || 'global', name: newLabelName.trim(), color: newLabelColor })
      });
      if (res.ok) {
        const newLabel = await res.json();
        setLocalLabels((prev) => [...prev, newLabel]);
        onLabelsChange?.([...projectLabels, newLabel]);
        setNewLabelName('');
        setNewLabelColor('#4ade80');
        setCreatingLabel(false);
      }
    } catch(err) { console.error(err); }
  };

  const handleToggleLabel = async (label: Label) => {
    const isAssigned = taskLabelIds.has(label.id);
    try {
      if (isAssigned) {
        await fetch(`/api/tasks/${task.id}/labels/${label.id}`, { method: 'DELETE' });
        handleLocalUpdateTask({ labels: (task.labels || []).filter(tl => tl.label.id !== label.id) });
      } else {
        await fetch(`/api/tasks/${task.id}/labels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label_id: label.id })
        });
        handleLocalUpdateTask({ labels: [...(task.labels || []), { label }] });
      }
    } catch(err) { console.error(err); }
  };

  const handleAssignPhase = async (phaseId: string | null) => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { ...task.metadata, phase_id: phaseId } })
      });
      
      let phaseObj = undefined;
      if (phaseId) {
        for (const obj of objectives) {
          const p = (obj.phases || []).find((ph: Record<string, any>) => ph.id === phaseId);
          if (p) {
            phaseObj = { id: p.id, title: p.title, objective: { id: obj.id, title: obj.title } };
            break;
          }
        }
      }
      
      handleLocalUpdateTask({ phase_id: phaseId, phase: phaseObj } as any);
      setActivePopover(null);
      setSelectedObjectiveId(null);
    } catch (err) { console.error(err); }
  };

  const handleAssignProject = async (projectId: string | null) => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      });
      handleLocalUpdateTask({ project_id: projectId });
      setActivePopover(null);
    } catch (err) { console.error(err); }
  };

  const togglePopover = (type: PopoverType) => {
    setActivePopover(prev => prev === type ? null : type);
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const today = new Date();
  
  const prevMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  const prevYear = () => setCalendarDate(new Date(calendarYear - 1, calendarMonth, 1));
  const nextYear = () => setCalendarDate(new Date(calendarYear + 1, calendarMonth, 1));

  const selectCalendarDay = (day: number) => {
    const dateStr = `${calendarMonth + 1}/${day}/${calendarYear}`;
    if (hasStartDate) {
      setStartDate(dateStr);
    } else {
      setHasDueDate(true);
      setDueDate(dateStr);
    }
  };

  const isToday = (day: number) => today.getDate() === day && today.getMonth() === calendarMonth && today.getFullYear() === calendarYear;
  const isSelected = (day: number) => {
    const dateStr = `${calendarMonth + 1}/${day}/${calendarYear}`;
    return dateStr === dueDate || dateStr === startDate;
  };

  const prevMonthDays = getDaysInMonth(calendarYear, calendarMonth - 1);
  const paddingDays: number[] = [];
  for (let i = firstDay - 1; i >= 0; i--) paddingDays.push(prevMonthDays - i);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEndLabels = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localLabels.findIndex(l => l.id === active.id);
      const newIndex = localLabels.findIndex(l => l.id === over.id);
      
      const newOrder = arrayMove(localLabels, oldIndex, newIndex);
      setLocalLabels(newOrder);
      onLabelsChange?.(newOrder);

      try {
        await fetch('/api/labels/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelIds: newOrder.map(l => l.id) })
        });
      } catch (err) { console.error('Failed to reorder labels', err); }
    }
  };

  const filteredLabels = localLabels.filter(l => l.name.toLowerCase().includes(labelSearch.toLowerCase()));
  const taskLabelIds = new Set((task.labels || []).map(tl => tl.label.id));

  // Board members
  const boardMembers = [
    { id: '1', name: 'Roy Taylor', initials: 'RT', color: 'bg-gradient-to-br from-indigo-500 to-indigo-700' },
  ];

  const filteredMembers = boardMembers.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

  const checklistTotal = task.checklists?.reduce((acc, c) => acc + c.items.length, 0) || 0;
  const checklistDone = task.checklists?.reduce((acc, c) => acc + c.items.filter(i => i.is_completed).length, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-md p-4 pt-12 animate-in fade-in duration-200 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0a0a0b] w-full max-w-5xl rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col border border-white/[0.05] transform transition-all mb-12">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04] bg-[#0f0f11]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-1.5 cursor-pointer hover:bg-white/[0.06] transition-colors">
              {listName || 'Unassigned'}
              <ChevronDown size={12} className="text-zinc-500" />
            </span>
          </div>
          <div className="flex items-center gap-1 relative" ref={moreMenuRef}>
            <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"><ImageIcon size={16} /></button>
            <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"><Eye size={16} /></button>
            <button onClick={() => togglePopover('more')} className={`p-2 rounded-lg transition-colors ${activePopover === 'more' ? 'text-white bg-white/[0.06]' : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'}`}>
              <MoreHorizontal size={16} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors ml-1"><X size={16} /></button>

            {/* ═══ MORE MENU ═══ */}
            {activePopover === 'more' && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
                {[
                  { icon: UserPlus, label: 'Join' },
                  { icon: ArrowRight, label: 'Move' },
                  { icon: Copy, label: 'Copy' },
                  { icon: Layers, label: 'Mirror' },
                  { icon: FileText, label: 'Make template' },
                  { icon: Eye, label: 'Watch', hasToggle: true },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors text-left">
                    <item.icon size={15} className="text-zinc-500" />
                    <span className="flex-1">{item.label}</span>
                    {item.hasToggle && (
                      <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center">
                        <CheckSquare size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
                <div className="h-px bg-white/[0.06] my-1" />
                {[
                  { icon: Share2, label: 'Share' },
                  { icon: Archive, label: 'Archive' },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] transition-colors text-left">
                    <item.icon size={15} className="text-zinc-500" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Two Columns */}
        <div className="flex min-h-[600px]">
          
          {/* LEFT COLUMN */}
          <div className="flex-[3] p-8 border-r border-white/[0.04]">
            
            {/* Title */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 mt-2 shrink-0" />
              {isEditingTitle ? (
                <input autoFocus className="flex-1 text-2xl font-bold text-white tracking-tight bg-transparent border-b-2 border-indigo-500 focus:outline-none py-1"
                  value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') { setEditedTitle(task.title); setIsEditingTitle(false); } }}
                />
              ) : (
                <h2 className="text-2xl font-bold text-white tracking-tight leading-tight cursor-pointer hover:text-indigo-300 transition-colors flex-1"
                  onClick={() => setIsEditingTitle(true)} title="Click to rename">
                  {task.title}
                </h2>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2 mb-8 relative" ref={popoverRef}>
              <button onClick={() => togglePopover('add')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'add' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <Plus size={14} /> Add
              </button>
              <button onClick={() => togglePopover('labels')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'labels' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <Tag size={14} /> Labels
              </button>
              <button onClick={() => togglePopover('dates')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'dates' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <Calendar size={14} /> Dates
              </button>
              <button onClick={() => togglePopover('checklist')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'checklist' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <CheckSquare size={14} /> Checklist
              </button>
              <button onClick={() => togglePopover('members')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'members' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <Users size={14} /> Members
              </button>
              <button onClick={() => togglePopover('attachment')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'attachment' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <Paperclip size={14} /> Attachment
              </button>
              <button onClick={() => togglePopover('objective')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'objective' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <Target size={14} /> Objective
              </button>
              <button onClick={() => togglePopover('project')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${activePopover === 'project' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-300 hover:text-white'}`}>
                <FolderKanban size={14} /> Project
              </button>

              {/* ═══ ADD POPOVER ═══ */}
              {activePopover === 'add' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <h4 className="text-sm font-bold text-white">Add to card</h4>
                    <button onClick={() => setActivePopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-2">
                    {[
                      { icon: Tag, label: 'Labels', desc: 'Organize, categorize, and prioritize', action: () => setActivePopover('labels') },
                      { icon: Calendar, label: 'Dates', desc: 'Start dates, due dates, and reminders', action: () => setActivePopover('dates') },
                      { icon: CheckSquare, label: 'Checklist', desc: 'Add subtasks', action: () => setActivePopover('checklist') },
                      { icon: Users, label: 'Members', desc: 'Assign members', action: () => setActivePopover('members') },
                      { icon: Paperclip, label: 'Attachment', desc: 'Add links, pages, work items, and more', action: () => setActivePopover('attachment') },
                      { icon: Target, label: 'Objective', desc: 'Link to a strategic objective', action: () => setActivePopover('objective') },
                      { icon: FolderKanban, label: 'Project', desc: 'Assign to a project board', action: () => setActivePopover('project') },
                    ].map((item) => (
                      <button key={item.label} onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors text-left group">
                        <item.icon size={16} className="text-zinc-400 group-hover:text-indigo-400 transition-colors shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-[11px] text-zinc-500">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ LABELS POPOVER ═══ */}
              {activePopover === 'labels' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    {creatingLabel && (
                      <button onClick={() => setCreatingLabel(false)} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronLeft size={14} /></button>
                    )}
                    <h4 className="text-sm font-bold text-white">{creatingLabel ? 'Create label' : 'Labels'}</h4>
                    <button onClick={() => { setActivePopover(null); setCreatingLabel(false); }} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>

                  {creatingLabel ? (
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Name</p>
                        <input autoFocus
                          className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                          value={newLabelName} onChange={e => setNewLabelName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); }}
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Select a color</p>
                        <div className="grid grid-cols-5 gap-2">
                          {['#4ade80','#facc15','#f97316','#ef4444','#f87171','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#a855f7'].map(color => (
                            <button key={color} onClick={() => setNewLabelColor(color)}
                              className={`h-8 rounded-lg transition-all ${newLabelColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f0f11] scale-110' : 'hover:scale-105'}`}
                              style={{ backgroundColor: color }} />
                          ))}
                        </div>
                      </div>
                      {newLabelName.trim() && (
                        <div>
                          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Preview</p>
                          <span className="px-4 py-2 rounded-lg text-sm font-bold text-black inline-block" style={{ backgroundColor: newLabelColor }}>
                            {newLabelName}
                          </span>
                        </div>
                      )}
                      <button onClick={handleCreateLabel}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        Create
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-3">
                        <input className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 mb-3"
                          placeholder="Search labels..." value={labelSearch} onChange={e => setLabelSearch(e.target.value)} />
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Labels</p>
                        <div className="space-y-1.5">
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLabels}>
                            <SortableContext items={filteredLabels.map(l => l.id)} strategy={verticalListSortingStrategy}>
                              {filteredLabels.map(label => (
                                <SortableLabel key={label.id} label={label} taskLabelIds={taskLabelIds} onToggle={handleToggleLabel} onClickExternal={(e: Record<string, any>) => { e.stopPropagation() }} />
                              ))}
                            </SortableContext>
                          </DndContext>
                          {filteredLabels.length === 0 && <p className="text-xs text-zinc-500 text-center py-4 italic">No labels found</p>}
                        </div>
                      </div>
                      <div className="border-t border-white/[0.04] p-3">
                        <button onClick={() => setCreatingLabel(true)} className="w-full py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">Create a new label</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══ DATES POPOVER ═══ */}
              {activePopover === 'dates' && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <h4 className="text-sm font-bold text-white">Dates</h4>
                    <button onClick={() => setActivePopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <button onClick={prevYear} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronsLeft size={14} /></button>
                        <button onClick={prevMonth} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronLeft size={14} /></button>
                      </div>
                      <span className="text-sm font-bold text-white">{monthNames[calendarMonth]} {calendarYear}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={nextMonth} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronRight size={14} /></button>
                        <button onClick={nextYear} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronsRight size={14} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-0 mb-4">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                        <div key={d} className="text-[10px] font-bold text-zinc-500 text-center py-1.5 uppercase">{d}</div>
                      ))}
                      {paddingDays.map((d, i) => (
                        <div key={`pad-${i}`} className="text-xs text-zinc-700 text-center py-2">{d}</div>
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <button key={day} onClick={() => selectCalendarDay(day)}
                          className={`text-xs text-center py-2 rounded-lg transition-all font-medium
                            ${isSelected(day) ? 'bg-indigo-600 text-white' : ''}
                            ${isToday(day) && !isSelected(day) ? 'text-indigo-400 ring-1 ring-indigo-500/50' : ''}
                            ${!isToday(day) && !isSelected(day) ? 'text-zinc-300 hover:bg-white/[0.04]' : ''}
                          `}>
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="mb-4">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Start date</p>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={hasStartDate} onChange={e => setHasStartDate(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 accent-indigo-500 cursor-pointer outline-none" />
                        <input type="text" placeholder="M/D/YYYY" value={startDate} onChange={e => setStartDate(e.target.value)}
                          disabled={!hasStartDate}
                          className="flex-1 bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Due date</p>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={hasDueDate} onChange={e => setHasDueDate(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 accent-indigo-500 cursor-pointer outline-none" />
                        <input type="text" placeholder="M/D/YYYY" value={dueDate} onChange={e => setDueDate(e.target.value)}
                          disabled={!hasDueDate}
                          className="flex-1 bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40" />
                        <input type="text" placeholder="Time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                          disabled={!hasDueDate}
                          className="w-24 bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40" />
                      </div>
                    </div>
                    <div className="mb-6">
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Set due date reminder</p>
                      <select className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer">
                        <option>1 Day before</option>
                        <option>2 Days before</option>
                        <option>1 Week before</option>
                        <option>None</option>
                      </select>
                      <p className="text-[10px] text-zinc-600 mt-2">Reminders will be sent to all members and watchers of this card.</p>
                    </div>
                    <button onClick={handleSaveDates} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors mb-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">Save</button>
                    <button onClick={() => { setHasDueDate(false); setHasStartDate(false); setDueDate(''); setStartDate(''); handleSaveDates(); }}
                      className="w-full text-zinc-400 hover:text-white py-2 rounded-lg font-medium text-sm transition-colors hover:bg-white/[0.04]">Remove</button>
                  </div>
                </div>
              )}

              {/* ═══ CHECKLIST POPOVER ═══ */}
              {activePopover === 'checklist' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <h4 className="text-sm font-bold text-white">Add checklist</h4>
                    <button onClick={() => setActivePopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Title</p>
                      <input
                        autoFocus
                        className="w-full bg-[#050505] border border-indigo-500/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                        value={newChecklistTitle}
                        onChange={e => setNewChecklistTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddChecklist(); }}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Copy items from...</p>
                      <select className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer">
                        <option>(none)</option>
                        {task.checklists?.map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.title}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={handleAddChecklist}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ MEMBERS POPOVER ═══ */}
              {activePopover === 'members' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <h4 className="text-sm font-bold text-white">Members</h4>
                    <button onClick={() => setActivePopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-3">
                    <input
                      className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 mb-3"
                      placeholder="Search members"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                    />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Board members</p>
                    <div className="space-y-0.5">
                      {filteredMembers.map(member => (
                        <button key={member.id}
                          onClick={async () => {
                            const isAlreadyAssigned = task.assigned_to === member.name;
                            const newAssigned = isAlreadyAssigned ? null : member.name;
                            try {
                              await fetch(`/api/tasks/${task.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ metadata: { ...task.metadata, assigned_to: newAssigned } })
                              });
                              handleLocalUpdateTask({ assigned_to: newAssigned });
                              setActivePopover(null);
                            } catch(err) { console.error(err); }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${task.assigned_to === member.name ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-white/[0.04]'}`}>
                          <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                            {member.initials}
                          </div>
                          <span className="text-sm text-white font-medium flex-1 text-left">{member.name}</span>
                          {task.assigned_to === member.name && <CheckSquare size={14} className="text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ ATTACHMENT POPOVER ═══ */}
              {activePopover === 'attachment' && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActivePopover('add')} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronLeft size={14} /></button>
                      <h4 className="text-sm font-bold text-white">Attach</h4>
                    </div>
                    <button onClick={() => setActivePopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-4 space-y-5">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">Attach a file from your computer</p>
                      <p className="text-[11px] text-zinc-500 mb-3">You can also drag and drop files to upload them.</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await fetch(`/api/tasks/${task.id}/upload`, {
                              method: 'POST',
                              body: formData
                            });
                            if (res.ok) {
                              const attachment = await res.json();
                              handleLocalUpdateTask({ attachments: [...(task.attachments || []), attachment] });
                              setActivePopover(null);
                            }
                          } catch (err) { console.error(err); }
                          setIsUploading(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full py-2.5 text-sm font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Choose a file'}
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Search or paste a link <span className="text-rose-400">*</span></p>
                      <input className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 mt-2"
                        placeholder="Find recent links or paste a new link" value={attachLink} onChange={e => setAttachLink(e.target.value)} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">Display text <span className="text-zinc-500 font-normal">(optional)</span></p>
                      <input className="w-full bg-[#050505] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 mt-2"
                        placeholder="Text to display" value={attachDisplayText} onChange={e => setAttachDisplayText(e.target.value)} />
                      <p className="text-[10px] text-zinc-600 mt-1.5">Give this link a title or description</p>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button onClick={() => setActivePopover(null)} className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">Cancel</button>
                      <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">Insert</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ OBJECTIVE / PHASE POPOVER ═══ */}
              {activePopover === 'objective' && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      {selectedObjectiveId && (
                        <button onClick={() => setSelectedObjectiveId(null)} className="p-1 text-zinc-500 hover:text-white rounded transition-colors"><ChevronLeft size={14} /></button>
                      )}
                      <h4 className="text-sm font-bold text-white">{selectedObjectiveId ? 'Select Phase' : 'Assign to Objective'}</h4>
                    </div>
                    <button onClick={() => { setActivePopover(null); setSelectedObjectiveId(null); }} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-3 max-h-72 overflow-y-auto custom-scrollbar">
                    {/* Show current assignment */}
                    {(task.metadata as any)?.phase_id || (task as any).phase_id && !selectedObjectiveId && (
                      <div className="mb-3 p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target size={14} className="text-amber-400" />
                            <span className="text-xs text-amber-400 font-semibold">Currently assigned</span>
                          </div>
                          <button onClick={() => handleAssignPhase(null)} className="text-[10px] text-zinc-500 hover:text-rose-400 font-bold uppercase tracking-wider transition-colors">Remove</button>
                        </div>
                      </div>
                    )}

                    {!selectedObjectiveId ? (
                      /* Objective list */
                      objectives.length > 0 ? objectives.map((obj: Objective) => (
                        <button key={obj.id} onClick={() => setSelectedObjectiveId(obj.id)}
                          className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors text-left group mb-1">
                          <Target size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{obj.title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-zinc-500 font-mono">{obj.phase_count || 0} phases</span>
                              <span className="text-[10px] text-zinc-500">{obj.progress || 0}%</span>
                              {obj.project && <span className="text-[10px] text-zinc-600">{obj.project.name}</span>}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                        </button>
                      )) : (
                        <div className="text-center py-6">
                          <Target size={24} className="mx-auto mb-2 text-zinc-700" />
                          <p className="text-sm text-zinc-500">No objectives yet</p>
                          <p className="text-xs text-zinc-600 mt-1">Create an objective first</p>
                        </div>
                      )
                    ) : (
                      /* Phase list for selected objective */
                      (() => {
                        const obj = objectives.find((o: Objective) => o.id === selectedObjectiveId);
                        const phases = obj?.phases || [];
                        return phases.length > 0 ? phases.map((phase: Record<string, unknown>) => (
                          <button key={phase.id} onClick={() => handleAssignPhase(phase.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left mb-1 ${
                              (task.metadata as any)?.phase_id || (task as any).phase_id === phase.id
                                ? 'bg-amber-500/[0.08] border border-amber-500/20'
                                : 'hover:bg-white/[0.04]'
                            }`}>
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              phase.status === 'COMPLETED' ? 'bg-emerald-400' :
                              phase.status === 'IN_PROGRESS' ? 'bg-amber-400' : 'bg-zinc-600'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{phase.title}</p>
                              <span className="text-[10px] text-zinc-500 font-mono">{phase.task_count || 0} tasks · {phase.progress || 0}%</span>
                            </div>
                            {(task.metadata as any)?.phase_id || (task as any).phase_id === phase.id && (
                              <CheckSquare size={14} className="text-amber-400 shrink-0" />
                            )}
                          </button>
                        )) : (
                          <div className="text-center py-6">
                            <Layers size={24} className="mx-auto mb-2 text-zinc-700" />
                            <p className="text-sm text-zinc-500">No phases in this objective</p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* ═══ PROJECT POPOVER ═══ */}
              {activePopover === 'project' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-[#0f0f11] border border-white/[0.08] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
                    <h4 className="text-sm font-bold text-white">Project</h4>
                    <button onClick={() => setActivePopover(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
                  </div>
                  <div className="p-2 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                    <button onClick={() => handleAssignProject(null)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left ${!task.project_id ? 'bg-indigo-500/10 border border-indigo-500/30 text-white' : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'}`}>
                      <div className="flex items-center gap-2">
                        <FolderKanban size={14} className={!task.project_id ? "text-indigo-400" : "text-zinc-500"} />
                        <span className="text-sm font-medium">None</span>
                      </div>
                      {!task.project_id && <CheckSquare size={14} className="text-indigo-400" />}
                    </button>
                    {projects.map(proj => (
                      <button key={proj.id} onClick={() => handleAssignProject(proj.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left ${task.project_id === proj.id ? 'bg-indigo-500/10 border border-indigo-500/30 text-white' : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'}`}>
                        <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                          <span className="text-sm font-medium truncate">{proj.name}</span>
                          {proj.status && <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{proj.status}</span>}
                        </div>
                        {task.project_id === proj.id && <CheckSquare size={14} className="text-indigo-400 shrink-0" />}
                      </button>
                    ))}
                    {projects.length === 0 && <p className="text-xs text-zinc-500 text-center py-4 italic">No projects found</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Properties Row */}
            <div className="flex flex-wrap items-start gap-x-10 gap-y-8 mb-8">
              {/* Dates */}
              {(task.start_date || task.due_date) && (
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Dates</h4>
                  <div className="flex items-center gap-3">
                    {task.start_date && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Start</span>
                        <span className="text-sm font-medium text-white bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">{new Date(task.start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {task.start_date && task.due_date && <span className="text-zinc-600 mt-4">-</span>}
                    {task.due_date && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Due</span>
                        <span className={`text-sm font-medium ${new Date(task.due_date) < new Date() ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-white bg-white/[0.04] border-white/[0.06]'} px-3 py-1.5 rounded-lg border`}>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <button onClick={() => togglePopover('dates')} className="mt-5 w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Labels</h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    {task.labels.map(tl => (
                      <span key={tl.label.id} className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-black" style={{ backgroundColor: tl.label.color }}>
                        {tl.label.name}
                      </span>
                    ))}
                    <button onClick={() => togglePopover('labels')} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Objective / Phase Assignment */}
              {((task.metadata as any)?.phase_id || (task as any).phase_id) && (() => {
                let phaseName = '';
                let objTitle = '';
                for (const obj of objectives) {
                  const p = (obj.phases || []).find((ph: Record<string, any>) => ph.id === ((task.metadata as any)?.phase_id || (task as any).phase_id));
                  if (p) { phaseName = p.title; objTitle = obj.title; break; }
                }
                return phaseName ? (
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Objective</h4>
                    <div className="inline-flex items-center gap-3 p-2.5 pr-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 max-w-full">
                      <Target size={16} className="text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 truncate">{objTitle}</p>
                        <p className="text-sm font-medium text-amber-400 truncate">{phaseName}</p>
                      </div>
                      <button onClick={() => handleAssignPhase(null)} className="ml-2 text-zinc-600 hover:text-rose-400 transition-colors shrink-0"><X size={14} /></button>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Project Assignment */}
              {task.project_id && (() => {
                const proj = projects.find(p => p.id === task.project_id);
                return proj ? (
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Project</h4>
                    <div className="inline-flex items-center gap-3 p-2.5 pr-4 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15 max-w-full">
                      <FolderKanban size={16} className="text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-indigo-400 truncate">{proj.name}</p>
                      </div>
                      <button onClick={() => handleAssignProject(null)} className="ml-2 text-zinc-600 hover:text-rose-400 transition-colors shrink-0"><X size={14} /></button>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Members */}
              {task.assigned_to && (
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Members</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center border-2 border-[#0a0a0b] text-sm font-bold text-white shrink-0" title={task.assigned_to}>
                      {task.assigned_to.substring(0, 2).toUpperCase()}
                    </div>
                    <button onClick={() => togglePopover('members')} className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white transition-colors shrink-0">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlignLeft size={18} className="text-zinc-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">Description</h3>
                </div>
                {descDirty && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 rounded-lg">Unsaved Changes</span>
                )}
              </div>
              {isEditingDesc || !task.description ? (
                <div className="">
                  <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#050505] border border-white/[0.06] border-b-0 rounded-t-xl">
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors flex items-center gap-1">
                      <Type size={13} /><ChevronDown size={10} />
                    </button>
                    <div className="w-px h-4 bg-white/[0.06] mx-1" />
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><Bold size={13} /></button>
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><Italic size={13} /></button>
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><MoreHorizontal size={13} /></button>
                    <div className="w-px h-4 bg-white/[0.06] mx-1" />
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><List size={13} /></button>
                    <div className="w-px h-4 bg-white/[0.06] mx-1" />
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><Link2 size={13} /></button>
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><ImageIcon size={13} /></button>
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><Plus size={13} /></button>
                    <div className="flex-1" />
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded transition-colors"><Paperclip size={13} /></button>
                    <button className="p-1.5 text-zinc-600 hover:text-zinc-400 rounded transition-colors text-[10px] font-bold">M↓</button>
                  </div>
                  <textarea
                    className="w-full bg-[#050505] text-white p-4 border border-white/[0.06] rounded-b-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none min-h-[120px] placeholder:text-zinc-600 text-sm shadow-inner transition-all resize-none"
                    placeholder="Add a more detailed description..." value={desc}
                    onChange={(e) => { setDesc(e.target.value); setDescDirty(true); }}
                    autoFocus={isEditingDesc}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <button onClick={handleUpdateDesc} className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg text-white font-bold text-[11px] uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">Save</button>
                      <button onClick={() => { setIsEditingDesc(false); setDesc(task.description || ''); setDescDirty(false); }} className="text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors px-3 py-2">Discard changes</button>
                    </div>
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-medium bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.04]">Formatting help</button>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-300 text-sm leading-relaxed cursor-pointer hover:bg-white/[0.02] p-4 rounded-xl whitespace-pre-wrap border border-white/[0.03] hover:border-white/[0.06] transition-all" onClick={() => setIsEditingDesc(true)}>
                  {task.description}
                </div>
              )}
            </div>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Paperclip size={18} className="text-zinc-400" />
                    <h3 className="text-base font-bold text-white tracking-tight">Attachments</h3>
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.05] px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">Add</button>
                </div>
                <div className="">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Files</p>
                  <div className="space-y-3">
                    {task.attachments.map((att: Record<string, any>) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file_name);
                      const fileUrl = `/api/fs/raw?storagePath=${encodeURIComponent(att.file_path)}`;

                      return (
                      <div key={att.id} className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors group">
                        {isImage && (
                          <div className="w-auto h-40 rounded-lg bg-zinc-900 border border-white/[0.06] flex items-center justify-center overflow-hidden mb-1 cursor-pointer shrink-0" onClick={() => window.open(fileUrl, '_blank')}>
                            <Image src={fileUrl} alt={att.file_name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" fill unoptimized />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          {!isImage && (
                            <div className="w-16 h-12 rounded-lg bg-zinc-800 border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                              <Paperclip size={16} className="text-zinc-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{att.file_name}</p>
                            <p className="text-[11px] text-zinc-500">Added {new Date(att.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => window.open(fileUrl, '_blank')} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"><ExternalLink size={14} /></button>
                            <button onClick={() => handleDeleteAttachment(att.id)} className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-white/[0.04] rounded-lg transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            )}

            {/* Checklists */}
            {task.checklists?.map((cl) => {
               const completed = cl.items.filter(i => i.is_completed).length;
               const total = cl.items.length;
               const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
               return (
                <div key={cl.id} className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CheckSquare size={18} className="text-zinc-400" />
                      <h3 className="text-base font-bold text-white tracking-tight">{cl.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setHiddenChecklists(prev => ({ ...prev, [cl.id]: !prev[cl.id] }))} className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.05] px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                        {hiddenChecklists[cl.id] ? 'Show checked items' : 'Hide checked items'}
                      </button>
                      <button onClick={() => handleDeleteChecklist(cl.id)} className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.05] px-3 py-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/10">Delete</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 mb-4">
                       <span className="text-[11px] font-bold text-zinc-500 w-10 text-right font-mono">{percent}%</span>
                       <div className="h-2 flex-1 bg-[#050505] rounded-full overflow-hidden border border-white/[0.04]">
                          <div className={`h-full transition-all duration-500 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />
                       </div>
                    </div>
                    <div className="space-y-1">
                      {cl.items.filter((i: Record<string, any>) => !(hiddenChecklists[cl.id] && i.is_completed)).map((item: Record<string, any>) => (
                        <div key={item.id} className="flex items-start gap-3 hover:bg-white/[0.02] p-2.5 -ml-2.5 rounded-lg group transition-colors cursor-pointer" onClick={() => handleToggleChecklistItem(cl.id, item.id, !item.is_completed)}>
                          <div className="mt-0.5 relative flex items-center justify-center w-5 h-5 shrink-0">
                             <input type="checkbox" checked={item.is_completed}
                               className={`w-5 h-5 rounded border-2 appearance-none cursor-pointer transition-all ${item.is_completed ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-zinc-600 hover:border-zinc-400'}`} readOnly />
                             {item.is_completed && <CheckSquare size={12} className="absolute text-white pointer-events-none" />}
                          </div>
                          <span className={`flex-1 pt-0.5 text-sm leading-relaxed ${item.is_completed ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{item.content}</span>
                        </div>
                      ))}
                    </div>
                    {/* Add an item */}
                    {addingItemToChecklist === cl.id ? (
                      <div className="mt-3">
                        <input autoFocus
                          className="w-full bg-[#050505] border border-indigo-500/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                          placeholder="Add an item"
                          value={newItemContent}
                          onChange={e => setNewItemContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddChecklistItem(cl.id); if (e.key === 'Escape') { setAddingItemToChecklist(null); setNewItemContent(''); } }}
                        />
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => handleAddChecklistItem(cl.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">Add</button>
                          <button onClick={() => { setAddingItemToChecklist(null); setNewItemContent(''); }} className="text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingItemToChecklist(cl.id); setNewItemContent(''); }}
                        className="mt-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] px-3 py-2 rounded-lg transition-colors font-medium w-full text-left">
                        + Add an item
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT COLUMN: Comments & Activity */}
          <div className="flex-[2] flex flex-col bg-[#0f0f11]/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-zinc-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">Comments and activity</h3>
              </div>
              <button onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.05] px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border border-white/[0.06]">
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>

            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5 border-2 border-[#0f0f11]">RT</div>
                <div className="flex-1">
                  <textarea className="w-full bg-[#050505] border border-white/[0.06] rounded-xl p-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 min-h-[60px] shadow-inner resize-none transition-all"
                    placeholder="Write a comment..." value={commentContent} onChange={e => setCommentContent(e.target.value)} />
                  {commentContent.trim() && (
                    <button onClick={handleAddComment} className="mt-2 text-[11px] uppercase tracking-wider font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]">Save Comment</button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
              {[...(task.comments || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((c: Task) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {c.author.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-sm text-white">{c.author}</span>
                      <span className="text-[11px] text-indigo-400 hover:underline cursor-pointer">
                        {(() => {
                          const date = new Date(c.created_at);
                          const diff = Date.now() - date.getTime();
                          return diff < 5 * 60 * 1000 ? 'Now' : date.toLocaleString();
                        })()}
                      </span>
                    </div>
                    {editingCommentId === c.id ? (
                      <div>
                        <textarea className="w-full bg-[#050505] border border-white/[0.06] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[60px] resize-none"
                          value={editingCommentContent} onChange={e => setEditingCommentContent(e.target.value)} autoFocus />
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => handleEditComment(c.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors">Save</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors px-2 py-1.5">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#0a0a0b] text-zinc-300 text-sm p-4 rounded-xl border border-white/[0.04] leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-zinc-500 text-[11px]">
                      <button className="hover:text-white transition-colors">💬</button>
                      <span className="text-zinc-700">•</span>
                      <button onClick={() => { setEditingCommentId(c.id); setEditingCommentContent(c.content); }} className="hover:text-indigo-400 transition-colors font-medium">Edit</button>
                      <span className="text-zinc-700">•</span>
                      <button onClick={() => handleDeleteComment(c.id)} className="hover:text-rose-400 transition-colors font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex items-start gap-3 pt-4 border-t border-white/[0.04]">
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">RT</div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-400"><span className="font-bold text-white">Roy Taylor</span> added this card to <span className="font-medium text-white">{listName || 'board'}</span></p>
                  <p className="text-[11px] text-indigo-400 mt-0.5 hover:underline cursor-pointer">
                    {task.created_at ? new Date(task.created_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.04]">
              <button 
                onClick={handleDeleteTask}
                className="w-full flex items-center justify-center gap-2 text-sm text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 px-4 py-2.5 rounded-xl transition-all font-medium focus:outline-none focus:ring-0">
                <Trash2 size={14} /> Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>

      {deletingAttachmentId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 shrink-0">
               <Trash2 size={24} className="text-rose-400" />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">Delete Attachment</h3>
             <p className="text-sm text-zinc-400 mb-6">Are you sure you want to delete this attachment? This action cannot be undone.</p>
             <div className="flex w-full gap-3">
               <button onClick={() => setDeletingAttachmentId(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors focus:outline-none border border-transparent hover:border-white/10">Cancel</button>
               <button onClick={confirmDeleteAttachment} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-[0_0_15px_rgba(225,29,72,0.3)] focus:outline-none">Delete</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
