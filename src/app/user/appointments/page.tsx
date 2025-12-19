'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ResponsiveLayout } from '@/components/client/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  MapPin,
  User,
  Plus,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import Link from 'next/link';

interface Appointment {
  id: string;
  dietitianId: string;
  dietitianName: string;
  dietitianImage?: string;
  date: Date;
  time: string;
  duration: number;
  type: 'video' | 'audio' | 'in-person';
  status: 'upcoming' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
}

export default function UserAppointmentsPage() {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/client/appointments');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default appointments
  const defaultAppointments: Appointment[] = [
    {
      id: '1',
      dietitianId: 'd1',
      dietitianName: 'Dr. Sarah Smith',
      date: addDays(new Date(), 1),
      time: '10:00 AM',
      duration: 30,
      type: 'video',
      status: 'upcoming',
      notes: 'Weekly check-in and meal plan review',
    },
    {
      id: '2',
      dietitianId: 'd1',
      dietitianName: 'Dr. Sarah Smith',
      date: addDays(new Date(), 7),
      time: '2:00 PM',
      duration: 45,
      type: 'video',
      status: 'upcoming',
      notes: 'Monthly progress review',
    },
    {
      id: '3',
      dietitianId: 'd1',
      dietitianName: 'Dr. Sarah Smith',
      date: addDays(new Date(), -7),
      time: '11:00 AM',
      duration: 30,
      type: 'video',
      status: 'completed',
    },
    {
      id: '4',
      dietitianId: 'd1',
      dietitianName: 'Dr. Sarah Smith',
      date: addDays(new Date(), -14),
      time: '3:00 PM',
      duration: 30,
      type: 'audio',
      status: 'completed',
    },
  ];

  const displayAppointments = appointments.length > 0 ? appointments : defaultAppointments;

  const upcomingAppointments = displayAppointments.filter(a => a.status === 'upcoming');
  const pastAppointments = displayAppointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'audio': return Phone;
      case 'in-person': return MapPin;
      default: return Video;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-yellow-100 text-yellow-700">Rescheduled</Badge>;
      default:
        return null;
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
    const TypeIcon = getTypeIcon(appointment.type);
    const isUpcoming = appointment.status === 'upcoming';

    return (
      <Card className={`border-0 shadow-sm ${isUpcoming ? 'bg-white' : 'bg-gray-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{appointment.dietitianName}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <TypeIcon className="h-3 w-3" />
                  <span className="capitalize">{appointment.type} Call</span>
                </div>
              </div>
            </div>
            {getStatusBadge(appointment.status)}
          </div>

          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {getDateLabel(appointment.date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {appointment.time} ({appointment.duration} min)
              </span>
            </div>
          </div>

          {appointment.notes && (
            <p className="text-sm text-gray-500 mb-3">{appointment.notes}</p>
          )}

          {isUpcoming && (
            <div className="flex items-center gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                <TypeIcon className="h-4 w-4 mr-2" />
                Join Call
              </Button>
              <Button variant="outline" className="flex-1">
                Reschedule
              </Button>
            </div>
          )}

          {appointment.status === 'completed' && (
            <Button variant="ghost" className="w-full text-gray-600">
              View Summary
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ResponsiveLayout 
      title="Appointments" 
      subtitle="Manage your sessions"
      headerAction={
        <Link href="/user/appointments/book">
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">Book Appointment</span>
            <span className="md:hidden">Book</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Next Appointment Highlight */}
        {upcomingAppointments.length > 0 && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Next Appointment</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {upcomingAppointments[0].dietitianName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {getDateLabel(upcomingAppointments[0].date)} at {upcomingAppointments[0].time}
                  </p>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-white">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-lg data-[state=active]:bg-white">
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No upcoming appointments</p>
                <Link href="/user/appointments/book">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Book an Appointment
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-4">
            {pastAppointments.length > 0 ? (
              pastAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No past appointments</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
}
