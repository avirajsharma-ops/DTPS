'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Plus, Trash2, Loader2 } from 'lucide-react';
import TrackingStatsGrid from './TrackingStatsGrid';
// import TimeBasedBarChart from './TimeBasedBarChart';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SleepEntry {
  _id: string;
  hours: number;
  minutes: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  time: string;
}

interface SleepSectionProps {
  clientId: string;
  selectedDate: Date;
}

export default function SleepSection({ clientId, selectedDate }: SleepSectionProps) {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ totalMinutes: 0, totalHours: 0, remainingMinutes: 0, displayTime: '0h 0m', target: 8, percentage: 0 });
  
  const [newEntry, setNewEntry] = useState({
    hours: 0,
    minutes: 0,
    quality: '' as string
  });

  // Fetch sleep entries for the selected date
  const fetchSleep = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/journal/sleep?date=${dateStr}&clientId=${clientId}`);
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || { totalMinutes: 0, totalHours: 0, remainingMinutes: 0, displayTime: '0h 0m', target: 8, percentage: 0 });
      }
    } catch (error) {
      console.error('Error fetching sleep:', error);
      toast.error('Failed to load sleep data');
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedDate]);

  useEffect(() => {
    fetchSleep();
  }, [fetchSleep]);

  const handleAddEntry = async () => {
    if (!newEntry.hours && !newEntry.minutes) {
      toast.error('Please enter hours or minutes');
      return;
    }
    
    try {
      setSaving(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch('/api/journal/sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          quality: newEntry.quality || 'Fair',
          date: dateStr,
          clientId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || summary);
        setNewEntry({ hours: 0, minutes: 0, quality: '' });
        toast.success('Sleep record added successfully');
      } else {
        toast.error(data.error || 'Failed to add sleep record');
      }
    } catch (error) {
      console.error('Error adding sleep:', error);
      toast.error('Failed to add sleep record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/journal/sleep?entryId=${id}&date=${dateStr}&clientId=${clientId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || summary);
        toast.success('Entry deleted');
      } else {
        toast.error(data.error || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const totalMinutes = summary.totalMinutes;
  const totalHours = summary.totalHours;
  const remainingMinutes = summary.remainingMinutes;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Excellent': return 'bg-green-100 text-green-700';
      case 'Good': return 'bg-blue-100 text-blue-700';
      case 'Fair': return 'bg-yellow-100 text-yellow-700';
      case 'Poor': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Mock chart data
  const chartData = [
    { time: '6 am', values: [30, 25, 15] },
    { time: '8 am', values: [45, 35, 20] },
    { time: '10 am', values: [50, 40, 25] },
    { time: '12 pm', values: [40, 30, 20] },
    { time: '2 pm', values: [55, 45, 30] },
    { time: '4 pm', values: [48, 38, 22] },
    { time: '6 pm', values: [60, 50, 35] },
    { time: '8 pm', values: [52, 42, 28] },
    { time: '10 pm', values: [35, 28, 18] },
  ];

  const sleepPercentage = summary.percentage;

  const trackingStats = [
    { title: 'Daily Sleep', value: `${totalHours}h ${remainingMinutes}m`, percentage: sleepPercentage, color: '#22c55e' },
    { title: 'Average Sleep', value: '7.2 hrs', percentage: 85, color: '#3b82f6' },
    { title: 'Total Sleep', value: '50.4 hrs', percentage: 82, color: '#f97316' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Add Sleep Record Form */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-indigo-500" />
            Add Sleep Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Hours</Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                max="24"
                value={newEntry.hours || ''}
                onChange={(e) => setNewEntry({ ...newEntry, hours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Minutes</Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                max="59"
                value={newEntry.minutes || ''}
                onChange={(e) => setNewEntry({ ...newEntry, minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Sleep Quality</Label>
              <Select
                value={newEntry.quality}
                onValueChange={(value) => setNewEntry({ ...newEntry, quality: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quality..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={handleAddEntry} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? 'Adding...' : 'Add Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Today's Sleep */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Today's Sleep</CardTitle>
            <Badge variant="outline" className="text-indigo-600">
              {totalHours}h {remainingMinutes}m total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No sleep recorded today</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={entry._id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">
                      {entry.hours}h {entry.minutes}m
                    </p>
                    <Badge className={getQualityColor(entry.quality)} variant="secondary">
                      {entry.quality}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{entry.time}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteEntry(entry._id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleep Tracking Stats */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Sleep Tracking</CardTitle>
            {/* <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button> */}
          </div>
        </CardHeader>
        <CardContent>
          <TrackingStatsGrid stats={trackingStats} />
        </CardContent>
      </Card>

      {/* Sleep Quality Chart */}
      {/* <TimeBasedBarChart
        title="Sleep Quality"
        yAxisLabel="1 hr"
        data={chartData}
        colors={['#3b82f6', '#8b5cf6', '#ef4444']}
        legends={[
          { label: 'Deep', color: '#3b82f6' },
          { label: 'Light', color: '#8b5cf6' },
          { label: 'REM', color: '#ef4444' },
        ]}
        maxValue={70}
      /> */}
    </div>
  );
}
