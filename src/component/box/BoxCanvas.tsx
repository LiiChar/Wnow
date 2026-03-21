import { For, Accessor } from "solid-js";
import { BoxElement } from "./BoxElement";
import { TextBox } from "../../shared/types/ocr";

interface BoxCanvasProps {
  boxes: Accessor<TextBox[]>;
  getTranslation: (word: string) => string | undefined;
  onWordClick: (text: string, x: number, y: number, w: number, h: number) => void;
}

export const BoxCanvas = (props: BoxCanvasProps) => {
	return (
		<div class='fixed inset-0 z-40 pointer-events-auto'>
			<For each={props.boxes()}>
				{(box, i) => (
					<BoxElement
						text={box.text}
						translation={box.translation ?? props.getTranslation(box.text)}
						x={box.x}
						y={box.y}
						w={box.w}
						h={box.h}
						onClick={props.onWordClick}
						index={i()}
					/>
				)}
			</For>
		</div>
	);
};
