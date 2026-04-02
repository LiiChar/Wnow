
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {X} from 'lucide-solid'
import { Show } from 'solid-js';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/shared/lib/locale.tsx';
import { layoutStore } from '@/shared/stores/layout';


export const Header = () => {
	const { t } = useLocale();

  const handleCloseApp = async () => {
    try {
      getCurrentWebviewWindow().hide();
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  };

  return (
		<Show when={layoutStore.headerVisible}>
			<header
				data-tauri-drag-region
				class='relative flex items-center justify-between px-2 py-2 border-b select-none border-border'
			>
				<div
					data-tauri-drag-region
					class='w-full flex justify-between inset-0 cursor-default'
					style={{ 'pointer-events': 'auto' }}
				>
					<div class='flex items-center gap-2 relative z-10 pointer-events-none'>
						<div>
							<h1 class='text-xl font-semibold '>
								{layoutStore.headerLabel}
							</h1>
							<Show when={layoutStore.headerDescription}>
								<p class='text-sm text-neutral-500'>{layoutStore.headerDescription}</p>
							</Show>
						</div>
					</div>

					<div class='flex items-center relative z-10'>
						<Button
							class='p-2 aspect-square rounded transition-colors'
							variant={'ghost'}
							onClick={handleCloseApp}
						>
							<X size={14} />
						</Button>
					</div>
				</div>
			</header>
		</Show>
	);
}