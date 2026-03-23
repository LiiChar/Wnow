import { Check, Pin, X } from "lucide-solid";
import { createSignal, createMemo, Show } from "solid-js";

type Rect = { x: number; y: number; w: number; h: number };

export type SelectionMode = 'translate' | 'persistent';

type Props = {
  onConfirm: (rect: Rect, mode: SelectionMode) => void;
  onCancel?: () => void;
};

export function SelectionArea(props: Props) {
  const [rect, setRect] = createSignal<Rect | null>(null);
  const [startPos, setStartPos] = createSignal<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = createSignal(false);

  // Вычисляем позицию кнопок: внизу если есть место, иначе вверху или внутри
  const buttonsPosition = createMemo(() => {
    const r = rect();
    if (!r) return { position: 'bottom' as const, style: {} };
    
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const buttonHeight = 48; // высота кнопок + отступ
    const buttonWidth = 200; // примерная ширина кнопок
    const padding = 16;
    
    // Проверяем есть ли место снизу
    const spaceBelow = screenHeight - (r.y + r.h);
    // Проверяем есть ли место сверху
    const spaceAbove = r.y;
    // Проверяем высоту самой области
    const areaHeight = r.h;
    
    let left = r.x + r.w / 2 - buttonWidth / 2;
    
    // Корректируем по горизонтали
    if (left < padding) left = padding;
    if (left + buttonWidth > screenWidth - padding) left = screenWidth - padding - buttonWidth;
    
    if (spaceBelow >= buttonHeight + padding) {
      // Кнопки снизу области
      return {
        position: 'bottom' as const,
        style: {
          top: `${r.y + r.h + 8}px`,
          left: `${left}px`,
          transform: 'none',
        }
      };
    } else if (spaceAbove >= buttonHeight + padding + 30) {
      // Кнопки сверху области (учитываем индикатор размера)
      return {
        position: 'top' as const,
        style: {
          top: `${r.y - buttonHeight - 36}px`,
          left: `${left}px`,
          transform: 'none',
        }
      };
    } else if (areaHeight >= buttonHeight + padding * 2) {
      // Кнопки внутри области (снизу)
      return {
        position: 'inside' as const,
        style: {
          top: `${r.y + r.h - buttonHeight - padding}px`,
          left: `${left}px`,
          transform: 'none',
        }
      };
    } else {
      // Кнопки по центру экрана как fallback
      return {
        position: 'center' as const,
        style: {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
      };
    }
  });

  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-action]')) return;

    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });

    const onMove = (ev: MouseEvent) => {
      if (!startPos()) return;
      const x = Math.min(startPos()!.x, ev.clientX);
      const y = Math.min(startPos()!.y, ev.clientY);
      const w = Math.abs(ev.clientX - startPos()!.x);
      const h = Math.abs(ev.clientY - startPos()!.y);
      setRect({ x, y, w, h });
    };

    const onUp = () => {
      setIsSelecting(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleConfirm = (mode: SelectionMode) => {
    if (rect() && rect()!.w > 10 && rect()!.h > 10) {
      props.onConfirm(rect()!, mode);
    }
  };

  const handleCancel = () => {
    setRect(null);
    props.onCancel?.();
  };

  return (
    <div
      onMouseDown={onMouseDown}
      class="fixed inset-0 z-50"
      style={{ 
        cursor: isSelecting() ? 'crosshair' : 'default',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Selection rectangle */}
      <Show when={rect() && rect()!.w > 0}>
        {/* Cutout mask */}
        <svg class="fixed inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="cutout">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={rect()!.x}
                y={rect()!.y}
                width={rect()!.w}
                height={rect()!.h}
                fill="black"
              />
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.4)" mask="url(#cutout)" />
        </svg>

        {/* Border */}
        <div
          class="absolute border-2 border-neutral-400 rounded"
          style={{
            left: `${rect()!.x}px`,
            top: `${rect()!.y}px`,
            width: `${rect()!.w}px`,
            height: `${rect()!.h}px`,
          }}
        >
          {/* Size indicator */}
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-300 font-mono">
            {rect()!.w} × {rect()!.h}
          </div>

        </div>

        {/* Buttons - компактные иконки */}
        <Show when={!isSelecting() && rect()!.w > 50 && rect()!.h > 30}>
          <div
            class="fixed flex gap-1.5 pointer-events-auto animate-fade-in z-100"
            style={buttonsPosition().style}
          >
            <button
              data-action
              onClick={() => handleConfirm('translate')}
              class="p-2 bg-neutral-100 hover:bg-white text-neutral-900 rounded-md transition-colors shadow-lg"
              title="Перевести (однократно)"
            >
              <Check size={16} />
            </button>
            <button
              data-action
              onClick={() => handleConfirm('persistent')}
              class="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors shadow-lg"
              title="Постоянный перевод"
            >
              <Pin size={16} />
            </button>
            <button
              data-action
              onClick={handleCancel}
              class="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-md transition-colors shadow-lg border border-neutral-600"
              title="Отмена"
            >
              <X size={16} />
            </button>
          </div>
        </Show>
      </Show>

      {/* Hint */}
      <Show when={!rect()}>
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-neutral-400 text-sm">
          Выделите область для перевода
        </div>
      </Show>
    </div>
  );
}
