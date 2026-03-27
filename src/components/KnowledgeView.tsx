"use client";

import React, { useState, useEffect } from 'react';
import { Document } from '@/lib/docs';
import { KnowledgeSidebar } from '@/components/knowledge/KnowledgeSidebar';
import { DocViewer } from '@/components/knowledge/DocViewer';
import { DocEditor } from '@/components/knowledge/DocEditor';

export function KnowledgeView({ activeWorkspace = 'business' }: { activeWorkspace?: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    if (searchQuery) {
      const delay = setTimeout(() => {
        searchDocs(searchQuery);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      fetchDocs();
    }
  }, [searchQuery, activeWorkspace, fetchDocs, searchDocs]);

      const fetchDocs = async () => {
    try {
      const res = await fetch(`/api/knowledge?workspace=${activeWorkspace}`);
      const data = await res.json();
      setDocs(data.docs || []);
      
      if (!selectedDocId && data.docs?.length > 0) {
        // Select overview by default if exists
        const overview = data.docs.find((d: Document) => d.id === 'doc-overview');
        if (overview) setSelectedDocId(overview.id);
        else setSelectedDocId(data.docs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

    const searchDocs = async (query: string) => {
    try {
      const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}&workspace=${activeWorkspace}`);
      const results = await res.json();
      setDocs(results || []);
    } catch (e) {
      console.error(e);
    }
  };

  const activeDoc = docs.find(d => d.id === selectedDocId) || null;

  const handleSave = async (title: string, content: string, category: string, tags: string[]) => {
    try {
      if (activeDoc && activeDoc.id !== 'new-doc-id') {
        // Update existing
        await fetch(`/api/knowledge/${activeDoc.id}?workspace=${activeWorkspace}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category, tags }),
        });
      } else {
        // Create new
        const res = await fetch(`/api/knowledge?workspace=${activeWorkspace}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category, tags }),
        });
        const newDoc = await res.json();
        setSelectedDocId(newDoc.id);
      }
      setIsEditing(false);
      await fetchDocs(); // Refresh
    } catch (e) {
      console.error('Failed to save doc', e);
    }
  };

  const handleNewDoc = () => {
    setSelectedDocId(null);
    setIsEditing(true);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#050505] text-zinc-300 border border-white/[0.04] rounded-2xl shadow-2xl overflow-hidden font-sans">
      <KnowledgeSidebar 
        docs={docs} 
        selectedDocId={selectedDocId} 
        onSelectDoc={(id) => {
          setSelectedDocId(id);
          setIsEditing(false);
        }}
        onNewDoc={handleNewDoc}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-500 animate-pulse">Loading Knowledge Base...</p>
          </div>
        ) : isEditing ? (
          <div className="h-full p-6">
            <DocEditor 
              doc={selectedDocId ? activeDoc : null} 
              onSave={handleSave} 
              onCancel={() => {
                setIsEditing(false);
                if (!selectedDocId && docs.length > 0) setSelectedDocId(docs[0].id);
              }} 
            />
          </div>
        ) : (
          <DocViewer 
            doc={activeDoc} 
            onEdit={() => setIsEditing(true)} 
          />
        )}
      </div>
    </div>
  );
}
