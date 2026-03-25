import { For, Accessor } from "solid-js";
import { BoxElement } from "./BoxElement";
import { TextBox } from "../../shared/types/ocr";

interface BoxCanvasProps {
  boxes: Accessor<TextBox[]>;
}

export const BoxCanvas = (props: BoxCanvasProps) => {

  return (
    <div class='fixed inset-0 z-9999 pointer-events-auto'>
      <For each={props.boxes()}>
        {(box, i) => (
          <BoxElement
            box={box}
            index={i()}
          />
        )}
      </For>
    </div>
  );
};
