import React, { useState } from 'react';
import { AnimatedButton } from './AnimatedButton';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label: string;
  onCopy?: (success: boolean) => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  onCopy,
  className,
  variant = 'outline',
  size = 'default'
}) => {
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setIsAnimating(true);
      onCopy?.(true);
      
      // Reset after animation
      setTimeout(() => {
        setCopied(false);
        setIsAnimating(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      onCopy?.(false);
    }
  };

  return (
    <AnimatedButton
      variant={copied ? 'success' : variant}
      size={size}
      onClick={handleCopy}
      success={copied}
      className={cn(
        'relative overflow-hidden',
        isAnimating && 'animate-pulse',
        className
      )}
      disabled={copied}
      aria-label={copied ? 'Copied!' : `Copy ${label}`}
    >
      {copied ? (
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Copied!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>Copy {label}</span>
        </div>
      )}
      
      {/* Ripple effect */}
      {isAnimating && (
        <div className="absolute inset-0 bg-white/20 rounded-md animate-ping" />
      )}
    </AnimatedButton>
  );
};
