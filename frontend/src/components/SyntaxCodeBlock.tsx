import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SyntaxCodeBlockProps {
  className?: string;
  children?: ReactNode;
}

export default function SyntaxCodeBlock({
  className,
  children,
}: SyntaxCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match?.[1] || "text";
  const rawCode = String(children || "").replace(/\n$/, "");

  async function handleCopy() {
    await navigator.clipboard.writeText(rawCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b1220]">
      <button
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-slate-600/80 bg-slate-900/90 px-3 py-1 text-xs text-slate-100 opacity-0 transition group-hover:opacity-100"
        onClick={handleCopy}
        type="button"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy Code"}
      </button>
      <SyntaxHighlighter
        PreTag="div"
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1.25rem",
          background: "transparent",
          fontSize: "0.86rem",
        }}
      >
        {rawCode}
      </SyntaxHighlighter>
    </div>
  );
}
