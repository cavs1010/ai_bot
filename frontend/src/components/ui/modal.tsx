import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalPlacement = 'center' | 'sheet';
type ModalWidth = 'md' | 'lg';

type ModalProps = {
  id: string;
  icon: ReactNode;
  title: string;
  eyebrow?: string;
  placement: ModalPlacement;
  width: ModalWidth;
  onClose: () => void;
  headerActions?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

export function Modal({ id, icon, title, eyebrow, placement, width, onClose, headerActions, footer, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sheet = placement === 'sheet';

  return (
    <div
      id={id}
      className={`fixed inset-0 z-50 flex justify-center bg-canvas/80 backdrop-blur-sm ${sheet ? 'items-end sm:items-center p-0 sm:p-4' : 'items-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`bg-surface border border-border w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl ${width === 'lg' ? 'max-w-4xl' : 'max-w-lg'} ${sheet ? 'rounded-t-xl sm:rounded-xl' : 'rounded-xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-canvas border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-accent shrink-0">{icon}</span>
            <div className="min-w-0">
              {eyebrow ? <span className="text-eyebrow uppercase text-accent block">{eyebrow}</span> : null}
              <h3 className="text-h2 text-text truncate">{title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-sm text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 flex-grow overflow-y-auto space-y-stack">{children}</div>

        <div className="px-5 py-3.5 bg-canvas border-t border-border flex items-center justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}
