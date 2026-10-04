import { Info } from 'lucide-react';

type DialFieldProps = {
  label: string;
  value: number;
  step: number;
  integer: boolean;
  onChange: (next: number) => void;
  onInfo: () => void;
  hint?: string;
  min?: number;
  max?: number;
  emphasis?: boolean;
};

export function DialField({ label, value, step, integer, onChange, onInfo, hint, min, max, emphasis }: DialFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1 text-h3 text-text-muted">
          {label}
          <button
            type="button"
            onClick={onInfo}
            aria-label={`${label} information`}
            title="Tap for details"
            className="p-0.5 rounded-sm text-accent hover:text-text transition-colors cursor-pointer"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </span>
        {hint ? <span className={`text-eyebrow text-right ${emphasis ? 'text-accent' : 'text-text-faint'}`}>{hint}</span> : null}
      </div>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(integer ? parseInt(e.target.value) : parseFloat(e.target.value))}
        className={`input input-num w-full ${emphasis ? 'text-accent' : ''}`}
      />
    </div>
  );
}
