import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'normal' | 'large';
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ size = 'normal', variant = 'secondary', icon, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-component="button"
        data-size={size}
        data-variant={variant}
        className={className}
        {...props}
      >
        {icon && <span data-slot="icon">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

