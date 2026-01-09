
import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{language}</span>
        <button
          onClick={copyToClipboard}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs"
        >
          {copied ? (
            <>
              <i className="fas fa-check text-green-400"></i>
              Copiado
            </>
          ) : (
            <>
              <i className="far fa-copy"></i>
              Copiar Script
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto max-h-[500px]">
        <pre className="text-sm leading-relaxed">
          <code className="text-blue-300">
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
