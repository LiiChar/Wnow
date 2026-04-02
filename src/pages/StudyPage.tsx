import { Check, ChevronLeft, ChevronRight, RefreshCcw, RotateCcw, Sparkles, X, Zap } from 'lucide-solid';
import { createEffect, createSignal, For, Show } from 'solid-js';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progres';
import { getLearningStats, getWordsForStudy, updateWordProgress } from '@/shared/api/stude';
import { useHeader } from '@/shared/hooks/useHeader';
import { useLocale } from '@/shared/lib/locale.tsx';
import { cn } from '@/shared/lib/utils';
import { setLayoutStore } from '@/shared/stores/layout';

import type { FlashcardWord, LearningStats } from '../shared/types/storage';

type QualityLevel = 1 | 3 | 5;

interface SessionStats {
  bestStreak: number;
  correct: number;
  streak: number;
  timeSpent: number;
  wrong: number;
}

export const StudyPage = () => {
  const [words, setWords] = createSignal<FlashcardWord[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [showAnswer, setShowAnswer] = createSignal(false);
  const [stats, setStats] = createSignal<LearningStats | null>(null);
  const [sessionStats, setSessionStats] = createSignal<SessionStats>({
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    timeSpent: 0,
  });
  const [loading, setLoading] = createSignal(true);
  const [startTime, setStartTime] = createSignal<number>(Date.now());
  const [selectedQuality, setSelectedQuality] = createSignal<QualityLevel | null>(null);
	const { t } = useLocale();

	useHeader(t().study.title, '');

  const loadData = async () => {
    setLoading(true);
    setStartTime(Date.now());
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

  // Таймер сессии
  createEffect(() => {
    const timer = setInterval(() => {
      setSessionStats(prev => ({ ...prev, timeSpent: Math.floor((Date.now() - startTime()) / 1000) }));
    }, 1000);
    return () => clearInterval(timer);
  });

  const currentWord = () => words()[currentIndex()];
  const isComplete = () => currentIndex() >= words().length;
  const hasWords = () => words().length > 0;

  const handleAnswer = async (quality: QualityLevel) => {
    const word = currentWord();
    setSelectedQuality(quality);

    try {
			await updateWordProgress(word.id, quality);
    } catch (e) {
      console.error('Failed to update progress:', e);
    }

    const isCorrect = quality >= 3;
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
      timeSpent: prev.timeSpent,
    }));

    setShowAnswer(false);
    setTimeout(() => {
      setSelectedQuality(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setSessionStats({ correct: 0, wrong: 0, streak: 0, bestStreak: 0, timeSpent: 0 });
    loadData();
  };

  const skipCard = () => {
    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  const progress = () => (currentIndex() / Math.max(words().length, 1)) * 100;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const accuracy = () => {
    const total = sessionStats().correct + sessionStats().wrong;
    if (total === 0) return 0;
    return Math.round((sessionStats().correct / total) * 100);
  };

  // Клавиатурные сокращения
  const handleKeyDown = (e: KeyboardEvent) => {
    if (loading() || !hasWords() || isComplete()) return;
    
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!showAnswer()) {
        setShowAnswer(true);
      }
    } else if (showAnswer()) {
      if (e.key === '1') handleAnswer(1);
      if (e.key === '3') handleAnswer(3);
      if (e.key === '5') handleAnswer(5);
      if (e.key === 'ArrowLeft') handleAnswer(1);
      if (e.key === 'ArrowRight') handleAnswer(5);
    }
  };

  createEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  return (
		<div class='h-full flex flex-col'>
			{/* Progress bar */}
			<Progress class='h-1' value={progress()} />

      {/* Header с прогрессом */}
      <div class='flex items-center justify-between py-2 border-b border-border'>
        <div class='text-sm text-muted-foreground'>
          {currentIndex() + 1} / {words().length}
        </div>
        <div class='flex items-center gap-4 text-xs text-muted-foreground'>
          <div class='flex items-center gap-1'>
            <span>Серия: <span class='font-semibold text-foreground'>{sessionStats().streak}</span></span>
          </div>
          <div class='flex items-center gap-1'>
            <span>Время: <span class='font-semibold text-foreground'>{formatTime(sessionStats().timeSpent)}</span></span>
          </div>
        </div>
      </div>

			<div class=' flex justify-center p-4 px-2 '>
				<Show
					fallback={
						<div class='w-8 h-8 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin' />
					}
					when={!loading()}
				>
					<Show
						fallback={
							<Card class='text-center max-w-sm'>
								<CardHeader>
									<div class='flex justify-center mb-2 text-neutral-500'>
										<Zap size={48} />
									</div>
									<CardTitle>{t().study.noWordsTitle}</CardTitle>
									<CardDescription>{t().study.noWordsDescription}</CardDescription>
								</CardHeader>
								<CardContent>
									<Button class='w-full gap-1.5' onClick={restartSession}>
										<RefreshCcw size={16} />
										{t().study.refresh}
									</Button>
								</CardContent>
							</Card>
						}
						when={hasWords()}
					>
						<Show
							fallback={
								<Card class='text-center max-w-md'>
									<CardHeader>
										<div class='flex justify-center mb-2 text-amber-400'>
											<Sparkles size={48} />
										</div>
										<CardTitle>{t().study.sessionComplete}</CardTitle>
										<CardDescription>
											Отличная работа! Вот ваша статистика:
										</CardDescription>
									</CardHeader>
									<CardContent>
                    <div class='grid grid-cols-3 gap-1 mb-1'>
                      <div class='bg-green-500/10 rounded-lg p-1 text-center'>
                        <div class='text-2xl font-bold text-green-500'>
                          {sessionStats().correct}
                        </div>
                        <div class='text-xs text-muted-foreground'>Верно</div>
                      </div>
                      <div class='bg-red-500/10 rounded-lg p-1 text-center'>
                        <div class='text-2xl font-bold text-red-500'>
                          {sessionStats().wrong}
                        </div>
                        <div class='text-xs text-muted-foreground'>Ошибок</div>
                      </div>
                      <div class='bg-amber-500/10 rounded-lg p-1 text-center'>
                        <div class='text-2xl font-bold text-amber-500'>
                          {accuracy()}%
                        </div>
                        <div class='text-xs text-muted-foreground'>Точность</div>
                      </div>
                    </div>
                    <div class='flex gap-1 mb-2'>
                      <div class='flex-1 bg-secondary rounded-lg p-1 text-center'>
                        <div class='text-lg font-semibold text-amber-400'>
                          {sessionStats().bestStreak}
                        </div>
                        <div class='text-xs text-muted-foreground'>Лучшая серия</div>
                      </div>
                      <div class='flex-1 bg-secondary rounded-lg p-1 text-center'>
                        <div class='text-lg font-semibold text-blue-400'>
                          {formatTime(sessionStats().timeSpent)}
                        </div>
                        <div class='text-xs text-muted-foreground'>Время</div>
                      </div>
                    </div>
										<Button class='w-full gap-1.5' onClick={restartSession}>
											<RotateCcw size={16} />
											{t().study.restart}
										</Button>
									</CardContent>
								</Card>
							}
							when={!isComplete()}
						>
							<div class='w-full max-w-2xl'>
                {/* Карточка слова */}
								<Card
									class={cn(
                    'cursor-pointer  transition-all duration-300',
                    selectedQuality() === 5 && 'ring-2 ring-green-500',
                    selectedQuality() === 3 && 'ring-2 ring-blue-500',
                    selectedQuality() === 1 && 'ring-2 ring-red-500',
                  )}
									onClick={() => !showAnswer() && setShowAnswer(true)}
								>
									<CardContent class='p-4 text-center'>
										<Show
											fallback={
                        <>
                          <div class='text-xs text-muted-foreground uppercase tracking-wide mb-2'>
                            Слово
                          </div>
                          <div class='text-3xl font-semibold mb-4'>
                            {currentWord()?.word}
                          </div>
                          <Show when={currentWord()?.context}>
                            <div class='bg-muted/50 rounded-lg p-4 mt-4'>
                              <div class='text-sm text-muted-foreground italic'>
                                "{currentWord()?.context}"
                              </div>
                            </div>
                          </Show>
                          <div class='text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1'>
                            <span>Нажмите</span>
                            <kbd class='px-2 py-0.5 bg-secondary rounded text-xs'>Пробел</kbd>
                            <span>или кликните</span>
                          </div>
                        </>
											}
											when={showAnswer()}
										>
											<>
                        <div class='text-xs text-muted-foreground uppercase tracking-wide mb-2'>
                          Перевод
                        </div>
                        <div class='text-3xl font-semibold text-primary mb-2'>
                          {currentWord()?.translation}
                        </div>
                        <Show when={currentWord()?.context}>
                          <div class='bg-muted/50 rounded-lg p-4 mt-4'>
                            <div class='text-sm text-muted-foreground'>
                              {currentWord()?.context}
                            </div>
                          </div>
                        </Show>
                      </>
										</Show>
									</CardContent>
								</Card>

                {/* Кнопки оценки */}
								<Show when={showAnswer()}>
									<div class='grid grid-cols-3 gap-2 mt-4'>
										<Button
											class={cn(
                        'gap-1.5 transition-all',
                        selectedQuality() === 1 && 'bg-red-500 text-white',
                      )}
											variant='outline'
											onClick={() => handleAnswer(1)}
										>
											<X size={16} />
											<div class='flex flex-col items-center leading-none'>
												<span>Трудно</span>
											</div>
										</Button>
										<Button
											class={cn(
                        'gap-1.5 transition-all',
                        selectedQuality() === 3 && 'bg-blue-500 text-white',
                      )}
											variant='outline'
											onClick={() => handleAnswer(3)}
										>
											<Check size={16} />
											<div class='flex flex-col items-center leading-none'>
												<span>Нормально</span>
											</div>
										</Button>
										<Button
											class={cn(
                        'gap-1.5 transition-all',
                        selectedQuality() === 5 && 'bg-green-500 text-white',
                      )}
											variant='outline'
											onClick={() => handleAnswer(5)}
										>
											<Sparkles size={16} />
											<div class='flex flex-col items-center leading-none'>
												<span>Легко</span>
											</div>
										</Button>
									</div>
								</Show>

                {/* Кнопка пропуска */}
                <Show when={!showAnswer() && words().length > 1}>
                  <div class='flex justify-center mt-2'>
                    <Button
                      class='gap-1.5 text-muted-foreground'
                      size='sm'
                      variant='ghost'
                      onClick={skipCard}
                    >
                      <ChevronRight size={16} />
                      Пропустить
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
