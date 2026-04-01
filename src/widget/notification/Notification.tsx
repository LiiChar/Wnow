import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { X } from 'lucide-solid';
import {
	createEffect,
	createSignal,
	For,
	on,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';

import type { NotificationItem, NotificationPayload } from '@/shared/types/notification';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { get_main_monitor } from '@/shared/api/monitor';
import { listener } from '@/shared/lib/listener';
import { log } from '@/shared/lib/log';


const DEFAULT_DURATION = 3000;
const GAP = 8;
const MAX_VISIBLE = 4;
const CARD_HEIGHT = 64;
const WINDOW_WIDTH = 300;
const MAX_HEIGHT = 320;
const PADDING = 16;
const TASKBAR_HEIGHT = 50;


const STATUS_STYLES = {
	success: { border: '#22c55e', bg: '#052e1f' },
	error: { border: '#ef4444', bg: '#3b0a0a' },
	warning: { border: '#f59e0b', bg: '#3b2a05' },
	info: { border: '#3b82f6', bg: '#0a1b3b' },
};

export const Notification = () => {
	const [notifications, setNotifications] = createSignal<NotificationItem[]>(
		[],
	);
	const [queue, setQueue] = createSignal<NotificationItem[]>([]);

	// =========================
	// utils
	// =========================

	const remove = (id: string) => {
		setNotifications(prev => prev.filter(n => n.id !== id));
	};

	const scheduleRemove = (item: NotificationItem) => {
		if (item.duration <= 0) return;

		item.remaining = item.remaining ?? item.duration;

		item.timeout = window.setTimeout(() => {
			remove(item.id);
		}, item.remaining);
	};

	const pause = (item: NotificationItem) => {
		if (!item.timeout) return;

		clearTimeout(item.timeout);
		item.timeout = undefined;

		item.remaining =
			item.remaining! - (Date.now() - (item.pausedAt ?? item.createdAt));

		item.pausedAt = Date.now();
	};

	const resume = (item: NotificationItem) => {
		item.pausedAt = Date.now();
		scheduleRemove(item);
	};

	// =========================
	// очередь + группировка
	// =========================

	const push = (payload: NotificationPayload) => {
		const id = crypto.randomUUID();

		const item: NotificationItem = {
			...payload,
			id,
			status: payload.status ?? 'info',
			duration: payload.duration ?? DEFAULT_DURATION,
			createdAt: Date.now(),
			count: 1,
		};

		// группировка
		setNotifications(prev => {
			const index = prev.findIndex(
				n => n.title === item.title && n.text === item.text,
			);

			if (index !== -1) {
				const updated = {
					...prev[index],
					count: (prev[index].count ?? 1) + 1,
				};

				return [...prev.slice(0, index), updated, ...prev.slice(index + 1)];
			}

			if (prev.length >= MAX_VISIBLE) {
				setQueue(q => [...q, item]);
				return prev;
			}

			scheduleRemove(item);
			return [...prev, item];
		});
	};

	// обработка очереди
	createEffect(() => {
		const list = notifications();
		const q = queue();

		if (list.length < MAX_VISIBLE && q.length > 0) {
			const next = q[0];

			setQueue(q.slice(1));
			setNotifications(prev => {
				scheduleRemove(next);
				return [...prev, next];
			});
		}
	});

	createEffect(
		on(notifications, async () => {
			const count = notifications().length;

			const height = Math.min(
				MAX_HEIGHT,
				Math.max(20, count * CARD_HEIGHT + (count - 1) * GAP),
			);

			const monitor = await get_main_monitor();
			const scale = monitor.scale_factor;

			const x = (monitor.x + monitor.width - WINDOW_WIDTH - PADDING) / scale;
			const y = (monitor.y + monitor.height - height - (TASKBAR_HEIGHT + PADDING)) / scale;

			const win = getCurrentWebviewWindow();

			await win.setSize(new LogicalSize(WINDOW_WIDTH, height));
			await win.setPosition(new PhysicalPosition(x, y));
		}),
	);

	// =========================
	// listener
	// =========================

	onMount(() => {
		const { add, clear } = listener();

		add<NotificationPayload>('show_notification', ({ payload }) => {
			push(payload);
		});

		onCleanup(clear);
	});

	// =========================
	// drag
	// =========================

	const handleDrag = (e: PointerEvent, id: string) => {
		const startX = e.clientX;
		const el = e.currentTarget as HTMLElement;

		const move = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;
			el.style.transform = `translateX(${dx}px)`;
			el.style.opacity = `${1 - Math.abs(dx) / 200}`;
		};

		const up = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;

			if (Math.abs(dx) > 120) {
				remove(id);
			} else {
				el.style.transform = '';
				el.style.opacity = '';
			}

			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};

	// =========================
	// render
	// =========================

	return (
		<div
			class='flex flex-col-reverse pointer-events-none'
			style={{ gap: `${GAP}px` }}
		>
			<For each={[...notifications()].reverse()}>
				{n => {
					const style: typeof STATUS_STYLES[keyof typeof STATUS_STYLES] = STATUS_STYLES[n.status!];

					return (
						<div
							class='pointer-events-auto transition-all duration-300'
							onMouseEnter={() => pause(n)}
							onMouseLeave={() => resume(n)}
							onPointerDown={e => handleDrag(e, n.id)}
						>
							<Card
								style={{
									height: `${CARD_HEIGHT}px`,
									width: `${WINDOW_WIDTH}px`,
									'border-left': `4px solid ${style.border}`,
								}}
								class='relative'
							>
								<CardContent class='flex items-center gap-2  overflow-hidden'>
									{n.icon && (
										<img
											src={n.icon}
											style={{ width: '18px', height: '18px' }}
										/>
									)}

									<div class='flex-1 min-w-0'>
										<div class='font-bold text-sm truncate'>
											{n.title}
											{n.count && n.count > 1 && (
												<span class='ml-2 text-xs opacity-70'>×{n.count}</span>
											)}
										</div>

										<Show when={n.text.length > 0}>
											<div class='text-xs text-muted-foreground line-clamp-1'>
												{n.text}
											</div>
										</Show>
									</div>

									<Button
									class='h-full aspect-square p-0 z-10'
										size='sm'
										variant='ghost'
										onClick={() => remove(n.id)}
									>
										<X />
									</Button>

									{/* прогресс */}
									{n.duration > 0 && (
										<div
											style={{
												width: '100%',
												transition: 'width linear',
												animation: `progress ${n.duration}ms linear forwards`,
												background: `linear-gradient(to right, ${style.bg}, ${style.bg})`,
											}}
											class='absolute bottom-0 left-0 h-full opacity-20'
										/>
									)}
								</CardContent>
							</Card>
						</div>
					);
				}}
			</For>
		</div>
	);
};
