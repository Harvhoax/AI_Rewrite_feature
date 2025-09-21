import React from 'react';
import { AnimatedCard } from './AnimatedCard';
import { cn } from '@/lib/utils';

interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  delay?: number;
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
}

export const AccessibleCard = React.forwardRef<HTMLDivElement, AccessibleCardProps>(
  ({ 
    className, 
    variant = 'default', 
    padding = 'md', 
    children, 
    hover = true,
    delay = 0,
    role = 'region',
    ariaLabel,
    ariaDescribedBy,
    tabIndex,
    ...props 
  }, ref) => {
    return (
      <AnimatedCard
        ref={ref}
        className={cn(className)}
        variant={variant}
        padding={padding}
        hover={hover}
        delay={delay}
        role={role}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        tabIndex={tabIndex}
        {...props}
      >
        {children}
      </AnimatedCard>
    );
  }
);

AccessibleCard.displayName = 'AccessibleCard';
