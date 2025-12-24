'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import EnhancedFitnessTracker from '@/components/fitness/EnhancedFitnessTracker';

import { User, Calendar, Activity, MessageCircle, TrendingUp, Utensils, Droplet, Target, ChevronRight, Bell, Plus, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { RecipeCarousel } from '@/components/recipes/RecipeCarousel';

interface DashboardStats {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedDietitian?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    bio?: string;
    experience?: number;
    specializations?: string[];
  } | null;
  todayStats: {
    calories: {
      consumed: number;
      target: number;
      burned: number;
      remaining: number;
    };
    macros: {
      protein: { current: number; target: number; percentage: number };
      carbs: { current: number; target: number; percentage: number };
      fats: { current: number; target: number; percentage: number };
    };
    water: { current: number; target: number };
    steps: { current: number; target: number };
    sleep: { current: number; target: number };
  };
  weight: {
    current: number;
    target: number;
    start: number;
    change: number;
    unit: string;
  };
  streak: number;
  nextAppointment: {
    id: string;
    dietitian: { name: string; firstName: string };
    startTime: string;
    endTime: string;
    type: string;
    status: string;
  } | null;
}

export default function ClientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [waterAnimation, setWaterAnimation] = useState(false);
  const [stepsAnimation, setStepsAnimation] = useState(false);
  const [sleepAnimation, setSleepAnimation] = useState(false);
  const [weightAnimation, setWeightAnimation] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'client') {
      const redirectPath = session.user.role === 'admin' ? '/dashboard/admin' : '/dashboard/dietitian';
      router.push(redirectPath);
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.user.role === 'client') {
      fetchDashboardStats();
    }
  }, [session]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/client-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWaterClick = () => {
    if (stats) {
      setWaterGlasses(stats.todayStats.water.current);
      setShowWaterModal(true);
    }
  };

  const handleStepsClick = () => {
    if (stats) {
      setStepsCount(stats.todayStats.steps.current);
      setShowStepsModal(true);
    }
  };

  const handleSleepClick = () => {
    if (stats) {
      setSleepHours(stats.todayStats.sleep?.current || 0);
      setShowSleepModal(true);
    }
  };

  const handleWeightClick = async () => {
    if (stats) {
      setCurrentWeight(stats.weight.current);
      setTargetWeight(stats.weight.target);

      // Fetch weight history
      try {
        const response = await fetch('/api/tracking/weight');
        if (response.ok) {
          const data = await response.json();
          setWeightHistory(data.weight.history || []);
        }
      } catch (error) {
        console.error('Error fetching weight history:', error);
      }

      setShowWeightModal(true);
    }
  };

  const updateWater = async (action: 'increment' | 'decrement' | 'set', value?: number) => {
    try {
      const newValue = action === 'set' ? value :
                      action === 'increment' ? waterGlasses + 1 :
                      Math.max(0, waterGlasses - 1);

      // Update UI immediately for smooth animation
      setWaterGlasses(newValue || 0);

      // Show animation for increment
      if (action === 'increment' || (action === 'set' && value && value > waterGlasses)) {
        setWaterAnimation(true);
        setCelebrationMessage('💧 Great! You drank a glass of water!');
        setTimeout(() => {
          setWaterAnimation(false);
          setCelebrationMessage('');
        }, 2000);
      }

      const response = await fetch('/api/tracking/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          glasses: newValue
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update with server response to ensure consistency
        setWaterGlasses(data.water.glasses);
        // Refresh dashboard stats without full reload
        if (stats) {
          setStats({
            ...stats,
            todayStats: {
              ...stats.todayStats,
              water: { current: data.water.glasses, target: stats.todayStats.water.target }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating water:', error);
      // Revert on error
      if (stats) {
        setWaterGlasses(stats.todayStats.water.current);
      }
    }
  };

  const updateSteps = async (steps: number) => {
    try {
      // Show animation for steps increase
      if (steps > stepsCount) {
        setStepsAnimation(true);
        const increase = steps - stepsCount;
        setCelebrationMessage(`🎉 Awesome! You added ${increase} steps!`);
        setTimeout(() => {
          setStepsAnimation(false);
          setCelebrationMessage('');
        }, 2000);
      }

      const response = await fetch('/api/tracking/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps })
      });

      if (response.ok) {
        const data = await response.json();
        setStepsCount(data.steps.count);
        // Refresh dashboard stats
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error updating steps:', error);
    }
  };

  const updateSleep = async (hours: number) => {
    try {
      // Update UI immediately for smooth animation
      setSleepHours(hours);

      // Show animation
      setSleepAnimation(true);
      setCelebrationMessage(`😴 Great! You slept ${hours} hours last night!`);
      setTimeout(() => {
        setSleepAnimation(false);
        setCelebrationMessage('');
      }, 2000);

      const response = await fetch('/api/tracking/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours })
      });

      if (response.ok) {
        const data = await response.json();
        setSleepHours(data.sleep.hours);

        // Update dashboard stats without full reload
        if (stats) {
          setStats({
            ...stats,
            todayStats: {
              ...stats.todayStats,
              sleep: { current: data.sleep.hours, target: data.sleep.target }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating sleep:', error);
      // Revert on error
      if (stats) {
        setSleepHours(stats.todayStats.sleep?.current || 0);
      }
    }
  };

  const updateWeight = async (weight: number) => {
    try {
      // Update UI immediately for smooth animation
      setCurrentWeight(weight);

      // Show animation
      setWeightAnimation(true);
      setCelebrationMessage(`⚖️ Weight updated to ${weight}kg!`);
      setTimeout(() => {
        setWeightAnimation(false);
        setCelebrationMessage('');
      }, 2000);

      const response = await fetch('/api/tracking/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentWeight(data.weight.current);
        setWeightHistory(data.weight.history || []);

        // Update dashboard stats without full reload
        if (stats) {
          setStats({
            ...stats,
            weight: {
              current: data.weight.current,
              target: data.weight.target,
              start: stats.weight.start,
              change: data.weight.current - stats.weight.start,
              unit: stats.weight.unit
            }
          });
        }

        // Refresh dashboard stats to ensure sync
        fetchDashboardStats();
      }
    } catch (error) {
      console.error('Error updating weight:', error);
      // Revert on error
      if (stats) {
        setCurrentWeight(stats.weight.current);
      }
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingEmoji = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <LoadingSpinner className="h-12 w-12 mx-auto text-purple-500" />
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'client' || !stats) {
    return null;
  }

  const caloriesPercentage = Math.round((stats.todayStats.calories.consumed / stats.todayStats.calories.target) * 100);

  return (
    <>
      <InstallPrompt />
      <ServiceWorkerRegistration />

      {/* Main Content */}
      <div className="space-y-4">
        
        {/* Calorie Ring Card - Clean Design */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Today's Calories</h2>
            <Link href="/food-log" className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 active:scale-95 transition-all flex items-center shadow-sm">
              Log Food <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {/* Calorie Circle */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <svg className="transform -rotate-90" width="220" height="220">
                <circle cx="110" cy="110" r="95" stroke="#f3f4f6" strokeWidth="14" fill="none" />
                <circle
                  cx="110" cy="110" r="95"
                  stroke="url(#gradient)" strokeWidth="14" fill="none"
                  strokeDasharray={`${2 * Math.PI * 95}`}
                  strokeDashoffset={`${2 * Math.PI * 95 * (1 - caloriesPercentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{stats.todayStats.calories.remaining}</p>
                <p className="text-sm text-gray-500 font-semibold mt-1">Remaining</p>
              </div>
            </div>
          </div>

          {/* Calorie Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 bg-linear-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
              <p className="text-xs text-purple-700 font-semibold mb-1">Consumed</p>
              <p className="text-xl font-bold text-purple-600">{stats.todayStats.calories.consumed}</p>
            </div>
            <div className="text-center p-4 bg-linear-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200">
              <p className="text-xs text-orange-700 font-semibold mb-1">Burned</p>
              <p className="text-xl font-bold text-orange-600">{stats.todayStats.calories.burned}</p>
            </div>
            <div className="text-center p-4 bg-linear-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">Goal</p>
              <p className="text-xl font-bold text-blue-600">{stats.todayStats.calories.target}</p>
            </div>
          </div>
        </div>

        {/* Macros Card - Clean Design */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5">Macronutrients</h3>

          {/* Protein */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-base font-bold text-white">P</span>
                </div>
                <span className="text-base font-bold text-gray-800">Protein</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.todayStats.macros.protein.current}g / {stats.todayStats.macros.protein.target}g</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(stats.todayStats.macros.protein.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
                  <span className="text-base font-bold text-white">C</span>
                </div>
                <span className="text-base font-bold text-gray-800">Carbs</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.todayStats.macros.carbs.current}g / {stats.todayStats.macros.carbs.target}g</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(stats.todayStats.macros.carbs.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-sm">
                  <span className="text-base font-bold text-white">F</span>
                </div>
                <span className="text-base font-bold text-gray-800">Fats</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.todayStats.macros.fats.current}g / {stats.todayStats.macros.fats.target}g</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(stats.todayStats.macros.fats.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats Grid - Clean Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Water */}
          <button
            onClick={handleWaterClick}
            className="bg-white rounded-3xl shadow-md border border-gray-100 p-5 active:scale-95 transition-transform text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Droplet className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.todayStats.water.current}/{stats.todayStats.water.target}</span>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Water Glasses</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(stats.todayStats.water.current / stats.todayStats.water.target) * 100}%` }}
              />
            </div>
          </button>

          {/* Steps */}
          <button
            onClick={handleStepsClick}
            className="bg-white rounded-3xl shadow-md border border-gray-100 p-5 active:scale-95 transition-transform text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{(stats.todayStats.steps.current / 1000).toFixed(1)}k</span>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Steps Today</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                style={{ width: `${(stats.todayStats.steps.current / stats.todayStats.steps.target) * 100}%` }}
              />
            </div>
          </button>
        </div>

        {/* Sleep & Weight Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sleep */}
          <button
            onClick={handleSleepClick}
            className="bg-white rounded-3xl shadow-md border border-gray-100 p-5 active:scale-95 transition-transform text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm text-2xl">
                😴
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.todayStats.sleep?.current || 0}h</span>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Sleep Hours</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${((stats.todayStats.sleep?.current || 0) / (stats.todayStats.sleep?.target || 8)) * 100}%` }}
              />
            </div>
          </button>

          {/* Weight */}
          <button
            onClick={handleWeightClick}
            className="bg-white rounded-3xl shadow-md border border-gray-100 p-5 active:scale-95 transition-transform text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm text-2xl">
                ⚖️
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.weight.current}kg</span>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Current Weight</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-pink-500 to-rose-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((stats.weight.current / stats.weight.target) * 100, 100)}%` }}
              />
            </div>
          </button>
        </div>

        {/* Weight Progress */}
        {stats.weight.current > 0 && (
          <div className="bg-linear-to-br from-purple-500 to-pink-600 rounded-2xl shadow-sm p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Weight Progress</h3>
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-3xl font-bold">{stats.weight.current} {stats.weight.unit}</p>
                <p className="text-sm opacity-90 mt-1">Current</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.weight.target} {stats.weight.unit}</p>
                <p className="text-sm opacity-90 mt-1">Goal</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-3 border-t border-white/20">
              <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((stats.weight.start - stats.weight.current) / (stats.weight.start - stats.weight.target)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold">{stats.weight.change > 0 ? '+' : ''}{stats.weight.change} {stats.weight.unit} this week</span>
            </div>
          </div>
        )}

        {/* Assigned Dietitian */}
        {stats.assignedDietitian && (
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Your Dietitian</h3>
              <Link href="/messages" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
                Message
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-purple-500 to-pink-600 p-0.5 shadow-md shrink-0">
                <div className="h-full w-full rounded-2xl bg-white p-0.5">
                  {stats.assignedDietitian.avatar ? (
                    <img
                      src={stats.assignedDietitian.avatar}
                      alt={stats.assignedDietitian.firstName}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="h-full w-full rounded-2xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900">
                  Dr. {stats.assignedDietitian.firstName} {stats.assignedDietitian.lastName}
                </p>
                {stats.assignedDietitian.experience && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    {stats.assignedDietitian.experience} years experience
                  </p>
                )}
                {stats.assignedDietitian.specializations && stats.assignedDietitian.specializations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {stats.assignedDietitian.specializations.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/appointments" className="bg-white rounded-2xl shadow-sm p-4 flex items-center space-x-3 active:scale-95 transition-transform">
            <div className="h-12 w-12 rounded-xl p-[12px] bg-purple-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Appointments</p>
              <p className="text-xs text-gray-500">
                {stats.nextAppointment && stats.nextAppointment.startTime ?
                  (() => {
                    try {
                      return format(new Date(stats.nextAppointment.startTime), 'MMM d');
                    } catch (e) {
                      return 'View schedule';
                    }
                  })() : 'View schedule'}
              </p>
            </div>
          </Link>

          <Link href="/fitness" className="bg-white rounded-2xl shadow-sm p-4 flex items-center space-x-3 active:scale-95 transition-transform">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Fitness</p>
              <p className="text-xs text-gray-500">Track health metrics</p>
            </div>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/messages" className="bg-white rounded-2xl shadow-sm p-4 flex items-center space-x-3 active:scale-95 transition-transform">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Messages</p>
              <p className="text-xs text-gray-500">Chat with dietitian</p>
            </div>
          </Link>

          <Link href="/progress" className="bg-white rounded-2xl shadow-sm p-4 flex items-center space-x-3 active:scale-95 transition-transform">
            <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Progress</p>
              <p className="text-xs text-gray-500">View analytics</p>
            </div>
          </Link>
        </div>

        {/* Fitness Tracker Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Fitness Tracking</h2>
            <Link href="/fitness" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              View All
            </Link>
          </div>
          <EnhancedFitnessTracker clientOnly={true} />
        </div>

        {/* Healthy Recipes Carousel */}
        <RecipeCarousel />

        </div>

      {/* Quick Actions Menu */}
      {showQuickActions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[8px] z-40" onClick={() => setShowQuickActions(false)}>
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 pb-4">
            <button
              onClick={() => {
                setShowQuickActions(false);
                handleWaterClick();
              }}
              className="w-64 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 active:scale-95 transition-all animate-slide-up"
              style={{ animationDelay: '0ms' }}
            >
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0">
                <Droplet className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-gray-900">Add Water</span>
            </button>

            <button
              onClick={() => {
                setShowQuickActions(false);
                handleStepsClick();
              }}
              className="w-64 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 active:scale-95 transition-all animate-slide-up"
              style={{ animationDelay: '50ms' }}
            >
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-gray-900">Log Steps</span>
            </button>

            <button
              onClick={() => {
                setShowQuickActions(false);
                handleSleepClick();
              }}
              className="w-64 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 active:scale-95 transition-all animate-slide-up"
              style={{ animationDelay: '100ms' }}
            >
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                <span className="text-2xl">😴</span>
              </div>
              <span className="font-bold text-gray-900">Log Sleep</span>
            </button>

            <button
              onClick={() => {
                setShowQuickActions(false);
                handleWeightClick();
              }}
              className="w-64 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 active:scale-95 transition-all animate-slide-up"
              style={{ animationDelay: '150ms' }}
            >
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0">
                <span className="text-2xl">⚖️</span>
              </div>
              <span className="font-bold text-gray-900">Log Weight</span>
            </button>

            <Link
              href="/appointments"
              onClick={() => setShowQuickActions(false)}
              className="w-64 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 active:scale-95 transition-all animate-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-gray-900">Book Appointment</span>
            </Link>

            <Link
              href="/food-log"
              onClick={() => setShowQuickActions(false)}
              className="w-64 flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 active:scale-95 transition-all animate-slide-up"
              style={{ animationDelay: '250ms' }}
            >
              <div className="h-12 w-12 rounded-xl bg-linear-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                <Utensils className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-gray-900">View Meal Plan</span>
            </Link>
          </div>
        </div>
      )}

      {/* Celebration Animation Overlay */}
      {waterAnimation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="animate-bounce-in">
            <div className="bg-linear-to-r from-cyan-500 to-blue-500 text-white px-8 py-6 rounded-3xl shadow-2xl text-center transform scale-110">
              <div className="text-6xl mb-3 animate-pulse">💧</div>
              <p className="text-xl font-bold">{celebrationMessage}</p>
            </div>
          </div>
        </div>
      )}

      {stepsAnimation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="animate-bounce-in">
            <div className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-8 py-6 rounded-3xl shadow-2xl text-center transform scale-110">
              <div className="text-6xl mb-3 animate-pulse">👟</div>
              <p className="text-xl font-bold">{celebrationMessage}</p>
            </div>
          </div>
        </div>
      )}

      {sleepAnimation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="animate-bounce-in">
            <div className="bg-linear-to-r from-indigo-500 to-purple-500 text-white px-8 py-6 rounded-3xl shadow-2xl text-center transform scale-110">
              <div className="text-6xl mb-3 animate-pulse">😴</div>
              <p className="text-xl font-bold">{celebrationMessage}</p>
            </div>
          </div>
        </div>
      )}

      {weightAnimation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="animate-bounce-in">
            <div className="bg-linear-to-r from-pink-500 to-rose-500 text-white px-8 py-6 rounded-3xl shadow-2xl text-center transform scale-110">
              <div className="text-6xl mb-3 animate-pulse">⚖️</div>
              <p className="text-xl font-bold">{celebrationMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Water Modal */}
      {showWaterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowWaterModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Animated background */}
            <div className="absolute inset-0 bg-linear-to-br from-cyan-50 to-blue-50 opacity-50"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Water Intake</h3>
                <button onClick={() => setShowWaterModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  ✕
                </button>
              </div>

              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <Droplet className={`relative h-20 w-20 text-cyan-500 mx-auto transition-transform ${waterAnimation ? 'scale-125' : 'scale-100'}`} />
                </div>
                <div className={`text-7xl font-bold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2 transition-transform ${waterAnimation ? 'scale-110' : 'scale-100'}`}>
                  {waterGlasses}
                </div>
                <p className="text-gray-600 font-medium">glasses today</p>
              </div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => updateWater('decrement')}
                  className="h-16 w-16 rounded-2xl bg-linear-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all flex items-center justify-center text-3xl font-bold text-gray-700 shadow-md"
                >
                  −
                </button>
                <button
                  onClick={() => updateWater('increment')}
                  className="h-16 w-16 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 active:scale-95 transition-all flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                >
                  +
                </button>
              </div>

              <div className="relative z-10 grid grid-cols-4 gap-2">
                {[2, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => updateWater('set', num)}
                    className="py-3 px-3 rounded-xl bg-linear-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-200 active:scale-95 transition-all text-sm font-bold text-cyan-700"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps Modal */}
      {showStepsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowStepsModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Animated background */}
            <div className="absolute inset-0 bg-linear-to-br from-purple-50 to-pink-50 opacity-50"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Steps Today</h3>
                <button onClick={() => setShowStepsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  ✕
                </button>
              </div>

              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-purple-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <Activity className={`relative h-20 w-20 text-purple-500 mx-auto transition-transform ${stepsAnimation ? 'scale-125' : 'scale-100'}`} />
                </div>
                <div className={`text-7xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 transition-transform ${stepsAnimation ? 'scale-110' : 'scale-100'}`}>
                  {stepsCount.toLocaleString()}
                </div>
                <p className="text-gray-600 font-medium">steps today</p>
              </div>

              <div className="mb-6">
                <input
                  type="number"
                  value={stepsCount}
                  onChange={(e) => setStepsCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-4 rounded-2xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-center text-3xl font-bold bg-linear-to-br from-purple-50 to-pink-50 text-purple-700"
                  placeholder="Enter steps"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1000, 5000, 10000].map((num) => (
                  <button
                    key={num}
                    onClick={() => setStepsCount(num)}
                    className="py-3 px-3 rounded-xl bg-linear-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 active:scale-95 transition-all text-sm font-bold text-purple-700"
                  >
                    {(num / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  updateSteps(stepsCount);
                  setShowStepsModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all text-white font-bold text-lg shadow-lg"
              >
                Save Steps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Modal */}
      {showSleepModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowSleepModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Animated background */}
            <div className="absolute inset-0 bg-linear-to-br from-indigo-50 to-purple-50 opacity-50"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Sleep Tracking</h3>
                <button onClick={() => setShowSleepModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  ✕
                </button>
              </div>

              {/* Current Sleep Display */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-indigo-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className={`relative text-6xl transition-transform ${sleepAnimation ? 'scale-125' : 'scale-100'}`}>😴</div>
                </div>
                <div className={`text-5xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 transition-transform ${sleepAnimation ? 'scale-110' : 'scale-100'}`}>
                  {sleepHours.toFixed(1)}
                </div>
                <p className="text-gray-600 font-medium">hours last night</p>

                {/* Sleep Quality Indicator */}
                <div className="mt-4 p-3 bg-white/60 rounded-xl">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Sleep Quality</span>
                    <span>Target: 8h</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (sleepHours / 8) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {sleepHours >= 7 && sleepHours <= 9 ?
                      '✨ Excellent sleep duration!' :
                      sleepHours < 7 ?
                        `Need ${(7 - sleepHours).toFixed(1)} more hours` :
                        'Consider reducing sleep time'
                    }
                  </p>
                </div>
              </div>

              {/* Sleep Duration Input */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => setSleepHours(Math.max(0, sleepHours - 0.5))}
                    className="h-14 w-14 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-gray-700 shadow-md"
                  >
                    −
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
                      className="w-full text-center text-2xl font-bold bg-transparent border-2 border-indigo-200 rounded-xl py-2 px-4 focus:border-indigo-500 focus:outline-none"
                      step="0.5"
                      min="0"
                      max="24"
                    />
                  </div>

                  <button
                    onClick={() => setSleepHours(sleepHours + 0.5)}
                    className="h-14 w-14 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  >
                    +
                  </button>
                </div>

                {/* Quick Sleep Duration Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSleepHours(num)}
                      className={`py-3 px-3 rounded-xl border active:scale-95 transition-all text-sm font-bold ${
                        sleepHours === num
                          ? 'bg-linear-to-br from-indigo-500 to-purple-500 text-white border-indigo-500'
                          : 'bg-linear-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 text-indigo-700'
                      }`}
                    >
                      {num}h
                    </button>
                  ))}
                </div>

                {/* Sleep Time Presets */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Quick Nap', hours: 1.5 },
                    { label: 'Power Sleep', hours: 6.5 },
                    { label: 'Full Rest', hours: 8.5 },
                    { label: 'Long Sleep', hours: 9.5 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setSleepHours(preset.hours)}
                      className="py-2 px-3 rounded-lg bg-linear-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 active:scale-95 transition-all text-xs font-medium text-indigo-700"
                    >
                      {preset.label}
                      <br />
                      <span className="text-indigo-500">{preset.hours}h</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  updateSleep(sleepHours);
                  setShowSleepModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all text-white font-bold text-lg shadow-lg"
              >
                Save Sleep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowWeightModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Animated background */}
            <div className="absolute inset-0 bg-linear-to-br from-pink-50 to-rose-50 opacity-50"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold bg-linear-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Weight Tracking</h3>
                <button onClick={() => setShowWeightModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  ✕
                </button>
              </div>

              {/* Current Weight Display */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-pink-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className={`relative text-6xl transition-transform ${weightAnimation ? 'scale-125' : 'scale-100'}`}>⚖️</div>
                </div>
                <div className={`text-5xl font-bold bg-linear-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2 transition-transform ${weightAnimation ? 'scale-110' : 'scale-100'}`}>
                  {currentWeight.toFixed(1)}
                </div>
                <p className="text-gray-600 font-medium">kg current weight</p>

                {/* Progress to Goal */}
                <div className="mt-4 p-3 bg-white/60 rounded-xl">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress to Goal</span>
                    <span>{targetWeight}kg target</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((targetWeight - Math.abs(currentWeight - targetWeight)) / targetWeight) * 100))}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {currentWeight > targetWeight ?
                      `${(currentWeight - targetWeight).toFixed(1)}kg above target` :
                      `${(targetWeight - currentWeight).toFixed(1)}kg to go`
                    }
                  </p>
                </div>
              </div>

              {/* Weight History Mini Chart */}
              {weightHistory.length > 0 && (
                <div className="mb-6 p-4 bg-white/60 rounded-xl">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Progress</h4>
                  <div className="flex items-end justify-between h-16 gap-1">
                    {weightHistory.slice(0, 7).reverse().map((entry, index) => {
                      const maxWeight = Math.max(...weightHistory.map(e => e.value));
                      const minWeight = Math.min(...weightHistory.map(e => e.value));
                      const range = maxWeight - minWeight || 1;
                      const height = ((entry.value - minWeight) / range) * 100;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-linear-to-t from-pink-500 to-rose-400 rounded-t-sm transition-all duration-300"
                            style={{ height: `${Math.max(height, 10)}%` }}
                          />
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(entry.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{Math.min(...weightHistory.map(e => e.value)).toFixed(1)}kg</span>
                    <span>{Math.max(...weightHistory.map(e => e.value)).toFixed(1)}kg</span>
                  </div>
                </div>
              )}

              {/* Weight Input Controls */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => setCurrentWeight(Math.max(0, currentWeight - 0.1))}
                    className="h-14 w-14 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-gray-700 shadow-md"
                  >
                    −
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                      className="w-full text-center text-2xl font-bold bg-transparent border-2 border-pink-200 rounded-xl py-2 px-4 focus:border-pink-500 focus:outline-none"
                      step="0.1"
                      min="0"
                      max="500"
                    />
                  </div>

                  <button
                    onClick={() => setCurrentWeight(currentWeight + 0.1)}
                    className="h-14 w-14 rounded-xl bg-linear-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 transition-all flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  >
                    +
                  </button>
                </div>

                {/* Quick Weight Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[-1, -0.5, +0.5, +1].map((change) => (
                    <button
                      key={change}
                      onClick={() => setCurrentWeight(Math.max(0, currentWeight + change))}
                      className="py-2 px-3 rounded-lg bg-linear-to-br from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 border border-pink-200 active:scale-95 transition-all text-sm font-bold text-pink-700"
                    >
                      {change > 0 ? '+' : ''}{change}kg
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  updateWeight(currentWeight);
                  setShowWeightModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 active:scale-95 transition-all text-white font-bold text-lg shadow-lg"
              >
                Save Weight
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

