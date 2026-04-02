import { BookMarked, Search, Trash, X } from 'lucide-solid';
import { createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js';

import { Alert } from '@/components/dialog/Alert';
import { BottomPadding } from '@/components/layout/BottomPadding';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { showNotification } from '@/shared/api/notification';
import { deleteWord, getAllWords } from '@/shared/api/stude';
import { useDebounceCallback } from '@/shared/hooks/useDebounceCallback';
import { useHeader } from '@/shared/hooks/useHeader';
import { useLocale } from '@/shared/lib/locale.tsx';
import { cn } from '@/shared/lib/utils';
import { setLayoutStore } from '@/shared/stores/layout';
import { Translate } from '@/widget/translate/Translate';

import type { SavedWord } from '../shared/types/storage';

export const DictionaryPage = () => {
  const [words, setWords] = createSignal<SavedWord[]>([]);
  const [search, setSearch] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [selectedWord, setSelectedWord] = createSignal<SavedWord | null>(null);
	const [open, setOpen] = createSignal(false);
	const { t } = useLocale();

  useHeader(t().dictionary.title, t().dictionary.emptyDescription);

  const loadWords = async () => {
    setLoading(true);
    try {
      const result = await getAllWords();
      setWords(result);
      setLayoutStore('headerDescription', t().dictionary.wordCountHeader(result.length));
    } catch (e) {
      console.error('Failed to load words:', e);
    }
    setLoading(false);
  };

  onMount(() => {
		loadWords();
	});

  // Debounced поиск
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  
  const debouncedSetSearch = useDebounceCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  createEffect(() => {
    const value = search();
    debouncedSetSearch(value);
  });

  // Мемо для фильтрации и сортировки
  const filteredWords = createMemo(() => {
    const s = debouncedSearch().toLowerCase().trim();
    if (!s) return words().filter(w => w.word.trim()); // Фильтруем пустые слова
    return words()
      .filter(w =>
        w.word.trim() && // Исключаем пустые слова
        (w.word.toLowerCase().includes(s) ||
        w.translation.toLowerCase().includes(s) ||
        w.context.toLowerCase().includes(s))
      )
      .sort((a, b) => {
        // Сортировка: точное совпадение > начало слова > содержит
        const aWordStart = a.word.toLowerCase().startsWith(s);
        const bWordStart = b.word.toLowerCase().startsWith(s);
        const aWordExact = a.word.toLowerCase() === s;
        const bWordExact = b.word.toLowerCase() === s;

        if (aWordExact) return -1;
        if (bWordExact) return 1;
        if (aWordStart && !bWordStart) return -1;
        if (bWordStart && !aWordStart) return 1;
        return 0;
      });
  });

  const deleteWordAction = async (id: number) => {
    try {
      await deleteWord(id);
      setWords(words().filter(w => w.id !== id));
      setLayoutStore('headerDescription', t().dictionary.wordCountHeader(words().length - 1));
      setSelectedWord(null);
    } catch (e) {
      console.error('Failed to delete word:', e);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
  };

  // Подсветка совпадений в тексте
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark class='bg-primary/20 text-primary font-medium rounded'>{part}</mark>
      ) : (
        part
      )
    );
  };

  const getMasteryBadge = (level: number) => {
    if (level >= 5) return { label: t().dictionary.masteryLearned, variant: 'default' as const };
    if (level >= 3) return { label: t().dictionary.masteryGood, variant: 'secondary' as const };
    if (level >= 1) return { label: t().dictionary.masteryLearning, variant: 'outline' as const };
    return { label: t().dictionary.masteryNew, variant: 'outline' as const };
  };

  return (
		<div class='h-full flex flex-col gap-2'>
			<Translate />

			{/* Поисковая панель - sticky */}
			<div class='sticky top-0 z-10'>
					<div class='relative group'>
						<Search class='absolute left-3 top-1/2 z-20 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary' />
						<Input
							class={cn(
								'h-11! pl-9 pr-10 backdrop-blur-lg bg-secondary/50 border-border/50 transition-all duration-200 shadow-sm',
								'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-background',
								'hover:border-border hover:bg-secondary',
								search() && 'border-primary bg-background'
							)}
							placeholder={t().dictionary.searchPlaceholder}
							value={search()}
							onInput={e => setSearch(e.currentTarget.value)}
						/>
						<Show when={search()}>
							<Button
								class='absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors'
								size='sm'
								title='Очистить поиск'
								variant='ghost'
								onClick={clearSearch}
							>
								<X class='h-3.5 w-3.5' />
							</Button>
						</Show>
					</div>
					
					{/* Индикатор количества результатов */}
					<Show when={debouncedSearch()}>
						<div class='flex items-center justify-between mt-1.5 mb-2 px-1'>
							<div class='text-xs text-muted-foreground font-medium'>
								Найдено: <span class='text-primary'>{filteredWords().length}</span> из {words().length}
							</div>
							<Show when={filteredWords().length === 0}>
								<span class='text-xs text-destructive'>Нет совпадений</span>
							</Show>
						</div>
					</Show>
			</div>

			{/* Список слов */}
				<Show
					fallback={
						<div class='flex items-center justify-center h-32'>
							<div class='w-6 h-6 border-2 border-border border-t-transparent rounded-full animate-spin' />
						</div>
					}
					when={!loading()}
				>
					<Show
						fallback={
							<Card class='text-center'>
								<CardContent>
									<div class='flex justify-center mb-3 text-neutral-600'>
										<BookMarked size={48} />
									</div>
									<p class='text-neutral-400'>{t().dictionary.emptyTitle}</p>
									<p class='text-neutral-500 text-sm mt-1'>
										{t().dictionary.emptyDescription}
									</p>
								</CardContent>
							</Card>
						}
						when={filteredWords().length > 0}
					>
						<div class='space-y-2 h-full'>
							<For each={filteredWords()}>
								{word => {
									const badge = getMasteryBadge(word.mastery_level);
									return (
										<Card
											class='cursor-pointer transition hover:bg-secondary/50 hover:scale-[0.998] focus:scale-[0.995] group'
											onClick={() => {
												setSelectedWord(word);
												setOpen(true);
											}}
										>
											<CardContent>
												<div class='flex items-center justify-between gap-2'>
													<div class='min-w-0 flex-1'>
														<div class='font-medium truncate flex items-center'>
															{highlightMatch(word.word, debouncedSearch())}
														</div>
														<div class='text-sm text-muted-foreground truncate'>
															{highlightMatch(word.translation, debouncedSearch())}
														</div>
														<Show when={word.context && debouncedSearch()}>
															<div class='text-xs text-muted-foreground/70 truncate mt-0.5'>
																{highlightMatch(word.context, debouncedSearch())}
															</div>
														</Show>
													</div>
													<div class='flex items-center gap-2 shrink-0'>
														<Badge
															class='opacity-70 group-hover:opacity-100 transition-opacity'
															variant={badge.variant}
														>
															{badge.label}
														</Badge>
													</div>
												</div>
											</CardContent>
										</Card>
									);
								}}
							</For>
						</div>
					</Show>
					
					{/* Показываем, если поиск не дал результатов */}
					<Show when={!loading() && search() && filteredWords().length === 0}>
						<Card class='text-center my-4'>
							<CardContent>
								<div class='flex justify-center mb-3 text-neutral-600'>
									<Search size={48} />
								</div>
								<p class='text-neutral-400 font-medium'>Ничего не найдено</p>
								<p class='text-neutral-500 text-sm mt-1'>
									Попробуйте изменить поисковый запрос
								</p>
							</CardContent>
						</Card>
					</Show>
				</Show>

			<Show when={filteredWords().length > 0 || loading()}>
				<BottomPadding/>
			</Show>

			<Dialog
				open={open()}
				onOpenChange={isOpen => {
					setOpen(isOpen);
					if (!isOpen) {
						setSelectedWord(null);
					}
				}}
			>
				<DialogContent class='max-w-md'>
					<DialogHeader>
						<DialogTitle class='text-xl break-words'>{selectedWord()!.word}</DialogTitle>
						<DialogDescription class='text-base'>
							{selectedWord()!.translation}
						</DialogDescription>
					</DialogHeader>
					<div class='grid grid-cols-3 gap-2 mb-4'>
						<div class='bg-secondary rounded-md p-3 text-center'>
							<div class='text-lg font-semibold'>
								{selectedWord()!.review_count}
							</div>
							<div class='text-xs text-muted-foreground'>{t().dictionary.reviews}</div>
						</div>
						<div class='bg-secondary rounded-md p-3 text-center'>
							<div class='text-lg font-semibold'>
								{selectedWord()!.review_count > 0
									? Math.round(
											(selectedWord()!.correct_count /
												selectedWord()!.review_count) *
												100,
										)
									: 0}
								%
							</div>
							<div class='text-xs text-muted-foreground'>{t().dictionary.accuracy}</div>
						</div>
						<div class='bg-secondary rounded-md p-3 text-center'>
							<div class='text-lg font-semibold'>
								{selectedWord()!.mastery_level}/5
							</div>
							<div class='text-xs text-muted-foreground'>{t().dictionary.level}</div>
						</div>
						<Show when={selectedWord()?.screenshot_path}>
							{path => (
								<div class='col-span-3 mt-2'>
									<img
										alt='Контекст'
										class='rounded-lg max-h-48 w-auto object-contain'
										src={path()}
									/>
								</div>
							)}
						</Show>
					</div>
					<Show when={selectedWord()?.context}>
						<div class='mb-4 p-3 bg-muted rounded-lg'>
							<div class='text-xs font-medium text-muted-foreground mb-1'>Контекст</div>
							<div class='text-sm'>{selectedWord()!.context}</div>
							<Show when={selectedWord()?.context_translation}>
								<div class='text-sm text-muted-foreground mt-1'>
									{selectedWord()!.context_translation}
								</div>
							</Show>
						</div>
					</Show>
					<DialogFooter class='flex justify-between items-center'>
						<Button
							class='gap-1.5'
							variant='destructive'
							onClick={() => {
								const word = selectedWord();
								if (!word) return;
								deleteWordAction(word.id);
								setOpen(false);
							}}
						>
							<Trash size={16} />
							{t().dictionary.deleteConfirmButton}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
