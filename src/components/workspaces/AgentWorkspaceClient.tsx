import React, { useState, useEffect } from 'react';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { WorkspaceMain } from './WorkspaceMain';
import { LiveContextPreview } from './LiveContextPreview';

export const AgentWorkspaceClient = ({ agents, currentAgentId, onAgentSelect }: { agents: string[], currentAgentId: string, onAgentSelect?: (agentId: string) => void }) => {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('IDENTITY.md');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleNewFile = () => {
    let name = window.prompt("Enter new file name (e.g., 'SKILLS.md'):");
    if (!name || !name.trim()) return;
    
    name = name.trim().toUpperCase();
    if (!name.endsWith('.md')) {
      name += '.md';
    }

    if (files[name] !== undefined) {
      alert("File already exists!");
      return;
    }

    setFiles(prev => ({ ...prev, [name]: '' }));
    setSelectedFile(name);
    setEditContent('');
    setIsEditing(true);
  };

  useEffect(() => {
    // Fetch files for the current agent
    fetch(`/api/workspaces/${currentAgentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files);
      })
      .catch(err => console.error('Failed to fetch agent files:', err));
  }, [currentAgentId]);

  const handleFileSelect = (file: string) => {
    if (isEditing) {
      // Optional: prompt if unsaved changes
      setIsEditing(false);
    }
    setSelectedFile(file);
    setEditContent(files[file] || '');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${currentAgentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: selectedFile,
          content: editContent,
        }),
      });
      if (res.ok) {
        setFiles(prev => ({ ...prev, [selectedFile]: editContent }));
        setIsEditing(false);
      } else {
        console.error('Failed to save file');
      }
    } catch (err) {
      console.error('Error saving:', err);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-80px)] bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-amber-500/30">
      <WorkspaceSidebar 
        agents={agents} 
        currentAgentId={currentAgentId} 
        files={Object.keys(files)} 
        selectedFile={selectedFile} 
        onFileSelect={handleFileSelect} 
        onAgentSelect={onAgentSelect}
        onNewFile={handleNewFile}
      />
      <WorkspaceMain 
        agentId={currentAgentId}
        selectedFile={selectedFile}
        content={isEditing ? editContent : (files[selectedFile] || '')}
        isEditing={isEditing}
        onEdit={() => { setIsEditing(true); setEditContent(files[selectedFile] || ''); }}
        onCancel={() => { setIsEditing(false); setEditContent(''); }}
        onSave={handleSave}
        onContentChange={setEditContent}
        isSaving={isSaving}
        onShowPreview={() => setShowPreview(true)}
      />
      {showPreview && (
        <LiveContextPreview 
          files={files} 
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
};
