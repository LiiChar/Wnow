import { invoke } from '@tauri-apps/api/core';
import pino from 'pino';

const LOG_ENDPOINT = 'https://your-api.com/logs';

type LogItem = {
	level: string;
	message: string;
	time: number;
};

let queue: LogItem[] = [];

// 🔁 отправка батчем
const sendLog = async (log: string) => {
	const data = new Date().toISOString();
  await invoke('log', { message: `[${data}]${log}` });
};

const logger = pino({
	transport: { target: 'pino-pretty', options: { colorize: true } },
});
// 🔌 прокси-обёртка
const wrap =
	(level: 'info' | 'error' | 'warn' | 'debug') =>
	(...messages: any[]) => {
		logger[level](messages.join(" "));

		queue.push({
			level,
			message: messages.join(" "),
			time: Date.now(),
		});

		sendLog(`[${level.toUpperCase()}]${messages.join(" ")}`);
	};

// 🚀 экспорт удобного API
export const log = {
	info: wrap('info'),
	error: wrap('error'),
	warn: wrap('warn'),
	debug: wrap('debug'),
};
