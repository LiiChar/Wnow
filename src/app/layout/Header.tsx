
import { layoutStore } from '@/shared/stores/layout';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {X} from 'lucide-solid'
import { Show } from 'solid-js';


export const Header = () => {

  const handleCloseApp = async () => {
    try {
      await  getCurrentWebviewWindow().hide();
    } catch (e) {
      console.error('Failed to hide window:', e);
    }
  };

  return (
		<Show when={layoutStore.headerVisible}>
			<header
				data-tauri-drag-region
				class='relative flex items-center justify-between px-2 py-2 border-b select-none border-border'
			>
				<div
					class='w-full flex justify-between inset-0 cursor-default'
					data-tauri-drag-region
					style={{ 'pointer-events': 'auto' }}
				>
					<div class='flex items-center gap-2 relative z-10 pointer-events-none'>
						<div>
							<h1 class='text-xl font-semibold text-neutral-100'>
								{layoutStore.headerLabel}
							</h1>
							<Show when={layoutStore.headerDescription}>
								<p class='text-sm text-neutral-500'>{layoutStore.headerDescription}</p>
							</Show>
						</div>
					</div>

					<div class='flex items-center relative z-10'>
						<button
							onClick={handleCloseApp}
							class='p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors'
						>
							<X size={14} />
						</button>
					</div>
				</div>
			</header>
		</Show>
	);
}