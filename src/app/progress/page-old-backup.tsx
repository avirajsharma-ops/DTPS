'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Scale,
  Ruler,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface ProgressEntry {
  _id: string;
  type: string;
  value: number;
  unit: string;
  notes?: string;
  recordedAt: string;
}

interface LatestEntries {
  [key: string]: ProgressEntry;
}

export default function ProgressPage() {
  const { data: session } = useSession();
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [latestEntries, setLatestEntries] = useState<LatestEntries>({});
  const [loading, setLoading] = useState(true);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [selectedType, setSelectedType] = useState('weight');
  
  // Form state
  const [type, setType] = useState('weight');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('kg');
  const [notes, setNotes] = useState('');

  const progressTypes = [
    { value: 'weight', label: 'Weight', unit: 'kg', icon: Scale },
    { value: 'body_fat', label: 'Body Fat %', unit: '%', icon: Target },
    { value: 'muscle_mass', label: 'Muscle Mass', unit: 'kg', icon: TrendingUp },
    { value: 'waist', label: 'Waist', unit: 'cm', icon: Ruler },
    { value: 'chest', label: 'Chest', unit: 'cm', icon: Ruler },
    { value: 'hips', label: 'Hips', unit: 'cm', icon: Ruler },
  ];

  useEffect(() => {
    fetchProgressEntries();
  }, []);

  const fetchProgressEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/progress');
      if (response.ok) {
        const data = await response.json();
        setProgressEntries(data.progressEntries);
        setLatestEntries(data.latestEntries);
      }
    } catch (error) {
      console.error('Error fetching progress entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          value: parseFloat(value),
          unit,
          notes: notes || undefined,
          recordedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        // Reset form
        setValue('');
        setNotes('');
        setIsAddingEntry(false);
        
        // Refresh data
        fetchProgressEntries();
      }
    } catch (error) {
      console.error('Error adding progress entry:', error);
    }
  };

  const getEntriesForType = (entryType: string) => {
    return progressEntries
      .filter(entry => entry.type === entryType)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  };

  const getChartData = (entryType: string) => {
    const entries = getEntriesForType(entryType);
    return entries.map(entry => ({
      date: format(new Date(entry.recordedAt), 'MMM dd'),
      value: entry.value,
      fullDate: entry.recordedAt
    }));
  };

  const getTrend = (entryType: string) => {
    const entries = getEntriesForType(entryType);
    if (entries.length < 2) return null;
    
    const latest = entries[entries.length - 1];
    const previous = entries[entries.length - 2];
    const change = latest.value - previous.value;
    
    return {
      change,
      isPositive: change > 0,
      percentage: Math.abs((change / previous.value) * 100)
    };
  };

  const selectedTypeData = progressTypes.find(pt => pt.value === selectedType);
  const chartData = getChartData(selectedType);
  const trend = getTrend(selectedType);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor your health journey</p>
          </div>
          
          <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Progress Entry</DialogTitle>
                <DialogDescription>
                  Record your latest measurements
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddEntry} className="space-y-4">
                <div>
                  <Label htmlFor="type">Measurement Type</Label>
                  <Select value={type} onValueChange={(value) => {
                    setType(value);
                    const selectedType = progressTypes.find(pt => pt.value === value);
                    if (selectedType) {
                      setUnit(selectedType.unit);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {progressTypes.map((progressType) => (
                        <SelectItem key={progressType.value} value={progressType.value}>
                          {progressType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.1"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="70.5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={unit}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes about this measurement..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddingEntry(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Entry</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Latest Measurements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {progressTypes.map((progressType) => {
            const latest = latestEntries[progressType.value];
            const Icon = progressType.icon;
            const trend = getTrend(progressType.value);
            
            return (
              <Card key={progressType.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Icon className="h-5 w-5 text-green-600" />
                    <span>{progressType.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latest ? (
                    <div>
                      <div className="flex items-baseline space-x-2 mb-2">
                        <span className="text-2xl font-bold">
                          {latest.value}
                        </span>
                        <span className="text-gray-600">{latest.unit}</span>
                        {trend && (
                          <div className={`flex items-center space-x-1 text-sm ${
                            trend.isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trend.isPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{Math.abs(trend.change).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(new Date(latest.recordedAt), 'MMM d, yyyy')}
                      </p>
                      {latest.notes && (
                        <p className="text-sm text-gray-500 mt-2">{latest.notes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No data recorded</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Chart</CardTitle>
            <CardDescription>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {progressTypes.map((progressType) => (
                    <SelectItem key={progressType.value} value={progressType.value}>
                      {progressType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return format(new Date(payload[0].payload.fullDate), 'MMMM d, yyyy');
                        }
                        return label;
                      }}
                      formatter={(value) => [
                        `${value} ${selectedTypeData?.unit}`, 
                        selectedTypeData?.label
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#16a34a" 
                      strokeWidth={2}
                      dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No data available for {selectedTypeData?.label.toLowerCase()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
