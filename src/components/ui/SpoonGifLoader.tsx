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
