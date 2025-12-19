'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, Star, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface PricingTier {
    _id: string;
    durationDays: number;
    durationLabel: string;
    amount: number;
    isActive: boolean;
}

interface ServicePlan {
    _id: string;
    name: string;
    category: string;
    description?: string;
    pricingTiers: PricingTier[];
    maxDiscountPercent: number;
}

interface ServicePlansSwiperProps {
    onPlanSelect?: (plan: ServicePlan, tier: PricingTier) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'weight-loss': { bg: 'from-green-500 to-emerald-600', text: 'text-green-600', border: 'border-green-200' },
    'weight-gain': { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-600', border: 'border-blue-200' },
    'muscle-gain': { bg: 'from-purple-500 to-violet-600', text: 'text-purple-600', border: 'border-purple-200' },
    'diabetes': { bg: 'from-teal-500 to-cyan-600', text: 'text-teal-600', border: 'border-teal-200' },
    'pcos': { bg: 'from-pink-500 to-rose-600', text: 'text-pink-600', border: 'border-pink-200' },
    'thyroid': { bg: 'from-amber-500 to-orange-600', text: 'text-amber-600', border: 'border-amber-200' },
    'general-wellness': { bg: 'from-green-500 to-teal-600', text: 'text-green-600', border: 'border-green-200' },
    'detox': { bg: 'from-lime-500 to-green-600', text: 'text-lime-600', border: 'border-lime-200' },
    'sports-nutrition': { bg: 'from-red-500 to-orange-600', text: 'text-red-600', border: 'border-red-200' },
    'custom': { bg: 'from-gray-500 to-slate-600', text: 'text-gray-600', border: 'border-gray-200' },
};

const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
        'weight-loss': 'Weight Loss',
        'weight-gain': 'Weight Gain',
        'muscle-gain': 'Muscle Gain',
        'diabetes': 'Diabetes Management',
        'pcos': 'PCOS',
        'thyroid': 'Thyroid',
        'general-wellness': 'General Wellness',
        'detox': 'Detox',
        'sports-nutrition': 'Sports Nutrition',
        'custom': 'Custom',
    };
    return labels[category] || category;
};

export default function ServicePlansSwiper({ onPlanSelect }: ServicePlansSwiperProps) {
    const [plans, setPlans] = useState<ServicePlan[]>([]);
    const [hasActivePlan, setHasActivePlan] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await fetch('/api/client/service-plans');
            if (response.ok) {
                const data = await response.json();
                setPlans(data.plans || []);
                setHasActivePlan(data.hasActivePlan);
                // Set default tier selection for each plan
                const defaultTiers: Record<string, string> = {};
                (data.plans || []).forEach((plan: ServicePlan) => {
                    const activeTiers = plan.pricingTiers.filter(t => t.isActive);
                    if (activeTiers.length > 0) {
                        defaultTiers[plan._id] = activeTiers[0]._id;
                    }
                });
                setSelectedTiers(defaultTiers);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollTo = (direction: 'left' | 'right') => {
        if (containerRef.current) {
            const cardWidth = containerRef.current.offsetWidth * 0.85;
            const newIndex = direction === 'left'
                ? Math.max(0, activeIndex - 1)
                : Math.min(plans.length - 1, activeIndex + 1);
            setActiveIndex(newIndex);
            containerRef.current.scrollTo({
                left: newIndex * cardWidth,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = () => {
        if (containerRef.current) {
            const cardWidth = containerRef.current.offsetWidth * 0.85;
            const newIndex = Math.round(containerRef.current.scrollLeft / cardWidth);
            setActiveIndex(newIndex);
        }
    };

    const handleSelectPlan = (plan: ServicePlan) => {
        const selectedTierId = selectedTiers[plan._id];
        const tier = plan.pricingTiers.find(t => t._id === selectedTierId);
        if (tier && onPlanSelect) {
            onPlanSelect(plan, tier);
        } else {
            toast.info('Contact your dietitian to subscribe to this plan');
        }
    };

    // Don't show if client has active plan
    if (hasActivePlan || loading) {
        return null;
    }

    if (plans.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            {/* Header */}
            <div className="flex items-center justify-between px-1 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Choose Your Plan</h2>
                    <p className="text-sm text-gray-500">Select a nutrition plan to get started</p>
                </div>
                {plans.length > 1 && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => scrollTo('left')}
                            disabled={activeIndex === 0}
                            className="p-2 rounded-full bg-white border border-gray-200 shadow-sm disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                            onClick={() => scrollTo('right')}
                            disabled={activeIndex === plans.length - 1}
                            className="p-2 rounded-full bg-white border border-gray-200 shadow-sm disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                    </div>
                )}
            </div>

            {/* Swiper Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {plans.map((plan, index) => {
                    const colors = CATEGORY_COLORS[plan.category] || CATEGORY_COLORS['custom'];
                    const activeTiers = plan.pricingTiers.filter(t => t.isActive);
                    const selectedTierId = selectedTiers[plan._id];
                    const selectedTier = activeTiers.find(t => t._id === selectedTierId) || activeTiers[0];

                    return (
                        <div
                            key={plan._id}
                            className="flex-shrink-0 w-[85%] snap-center"
                        >
                            <div className={`rounded-3xl overflow-hidden shadow-lg border ${colors.border}`}>
                                {/* Header with gradient */}
                                <div className={`bg-gradient-to-r ${colors.bg} p-5 text-white`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                                                {getCategoryLabel(plan.category)}
                                            </span>
                                            <h3 className="text-xl font-bold mt-2">{plan.name}</h3>
                                        </div>
                                        <Star className="h-6 w-6 fill-white/30" />
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="bg-white p-5">
                                    {/* Description */}
                                    {plan.description && (
                                        <div
                                            className="text-sm text-gray-600 mb-4 line-clamp-2"
                                            dangerouslySetInnerHTML={{ __html: plan.description }}
                                        />
                                    )}

                                    {/* Duration Selection */}
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-2 font-medium">SELECT DURATION</p>
                                        <div className="flex flex-wrap gap-2">
                                            {activeTiers.map((tier) => (
                                                <button
                                                    key={tier._id}
                                                    onClick={() => setSelectedTiers({ ...selectedTiers, [plan._id]: tier._id })}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
                            ${selectedTierId === tier._id
                                                            ? `bg-gradient-to-r ${colors.bg} text-white shadow-md`
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {tier.durationLabel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Price Display */}
                                    <div className="flex items-end justify-between mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500">TOTAL PRICE</p>
                                            <div className="flex items-baseline">
                                                <span className="text-3xl font-bold text-gray-900">
                                                    ₹{selectedTier?.amount.toLocaleString()}
                                                </span>
                                                <span className="text-gray-500 ml-1">
                                                    /{selectedTier?.durationLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {plan.maxDiscountPercent > 0 && (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                                Up to {plan.maxDiscountPercent}% off
                                            </span>
                                        )}
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${colors.bg} text-white font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow`}
                                    >
                                        Get Started
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Dots */}
            {plans.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    {plans.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-6 bg-green-500' : 'w-2 bg-gray-300'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
