import { Bell, Copy, Eye, EyeOff, KeyRound, Languages, Layers, Monitor, Palette, Play, RotateCcw, Save, Sparkles, Volume2 } from 'lucide-solid';
import { createSignal, onMount } from 'solid-js';

import { BottomPadding } from '@/components/layout/BottomPadding';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '@/components/ui/Switch';
import { createToast } from '@/components/ui/Toast';
import { getTranslationMode, setTranslationMode } from '@/shared/api/settings';
import { useHeader } from '@/shared/hooks/useHeader';
import { Models } from '@/widget/settings/Models';

import { HotkeyInput } from '../components/ui/HotkeyInput';
import { DEFAULT_SETTINGS, settingsStore, updateSettings } from '../shared/stores/settings';
import { LANGUAGES } from '../shared/types/storage';

interface SelectOption {
	label: string;
	value: string;
}

const Slider = (props: {
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (value: number) => void;
	class?: string;
}) => (
		<input
			class={`w-full h-2 bg-input rounded-lg appearance-none cursor-pointer accent-primary ${props.class || ''}`}
			max={props.max}
			min={props.min}
			step={props.step || 1}
			type='range'
			value={props.value}
			onInput={(e) => props.onChange(Number(e.currentTarget.value))}
		/>
	);

interface SwitchRowProps {
	checked: boolean;
	description: string;
	icon?: any;
	title: string;
	onChange: (value: boolean) => Promise<void> | void;
}

const SwitchRow = (props: SwitchRowProps) => {
	const handleChange = (value: boolean) => {
		// Выполняем onChange без ожидания Promise для избежания проблем с рендерингом
		const result = props.onChange(value);
		if (result && typeof result === 'object' && 'then' in result) {
			// Promise, но не ждём его
			result.catch((e: any) => console.error('Switch onChange error:', e));
		}
	};

	return (
		<div class='flex items-center justify-between'>
			<div class='flex items-center gap-3 flex-1'>
				{props.icon && (
					<div class='p-1.5 rounded-md'>
						<props.icon size={14} />
					</div>
				)}
				<div>
					<div class='text-sm font-medium'>{props.title}</div>
					<div class='text-xs text-neutral-500'>{props.description}</div>
				</div>
			</div>
			<Switch checked={props.checked} onChange={handleChange}>
				<SwitchControl>
					<SwitchThumb />
				</SwitchControl>
			</Switch>
		</div>
	);
};

export const SettingsPage = () => {
	const [mode, setMode] = createSignal<string>('local_first');

	useHeader('Настройки', 'Персонализация приложения');

	onMount(async () => {
		try {
			const mode = await getTranslationMode();
			setMode(mode);
		} catch (e) {
			console.error('Failed to get translation mode:', e);
		}
	});

	const handleTranslationModeChange = async (mode: string) => {
		try {
			await setTranslationMode(mode);
			setMode(mode);
		} catch (e) {
			console.error('Failed to set translation mode:', e);
		}
	};


	const themeOptions: SelectOption[] = [
		{ label: '🌙 Тёмная', value: 'dark' },
		{ label: '☀️ Светлая', value: 'light' },
		{ label: '💻 Системная', value: 'system' }
	];

	const translationModeOptions: SelectOption[] = [
		{ label: '🔒 Онлайн (с офлайн fallback)', value: 'online_first' },
		{ label: '🔐 Только офлайн', value: 'offline_only' },
		{ label: '🌐 Только онлайн', value: 'online_only' },
	];

	const langOptions: SelectOption[] = LANGUAGES.map(l => ({
		label: `${l.flag} ${l.name}`,
		value: l.code
	}));

	const handleResetSettings = async () => {
		// if (!confirm('Вы уверены, что хотите сбросить все настройки по умолчанию?')) {
		// 	return;
		// }

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
		<div class='h-full flex flex-col gap-2'>
			{/* Запуск приложения */}
			<Card>
				<CardHeader class=''>
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
				<CardContent class='space-y-3'>
					<SwitchRow
						checked={settingsStore.start_minimized}
						description='Приложение будет запускаться в фоновом режиме'
						title='Запускать свёрнутым'
						onChange={(v) => updateSettings({ start_minimized: v })}
					/>

					<SwitchRow
						checked={settingsStore.auto_launch}
						description='Автоматически запускать приложение при старте системы'
						title='Автозапуск'
						onChange={(v) => updateSettings({ auto_launch: v })}
					/>
				</CardContent>
			</Card>
			{/* Внешний вид */}
			<Card>
				<CardHeader>
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
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={themeOptions}
							optionTextValue='label'
							optionValue='value'
							value={themeOptions.find(o => o.value === settingsStore.theme)}
							onChange={v =>
								v &&
								updateSettings({
									theme: v.value as 'dark' | 'light' | 'system',
								})
							}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption().label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Размер шрифта</label>
						<Select
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={[
								{ label: 'Маленький', value: 'small' },
								{ label: 'Средний', value: 'medium' },
								{ label: 'Большой', value: 'large' },
							]}
							optionValue='value'
							value={{ label: '', value: settingsStore.font_size }}
							onChange={v =>
								v &&
								updateSettings({
									font_size: v.value,
								})
							}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => {
										const opt = [
											{ label: 'Маленький', value: 'small' },
											{ label: 'Средний', value: 'medium' },
											{ label: 'Большой', value: 'large' },
										].find(o => o.value === state.selectedOption().value);
										return opt?.label || '';
									}}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					
					<SwitchRow
						checked={settingsStore.compact_mode}
						description='Уменьшить отступы и размеры элементов'
						title='Компактный режим'
						onChange={(v) => updateSettings({ compact_mode: v })}
					/>
				</CardContent>
			</Card>
			{/* Языки */}
			<Card>
				<CardHeader>
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
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={langOptions}
							optionTextValue='label'
							optionValue='value'
							value={langOptions.find(o => o.value === settingsStore.source_lang)}
							onChange={v => v && updateSettings({ source_lang: v.value })}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption().label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Целевой язык</label>
						<Select
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={langOptions}
							optionTextValue='label'
							optionValue='value'
							value={langOptions.find(o => o.value === settingsStore.target_lang)}
							onChange={v => v && updateSettings({ target_lang: v.value })}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption().label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
				</CardContent>
			</Card>

			<Models/>
			{/* Движок перевода */}
			<Card>
				<CardHeader>
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
					<SwitchRow
						checked={settingsStore.image_replacement}
						description='Заменять изначальный текст на переведённый'
						title='Заменять текст'
						onChange={(v) => updateSettings({ image_replacement: v })}
					/>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Режим перевода</label>
						<Select
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							value={translationModeOptions.find(
								o => o.value === mode(),
							)}
							options={translationModeOptions}
							optionTextValue='label'
							optionValue='value'
							onChange={v => v && handleTranslationModeChange(v.value)}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => state.selectedOption().label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					<div class='text-xs text-muted-foreground space-y-1.5 bg-muted rounded-lg p-3'>
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
					<div class='p-3  border border-emerald-800/50 rounded-lg'>
						<div class='flex items-start gap-2'>
							<Sparkles class='text-emerald-400 -mt-2' size={40} />
							<div>
								<div class='text-xs text-emerald-400 font-medium mb-0.5'>
									Рекомендация
								</div>
								<p class='text-xs '>
									Режим "Локальный" обеспечивает быстрый перевод частых слов
									офлайн, а для сложных фраз использует онлайн-перевод.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
			{/* Горячие клавиши */}
			<Card>
				<CardHeader>
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
				<CardContent class='space-y-2'>
					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод слова под курсором'
								value={settingsStore.hotkey_translate_word}
								onChange={v => updateSettings({ hotkey_translate_word: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label='Выделить область'
								value={settingsStore.hotkey_translate_area}
								onChange={v => updateSettings({ hotkey_translate_area: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод всего экрана'
								value={settingsStore.hotkey_translate_screen}
								onChange={v => updateSettings({ hotkey_translate_screen: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label='Перевод выделенного текста'
								value={settingsStore.hotkey_translate_clipboard}
								onChange={v =>
									updateSettings({ hotkey_translate_clipboard: v })
								}
							/>
						</div>
					</div>

					<p class='text-xs text-neutral-500 pt-2 border-t border-border'>
						* Изменения горячих клавиш вступят в силу после перезапуска
						приложения
					</p>
				</CardContent>
			</Card>
			{/* Поведение */}
			<Card>
				<CardHeader>
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
					<SwitchRow
						checked={settingsStore.auto_save_words}
						description='Автоматически сохранять переведённые слова в словарь'
						icon={Save}
						title='Автосохранение слов'
						onChange={(v) => updateSettings({ auto_save_words: v })}
					/>

					<SwitchRow
						checked={settingsStore.show_notifications}
						description='Показывать уведомления о событиях'
						icon={Bell}
						title='Уведомления'
						onChange={(v) => updateSettings({ show_notifications: v })}
					/>

					<SwitchRow
						checked={settingsStore.minimize_to_tray}
						description='Скрывать приложение в системный трей при сворачивании'
						icon={Monitor}
						title='Сворачивать в трей'
						onChange={(v) => updateSettings({ minimize_to_tray: v })}
					/>

					<SwitchRow
						checked={settingsStore.show_word_context}
						description='Отображать контекст предложения для слов'
						icon={Eye}
						title='Показывать контекст'
						onChange={(v) => updateSettings({ show_word_context: v })}
					/>
				</CardContent>
			</Card>
			
			{/* Overlay */}
			<Card>
				<CardHeader>
					<div class='flex items-center gap-2'>
						<div class='p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0'>
							<Layers size={16} />
						</div>
						<div class='min-w-0'>
							<CardTitle class='text-base'>Overlay (перевод)</CardTitle>
							<CardDescription class='text-xs'>
								Настройки отображения перевода
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<div class='flex items-center justify-between'>
							<label class='text-sm font-medium'>Прозрачность фона</label>
							<span class='text-xs text-neutral-500'>{settingsStore.overlay_opacity}%</span>
						</div>
						<Slider
							max={100}
							min={50}
							step={5}
							value={settingsStore.overlay_opacity}
							onChange={(v) => updateSettings({ overlay_opacity: v })}
						/>
					</div>
					
					<div class='space-y-2'>
						<label class='text-sm font-medium'>Позиция overlay</label>
						<Select
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={[
								{ label: '⬆️ Сверху', value: 'top' },
								{ label: '⬇️ Снизу', value: 'bottom' },
								{ label: '↕️ По центру', value: 'center' },
							]}
							optionValue='value'
							value={{ label: '', value: settingsStore.overlay_position }}
							onChange={v =>
								v &&
								updateSettings({
									overlay_position: v.value,
								})
							}
						>
							<SelectTrigger>
								<SelectValue<SelectOption>>
									{state => {
										const opt = [
											{ label: '⬆️ Сверху', value: 'top' },
											{ label: '⬇️ Снизу', value: 'bottom' },
											{ label: '↕️ По центру', value: 'center' },
										].find(o => o.value === state.selectedOption().value);
										return opt?.label || '';
									}}
								</SelectValue>
							</SelectTrigger>
							<SelectContent />
						</Select>
					</div>
					
					<div class='space-y-2'>
						<div class='flex items-center justify-between'>
							<label class='text-sm font-medium'>Время показа (мс)</label>
							<span class='text-xs text-neutral-500'>{settingsStore.overlay_duration} мс</span>
						</div>
						<Slider
							max={30000}
							min={1000}
							step={500}
							value={settingsStore.overlay_duration}
							onChange={(v) => updateSettings({ overlay_duration: v })}
						/>
						<div class='flex justify-between text-xs text-neutral-500'>
							<span>1 сек</span>
							<span>30 сек</span>
						</div>
					</div>
					
					<SwitchRow
						checked={settingsStore.auto_copy_translation}
						description='Копировать перевод в буфер обмена'
						icon={Copy}
						title='Автокопирование'
						onChange={(v) => updateSettings({ auto_copy_translation: v })}
					/>

					<SwitchRow
						checked={settingsStore.hide_after_translation}
						description='Автоматически скрывать overlay после показа'
						icon={EyeOff}
						title='Скрывать после показа'
						onChange={(v) => updateSettings({ hide_after_translation: v })}
					/>

					<SwitchRow
						checked={settingsStore.enable_sound}
						description='Воспроизводить звук при показе перевода'
						icon={Volume2}
						title='Звуковые эффекты'
						onChange={(v) => updateSettings({ enable_sound: v })}
					/>
				</CardContent>
			</Card>
			{/* Сброс настроек */}
			<Button class='w-full' variant='outline' onClick={handleResetSettings}>
				<RotateCcw size={16} />
				Сбросить настройки по умолчанию
			</Button>
			<BottomPadding/>
		</div>
	);
}
