import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from './Toast';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast('Code copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-[#303030]/60 dark:border-[#303030] bg-[#1A1A1A] text-zinc-100 font-mono text-[13px]">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141414] border-b border-[#262626] text-xs text-zinc-400 select-none">
        <span className="font-mono lowercase text-zinc-400">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span className="text-[#A3B18A]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <pre className="m-0 p-0 font-mono">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};
