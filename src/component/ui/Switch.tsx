interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch(props: SwitchProps) {
  return (
    <div 
      class={`flex items-center justify-between gap-4 ${props.disabled ? 'opacity-50' : 'cursor-pointer'}`}
      onClick={() => !props.disabled && props.onChange(!props.checked)}
    >
      <div class="space-y-0.5">
        <div class="text-sm font-medium text-neutral-200">{props.label}</div>
        {props.description && (
          <div class="text-xs text-neutral-500">{props.description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
        class={`
          relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full 
          border-2 border-transparent transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400
          ${props.checked ? 'bg-neutral-100' : 'bg-neutral-700'}
        `}
      >
        <span
          class={`
            pointer-events-none block h-4 w-4 rounded-full shadow-lg transition-transform
            ${props.checked ? 'translate-x-4 bg-neutral-900' : 'translate-x-0 bg-neutral-400'}
          `}
        />
      </button>
    </div>
  );
}

