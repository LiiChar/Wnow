import { JSX, splitProps } from 'solid-js';

interface GlassInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function GlassInput(props: GlassInputProps) {
  const [local, others] = splitProps(props, ['label', 'error', 'class']);
  
  return (
    <div class="flex flex-col gap-1.5">
      {local.label && (
        <label class="text-sm font-medium text-white/70">{local.label}</label>
      )}
      <input
        class={`
          w-full px-4 py-2.5 rounded-xl
          bg-white/10 backdrop-blur-sm
          border border-white/20 
          text-white placeholder-white/40
          focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
          transition-all duration-200
          ${local.error ? 'border-red-500/50' : ''}
          ${local.class || ''}
        `}
        {...others}
      />
      {local.error && (
        <span class="text-xs text-red-400">{local.error}</span>
      )}
    </div>
  );
}

