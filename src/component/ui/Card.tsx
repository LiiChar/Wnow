import { JSX, splitProps } from 'solid-js';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  
  return (
    <div
      class={`rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-100 ${local.class || ''}`}
      {...others}
    >
      {local.children}
    </div>
  );
}

export function CardHeader(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div class={`flex flex-col space-y-1.5 p-6 ${local.class || ''}`} {...others}>
      {local.children}
    </div>
  );
}

export function CardTitle(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <h3 class={`text-lg font-semibold leading-none tracking-tight ${local.class || ''}`} {...others}>
      {local.children}
    </h3>
  );
}

export function CardDescription(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <p class={`text-sm text-neutral-400 ${local.class || ''}`} {...others}>
      {local.children}
    </p>
  );
}

export function CardContent(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div class={`p-6 pt-0 ${local.class || ''}`} {...others}>
      {local.children}
    </div>
  );
}

export function CardFooter(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <div class={`flex items-center p-6 pt-0 ${local.class || ''}`} {...others}>
      {local.children}
    </div>
  );
}

