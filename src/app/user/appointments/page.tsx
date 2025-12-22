'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAppointments();
    }
  }, [session]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/client/appointments');
      if (response.ok) {
        const data = await response.json();
        // Handle the API response format
        if (data.appointments && Array.isArray(data.appointments)) {
          setAppointments(data.appointments.map((apt: any) => ({
            ...apt,
            date: new Date(apt.date)
          })));
        } else if (Array.isArray(data)) {
          setAppointments(data.map((apt: any) => ({
            ...apt,
            date: new Date(apt.date)
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(a => a.status === 'upcoming');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

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
        return <Badge className="bg-[#3AB1A0]/20 text-[#3AB1A0]">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-[#3AB1A0]/20 text-[#3AB1A0]">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-[#DB9C6E]/20 text-[#DB9C6E]">Rescheduled</Badge>;
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
              <div className="h-12 w-12 rounded-full bg-[#3AB1A0]/20 flex items-center justify-center">
                <User className="h-6 w-6 text-[#3AB1A0]" />
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
              <Button className="flex-1 bg-[#E06A26] hover:bg-[#d15a1a]">
                <TypeIcon className="h-4 w-4 mr-2" />
                Join Call
              </Button>
              <Button variant="outline" className="flex-1 border-[#3AB1A0] text-[#3AB1A0] hover:bg-[#3AB1A0]/10">
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

  if (status === 'loading' || loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/user" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Appointments</h1>
              <p className="text-xs text-gray-500">Manage your sessions</p>
            </div>
          </div>
          <Link href="/user/appointments/book">
            <Button size="sm" className="bg-[#E06A26] hover:bg-[#d15a1a]">
              <Plus className="h-4 w-4 mr-1" />
              Book
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Next Appointment Highlight */}
        {upcomingAppointments.length > 0 && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-[#3AB1A0]/10 to-[#3AB1A0]/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-[#3AB1A0]" />
                <span className="text-sm font-medium text-[#3AB1A0]">Next Appointment</span>
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
                <Button size="sm" className="bg-[#E06A26] hover:bg-[#d15a1a]">
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
                  <Button className="bg-[#E06A26] hover:bg-[#d15a1a]">
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
    </div>
  );
}
