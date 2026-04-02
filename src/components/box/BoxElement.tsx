import { Check, Copy, Plus } from "lucide-solid";
import { createSignal, Show } from "solid-js";

import type { TextBox } from "@/shared/types/ocr";

import { showNotification } from "@/shared/api/notification";
import { addWordToStudy } from "@/shared/api/stude";

interface BoxElementProps {
	box: TextBox
  index?: number;
	showPopover?: boolean;
  onClick?: (box: TextBox) => void;
  onHover?: (box: TextBox) => void;
}

export const BoxElement = (props: BoxElementProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const [isSelected, setIsSelected] = createSignal(
    props.box.w === 0 && props.box.h === 0,
  );
	const [added, setAdded] = createSignal(false);
	const [copied, setCopied] = createSignal(false);

  const padding = 0;

	const handleCopy = () => {
		navigator.clipboard.writeText(props.box.translation ?? props.box.text);
		setCopied(true);


		showNotification({status: 'success', title: 'Скопировано', text: props.box.translation ?? props.box.text, duration: 2000});

		setTimeout(setCopied, 2000, false);
	};

	const handleAddToStudy = async () => {
		try {
			await addWordToStudy(
				props.box.text,
				props.box.translation ?? props.box.text,
				props.box
					.id ? `http://asset.localhost/resources/screenshots/debug_${props.box.id}.png` : null,
				props.box.context,
				props.box.context_translation,
			);
			showNotification({
				status: 'success',
				title: 'Добавлено',
				text: 'Слово добавлено в словарь',
				duration: 2000,
			});
		} catch (e: any) {
			console.error('Failed to add word:', e);
			showNotification({
				status: 'error',
				title: 'Ошибка',
				text: e.message || 'Не удалось добавить слово',
				duration: 2000,
			});
		}
	};

	const handleAdd = () => {
		if (added()) return;

		handleAddToStudy();
		setAdded(true);

		showNotification({
			status: 'success',
			title: 'Добавлено',
			text: 'Слово добавлено в изучение',
			duration: 2000,
		});
	};

	return (
		<div
			style={{
				left: `${props.box.x - padding}px`,
				top: `${props.box.y - padding}px`,
				width: `${props.box.w + padding * 2}px`,
				height: `${props.box.h + padding * 2}px`,
				'animation-delay': `${props.index ?? 0 * 20}ms`,
			}}
			class='absolute cursor-pointer z-10000'
			onClick={e => {
				e.stopPropagation();
				setIsSelected(prev => !prev);
				props.onClick?.(props.box);
			}}
			onMouseEnter={() => {
				setIsHovered(true);
				props.onHover?.(props.box);
			}}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Show when={!props.box.image}>
				<div
					style={{
						background: isHovered()
							? 'rgba(163, 163, 163, 0.25)'
							: 'rgba(163, 163, 163, 0.1)',
						border: isHovered()
							? '1.5px solid rgba(163, 163, 163, 0.8)'
							: '1px solid rgba(163, 163, 163, 0.4)',
					}}
					class='absolute inset-0 rounded transition-all duration-150'
				/>
			</Show>

			<Show when={props.box.image}>
				<div
					class="absolute inset-0 rounded transition-all duration-150"
				>
						<img
							class="absolute top-0 left-0 w-full h-full pointer-events-none"
							src={`data:image/png;base64,${props.box.image}`}
							/>
				</div>
			</Show>

			<Show when={isHovered() || isSelected()}>
				<div
					class='absolute z-50 left-1/2 -translate-x-1/2 animate-fade-in max-h-32'
					style={{ bottom: `${props.box.h + padding * 2 + 8}px` }}
					onClick={e => {
						e.stopPropagation();
					}}
				>
					<div class='bg-background/90  flex border-border border rounded '>
						
						<div class='px-3 py-2 whitespace-nowrap'>
							<div class='text-xs text-muted-foreground'>{props.box.text}</div>
							<div class='text-sm'>
								{props.box.translation || 'No translation'}
							</div>
						</div>
						<div class='border-l border-border w-5 flex flex-col'>
							<button
								class='flex-1 w-full h-1/2 flex justify-center items-center p-0.5'
								onClick={handleAdd}
							>
								<Show fallback={<Plus size={16} />} when={added()}>
									<Check size={16} />
								</Show>
							</button>

							<button
								class='flex-1 border-t border-border w-full h-1/2 flex justify-center items-center p-0.5'
								onClick={handleCopy}
							>
								<Show fallback={<Copy size={14} />} when={copied()}>
									<Check size={16} />
								</Show>
							</button>
						</div>
					</div>
					<div class='absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-background/90 border-border border-r border-b ' />
				</div>
			</Show>
		</div>
	);
};
