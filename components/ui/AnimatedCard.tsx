import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  delay?: number;
}

export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className, 
    variant = 'default', 
    padding = 'md', 
    children, 
    hover = true,
    delay = 0,
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const baseClasses = 'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out';
    
    const variantClasses = {
      default: 'border-border hover:border-border/80',
      outlined: 'border-2 border-border hover:border-primary/50',
      elevated: 'border-border shadow-lg hover:shadow-xl',
      interactive: 'border-border hover:border-primary/50 hover:shadow-lg cursor-pointer'
    };
    
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8'
    };

    const hoverClasses = hover ? 'hover:scale-[1.02] hover:shadow-md' : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          paddingClasses[padding],
          hoverClasses,
          className
        )}
        style={{
          animationDelay: `${delay}ms`,
          animation: 'fadeInUp 0.6s ease-out forwards',
          opacity: 0,
          transform: 'translateY(20px)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';
