import { JSX, splitProps, For } from 'solid-js';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface GlassSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  class?: string;
}

export function GlassSelect(props: GlassSelectProps) {
  return (
    <div class={`flex flex-col gap-1.5 ${props.class || ''}`}>
      {props.label && (
        <label class="text-sm font-medium text-white/70">{props.label}</label>
      )}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value)}
        class="
          w-full px-4 py-2.5 rounded-xl
          bg-white/10 backdrop-blur-sm
          border border-white/20 
          text-white
          focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
          transition-all duration-200
          appearance-none cursor-pointer
        "
        style={{
          "background-image": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          "background-repeat": "no-repeat",
          "background-position": "right 12px center",
          "background-size": "16px",
        }}
      >
        <For each={props.options}>
          {(option) => (
            <option value={option.value} class="bg-slate-900 text-white">
              {option.icon} {option.label}
            </option>
          )}
        </For>
      </select>
    </div>
  );
}

