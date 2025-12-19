'use client';

// import { GlassWater, Activity, Moon, Footprints } from "lucide-react";

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  Droplet, 
  Moon, 
  Activity, 
  Utensils,
  Bed,
  User,
  GlassWater,
  ChevronRight,
  ChevronLeft,
  Flame,
  Footprints,
  BookOpen,
  Clock,
  Menu
} from 'lucide-react';
import BottomNavBar from '@/components/client/BottomNavBar';
import UserSidebar from '@/components/client/UserSidebar';

interface DashboardData {
  caloriesLeft: number;
  caloriesGoal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: { current: number; goal: number };
  sleep: { hours: number; minutes: number; quality: number };
  activity: { minutes: number; active: boolean };
  meals: { eaten: number; total: number; calories: number };
  steps: { current: number; goal: number };
}

export default function UserHomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardData>({
    caloriesLeft: 750,
    caloriesGoal: 2000,
    protein: 120,
    carbs: 180,
    fat: 45,
    water: { current: 1.8, goal: 2.5 },
    sleep: { hours: 6, minutes: 30, quality: 81 },
    activity: { minutes: 45, active: true },
    meals: { eaten: 3, total: 4, calories: 1450 },
    steps: { current: 6540, goal: 10000 },
  });

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      if (status === 'loading') return;
      
      try {
        const response = await fetch('/api/client/onboarding');
        if (response.ok) {
          const data = await response.json();
          if (!data.onboardingCompleted) {
            router.replace('/user/onboarding');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      }
      setCheckingOnboarding(false);
    };

    checkOnboarding();
  }, [status, router]);

  // Handle scroll to update active card indicator
  const handleCardsScroll = () => {
    if (cardsContainerRef.current) {
      const container = cardsContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      const newActiveCard = Math.round(scrollLeft / cardWidth);
      setActiveCard(newActiveCard);
    }
  };

  const today = new Date();
  const dayName = format(today, 'EEEE').toUpperCase();
  const dateStr = format(today, 'MMM d').toUpperCase();

  const caloriesConsumed = data.caloriesGoal - data.caloriesLeft;
  const caloriesPercent = (caloriesConsumed / data.caloriesGoal) * 100;
  const waterPercent = (data.water.current / data.water.goal) * 100;
  const mealsPercent = (data.meals.eaten / data.meals.total) * 100;

  const userName = session?.user?.firstName || 'Alex';

  // Show loading while checking onboarding
  if (checkingOnboarding || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sidebar */}
      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
            <div>
              <p className="text-xs text-gray-500 font-medium tracking-wider">
                {dayName}, {dateStr}
              </p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                Hi, {userName}
              </h1>
            </div>
          </div>
          <Link href="/user/profile">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-2 border-orange-200">
              {session?.user?.avatar ? (
                <img 
                  src={session.user.avatar} 
                  alt="Profile" 
                
                  className=" w-full h-full rounded-full"
                />
              ) : (
                <User className="h-6 w-6 text-orange-400" />
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4 space-y-4 ">
        {/* Calories Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Calories Left</p>
              <div className="flex items-baseline mt-1">
                <span className="text-5xl font-bold text-gray-900">{data.caloriesLeft}</span>
                <span className="text-gray-500 text-lg ml-1">kcal</span>
              </div>
              <div className="flex items-center mt-2 bg-white/60 rounded-full px-3 py-1 w-fit">
                <span className="text-green-600 text-sm">🏁 Goal: {data.caloriesGoal.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Circular Progress */}
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${caloriesPercent * 2.51} 251`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Flame className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Protein</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.protein}g</p>
              <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Carbs</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.carbs}g</p>
              <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Fat</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{data.fat}g</p>
              <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Swipeable Image Cards - 1 at a time with 2 images per card */}
        <div className="relative">
          <div 
            ref={cardsContainerRef}
            onScroll={handleCardsScroll}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          >
            {/* Card 1 - Nutrition Tips */}
            <div className="min-w-full snap-start bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-5 text-white">
              <h4 className="font-bold text-lg mb-4">Nutrition Tips</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="h-24 bg-white/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&h=150&fit=crop" alt="Healthy breakfast" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <p className="font-semibold text-sm">Healthy Breakfast</p>
                  <p className="text-white/80 text-xs mt-1">Start your day right</p>
                </div>
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="h-24 bg-white/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=150&fit=crop" alt="Fresh salad" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <p className="font-semibold text-sm">Fresh Salads</p>
                  <p className="text-white/80 text-xs mt-1">Colorful vegetables</p>
                </div>
              </div>
            </div>
            
            {/* Card 2 - Fitness Goals */}
            <div className="min-w-full snap-start bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-5 text-white">
              <h4 className="font-bold text-lg mb-4">Fitness Goals</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="h-24 bg-white/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=150&fit=crop" alt="Workout" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <p className="font-semibold text-sm">Daily Workout</p>
                  <p className="text-white/80 text-xs mt-1">30 mins exercise</p>
                </div>
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="h-24 bg-white/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=200&h=150&fit=crop" alt="Running" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <p className="font-semibold text-sm">Cardio Run</p>
                  <p className="text-white/80 text-xs mt-1">Build endurance</p>
                </div>
              </div>
            </div>
            
            {/* Card 3 - Wellness */}
            <div className="min-w-full snap-start bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-5 text-white">
              <h4 className="font-bold text-lg mb-4">Wellness & Rest</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="h-24 bg-white/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=150&fit=crop" alt="Yoga" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <p className="font-semibold text-sm">Morning Yoga</p>
                  <p className="text-white/80 text-xs mt-1">Stretch & relax</p>
                </div>
                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="h-24 bg-white/30 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1531353826977-0941b4779a1c?w=200&h=150&fit=crop" alt="Sleep" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <p className="font-semibold text-sm">Quality Sleep</p>
                  <p className="text-white/80 text-xs mt-1">7-8 hours rest</p>
                </div>
              </div>
            </div>
          </div>
          {/* Swipe indicator dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {[0, 1, 2].map((index) => (
              <span 
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  activeCard === index ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-3xl text-gray-200">"</span>
            <div className="flex-1">
              <p className="text-gray-700 italic">
                "The only bad workout is the one that didn't happen."
              </p>
              <p className="text-green-600 text-xs font-semibold mt-2 tracking-wider uppercase">
                Daily Motivation
              </p>
            </div>
            <span className="text-3xl text-gray-200 self-end">"</span>
          </div>
        </div>

        {/* Water & Sleep Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Water Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Water</p>
              <span className="text-green-500 text-sm font-semibold">{Math.round(waterPercent)}%</span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <GlassWater className="h-16 w-16 text-blue-100" fill="#dbeafe" />
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-blue-400 rounded-b-full transition-all"
                  style={{ 
                    width: '50%', 
                    height: `${waterPercent * 0.6}%`,
                    maxHeight: '60%'
                  }}
                />
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.water.current}</span>
              <span className="text-gray-500 text-sm"> / {data.water.goal}L</span>
            </p>
          </div>

          {/* Sleep Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sleep</p>
              <span className="text-blue-500 text-sm font-semibold">{data.sleep.hours}h {data.sleep.minutes}m</span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Bed className="h-8 w-8 text-indigo-400" />
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.sleep.quality}</span>
              <span className="text-gray-500 text-sm"> %</span>
            </p>
          </div>
        </div>

        {/* Activity & Meals Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Activity Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Activity</p>
              <span className={`text-sm font-semibold ${data.activity.active ? 'text-green-500' : 'text-gray-400'}`}>
                {data.activity.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#fed7aa" strokeWidth="6" fill="none" />
                  <circle 
                    cx="32" cy="32" r="28" 
                    stroke="#f97316" 
                    strokeWidth="6" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={`${(data.activity.minutes / 60) * 176} 176`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.activity.minutes}</span>
              <span className="text-gray-500 text-sm"> min</span>
            </p>
          </div>

          {/* Meals Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Steps</p>
              <span className="text-green-500 text-sm font-semibold">{data.steps.current} / {data.steps.goal}</span>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="#d1fae5" strokeWidth="6" fill="none" />
                  <circle 
                    cx="32" cy="32" r="28" 
                    stroke="#10b981" 
                    strokeWidth="6" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={`${mealsPercent * 1.76} 176`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Utensils className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </div>
            <p className="text-center">
              <span className="text-2xl font-bold text-gray-900">{data.steps.current.toLocaleString()}</span>
              <span className="text-gray-500 text-sm"> Steps</span>
            </p>
          </div>
        </div>

        {/* Quick Log Section */}

<div>
  <h2 className="text-lg font-bold text-gray-900 mb-4">
    Quick Log
  </h2>

  {/* Scroll Container */}
  <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
    
    {/* Water */}
    <button className="min-w-[180px] bg-white rounded-3xl p-6 shadow-md flex flex-col items-center gap-4 hover:shadow-lg hover:bg-gray-50 transition-all">
      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
        <GlassWater className="h-8 w-8 text-blue-600" />
      </div>
      <span className="text-base font-semibold text-gray-900">
        Water
      </span>
      <span className="text-sm text-gray-400">
        +250 ml
      </span>
    </button>

    {/* Exercise */}
    <button className="min-w-[180px] bg-white rounded-3xl p-6 shadow-md flex flex-col items-center gap-4 hover:shadow-lg hover:bg-gray-50 transition-all">
      <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
        <Activity className="h-8 w-8 text-orange-500" />
      </div>
      <span className="text-base font-semibold text-gray-900">
        Exercise
      </span>
      <span className="text-sm text-gray-400">
        Log Activity
      </span>
    </button>

    {/* Sleep */}
    <button className="min-w-[180px] bg-white rounded-3xl p-6 shadow-md flex flex-col items-center gap-4 hover:shadow-lg hover:bg-gray-50 transition-all">
      <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
        <Moon className="h-8 w-8 text-indigo-500" />
      </div>
      <span className="text-base font-semibold text-gray-900">
        Sleep
      </span>
      <span className="text-sm text-gray-400">
        Duration
      </span>
    </button>

    {/* Steps */}
    <button className="min-w-[180px] bg-white rounded-3xl p-6 shadow-md flex flex-col items-center gap-4 hover:shadow-lg hover:bg-gray-50 transition-all">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
        <Footprints className="h-8 w-8 text-green-500" />
      </div>
      <span className="text-base font-semibold text-gray-900">
        Steps
      </span>
      <span className="text-sm text-gray-400">
        {data.steps.current.toLocaleString()}
      </span>
    </button>

  </div>
</div>

        {/* Blogs Section */}
        <div className="">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Blogs</h2>
            <Link href="/user/blogs" className="text-gray-400 text-sm font-medium uppercase tracking-wider">
              View All
            </Link>
          </div>
        </div>
        <div className="px-">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {/* Blog Card 1 */}
            <div className="min-w-[260px] snap-start bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-amber-100 to-orange-100 relative">
                <span className="absolute top-3 left-3 bg-white/90 text-xs font-semibold px-2 py-1 rounded-full text-gray-700">
                  NUTRITION
                </span>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  5 min read
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">Meal Prep 101: A Guide</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  Master the art of preparing healthy meals for the entire week in under two hours.
                </p>
                <Link href="/user/blogs/1" className="text-green-600 text-sm font-semibold mt-3 inline-flex items-center">
                  Read More <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>

            {/* Blog Card 2 */}
            <div className="min-w-[260px] snap-start bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-green-100 to-emerald-100 relative">
                <span className="absolute top-3 left-3 bg-white/90 text-xs font-semibold px-2 py-1 rounded-full text-gray-700">
                  FITNESS
                </span>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  4 min read
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">5 Moves for Core Strength</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  Strengthen your core with these simple yet effective exercises you can do anywhere.
                </p>
                <Link href="/user/blogs/2" className="text-green-600 text-sm font-semibold mt-3 inline-flex items-center">
                  Read More <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>

            {/* Blog Card 3 */}
            <div className="min-w-[260px] snap-start bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 relative">
                <span className="absolute top-3 left-3 bg-white/90 text-xs font-semibold px-2 py-1 rounded-full text-gray-700">
                  WELLNESS
                </span>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3" />
                  6 min read
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">Mindful Eating Habits</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                  Learn how to develop a healthier relationship with food through mindfulness.
                </p>
                <Link href="/user/blogs/3" className="text-green-600 text-sm font-semibold mt-3 inline-flex items-center">
                  Read More <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavBar />
    </div>
  );
}