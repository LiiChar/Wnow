import { Switch, Match, onMount } from 'solid-js';
import { currentPage, navigateTo, Page } from '../shared/stores/router';
import { IconDictionary, IconStudy, IconSettings, IconCrown, IconMinus, IconClose } from '../component/Icons';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

// Pages
import { DictionaryPage } from '../pages/DictionaryPage';
import { StudyPage } from '../pages/StudyPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ProPage } from '../pages/ProPage';

interface MainAppProps {
  onClose: () => void;
}

export function MainApp(props: MainAppProps) {
  onMount(() => {
    navigateTo('dictionary');
  });

  const navItems: { id: Page; label: string; icon: typeof IconDictionary }[] = [
    { id: 'dictionary', label: 'Словарь', icon: IconDictionary },
    { id: 'study', label: 'Изучение', icon: IconStudy },
    { id: 'settings', label: 'Настройки', icon: IconSettings },
    { id: 'pro', label: 'Pro', icon: IconCrown },
  ];

  const minimize = () => {
    getCurrentWebviewWindow().minimize();
  };

  return (
    <div class="fixed inset-0 flex flex-col bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800">
      {/* Custom Titlebar - вся область перетаскиваемая */}
      <header class="relative flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900 select-none">
        {/* Drag region - занимает всё пространство кроме кнопок */}
        <div 
          class="absolute inset-0 cursor-default" 
          data-tauri-drag-region 
          style={{ "pointer-events": "auto" }}
        />
        
        {/* Logo */}
        <div class="flex items-center gap-2 relative z-10 pointer-events-none">
          <div class="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs">
            W
          </div>
          <span class="text-neutral-200 text-sm font-medium">Wnow</span>
        </div>
        
        {/* Кнопки - поверх drag region */}
        <div class="flex items-center relative z-10">
          <button 
            onClick={minimize}
            class="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
          >
            <IconMinus size={14} />
          </button>
          <button 
            onClick={props.onClose}
            class="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
          >
            <IconClose size={14} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main class="flex-1 overflow-hidden px-6 py-4">
        <Switch>
          <Match when={currentPage() === 'dictionary'}>
            <DictionaryPage />
          </Match>
          <Match when={currentPage() === 'study'}>
            <StudyPage />
          </Match>
          <Match when={currentPage() === 'settings'}>
            <SettingsPage />
          </Match>
          <Match when={currentPage() === 'pro'}>
            <ProPage />
          </Match>
        </Switch>
      </main>

      {/* Navigation */}
      <nav class="px-4 py-3 border-t border-neutral-800">
        <div class="flex justify-around max-w-md mx-auto">
          {navItems.map(item => (
            <button
              onClick={() => navigateTo(item.id)}
              class={`
                flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors
                ${currentPage() === item.id 
                  ? 'bg-neutral-800 text-neutral-100' 
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}
              `}
            >
              <item.icon size={20} />
              <span class="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
