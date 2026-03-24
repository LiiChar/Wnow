import { Show, createSignal, createMemo, Accessor } from 'solid-js';
import { Check, Copy, FoldVertical, Plus } from 'lucide-solid';
import { toaster } from '@kobalte/core/toast';
import { ToastStatus } from '../toaster/ToastStatus';
import { TextBox } from '@/shared/types/ocr';
import { invoke } from '@tauri-apps/api/core';

export type PopupMode = 'compact' | 'full';

type WordPopupProps = {
	box: Accessor<TextBox> ;
};

export function WordPopup(props: WordPopupProps) {
	const padding = 2;
	const gap = 24;

	const [added, setAdded] = createSignal(false);
	const [copied, setCopied] = createSignal(false);
	const [mode, setMode] = createSignal<PopupMode>('compact');

	

	const data = createMemo(() => ({
		word: props.box().text,
		translation: props.box().translation,
		x: props.box().x,
		y: props.box().y,
		w: props.box().w,
		h: props.box().h,
	}));

	const handleAddToStudy = async () => {
		try {
			await invoke('add_word_to_study', {
				word: data().word,
				translation: data().translation,
				context: "",
				contextTranslation: "",
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
	}
		

	const cardWidth = createMemo(() => (mode() === 'compact' ? 200 : 320));

	const isClipboard = createMemo(() => data().w === 100 && data().h === 20);

	const estimatedHeight = createMemo(() => {
		if (mode() === 'compact') return 80;

		const len = data().translation?.length || 0;
		let h = 120 + Math.ceil(len / 35) * 20;

		return Math.min(Math.max(h, 160), 400);
	});

	const position = createMemo(() => {
		const margin = 20;
		const width = cardWidth();
		const height = estimatedHeight();

		let left = data().x + data().w / 2 - width / 2;
		left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

		if (isClipboard()) {
			return {
				left: (window.innerWidth - width) / 2,
				top: Math.max(margin, (window.innerHeight - height) / 2),
			};
		}

		let top = data().y - padding - gap - height;

		if (top < margin) {
			top = data().y + data().h + padding + gap;
		}

		if (top + height > window.innerHeight - margin) {
			top = window.innerHeight - height - margin;
		}

		return {
			left,
			top: Math.max(margin, top),
		};
	});

	const line = createMemo(() => {
		if (isClipboard()) return null;

		const pos = position();
		const height = estimatedHeight();
		const width = cardWidth();

		const wordCenterX = data().x + data().w / 2;
		const cardCenterX = pos.left + width / 2;

		const isAbove = pos.top + height < data().y;

		return {
			x1: wordCenterX,
			y1: isAbove ? data().y - padding : data().y + data().h + padding,
			x2: cardCenterX,
			y2: isAbove ? pos.top + height : pos.top,
		};
	});

	const handleCopy = () => {
		navigator.clipboard.writeText(data().translation ?? data().word);
		setCopied(true);

		toaster.show(p => (
			<ToastStatus status='success' text='Скопировано' toastId={p.toastId} />
		));

		setTimeout(() => setCopied(false), 2000);
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
		<>
			<Show when={!isClipboard()}>
				<div
					class='fixed pointer-events-none z-[10000] rounded border-2 border-neutral-400 bg-neutral-400/10'
					style={{
						left: `${data().x - padding}px`,
						top: `${data().y - padding}px`,
						width: `${data().w + padding * 2}px`,
						height: `${data().h + padding * 2}px`,
					}}
				/>

				<Show when={line()}>
					{l => (
						<svg class='fixed inset-0 z-[10000] pointer-events-none'>
							<line
								x1={l().x1}
								y1={l().y1}
								x2={l().x2}
								y2={l().y2}
								stroke='rgb(163,163,163)'
								stroke-width='1.5'
								stroke-dasharray='4 2'
							/>
						</svg>
					)}
				</Show>
			</Show>

			<div
				class='fixed z-[10002]'
				style={{
					left: `${position().left}px`,
					top: `${position().top}px`,
				}}
				onClick={e => e.stopPropagation()}
			>
				<div
					class='bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden'
					style={{ width: `${cardWidth()}px` }}
				>
					<Show when={data().word}>
						<Show when={mode() === 'compact'}>
							<div class='p-2 flex justify-between gap-2'>
								<div class='flex-1 min-w-0'>
									<div class='text-xs text-neutral-400 truncate'>
										{data().word}
									</div>
									<div class='text-sm text-neutral-100 line-clamp-2'>
										{data().translation}
									</div>
								</div>

								<div class='flex gap-1'>
									<button onClick={handleAdd}>
										<Show when={added()} fallback={<Plus size={14} />}>
											<Check size={14} />
										</Show>
									</button>

									<button onClick={handleCopy}>
										<Show when={copied()} fallback={<Copy size={14} />}>
											<Check size={14} />
										</Show>
									</button>

									<button onClick={() => setMode('full')}>
										<FoldVertical size={14} />
									</button>
								</div>
							</div>
						</Show>

						<Show when={mode() === 'full'}>
							<div class='p-3'>
								<div class='text-sm text-neutral-100 mb-2'>{data().word}</div>
								<div class='text-neutral-300'>{data().translation}</div>
							</div>

							<div class='flex border-t border-neutral-800'>
								<button onClick={handleAdd} class='flex-1 py-2'>
									<Show when={added()} fallback={<Plus size={14} />}>
										<Check size={14} />
									</Show>
								</button>

								<button
									onClick={handleCopy}
									class='flex-1 py-2 border-l border-neutral-800'
								>
									<Show when={copied()} fallback={<Copy size={14} />}>
										<Check size={14} />
									</Show>
								</button>
							</div>
						</Show>
					</Show>
				</div>
			</div>
		</>
	);
}
