import type { ParentProps} from 'solid-js';

import { onMount } from 'solid-js';

import { setToastCallback, ToastListWithToasts, ToastRegion, useToast } from '@/components/ui/Toast';

import { Footer } from './Footer';
import { Header } from './Header';

export const Layout = (props: ParentProps) => {
	const toastState = useToast();

	onMount(() => {
		setToastCallback(toastState.createToast);
	});

	return (
		<div class='flex flex-col h-full overflow-auto interface'>
			<Header />
			<main class='flex-1 overflow-y-auto p-2 '>{props.children}</main>
			<ToastRegion>
				<ToastListWithToasts />
			</ToastRegion>
			<Footer />
		</div>
	);
}
