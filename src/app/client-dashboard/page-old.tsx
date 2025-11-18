'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { InstallButton } from '@/components/pwa/InstallButton';
import { User, ShoppingBag, Calendar, LogOut, Mail, Activity, BookOpen, MessageCircle, TrendingUp, Heart, Utensils, Droplet, Flame, Target, Award, ChevronRight, Bell, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Redirect non-client users to appropriate dashboard
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'client') {
      // Redirect to appropriate dashboard based on role
      const redirectPath = session.user.role === 'admin'
        ? '/dashboard/admin'
        : session.user.role === 'dietitian' || session.user.role === 'health_counselor'
        ? '/dashboard/dietitian'
        : '/dashboard/client';
      router.push(redirectPath);
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  // Mock data for beautiful UI
  const todayStats = {
    calories: { current: 1450, target: 1800, percentage: 81 },
    water: { current: 6, target: 8, percentage: 75 },
    steps: { current: 7234, target: 10000, percentage: 72 },
    weight: { current: 68.5, target: 65, unit: 'kg' }
  };

  const quickActions = [
    { icon: Utensils, label: 'Log Meal', color: 'from-orange-400 to-pink-500', href: '/food-log' },
    { icon: Droplet, label: 'Water', color: 'from-blue-400 to-cyan-500', href: '/water-log' },
    { icon: Activity, label: 'Exercise', color: 'from-purple-400 to-indigo-500', href: '/exercise-log' },
    { icon: Calendar, label: 'Appointments', color: 'from-green-400 to-emerald-500', href: '/appointments' },
  ];

  const upcomingAppointment = {
    date: 'Tomorrow',
    time: '10:00 AM',
    dietitian: 'Dr. Sarah Johnson',
    type: 'Follow-up Consultation'
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="h-12 w-12 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'client') {
    return null;
  }

  return (
    <>
      {/* PWA Components */}
      <ServiceWorkerRegistration />
      <InstallPrompt />

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        {/* Mobile-First Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  Welcome, {session.user.firstName || session.user.name}
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">Your Nutrition Program Dashboard</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <InstallButton variant="outline" size="sm" className="hidden sm:flex" />
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Mobile-First Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{session.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{session.user.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">{session.user.city && session.user.country ? `${session.user.city}, ${session.user.country}` : 'Not provided'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Orders</span>
                <Badge variant="secondary">{session.user.totalOrders || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Spent</span>
                <span className="font-bold text-green-600">₹{(session.user.totalSpent || 0).toFixed(2)}</span>
              </div>
              {session.user.isWooCommerceClient && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Account Type</span>
                  <Badge variant="outline">WooCommerce Client</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage your nutrition program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <Calendar className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Book Consultation</div>
                    <div className="text-xs text-gray-500">Schedule with dietitian</div>
                  </div>
                </Button>
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <BookOpen className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">View Meal Plans</div>
                    <div className="text-xs text-gray-500">Check your diet plan</div>
                  </div>
                </Button>
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <TrendingUp className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Track Progress</div>
                    <div className="text-xs text-gray-500">Monitor your journey</div>
                  </div>
                </Button>
                <Button className="w-full justify-start" variant="outline" size="lg">
                  <MessageCircle className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Contact Support</div>
                    <div className="text-xs text-gray-500">Get help anytime</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Welcome to Your Nutrition Journey!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Your Account is Active</h3>
              <p className="text-blue-800 text-sm">
                You have successfully logged into your nutrition program dashboard.
                Your dietitian can now contact you and track your progress.
                {session.user.isWooCommerceClient && (
                  <>You have {session.user.totalOrders || 0} orders totaling ₹{(session.user.totalSpent || 0).toFixed(2)}.</>
                )}
              </p>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900">Next Steps</h4>
                <ul className="text-sm text-green-800 mt-2 space-y-1">
                  <li>• Complete your health assessment</li>
                  <li>• Schedule your first consultation</li>
                  <li>• Review your Diet plans</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900">Need Help?</h4>
                <p className="text-sm text-yellow-800 mt-2">
                  Contact your assigned dietitian for personalized guidance and support.
                </p>
                <Button size="sm" className="mt-2" variant="outline">
                  <Mail className="h-3 w-3 mr-1" />
                  Send Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
