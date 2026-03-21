import React from 'react';
import { Zap, Play, PowerOff } from 'lucide-react';

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

export const AutomationsView = ({ rules = [], activeWorkspace = 'business' }: { rules?: any[], activeWorkspace?: string }) => {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
            <Zap className="text-yellow-400" size={24} />
            Automation Engine
          </h2>
          <p className="text-sm text-zinc-500 mt-1">IF/THEN rule evaluator for the autonomous loop</p>
        </div>
        <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors">
          Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules && rules.map((rule: any) => (
          <Card key={rule.id} className="p-5 flex items-center gap-6 border-white/[0.02]">
            <div className="shrink-0 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              {rule.enabled ? (
                 <Play size={20} className="text-yellow-400" />
              ) : (
                 <PowerOff size={20} className="text-zinc-600" />
              )}
            </div>
            
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1 bg-[#0a0a0b] p-3 rounded-lg border border-white/[0.05] font-mono text-xs">
                 <span className="text-zinc-500 mr-2">IF</span>
                 <span className="text-emerald-400">{rule.trigger}</span>
                 {rule.condition && rule.condition !== 'true' && (
                   <>
                     <span className="text-zinc-500 mx-2">AND</span>
                     <span className="text-emerald-400">{rule.condition}</span>
                   </>
                 )}
              </div>
              
              <div className="text-zinc-600 font-bold">→</div>
              
              <div className="flex-1 bg-[#0a0a0b] p-3 rounded-lg border border-white/[0.05] font-mono text-xs">
                 <span className="text-zinc-500 mr-2">THEN</span>
                 <span className="text-indigo-400">{rule.action}</span>
              </div>
            </div>

            <div className="shrink-0">
               <label className="relative inline-flex items-center cursor-pointer">
                 <input type="checkbox" className="sr-only peer" checked={rule.enabled} readOnly />
                 <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
               </label>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
