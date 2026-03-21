import { JSX, splitProps } from 'solid-js';

interface GlassCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard(props: GlassCardProps) {
  const [local, others] = splitProps(props, ['variant', 'padding', 'class', 'children']);
  
  const variantClasses = {
    default: 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10',
    elevated: 'bg-white/15 dark:bg-white/8 border-white/25 dark:border-white/15 shadow-xl',
    subtle: 'bg-white/5 dark:bg-white/3 border-white/10 dark:border-white/5',
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };
  
  return (
    <div
      class={`
        backdrop-blur-xl rounded-2xl border
        ${variantClasses[local.variant || 'default']}
        ${paddingClasses[local.padding || 'md']}
        ${local.class || ''}
      `}
      {...others}
    >
      {local.children}
    </div>
  );
}

