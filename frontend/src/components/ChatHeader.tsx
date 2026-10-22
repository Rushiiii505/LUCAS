import React, { useState } from 'react';
import { Menu, ChevronDown, Check, Sparkles, Database, Wifi, WifiOff, Edit3 } from 'lucide-react';
import { OllamaModel } from '../types';

interface ChatHeaderProps {
  title: string;
  onRenameTitle?: (newTitle: string) => void;
  models: OllamaModel[];
  selectedModel: string | null;
  onSelectModel: (modelName: string) => void;
  ragEnabled: boolean;
  onToggleRag: () => void;
  isOllamaOnline: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  onRenameTitle,
  models,
  selectedModel,
  onSelectModel,
  ragEnabled,
  onToggleRag,
  isOllamaOnline,
  onToggleSidebar,
  onOpenSettings,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(title);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim() && onRenameTitle) {
      onRenameTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 border-b border-zinc-200/80 dark:border-[#303030] bg-white/70 dark:bg-[#171717]/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger & Title */}
      <div className="flex items-center space-x-3 overflow-hidden">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex items-center">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              autoFocus
              className="text-sm font-medium px-2 py-1 rounded border border-[#A3B18A] bg-zinc-50 dark:bg-[#202020] text-zinc-900 dark:text-zinc-100 outline-none w-48 sm:w-64"
            />
          </form>
        ) : (
          <div
            onClick={() => {
              setTitleInput(title);
              setIsEditingTitle(true);
            }}
            className="flex items-center space-x-1.5 cursor-pointer group max-w-[200px] sm:max-w-md"
            title="Click to rename conversation"
          >
            <h1 className="text-sm font-medium text-zinc-900 dark:text-[#F3F3F3] truncate">
              {title || 'New Conversation'}
            </h1>
            <Edit3 className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        )}
      </div>

      {/* Right: Model Selector, RAG Badge, and Connection Status */}
      <div className="flex items-center space-x-2.5">
        {/* Knowledge Retrieval Toggle Tag */}
        <button
          onClick={onToggleRag}
          className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            ragEnabled
              ? 'bg-[#A3B18A]/15 text-[#4E5C37] dark:text-[#A3B18A] border border-[#A3B18A]/30'
              : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'
          }`}
          title={ragEnabled ? "RAG Active: Answers will query local documents" : "RAG Off: Direct LLM generation"}
        >
          <Database className="w-3 h-3" />
          <span>{ragEnabled ? 'RAG Active' : 'Direct LLM'}</span>
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 transition-colors"
          >
            <span className="truncate max-w-[120px] sm:max-w-[160px]">
              {selectedModel || 'Select Model'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-zinc-200 dark:border-[#303030] bg-white dark:bg-[#1E1E1E] shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-[#2C2C2C] text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Installed Ollama Models
                </div>
                {models.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-zinc-500 text-center">
                    No models found. Run <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">ollama pull &lt;model&gt;</code>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto py-1">
                    {models.map((m) => (
                      <button
                        key={m.name}
                        onClick={() => {
                          onSelectModel(m.name);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-[#282828] transition-colors ${
                          selectedModel === m.name ? 'text-[#A3B18A] font-medium' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {m.parameter_size} • {m.quantization_level}
                          </div>
                        </div>
                        {selectedModel === m.name && (
                          <Check className="w-3.5 h-3.5 text-[#A3B18A] shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Ollama Connection Indicator */}
        <div
          onClick={onOpenSettings}
          className="flex items-center space-x-1.5 px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={isOllamaOnline ? "Ollama Connected" : "Ollama Offline — Click for Settings"}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isOllamaOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
