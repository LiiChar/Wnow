import { Keyboard } from 'lucide-solid';
import { createSignal, Show } from 'solid-js';

interface HotkeyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function HotkeyInput(props: HotkeyInputProps) {
  const [isRecording, setIsRecording] = createSignal(false);
  const [tempValue, setTempValue] = createSignal('');

  const startRecording = () => {
    setIsRecording(true);
    setTempValue('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRecording()) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const parts: string[] = [];
    
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    
    // Skip if only modifier key is pressed
    const key = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      setTempValue(parts.join('+') + '+...');
      return;
    }
    
    // Format the key
    let formattedKey = key;
    if (key.length === 1) {
      formattedKey = key.toUpperCase();
    } else if (key.startsWith('Arrow')) {
      formattedKey = key.replace('Arrow', '');
    } else if (key === ' ') {
      formattedKey = 'Space';
    }
    
    parts.push(formattedKey);
    
    const hotkey = parts.join('+');
    setTempValue(hotkey);
    props.onChange(hotkey);
    setIsRecording(false);
  };

  const handleBlur = () => {
    setIsRecording(false);
  };

  return (
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm text-neutral-300">{props.label}</span>
          <Show when={props.description}>
            <span class="text-xs text-neutral-500">({props.description})</span>
          </Show>
        </div>
        
        <button
          onClick={startRecording}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          class={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono
            transition-all duration-200 min-w-[120px] justify-center
            ${isRecording() 
              ? 'bg-neutral-700 border-2 border-neutral-500 text-neutral-100 animate-pulse' 
              : 'bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-600'}
          `}
        >
          <Show when={isRecording()} fallback={
            <>
              <Keyboard size={14} />
              {props.value}
            </>
          }>
            <span class="text-neutral-400">
              {tempValue() || 'Нажмите клавиши...'}
            </span>
          </Show>
        </button>
      </div>
    </div>
  );
}

