import { Show, createSignal, createEffect } from "solid-js";
import { showToast } from "./Toast";
import { IconPlus, IconCopy, IconCheck, IconExpand, IconCollapse } from "./Icons";

export type WordTranslation = {
  word: string;
  translation: string;
  context: string;
  context_translation: string;
  popup_x: number;
  popup_y: number;
  word_x: number;
  word_y: number;
  word_w: number;
  word_h: number;
};

export type PopupMode = 'compact' | 'full';

type WordPopupProps = {
  data: WordTranslation | null;
  onClose: () => void;
  onAddToStudy?: (word: string) => void;
  defaultMode?: PopupMode;
};

export function WordPopup(props: WordPopupProps) {
  const padding = 2;
  const gap = 24;
  
  const [addedToDict, setAddedToDict] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [mode, setMode] = createSignal<PopupMode>(props.defaultMode || 'compact');
  
  // Ширина зависит от режима
  const cardWidth = () => mode() === 'compact' ? 200 : 320;
  
  // Сбрасываем состояния при смене слова
  createEffect(() => {
    if (props.data?.word) {
      setAddedToDict(false);
      setCopied(false);
    }
  });

  // Примерная высота для расчёта позиции (реальная будет auto)
  const getEstimatedHeight = () => {
    if (!props.data) return mode() === 'compact' ? 80 : 160;
    if (mode() === 'compact') return 80;
    const translationLength = (props.data.translation?.length || 0);
    const hasContext = !!props.data.context_translation;
    let height = 120 + Math.ceil(translationLength / 35) * 20;
    if (hasContext) height += 60;
    return Math.min(Math.max(height, 160), 400);
  };
  
  // Проверяем, это перевод выделенного текста (фейковые координаты слова)
  const isClipboardTranslation = () => {
    if (!props.data) return false;
    // Если word_w === 100 и word_h === 20 - это фейковые координаты от translate_selected_text
    return props.data.word_w === 100 && props.data.word_h === 20;
  };

  const getPosition = () => {
    if (!props.data) return { left: 0, top: 0 };
    const margin = 20;
    const estimatedHeight = getEstimatedHeight();
    const width = cardWidth();
    
    // Горизонтальное позиционирование
    let left = props.data.popup_x - width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    
    // Для перевода выделенного текста - центрируем на экране
    if (isClipboardTranslation()) {
      const top = Math.max(margin, (window.innerHeight - estimatedHeight) / 2);
      return { left: (window.innerWidth - width) / 2, top };
    }
    
    // Вертикальное позиционирование - предпочитаем над словом
    let top = props.data.word_y - padding - gap - estimatedHeight;
    
    // Если не помещается сверху, показываем снизу
    if (top < margin) {
      top = props.data.word_y + props.data.word_h + padding + gap;
    }
    
    // Проверяем, что не выходит за нижнюю границу
    if (top + estimatedHeight > window.innerHeight - margin) {
      top = window.innerHeight - estimatedHeight - margin;
    }
    
    // Последняя проверка - минимум от верха
    top = Math.max(margin, top);
    
    return { left, top };
  };

  const getLinePoints = () => {
    if (!props.data || isClipboardTranslation()) return null;
    const pos = getPosition();
    const estimatedHeight = getEstimatedHeight();
    const width = cardWidth();
    
    const wordCenterX = props.data.word_x + props.data.word_w / 2;
    const cardCenterX = pos.left + width / 2;
    
    const isAbove = pos.top + estimatedHeight < props.data.word_y;
    
    return {
      x1: wordCenterX,
      y1: isAbove ? props.data.word_y - padding : props.data.word_y + props.data.word_h + padding,
      x2: cardCenterX,
      y2: isAbove ? pos.top + estimatedHeight : pos.top,
    };
  };

  return (
    <Show when={props.data}>
      {(data) => (
        <>
          {/* Word highlight - только для OCR, не для clipboard */}
          <Show when={!isClipboardTranslation()}>
            <div
              class="fixed pointer-events-none z-40 rounded border-2 border-neutral-400 bg-neutral-400/10"
              style={{
                left: `${data().word_x - padding}px`,
                top: `${data().word_y - padding}px`,
                width: `${data().word_w + padding * 2}px`,
                height: `${data().word_h + padding * 2}px`,
              }}
            />

            {/* Connector line */}
            <Show when={getLinePoints()}>
              {(line) => (
                <svg class="fixed inset-0 pointer-events-none z-40" style={{ width: "100vw", height: "100vh" }}>
                  <line
                    x1={line().x1}
                    y1={line().y1}
                    x2={line().x2}
                    y2={line().y2}
                    stroke="rgb(163, 163, 163)"
                    stroke-width="1.5"
                    stroke-dasharray="4 2"
                  />
                </svg>
              )}
            </Show>
          </Show>

          {/* Card */}
          <div
            class="fixed z-50 animate-fade-in animate-scale-in"
            style={{ left: `${getPosition().left}px`, top: `${getPosition().top}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              class="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden"
              style={{ width: `${cardWidth()}px` }}
            >
              <Show when={data().word} fallback={
                <div class="p-1 text-center text-neutral-500 text-xs">
                  Текст не найден
                </div>
              }>
                {/* Compact Mode */}
                <Show when={mode() === 'compact'}>
                  <div class="p-1">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="text-xs text-neutral-400 truncate">{data().word}</div>
                        <div class="text-sm text-neutral-100 line-clamp-2 wrap-break-word">{data().translation}</div>
                      </div>
                      <div class="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => {
                            if (!addedToDict()) {
                              props.onAddToStudy?.(data().word);
                              setAddedToDict(true);
                              showToast('Добавлено', 'success');
                            }
                          }}
                          class={`p-1.5 rounded transition-colors ${
                            addedToDict() 
                              ? 'text-emerald-400 bg-emerald-950/30' 
                              : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
                          }`}
                          title="В словарь"
                        >
                          <Show when={addedToDict()} fallback={<IconPlus size={14} />}>
                            <IconCheck size={14} />
                          </Show>
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(data().translation);
                            setCopied(true);
                            showToast('Скопировано', 'success');
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          class={`p-1.5 rounded transition-colors ${
                            copied() 
                              ? 'text-emerald-400 bg-emerald-950/30' 
                              : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
                          }`}
                          title="Копировать"
                        >
                          <Show when={copied()} fallback={<IconCopy size={14} />}>
                            <IconCheck size={14} />
                          </Show>
                        </button>
                        <button
                          onClick={() => setMode('full')}
                          class="p-1.5 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                          title="Развернуть"
                        >
                          <IconExpand size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Full Mode */}
                <Show when={mode() === 'full'}>
                  {/* Header */}
                  <div class="px-4 py-2.5 border-b border-neutral-800 shrink-0 flex items-center justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="text-[10px] text-neutral-500 mb-0.5">Перевод</div>
                      <div class="font-medium text-neutral-100 wrap-break-word line-clamp-2 text-sm">{data().word}</div>
                    </div>
                    <button
                      onClick={() => setMode('compact')}
                      class="p-1.5 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors shrink-0 ml-2"
                      title="Свернуть"
                    >
                      <IconCollapse size={14} />
                    </button>
                  </div>

                  {/* Translation */}
                  <div class="px-4 py-3">
                    <div class="text-neutral-300 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">{data().translation}</div>
                    
                    <Show when={data().context_translation}>
                      <div class="mt-2 pt-2 border-t border-neutral-800">
                        <div class="text-[11px] text-neutral-500 italic wrap-break-word">{data().context_translation}</div>
                      </div>
                    </Show>
                  </div>

                  {/* Actions - иконки только */}
                  <div class="flex border-t border-neutral-800 shrink-0">
                    <button
                      onClick={() => {
                        if (!addedToDict()) {
                          props.onAddToStudy?.(data().word);
                          setAddedToDict(true);
                          showToast('Добавлено в словарь', 'success');
                        }
                      }}
                      class={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs transition-colors ${
                        addedToDict() 
                          ? 'text-emerald-400 bg-emerald-950/30' 
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                      }`}
                      title="Добавить в словарь"
                    >
                      <Show when={addedToDict()} fallback={<IconPlus size={14} />}>
                        <IconCheck size={14} />
                      </Show>
                      <span class="hidden sm:inline">{addedToDict() ? 'Добавлено' : 'В словарь'}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(data().translation);
                        setCopied(true);
                        showToast('Скопировано', 'success');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      class={`flex-1 py-2 flex items-center justify-center gap-1.5 text-xs transition-colors border-l border-neutral-800 ${
                        copied() 
                          ? 'text-emerald-400 bg-emerald-950/30' 
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                      }`}
                      title="Копировать перевод"
                    >
                      <Show when={copied()} fallback={<IconCopy size={14} />}>
                        <IconCheck size={14} />
                      </Show>
                      <span class="hidden sm:inline">{copied() ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </>
      )}
    </Show>
  );
}
