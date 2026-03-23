import { For, Accessor, createSignal, Show } from "solid-js";
import { BoxElement } from "./BoxElement";
import { TextBox } from "../../shared/types/ocr";
import { WordPopup } from "../overlay/WordPopup";

interface BoxCanvasProps {
  boxes: Accessor<TextBox[]>;
}



export const BoxCanvas = (props: BoxCanvasProps) => {
	const [wordPopup, setWordPopup] = createSignal<any>(null);

	const handleWordClick = async (box: TextBox) => {
		setWordPopup({
			word: box.text,
			translation: box.translation,
			context: '',
			context_translation: '',
			popup_x: box.x + box.w / 2,
			popup_y: box.y,
			word_x: box.x,
			word_y: box.y,
			word_w: box.w,
			word_h: box.h,
		});
	};

	return (
		<div class='fixed inset-0 z-40 pointer-events-auto'>
			<For each={props.boxes()}>
				{(box, i) => (
					<>
						<BoxElement
							text={box.text}
							translation={box.translation}
							x={box.x}
							y={box.y}
							w={box.w}
							h={box.h}
							onClick={() => handleWordClick(box)}
							index={i()}
						/>
					</>
				)}
			</For>
			<Show when={wordPopup}>
				<WordPopup box={wordPopup} />
			</Show>
		</div>
	);
};
