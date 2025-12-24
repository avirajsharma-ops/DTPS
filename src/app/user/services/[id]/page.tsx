'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Check, X, Loader2, ShoppingCart } from 'lucide-react';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';
import { toast } from 'sonner';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

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

  const handlePurchase = async () => {
    if (!service || selectedTier === null || !service.pricingTiers) {
      toast.error('Please select a plan');
      return;
    }

    const tier = service.pricingTiers[selectedTier];
    
    setIsPurchasing(true);
    
    try {
      // Create order via API
      const response = await fetch('/api/client/service-plans/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: service._id,
          tierId: selectedTier,
          amount: tier.amount,
          durationDays: tier.durationDays,
          durationLabel: tier.durationLabel,
          planName: service.name,
          planCategory: service.category
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // If we get a payment link, redirect to it
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
        return;
      }

      // If we get an order ID, open Razorpay checkout
      if (data.orderId && razorpayLoaded && window.Razorpay) {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_5iryw2HyZ6RWRW',
          amount: tier.amount * 100,
          currency: 'INR',
          name: 'DTPS',
          description: `${service.name} - ${tier.durationLabel}`,
          order_id: data.orderId,
          handler: async function (response: any) {
            try {
              // Verify payment
              const verifyRes = await fetch('/api/client/service-plans/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  paymentId: data.paymentId
                })
              });

              const verifyData = await verifyRes.json();

              if (verifyRes.ok && verifyData.success) {
                toast.success('Payment successful! Plan activated.');
                router.push('/user?payment_success=true');
              } else {
                toast.error(verifyData.error || 'Payment verification failed');
              }
            } catch (err) {
              console.error('Verification error:', err);
              toast.error('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: '',
            email: '',
            contact: ''
          },
          theme: {
            color: '#3AB1A0'
          },
          modal: {
            ondismiss: function() {
              setIsPurchasing(false);
              toast.info('Payment cancelled');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Fallback - show success message
      toast.success(data.message || 'Order created successfully!');
      router.push('/user');

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
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
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50 pb-32">
      {/* Razorpay Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

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
        <div className="bg-linear-to-br from-[#3AB1A0] to-[#2A9A8B] rounded-3xl shadow-lg p-8 mb-8 text-white">
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

        {/* Pricing Section - Vertical Display */}
        {service.pricingTiers && service.pricingTiers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-5">Choose Your Plan</h3>
            <div className="flex flex-col gap-4">
              {service.pricingTiers.map((tier, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTier(index)}
                  className={`w-full p-6 rounded-2xl border-2 transition-all ${
                    selectedTier === index
                      ? 'border-[#3AB1A0] bg-linear-to-br from-[#3AB1A0]/10 to-[#3AB1A0]/5 shadow-md'
                      : 'border-gray-200 hover:border-[#3AB1A0] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-600 mb-1">{tier.durationLabel}</p>
                      <p className="text-3xl font-bold text-[#E06A26]">₹{tier.amount}</p>
                    </div>
                    <div className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                      selectedTier === index
                        ? 'bg-[#3AB1A0] text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedTier === index ? '✓ Selected' : 'Select'}
                    </div>
                  </div>
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
                  <Check className="w-6 h-6 text-[#3AB1A0] mt-0.5 shrink-0" />
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
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[#DB9C6E]/10 flex items-center justify-center">
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
        <div className="sticky bottom-0 left-0 right-0 bg-linear-to-t from-white via-white to-transparent pt-4 pb-6 -mx-4 px-4">
          <button 
            onClick={handlePurchase}
            disabled={isPurchasing || selectedTier === null}
            className="w-full py-4 px-6 bg-linear-to-r from-[#3AB1A0] to-[#2A9A8B] text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all max-w-5xl mx-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>
                  Purchase Now
                  {selectedTier !== null && service.pricingTiers && (
                    <span className="ml-2">- ₹{service.pricingTiers[selectedTier].amount}</span>
                  )}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
