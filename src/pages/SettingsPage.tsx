import { createSignal, onMount } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { HotkeyInput } from '../components/HotkeyInput';
import { settings, updateSettings, DEFAULT_SETTINGS } from '../shared/stores/settings';
import { LANGUAGES } from '../shared/types/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Switch, SwitchControl, SwitchThumb, SwitchLabel } from '@/components/ui/Switch';
import { Languages, Monitor, MousePointer, MousePointer2, Clipboard, Palette, Play, KeyRound, Bell, Save, RotateCcw, Sparkles } from 'lucide-solid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useHeader } from '@/shared/hooks/useHeader';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';

interface SelectOption {
	label: string;
	value: string;
}

export function SettingsPage() {
	const [translationMode, setTranslationMode] = createSignal<string>('local_first');

	useHeader('Настройки', 'Персонализация приложения');

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

	const startModeOptions: SelectOption[] = [
		{ label: 'Приложение (словарь)', value: 'app' },
		{ label: 'Режим перевода', value: 'overlay' }
	];

	const themeOptions: SelectOption[] = [
		{ label: '🌙 Тёмная', value: 'dark' },
		{ label: '☀️ Светлая', value: 'light' },
		{ label: '💻 Системная', value: 'system' }
	];

	const translationModeOptions: SelectOption[] = [
		{ label: '🔒 Локальный (с онлайн fallback)', value: 'local_first' },
		{ label: '🔐 Только офлайн', value: 'offline_only' },
		{ label: '🌐 Только онлайн', value: 'online_only' },
	];

	const langOptions: SelectOption[] = LANGUAGES.map(l => ({
		label: `${l.flag} ${l.name}`,
		value: l.code
	}));

	const handleResetSettings = async () => {
		if (!confirm('Вы уверены, что хотите сбросить все настройки по умолчанию?')) {
			return;
		}

		try {
			await updateSettings(DEFAULT_SETTINGS);
			createToast({
				title: 'Настройки сброшены',
				description: 'Все настройки возвращены к значениям по умолчанию',
				type: 'success'
			});
		} catch (e) {
			console.error('Failed to reset settings:', e);
			createToast({
				title: 'Ошибка',
				description: 'Не удалось сбросить настройки',
				type: 'error'
			});
		}
	};

	return (
		<div class='h-full flex flex-col gap-4 overflow-y-auto pb-4'>
			{/* Запуск приложения */}
			<Card>
				<CardHeader class='pb-3'>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0'>
							<Play size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Запуск</CardTitle>
							<CardDescription class='text-xs'>
								Настройки запуска приложения
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Режим запуска</label>
						<Select
							options={startModeOptions}
							optionValue='value'
							optionTextValue='label'
							value={startModeOptions.find(o => o.value === settings().start_mode)}
							onChange={v => v && updateSettings({ start_mode: v.value as 'app' | 'overlay' })}
							itemComponent={props => (
								<SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption()?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					<Switch
						checked={settings().start_minimized}
						onChange={v => updateSettings({ start_minimized: v })}
					>
						<SwitchLabel class='flex-1 cursor-pointer'>
							<div class='flex items-center justify-between'>
								<div>
									<div class='text-sm font-medium'>Запускать свёрнутым</div>
									<div class='text-xs text-neutral-500'>
										Приложение будет запускаться в фоновом режиме
									</div>
								</div>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</div>
						</SwitchLabel>
					</Switch>
				</CardContent>
			</Card>

			{/* Внешний вид */}
			<Card>
				<CardHeader class='pb-3'>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0'>
							<Palette size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Внешний вид</CardTitle>
							<CardDescription class='text-xs'>
								Настройки темы оформления
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Тема</label>
						<Select
							options={themeOptions}
							optionValue='value'
							optionTextValue='label'
							value={themeOptions.find(o => o.value === settings().theme)}
							onChange={v => v && updateSettings({ theme: v.value as 'light' | 'dark' | 'system' })}
							itemComponent={props => (
								<SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption()?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Языки */}
			<Card>
				<CardHeader class='pb-3'>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0'>
							<Languages size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Языки</CardTitle>
							<CardDescription class='text-xs'>
								Языки перевода по умолчанию
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Исходный язык</label>
						<Select
							options={langOptions}
							optionValue='value'
							optionTextValue='label'
							value={langOptions.find(o => o.value === settings().source_lang)}
							onChange={v => v && updateSettings({ source_lang: v.value })}
							itemComponent={props => (
								<SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption()?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Целевой язык</label>
						<Select
							options={langOptions}
							optionValue='value'
							optionTextValue='label'
							value={langOptions.find(o => o.value === settings().target_lang)}
							onChange={v => v && updateSettings({ target_lang: v.value })}
							itemComponent={props => (
								<SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption()?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Движок перевода */}
			<Card>
				<CardHeader class='pb-3'>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0'>
							<Languages size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Движок перевода</CardTitle>
							<CardDescription class='text-xs'>
								Настройки движка перевода
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Режим перевода</label>
						<Select
							options={translationModeOptions}
							optionValue='value'
							optionTextValue='label'
							value={translationModeOptions.find(o => o.value === translationMode())}
							onChange={v => v && handleTranslationModeChange(v.value)}
							itemComponent={props => (
								<SelectItem item={props.item}>{props.item.rawValue.label}</SelectItem>
							)}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption()?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					<div class='text-xs text-neutral-500 space-y-1.5 bg-neutral-900/50 rounded-lg p-3'>
						<p>
							<strong class='text-neutral-300'>🔒 Локальный:</strong> Встроенный словарь + онлайн если слово не найдено
						</p>
						<p>
							<strong class='text-neutral-300'>🔐 Только офлайн:</strong> Только встроенный словарь (приватность)
						</p>
						<p>
							<strong class='text-neutral-300'>🌐 Только онлайн:</strong> Google Translate (точнее, но нужен интернет)
						</p>
					</div>
					<div class='p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg'>
						<div class='flex items-start gap-2'>
							<Sparkles size={14} class='text-emerald-400 mt-0.5' />
							<div>
								<div class='text-xs text-emerald-400 font-medium mb-0.5'>
									💡 Рекомендация
								</div>
								<p class='text-xs text-neutral-400'>
									Режим "Локальный" обеспечивает быстрый перевод частых слов офлайн,
									а для сложных фраз использует онлайн-перевод.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Горячие клавиши */}
			<Card>
				<CardHeader class='pb-3'>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0'>
							<KeyRound size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Горячие клавиши</CardTitle>
							<CardDescription class='text-xs'>
								Кликните на комбинацию для изменения
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='flex items-start gap-3 p-3 rounded-lg bg-neutral-900/30'>
						<div class='p-2 rounded-md bg-neutral-800 text-neutral-400 shrink-0'>
							<MousePointer2 size={16} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод слова под курсором'
								value={settings().hotkey_translate_word}
								onChange={v => updateSettings({ hotkey_translate_word: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-3 rounded-lg bg-neutral-900/30'>
						<div class='p-2 rounded-md bg-neutral-800 text-neutral-400 shrink-0'>
							<MousePointer size={16} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Выделить область'
								value={settings().hotkey_translate_area}
								onChange={v => updateSettings({ hotkey_translate_area: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-3 rounded-lg bg-neutral-900/30'>
						<div class='p-2 rounded-md bg-neutral-800 text-neutral-400 shrink-0'>
							<Monitor size={16} />
						</div>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод всего экрана'
								value={settings().hotkey_translate_screen}
								onChange={v => updateSettings({ hotkey_translate_screen: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-3 rounded-lg bg-neutral-900/30'>
						<div class='p-2 rounded-md bg-neutral-800 text-neutral-400 shrink-0'>
							<Clipboard size={16} />
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

					<p class='text-xs text-neutral-500 pt-2 border-t border-neutral-800'>
						* Изменения горячих клавиш вступят в силу после перезапуска приложения
					</p>
				</CardContent>
			</Card>

			{/* Поведение */}
			<Card>
				<CardHeader class='pb-3'>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0'>
							<Bell size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Поведение</CardTitle>
							<CardDescription class='text-xs'>
								Настройки поведения приложения
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-3'>
					<Switch
						checked={settings().auto_save_words}
						onChange={v => updateSettings({ auto_save_words: v })}
					>
						<SwitchLabel class='flex-1 cursor-pointer'>
							<div class='flex items-center justify-between'>
								<div class='flex items-center gap-3'>
									<div class='p-1.5 rounded-md bg-neutral-800 text-neutral-400'>
										<Save size={14} />
									</div>
									<div>
										<div class='text-sm font-medium'>Автосохранение слов</div>
										<div class='text-xs text-neutral-500'>
											Автоматически сохранять переведённые слова в словарь
										</div>
									</div>
								</div>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</div>
						</SwitchLabel>
					</Switch>

					<Switch
						checked={settings().show_notifications}
						onChange={v => updateSettings({ show_notifications: v })}
					>
						<SwitchLabel class='flex-1 cursor-pointer'>
							<div class='flex items-center justify-between'>
								<div class='flex items-center gap-3'>
									<div class='p-1.5 rounded-md bg-neutral-800 text-neutral-400'>
										<Bell size={14} />
									</div>
									<div>
										<div class='text-sm font-medium'>Уведомления</div>
										<div class='text-xs text-neutral-500'>
											Показывать уведомления о событиях
										</div>
									</div>
								</div>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</div>
						</SwitchLabel>
					</Switch>

					<Switch
						checked={settings().minimize_to_tray}
						onChange={v => updateSettings({ minimize_to_tray: v })}
					>
						<SwitchLabel class='flex-1 cursor-pointer'>
							<div class='flex items-center justify-between'>
								<div class='flex items-center gap-3'>
									<div class='p-1.5 rounded-md bg-neutral-800 text-neutral-400'>
										<Monitor size={14} />
									</div>
									<div>
										<div class='text-sm font-medium'>Сворачивать в трей</div>
										<div class='text-xs text-neutral-500'>
											Скрывать приложение в системный трей при сворачивании
										</div>
									</div>
								</div>
								<SwitchControl>
									<SwitchThumb />
								</SwitchControl>
							</div>
						</SwitchLabel>
					</Switch>
				</CardContent>
			</Card>

			{/* Сброс настроек */}
			<Card>
				<CardFooter>
					<Button
						variant='outline'
						onClick={handleResetSettings}
						class='w-full'
					>
						<RotateCcw size={16} />
						Сбросить настройки по умолчанию
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
