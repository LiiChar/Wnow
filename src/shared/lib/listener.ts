import { listen } from "@tauri-apps/api/event";

type Unlisten = () => void;

export const listener = () => {
	const unsubs: Unlisten[] = [];

	const add = async <T>(
		event: string,
		handler: (e: { payload: T }) => void,
	) => {
		const un = await listen<T>(event, handler); 

		unsubs.push(un);
		return un;
	};

  const clear = () => {
		for (const un of unsubs) {
			try {
				un();
			} catch (e) {
				console.error(e);
			}
		}
		unsubs.length = 0;
	};

	return { add, clear, unsubs };
};
