import { JSX, splitProps } from 'solid-js';

interface GlassButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: JSX.Element;
}

export function GlassButton(props: GlassButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'icon', 'class', 'children']);
  
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-purple-500/80 to-pink-500/80 
      hover:from-purple-500 hover:to-pink-500
      text-white shadow-lg shadow-purple-500/25
      border-purple-400/30
    `,
    secondary: `
      bg-white/10 hover:bg-white/20 
      text-white/90 hover:text-white
      border-white/20 hover:border-white/30
    `,
    ghost: `
      bg-transparent hover:bg-white/10
      text-white/70 hover:text-white
      border-transparent
    `,
    danger: `
      bg-red-500/20 hover:bg-red-500/30
      text-red-400 hover:text-red-300
      border-red-500/30
    `,
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
  };
  
  return (
    <button
      class={`
        inline-flex items-center justify-center font-medium
        backdrop-blur-sm border transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${variantClasses[local.variant || 'secondary']}
        ${sizeClasses[local.size || 'md']}
        ${local.class || ''}
      `}
      {...others}
    >
      {local.icon}
      {local.children}
    </button>
  );
}

