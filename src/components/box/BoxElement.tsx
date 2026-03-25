import { TextBox } from "@/shared/types/ocr";
import { createSignal, Show } from "solid-js";
import { ToastStatus } from "../toaster/ToastStatus";
import { toaster } from "@kobalte/core/toast";
import { invoke } from "@tauri-apps/api/core";
import { Check, Copy, Plus } from "lucide-solid";

type BoxElementProps = {
	box: TextBox
  onHover?: (box: TextBox) => void;
  onClick?: (box: TextBox) => void;
  index: number;
};

export const BoxElement = (props: BoxElementProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const [isSelected, setIsSelected] = createSignal(false);
	const [added, setAdded] = createSignal(false);
	const [copied, setCopied] = createSignal(false);

  const padding = 0;

	const handleCopy = () => {
		navigator.clipboard.writeText(props.box.translation ?? props.box.text);
		setCopied(true);

		toaster.show(p => (
			<ToastStatus status='success' text='Скопировано' toastId={p.toastId} />
		));

		setTimeout(() => setCopied(false), 2000);
	};

	const handleAddToStudy = async () => {
		try {
			await invoke('add_word_to_study', {
				word: props.box.text,
				translation: props.box.translation,
				context: '',
				contextTranslation: '',
				screenshotBase64: null,
			});
			// Toast показывается в WordPopup
		} catch (e) {
			console.error('Failed to add word:', e);
			toaster.show(props => (
				<ToastStatus
					status='error'
					text='Ошибка сохранения'
					toastId={props.toastId}
				/>
			));
		}
	};

	const handleAdd = () => {
		if (added()) return;

		handleAddToStudy();
		setAdded(true);

		toaster.show(p => (
			<ToastStatus status='success' text='Добавлено' toastId={p.toastId} />
		));
	};

	return (
		<div
			class='fixed cursor-pointer z-10000'
			style={{
				left: `${props.box.x - padding}px`,
				top: `${props.box.y - padding}px`,
				width: `${props.box.w + padding * 2}px`,
				height: `${props.box.h + padding * 2}px`,
				'animation-delay': `${props.index * 20}ms`,
			}}
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
			<div
				class='absolute inset-0 rounded transition-all duration-150'
				style={{
					background: isHovered()
						? 'rgba(163, 163, 163, 0.25)'
						: 'rgba(163, 163, 163, 0.1)',
					border: isHovered()
						? '1.5px solid rgba(163, 163, 163, 0.8)'
						: '1px solid rgba(163, 163, 163, 0.4)',
				}}
			/>

			<Show when={isHovered() || isSelected()}>
				<div
					class='absolute z-50 left-1/2 -translate-x-1/2 animate-fade-in'
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
								onClick={handleAdd}
								class='flex-1 w-full h-1/2 flex justify-center items-center p-0.5'
							>
								<Show when={added()} fallback={<Plus size={16} />}>
									<Check size={16} />
								</Show>
							</button>

							<button
								onClick={handleCopy}
								class='flex-1 border-t border-border w-full h-1/2 flex justify-center items-center p-0.5'
							>
								<Show when={copied()} fallback={<Copy size={14} />}>
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
