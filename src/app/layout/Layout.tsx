import { ParentProps } from 'solid-js';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastList, ToastRegion } from '@/components/ui/Toast';

export function Layout(props: ParentProps) {

	return (
		<div class='fixed inset-0 flex-colrounded-lg overflow-hidden interface'>
			<Header />
			<main>{props.children}</main>
			<ToastRegion>
				<ToastList />
			</ToastRegion>
			<Footer />
		</div>
	);
}
