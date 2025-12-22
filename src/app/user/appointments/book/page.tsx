'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertCircle,
  ArrowLeft,
  Video,
  Phone,
  MapPin,
  Check
} from 'lucide-react';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { toast } from 'sonner';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface Dietitian {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  specializations?: string[];
  consultationFee?: number;
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
}

export default function BookAppointmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dietitian, setDietitian] = useState<Dietitian | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentType, setAppointmentType] = useState<'video' | 'audio' | 'in-person'>('video');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAssignedDietitian();
    }
  }, [session]);

  useEffect(() => {
    if (dietitian && selectedDate) {
      generateTimeSlots();
    }
  }, [dietitian, selectedDate]);

  const fetchAssignedDietitian = async () => {
    try {
      setLoading(true);
      // Get current user to find assigned dietitian
      const userResponse = await fetch('/api/client/profile');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        const assignedDietitianId = userData.user?.assignedDietitian || userData.assignedDietitian;
        
        if (assignedDietitianId) {
          // Fetch dietitian details
          const dietitianResponse = await fetch(`/api/users/${assignedDietitianId}`);
          if (dietitianResponse.ok) {
            const dietitianData = await dietitianResponse.json();
            setDietitian(dietitianData.user || dietitianData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dietitian:', error);
      toast.error('Failed to load dietitian information');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    if (!dietitian || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const dayOfWeek = selectedDate.getDay();
    const availability = dietitian.availability?.find(
      avail => avail.dayOfWeek === dayOfWeek
    );

    if (!availability) {
      setAvailableSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const time24 = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      const hour12 = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
      const ampm = currentHour >= 12 ? 'PM' : 'AM';
      const display = `${hour12}:${currentMin.toString().padStart(2, '0')} ${ampm}`;
      
      slots.push({
        time: time24,
        display,
        available: true // In production, check against existing appointments
      });
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }

    setAvailableSlots(slots);
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    if (isBefore(date, new Date())) return true;
    
    // Disable dates more than 30 days in the future
    if (isAfter(date, addDays(new Date(), 30))) return true;
    
    // Check dietitian availability for this day
    if (dietitian?.availability) {
      const dayOfWeek = date.getDay();
      const hasAvailability = dietitian.availability.some(
        avail => avail.dayOfWeek === dayOfWeek
      );
      return !hasAvailability;
    }
    
    return false;
  };

  const handleBookAppointment = async () => {
    if (!dietitian || !selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }

    setBooking(true);
    try {
      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const response = await fetch('/api/client/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietitianId: dietitian._id,
          scheduledAt: scheduledAt.toISOString(),
          duration: 30,
          type: appointmentType === 'video' ? 'video_consultation' : appointmentType,
          notes: notes || undefined
        })
      });

      if (response.ok) {
        toast.success('Appointment booked successfully!');
        router.push('/user/appointments');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  if (!dietitian) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/user/appointments" className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Book Appointment</h1>
          </div>
        </div>
        <div className="px-4 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Dietitian Assigned</h2>
          <p className="text-gray-500 mb-4">Please contact support to get a dietitian assigned to you.</p>
          <Link href="/user">
            <Button className="bg-[#E06A26] hover:bg-[#d15a1a]">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/user/appointments" className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Book Appointment</h1>
            <p className="text-xs text-gray-500">Step {step} of 3</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s <= step ? 'bg-[#E06A26]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Dietitian Info */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-[#3AB1A0]/20 flex items-center justify-center overflow-hidden">
                {dietitian.avatar ? (
                  <img src={dietitian.avatar} alt={dietitian.firstName} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-[#3AB1A0]" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {dietitian.firstName} {dietitian.lastName}
                </h3>
                <p className="text-sm text-gray-500">Your Dietitian</p>
                {dietitian.specializations && dietitian.specializations.length > 0 && (
                  <p className="text-xs text-[#3AB1A0] mt-1">
                    {dietitian.specializations.slice(0, 2).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Select Date */}
        {step === 1 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-[#E06A26]" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                className="rounded-xl border-0"
              />
              <Button
                className="w-full mt-4 bg-[#E06A26] hover:bg-[#d15a1a]"
                disabled={!selectedDate}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Time & Type */}
        {step === 2 && (
          <>
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#E06A26]" />
                  Select Time - {selectedDate && format(selectedDate, 'EEE, MMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? 'bg-[#E06A26] text-white'
                            : slot.available
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No available slots for this day</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold">Appointment Type</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {[
                  { type: 'video', icon: Video, label: 'Video Call', desc: 'Face-to-face online consultation' },
                  { type: 'audio', icon: Phone, label: 'Audio Call', desc: 'Voice-only consultation' },
                  { type: 'in-person', icon: MapPin, label: 'In-Person', desc: 'Visit the clinic' }
                ].map(({ type, icon: Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setAppointmentType(type as any)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      appointmentType === type
                        ? 'border-[#E06A26] bg-[#E06A26]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      appointmentType === type ? 'bg-[#E06A26]/20' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${appointmentType === type ? 'text-[#E06A26]' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${appointmentType === type ? 'text-[#E06A26]' : 'text-gray-900'}`}>
                        {label}
                      </p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    {appointmentType === type && (
                      <Check className="h-5 w-5 text-[#E06A26]" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1 bg-[#E06A26] hover:bg-[#d15a1a]"
                disabled={!selectedTime}
                onClick={() => setStep(3)}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Confirm & Notes */}
        {step === 3 && (
          <>
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold">Appointment Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {availableSlots.find(s => s.time === selectedTime)?.display} • 30 min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  {appointmentType === 'video' ? (
                    <Video className="h-5 w-5 text-gray-400" />
                  ) : appointmentType === 'audio' ? (
                    <Phone className="h-5 w-5 text-gray-400" />
                  ) : (
                    <MapPin className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 capitalize">{appointmentType} Consultation</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-semibold">Additional Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific topics you'd like to discuss?"
                  rows={3}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                className="flex-1 bg-[#E06A26] hover:bg-[#d15a1a]"
                disabled={booking}
                onClick={handleBookAppointment}
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
