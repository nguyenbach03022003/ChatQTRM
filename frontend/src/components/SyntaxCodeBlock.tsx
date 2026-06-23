import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useActiveTheme } from "../lib/theme";

interface SyntaxCodeBlockProps {
  className?: string;
  children?: ReactNode;
}

export default function SyntaxCodeBlock({
  className,
  children,
}: SyntaxCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const theme = useActiveTheme();
  const match = /language-(\w+)/.exec(className || "");
  const language = match?.[1] || "text";
  const rawCode = String(children || "").replace(/\n$/, "");

  async function handleCopy() {
    await navigator.clipboard.writeText(rawCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface-3/70 px-4 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-subtle">
          {language}
        </span>
        <button
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-subtle opacity-0 transition hover:text-content group-hover:opacity-100"
          onClick={handleCopy}
          type="button"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        PreTag="div"
        language={language}
        style={theme === "light" ? oneLight : oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem 1.25rem",
          background: "transparent",
          fontSize: "0.84rem",
        }}
      >
        {rawCode}
      </SyntaxHighlighter>
    </div>
  );
}
