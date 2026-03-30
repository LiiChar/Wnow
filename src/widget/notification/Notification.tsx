import { listener } from '@/shared/lib/listener';
import { log } from '@/shared/lib/log';
import { NotificationPayload } from '@/shared/types/notification';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSignal, onCleanup, onMount, For } from 'solid-js';

type NotificationItem = NotificationPayload & {
	id: string;
};

const DEFAULT_DURATION = 4000;
const GAP = 10;
const MAX_VISIBLE = 5;

export const Notification = () => {
	const [notifications, setNotifications] = createSignal<NotificationItem[]>(
		[],
	);

	const remove = (id: string) => {
		setNotifications(prev => prev.filter(n => n.id !== id));
	};

	const addNotification = (payload: NotificationPayload) => {
		const id = payload.id ?? crypto.randomUUID();

		const item: NotificationItem = {
			...payload,
			id,
			duration: payload.duration ?? DEFAULT_DURATION,
		};

		setNotifications(prev => {
			const next = [...prev, item];

			// ограничиваем количество (чтобы не вылезало за экран)
			if (next.length > MAX_VISIBLE) {
				next.shift();
			}

			return next;
		});

		// автоудаление
		setTimeout(() => {
			remove(id);
		}, item.duration);
	};

	onMount(() => {
		const { add, clear } = listener();

    getCurrentWebviewWindow().setSize(new LogicalSize(300, 500));

		add<NotificationPayload>('show_notification', ({ payload }) => {
      log.info('[LAYOUT][EVENT][show_notification]Listened to show_notification event with payload: ' + JSON.stringify(payload));
			addNotification(payload);
		});

		onCleanup(() => {
			clear();
		});
	});

	return (
		<div
			style={{
				position: 'fixed',
				right: '16px',
				bottom: '16px',
				display: 'flex',
				'flex-direction': 'column',
				gap: `${GAP}px`,
				'z-index': 9999,
				'pointer-events': 'none', // чтобы клики не блокировались
			}}
		>
			<For each={notifications()}>
				{n => (
					<div
						style={{
							width: '260px',
							padding: '10px 12px',
							'border-radius': '12px',
							background: 'rgba(30,30,30,0.95)',
							color: '#fff',
							'box-shadow': '0 8px 20px rgba(0,0,0,0.3)',
							display: 'flex',
							gap: '10px',
							'align-items': 'flex-start',
							'pointer-events': 'auto',
							animation: 'fadeIn 0.2s ease',
						}}
					>
						{n.icon && (
							<img
								src={n.icon}
								style={{
									width: '20px',
									height: '20px',
								}}
							/>
						)}

						<div style={{ flex: 1 }}>
							<div style={{ 'font-size': '13px', 'font-weight': 600 }}>
								{n.title}
							</div>
							<div style={{ 'font-size': '12px', opacity: 0.8 }}>{n.text}</div>
						</div>

						<button
							onClick={() => remove(n.id)}
							style={{
								background: 'transparent',
								border: 'none',
								color: '#aaa',
								cursor: 'pointer',
								'font-size': '14px',
							}}
						>
							✕
						</button>
					</div>
				)}
			</For>
		</div>
	);
};
