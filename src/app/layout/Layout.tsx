import { ParentProps, onMount } from 'solid-js';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastRegion, useToast, setToastCallback, ToastListWithToasts } from '@/components/ui/Toast';

export function Layout(props: ParentProps) {
	const toastState = useToast();

	onMount(() => {
		// Set global callback for imperative toast creation
		setToastCallback(toastState.createToast);
	});

	return (
		<div class='fixed inset-0 flex flex-col overflow-hidden interface'>
			<Header />
			<main class='flex-1 overflow-y-auto'>{props.children}</main>
			<ToastRegion>
				<ToastListWithToasts />
			</ToastRegion>
			<Footer />
		</div>
	);
}
