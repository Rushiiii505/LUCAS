import { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message, OllamaModel, OllamaStatus, Citation } from '../types';
import {
  fetchConversations, fetchConversation, createConversation,
  updateConversation, deleteConversation, streamChatResponse,
  stopChatGeneration, fetchModels, fetchOllamaStatus, uploadDocumentFile
} from '../services/api';
import { useToast } from '../components/Toast';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  // Load conversations and models initially
  const initApp = useCallback(async () => {
    try {
      const [convs, modelsData, status] = await Promise.all([
        fetchConversations(),
        fetchModels().catch(() => ({ models: [], default_model: null, count: 0 })),
        fetchOllamaStatus().catch(() => ({ online: false, version: null, base_url: '', models_count: 0 }))
      ]);
      setConversations(convs);
      setModels(modelsData.models);
      setSelectedModel(modelsData.default_model || (modelsData.models[0]?.name ?? null));
      setOllamaStatus(status);
    } catch (e: any) {
      console.error('Failed initialization', e);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Load conversation details when active ID changes
  const selectConversation = useCallback(async (id: string) => {
    if (activeConversationId === id && messages.length > 0) return;
    try {
      setLoadingConv(true);
      setActiveConversationId(id);
      const detail = await fetchConversation(id);
      setActiveConversation(detail);
      setMessages(detail.messages || []);
      setRagEnabled(detail.rag_enabled);
      if (detail.model) setSelectedModel(detail.model);
    } catch (e: any) {
      showToast('Failed to load conversation', 'error');
    } finally {
      setLoadingConv(false);
    }
  }, [activeConversationId, messages.length, showToast]);

  const newChat = useCallback(() => {
    if (isStreaming) {
      stopGeneration();
    }
    setActiveConversationId(null);
    setActiveConversation(null);
    setMessages([]);
    setInput('');
  }, [isStreaming]);

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    try {
      const updated = await updateConversation(id, { title: newTitle });
      setConversations(prev => prev.map(c => (c.id === id ? { ...c, title: updated.title } : c)));
      if (activeConversation?.id === id) {
        setActiveConversation(prev => prev ? { ...prev, title: updated.title } : null);
      }
      showToast('Conversation renamed', 'success');
    } catch {
      showToast('Failed to rename conversation', 'error');
    }
  }, [activeConversation?.id, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        newChat();
      }
      showToast('Conversation deleted', 'info');
    } catch {
      showToast('Failed to delete conversation', 'error');
    }
  }, [activeConversationId, newChat, showToast]);

  const stopGeneration = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeConversationId) {
      await stopChatGeneration(activeConversationId).catch(() => {});
    }
    setIsStreaming(false);
    // Mark last assistant message as stopped
    setMessages(prev => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          status: 'stopped'
        };
      }
      return copy;
    });
  }, [activeConversationId]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    const userMessageId = Math.random().toString(36).substring(2, 9);
    const tempUserMsg: Message = {
      id: userMessageId,
      conversation_id: activeConversationId || 'pending',
      role: 'user',
      content: trimmed,
      status: 'completed',
      created_at: new Date().toISOString(),
    };

    const assistantMessageId = Math.random().toString(36).substring(2, 9);
    const tempAssistantMsg: Message = {
      id: assistantMessageId,
      conversation_id: activeConversationId || 'pending',
      role: 'assistant',
      content: '',
      status: 'streaming',
      created_at: new Date().toISOString(),
      sources: null,
    };

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      await streamChatResponse(
        {
          conversation_id: activeConversationId || undefined,
          message: trimmed,
          model: selectedModel || undefined,
          rag_enabled: ragEnabled,
        },
        {
          onStart: (data) => {
            if (!activeConversationId && data.conversation_id) {
              setActiveConversationId(data.conversation_id);
              fetchConversations().then(setConversations);
            }
          },
          onCitations: (citations: Citation[]) => {
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { ...last, sources: citations };
              }
              return copy;
            });
          },
          onToken: (token: string) => {
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + token,
                };
              }
              return copy;
            });
          },
          onDone: (data) => {
            setIsStreaming(false);
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  status: (data.status as any) || 'completed',
                };
              }
              return copy;
            });
            fetchConversations().then(setConversations);
          },
          onError: (errMsg: string) => {
            setIsStreaming(false);
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  content: (last.content ? last.content + '\n\n' : '') + `*Error: ${errMsg}*`,
                  status: 'failed',
                };
              }
              return copy;
            });
            showToast(errMsg, 'error');
          },
        },
        abortControllerRef.current.signal
      );
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setIsStreaming(false);
        showToast(e.message || 'Stream connection failed', 'error');
      }
    }
  }, [activeConversationId, isStreaming, ragEnabled, selectedModel, showToast]);

  const regenerateLastMessage = useCallback(() => {
    if (isStreaming || messages.length === 0) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      sendMessage(lastUser.content);
    }
  }, [isStreaming, messages, sendMessage]);

  const uploadFile = useCallback(async (file: File) => {
    await uploadDocumentFile(file);
  }, []);

  return {
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
    refreshInit: initApp,
  };
}
