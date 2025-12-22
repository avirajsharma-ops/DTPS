'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Star, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface ServicePlan {
  _id: string;
  name: string;
  category: string;
  description?: string;
  pricingTiers?: Array<{
    durationDays: number;
    durationLabel: string;
    amount: number;
  }>;
  features?: string[];
  maxDiscountPercent?: number;
}

export default function ServicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/service-plans');
      if (response.ok) {
        const data = await response.json();
        setServices(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-4 max-w-5xl mx-auto w-full">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#3AB1A0]/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3AB1A0]" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Our Services</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Service Plans - Horizontal Scrollable Layout */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Service Plans</h2>
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {services.map((service) => (
                <Link
                  key={service._id}
                  href={`/user/services/${service._id}`}
                  className="block w-72 flex-shrink-0 p-5 bg-white rounded-2xl border border-gray-200 hover:border-[#3AB1A0] hover:shadow-lg transition-all group"
                >
                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#3AB1A0]/10 text-[#3AB1A0] mb-3">
                  {service.category}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#3AB1A0] transition-colors">
                  {service.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                  {service.description || 'Premium service plan'}
                </p>
                
                {/* Price */}
                {service.pricingTiers && service.pricingTiers.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-[#E06A26]">
                      ₹{service.pricingTiers[0]?.amount}
                      <span className="text-xs font-normal text-gray-500 ml-1">onwards</span>
                    </div>
                    <span className="text-xs font-medium text-[#3AB1A0] group-hover:translate-x-1 transition-transform">
                      View Details →
                    </span>
                  </div>
                )}

                {/* Features Preview */}
                {service.features && service.features.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {service.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3 text-[#3AB1A0]" />
                          {feature.length > 20 ? feature.substring(0, 20) + '...' : feature}
                        </span>
                      ))}
                      {service.features.length > 3 && (
                        <span className="text-xs text-gray-400">+{service.features.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}
            </div>
          </div>
        </div>

        {services.length === 0 && (
          <div className="py-20 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No services available</p>
          </div>
        )}
      </div>
    </div>
  );
}
