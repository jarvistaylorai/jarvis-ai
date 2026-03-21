"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Clock, User, Layers, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface FactoryTask {
  id: string;
  title: string;
  description: string;
  stage: string;
  status: "active" | "blocked" | "completed";
  project: string;
  type: string;
  assigned_agent?: string | null;
  progress: number;
  updated_at: string;
  created_at: string;
}

interface PipelineCardProps {
  task: FactoryTask;
  columnColor: string; // Tailwind color variable e.g. "purple", "blue", "cyan", "orange", "emerald"
  isDragging?: boolean;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({ task, columnColor, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { ...task },
  });

  const [isHovered, setIsHovered] = useState(false);

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const isBlocked = task.status === "blocked";
  const isActive = task.status === "active";

  // Column specific tint mapping
  const tintColorMap: Record<string, string> = {
    purple: "bg-purple-900/10 border-purple-500/20",
    blue: "bg-blue-900/10 border-blue-500/20",
    cyan: "bg-cyan-900/10 border-cyan-500/20",
    orange: "bg-orange-900/10 border-orange-500/20",
    emerald: "bg-emerald-900/10 border-emerald-500/20",
  };
  
  const glowShadowMap: Record<string, string> = {
    purple: "shadow-[0_0_10px_rgba(168,85,247,0.1)]",
    blue: "shadow-[0_0_10px_rgba(59,130,246,0.1)]",
    cyan: "shadow-[0_0_10px_rgba(6,182,212,0.1)]",
    orange: "shadow-[0_0_10px_rgba(249,115,22,0.1)]",
    emerald: "shadow-[0_0_10px_rgba(16,185,129,0.1)]",
  };

  const tintClass = tintColorMap[columnColor] || "bg-slate-800 border-slate-700";
  const glowClass = isActive ? (glowShadowMap[columnColor] || "shadow-[0_0_10px_rgba(255,255,255,0.1)]") : "";
  
  const typeColors: Record<string, string> = {
    feature: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    fix: "bg-red-500/20 text-red-400 border-red-500/30",
    system: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    research: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  };

  const updatedTime = formatDistanceToNow(new Date(task.updated_at), { addSuffix: true });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative rounded-xl p-4 mb-3 border 
        transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing
        ${isBlocked ? "border-red-500/50 bg-red-950/20" : tintClass}
        ${glowClass}
        ${isHovered && !isDragging ? "-translate-y-1 shadow-lg" : ""}
        ${isActive && !isDragging && !isHovered ? "animate-pulse-slow" : ""}
      `}
    >
      {/* Top row: Type badge & Project */}
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${typeColors[task.type.toLowerCase()] || typeColors.feature}`}>
          {task.type}
        </span>
        <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-900/50 rounded-full border border-slate-800 max-w-[100px] truncate">
          {task.project}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-slate-100 mb-1 leading-snug">{task.title}</h4>
      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{task.description}</p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Progress</span>
          <span>{task.progress}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-1.5 rounded-full bg-${columnColor}-500 transition-all duration-500`} 
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {isBlocked && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 mb-3 font-medium">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="truncate">Blocked: Awaiting Review / Fix required</span>
        </div>
      )}

      {/* Footer Details - Hidden on collapse unless hovered, but we keep it visible for the spec "Show Last Update, Agent on hover" */}
      <div className={`mt-2 pt-3 border-t border-slate-700/50 flex flex-col gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <User size={12} className={task.assigned_agent ? `text-${columnColor}-400` : "text-slate-500"} />
            <span className={task.assigned_agent ? "text-slate-300" : "text-slate-500 italic"}>
              {task.assigned_agent || "Unassigned"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>{updatedTime}</span>
          </div>
        </div>
        
        {isHovered && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 animate-in fade-in">
            <Layers size={12} />
            <span>0 Dependencies</span>
          </div>
        )}
      </div>
    </div>
  );
};
