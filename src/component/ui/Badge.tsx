import { JSX, splitProps } from 'solid-js';

interface BadgeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function Badge(props: BadgeProps) {
  const [local, others] = splitProps(props, ['variant', 'class', 'children']);
  
  const variants = {
    default: 'bg-neutral-100 text-neutral-900',
    secondary: 'bg-neutral-800 text-neutral-100',
    destructive: 'bg-red-600 text-white',
    outline: 'border border-neutral-700 text-neutral-300',
  };
  
  return (
    <div
      class={`
        inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium
        ${variants[local.variant || 'default']}
        ${local.class || ''}
      `}
      {...others}
    >
      {local.children}
    </div>
  );
}

