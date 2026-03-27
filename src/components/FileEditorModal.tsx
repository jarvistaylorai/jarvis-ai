import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileText, Code, FileJson, Activity, Loader2 } from 'lucide-react';

interface FileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileName: string;
  onSaved: () => void;
  activeWorkspace?: string;
}

export const FileEditorModal: React.FC<FileEditorModalProps> = ({ isOpen, onClose, filePath, fileName, onSaved, activeWorkspace = 'business' }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLog = fileName.endsWith('.log');
  const isJson = fileName.endsWith('.json');
  const isMd = fileName.endsWith('.md');
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = /\.(mp4|webm)$/i.test(fileName);
  const isAudio = /\.(mp3|wav|ogg)$/i.test(fileName);
  const isPdf = fileName.endsWith('.pdf');
  const isTextLike = isLog || isJson || isMd || /\.(txt|csv|html|css|js|ts|tsx|jsx|py|go|rs|java|c|cpp|h|hpp|sh|yml|yaml|xml)$/i.test(fileName);
  const isUneditable = isImage || isVideo || isAudio || isPdf || !isTextLike;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logTailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && filePath) {
      if (!isUneditable) {
        fetchContent();
      }
    }
    }, [isOpen, filePath, isUneditable]);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}&workspace=${activeWorkspace}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to read file');
      }
      const data = await res.json();
      setContent(data.content);
    } catch (err: unknown) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLog && logTailRef.current) {
      logTailRef.current.scrollTop = logTailRef.current.scrollHeight;
    }
  }, [content, isLog]);

  const handleSave = async () => {
    if (isLog) return; // logs read only
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: filePath, content, isFolder: false, workspace: activeWorkspace })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save file');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0a0a0b] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-6 bg-[#0f0f11] shrink-0">
          <div className="flex items-center gap-3">
            {isMd ? <FileText size={18} className="text-blue-400" /> : 
             isJson ? <FileJson size={18} className="text-yellow-400" /> : 
             isLog ? <Activity size={18} className="text-emerald-400" /> : 
             <Code size={18} className="text-zinc-400" />}
            <h3 className="text-sm font-medium text-white">{fileName}</h3>
            <span className="text-[10px] text-zinc-500 font-mono bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.05]">
              {filePath}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isLog && !isUneditable && (
              <button 
                onClick={handleSave}
                disabled={loading || saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Bar */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 text-xs text-red-400 flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 bg-[#050505] relative overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : isImage ? (
            <div className="w-full h-full p-4 flex items-center justify-center bg-black/40">
              <Image src={`/api/fs/raw?path=${encodeURIComponent(filePath)}`} alt={fileName} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" fill unoptimized />
            </div>
          ) : isVideo ? (
             <div className="w-full h-full p-4 flex items-center justify-center bg-black/40">
              <video src={`/api/fs/raw?path=${encodeURIComponent(filePath)}`} controls className="max-w-full max-h-full rounded-xl shadow-2xl" />
            </div>
          ) : isUneditable ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-zinc-500 gap-4">
                <FileText size={48} className="opacity-20" />
                <p className="text-sm font-medium">Preview not available for this file type.</p>
                <a href={`/api/fs/raw?path=${encodeURIComponent(filePath)}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-white transition-colors border border-white/10 mt-2">
                  Download / View Raw
                </a>
             </div>
          ) : isLog ? (
            <div 
              ref={logTailRef}
              className="absolute inset-0 p-6 font-mono text-xs text-emerald-400/80 whitespace-pre-wrap overflow-y-auto custom-scrollbar"
            >
              {content || 'Empty log file.'}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="absolute inset-0 w-full h-full p-6 bg-transparent text-zinc-300 font-mono text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar"
              spellCheck={false}
              placeholder="Enter file content..."
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="h-8 border-t border-white/[0.04] bg-[#0f0f11] flex items-center px-4 shrink-0 text-[10px] text-zinc-500 uppercase tracking-widest font-semibold gap-4">
          <span>{isUneditable ? 'Media / Binary' : isLog ? 'Read Only' : 'Editing'}</span>
          {!isUneditable && <span>{content.length} characters</span>}
          {isJson && <span>JSON Format</span>}
          {isMd && <span>Markdown Format</span>}
        </div>

      </div>
    </div>
  );
};
