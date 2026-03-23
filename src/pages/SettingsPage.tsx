import { createSignal, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { HotkeyInput } from '../components/HotkeyInput';
import { settings, updateSettings } from '../shared/stores/settings';
import { LANGUAGES } from '../shared/types/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Switch, SwitchControl, SwitchThumb } from '@/components/ui/Switch';
import { Clipboard, Languages, Monitor, MousePointer, MousePointer2 } from 'lucide-solid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useHeader } from '@/shared/hooks/useHeader';

export function SettingsPage() {
  const [translationMode, setTranslationMode] = createSignal<string>('local_first');

	useHeader('Настройки', 'Персонализация приложения');
  
  // Загружаем текущий режим перевода при монтировании
  onMount(async () => {
    try {
      const mode = await invoke<string>('get_current_translation_mode');
      setTranslationMode(mode);
    } catch (e) {
      console.error('Failed to get translation mode:', e);
    }
  });

  const handleTranslationModeChange = async (mode: string) => {
    try {
      await invoke('set_translation_mode', { mode });
      setTranslationMode(mode);
    } catch (e) {
      console.error('Failed to set translation mode:', e);
    }
  };

  const themeOptions = [
    'Тёмная',
    'Светлая',
    'Системная',
  ];

  const startModeOptions = [
    'Приложение (словарь)',
    'Режим перевода'
  ];

  const translationModeOptions = [
    '🔒 Локальный (с онлайн fallback)',
    '🔐 Только офлайн',
    '🌐 Только онлайн',
  ];

  const langOptions = LANGUAGES.map(l => (`${l.flag} ${l.name}`));

  return (
		<div class='h-full flex flex-col gap-4 overflow-y-auto'>
			<Card>
				<CardHeader class='pb-4'>
					<CardTitle class='text-base'>Запуск</CardTitle>
				</CardHeader>
				<CardContent class='space-y-4'>
					<Select
						options={startModeOptions}
						value={settings().start_mode}
						onChange={v =>
							updateSettings({ start_mode: v as 'app' | 'overlay' })
						}
						itemComponent={props => (
							<SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
						)}
					>
						<SelectTrigger>
							<SelectValue<string>>
								{state => state.selectedOption()}
							</SelectValue>
						</SelectTrigger>
						<SelectContent />
					</Select>
					<Switch
						checked={settings().start_minimized}
						onChange={v => updateSettings({ start_minimized: v })}
					>
						<SwitchControl>
							<SwitchThumb />
						</SwitchControl>
					</Switch>
				</CardContent>
			</Card>

			{/* Appearance */}
			<Card>
				<CardHeader class='pb-4'>
					<CardTitle class='text-base'>Внешний вид</CardTitle>
				</CardHeader>
				<CardContent class='space-y-4'>
					<Select
						options={themeOptions}
						value={settings().theme}
						onChange={v =>
							updateSettings({ theme: v as 'light' | 'dark' | 'system' })
						}
					>
						<SelectTrigger>
							<SelectValue<string>>
								{state => state.selectedOption()}
							</SelectValue>
						</SelectTrigger>
						<SelectContent />
					</Select>
				</CardContent>
			</Card>

			{/* Languages */}
			<Card>
				<CardHeader class='pb-4'>
					<CardTitle class='text-base'>Языки</CardTitle>
				</CardHeader>
				<CardContent class='space-y-4'>
					<Select
						options={langOptions}
						value={settings().source_lang}
						onChange={v => updateSettings({ source_lang: v as any })}
					>
						<SelectTrigger>
							<SelectValue<string>>
								{state => state.selectedOption()}
							</SelectValue>
						</SelectTrigger>
						<SelectContent />
					</Select>
					<Select
						options={langOptions}
						value={settings().target_lang}
						onChange={v => updateSettings({ target_lang: v as any })}
					>
						<SelectTrigger>
							<SelectValue<string>>
								{state => state.selectedOption()}
							</SelectValue>
						</SelectTrigger>
						<SelectContent />
					</Select>
				</CardContent>
			</Card>

			{/* Translation Engine */}
			<Card>
				<CardHeader class='pb-4'>
					<CardTitle class='text-base flex items-center gap-2'>
						<Languages size={18} />
						Движок перевода
					</CardTitle>
				</CardHeader>
				<CardContent class='space-y-4'>
					<Select
						options={translationModeOptions}
						value={translationMode()}
						onChange={e => handleTranslationModeChange(e as any)}
					>
						<SelectTrigger>
							<SelectValue<string>>
								{state => state.selectedOption()}
							</SelectValue>
						</SelectTrigger>
						<SelectContent />
					</Select>
					<div class='text-xs text-neutral-500 space-y-1'>
						<p>
							<strong>🔒 Локальный:</strong> Встроенный словарь + онлайн если
							слово не найдено
						</p>
						<p>
							<strong>🔐 Только офлайн:</strong> Только встроенный словарь
							(приватность)
						</p>
						<p>
							<strong>🌐 Только онлайн:</strong> Google Translate (точнее, но
							нужен интернет)
						</p>
					</div>
					<div class='p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg'>
						<div class='text-xs text-emerald-400 font-medium mb-1'>
							💡 Рекомендация
						</div>
						<p class='text-xs text-neutral-400'>
							Режим "Локальный" обеспечивает быстрый перевод частых слов офлайн,
							а для сложных фраз использует онлайн-перевод.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Hotkeys */}
			<Card>
				<CardHeader class='pb-4'>
					<CardTitle class='text-base flex items-center gap-2'>
						Горячие клавиши
						<span class='text-xs font-normal text-neutral-500'>
							Кликните для изменения
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='flex items-start gap-3'>
						<div class='p-2 rounded-lg bg-neutral-800 text-neutral-400'>
							<MousePointer2 size={18} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод слова под курсором'
								value={settings().hotkey_translate_word}
								onChange={v => updateSettings({ hotkey_translate_word: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3'>
						<div class='p-2 rounded-lg bg-neutral-800 text-neutral-400'>
							<MousePointer size={18} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Выделить область'
								value={settings().hotkey_translate_area}
								onChange={v => updateSettings({ hotkey_translate_area: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3'>
						<div class='p-2 rounded-lg bg-neutral-800 text-neutral-400'>
							<Monitor size={18} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Весь экран'
								value={settings().hotkey_translate_screen}
								onChange={v => updateSettings({ hotkey_translate_screen: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3'>
						<div class='p-2 rounded-lg  bg-neutral-800 text-neutral-400'>
							<Clipboard size={18} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод выделенного текста'
								value={settings().hotkey_translate_clipboard}
								onChange={v =>
									updateSettings({ hotkey_translate_clipboard: v })
								}
							/>
						</div>
					</div>

					<p class='text-xs text-neutral-500 mt-2'>
						* Изменения горячих клавиш вступят в силу после перезапуска
					</p>
				</CardContent>
			</Card>

			{/* Behavior */}
			<Card>
				<CardHeader class='pb-4'>
					<CardTitle class='text-base'>Поведение</CardTitle>
				</CardHeader>
				<CardContent class='space-y-4'>
					<Switch
						checked={settings().auto_save_words}
						onChange={v => updateSettings({ auto_save_words: v })}
					>
						<SwitchControl>
							<SwitchThumb />
						</SwitchControl>
					</Switch>
					<Switch
						checked={settings().show_notifications}
						onChange={v => updateSettings({ show_notifications: v })}
					>
						<SwitchControl>
							<SwitchThumb />
						</SwitchControl>
					</Switch>
					<Switch
						checked={settings().minimize_to_tray}
						onChange={v => updateSettings({ minimize_to_tray: v })}
					>
						<SwitchControl>
							<SwitchThumb />
						</SwitchControl>
					</Switch>
				</CardContent>
			</Card>
		</div>
	);
}
