interface GlassToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function GlassToggle(props: GlassToggleProps) {
  return (
    <div 
      class={`flex items-center justify-between gap-4 ${props.disabled ? 'opacity-50' : ''}`}
      onClick={() => !props.disabled && props.onChange(!props.checked)}
    >
      <div class="flex flex-col">
        <span class="text-sm font-medium text-white/90">{props.label}</span>
        {props.description && (
          <span class="text-xs text-white/50">{props.description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        disabled={props.disabled}
        class={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full 
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2
          ${props.checked ? 'bg-purple-500' : 'bg-white/20'}
        `}
      >
        <span
          class={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full 
            bg-white shadow-lg ring-0 transition duration-200 ease-in-out
            ${props.checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

