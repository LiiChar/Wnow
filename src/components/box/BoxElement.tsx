import { TextBox } from "@/shared/types/ocr";
import { createSignal, Show } from "solid-js";

type BoxElementProps = {
	box: TextBox
  onHover?: (text: string, x: number, y: number, w: number, h: number) => void;
  onClick?: (text: string, x: number, y: number, w: number, h: number) => void;
  index: number;
};

export const BoxElement = (props: BoxElementProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const padding = 0;

	return (
		<div
      class="fixed cursor-pointer z-[10000]"
      style={{
        left: `${props.box.x - padding}px`,
        top: `${props.box.y - padding}px`,
        width: `${props.box.w + padding * 2}px`,
        height: `${props.box.h + padding * 2}px`,
        "animation-delay": `${props.index * 20}ms`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(props.box.text, props.box.x, props.box.y, props.box.w, props.box.h);
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        props.onHover?.(props.box.text, props.box.x, props.box.y, props.box.w, props.box.h);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        class="absolute inset-0 rounded transition-all duration-150"
			style={{
          background: isHovered() ? "rgba(163, 163, 163, 0.25)" : "rgba(163, 163, 163, 0.1)",
          border: isHovered() ? "1.5px solid rgba(163, 163, 163, 0.8)" : "1px solid rgba(163, 163, 163, 0.4)",
        }}
      />

      {/* Tooltip */}
      <Show when={isHovered()}>
        <div
          class="absolute z-50 left-1/2 -translate-x-1/2 pointer-events-none animate-fade-in"
          style={{ bottom: `${props.box.h + padding * 2 + 8}px` }}
        >
          <div class="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 shadow-lg whitespace-nowrap">
            <div class="text-xs text-neutral-500">{props.box.text}</div>
            <div class="text-sm text-neutral-200">
              {props.box.translation || "No translation"}
            </div>
          </div>
          {/* Arrow */}
          <div class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-neutral-900 border-r border-b border-neutral-700" />
        </div>
      </Show>
		</div>
	);
};
