
export type NotificationStatus = 'error' | 'info' | 'success' | 'warning';

export type NotificationPayload = {
	id?: string;
	title: string;
	text: string;
	icon?: string;
	duration?: number;
	status?: NotificationStatus;
};


export type NotificationItem = NotificationPayload & {
	id: string;
	createdAt: number;
	count?: number;
	timeout?: number;
	remaining?: number;
	pausedAt?: number;
	duration: number;
};
