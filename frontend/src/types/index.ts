export interface Citation {
  document_id: string;
  document_name: string;
  page_or_section?: string | null;
  chunk_id: string;
  score: number;
  snippet?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Citation[] | null;
  status: 'completed' | 'streaming' | 'stopped' | 'failed';
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string | null;
  rag_enabled: boolean;
  system_prompt?: string | null;
  temperature: number;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string | null;
  messages?: Message[];
}

export interface DocumentItem {
  id: string;
  filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  error_message?: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_or_section?: string | null;
  token_count: number;
  created_at: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  parameter_size: string;
  quantization_level: string;
  family: string;
  modified_at: string;
}

export interface OllamaStatus {
  online: boolean;
  version: string | null;
  base_url: string;
  models_count: number;
  error?: string | null;
}

export interface AppSettings {
  general: {
    app_name: string;
    app_version: string;
    tagline: string;
    default_model: string | null;
    default_temperature: number;
    default_system_prompt: string;
  };
  ollama: {
    base_url: string;
    status: OllamaStatus;
    available_models: OllamaModel[];
  };
  knowledge_base: {
    default_embedding_model: string;
    rag_chunk_size: number;
    rag_chunk_overlap: number;
    rag_top_k: number;
    rag_similarity_threshold: number;
    rag_context_budget: number;
    vector_store: {
      total_chunks_indexed: number;
      total_documents_indexed: number;
      db_size_bytes: number;
      db_path: string;
    };
  };
  performance: {
    low_memory_mode: boolean;
    max_simultaneous_generations: number;
    max_simultaneous_ingestions: number;
    max_upload_size_mb: number;
    request_timeout_seconds: number;
  };
  storage: {
    data_directory: string;
    database_path: string;
    uploads_directory: string;
    vectors_directory: string;
    disk_usage: {
      app_data_size_bytes: number;
      app_data_size_mb: number;
      disk_free_gb: number;
      disk_total_gb: number;
    };
  };
}
