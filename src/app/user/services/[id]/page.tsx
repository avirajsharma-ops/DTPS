'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Star, Check, X } from 'lucide-react';

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
  benefits?: string[];
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState<ServicePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  useEffect(() => {
    fetchServiceDetail();
  }, [params.id]);

  const fetchServiceDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/service-plans/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setService(data.plan);
        if (data.plan?.pricingTiers?.length > 0) {
          setSelectedTier(0);
        }
      }
    } catch (error) {
      console.error('Error fetching service detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#3AB1A0]" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Service not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#3AB1A0] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-4 max-w-5xl mx-auto w-full">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#3AB1A0]/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3AB1A0]" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Service Details</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Service Hero Section */}
        <div className="bg-gradient-to-br from-[#3AB1A0] to-[#2A9A8B] rounded-3xl shadow-lg p-8 mb-8 text-white">
          <div className="mb-4">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white">
              {service.category}
            </span>
          </div>
          <h2 className="text-4xl font-bold mb-3">{service.name}</h2>
          <p className="text-lg text-white/90 mb-6 max-w-2xl">{service.description}</p>

          {/* Ratings */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-[#FFB800] text-[#FFB800]" />
              ))}
            </div>
            <span className="text-sm text-white/90">(4.8/5 from 1,200+ clients)</span>
          </div>
        </div>

        {/* Pricing Section - Horizontal Scroll */}
        {service.pricingTiers && service.pricingTiers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-5">Choose Your Plan</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar">
              {service.pricingTiers.map((tier, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTier(index)}
                  className={`flex-shrink-0 w-72 p-6 rounded-2xl border-2 transition-all ${
                    selectedTier === index
                      ? 'border-[#3AB1A0] bg-gradient-to-br from-[#3AB1A0]/10 to-[#3AB1A0]/5 shadow-md'
                      : 'border-gray-200 hover:border-[#3AB1A0] bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-600 mb-2">{tier.durationLabel}</p>
                  <p className="text-4xl font-bold text-[#E06A26] mb-5">₹{tier.amount}</p>
                  <button className={`w-full py-3 rounded-xl font-bold transition-all text-sm ${
                    selectedTier === index
                      ? 'bg-[#3AB1A0] text-white hover:bg-[#2A9A8B]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                    {selectedTier === index ? '✓ Selected' : 'Select Plan'}
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {service.features && service.features.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What's Included</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-[#3AB1A0] mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        {service.benefits && service.benefits.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-5">Key Benefits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.benefits.map((benefit, index) => (
                <div key={index} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#DB9C6E]/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-[#DB9C6E]" />
                    </div>
                    <span className="text-gray-700 font-medium">{benefit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-6 -mx-4 px-4">
          <button className="w-full py-4 px-6 bg-gradient-to-r from-[#3AB1A0] to-[#2A9A8B] text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all max-w-5xl mx-auto block">
            Purchase This Service
          </button>
        </div>
      </div>
    </div>
  );
}
