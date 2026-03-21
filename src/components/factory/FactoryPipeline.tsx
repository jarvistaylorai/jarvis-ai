"use client";

import React, { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, closestCorners } from "@dnd-kit/core";
import { FactoryHeader } from "./FactoryHeader";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard, FactoryTask } from "./PipelineCard";

const columnsData = [
  { id: "ideation", title: "Ideation", description: "Raw concepts and initial planning", color: "purple" },
  { id: "planning", title: "Planning", description: "Technical design and breakdowns", color: "blue" },
  { id: "building", title: "Building", description: "Active feature development and system construction", color: "cyan" },
  { id: "qa", title: "QA", description: "Automated testing and quality checks", color: "orange" },
  { id: "deployment", title: "Deployment", description: "Shipping to production systems", color: "emerald" },
];

export const FactoryPipeline = ({ activeWorkspace = 'business' }: { activeWorkspace?: string }) => {
  const [tasks, setTasks] = useState<FactoryTask[]>([]);
  const [activeTask, setActiveTask] = useState<FactoryTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stats derived state
  const shippedToday = tasks.filter(t => t.stage === 'deployment' && new Date(t.updated_at).getDate() === new Date().getDate()).length;
  const inProgress = tasks.filter(t => t.stage === 'building' || t.stage === 'qa').length;
  const backlog = tasks.filter(t => t.stage === 'ideation' || t.stage === 'planning').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/factory/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStage = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.stage === newStage) return;

    // Optimistic UI update
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, stage: newStage, updated_at: new Date().toISOString() } : t))
    );

    // Persist change
    try {
      await fetch(`/api/factory/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch (error) {
      console.error("Failed to update task stage", error);
      // Revert optimism if needed (not implementing full rollback for brevity)
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f18] text-slate-200">
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">
          Dev Pipeline
        </h1>
        <p className="text-slate-500 mb-6">AI Production Pipeline - Execution System</p>

        <FactoryHeader
          shippedToday={shippedToday}
          inProgress={inProgress}
          backlog={backlog}
          blocked={blocked}
          avgTime="4h 58m"
          systemLoad="NORMAL"
          activeAgents={0}
          tasksCompletedToday={shippedToday}
        />
      </div>

      {/* Main Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar px-8 pb-8">
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
        >
          <div className="flex gap-6 h-full items-start">
            {columnsData.map((stage) => (
              <React.Fragment key={stage.id}>
                <PipelineColumn
                  id={stage.id}
                  title={stage.title}
                  description={stage.description}
                  color={stage.color}
                  tasks={tasks.filter((t) => t.stage === stage.id)}
                />

                {/* Draw connector lines except after last column */}
                {stage.id !== "deployment" && (
                  <div className="hidden xl:flex items-center justify-center opacity-30 mt-32 shrink-0 w-8">
                    <div className="h-px bg-slate-600 w-full relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-slate-600 rotate-45" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="opacity-80 rotate-3 scale-105 cursor-grabbing z-50">
                <PipelineCard
                  task={activeTask}
                  columnColor={columnsData.find(c => c.id === activeTask.stage)?.color || "cyan"}
                  isDragging={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};
