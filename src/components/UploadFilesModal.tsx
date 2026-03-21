import React, { useState, useRef, useCallback } from 'react';
import { X, UploadCloud, File as FileIcon, CheckCircle2, Loader2, XCircle } from 'lucide-react';

interface UploadFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onUploadComplete: () => void;
  activeWorkspace?: string;
}

export const UploadFilesModal: React.FC<UploadFilesModalProps> = ({ isOpen, onClose, currentPath, onUploadComplete, activeWorkspace = 'business' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetPath', currentPath);
        formData.append('workspace', activeWorkspace);

        const res = await fetch('/api/fs/upload', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      onUploadComplete();
      setFiles([]);
      setTimeout(() => {
        onClose();
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      console.error('Upload Error:', err);
      setUploading(false);
      alert('Error uploading files');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!uploading ? onClose : undefined} />
      
      <div className="relative bg-[#0a0a0b] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#0f0f11]">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Upload Files</h3>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5">Dest: {currentPath}</p>
          </div>
          <button onClick={onClose} disabled={uploading} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 bg-[#050505] hover:bg-white/[0.02]'}`}
          >
            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-zinc-400'}`}>
              <UploadCloud size={32} />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Click or drag files here</h4>
            <p className="text-xs text-zinc-500">Support for all file types up to 100MB</p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Selected Files ({files.length})</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-[#0f0f11]">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileIcon size={16} className="text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-zinc-200 font-medium truncate">{file.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeFile(i)} className="text-zinc-600 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10 shrink-0">
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/[0.04] bg-[#0f0f11] flex items-center justify-between">
          <div className="flex-1 mr-4">
            {uploading && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 font-mono">{progress}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors disabled:opacity-50">Cancel</button>
            <button 
              onClick={handleUpload} 
              disabled={files.length === 0 || uploading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  Upload {files.length > 0 ? files.length : ''} Files
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
