import { createSignal, onMount, Show } from "solid-js";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import "./index.css";

import { TranslatorOverlay } from "./overlay/TranslatorOverlay";
import { MainApp } from "./app/MainApp";
import { initSettings, applyTheme } from "./shared/stores/settings";

function App() {
  // Сразу определяем режим синхронно
  const window_ = getCurrentWebviewWindow();
  const initialMode = window_.label === 'main' ? 'app' : 'overlay';
  
  const [mode] = createSignal<'overlay' | 'app'>(initialMode);

  // Устанавливаем стили сразу
  if (initialMode === 'app') {
    document.body.classList.add('app-mode');
    document.body.style.background = '#0a0a0a';
  } else {
    document.body.style.background = 'transparent';
  }

  onMount(() => {
    console.log('App mounted, label:', window_.label, 'mode:', initialMode);
    
    // Загружаем настройки в фоне
    initSettings().then(settings => {
      applyTheme(settings.theme);
    }).catch(console.error);
  });

  // Overlay - открыть main окно
  const handleOpenApp = async () => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const mainWindow = await WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.show();
        await mainWindow.setFocus();
      }
    } catch (e) {
      console.error('Failed to open app:', e);
    }
  };

  // Main - скрыть окно
  const handleCloseApp = async () => {
    try {
      await window_.hide();
    } catch (e) {
      console.error('Failed to hide window:', e);
    }
  };

  return (
    <Show when={mode() === 'app'} fallback={<TranslatorOverlay onOpenApp={handleOpenApp} />}>
      <MainApp onClose={handleCloseApp} />
    </Show>
	);
}

export default App;
