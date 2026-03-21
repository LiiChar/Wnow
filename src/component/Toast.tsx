import { createSignal, Show, For } from "solid-js";
import { IconCheck, IconClose, IconInfo } from "./Icons";

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const [toasts, setToasts] = createSignal<Toast[]>([]);

export function showToast(message: string, type: ToastType = 'success') {
  const id = ++toastId;
  setToasts(prev => [...prev, { id, message, type }]);
  
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 2000);
}

export function ToastContainer() {
  return (
    <div class="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 pointer-events-none">
      <For each={toasts()}>
        {(toast) => (
          <div 
            class={`
              px-4 py-2 rounded-lg shadow-lg text-sm font-medium
              transform transition-all duration-300 ease-out
              animate-slide-in pointer-events-auto
              ${toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-700' : ''}
              ${toast.type === 'error' ? 'bg-red-900/90 text-red-100 border border-red-700' : ''}
              ${toast.type === 'info' ? 'bg-neutral-800/90 text-neutral-100 border border-neutral-700' : ''}
            `}
          >
            <div class="flex items-center gap-2">
              <Show when={toast.type === 'success'}>
                <IconCheck size={16} />
              </Show>
              <Show when={toast.type === 'error'}>
                <IconClose size={16} />
              </Show>
              <Show when={toast.type === 'info'}>
                <IconInfo size={16} />
              </Show>
              {toast.message}
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

