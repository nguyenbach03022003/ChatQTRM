import { AlertTriangle } from "lucide-react";
import { Overlay } from "./DiffModal";

export interface ApprovalRequest {
  title: string;
  detail: string;
  command?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

interface Props {
  request: ApprovalRequest;
  onClose: () => void;
}

export function ApprovalModal({ request, onClose }: Props) {
  return (
    <Overlay onClose={onClose}>
      <div className="w-[min(520px,92vw)] overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember/15 text-ember">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-content">{request.title}</h3>
            <p className="mt-1 text-sm text-muted">{request.detail}</p>
            {request.command && (
              <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg/50 px-3 py-2 font-mono text-xs text-content">{request.command}</pre>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-content">Cancel</button>
          <button
            type="button"
            onClick={() => {
              request.onConfirm();
              onClose();
            }}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {request.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
