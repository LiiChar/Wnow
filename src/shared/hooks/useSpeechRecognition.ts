import { createSignal, onCleanup } from 'solid-js';

type SpeechRecognition = typeof window extends {
	SpeechRecognition: infer T;
}
	? T
	: any;


type SpeechRecognitionErrorEvent = typeof window extends {
	SpeechRecognition: infer T;
}
	? T
	: any;

type SpeechRecognitionEvent = typeof window extends {
	SpeechRecognition: infer T;
}
	? T
	: any;

/** Options */
interface UseSpeechRecognitionOptions {
	continuous?: SpeechRecognition['continuous'];
	grammars?: SpeechRecognition['grammars'];
	interimResults?: SpeechRecognition['interimResults'];
	language?: SpeechRecognition['lang'];
	maxAlternatives?: SpeechRecognition['maxAlternatives'];
	onEnd?: () => void;
	onError?: (error: SpeechRecognitionErrorEvent) => void;
	onResult?: (event: SpeechRecognitionEvent) => void;
	onStart?: () => void;
}

/** Return */
interface UseSpeechRecognitionReturn {
	error: () => SpeechRecognitionErrorEvent | null;
	final: () => boolean;
	listening: () => boolean;
	recognition?: SpeechRecognition;
	supported: boolean;
	transcript: () => string;
	start: () => void;
	stop: () => void;
	toggle: (value?: boolean) => void;
}

export const getSpeechRecognition = () =>
	(window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = (
	options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn => {
	const supported = typeof window !== 'undefined' && !!getSpeechRecognition();

	const {
		continuous = false,
		interimResults = false,
		language = 'en-US',
		grammars,
		maxAlternatives = 1,
		onStart,
		onEnd,
		onError,
		onResult,
	} = options;

	const [listening, setListening] = createSignal(false);
	const [transcript, setTranscript] = createSignal('');
	const [final, setFinal] = createSignal(false);
	const [error, setError] = createSignal<SpeechRecognitionErrorEvent | null>(
		null,
	);

	let recognition: SpeechRecognition | undefined;

	if (supported) {
		const SpeechRecognition = getSpeechRecognition();
		recognition = new SpeechRecognition();

		recognition.continuous = continuous;
		if (grammars) recognition.grammars = grammars;
		recognition.interimResults = interimResults;
		recognition.lang = language;
		recognition.maxAlternatives = maxAlternatives;

		recognition.onstart = () => {
			setListening(true);
			setFinal(false);
			onStart?.();
		};

		recognition.onerror = (event: any) => {
			setError(event);
			setListening(false);
			onError?.(event);
		};

		recognition.onresult = (event: any) => {
			const currentResult = event.results[event.resultIndex];
			const { transcript } = currentResult[0];

			setListening(false);
			setTranscript(transcript);
			setError(null);
			onResult?.(event);
		};

		recognition.onend = () => {
			setListening(false);
			onEnd?.();
			if (recognition) recognition.lang = language;
		};
	}

	onCleanup(() => {
		recognition?.stop();
	});

	const start = () => recognition?.start();
	const stop = () => recognition?.stop();

	const toggle = (value = !listening()) => {
		if (value) return start();
		return stop();
	};

	return {
		supported,
		transcript,
		recognition,
		final,
		listening,
		error,
		start,
		stop,
		toggle,
	};
};
