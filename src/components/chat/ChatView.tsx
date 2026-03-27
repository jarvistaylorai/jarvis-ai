'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Sparkles, ShieldCheck, Activity, Clock, Cpu, Mic, Paperclip, Zap } from 'lucide-react';
import clsx from 'clsx';

interface ChatViewProps {
  activeWorkspace: string;
}

type AgentOption = {
  id: string;
  name: string;
  role: string;
};

type ModelOption = {
  value: string;
  label: string;
  description?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
};

type ConversationMap = Record<string, ChatMessage[]>;

type ApiMessage = { role: 'user' | 'assistant' | 'system'; content: string };

type ChatResponse = {
  content: string;
  modelUsed?: string;
  budgetStatus?: unknown;
};

type ClientInstrumentation = {
  requestId: string;
  historyChars: number;
  messageCount: number;
  largestMessageChars: number;
};

type RawAgent = { id: string; name: string; role?: string; handle?: string };
type RawModel = { name: string; name_display?: string };

const PROMPT_SUGGESTIONS = [
  {
    title: 'Spin up a tactical plan',
    body: 'Coordinate a four-agent strike on the ops backlog. Surface blockers and propose mitigations.',
  },
  {
    title: 'Audit mission health',
    body: 'Give me a heartbeat sweep: spend, latency, open risks, and next best actions.',
  },
  {
    title: 'Brief the subagents',
    body: 'Draft synchronized orders for Dev, Ops, and Heartbeat monitors for the next 6 hours.',
  },
  {
    title: 'Synthesize context',
    body: 'Fuse memory vault + current telemetry into a two paragraph situational update.',
  },
];

const FALLBACK_AGENTS: AgentOption[] = [
  { id: 'cbeb732d-01fd-4478-b7ad-e026a332a3d6', name: 'Jarvis', role: 'Orchestrator' },
  { id: 'cbe907d1-26f2-4d41-90df-2fa52c998e4d', name: 'Dev Agent', role: 'Engineering Subagent' },
  { id: '18d608d9-d5cb-4a8b-8bc5-c1dc13f01405', name: 'Ops Agent', role: 'Operations Subagent' },
  { id: 'ff05c1d6-4735-465b-93f5-735973b42769', name: 'Heartbeat Monitor', role: 'Heartbeat Subagent' },
];

const FALLBACK_MODELS: ModelOption[] = [
  { value: 'openrouter/auto', label: 'OpenRouter Auto (Claude Opus 4.6)' },
  { value: 'openrouter/anthropic/claude-3.5-sonnet', label: 'Claude Sonnet 3.5' },
  { value: 'openrouter/openai/gpt-4.5-preview', label: 'GPT-4.5 Preview' },
  { value: 'openrouter/devin/ultra', label: 'Devin Ultra 1.5' },
];

const formatTimestamp = () => new Date().toISOString();

const createMessage = (role: 'user' | 'assistant', content: string, model?: string): ChatMessage => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  role,
  content,
  timestamp: formatTimestamp(),
  model,
});

const formatModelLabel = (name: string) => {
  if (name.startsWith('openrouter/')) {
    return name.replace('openrouter/', '').replace(/[-_]/g, ' ').toUpperCase();
  }
  return name;
};

const createInstrumentationRequestId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cc-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const computeClientMetrics = (
  payload: ApiMessage[],
  requestId: string
): ClientInstrumentation => {
  const historyChars = payload.reduce((sum, msg) => sum + msg.content.length, 0);
  const largestMessageChars = payload.reduce((max, msg) => Math.max(max, msg.content.length), 0);
  return {
    requestId,
    historyChars,
    messageCount: payload.length,
    largestMessageChars,
  };
};

export const ChatView: React.FC<ChatViewProps> = ({ activeWorkspace }) => {
  const [agents, setAgents] = useState<AgentOption[]>(FALLBACK_AGENTS);
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS);
  const [selectedAgentId, setSelectedAgentId] = useState(FALLBACK_AGENTS[0].id);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].value);
  const [messageHistory, setMessageHistory] = useState<ConversationMap>({});
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMessages = messageHistory[selectedAgentId] ?? [];
  const activeAgent = useMemo(() => agents.find((a) => a.id === selectedAgentId) ?? agents[0], [agents, selectedAgentId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agents?workspace=${activeWorkspace}`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const raw = Array.isArray(payload?.data) ? payload.data : payload;
        if (!Array.isArray(raw) || raw.length === 0) return;
        const mapped: AgentOption[] = (raw as RawAgent[]).map((agent) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role || agent.handle || 'Autonomous Agent',
        }));
        setAgents(mapped);
        setSelectedAgentId((current) => {
          if (mapped.some((agent) => agent.id === current)) {
            return current;
          }
          return mapped[0].id;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/models')
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        if (!Array.isArray(payload) || payload.length === 0) return;
        const mapped: ModelOption[] = (payload as RawModel[]).map((model) => ({ value: model.name, label: model.name_display || formatModelLabel(model.name) }));
        setModels(mapped);
        setSelectedModel((current) => {
          if (mapped.some((model) => model.value === current)) {
            return current;
          }
          return mapped[0].value;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setMessagesForAgent = (agentId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessageHistory((prev) => ({
      ...prev,
      [agentId]: updater(prev[agentId] ?? []),
    }));
  };

  const payloadFromHistory = (messages: ChatMessage[]): ApiMessage[] =>
    messages.map((msg) => ({ role: msg.role, content: msg.content }));

  const sendMessage = async (prefilled?: string) => {
    if (isSending) return;
    const text = (prefilled ?? input).trim();
    if (!text) return;

    const userMessage = createMessage('user', text);
    setMessagesForAgent(selectedAgentId, (prev) => [...prev, userMessage]);
    if (!prefilled) setInput('');
    setError(null);
    setIsSending(true);

    const history = payloadFromHistory([...(messageHistory[selectedAgentId] ?? []), userMessage]);
    const requestId = createInstrumentationRequestId();
    const clientMetrics = computeClientMetrics(history, requestId);
    const requestBody = {
      agentId: selectedAgentId,
      model: selectedModel,
      workspaceId: activeWorkspace,
      messages: history,
      instrumentation: {
        requestId,
        client: clientMetrics,
        metadata: {
          historyMessageCount: history.length,
        },
      },
    };
    let serializedBody = JSON.stringify(requestBody);
    for (let i = 0; i < 2; i += 1) {
      const snapshotLength = serializedBody.length;
      clientMetrics.payloadChars = snapshotLength;
      serializedBody = JSON.stringify(requestBody);
      if (serializedBody.length === snapshotLength) {
        break;
      }
    }
    const payloadChars = serializedBody.length;
    console.log('[CommandChannel][ClientMetrics]', {
      requestId,
      ...clientMetrics,
      payloadChars,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-command-channel-request-id': requestId,
          'x-command-channel-body-chars': String(payloadChars),
        },
        body: serializedBody,
      });

      if (!response.ok) {
        throw new Error('Chat endpoint returned an error');
      }

      const data: ChatResponse = await response.json();
      const assistantMessage = createMessage('assistant', (data.content || '').trim() || 'No response provided.', data.modelUsed);
      setMessagesForAgent(selectedAgentId, (prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessagesForAgent(selectedAgentId, () => []);
    setError(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-900/40 via-slate-900/30 to-slate-900/60 p-8">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.4),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 text-[11px] tracking-[0.2em] uppercase text-indigo-300">
              <Sparkles size={16} />
              Jarvis Tactical Operator
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight">Command Channel</h1>
              <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Link
              </span>
            </div>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Synchronize with Jarvis, Dev, Ops, and Heartbeat agents. Route directives, capture telemetry, and deploy reasoning bursts without leaving mission control.
            </p>
            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80">
                <ShieldCheck size={14} className="text-emerald-400" /> Shielded Circuit
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-zinc-300">
                <Activity size={14} className="text-amber-300" /> Engine Pulse 5s
              </span>
            </div>
          </div>
          <div className="w-full max-w-xs space-y-4">
            <div>
              <label className="text-[11px] uppercase font-semibold tracking-[0.2em] text-zinc-400 mb-2 block">Model Routing</label>
              <div className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
                <select
                  value={selectedModel}
                  onChange={(e) => { setSelectedModel(e.target.value); setError(null); }}
                  className="w-full bg-transparent text-sm text-white focus:outline-none"
                >
                  {models.map((model) => (
                    <option key={model.value} value={model.value} className="bg-[#050505] text-white">
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-semibold tracking-[0.2em] text-zinc-400 mb-2 block">Agent Channel</label>
              <div className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
                <select
                  value={selectedAgentId}
                  onChange={(e) => { setSelectedAgentId(e.target.value); setError(null); }}
                  className="w-full bg-transparent text-sm text-white focus:outline-none"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id} className="bg-[#050505] text-white">
                      {agent.name} — {agent.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            onClick={() => setInput(suggestion.body)}
            className="group text-left bg-[#0a0a0b] border border-white/[0.04] rounded-2xl p-4 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors"
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
              <MessageSquare size={12} className="text-indigo-400" /> Prompt
            </div>
            <h3 className="text-white font-semibold mt-2 text-sm">{suggestion.title}</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{suggestion.body}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Live Conversation</div>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={clearConversation} className="px-3 py-1.5 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors">
                Reset Thread
              </button>
              <span className="text-zinc-500">{currentMessages.length} messages</span>
            </div>
          </div>

          <div className="flex-1 rounded-3xl border border-white/5 bg-[#060607] shadow-inner flex flex-col min-h-[460px]">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
              {currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 text-sm gap-2">
                  <MessageSquare size={32} className="text-zinc-700" />
                  <p>Awaiting directives. Feed context or tap a prompt card to begin.</p>
                </div>
              ) : (
                currentMessages.map((message) => (
                  <div key={message.id} className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={clsx(
                        'max-w-[70%] rounded-2xl px-4 py-3 border border-white/5 shadow-lg backdrop-blur-sm',
                        message.role === 'user'
                          ? 'bg-indigo-600/20 text-white border-indigo-500/20'
                          : 'bg-white/5 text-zinc-100 border-white/10'
                      )}
                    >
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2 flex items-center gap-2">
                        {message.role === 'user' ? 'You' : activeAgent?.name || 'Jarvis'}
                        {message.model && (
                          <span className="px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[9px] font-mono">{formatModelLabel(message.model)}</span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/5 px-6 py-4 space-y-3">
              {error && (
                <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-xl">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2"><Zap size={14} className="text-amber-400" /> Command Stream</span>
                <span className="flex items-center gap-2"><Clock size={14} className="text-zinc-500" /> {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Deploy instructions, feed context, or request analysis..."
                    className="w-full h-28 bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-400 resize-none"
                  />
                  <div className="absolute bottom-3 right-4 flex items-center gap-3 text-zinc-500">
                    <button type="button" className="hover:text-white transition-colors"><Mic size={16} /></button>
                    <button type="button" className="hover:text-white transition-colors"><Paperclip size={16} /></button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={isSending}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold uppercase tracking-[0.2em] border border-white/10 disabled:opacity-50"
                >
                  {isSending ? 'Routing…' : 'Engage'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/70 to-black/60 p-5 space-y-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Jarvis System Uplink</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Uptime</span>
                <span className="text-white font-mono">148h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Latency</span>
                <span className="text-emerald-400 font-mono">231 ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Cache Hits</span>
                <span className="text-white font-mono">87%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Trace ID</span>
                <span className="text-indigo-300 font-mono">AX-4F-{activeWorkspace.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#060607] p-5 space-y-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Agent Status</div>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-white">{agent.name}</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{agent.role}</div>
                  </div>
                  <span className={clsx('px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border', agent.id === selectedAgentId ? 'border-blue-400 text-blue-300 bg-blue-500/10' : 'border-white/10 text-zinc-500')}>
                    {agent.id === selectedAgentId ? 'Live' : 'Idle'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#060607] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <Cpu size={14} className="text-amber-400" /> Runtime Notes
            </div>
            <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
              <li>Context window auto-sized between 1.5k–3k tokens.</li>
              <li>Per-agent overrides feed directly into OpenRouter routing.</li>
              <li>Heartbeat agent mirrors this interface for diagnostics.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
