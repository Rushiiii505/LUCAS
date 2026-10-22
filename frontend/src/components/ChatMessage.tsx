import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, Bot, User, Sparkles } from 'lucide-react';
import { Message } from '../types';
import { CodeBlock } from './CodeBlock';
import { SourceCitation } from './SourceCitation';
import { useToast } from './Toast';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const { showToast } = useToast();

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      showToast('Response copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(prev => (prev === type ? null : type));
    showToast(type === 'up' ? 'Feedback recorded' : 'Feedback recorded', 'info');
  };

  return (
    <div className={`py-5 transition-colors ${isUser ? 'bg-transparent' : 'bg-transparent'}`}>
      <div className="max-w-readable mx-auto px-4 sm:px-6">
        <div className="flex items-start space-x-3.5">
          {/* Avatar / Role indicator */}
          <div className="shrink-0 mt-0.5">
            {isUser ? (
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                <User className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#A3B18A]/15 dark:bg-[#A3B18A]/20 border border-[#A3B18A]/30 flex items-center justify-center text-[#A3B18A]">
                <Bot className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Message Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {isUser ? 'You' : 'Lucas'}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.status === 'stopped' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                  Stopped
                </span>
              )}
            </div>

            {/* Content */}
            <div className="text-[14.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 prose prose-zinc dark:prose-invert max-w-none">
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                <>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        if (!inline && match) {
                          return <CodeBlock language={match[1]} value={codeString} />;
                        }
                        if (!inline && codeString.includes('\n')) {
                          return <CodeBlock language="text" value={codeString} />;
                        }
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[13px] text-zinc-800 dark:text-zinc-200" {...props}>
                            {children}
                          </code>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-3.5 last:mb-0 leading-[1.65]">{children}</p>;
                      },
                      h1({ children }) {
                        return <h1 className="text-xl font-bold mt-5 mb-2.5 text-zinc-900 dark:text-zinc-100">{children}</h1>;
                      },
                      h2({ children }) {
                        return <h2 className="text-lg font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100">{children}</h2>;
                      },
                      h3({ children }) {
                        return <h3 className="text-base font-semibold mt-3 mb-1.5 text-zinc-900 dark:text-zinc-100">{children}</h3>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-5 my-2.5 space-y-1">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-5 my-2.5 space-y-1">{children}</ol>;
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="border-l-2 border-[#A3B18A] pl-3.5 my-3 italic text-zinc-600 dark:text-zinc-400">
                            {children}
                          </blockquote>
                        );
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      th({ children }) {
                        return <th className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 font-semibold text-left">{children}</th>;
                      },
                      td({ children }) {
                        return <td className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/60">{children}</td>;
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>

                  {/* Pulsing cursor while actively streaming */}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-[#A3B18A] animate-pulse align-middle" />
                  )}
                </>
              )}
            </div>

            {/* Citations if available */}
            {!isUser && message.sources && message.sources.length > 0 && (
              <SourceCitation citations={message.sources} />
            )}

            {/* Action Bar for Assistant Messages */}
            {!isUser && !isStreaming && message.content && (
              <div className="flex items-center space-x-2 mt-3 pt-2 text-zinc-400 dark:text-zinc-500 text-xs">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 p-1 hover:text-zinc-700 dark:hover:text-zinc-300 rounded transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#A3B18A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center space-x-1 p-1 hover:text-zinc-700 dark:hover:text-zinc-300 rounded transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                )}

                <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <button
                  onClick={() => handleFeedback('up')}
                  className={`p-1 rounded transition-colors ${feedback === 'up' ? 'text-[#A3B18A]' : 'hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className={`p-1 rounded transition-colors ${feedback === 'down' ? 'text-red-400' : 'hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
