import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse rounded-md bg-muted',
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export const MessageSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-5/6" />
  </div>
);

export const CardSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-6 w-1/3" />
    <MessageSkeleton />
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

export const AnalysisSkeleton = () => (
  <div className="space-y-6">
    <CardSkeleton />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>
    <CardSkeleton />
  </div>
);
