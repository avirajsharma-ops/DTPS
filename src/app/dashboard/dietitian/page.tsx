'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  MessageCircle,
  Heart,
  CheckCircle,
  Activity,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function DietitianDashboard() {
  const { data: session } = useSession();

  // Dynamic data state
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    clientsWithMealPlans: 0,
    todaysAppointments: 0,
    confirmedAppointments: 0,
    pendingAppointments: 0,
    completedSessions: 0,
    completionRate: 0,
    activePercentage: 0,
    recentClients: [],
    todaysSchedule: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard/dietitian-stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error('Failed to fetch dashboard data');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);





  const pendingTasks = [
    { id: 1, task: 'Review Sarah\'s food log', priority: 'high' },
    { id: 2, task: 'Create meal plan for new client', priority: 'medium' },
    { id: 3, task: 'Update Mike\'s progress notes', priority: 'low' },
    { id: 4, task: 'Respond to Emma\'s message', priority: 'high' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Good morning, {session?.user?.firstName}!
            </h1>
            <p className="text-gray-600 mt-1">
              You have {stats.todaysAppointments} appointments scheduled for today
            </p>
          </div>
          <Button asChild>
            <Link href="/clients/new">Add New Client</Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Clients"
            value={stats.totalClients}
            description={`${stats.activeClients} active`}
            icon={<Users className="h-4 w-4" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Today's Appointments"
            value={stats.todaysAppointments}
            description={`${stats.confirmedAppointments} confirmed, ${stats.pendingAppointments} pending`}
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatsCard
            title="Active Programs"
            value={stats.clientsWithMealPlans}
            description="Clients with Diet plans"
            icon={<Activity className="h-4 w-4" />}
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="Completed Sessions"
            value={stats.completedSessions}
            description={`${stats.completionRate}% completion rate`}
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </div>

        {/* Client Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Client Overview</span>
              </CardTitle>
              <CardDescription className="">
                Your nutrition clients and their progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalClients}</div>
                    <div className="text-sm text-blue-700">Total Clients</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.activeClients}</div>
                    <div className="text-sm text-green-700">Active Clients</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Client Progress</span>
                    <span>{stats.activePercentage}% Active</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats.activePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/dietician/clients">
                  <Users className="h-4 w-4 mr-2" />
                  View My Clients
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/meal-plans/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Diet Plan
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/appointments">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/messages">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <Card className="">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <span>Today's Schedule</span>
              </CardTitle>
              <CardDescription className="">
                Your appointments for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading schedule...</p>
                  </div>
                ) : stats.todaysSchedule.length > 0 ? (
                  stats.todaysSchedule.map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{appointment.time}</p>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{appointment.clientName}</p>
                        <p className="text-xs text-gray-500">{appointment.type}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No appointments scheduled for today</p>
                  </div>
                )}
                
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/appointments">View All Appointments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Clients */}
          <Card className="">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Recent Clients</span>
              </CardTitle>
              <CardDescription className="">
                Latest client activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading clients...</p>
                  </div>
                ) : stats.recentClients.length > 0 ? (
                  stats.recentClients.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        {client.hasWooCommerceData && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                              🛒 {client.totalOrders} orders
                            </Badge>
                            <span className="text-xs text-gray-500">₹{client.totalSpent?.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/clients/${client.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No recent clients</p>
                  </div>
                )}
                
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/clients">View All Clients</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span>Pending Tasks</span>
              </CardTitle>
              <CardDescription>
                Items that need your attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{task.task}</p>
                    </div>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full mt-4">
                  View All Tasks
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                  <Link href="/meal-plans/create">
                    <Heart className="h-6 w-6" />
                    <span>Create Meal Plan</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                  <Link href="/messages">
                    <MessageCircle className="h-6 w-6" />
                    <span>Messages</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                  <Link href="/analytics">
                    <TrendingUp className="h-6 w-6" />
                    <span>Analytics</span>
                  </Link>
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                  <Link href="/appointments/schedule">
                    <Calendar className="h-6 w-6" />
                    <span>Schedule</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
