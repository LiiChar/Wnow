import { For, Accessor, createSignal, Show } from "solid-js";
import { BoxElement } from "./BoxElement";
import { TextBox } from "../../shared/types/ocr";
import { WordPopup } from "../overlay/WordPopup";

interface BoxCanvasProps {
  boxes: Accessor<TextBox[]>;
}

export const BoxCanvas = (props: BoxCanvasProps) => {
  const [wordPopup, setWordPopup] = createSignal<TextBox | null>(null);

  const handleWordClick = (_text: string, x: number, y: number, w: number, h: number) => {
    const box = props.boxes().find(b => b.x === x && b.y === y && b.w === w && b.h === h);
    if (box) setWordPopup(box);
  };

  return (
    <div class='fixed inset-0 z-[9999] pointer-events-auto'>
      <For each={props.boxes()}>
        {(box, i) => (
          <BoxElement
            box={box}
            onClick={handleWordClick}
            index={i()}
          />
        )}
      </For>
      <Show when={wordPopup()}>
        <WordPopup box={() => wordPopup()!} />
      </Show>
    </div>
  );
};
