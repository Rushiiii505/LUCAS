import React, { useState } from 'react';
import { BookOpen, ExternalLink, X, FileText } from 'lucide-react';
import { Citation } from '../types';

interface SourceCitationProps {
  citations: Citation[];
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citations }) => {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
      <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
        <BookOpen className="w-3.5 h-3.5 text-[#A3B18A]" />
        <span>Grounded in Knowledge Base ({citations.length} {citations.length === 1 ? 'source' : 'sources'})</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {citations.map((c, idx) => (
          <button
            key={`${c.chunk_id}-${idx}`}
            onClick={() => setSelectedCitation(c)}
            className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all text-left"
          >
            <FileText className="w-3 h-3 text-[#A3B18A] shrink-0" />
            <span className="font-medium truncate max-w-[180px]">{c.document_name}</span>
            {c.page_or_section && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-[120px]">
                • {c.page_or_section}
              </span>
            )}
            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-zinc-400 transition-opacity" />
          </button>
        ))}
      </div>

      {/* Source Preview Modal / Drawer */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1E1E1E] border border-zinc-200 dark:border-[#303030] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-[#2C2C2C] bg-zinc-50/60 dark:bg-[#181818]">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#A3B18A]" />
                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[320px]">
                  {selectedCitation.document_name}
                </span>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  Location: <strong className="text-zinc-700 dark:text-zinc-200">{selectedCitation.page_or_section || 'Full Document'}</strong>
                </span>
                <span>
                  Relevance Score: <strong className="text-[#A3B18A]">{(selectedCitation.score * 100).toFixed(1)}%</strong>
                </span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#151515] border border-zinc-200/80 dark:border-[#282828] text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedCitation.snippet || 'No excerpt available.'}
              </div>

              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                Chunk ID: {selectedCitation.chunk_id}
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-[#2C2C2C] bg-zinc-50/60 dark:bg-[#181818] flex justify-end">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-3 py-1.5 rounded-md text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
