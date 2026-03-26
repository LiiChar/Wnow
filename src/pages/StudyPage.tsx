import { createSignal, createEffect, Show } from 'solid-js';
import type { FlashcardWord, LearningStats } from '../shared/types/storage';
import { Check, RefreshCcw, X, Zap } from 'lucide-solid';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useHeader } from '@/shared/hooks/useHeader';
import { setLayoutStore } from '@/shared/stores/layout';
import { Progress } from '@/components/ui/Progres';
import { getLearningStats, getWordsForStudy, updateWordProgress } from '@/shared/api/stude';

export function StudyPage() {
  const [words, setWords] = createSignal<FlashcardWord[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [showAnswer, setShowAnswer] = createSignal(false);
  const [stats, setStats] = createSignal<LearningStats | null>(null);
  const [sessionStats, setSessionStats] = createSignal({ correct: 0, wrong: 0 });
  const [loading, setLoading] = createSignal(true);

	useHeader('Изучение', '0 слов ·	0 выучено');

  const loadData = async () => {
    setLoading(true);
    try {
      const [wordsResult, statsResult] = await Promise.all([
				getWordsForStudy(20),
				getLearningStats(),
      ]);
      setWords(wordsResult);
      setStats(statsResult);
			setLayoutStore("headerDescription", `${stats()?.total_words || 0} слов · ${stats()?.words_learned || 0} выучено`);
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
    if (!word) return;

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
					when={!loading()}
					fallback={
						<div class='w-8 h-8 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin' />
					}
				>
					<Show
						when={words().length > 0}
						fallback={
							<Card class='text-center max-w-sm'>
								<CardContent class='p-8'>
									<div class='flex justify-center mb-4 text-neutral-500'>
										<Zap size={48} />
									</div>
									<h2 class='text-lg font-semibold  mb-2'>Отлично!</h2>
									<p class='text-neutral-400 mb-6'>Нет слов для повторения</p>
									<Button onClick={restartSession} class='gap-1.5'>
										<RefreshCcw size={16} />
										Обновить
									</Button>
								</CardContent>
							</Card>
						}
					>
						<Show
							when={!isComplete()}
							fallback={
								<Card class='text-center max-w-sm'>
									<CardContent class='p-8'>
										<div class='flex justify-center mb-4 text-amber-400'>
											<Zap size={48} />
										</div>
										<h2 class='text-lg font-semibold  mb-2'>
											Сессия завершена
										</h2>
										<div class='flex gap-4 justify-center mb-4'>
											<div class='text-center'>
												<div class='text-2xl font-bold text-green-400'>
													{sessionStats().correct}
												</div>
												<div class='text-xs text-neutral-500'>Правильно</div>
											</div>
											<div class='text-center'>
												<div class='text-2xl font-bold text-red-400'>
													{sessionStats().wrong}
												</div>
												<div class='text-xs text-neutral-500'>Ошибок</div>
											</div>
										</div>
										<Button onClick={restartSession} class='w-full gap-1.5'>
											<RefreshCcw size={16} />
											Начать заново
										</Button>
									</CardContent>
								</Card>
							}
						>
							<div class='w-full max-w-md'>
								<Card
									class='cursor-pointer min-h-70 flex flex-col justify-center'
									onClick={() => setShowAnswer(!showAnswer())}
								>
									<CardContent class='p-8 text-center'>
										<div class='text-xs text-neutral-500 uppercase tracking-wide mb-4'>
											{showAnswer() ? 'Перевод' : 'Как переводится?'}
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
												Нажмите для ответа
											</div>
										</Show>
									</CardContent>
								</Card>

								<Show when={showAnswer()}>
									<div class='flex gap-3 mt-4'>
										<Button
											variant='outline'
											class='flex-1 border-red-800 text-red-400 hover:bg-red-950 gap-1.5'
											onClick={() => handleAnswer(false)}
										>
											<X size={16} />
											Не знал
										</Button>
										<Button
											variant='secondary'
											class='flex-1 gap-1.5'
											onClick={() => handleAnswer(true)}
										>
											<Check size={16} />
											Знал
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
