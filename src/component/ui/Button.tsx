import { JSX, splitProps } from 'solid-js';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'class', 'children']);
  
  const variants = {
    default: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
    secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
    ghost: 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100',
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-6 text-sm',
    icon: 'h-9 w-9',
  };
  
  return (
    <button
      class={`
        inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950
        disabled:pointer-events-none disabled:opacity-50
        ${variants[local.variant || 'default']}
        ${sizes[local.size || 'md']}
        ${local.class || ''}
      `}
      {...others}
    >
      {local.children}
    </button>
  );
}

