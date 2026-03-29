import { createSignal, For, Show, onMount } from 'solid-js';
import type { SavedWord } from '../shared/types/storage';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { BookMarked, Trash, X } from 'lucide-solid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useHeader } from '@/shared/hooks/useHeader';
import { setLayoutStore } from '@/shared/stores/layout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Alert } from '@/components/dialog/Alert';
import { BottomPadding } from '@/components/layout/BottomPadding';
import { Translate } from '@/widget/translate/Translate';
import { getAllWords } from '@/shared/api/stude';

export function DictionaryPage() {
  const [words, setWords] = createSignal<SavedWord[]>([]);
  const [search, setSearch] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [selectedWord, setSelectedWord] = createSignal<SavedWord | null>(null);
	const [open, setOpen] = createSignal(false);
  
  useHeader('Словарь', 'Словарь пуст');

  const loadWords = async () => {
    setLoading(true);
    try {
      const result = await getAllWords();
      setWords(result);
      setLayoutStore('headerDescription', `${words().length} слово`);
    } catch (e) {
      console.error('Failed to load words:', e);
    }
    setLoading(false);
  };

  onMount(() => {
		loadWords();
	});

  const filteredWords = () => {
    const s = search().toLowerCase();
    if (!s) return words();
    return words().filter(w => 
      w.word.toLowerCase().includes(s) || 
      w.translation.toLowerCase().includes(s)
    );
  };

  const deleteWord = async (id: number) => {
    try {
      await deleteWord(id);
      setWords(words().filter(w => w.id !== id));
      setLayoutStore('headerDescription', `${words().length} слов`);
      setSelectedWord(null);
    } catch (e) {
      console.error('Failed to delete word:', e);
    }
  };

  const getMasteryBadge = (level: number) => {
    if (level >= 5) return { label: 'Выучено', variant: 'default' as const };
    if (level >= 3) return { label: 'Хорошо', variant: 'secondary' as const };
    if (level >= 1) return { label: 'Изучается', variant: 'outline' as const };
    return { label: 'Новое', variant: 'outline' as const };
  };

  return (
		<div class='h-full flex flex-col gap-2 '>
			<Translate />

			<Input
				placeholder='Поиск...'
				value={search()}
				onInput={e => setSearch(e.currentTarget.value)}
				class='h-10! max-h-max'
			/>

			<div class='flex-1'>
				<Show
					when={!loading()}
					fallback={
						<div class='flex items-center justify-center h-32'>
							<div class='w-6 h-6 border-2 border-border border-t-transparent rounded-full animate-spin' />
						</div>
					}
				>
					<Show
						when={filteredWords().length > 0}
						fallback={
							<Card class='text-center'>
								<CardContent>
									<div class='flex justify-center mb-3 text-neutral-600'>
										<BookMarked size={48} />
									</div>
									<p class='text-neutral-400'>Словарь пуст</p>
									<p class='text-neutral-500 text-sm mt-1'>
										Добавляйте слова через переводчик
									</p>
								</CardContent>
							</Card>
						}
					>
						<div class='space-y-2'>
							<For each={filteredWords()}>
								{word => {
									const badge = getMasteryBadge(word.mastery_level);
									return (
										<Card
											class='cursor-pointer transition-colors'
											onClick={() => {
												setSelectedWord(word);
												setOpen(true);
											}}
										>
											<CardContent>
												<div class='flex items-center justify-between '>
													<div class='min-w-0'>
														<div class='font-medium  truncate'>{word.word}</div>
														<div class='text-sm text-neutral-400 truncate'>
															{word.translation}
														</div>
													</div>
													<Badge variant={badge.variant}>{badge.label}</Badge>
												</div>
											</CardContent>
										</Card>
									);
								}}
							</For>
						</div>
					</Show>
				</Show>
			</div>
			<BottomPadding />

			<Dialog
				open={open()}
				onOpenChange={isOpen => {
					setOpen(isOpen);
					if (!isOpen) {
						setSelectedWord(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{selectedWord()!.word}</DialogTitle>
						<DialogDescription>{selectedWord()!.translation}</DialogDescription>
					</DialogHeader>
					<div class='grid grid-cols-3 gap-2 mb-4'>
						<div class='bg-secondary rounded-md p-3 text-center'>
							<div class='text-lg font-semibold'>
								{selectedWord()!.review_count}
							</div>
							<div class='text-xs text-neutral-500'>Повторений</div>
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
							<div class='text-xs text-neutral-500'>Точность</div>
						</div>
						<div class='bg-secondary rounded-md p-3 text-center'>
							<div class='text-lg font-semibold'>
								{selectedWord()!.mastery_level}/5
							</div>
							<div class='text-xs text-neutral-500'>Уровень</div>
						</div>
						<Show when={selectedWord()?.screenshot_path}>
							{path => <img src={path()} alt='' />}
						</Show>
					</div>
					<DialogFooter>
						<Alert
							onConfirm={() => {
								const word = selectedWord();
								if (!word) return;

								deleteWord(word.id);
								setOpen(false);
							}}
							title='Вы уверены?'
						>
							<Button variant='destructive' class='gap-1.5'>
								<Trash size={16} />
								Удалить
							</Button>
						</Alert>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
