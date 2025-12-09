'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export default function BookingsSection() {
  return (
    <div className="mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Appointment Bookings</CardTitle>
          <Button size="sm">Schedule Appointment</Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No appointments scheduled</p>
            <p className="text-sm mt-2">Schedule your first appointment with the client</p>
            <Button className="mt-4" variant="outline">Book Now</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
