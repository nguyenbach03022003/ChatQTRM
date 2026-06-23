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
        <pre className="my-4 overflow-x-auto rounded-xl border border-border bg-surface-3/70 p-5 font-mono text-sm text-content">
          <code>{children}</code>
        </pre>
      }
    >
      <SyntaxCodeBlock className={className}>{children}</SyntaxCodeBlock>
    </Suspense>
  );
}
