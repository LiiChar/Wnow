import { createSignal, createEffect, For, Show } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { Button, Card, CardContent, Input, Badge } from '../component/ui';
import { IconDictionary, IconTrash, IconClose } from '../component/Icons';
import type { SavedWord } from '../shared/types/storage';

export function DictionaryPage() {
  const [words, setWords] = createSignal<SavedWord[]>([]);
  const [search, setSearch] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [selectedWord, setSelectedWord] = createSignal<SavedWord | null>(null);

  const loadWords = async () => {
    setLoading(true);
    try {
      const result = await invoke<SavedWord[]>('get_all_words');
      setWords(result);
    } catch (e) {
      console.error('Failed to load words:', e);
    }
    setLoading(false);
  };

  createEffect(() => { loadWords(); });

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
      await invoke('delete_word', { wordId: id });
      setWords(words().filter(w => w.id !== id));
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
    <div class="h-full flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-neutral-100">Словарь</h1>
          <p class="text-sm text-neutral-500">{words().length} слов</p>
        </div>
      </div>

      <Input
        placeholder="Поиск..."
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />

      <div class="flex-1 overflow-y-auto">
        <Show when={!loading()} fallback={
          <div class="flex items-center justify-center h-32">
            <div class="w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Show when={filteredWords().length > 0} fallback={
            <Card class="text-center py-12">
              <CardContent>
                <div class="flex justify-center mb-3 text-neutral-600">
                  <IconDictionary size={48} />
                </div>
                <p class="text-neutral-400">Словарь пуст</p>
                <p class="text-neutral-500 text-sm mt-1">Добавляйте слова через переводчик</p>
              </CardContent>
            </Card>
          }>
            <div class="space-y-2">
              <For each={filteredWords()}>
                {(word) => {
                  const badge = getMasteryBadge(word.mastery_level);
                  return (
                    <Card 
                      class="cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      onClick={() => setSelectedWord(word)}
                    >
                      <CardContent class="p-4">
                        <div class="flex items-center justify-between">
                          <div class="min-w-0">
                            <div class="font-medium text-neutral-100 truncate">{word.word}</div>
                            <div class="text-sm text-neutral-400 truncate">{word.translation}</div>
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

      {/* Modal */}
      <Show when={selectedWord()}>
        <div 
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWord(null)}
        >
          <Card class="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent class="p-6">
              <h2 class="text-xl font-semibold text-neutral-100 mb-1">{selectedWord()!.word}</h2>
              <p class="text-neutral-400 mb-4">{selectedWord()!.translation}</p>

              <Show when={selectedWord()!.context}>
                <div class="bg-neutral-800 rounded-md p-3 mb-4">
                  <p class="text-xs text-neutral-500 mb-1">{selectedWord()!.context}</p>
                  <p class="text-sm text-neutral-300">{selectedWord()!.context_translation}</p>
                </div>
              </Show>

              <div class="grid grid-cols-3 gap-2 mb-4">
                <div class="bg-neutral-800 rounded-md p-3 text-center">
                  <div class="text-lg font-semibold text-neutral-100">{selectedWord()!.review_count}</div>
                  <div class="text-xs text-neutral-500">Повторений</div>
                </div>
                <div class="bg-neutral-800 rounded-md p-3 text-center">
                  <div class="text-lg font-semibold text-neutral-100">
                    {selectedWord()!.review_count > 0 
                      ? Math.round(selectedWord()!.correct_count / selectedWord()!.review_count * 100) 
                      : 0}%
                  </div>
                  <div class="text-xs text-neutral-500">Точность</div>
                </div>
                <div class="bg-neutral-800 rounded-md p-3 text-center">
                  <div class="text-lg font-semibold text-neutral-100">{selectedWord()!.mastery_level}/5</div>
                  <div class="text-xs text-neutral-500">Уровень</div>
                </div>
              </div>

              <div class="flex gap-2">
                <Button variant="secondary" class="flex-1 gap-1.5" onClick={() => setSelectedWord(null)}>
                  <IconClose size={16} />
                  Закрыть
                </Button>
                <Button variant="destructive" class="gap-1.5" onClick={() => deleteWord(selectedWord()!.id)}>
                  <IconTrash size={16} />
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Show>
    </div>
  );
}
