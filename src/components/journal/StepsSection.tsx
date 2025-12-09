'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Footprints, Plus, Trash2, Loader2 } from 'lucide-react';
import TrackingStatsGrid from './TrackingStatsGrid';
// import TimeBasedBarChart from './TimeBasedBarChart';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StepsEntry {
  _id: string;
  steps: number;
  distance: number;
  calories: number;
  time: string;
}

interface StepsSectionProps {
  clientId: string;
  selectedDate: Date;
}

export default function StepsSection({ clientId, selectedDate }: StepsSectionProps) {
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ totalSteps: 0, totalDistance: 0, totalCalories: 0, target: 10000, percentage: 0 });
  
  const [newEntry, setNewEntry] = useState({
    steps: 0,
    distance: 0,
    calories: 0
  });

  // Fetch steps for the selected date
  const fetchSteps = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/journal/steps?date=${dateStr}&clientId=${clientId}`);
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || { totalSteps: 0, totalDistance: 0, totalCalories: 0, target: 10000, percentage: 0 });
      }
    } catch (error) {
      console.error('Error fetching steps:', error);
      toast.error('Failed to load steps');
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedDate]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const handleAddEntry = async () => {
    if (!newEntry.steps) {
      toast.error('Please enter steps count');
      return;
    }
    
    try {
      setSaving(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch('/api/journal/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          date: dateStr,
          clientId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || summary);
        setNewEntry({ steps: 0, distance: 0, calories: 0 });
        toast.success('Steps added successfully');
      } else {
        toast.error(data.error || 'Failed to add steps');
      }
    } catch (error) {
      console.error('Error adding steps:', error);
      toast.error('Failed to add steps');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/journal/steps?entryId=${id}&date=${dateStr}&clientId=${clientId}`, {
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

  const totalSteps = summary.totalSteps;
  const totalDistance = entries.reduce((sum, e) => sum + e.distance, 0);
  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  // Mock chart data
  const chartData = [
    { time: '6 am', values: [200, 150, 100] },
    { time: '8 am', values: [450, 350, 200] },
    { time: '10 am', values: [600, 450, 300] },
    { time: '12 pm', values: [500, 400, 250] },
    { time: '2 pm', values: [700, 550, 350] },
    { time: '4 pm', values: [650, 500, 300] },
    { time: '6 pm', values: [800, 600, 400] },
    { time: '8 pm', values: [550, 450, 280] },
    { time: '10 pm', values: [300, 250, 150] },
  ];

  const trackingStats = [
    { title: 'Daily Steps', value: totalSteps.toLocaleString(), percentage: summary.percentage, color: '#22c55e' },
    { title: 'Average Steps', value: '7500 steps', percentage: 75, color: '#3b82f6' },
    { title: 'Total Steps', value: '52500 steps', percentage: 65, color: '#f97316' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Add Steps Record Form */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4 text-blue-500" />
            Add Steps Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Steps Count</Label>
              <Input
                type="number"
                placeholder="0"
                value={newEntry.steps || ''}
                onChange={(e) => setNewEntry({ ...newEntry, steps: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Distance (km)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={newEntry.distance || ''}
                onChange={(e) => setNewEntry({ ...newEntry, distance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Calories Burned</Label>
              <Input
                type="number"
                placeholder="0"
                value={newEntry.calories || ''}
                onChange={(e) => setNewEntry({ ...newEntry, calories: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <Button onClick={handleAddEntry} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? 'Adding...' : 'Add Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Today's Steps */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Today's Steps</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-blue-600">
                {totalSteps.toLocaleString()} steps
              </Badge>
              <Badge variant="outline" className="text-green-600">
                {totalDistance.toFixed(2)} km
              </Badge>
              <Badge variant="outline" className="text-orange-600">
                {totalCalories} cal
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No steps recorded today</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div 
                  key={entry._id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div>
                    <p className="font-medium text-gray-800">{entry.steps.toLocaleString()} steps</p>
                    <p className="text-sm text-gray-500">
                      {entry.distance.toFixed(2)} km • {entry.calories} calories burned
                    </p>
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

      {/* Steps Tracking Stats */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Steps Tracking</CardTitle>
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

      {/* Steps Count Chart */}
      {/* <TimeBasedBarChart
        title="Steps Count"
        yAxisLabel="1000 steps"
        data={chartData}
        colors={['#3b82f6', '#8b5cf6', '#ef4444']}
        legends={[
          { label: 'Morning', color: '#3b82f6' },
          { label: 'Afternoon', color: '#8b5cf6' },
          { label: 'Evening', color: '#ef4444' },
        ]}
        maxValue={1000}
      /> */}
    </div>
  );
}
