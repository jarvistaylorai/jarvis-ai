import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isFolder?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName, isFolder }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0a0a0b] border border-red-500/20 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.15)] w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Delete {isFolder ? 'Folder' : 'File'}</h3>
          <p className="text-sm text-zinc-400 text-center px-4 leading-relaxed">
            Are you sure you want to delete <span className="text-white font-mono bg-white/5 py-0.5 px-1.5 rounded inline-block">{itemName}</span>?<br/>
            This action cannot be undone{isFolder ? ' and will delete all contents inside.' : '.'}
          </p>
        </div>

        <div className="p-4 bg-[#0f0f11] border-t border-white/[0.04] flex items-center justify-center gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
