import { cn } from '@/lib/utils';
import { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Memoized spinner to prevent unnecessary re-renders
export const LoadingSpinner = memo(function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-[1px]',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-gray-300 border-t-green-600',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
});

// Optimized loading page with fade-in animation
export const LoadingPage = memo(function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center animate-fadeIn">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
});

// Optimized skeleton loading with better performance
export const LoadingCard = memo(function LoadingCard() {
  return (
    <div className="animate-pulse animate-fadeIn">
      <div className="bg-gray-200 rounded-lg h-48 w-full"></div>
      <div className="mt-4 space-y-2">
        <div className="bg-gray-200 rounded h-4 w-3/4"></div>
        <div className="bg-gray-200 rounded h-4 w-1/2"></div>
      </div>
    </div>
  );
});

// New: Minimal loading dots for better performance
export const LoadingDots = memo(function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-1", className)} role="status" aria-label="Loading">
      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );
});
