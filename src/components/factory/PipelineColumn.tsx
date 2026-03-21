"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { PipelineCard, FactoryTask } from "./PipelineCard";

interface PipelineColumnProps {
  id: string; // "ideation", "planning", "building", "qa", "deployment"
  title: string;
  description: string;
  tasks: FactoryTask[];
  color: string; // "purple", "blue", "cyan", "orange", "emerald"
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({ id, title, description, tasks, color }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const isBottleneck = tasks.length > 5; // Threshold for bottleneck

  const columnBorders: Record<string, string> = {
    purple: "border-purple-500/20",
    blue: "border-blue-500/20",
    cyan: "border-cyan-500/20",
    orange: "border-orange-500/20",
    emerald: "border-emerald-500/20",
  };

  const columnHeaders: Record<string, string> = {
    purple: "text-purple-400",
    blue: "text-blue-400",
    cyan: "text-cyan-400",
    orange: "text-orange-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className="flex flex-col w-full min-w-[320px] max-w-[400px] shrink-0">
      {/* Column Header */}
      <div className={`mb-4 pb-4 border-b ${columnBorders[color]} ${isOver ? 'bg-white/5 rounded-t-lg transition-colors' : ''}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-bold tracking-widest uppercase text-sm ${columnHeaders[color]}`}>
            {title}
          </h3>
          <span className="bg-slate-800 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-slate-700">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-slate-500">{description}</p>
        
        {isBottleneck && (
          <div className="mt-2 text-[10px] font-bold text-orange-400 bg-orange-500/10 py-1 px-2 rounded flex items-center gap-1 border border-orange-500/20">
            <span>⚠</span> {title.toUpperCase()} bottleneck detected
          </div>
        )}
      </div>

      {/* Droppable Area */}
      <div 
        ref={setNodeRef} 
        className={`flex-1 rounded-xl transition-colors duration-200 min-h-[500px] p-2 ${isOver ? 'bg-slate-800/30 ring-1 ring-slate-700' : ''}`}
      >
        {tasks.map((task) => (
          <PipelineCard 
            key={task.id} 
            task={task} 
            columnColor={color} 
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-xl opacity-50">
            <span className="text-slate-500 mb-2">No active agents yet</span>
            <span className="text-xs text-slate-600">Tasks will be executed automatically once agents are online</span>
          </div>
        )}
      </div>
    </div>
  );
};
