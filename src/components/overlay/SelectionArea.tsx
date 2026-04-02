import { Check, Pin, X } from "lucide-solid";
import { createMemo, createSignal, Show } from "solid-js";

import { Button } from "../ui/Button";
import { settingsStore } from "@/shared/stores/settings";

interface Rect { h: number; w: number; x: number; y: number; }

export type SelectionMode = 'persistent' | 'translate';

interface Props {
  onCancel?: () => void;
  onConfirm: (rect: Rect, mode: SelectionMode) => void;
}

export const SelectionArea = (props: Props) => {
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
			style={{
				cursor: isSelecting() ? 'crosshair' : 'default',
				background: `rgba(0, 0, 0, 0.5)`,
			}}
			class='fixed inset-0 z-10003'
			onMouseDown={onMouseDown}
		>
			{/* Selection rectangle */}
			<Show when={rect() && rect()!.w > 0}>
				{/* Cutout mask */}
				<svg class='fixed inset-0 w-full h-full pointer-events-none'>
					<defs>
						<mask id='cutout'>
							<rect fill='white' height='100%' width='100%' x='0' y='0' />
							<rect
								fill='black'
								height={rect()!.h}
								width={rect()!.w}
								x={rect()!.x}
								y={rect()!.y}
							/>
						</mask>
					</defs>
					<rect
						fill={`rgba(0,0,0,0.${settingsStore.overlay_opacity})`}
						height='100%'
						mask='url(#cutout)'
						width='100%'
						x='0'
						y='0'
					/>
				</svg>

				{/* Border */}
				<div
					style={{
						left: `${rect()!.x}px`,
						top: `${rect()!.y}px`,
						width: `${rect()!.w}px`,
						height: `${rect()!.h}px`,
					}}
					class='absolute border-2 border-border rounded select-none'
				>
					{/* Size indicator */}
					<div class='absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-muted text-muted-foreground whitespace-nowrap rounded text-xs font-mono'>
						{rect()!.w} × {rect()!.h}
					</div>
				</div>

				{/* Buttons - компактные иконки */}
				<Show when={!isSelecting() && rect()!.w > 50 && rect()!.h > 30}>
					<div
						class='fixed flex gap-1.5 pointer-events-auto animate-fade-in z-10004'
						style={buttonsPosition().style}
					>
						<Button
							data-action
							class='aspect-square'
							title='Перевести (однократно)'
							onClick={() => handleConfirm('translate')}
						>
							<Check size={16} />
						</Button>
						<Button
							data-action
							class='aspect-square'
							title='Постоянный перевод'
							variant={'outline'}
							onClick={() => handleConfirm('persistent')}
						>
							<Pin size={16} />
						</Button>
						<Button
							data-action
							class='aspect-square'
							title='Отмена'
							variant={'destructive'}
							onClick={handleCancel}
						>
							<X size={16} />
						</Button>
					</div>
				</Show>
			</Show>

			{/* Hint */}
			<Show when={!rect()}>
				<div class='absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground text-lg'>
					Выделите область для перевода
				</div>
			</Show>
		</div>
	);
}
