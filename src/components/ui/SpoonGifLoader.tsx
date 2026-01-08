// SpoonGifLoader.tsx
'use client';
import Image from 'next/image';

interface SpoonGifLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  showText?: boolean;
}

export default function SpoonGifLoader({ 
  size = 'md', 
  text = 'Loading...', 
  showText = true 
}: SpoonGifLoaderProps) {
  const sizes = {
    sm: 60,
    md: 100,
    lg: 150,
    xl: 200,
  };
  
  const px = sizes[size] || sizes.md;
  
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Spoon GIF - displayed directly without extra animation */}
      <div 
        className="relative"
        style={{ width: px, height: px * 1.5 }}
      >
        <Image
          src="/images/spoon-loader.gif"
          alt="Loading..."
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </div>
      {/* {showText && text && (
        <span className="text-[#E06A26] font-medium text-base mt-2">{text}</span>
      )} */}
    </div>
  );
}

// Full page centered loader - use this for page loading states
interface FullPageLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isDarkMode?: boolean;
  text?: string;
}

export function FullPageLoader({ size = 'lg', isDarkMode = false, text }: FullPageLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        isDarkMode ? 'bg-gray-950' : 'bg-white'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
      }}
    >
      <SpoonGifLoader size={size} />
      {text && (
        <p className={`mt-4 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {text}
        </p>
      )}
    </div>
  );
}
