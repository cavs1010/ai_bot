import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonRole = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  role: ButtonRole;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  block: boolean;
  id?: string;
  title?: string;
};

export function Button({ role, label, icon, onClick, disabled, busy, block, id, title }: ButtonProps) {
  return (
    <button
      id={id}
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className={`btn btn-${role} inline-flex items-center justify-center gap-2 ${block ? 'w-full' : ''}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
