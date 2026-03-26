import { cn } from "@/shared/lib/utils";
import { Check } from "lucide-solid";
import { JSX, Show, splitProps } from "solid-js";
import { Button, buttonProps } from "../ui/Button";

type ModelElementProps = {
	title: string;
	model?: string;
	isDownloaded?: boolean;
	isDownloading?: boolean;
  downloadProgress?: number;
} & JSX.InputHTMLAttributes<HTMLButtonElement> & buttonProps;

export const ModelElement = (props: ModelElementProps) => {
  const [local, others] = splitProps(props, [
		'class',
		'model',
		'isDownloaded',
		'title',
		'isDownloading',
    'downloadProgress',
	]);

  return (
		<Button
			class={cn(
				'flex gap-2 text-start items-center relative overflow-hidden min-h-8 justify-between w-full',
				local.isDownloading && 'hover:bg-transparent! ',
				local.isDownloaded && 'hover:bg-transparent! ',
				local.class,
			)}
			{...others}
			variant={'outline'}
		>
			<div class='flex-1 text-sm'>{local.title}</div>
			<Show when={local.isDownloaded ?? false}>
				<Check size={16} />
			</Show>
			<Show when={local.isDownloading}>
				<div
					class='absolute left-0 top-0 h-full bg-primary/10 p-0.5'
					style={{ width: `${local.downloadProgress}%` }}
				></div>
				<div class='text-sm'>{local.downloadProgress}%</div>
			</Show>
		</Button>
	);
}