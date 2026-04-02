import { Check, RefreshCcw, X, Zap } from 'lucide-solid';
import { createEffect, createSignal, Show } from 'solid-js';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progres';
import { getLearningStats, getWordsForStudy, updateWordProgress } from '@/shared/api/stude';
import { useLocale } from '@/shared/lib/locale.tsx';
import { useHeader } from '@/shared/hooks/useHeader';
import { setLayoutStore } from '@/shared/stores/layout';

import type { FlashcardWord, LearningStats } from '../shared/types/storage';

export const StudyPage = () => {
  const [words, setWords] = createSignal<FlashcardWord[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [showAnswer, setShowAnswer] = createSignal(false);
  const [stats, setStats] = createSignal<LearningStats | null>(null);
  const [sessionStats, setSessionStats] = createSignal({ correct: 0, wrong: 0 });
  const [loading, setLoading] = createSignal(true);
	const { t } = useLocale();

	useHeader(t().study.title, '');

  const loadData = async () => {
    setLoading(true);
    try {
      const [wordsResult, statsResult] = await Promise.all([
				getWordsForStudy(20),
				getLearningStats(),
      ]);
      setWords(wordsResult);
      setStats(statsResult);
			setLayoutStore("headerDescription", t().study.wordsDescription(stats()?.total_words || 0, stats()?.words_learned || 0));
    } catch (e) {
      console.error('Failed to load study data:', e);
    }
    setLoading(false);
  };

  createEffect(() => { loadData(); });

  const currentWord = () => words()[currentIndex()];
  const isComplete = () => currentIndex() >= words().length;

  const handleAnswer = async (correct: boolean) => {
    const word = currentWord();

    try {
			await updateWordProgress(word.id, correct ? 5 : 1);
    } catch (e) {
      console.error('Failed to update progress:', e);
    }

    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));

    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setSessionStats({ correct: 0, wrong: 0 });
    loadData();
  };

  const progress = () => (currentIndex() / Math.max(words().length, 1)) * 100;
  return (
		<div class='h-full flex flex-col'>
			<Progress value={progress()} />

			<div class='flex-1 flex items-center justify-center pb-22'>
				<Show
					fallback={
						<div class='w-8 h-8 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin' />
					}
					when={!loading()}
				>
					<Show
						fallback={
							<Card class='text-center max-w-sm'>
								<CardContent class='p-8'>
									<div class='flex justify-center mb-4 text-neutral-500'>
										<Zap size={48} />
									</div>
									<h2 class='text-lg font-semibold  mb-2'>{t().study.noWordsTitle}</h2>
									<p class='text-neutral-400 mb-6'>{t().study.noWordsDescription}</p>
									<Button class='gap-1.5' onClick={restartSession}>
										<RefreshCcw size={16} />
										{t().study.refresh}
									</Button>
								</CardContent>
							</Card>
						}
						when={words().length > 0}
					>
						<Show
							fallback={
								<Card class='text-center max-w-sm'>
									<CardContent class='p-8'>
										<div class='flex justify-center mb-4 text-amber-400'>
											<Zap size={48} />
										</div>
										<h2 class='text-lg font-semibold  mb-2'>
											{t().study.sessionComplete}
										</h2>
										<div class='flex gap-4 justify-center mb-4'>
											<div class='text-center'>
												<div class='text-2xl font-bold text-green-400'>
													{sessionStats().correct}
												</div>
												<div class='text-xs text-neutral-500'>{t().study.correct}</div>
											</div>
											<div class='text-center'>
												<div class='text-2xl font-bold text-red-400'>
													{sessionStats().wrong}
												</div>
												<div class='text-xs text-neutral-500'>{t().study.wrong}</div>
											</div>
										</div>
										<Button class='w-full gap-1.5' onClick={restartSession}>
											<RefreshCcw size={16} />
											{t().study.restart}
										</Button>
									</CardContent>
								</Card>
							}
							when={!isComplete()}
						>
							<div class='w-full max-w-md'>
								<Card
									class='cursor-pointer min-h-70 flex flex-col justify-center'
									onClick={() => setShowAnswer(!showAnswer())}
								>
									<CardContent class='p-8 text-center'>
										<div class='text-xs text-neutral-500 uppercase tracking-wide mb-4'>
											{showAnswer() ? t().study.translation : t().study.howToTranslate}
										</div>
										<div
											class={`text-2xl font-semibold ${showAnswer() ? 'text-neutral-400' : ''}`}
										>
											{showAnswer()
												? currentWord()?.translation
												: currentWord()?.word}
										</div>
										<Show when={currentWord()?.context && !showAnswer()}>
											<div class='text-sm text-neutral-500 mt-4 italic'>
												"{currentWord()?.context}"
											</div>
										</Show>
										<Show when={!showAnswer()}>
											<div class='text-xs text-neutral-600 mt-6'>
												{t().study.clickToAnswer}
											</div>
										</Show>
									</CardContent>
								</Card>

								<Show when={showAnswer()}>
									<div class='flex gap-3 mt-4'>
										<Button
											class='flex-1 border-red-800 text-red-400 hover:bg-red-950 gap-1.5'
											variant='outline'
											onClick={() => handleAnswer(false)}
										>
											<X size={16} />
											{t().study.dontKnow}
										</Button>
										<Button
											class='flex-1 gap-1.5'
											variant='secondary'
											onClick={() => handleAnswer(true)}
										>
											<Check size={16} />
											{t().study.know}
										</Button>
									</div>
								</Show>
							</div>
						</Show>
					</Show>
				</Show>
			</div>
		</div>
	);
}
