import { ArrowLeftRight, Check, Copy, Mic, Plus, Volume2 } from 'lucide-solid';
import { createEffect, createSignal, Show } from 'solid-js';

import { Button } from '@/components/ui/Button';
import { addWordToStudy } from '@/shared/api/stude';
import { translate } from '@/shared/api/translate';
import { useDebounceCallback } from '@/shared/hooks/useDebounceCallback';
import { useSpeechRecognition } from '@/shared/hooks/useSpeechRecognition';
import { languages } from '@/shared/lib/language';
import { cn } from '@/shared/lib/utils';

export const Translate = () => {
  const [sourceText, setSourceText] = createSignal('');
  const [translatedText, setTranslatedText] = createSignal('');
  const [sourceLang, setSourceLang] = createSignal('en');
  const [targetLang, setTargetLang] = createSignal('ru');
  const [isSourceCopying, setIsSourceCopying] = createSignal(false);
  const [isTargetCopying, setIsTargetCopying] = createSignal(false);
  const [isAdded, setAdded] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);

  const debouncedTranslate = useDebounceCallback(async (query: string) => {
    const trimmed = query.trim();
		const translation = await translate(trimmed, sourceLang(), targetLang());
		setTranslatedText(translation);
		setIsLoading(false);
  }, 500);

  const { start, supported, listening } = useSpeechRecognition({
    onResult: e => {
      setSourceText(e.results[0][0].transcript);
    },
    onError(error) {
          console.error('Speech recognition error:', error);
    }
  });

  const translateText = async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      return;
    }

    setIsLoading(true);

    debouncedTranslate(text);
  };

  createEffect(() => {
    translateText(sourceText());
  });

  const handleSwapLanguages = () => {
    const tmpLang = sourceLang();
    setSourceLang(targetLang());
    setTargetLang(tmpLang);

    setSourceText(translatedText());
    setTranslatedText("");
  };

  const handleCopy = async (text: string, isSource: boolean) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      if (isSource) {
        setIsSourceCopying(true);
        setTimeout(setIsSourceCopying, 2000, false);
      } else {
        setIsTargetCopying(true);
        setTimeout(setIsTargetCopying, 2000, false);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  };

  return (
		<div class='flex h-full w-full flex-col bg-background border border-border rounded-lg overflow-hidden min-h-38.5'>
			<div class='flex items-center justify-between pb-1'>
				<div class='flex justify-between items-center w-full gap-2'>
					<select
						class='cursor-pointer  max-w-[calc(50%-24px)] border-b border-r rounded-br-md border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary'
						value={sourceLang()}
						onInput={e => setSourceLang(e.currentTarget.value)}
					>
						{languages.map(lang => (
							<option value={lang.code}>{lang.name}</option>
						))}
					</select>

					<Button
						class='min-h-8 min-w-8 p-0 hover:bg-accent'
						size='sm'
						variant='ghost'
						onClick={handleSwapLanguages}
					>
						<ArrowLeftRight class='h-4 w-4' />
					</Button>

					<select
						class='cursor-pointer border-b border-l rounded-bl-md max-w-[calc(50%-24px)] border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary'
						value={targetLang()}
						onInput={e => setTargetLang(e.currentTarget.value)}
					>
						{languages.map(lang => (
							<option value={lang.code}>{lang.name}</option>
						))}
					</select>
				</div>
			</div>

			{/* Область перевода */}
			<div class='flex flex-1 relative'>
				{/* Исходный текст */}
				<div class='flex flex-1 flex-col w-1/2 relative'>
					<textarea
						class='flex-1 resize-none border-none bg-background p-2 pr-7 text-base leading-relaxed text-foreground outline-none'
						placeholder='Введите текст для перевода...'
						spellcheck='false'
						value={sourceText()}
						onInput={e => setSourceText(e.currentTarget.value)}
					/>

					<div class='absolute right-1 top-1 flex flex-col items-center gap-0'>
						<Button
							class='h-7 w-7 p-0 hover:bg-accent'
							disabled={!sourceText()}
							size='sm'
							variant='ghost'
							onClick={() => handleSpeak(sourceText(), sourceLang())}
						>
							<Volume2 class='h-3.5 w-3.5' />
						</Button>
						<Button
							class='h-7 w-7 p-0 hover:bg-accent'
							disabled={!sourceText()}
							size='sm'
							variant='ghost'
							onClick={() => handleCopy(sourceText(), true)}
						>
							<Show
								fallback={<Copy class='h-3.5 w-3.5' />}
								when={isSourceCopying()}
							>
								<Check class='h-3.5 w-3.5 text-green-600' />
							</Show>
						</Button>
						<Button
							class={cn(
								'h-7 w-7 p-0 hover:bg-accent',
								listening() && 'bg-accent',
							)}
							disabled={!supported}
							size='sm'
							variant='ghost'
							onClick={async () => {
								await navigator.mediaDevices.getUserMedia({
									audio: true,
								});
								start();
							}}
						>
							<Mic class='h-3.5 w-3.5' />
						</Button>
					</div>

					{/* <div class='absolute bottom-1 right-3.5  text-xs text-muted-foreground'>
						{sourceText().length}
					</div> */}
				</div>

				<div class='absolute top-0 left-[calc(50%-1px)] w-px bg-border h-full'></div>

				<div class='relative flex-1 w-1/2'>
					{isLoading() && (
						<div class='absolute inset-0 flex items-center justify-center bg-background/50'>
							<div class='h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
						</div>
					)}
					<textarea
						readOnly
						class={cn(
							'h-full w-full resize-none border-none bg-background p-2 pr-7 text-base leading-relaxed text-foreground outline-none',
							isLoading() && 'text-transparent',
						)}
						placeholder='Перевод появится здесь...'
						spellcheck='false'
						value={translatedText()}
					/>
					{/* <div class='absolute bottom-1 right-3.5  text-xs text-muted-foreground'>
						{translatedText().length}
					</div> */}

					<div class='flex flex-col items-center gap-0 absolute right-1 top-1 '>
						<Button
							class='h-7 w-7 p-0 hover:bg-accent'
							disabled={!translatedText()}
							size='sm'
							variant='ghost'
							onClick={() => handleSpeak(translatedText(), targetLang())}
						>
							<Volume2 class='h-3.5 w-3.5' />
						</Button>
						<Button
							class='h-7 w-7 p-0 hover:bg-accent'
							disabled={!translatedText()}
							size='sm'
							variant='ghost'
							onClick={() => handleCopy(translatedText(), false)}
						>
							<Show
								fallback={<Copy class='h-3.5 w-3.5' />}
								when={isTargetCopying()}
							>
								<Check class='h-3.5 w-3.5 text-green-600' />
							</Show>
						</Button>
						<Button
							class={cn(
								'h-7 w-7 p-0 hover:bg-accent',
							)}
							disabled={!sourceText()} 
							size='sm'
							variant='ghost'
							onClick={async () => {
								await addWordToStudy(
									sourceText(),
									translatedText(),
									null,
								);
								setAdded(true);
								setTimeout(setAdded, 2000, false);
							}}
						>
							<Show fallback={<Plus class='h-3.5 w-3.5' />} when={isAdded()}>
								<Check class='h-3.5 w-3.5' />
							</Show>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
