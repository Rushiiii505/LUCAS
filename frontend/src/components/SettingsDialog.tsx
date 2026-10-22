import React, { useState, useEffect } from 'react';
import {
  Settings, Server, Database, Cpu, HardDrive, Shield, Check,
  RefreshCw, X, Loader2, Info
} from 'lucide-react';
import { AppSettings, OllamaModel } from '../types';
import { fetchSettings, updateSettings, fetchOllamaStatus, fetchModels } from '../services/api';
import { useToast } from './Toast';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
  currentTheme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
  currentTheme,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ollama' | 'knowledge' | 'performance' | 'storage'>('general');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingOllama, setRefreshingOllama] = useState(false);
  const { showToast } = useToast();

  // Local form state
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [chunkSize, setChunkSize] = useState(600);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [topK, setTopK] = useState(4);
  const [simThreshold, setSimThreshold] = useState(0.3);
  const [lowMemoryMode, setLowMemoryMode] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setSettings(data);
      setOllamaUrl(data.ollama.base_url);
      setDefaultModel(data.general.default_model || '');
      setTemperature(data.general.default_temperature);
      setSystemPrompt(data.general.default_system_prompt);
      setChunkSize(data.knowledge_base.rag_chunk_size);
      setChunkOverlap(data.knowledge_base.rag_chunk_overlap);
      setTopK(data.knowledge_base.rag_top_k);
      setSimThreshold(data.knowledge_base.rag_similarity_threshold);
      setLowMemoryMode(data.performance.low_memory_mode);
    } catch (e: any) {
      showToast(e.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings({
        ollama_base_url: ollamaUrl,
        default_model: defaultModel,
        default_temperature: temperature,
        default_system_prompt: systemPrompt,
        rag_chunk_size: chunkSize,
        rag_chunk_overlap: chunkOverlap,
        rag_top_k: topK,
        rag_similarity_threshold: simThreshold,
        low_memory_mode: lowMemoryMode,
      });
      showToast('Settings saved successfully', 'success');
      onSettingsUpdated?.();
      onClose();
    } catch (e: any) {
      showToast(e.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshOllama = async () => {
    try {
      setRefreshingOllama(true);
      const status = await fetchOllamaStatus();
      const modelsData = await fetchModels();
      if (settings) {
        setSettings({
          ...settings,
          ollama: {
            ...settings.ollama,
            status,
            available_models: modelsData.models,
          },
        });
      }
      showToast(status.online ? 'Ollama connection verified' : 'Ollama is unreachable', status.online ? 'success' : 'error');
    } catch {
      showToast('Ollama health check failed', 'error');
    } finally {
      setRefreshingOllama(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#303030] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-[#282828] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-[#A3B18A]" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              System Settings & Architecture
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-[#282828] px-6 bg-zinc-50 dark:bg-[#141414] overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-[#A3B18A] text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('ollama')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ollama'
                ? 'border-[#A3B18A] text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Ollama Inference
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'knowledge'
                ? 'border-[#A3B18A] text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Knowledge & RAG
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-[#A3B18A] text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            RPi 5 Performance
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'storage'
                ? 'border-[#A3B18A] text-zinc-900 dark:text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Storage & Backup
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A3B18A]" />
              Loading configuration...
            </div>
          ) : (
            <>
              {/* Tab 1: General */}
              {activeTab === 'general' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                      Theme
                    </label>
                    <button
                      onClick={onToggleTheme}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100"
                    >
                      Currently: {currentTheme === 'dark' ? 'Dark Theme' : 'Light Theme'} (Click to toggle)
                    </button>
                  </div>

                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                      Default Model
                    </label>
                    <select
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none"
                    >
                      {settings?.ollama.available_models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.parameter_size})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-zinc-700 dark:text-zinc-300 font-medium">
                        Sampling Temperature ({temperature.toFixed(2)})
                      </label>
                      <span className="text-zinc-400 text-[11px]">0.0 = Deterministic, 1.0 = Creative</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[#A3B18A]"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                      Default System Prompt
                    </label>
                    <textarea
                      rows={4}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Ollama */}
              {activeTab === 'ollama' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-zinc-700 dark:text-zinc-300 font-medium">
                        Ollama Base URL
                      </label>
                      <button
                        onClick={handleRefreshOllama}
                        disabled={refreshingOllama}
                        className="flex items-center space-x-1 text-[#A3B18A] hover:underline"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingOllama ? 'animate-spin' : ''}`} />
                        <span>Refresh Connection</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://127.0.0.1:11434"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none font-mono"
                    />
                  </div>

                  {/* Status Banner */}
                  <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                    settings?.ollama.status.online
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      settings?.ollama.status.online ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                    }`} />
                    <div className="flex-1">
                      <div className="font-semibold">
                        {settings?.ollama.status.online ? 'Ollama Online' : 'Ollama Offline'}
                      </div>
                      <div className="text-[11px] opacity-90">
                        {settings?.ollama.status.online
                          ? `Version ${settings.ollama.status.version || 'detected'} • ${settings.ollama.available_models.length} models installed`
                          : settings?.ollama.status.error || 'Server cannot be reached.'}
                      </div>
                    </div>
                  </div>

                  {/* Installed Models List */}
                  <div>
                    <span className="block font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Installed Models
                    </span>
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {settings?.ollama.available_models.map((m) => (
                        <div key={m.name} className="px-3 py-2 flex items-center justify-between">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">{m.name}</span>
                          <span className="text-zinc-400 text-[11px] font-mono">
                            {(m.size / (1024 ** 3)).toFixed(2)} GB • {m.parameter_size}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Knowledge & RAG */}
              {activeTab === 'knowledge' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                        Chunk Size (Characters)
                      </label>
                      <input
                        type="number"
                        value={chunkSize}
                        onChange={(e) => setChunkSize(parseInt(e.target.value) || 600)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                        Chunk Overlap (Characters)
                      </label>
                      <input
                        type="number"
                        value={chunkOverlap}
                        onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 100)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                        Retrieved Chunks (Top K)
                      </label>
                      <input
                        type="number"
                        value={topK}
                        onChange={(e) => setTopK(parseInt(e.target.value) || 4)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                        Similarity Threshold ({simThreshold.toFixed(2)})
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="0.9"
                        value={simThreshold}
                        onChange={(e) => setSimThreshold(parseFloat(e.target.value) || 0.3)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#161616] border border-zinc-200 dark:border-[#2C2C2C] text-zinc-800 dark:text-zinc-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] text-[11.5px] text-zinc-500">
                    <Info className="w-3.5 h-3.5 inline mr-1 text-[#A3B18A]" />
                    Vectors are stored in local SQLite with NumPy cosine similarity, avoiding heavy memory consumption on Raspberry Pi 5.
                  </div>
                </div>
              )}

              {/* Tab 4: Performance */}
              {activeTab === 'performance' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50 dark:bg-[#141414]">
                    <div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        Raspberry Pi 5 Low-Memory Mode
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Restricts embedding batches to 4 items and limits background jobs to preserve 4GB RAM headroom.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={lowMemoryMode}
                      onChange={(e) => setLowMemoryMode(e.target.checked)}
                      className="w-4 h-4 accent-[#A3B18A]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#161616]">
                      <span className="text-zinc-400 block">Max Concurrent Generations</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">1 (Bounded)</span>
                    </div>
                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#161616]">
                      <span className="text-zinc-400 block">Max Concurrent Ingestions</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">1 (Bounded)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Storage & Backup */}
              {activeTab === 'storage' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2 font-mono text-[11px] p-3 rounded-xl bg-zinc-100 dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] text-zinc-700 dark:text-zinc-300">
                    <div>DB: {settings?.storage.database_path}</div>
                    <div>Uploads: {settings?.storage.uploads_directory}</div>
                    <div>Vectors: {settings?.storage.vectors_directory}</div>
                    <div>Disk Free: {settings?.storage.disk_usage.disk_free_gb} GB</div>
                  </div>

                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-[#262626] text-xs">
                    <span className="font-semibold block mb-1 text-zinc-800 dark:text-zinc-200">
                      Backup & Migration Instructions
                    </span>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                      All conversations, indexed documents, and vector embeddings reside in the <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">data/</code> directory. To back up Lucas, simply archive this folder:
                    </p>
                    <code className="block mt-2 p-2 rounded bg-zinc-900 text-zinc-200 font-mono text-[11px]">
                      tar -czvf lucas_backup.tar.gz data/
                    </code>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-[#282828] bg-zinc-50/70 dark:bg-[#141414] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
