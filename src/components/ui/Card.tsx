import { cn } from '@/shared/lib/utils';
import type { ComponentProps } from 'solid-js';
import { splitProps } from 'solid-js';

function Card(props: ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card'
			class={cn(
				'ring-foreground/0 bg-card text-card-foreground gap-4 rounded-xl py-4 text-sm ring-1 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl group/card flex flex-col border border-border',
				local.class,
			)}
			{...rest}
		/>
	);
}

function CardHeader(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card-header'
			class={cn(
				'gap-1 rounded-t-xl px-4 py-0 group-data-[size=sm]/card:px-3 group-data-[size=sm]/card:py-1.5 [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3 flex flex-col',
				local.class,
			)}
			{...rest}
		/>
	);
}

function CardTitle(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card-title'
			class={cn(
				'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
				local.class,
			)}
			{...rest}
		/>
	);
}

function CardDescription(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card-description'
			class={cn('text-muted-foreground text-sm', local.class)}
			{...rest}
		/>
	);
}

function CardAction(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card-action'
			class={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				local.class,
			)}
			{...rest}
		/>
	);
}

function CardContent(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card-content'
			class={cn('px-4 group-data-[size=sm]/card:px-3', local.class)}
			{...rest}
		/>
	);
}

function CardFooter(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			data-slot='card-footer'
			class={cn(
				'bg-muted/50 rounded-b-xl border-t p-4 group-data-[size=sm]/card:p-3 flex items-center',
				local.class,
			)}
			{...rest}
		/>
	);
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
};
