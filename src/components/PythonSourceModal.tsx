import React, { useState } from 'react';
import { Check, Copy, Download, Terminal, X } from 'lucide-react';

interface PythonSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appPyContent: string;
  requirementsTxtContent: string;
}

export const PythonSourceModal: React.FC<PythonSourceModalProps> = ({
  isOpen,
  onClose,
  appPyContent,
  requirementsTxtContent,
}) => {
  const [activeFile, setActiveFile] = useState<'app.py' | 'requirements.txt'>('app.py');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeFile === 'app.py' ? appPyContent : requirementsTxtContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="python-source-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:p-8"
    >
      <div className="w-full max-w-4xl border border-[#27272A] bg-[#09090B] rounded-md flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]">
          <div>
            <h2 id="python-source-modal-title" className="text-base font-semibold text-[#FAFAFA]">
              Self-Contained Python 3.14 &amp; Windows 11 Bundle
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Zero pydub or audioop dependencies · Launches automatically on http://127.0.0.1:8000 via webbrowser
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Python source modal"
            className="p-1.5 text-zinc-400 hover:text-[#FAFAFA] border border-[#27272A] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 bg-[#111114] border-b border-[#27272A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFile('app.py')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeFile === 'app.py'
                  ? 'bg-[#FAFAFA] text-[#09090B] font-semibold'
                  : 'text-zinc-400 hover:text-[#FAFAFA] border border-[#27272A]'
              }`}
            >
              app.py
            </button>
            <button
              type="button"
              onClick={() => setActiveFile('requirements.txt')}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                activeFile === 'requirements.txt'
                  ? 'bg-[#FAFAFA] text-[#09090B] font-semibold'
                  : 'text-zinc-400 hover:text-[#FAFAFA] border border-[#27272A]'
              }`}
            >
              requirements.txt
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 border border-[#27272A] rounded hover:border-zinc-500 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : `Copy ${activeFile}`}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile('app.py', appPyContent)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FAFAFA] text-[#09090B] rounded hover:bg-zinc-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download app.py</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadFile('requirements.txt', requirementsTxtContent)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 border border-[#27272A] rounded hover:border-zinc-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download requirements.txt</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-[#0D0D10] border-b border-[#27272A] flex items-center gap-3 text-xs font-mono text-zinc-400">
          <Terminal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>pip install -r requirements.txt &amp;&amp; python app.py</span>
        </div>

        <pre className="p-6 text-xs font-mono text-zinc-300 overflow-auto flex-1 leading-relaxed select-all">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};
