import React, { useState } from 'react';
import {
  Plus, Search, BookOpen, Settings, Trash2, Edit2, Check, X,
  ShieldCheck, Cpu, HardDrive, Sun, Moon
} from 'lucide-react';
import { Conversation, OllamaStatus } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenKnowledgeBase: () => void;
  onOpenSettings: () => void;
  ollamaStatus: OllamaStatus | null;
  selectedModel: string | null;
  currentTheme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onOpenKnowledgeBase,
  onOpenSettings,
  ollamaStatus,
  selectedModel,
  currentTheme,
  onToggleTheme,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Group conversations by date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const last7Days = today - 86400000 * 7;

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groups: { [key: string]: Conversation[] } = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  filteredConversations.forEach(c => {
    const time = new Date(c.updated_at).getTime();
    if (time >= today) {
      groups['Today'].push(c);
    } else if (time >= yesterday) {
      groups['Yesterday'].push(c);
    } else if (time >= last7Days) {
      groups['Previous 7 Days'].push(c);
    } else {
      groups['Older'].push(c);
    }
  });

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditingTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      onDeleteConversation(id);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#F7F7F5] dark:bg-[#111111] border-r border-zinc-200 dark:border-[#303030] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header: Brand Mark & Status */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-[#1C1C1E] border border-zinc-800 dark:border-[#303030] flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-5 h-5">
                <path d="M10 8V24H22" stroke="#A3B18A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="21" cy="11" r="2" fill="#A3B18A"/>
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
                Lucas
              </span>
              <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-mono leading-none">
                AI Platform
              </span>
            </div>
          </div>

          {/* Theme & Status Toggle */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
              title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} theme`}
            >
              {currentTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>
            <div
              className={`w-2 h-2 rounded-full ${
                ollamaStatus?.online ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              title={ollamaStatus?.online ? 'Ollama Online' : 'Ollama Offline'}
            />
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="p-3 space-y-1.5 border-b border-zinc-200/80 dark:border-[#242424]">
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-zinc-900 text-white dark:bg-[#202020] dark:text-zinc-100 dark:hover:bg-[#282828] border border-transparent dark:border-[#333333] shadow-sm transition-all"
          >
            <div className="flex items-center space-x-2">
              <Plus className="w-4 h-4 text-[#A3B18A]" />
              <span>New Chat</span>
            </div>
            <kbd className="text-[10px] bg-zinc-800 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-400">
              ⌘N
            </kbd>
          </button>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={onOpenKnowledgeBase}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-[#181818] hover:bg-zinc-200/70 dark:hover:bg-[#222222] text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-[#2C2C2C] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span>Knowledge</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-[#181818] hover:bg-zinc-200/70 dark:hover:bg-[#222222] text-zinc-700 dark:text-zinc-300 border border-zinc-200/70 dark:border-[#2C2C2C] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2A2A2A] text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-[#A3B18A] transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {Object.entries(groups).map(([groupTitle, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupTitle} className="space-y-0.5">
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  {groupTitle}
                </div>
                {items.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isEditing = conv.id === editingId;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                      }}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-zinc-200/90 dark:bg-[#202020] text-zinc-900 dark:text-[#F3F3F3] font-medium'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-[#1A1A1A] hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center space-x-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            autoFocus
                            className="w-full px-1.5 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-[#A3B18A] rounded text-zinc-900 dark:text-zinc-100 outline-none"
                          />
                          <button
                            onClick={(e) => handleSaveRename(conv.id, e)}
                            className="p-1 hover:text-[#A3B18A]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1 hover:text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate pr-4 flex-1">{conv.title}</span>

                          {/* Hover Actions */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0 transition-opacity">
                            <button
                              onClick={(e) => handleStartRename(conv, e)}
                              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(conv.id, e)}
                              className="p-1 text-zinc-400 hover:text-red-500 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-400 dark:text-zinc-500">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* Footer: Local & Private Status */}
        <div className="p-3 border-t border-zinc-200/80 dark:border-[#242424] bg-zinc-100/50 dark:bg-[#0E0E0E] text-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
            <div className="flex items-center space-x-1.5 truncate">
              <Cpu className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span className="truncate font-mono">{selectedModel || 'No model active'}</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {ollamaStatus?.online ? 'RPi5 Ready' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-200/40 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Local & Private</span>
            </div>
            <span className="text-[10px] text-zinc-400">LAN Safe</span>
          </div>
        </div>
      </aside>
    </>
  );
};
