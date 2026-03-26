import { onCleanup } from 'solid-js';

export type DebouncedCallback<Params extends unknown[]> = ((
	...args: Params
) => void) & {
	cancel: () => void;
};

export const useDebounceCallback = <Params extends unknown[], Return>(
	callback: (...args: Params) => Return,
	delay: number,
): DebouncedCallback<Params> => {
	let timer: ReturnType<typeof setTimeout> | null = null;

	const cancel = () => {
		if (!timer) return;
		clearTimeout(timer);
		timer = null;
	};

	const debounced = function (...args: Params) {
		cancel();

		timer = setTimeout(() => {
			callback(...args);
		}, delay);
	} as DebouncedCallback<Params>;

	debounced.cancel = cancel;

	onCleanup(cancel);

	return debounced;
};
