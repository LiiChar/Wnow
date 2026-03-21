import { For, createSignal, Show } from 'solid-js';
import { IconChevronDown } from '../Icons';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  class?: string;
}

export function Select(props: SelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  
  const selectedLabel = () => {
    const opt = props.options.find(o => o.value === props.value);
    return opt?.label || props.value;
  };

  const handleSelect = (value: string) => {
    props.onChange(value);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-select]')) {
      setIsOpen(false);
    }
  };

  return (
    <div 
      class={`space-y-2 relative ${props.class || ''}`} 
      data-select
      onClick={(e) => e.stopPropagation()}
    >
      {props.label && (
        <label class="text-sm font-medium text-neutral-300">{props.label}</label>
      )}
      
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen());
          if (!isOpen()) {
            document.addEventListener('click', handleClickOutside, { once: true });
          }
        }}
        class="
          flex h-10 w-full items-center justify-between rounded-md 
          border border-neutral-700 bg-neutral-900 px-3 py-2
          text-sm text-neutral-100
          hover:border-neutral-600 hover:bg-neutral-800
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500
          transition-colors
        "
      >
        <span class="truncate">{selectedLabel()}</span>
        <IconChevronDown size={16} class={`text-neutral-400 transition-transform ${isOpen() ? 'rotate-180' : ''}`} />
      </button>

      <Show when={isOpen()}>
        <div class="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
          <For each={props.options}>
            {(option) => (
              <button
                type="button"
                onClick={() => handleSelect(option.value)}
                class={`
                  w-full px-3 py-2.5 text-left text-sm transition-colors
                  ${option.value === props.value 
                    ? 'bg-neutral-800 text-neutral-100' 
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'}
                `}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
