import { Show } from "solid-js";
import { Toast, ToastContent, ToastDescription, ToastTitle } from "../ui/Toast";

export const ToastStatus = (props: { toastId: number, text: string, status: 'success' | 'error' | 'warning', description?: string }) => {
	return (
		<Toast variant={props.status ? 'default' : 'destructive'} toastId={props.toastId}>
			<ToastContent>
				<ToastTitle>{props.text}</ToastTitle>
				<Show when={props.description}>
					<ToastDescription>{props.description}</ToastDescription>
				</Show>
			</ToastContent>
		</Toast>
	);
};