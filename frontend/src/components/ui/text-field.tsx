import type { ReactNode } from 'react';

type TextFieldProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label?: string;
  icon?: ReactNode;
  id?: string;
};

export function TextField({ value, onChange, placeholder, label, icon, id }: TextFieldProps) {
  return (
    <label className="block w-full">
      {label ? <span className="block text-h3 text-text-muted mb-1">{label}</span> : null}
      <span className="relative block">
        {icon ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">{icon}</span> : null}
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`input w-full placeholder:text-text-faint ${icon ? 'pl-9' : ''}`}
        />
      </span>
    </label>
  );
}
