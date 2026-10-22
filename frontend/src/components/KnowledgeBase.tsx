import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileText, Trash2, RotateCw, Eye, Search, X,
  CheckCircle2, AlertCircle, Clock, Database, HardDrive, Loader2
} from 'lucide-react';
import { DocumentItem } from '../types';
import {
  fetchDocuments, uploadDocumentFile, deleteDocument,
  reindexDocument, fetchDocumentPreview, searchKnowledgeBase
} from '../services/api';
import { useToast } from './Toast';

interface KnowledgeBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const loadDocs = async () => {
    try {
      setLoading(true);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (e: any) {
      showToast(e.message || 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocs();
      // Poll every 4 seconds if any doc is processing or uploaded
      const interval = setInterval(async () => {
        try {
          const docs = await fetchDocuments();
          setDocuments(docs);
        } catch {}
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      await uploadDocumentFile(file);
      showToast(`Uploaded ${file.name}. Indexing in background...`, 'success');
      await loadDocs();
    } catch (e: any) {
      showToast(e.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This removes all indexed chunks and embeddings.`)) {
      try {
        await deleteDocument(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
        showToast(`Deleted ${name}`, 'info');
      } catch (e: any) {
        showToast(e.message || 'Delete failed', 'error');
      }
    }
  };

  const handleReindex = async (id: string, name: string) => {
    try {
      await reindexDocument(id);
      showToast(`Reindexing queued for ${name}`, 'info');
      await loadDocs();
    } catch (e: any) {
      showToast(e.message || 'Reindex failed', 'error');
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const data = await fetchDocumentPreview(id);
      setPreviewDoc(data);
    } catch (e: any) {
      showToast(e.message || 'Preview failed', 'error');
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    try {
      setSearching(true);
      const res = await searchKnowledgeBase(testQuery);
      setTestResults(res.chunks || []);
    } catch (e: any) {
      showToast(e.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  if (!isOpen) return null;

  const filteredDocs = documents.filter(d =>
    d.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
  const totalBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#303030] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#282828] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#A3B18A]/15 text-[#A3B18A]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Local Knowledge Base
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ground your local models with your private documents using RAG.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Knowledge Stats Banner */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-zinc-50 dark:bg-[#141414] border-b border-zinc-200 dark:border-[#282828] text-xs">
          <div>
            <span className="text-zinc-400 block text-[11px]">Indexed Documents</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{documents.length}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">Vector Chunks</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{totalChunks}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">Storage Footprint</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{(totalBytes / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#A3B18A] bg-[#A3B18A]/10'
                : 'border-zinc-300 dark:border-[#383838] hover:border-[#A3B18A]/70 bg-zinc-50/50 dark:bg-[#181818]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              accept=".pdf,.txt,.md,.docx,.csv,.json"
              className="hidden"
            />
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[#A3B18A]/15 text-[#A3B18A] flex items-center justify-center">
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {isUploading ? 'Uploading and queueing document...' : 'Click or drag files here to index'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Supports PDF, Markdown (.md), TXT, DOCX, CSV, JSON (up to 25 MB)
            </p>
          </div>

          {/* Test Semantic Search Bar */}
          <form onSubmit={handleSemanticSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Test semantic search against indexed knowledge..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2A2A2A] text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-[#A3B18A]"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !testQuery.trim()}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Test Search'}
            </button>
            {testResults && (
              <button
                type="button"
                onClick={() => setTestResults(null)}
                className="p-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </form>

          {/* Test Search Results */}
          {testResults && (
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#2C2C2C] bg-zinc-50 dark:bg-[#141414] space-y-2">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Found {testResults.length} matching chunks:
              </div>
              {testResults.length === 0 ? (
                <div className="text-xs text-zinc-400">No chunks exceeded similarity threshold.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {testResults.map((r, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800">
                      <div className="flex justify-between font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                        <span>{r.document_name} ({r.page_or_section || 'Section'})</span>
                        <span className="text-[#A3B18A]">{(r.score * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] whitespace-pre-wrap">{r.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Document List Header with Filter */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Indexed Documents ({filteredDocs.length})
            </h3>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by name..."
              className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2A2A2A] text-zinc-800 dark:text-zinc-200 outline-none w-44"
            />
          </div>

          {/* Documents Table / Cards */}
          {loading ? (
            <div className="text-center py-10 text-xs text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A3B18A]" />
              Loading documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-10 border border-zinc-200 dark:border-[#262626] rounded-xl text-xs text-zinc-400 dark:text-zinc-500">
              No documents uploaded yet. Upload a PDF, Markdown, or text file to enable RAG.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-[#282828] border border-zinc-200 dark:border-[#282828] rounded-xl overflow-hidden bg-white dark:bg-[#161616]">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-[#1D1D1D] transition-colors">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                        {doc.filename}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center space-x-2 mt-0.5 font-mono">
                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Status Badge */}
                    {doc.status === 'indexed' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Indexed</span>
                      </span>
                    )}
                    {doc.status === 'processing' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Processing</span>
                      </span>
                    )}
                    {doc.status === 'uploaded' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Queued</span>
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" title={doc.error_message || ''}>
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}

                    {/* Action buttons */}
                    <button
                      onClick={() => handlePreview(doc.id)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                      title="Preview Chunks"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReindex(doc.id, doc.filename)}
                      className="p-1.5 text-zinc-400 hover:text-[#A3B18A] rounded"
                      title="Re-index Document"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Drawer / Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1E1E1E] border border-zinc-200 dark:border-[#303030] rounded-xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-[#2C2C2C] flex items-center justify-between">
                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  Preview: {previewDoc.document.filename} ({previewDoc.chunk_count} chunks)
                </span>
                <button onClick={() => setPreviewDoc(null)} className="p-1 text-zinc-400 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {previewDoc.chunks_preview.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-lg bg-zinc-50 dark:bg-[#151515] border border-zinc-200/80 dark:border-[#282828] text-xs">
                    <div className="text-[11px] font-semibold text-[#A3B18A] mb-1">
                      Chunk #{c.chunk_index + 1} {c.section ? `• ${c.section}` : ''}
                    </div>
                    <div className="text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed text-[11.5px]">
                      {c.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
