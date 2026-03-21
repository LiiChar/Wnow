import { Show, createSignal, onMount, onCleanup } from "solid-js";

export type FloatingTranslationData = {
  id: string;
  text: string;
  translation: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  data: FloatingTranslationData | null;
  onClose?: (id: string) => void;
};

export function FloatingTranslation(props: Props) {
  const [isDragging, setIsDragging] = createSignal(false);
  const [offset, setOffset] = createSignal({ x: 0, y: 0 });
  const [position, setPosition] = createSignal({ x: 0, y: 0 });

  onMount(() => {
    if (props.data) {
      // Position near the selection area
      setPosition({
        x: props.data.x + props.data.w + 8,
        y: props.data.y,
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.data) {
        props.onClose?.(props.data.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setOffset({
      x: e.clientX - position().x,
      y: e.clientY - position().y,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    setPosition({
      x: e.clientX - offset().x,
      y: e.clientY - offset().y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    onCleanup(() => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    });
  });

  return (
    <Show when={props.data}>
      {(data) => (
        <div
          class="fixed z-200 pointer-events-auto select-none animate-fade-in"
          style={{
            left: `${position().x}px`,
            top: `${position().y}px`,
            cursor: isDragging() ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="glass-dark rounded-lg border border-neutral-700 shadow-xl overflow-hidden max-w-xs">
            {/* Mini header with drag handle */}
            <div class="px-2 py-1 border-b border-neutral-700/50 flex items-center gap-1">
              <div class="flex gap-0.5">
                <div class="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                <div class="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                <div class="w-1.5 h-1.5 rounded-full bg-neutral-600" />
              </div>
              <span class="text-[10px] text-neutral-500 ml-1">ESC для закрытия</span>
            </div>
            
            {/* Translation content */}
            <div class="px-3 py-2">
              <div class="text-xs text-neutral-400 mb-1 line-clamp-2 wrap-break-word">
                {data().text}
              </div>
              <div class="text-sm text-neutral-100 wrap-break-word">
                {data().translation || "..."}
              </div>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}

