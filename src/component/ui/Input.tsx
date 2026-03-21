import { JSX, splitProps } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, ['label', 'class']);
  
  return (
    <div class="space-y-2">
      {local.label && (
        <label class="text-sm font-medium text-neutral-200">{local.label}</label>
      )}
      <input
        class={`
          flex h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1
          text-sm text-neutral-100 placeholder:text-neutral-500
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400
          disabled:cursor-not-allowed disabled:opacity-50
          ${local.class || ''}
        `}
        {...others}
      />
    </div>
  );
}

