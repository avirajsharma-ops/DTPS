'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Award, Clock, TrendingDown } from 'lucide-react';

interface Transformation {
  _id: string;
  uuid: string;
  title: string;
  description?: string;
  beforeImage: string;
  afterImage: string;
  clientName?: string;
  durationWeeks?: number;
  weightLoss?: number;
}

export default function TransformationSwiper() {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTransformations();
  }, []);

  const fetchTransformations = async () => {
    try {
      const response = await fetch('/api/client/transformations');
      if (response.ok) {
        const data = await response.json();
        setTransformations(data.transformations || []);
      }
    } catch (error) {
      console.error('Error fetching transformations:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cardWidth = container.children[0]?.clientWidth || 280;
    const gap = 16;
    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: 'smooth'
    });
    setActiveIndex(index);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cardWidth = container.children[0]?.clientWidth || 280;
    const gap = 16;
    const newIndex = Math.round(container.scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(newIndex, transformations.length - 1));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="w-72 h-48 bg-gray-100 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (transformations.length === 0) {
    return null; // Don't show section if no transformations
  }

  return (
    <div className="bg-gradient-to-r from-[#3AB1A0]/5 to-[#E06A26]/5 rounded-2xl p-4 shadow-sm border border-[#3AB1A0]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[#3AB1A0]" />
          <h2 className="text-base font-bold text-gray-900">Success Stories</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => scrollToIndex(Math.min(transformations.length - 1, activeIndex + 1))}
            disabled={activeIndex >= transformations.length - 1}
            className="p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Swiper Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 -mx-1 px-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {transformations.map((transformation, index) => (
          <div
            key={transformation._id}
            className="w-72 flex-shrink-0 bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Before/After Images */}
            <div className="relative flex">
              <div className="w-1/2 relative aspect-square bg-gray-100">
                <Image
                  src={transformation.beforeImage}
                  alt="Before"
                  fill
                  className="object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Before
                </span>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-[#3AB1A0]" />
                </div>
              </div>
              <div className="w-1/2 relative aspect-square bg-gray-100">
                <Image
                  src={transformation.afterImage}
                  alt="After"
                  fill
                  className="object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-[#3AB1A0] text-white text-[10px] px-1.5 py-0.5 rounded">
                  After
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                {transformation.title}
              </h3>
              {transformation.clientName && (
                <p className="text-xs text-gray-500 mb-2">{transformation.clientName}</p>
              )}
              <div className="flex items-center gap-3">
                {transformation.durationWeeks && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span>{transformation.durationWeeks} weeks</span>
                  </div>
                )}
                {transformation.weightLoss && (
                  <div className="flex items-center gap-1 text-xs text-[#3AB1A0] font-medium">
                    <TrendingDown className="h-3 w-3" />
                    <span>-{transformation.weightLoss} kg</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots Indicator */}
      {transformations.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {transformations.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? 'w-4 bg-[#3AB1A0]'
                  : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
