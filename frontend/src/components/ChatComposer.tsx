import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Paperclip, Database, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  ragEnabled: boolean;
  onToggleRag: () => void;
  activeModelName?: string | null;
  onUploadFile?: (file: File) => Promise<void>;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  ragEnabled,
  onToggleRag,
  activeModelName,
  onUploadFile,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isStreaming && input.trim() && !disabled) {
        onSend(input);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming) {
      onStop();
    } else if (input.trim() && !disabled) {
      onSend(input);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUploadFile) {
      try {
        setIsUploading(true);
        await onUploadFile(files[0]);
        showToast(`Uploaded "${files[0].name}" to Knowledge Base`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to upload document', 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFile) {
      try {
        setIsUploading(true);
        await onUploadFile(e.dataTransfer.files[0]);
        showToast(`Uploaded "${e.dataTransfer.files[0].name}" to Knowledge Base`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to upload document', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-readable mx-auto px-4 sm:px-6 pb-4">
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col rounded-2xl border transition-all duration-150 ${
          isDragging
            ? 'border-[#A3B18A] bg-[#A3B18A]/5'
            : 'border-zinc-200 dark:border-[#303030] bg-white dark:bg-[#222222] shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-600'
        }`}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.md,.docx,.csv,.json"
          className="hidden"
        />

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Ollama is currently unreachable..." : "Message Lucas or ask about your documents..."}
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-[14.5px] text-zinc-900 dark:text-[#F3F3F3] placeholder-zinc-400 dark:placeholder-zinc-500 resize-none outline-none max-h-48 leading-relaxed font-sans"
        />

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-100 dark:border-[#2A2A2A]">
          {/* Left Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {/* Attach Document */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Attach document to Knowledge Base (PDF, MD, TXT, DOCX, CSV, JSON)"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A3B18A]" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Attach</span>
            </button>

            {/* RAG Knowledge Retrieval Toggle */}
            <button
              type="button"
              onClick={onToggleRag}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                ragEnabled
                  ? 'bg-[#A3B18A]/15 text-[#5F6F48] dark:text-[#A3B18A] border border-[#A3B18A]/30'
                  : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={ragEnabled ? "Knowledge Base Retrieval is active (RAG On)" : "Direct LLM response (RAG Off)"}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{ragEnabled ? 'Knowledge ON' : 'Knowledge OFF'}</span>
            </button>

            {/* Model Tag */}
            {activeModelName && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 truncate max-w-[140px]">
                {activeModelName}
              </span>
            )}
          </div>

          {/* Right Action: Send / Stop Button */}
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline text-[11px] text-zinc-400 dark:text-zinc-500 select-none">
              ↵ send • shift+↵ new line
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 flex items-center justify-center transition-all shadow-sm"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || disabled}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                  input.trim() && !disabled
                    ? 'bg-[#1C1C1C] dark:bg-[#F3F3F3] text-white dark:text-zinc-900 hover:opacity-90'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
