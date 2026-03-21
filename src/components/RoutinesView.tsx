"use client";

import { useEffect, useState } from "react";
import { Header } from "./routines/Header";
import { WeekView } from "./routines/WeekView";
import { TodayView } from "./routines/TodayView";
import { RoutineDetailPanel } from "./routines/RoutineDetailPanel";
import { RoutineFormModal } from "./routines/RoutineFormModal";

export function RoutinesView({ activeWorkspace = 'business' }: { activeWorkspace?: string }) {
  const [routines, setRoutines] = useState<any[]>([]);
  const [view, setView] = useState<"Week" | "Today">("Week");
  const [selectedRoutine, setSelectedRoutine] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`/api/routines?workspace=${activeWorkspace}`);
      if (res.ok) {
        const data = await res.json();
        setRoutines(data);
        if (selectedRoutine) {
          const updated = data.find((r: any) => r.id === selectedRoutine.id);
          if (updated) setSelectedRoutine(updated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch routines", err);
    }
  };

  useEffect(() => {
    fetchRoutines();
    const interval = setInterval(fetchRoutines, 5000); // Poll every 5s for real-time vibe
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-500">
      <Header 
        routines={routines} 
        view={view} 
        setView={setView} 
        onNew={() => setIsFormOpen(true)}
      />

      <div className="flex-1 overflow-hidden mt-6">
        {view === "Week" ? (
          <WeekView routines={routines} onClickRoutine={setSelectedRoutine} />
        ) : (
          <TodayView routines={routines} onClickRoutine={setSelectedRoutine} />
        )}
      </div>

      {selectedRoutine && (
        <RoutineDetailPanel 
          routine={selectedRoutine} 
          onClose={() => setSelectedRoutine(null)}
          onRefresh={fetchRoutines}
          activeWorkspace={activeWorkspace}
        />
      )}

      {isFormOpen && (
        <RoutineFormModal 
          onClose={() => setIsFormOpen(false)}
          onAdded={() => {
            setIsFormOpen(false);
            fetchRoutines();
          }}
          activeWorkspace={activeWorkspace}
        />
      )}
    </div>
  );
}
