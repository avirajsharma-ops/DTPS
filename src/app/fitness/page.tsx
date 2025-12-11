'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  TrendingUp,
  Target,
  Calendar,
  Award,
  Smartphone,
  Heart,
  Footprints,
  Flame
} from 'lucide-react';

const EnhancedFitnessTracker = dynamic(() => import('@/components/fitness/EnhancedFitnessTracker'), {
  ssr: false
});

interface DailyGoal {
  type: 'steps' | 'calories' | 'distance' | 'activeMinutes';
  target: number;
  current: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
}

export default function FitnessPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // Daily goals
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([
    {
      type: 'steps',
      target: 10000,
      current: 7500,
      unit: 'steps',
      icon: <Footprints className="h-5 w-5" />,
      color: 'blue'
    },
    {
      type: 'calories',
      target: 500,
      current: 320,
      unit: 'cal',
      icon: <Flame className="h-5 w-5" />,
      color: 'orange'
    },
    {
      type: 'distance',
      target: 5000,
      current: 3200,
      unit: 'm',
      icon: <Target className="h-5 w-5" />,
      color: 'green'
    },
    {
      type: 'activeMinutes',
      target: 60,
      current: 45,
      unit: 'min',
      icon: <Activity className="h-5 w-5" />,
      color: 'purple'
    }
  ]);

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSPWA = (window.navigator as any).standalone === true;
      setIsPWA(isStandalone || isIOSPWA);
    };

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkPWA();
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate progress percentage
  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Get progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  // Format distance
  const formatValue = (value: number, type: string) => {
    if (type === 'distance' && value >= 1000) {
      return `${(value / 1000).toFixed(1)} km`;
    }
    return value.toLocaleString();
  };

  if (!session?.user) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fitness Tracking</h1>
            <p className="text-gray-600 mt-1">
              Monitor your health and fitness goals
            </p>
          </div>
          {isPWA && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <Smartphone className="h-3 w-3 mr-1" />
              PWA Mode
            </Badge>
          )}
        </div>

        {/* Enhanced Fitness Tracker Component */}
        <EnhancedFitnessTracker clientOnly={true} />

        {/* Daily Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <span>Daily Goals</span>
            </CardTitle>
            <CardDescription>
              Track your progress towards daily fitness targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dailyGoals.map((goal) => {
                const progress = getProgress(goal.current, goal.target);
                const isCompleted = progress >= 100;
                
                return (
                  <div key={goal.type} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg bg-${goal.color}-100`}>
                        <div className={`text-${goal.color}-600`}>
                          {goal.icon}
                        </div>
                      </div>
                      {isCompleted && (
                        <Award className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {goal.type.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatValue(goal.current, goal.type)}
                        <span className="text-sm font-normal text-gray-500">
                          /{formatValue(goal.target, goal.type)} {goal.unit}
                        </span>
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Weekly Summary</span>
            </CardTitle>
            <CardDescription>
              Your fitness activity over the past 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Footprints className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-900">52,340</p>
                <p className="text-sm text-blue-600">Total Steps</p>
                <p className="text-xs text-gray-500 mt-1">Avg: 7,477/day</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-orange-900">2,240</p>
                <p className="text-sm text-orange-600">Calories Burned</p>
                <p className="text-xs text-gray-500 mt-1">Avg: 320/day</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Heart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-900">315</p>
                <p className="text-sm text-green-600">Active Minutes</p>
                <p className="text-xs text-gray-500 mt-1">Avg: 45/day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your fitness tracking settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button variant="outline" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Set Goals</span>
              </Button>
              
              <Button variant="outline" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>View History</span>
              </Button>
              
              <Button variant="outline" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
