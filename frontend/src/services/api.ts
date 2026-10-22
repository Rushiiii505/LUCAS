import { Conversation, DocumentItem, OllamaModel, OllamaStatus, AppSettings, Citation } from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchOllamaStatus(): Promise<OllamaStatus> {
  const res = await fetch(`${API_BASE}/ollama/status`);
  if (!res.ok) throw new Error('Failed to fetch Ollama status');
  return res.json();
}

export async function fetchModels(): Promise<{ models: OllamaModel[]; default_model: string | null; count: number }> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

export async function createConversation(data?: Partial<Conversation>): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  return res.json();
}

export async function updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update conversation');
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
}

export async function searchConversations(query: string): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/conversations/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search conversations');
  return res.json();
}

export async function stopChatGeneration(conversation_id: string): Promise<void> {
  await fetch(`${API_BASE}/chat/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id }),
  });
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocumentFile(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Upload failed');
  }
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function reindexDocument(id: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/documents/${id}/reindex`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reindex document');
  return res.json();
}

export async function fetchDocumentPreview(id: string) {
  const res = await fetch(`${API_BASE}/documents/${id}/preview`);
  if (!res.ok) throw new Error('Failed to preview document');
  return res.json();
}

export async function searchKnowledgeBase(query: string) {
  const res = await fetch(`${API_BASE}/knowledge/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Failed to search knowledge base');
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data: Record<string, any>): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export interface StreamCallbacks {
  onStart?: (data: { conversation_id: string; message_id: string }) => void;
  onCitations?: (citations: Citation[]) => void;
  onToken?: (token: string) => void;
  onDone?: (data: { conversation_id: string; message_id: string; status: string }) => void;
  onError?: (error: string) => void;
}

export async function streamChatResponse(
  payload: {
    conversation_id?: string;
    message: string;
    model?: string;
    rag_enabled?: boolean;
    temperature?: number;
  },
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
) {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body stream');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'start') {
              callbacks.onStart?.(data);
            } else if (data.type === 'citations') {
              callbacks.onCitations?.(data.citations);
            } else if (data.type === 'token') {
              callbacks.onToken?.(data.content);
            } else if (data.type === 'done') {
              callbacks.onDone?.(data);
            } else if (data.type === 'stopped') {
              callbacks.onDone?.({ conversation_id: payload.conversation_id || '', message_id: '', status: 'stopped' });
            } else if (data.type === 'error') {
              callbacks.onError?.(data.error);
            }
          } catch (e) {
            console.error('SSE JSON parse error', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
