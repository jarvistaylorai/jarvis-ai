import React from 'react';
import { Network, CheckCircle, AlertCircle } from 'lucide-react';

export const ProviderSettings = ({ providers, onUpdate }: { providers: unknown[], onUpdate: () => void }) => {
  const defaultProviders = [
    { id: 'openai', name: 'OpenAI', icon: '⚡' },
    { id: 'anthropic', name: 'Anthropic', icon: '🧠' },
    { id: 'google', name: 'Gemini', icon: '✨' }
  ];

  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-2xl p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Network size={16} className="text-emerald-400" />
            Provider Integration
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {defaultProviders.map(p => {
          const connected = providers.find(prov => prov.provider === p.id && prov.status === 'connected');
          return (
            <div key={p.id} className="p-3 rounded-xl border border-white/5 bg-black/40 flex justify-between items-center group hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                  {p.icon}
                </div>
                <h3 className="text-xs font-bold text-white tracking-widest">{p.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                {connected ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <AlertCircle size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Missing Key</span>
                  </div>
                )}
                <button className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
