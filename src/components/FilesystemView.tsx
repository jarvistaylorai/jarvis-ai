'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Database, Folder, File as FileIcon, Server, Cloud, HardDrive, RefreshCw, ChevronRight, Plus, Upload, Trash2, FileText, FileJson, Activity, Search } from 'lucide-react';
import { FileEditorModal } from './FileEditorModal';
import { UploadFilesModal } from './UploadFilesModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const Card = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-[#0f0f11] border border-white/[0.04] rounded-2xl shadow-2xl p-6 ${className}`}>
    {children}
  </div>
);

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(isoStr: string) {
  const date = new Date(isoStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export const FilesystemView = ({ activeWorkspace = 'business' }: { activeWorkspace?: string }) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [currentVolume, setCurrentVolume] = useState('root');
  
  const [selectedFile, setSelectedFile] = useState<{ path: string, name: string } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const fetchItems = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}&workspace=${activeWorkspace}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchItems(currentPath);
  }, [currentPath, activeWorkspace, fetchItems]);

  const handleSync = () => {
    setSyncing(true);
    fetchItems(currentPath);
  };

  const handleItemClick = (item: Record<string, any>) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
    } else {
      setSelectedFile({ path: item.path, name: item.name });
    }
  };

  const handleDelete = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: itemToDelete.path, workspace: activeWorkspace })
      });
      if (res.ok) {
        fetchItems(currentPath);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setItemToDelete(null);
    }
  };

  const handleNewFolder = () => {
    setCreatingFolder(true);
    setNewFolderName('');
  };

  const submitNewFolder = async () => {
    if (!newFolderName.trim()) {
      setCreatingFolder(false);
      return;
    }
    try {
      const targetPath = currentPath === '/' ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`;
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath, isFolder: true, workspace: activeWorkspace })
      });
      if (res.ok) fetchItems(currentPath);
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingFolder(false);
      setNewFolderName('');
    }
  };

  const handleNewFile = () => {
    setUploadModalOpen(true);
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [items, searchQuery]);

  // Compute breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (currentPath === '/') return [{ name: 'workspace', path: '/' }];
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'workspace', path: '/' }];
    let built = '';
    parts.forEach(p => {
      built += `/${p}`;
      crumbs.push({ name: p, path: built });
    });
    return crumbs;
  }, [currentPath]);

  // Compute stats
  const totalSize = useMemo(() => items.reduce((acc, item) => acc + (item.size || 0), 0), [items]);

  const getFileIcon = (name: string) => {
    if (name.endsWith('.md')) return <FileText size={18} className="text-blue-400 group-hover:text-blue-300 transition-colors" />;
    if (name.endsWith('.json')) return <FileJson size={18} className="text-yellow-400 group-hover:text-yellow-300 transition-colors" />;
    if (name.endsWith('.log')) return <Activity size={18} className="text-emerald-400 group-hover:text-emerald-300 transition-colors" />;
    return <FileIcon size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />;
  };

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col pb-8">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
            <Database className="text-indigo-400" size={24} />
            Virtual Filesystem
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Direct memory access and persistent volume mapping</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-[#0a0a0b] border border-white/[0.05] rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <HardDrive size={16} className="text-zinc-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold leading-none">Current Dir Size</span>
              <span className="text-indigo-400 font-mono font-bold text-xs mt-0.5">{formatSize(totalSize)}</span>
            </div>
            <div className="w-20 h-1.5 bg-black rounded-full overflow-hidden ml-2 border border-white/5">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 w-[15%] relative"></div>
            </div>
          </div>
          
          <button 
            onClick={handleSync}
            className="bg-[#050505] hover:bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-inner"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-indigo-400' : 'text-zinc-400'} />
            <span className="text-xs font-bold uppercase tracking-wider">Sync</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* SIDE ARCHITECTURE TREE */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-4">
          <Card className="p-4 flex-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">Volumes</h3>
            <ul className="space-y-1">
              {[ 
                { id: 'root', icon: Server, label: 'Root System', connected: true },
                { id: 'postgres', icon: Database, label: 'Postgres Data', connected: false },
                { id: 's3', icon: Cloud, label: 'S3 Remote', connected: false },
              ].map((vol, i) => {
                const active = currentVolume === vol.id;
                return (
                <li key={i}>
                  <button 
                    onClick={() => {
                      if (!vol.connected) {
                        alert(`${vol.label} is not connected or configured yet.`);
                        return;
                      }
                      setCurrentVolume(vol.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[11px] uppercase tracking-wider font-bold ${
                    active 
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                      : 'text-zinc-500 hover:bg-white/5 border border-transparent hover:text-white'
                  }`}>
                    <vol.icon size={16} className={active ? 'text-indigo-400' : 'text-zinc-500'} />
                    {vol.label}
                  </button>
                </li>
              )})}
            </ul>
            
            <div className="mt-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">Actions</h3>
              <div className="space-y-2 px-2">
                <button onClick={handleNewFile} className="w-full flex items-center gap-3 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg text-xs font-semibold transition-colors border border-indigo-500/20">
                  <Upload size={14} /> Upload File(s)
                </button>
                <button onClick={handleNewFolder} className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-xs font-semibold transition-colors border border-white/5">
                  <Folder size={14} /> New Folder
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* MAIN FILESYSTEM VIEW */}
        <div className="col-span-12 md:col-span-9">
          <Card className="p-0 overflow-hidden flex flex-col h-full bg-[#0a0a0b]">
            <div className="h-14 border-b border-white/[0.04] flex items-center justify-between px-4 bg-[#0f0f11] shrink-0">
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.path}>
                    <span 
                      onClick={() => setCurrentPath(crumb.path)}
                      className={`cursor-pointer hover:underline transition-colors ${idx === breadcrumbs.length - 1 ? 'text-indigo-400' : 'hover:text-zinc-300'}`}
                    >
                      {crumb.name}
                    </span>
                    {idx < breadcrumbs.length - 1 && <ChevronRight size={14} className="text-zinc-600 mx-1" />}
                  </React.Fragment>
                ))}
              </div>
              
              <div className="flex items-center relative">
                <Search size={14} className="absolute left-3 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#050505] border border-white/[0.05] rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 w-48 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw size={24} className="text-indigo-400 animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                  <Folder size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">This folder is empty.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#0d0d0f] z-10 shadow-md">
                    <tr className="border-b border-white/[0.04] text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                      <th className="px-6 py-4 w-1/2">Name</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4">Items</th>
                      <th className="px-6 py-4 text-right">Modified</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {creatingFolder && (
                      <tr className="border-b border-indigo-500/20 bg-indigo-500/5">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Folder size={18} className="text-indigo-400" fill="currentColor" fillOpacity={0.2} />
                            <input 
                              autoFocus
                              value={newFolderName}
                              onChange={e => setNewFolderName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') submitNewFolder();
                                if (e.key === 'Escape') setCreatingFolder(false);
                              }}
                              onBlur={() => { if (newFolderName) submitNewFolder(); else setCreatingFolder(false); }}
                              className="bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-zinc-600 w-full"
                              placeholder="Folder name..."
                            />
                          </div>
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    )}
                    {filteredItems.map((node) => (
                      <tr 
                        key={node.path} 
                        onClick={() => handleItemClick(node)}
                        className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {node.type === 'folder' ? (
                              <Folder size={18} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="currentColor" fillOpacity={0.2} />
                            ) : getFileIcon(node.name)}
                            <span className={`text-sm font-medium ${node.type === 'folder' ? 'text-indigo-100 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                              {node.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-zinc-500 font-mono truncate">{node.type === 'folder' ? '--' : formatSize(node.size)}</td>
                        <td className="px-6 py-3 text-xs text-zinc-500 font-mono">{node.type === 'folder' ? node.items : '--'}</td>
                        <td className="px-6 py-3 text-xs text-zinc-500 font-mono text-right truncate">{formatDate(node.modified_at)}</td>
                        <td className="px-6 py-3 text-right">
                          <button 
                            onClick={(e) => handleDelete(e, node)}
                            className="text-zinc-600 hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="flex-1 h-full"><td colSpan={5}></td></tr>
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="h-10 border-t border-white/[0.04] flex items-center justify-between px-4 bg-[#0f0f11] text-[10px] uppercase tracking-widest text-zinc-600 font-bold shrink-0">
              <span>{filteredItems.length} Items</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></span>
                <span className="text-emerald-400">System Connected</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <FileEditorModal 
        isOpen={!!selectedFile} 
        onClose={() => setSelectedFile(null)} 
        filePath={selectedFile?.path || ''} 
        fileName={selectedFile?.name || ''}
        onSaved={() => fetchItems(currentPath)}
        activeWorkspace={activeWorkspace}
      />

      <UploadFilesModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        currentPath={currentPath}
        onUploadComplete={() => fetchItems(currentPath)}
        activeWorkspace={activeWorkspace}
      />

      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.name || ''}
        isFolder={itemToDelete?.type === 'folder'}
      />
    </div>
  );
};
