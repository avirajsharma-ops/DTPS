'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf } from 'lucide-react';

export default function ClientAuthPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment between 1-5 for realistic loading feel
        const increment = Math.floor(Math.random() * 5) + 1;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // When loading reaches 100%, redirect to signin
    if (progress === 100) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
        router.push('/client-auth/signin');
      }, 500); // Small delay after reaching 100%

      return () => clearTimeout(timeout);
    }
  }, [progress, router]);

  return (
    <div className=" min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-between relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full bg-gradient-to-b from-green-500/20 to-transparent blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1">
        {/* Logo with glow */}
        <div className="relative mb-4">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-green-400 to-emerald-500 blur-xl opacity-50 scale-110" />
          
          {/* Logo circle */}
          <div className="relative h-28 w-28 rounded-full bg-gradient-to-b from-green-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-2xl">
            <Leaf className="h-16 w-16 text-[#1a1a1a] transform -rotate-45" strokeWidth={2.5} />
          </div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          DTPS
        </h1>
        
        {/* Tagline */}
        <p className="text-gray-400 text-lg tracking-wide">
          Track. Eat. Thrive.
        </p>
      </div>

      {/* Loading section at bottom */}
     <div className="w-full max-w-sm px-8 pb-20 mb-6">
        {/* Loading text and percentage */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#c4a962] text-sm font-medium tracking-widest uppercase">
            Loading Resources
          </span>
          <span className="text-gray-400 text-sm font-medium">
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c4a962] to-[#d4b972] rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Version */}
        <p className="text-center text-gray-500 text-sm mt-6">
          v2.4.0 (Build 302)
        </p>
      </div>
    </div>
  );
}
