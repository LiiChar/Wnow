import { createSignal, onMount, Show } from "solid-js";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import "./index.css";

import { TranslatorOverlay } from "./widget/overlay/TranslatorOverlay";
import { initSettings, applyTheme } from "./shared/stores/settings";
import { Router } from "./app/router/Router";

function App() {
  const window_ = getCurrentWebviewWindow();
  const initialMode = window_.label === 'main' ? 'app' : 'overlay';

  const [mode] = createSignal<'overlay' | 'app'>(initialMode);

  if (initialMode === 'app') {
    document.body.classList.add('app-mode');
    document.body.style.background = '#0a0a0a';
  } else {
    document.body.style.background = 'transparent';
  }

  console.log('[App] Window label:', window_.label, 'Mode:', mode());

  onMount(() => {
    initSettings().then(settings => {
      applyTheme(settings.theme);
      // Сохраняем прозрачный фон для overlay после применения темы
      if (initialMode === 'overlay') {
        document.body.style.background = 'transparent';
      }
    }).catch(console.error);
  });

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


  return (
		<Show
			when={mode() === 'app'}
			fallback={<TranslatorOverlay onOpenApp={handleOpenApp} />}
		>
			<Router />
		</Show>
	);
}

export default App;
