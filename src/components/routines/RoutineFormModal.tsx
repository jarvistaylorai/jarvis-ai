"use client";

import { useState } from "react";
import { X, Save, Clock, Calendar } from "lucide-react";

export function RoutineFormModal({ onClose, onAdded, activeWorkspace = 'business' }: unknown) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agent, setAgent] = useState("jarvis");
  const [scheduleType, setScheduleType] = useState<"interval" | "cron">("interval");
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [cronExpression, setCronExpression] = useState("0 8 * * *");
  const [enabled, setEnabled] = useState(true);

  const handleSubmit = async (e: Record<string, unknown>) => {
    e.preventDefault();
    const payload = {
      name,
      description,
      agent_id: agent,
      schedule_type: scheduleType,
      enabled,
      workspace: activeWorkspace,
      ...(scheduleType === "interval" ? { interval_seconds: Number(intervalSeconds) } : { cron_expression: cronExpression })
    };

    const res = await fetch("/api/routines", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.ok) onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-medium text-white">New Routine</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="E.g. Morning Kickoff" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this routine do?" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Agent</label>
              <select value={agent} onChange={e => setAgent(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                <option value="jarvis">Jarvis Default</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-neutral-400 mb-2">Schedule Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setScheduleType("interval")} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-colors ${scheduleType === "interval" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white"}`}>
                  <Clock className="w-4 h-4" /> Interval
                </button>
                <button type="button" onClick={() => setScheduleType("cron")} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm border transition-colors ${scheduleType === "cron" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white"}`}>
                  <Calendar className="w-4 h-4" /> CRON (Adv)
                </button>
              </div>
            </div>

            {scheduleType === "interval" ? (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Interval (Seconds)</label>
                <input type="number" required min={5} value={intervalSeconds} onChange={e => setIntervalSeconds(e.target.value as unknown)} placeholder="60" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            ) : (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">CRON Expression</label>
                <input required value={cronExpression} onChange={e => setCronExpression(e.target.value)} placeholder="0 8 * * *" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono" />
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-neutral-400">Enable immediately</span>
              <button 
                type="button" 
                onClick={() => setEnabled(!enabled)} 
                className={`w-10 h-6 rounded-full transition-colors relative ${enabled ? 'bg-indigo-600' : 'bg-neutral-800'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-800">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-neutral-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              <Save className="w-4 h-4" /> Save Routine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
