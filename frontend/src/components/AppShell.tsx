import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useTheme } from '../hooks/useTheme';
import { Sidebar } from './Sidebar';
import { ChatHeader } from './ChatHeader';
import { WelcomeScreen } from './WelcomeScreen';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { KnowledgeBase } from './KnowledgeBase';
import { SettingsDialog } from './SettingsDialog';

export const AppShell: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    input,
    setInput,
    isStreaming,
    models,
    selectedModel,
    setSelectedModel,
    ragEnabled,
    setRagEnabled,
    ollamaStatus,
    loadingConv,
    sendMessage,
    stopGeneration,
    regenerateLastMessage,
    selectConversation,
    newChat,
    handleRename,
    handleDelete,
    uploadFile,
    refreshInit,
  } = useChat();

  const { resolvedTheme, toggleTheme } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages if near bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // Keyboard shortcut: Cmd+N or Ctrl+N for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newChat]);

  const activeTitle = activeConversation?.title || (messages.length > 0 ? 'Conversation' : 'New Chat');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAFAF9] dark:bg-[#171717] text-[#202020] dark:text-[#F3F3F3]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={newChat}
        onDeleteConversation={handleDelete}
        onRenameConversation={handleRename}
        onOpenKnowledgeBase={() => setIsKnowledgeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        ollamaStatus={ollamaStatus}
        selectedModel={selectedModel}
        currentTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Conversation Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <ChatHeader
          title={activeTitle}
          onRenameTitle={(newTitle) => activeConversationId && handleRename(activeConversationId, newTitle)}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          ragEnabled={ragEnabled}
          onToggleRag={() => setRagEnabled(!ragEnabled)}
          isOllamaOnline={Boolean(ollamaStatus?.online)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Offline Banner when Ollama is unreachable */}
        {ollamaStatus && !ollamaStatus.online && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                Lucas can't reach Ollama right now. Check that Ollama is running at <strong className="font-mono">{ollamaStatus.base_url}</strong>.
              </span>
            </div>
            <button
              onClick={refreshInit}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Scrollable Message Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
        >
          {loadingConv ? (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-400">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              onSelectSuggestion={(prompt) => {
                setInput(prompt);
                sendMessage(prompt);
              }}
              onOpenKnowledgeBase={() => setIsKnowledgeOpen(true)}
            />
          ) : (
            <div className="flex-1 pb-6 divide-y divide-zinc-100 dark:divide-zinc-800/40">
              {messages.map((m, idx) => (
                <ChatMessage
                  key={m.id || idx}
                  message={m}
                  isStreaming={isStreaming && idx === messages.length - 1 && m.role === 'assistant'}
                  onRegenerate={idx === messages.length - 1 ? regenerateLastMessage : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Fixed Chat Composer at bottom */}
        <ChatComposer
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          ragEnabled={ragEnabled}
          onToggleRag={() => setRagEnabled(!ragEnabled)}
          activeModelName={selectedModel}
          onUploadFile={uploadFile}
          disabled={!ollamaStatus?.online}
        />
      </div>

      {/* Knowledge Base Modal */}
      <KnowledgeBase
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={refreshInit}
        currentTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
};
