import React from 'react';
import { Lightbulb, FileText, Code2, Database } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectSuggestion: (prompt: string) => void;
  onOpenKnowledgeBase?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion, onOpenKnowledgeBase }) => {
  const suggestions = [
    {
      title: 'Explain a concept',
      description: 'Break down complex architecture or technical ideas simply.',
      prompt: 'Explain the difference between monoliths and microservices, focusing on local edge deployment considerations.',
      icon: Lightbulb,
    },
    {
      title: 'Analyze a document',
      description: 'Synthesize insights from your uploaded PDFs or notes.',
      prompt: 'Summarize the primary conclusions and actionable takeaways from my indexed documents.',
      icon: FileText,
    },
    {
      title: 'Write or improve code',
      description: 'Draft performant, typed code or refactor an algorithm.',
      prompt: 'Write a Python async worker queue using asyncio.Queue with bounded concurrency and error handling.',
      icon: Code2,
    },
    {
      title: 'Search my knowledge base',
      description: 'Query your local private documents using semantic RAG.',
      prompt: 'What do my local documents state regarding memory management and cache eviction?',
      icon: Database,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto text-center animate-in fade-in duration-300">
      {/* Brand Icon */}
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-[#202020] border border-zinc-200 dark:border-[#303030] flex items-center justify-center mb-5 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-8 h-8">
          <path d="M10 8V24H22" stroke="#A3B18A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="21" cy="11" r="2" fill="#A3B18A"/>
        </svg>
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-[#F3F3F3] mb-2 font-sans">
        Good to see you. What are we thinking about today?
      </h1>
      <p className="text-sm sm:text-base text-zinc-500 dark:text-[#A1A1AA] max-w-lg mb-8 leading-relaxed font-sans">
        Ask anything, explore your knowledge, or work with your local documents. Completely private, offline-ready.
      </p>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group p-3.5 rounded-xl border border-zinc-200/80 dark:border-[#303030] bg-white/50 dark:bg-[#1C1C1C] hover:bg-zinc-100/80 dark:hover:bg-[#242424] hover:border-[#A3B18A]/50 transition-all text-left shadow-sm"
            >
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div className="p-1 rounded-md bg-[#A3B18A]/10 text-[#A3B18A] group-hover:bg-[#A3B18A]/20 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  {item.title}
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
