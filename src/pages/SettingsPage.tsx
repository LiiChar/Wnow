import { Bell, Copy, Eye, EyeOff, KeyRound, Languages, Layers, Monitor, Palette, Play, RotateCcw, Save, Sparkles, Trash, Volume2 } from 'lucide-solid';
import { createSignal, onMount } from 'solid-js';

import { BottomPadding } from '@/components/layout/BottomPadding';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from '@/components/ui/Switch';
import { createToast } from '@/components/ui/Toast';
import { getTranslationMode, setTranslationMode } from '@/shared/api/settings';
import { getLocale, getPreferredLocale, setLocalePreference, SUPPORTED_LOCALES, useLocale } from '@/shared/lib/locale.tsx';
import { useHeader } from '@/shared/hooks/useHeader';
import { Models } from '@/widget/settings/Models';

import { HotkeyInput } from '../components/ui/HotkeyInput';
import { DEFAULT_SETTINGS, settingsStore, updateSettings } from '../shared/stores/settings';
import { LANGUAGES } from '../shared/types/storage';
import { clearAllWords } from '@/shared/api/stude';

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
	const { locale, setLocale, t } = useLocale();

	useHeader(t().settings.title, t().settings.description);

	onMount(async () => {
		try {
			const mode = await getTranslationMode();
			setMode(mode);
			const preferredLocale = getPreferredLocale();
			if (preferredLocale !== locale()) {
				setLocale(preferredLocale);
			}
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

	const handleLocaleChange = (code: string) => {
		setLocale(code as any);
		setLocalePreference(code as any);
		updateSettings({ ui_locale: code as any });
	};

	const themeOptions: SelectOption[] = [
		{ label: t().settings.appearance.themeDark, value: 'dark' },
		{ label: t().settings.appearance.themeLight, value: 'light' },
		{ label: t().settings.appearance.themeSystem, value: 'system' }
	];

	const translationModeOptions: SelectOption[] = [
		{ label: t().settings.translationEngine.modeOnlineFirst, value: 'online_first' },
		{ label: t().settings.translationEngine.modeOfflineOnly, value: 'offline_only' },
		{ label: t().settings.translationEngine.modeOnlineOnly, value: 'online_only' },
	];

	const langOptions: SelectOption[] = LANGUAGES.map(l => ({
		label: `${l.flag} ${l.name}`,
		value: l.code
	}));

	const localeOptions: SelectOption[] = SUPPORTED_LOCALES.map(l => ({
		label: `${l.flag} ${l.name}`,
		value: l.code
	}));

	const handleResetSettings = async () => {
		// if (!confirm(t().settings.reset.confirmTitle)) {
		// 	return;
		// }

		try {
			await updateSettings(DEFAULT_SETTINGS);
			createToast({
				title: t().settings.reset.success,
				description: t().settings.reset.successDesc,
				type: 'success'
			});
		} catch (e) {
			console.error('Failed to reset settings:', e);
			createToast({
				title: t().settings.reset.error,
				description: t().settings.reset.errorDesc,
				type: 'error'
			});
		}
	};

	const handleClearDictionary = async () => {
		try {
			await clearAllWords();
			createToast({
				title: t().settings.dictionary.success,
				description: t().settings.dictionary.successDesc,
				type: 'success'
			});
		} catch (e) {
			console.error('Failed to clear dictionary:', e);
			createToast({
				title: t().settings.dictionary.error,
				description: t().settings.dictionary.errorDesc,
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
							<CardTitle class='text-base'>{t().settings.launch.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.launch.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-3'>
					<SwitchRow
						checked={settingsStore.start_minimized}
						description={t().settings.launch.startMinimizedDesc}
						title={t().settings.launch.startMinimized}
						onChange={(v) => updateSettings({ start_minimized: v })}
					/>

					<SwitchRow
						checked={settingsStore.auto_launch}
						description={t().settings.launch.autoLaunchDesc}
						title={t().settings.launch.autoLaunch}
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
							<CardTitle class='text-base'>{t().settings.appearance.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.appearance.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>{t().settings.appearance.theme}</label>
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
						<label class='text-sm font-medium'>{t().settings.appearance.fontSize}</label>
						<Select
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={[
								{ label: t().settings.appearance.fontSizeSmall, value: 'small' },
								{ label: t().settings.appearance.fontSizeMedium, value: 'medium' },
								{ label: t().settings.appearance.fontSizeLarge, value: 'large' },
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
											{ label: t().settings.appearance.fontSizeSmall, value: 'small' },
											{ label: t().settings.appearance.fontSizeMedium, value: 'medium' },
											{ label: t().settings.appearance.fontSizeLarge, value: 'large' },
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
						description={t().settings.appearance.compactModeDesc}
						title={t().settings.appearance.compactMode}
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
							<CardTitle class='text-base'>{t().settings.languages.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.languages.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>{t().settings.languages.sourceLanguage}</label>
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
						<label class='text-sm font-medium'>{t().settings.languages.targetLanguage}</label>
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
					<div class='space-y-2 pt-2 border-t border-border'>
						<label class='text-sm font-medium'>Язык интерфейса</label>
						<Select
							itemComponent={props => (
								<SelectItem item={props.item}>
									{props.item.rawValue.label}
								</SelectItem>
							)}
							options={localeOptions}
							optionTextValue='label'
							optionValue='value'
							value={localeOptions.find(o => o.value === locale())}
							onChange={v => v && handleLocaleChange(v.value)}
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
							<CardTitle class='text-base'>{t().settings.translationEngine.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.translationEngine.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<SwitchRow
						checked={settingsStore.image_replacement}
						description={t().settings.translationEngine.replaceTextDesc}
						title={t().settings.translationEngine.replaceText}
						onChange={(v) => updateSettings({ image_replacement: v })}
					/>
					<div class='space-y-2'>
						<label class='text-sm font-medium'>{t().settings.translationEngine.mode}</label>
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
							<strong>{t().settings.translationEngine.localMode}</strong> {t().settings.translationEngine.localModeDesc}
						</p>
						<p>
							<strong>{t().settings.translationEngine.offlineMode}</strong> {t().settings.translationEngine.offlineModeDesc}
						</p>
						<p>
							<strong>{t().settings.translationEngine.onlineMode}</strong> {t().settings.translationEngine.onlineModeDesc}
						</p>
					</div>
					<div class='p-3  border border-emerald-800/50 rounded-lg'>
						<div class='flex items-start gap-2'>
							<Sparkles class='text-emerald-400 -mt-2' size={40} />
							<div>
								<div class='text-xs text-emerald-400 font-medium mb-0.5'>
									{t().settings.translationEngine.recommendation}
								</div>
								<p class='text-xs '>
									{t().settings.translationEngine.recommendationText}
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
							<CardTitle class='text-base'>{t().settings.hotkeys.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.hotkeys.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-2'>
					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label={t().settings.hotkeys.translateWord}
								value={settingsStore.hotkey_translate_word}
								onChange={v => updateSettings({ hotkey_translate_word: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label={t().settings.hotkeys.translateArea}
								value={settingsStore.hotkey_translate_area}
								onChange={v => updateSettings({ hotkey_translate_area: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label={t().settings.hotkeys.translateScreen}
								value={settingsStore.hotkey_translate_screen}
								onChange={v => updateSettings({ hotkey_translate_screen: v })}
							/>
						</div>
					</div>

					<div class='flex items-start gap-3 p-0 py-1 '>
						<div class='flex-1'>
							<HotkeyInput
								label={t().settings.hotkeys.translateClipboard}
								value={settingsStore.hotkey_translate_clipboard}
								onChange={v =>
									updateSettings({ hotkey_translate_clipboard: v })
								}
							/>
						</div>
					</div>

					<p class='text-xs text-neutral-500 pt-2 border-t border-border'>
						{t().settings.hotkeys.restartRequired}
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
							<CardTitle class='text-base'>{t().settings.behavior.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.behavior.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-3'>
					<SwitchRow
						checked={settingsStore.auto_save_words}
						description={t().settings.behavior.autoSaveWordsDesc}
						icon={Save}
						title={t().settings.behavior.autoSaveWords}
						onChange={(v) => updateSettings({ auto_save_words: v })}
					/>

					<SwitchRow
						checked={settingsStore.show_notifications}
						description={t().settings.behavior.notificationsDesc}
						icon={Bell}
						title={t().settings.behavior.notifications}
						onChange={(v) => updateSettings({ show_notifications: v })}
					/>

					<SwitchRow
						checked={settingsStore.minimize_to_tray}
						description={t().settings.behavior.minimizeToTrayDesc}
						icon={Monitor}
						title={t().settings.behavior.minimizeToTray}
						onChange={(v) => updateSettings({ minimize_to_tray: v })}
					/>

					<SwitchRow
						checked={settingsStore.show_word_context}
						description={t().settings.behavior.showContextDesc}
						icon={Eye}
						title={t().settings.behavior.showContext}
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
							<CardTitle class='text-base'>{t().settings.overlay.title}</CardTitle>
							<CardDescription class='text-xs'>
								{t().settings.overlay.description}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent class='space-y-4'>
					<div class='space-y-2'>
						<div class='flex items-center justify-between'>
							<label class='text-sm font-medium'>{t().settings.overlay.backgroundOpacity}</label>
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
						<div class='flex items-center justify-between'>
							<label class='text-sm font-medium'>{t().settings.overlay.floatingDelay}</label>
							<span class='text-xs text-neutral-500'>{settingsStore.floating_delay} мс</span>
						</div>
						<Slider
							max={10000}
							min={100}
							step={100}
							value={settingsStore.floating_delay}
							onChange={(v) => updateSettings({ floating_delay: v })}
						/>
						<div class='flex justify-between text-xs text-neutral-500'>
							<span>100 мс	</span>
							<span>10 сек</span>
						</div>
					</div>

					<div class='space-y-2'>
						<div class='flex items-center justify-between'>
							<label class='text-sm font-medium'>{t().settings.overlay.duration}</label>
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
						description={t().settings.overlay.autoCopyDesc}
						icon={Copy}
						title={t().settings.overlay.autoCopy}
						onChange={(v) => updateSettings({ auto_copy_translation: v })}
					/>

					<SwitchRow
						checked={settingsStore.hide_after_translation}
						description={t().settings.overlay.hideAfterShowDesc}
						icon={EyeOff}
						title={t().settings.overlay.hideAfterShow}
						onChange={(v) => updateSettings({ hide_after_translation: v })}
					/>

					<SwitchRow
						checked={settingsStore.enable_sound}
						description={t().settings.overlay.soundEffectsDesc}
						icon={Volume2}
						title={t().settings.overlay.soundEffects}
						onChange={(v) => updateSettings({ enable_sound: v })}
					/>
				</CardContent>
			</Card>
			{/* Сброс настроек */}
			<div class='flex flex-col gap-2'>
				<Button class='w-full' variant='outline' onClick={handleResetSettings}>
					<RotateCcw size={16} />
					{t().settings.reset.button}
				</Button>
				<Button class='w-full' variant='outline' onClick={handleClearDictionary}>
					<Trash size={16} />
					{t().settings.dictionary.button}
				</Button>
			</div>
			<BottomPadding/>
		</div>
	);
}
