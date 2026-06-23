import type { ReactNode } from "react";
import { Suspense, lazy } from "react";

const SyntaxCodeBlock = lazy(() => import("./SyntaxCodeBlock"));

interface CodeBlockProps {
  className?: string;
  children?: ReactNode;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  return (
    <Suspense
      fallback={
        <pre className="my-4 overflow-x-auto rounded-2xl border border-slate-700/80 bg-[#0b1220] p-5 font-mono text-sm text-slate-200">
          <code>{children}</code>
        </pre>
      }
    >
      <SyntaxCodeBlock className={className}>{children}</SyntaxCodeBlock>
    </Suspense>
  );
}
