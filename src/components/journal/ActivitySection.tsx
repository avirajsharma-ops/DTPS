'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, Trash2, Loader2, Video, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import TrackingStatsGrid from './TrackingStatsGrid';
// import TimeBasedBarChart from './TimeBasedBarChart';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ActivityEntry {
  _id: string;
  name: string;
  sets: number;
  reps: number;
  duration: number;
  videoLink?: string;
  completed?: boolean;
  completedAt?: string;
  time: string;
}

interface ActivitySectionProps {
  clientId: string;
  selectedDate: Date;
  isClient?: boolean;
}

export default function ActivitySection({ clientId, selectedDate, isClient = false }: ActivitySectionProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ totalDuration: 0, totalSets: 0, target: 60, percentage: 0 });
  
  const [newActivity, setNewActivity] = useState({
    name: '',
    sets: 0,
    reps: 0,
    duration: 0,
    videoLink: ''
  });

  // Fetch activities for the selected date
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/journal/activity?date=${dateStr}&clientId=${clientId}`);
      const data = await res.json();
      
      if (data.success) {
        setActivities(data.activities || []);
        setSummary(data.summary || { totalDuration: 0, totalSets: 0, target: 60, percentage: 0 });
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleAddActivity = async () => {
    if (!newActivity.name) {
      toast.error('Please enter an activity name');
      return;
    }
    
    try {
      setSaving(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch('/api/journal/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newActivity,
          date: dateStr,
          clientId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setActivities(data.activities || []);
        setNewActivity({ name: '', sets: 0, reps: 0, duration: 0, videoLink: '' });
        toast.success('Activity added successfully');
        fetchActivities(); // Refresh to get updated summary
      } else {
        toast.error(data.error || 'Failed to add activity');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/journal/activity?entryId=${id}&date=${dateStr}&clientId=${clientId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (data.success) {
        setActivities(data.activities || []);
        toast.success('Activity deleted');
        fetchActivities(); // Refresh to get updated summary
      } else {
        toast.error(data.error || 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    }
  };

  const handleMarkComplete = async (id: string, completed: boolean) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch('/api/journal/activity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: id,
          date: dateStr,
          clientId,
          completed: !completed
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setActivities(data.activities || []);
        toast.success(completed ? 'Marked as incomplete' : 'Marked as completed!');
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
    }
  };

  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
  const totalSets = activities.reduce((sum, a) => sum + a.sets, 0);
  const completedActivities = activities.filter(a => a.completed);
  const pendingActivities = activities.filter(a => !a.completed);

  // Mock chart data
  const chartData = [
    { time: '6 am', values: [15, 10, 5] },
    { time: '8 am', values: [25, 20, 8] },
    { time: '10 am', values: [35, 25, 12] },
    { time: '12 pm', values: [30, 22, 10] },
    { time: '2 pm', values: [40, 30, 15] },
    { time: '4 pm', values: [35, 28, 12] },
    { time: '6 pm', values: [45, 35, 18] },
    { time: '8 pm', values: [38, 30, 14] },
    { time: '10 pm', values: [20, 15, 8] },
  ];

  const trackingStats = [
    { title: 'Daily Activity', value: `${totalDuration} min`, percentage: summary.percentage, color: '#22c55e' },
    { title: 'Average Activity', value: '50 min', percentage: 80, color: '#3b82f6' },
    { title: 'Total Activity', value: '350 min', percentage: 70, color: '#f97316' },
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
      {/* Add Activity Form */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-blue-500" />
            Add Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-gray-600">Activity Name</Label>
            <Input
              placeholder="e.g., Push-ups, Running, Cycling..."
              value={newActivity.name}
              onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Sets</Label>
              <Input
                type="number"
                placeholder="0"
                value={newActivity.sets || ''}
                onChange={(e) => setNewActivity({ ...newActivity, sets: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Reps</Label>
              <Input
                type="number"
                placeholder="0"
                value={newActivity.reps || ''}
                onChange={(e) => setNewActivity({ ...newActivity, reps: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Duration (minutes)</Label>
              <Input
                type="number"
                placeholder="0"
                value={newActivity.duration || ''}
                onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Video Link - Optional */}
          <div>
            <Label className="text-sm text-gray-600 flex items-center gap-2">
              <Video className="h-3 w-3" />
              Video Link <span className="text-gray-400 text-xs">(optional)</span>
            </Label>
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={newActivity.videoLink}
              onChange={(e) => setNewActivity({ ...newActivity, videoLink: e.target.value })}
            />
          </div>
          
          <Button onClick={handleAddActivity} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? 'Adding...' : 'Add Activity'}
          </Button>
        </CardContent>
      </Card>

      {/* Today's Activities */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Activities</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-blue-600">
                {completedActivities.reduce((sum, a) => sum + a.duration, 0)} min total
              </Badge>
              <Badge variant="outline" className="text-purple-600">
                {completedActivities.reduce((sum, a) => sum + a.sets, 0)} sets total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* For Dietitian: Only show completed activities */}
          {!isClient ? (
            completedActivities.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No completed activities yet</p>
            ) : (
              <div className="space-y-3">
                {completedActivities.map((activity) => (
                  <div 
                    key={activity._id} 
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-700">{activity.name}</p>
                          {activity.videoLink && (
                            <a
                              href={activity.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Video className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {activity.sets} sets • {activity.reps} reps • {activity.duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteActivity(activity._id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* For Client: Show both pending and completed activities */
            activities.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No activities recorded today</p>
            ) : (
              <div className="space-y-3">
                {/* Pending Activities - Only for Client */}
                {pendingActivities.length > 0 && (
                  <div className="space-y-3">
                    {pendingActivities.map((activity) => (
                      <div 
                        key={activity._id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleMarkComplete(activity._id, activity.completed || false)}
                            className="text-gray-400 hover:text-green-500 transition-colors"
                          >
                            <Circle className="h-5 w-5" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-800">{activity.name}</p>
                              {activity.videoLink && (
                                <a
                                  href={activity.videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Video className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {activity.sets} sets • {activity.reps} reps • {activity.duration} min
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{activity.time}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteActivity(activity._id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed Activities - For Client */}
                {completedActivities.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Completed ({completedActivities.length})
                    </p>
                    <div className="space-y-2">
                      {completedActivities.map((activity) => (
                        <div 
                          key={activity._id} 
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleMarkComplete(activity._id, activity.completed || false)}
                              className="text-green-500 hover:text-green-700 transition-colors"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-700 line-through">{activity.name}</p>
                                {activity.videoLink && (
                                  <a
                                    href={activity.videoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Video className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {activity.sets} sets • {activity.reps} reps • {activity.duration} min
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteActivity(activity._id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Activity Tracking Stats */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Tracking</CardTitle>
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

      {/* Activity Duration Chart */}
      {/* <TimeBasedBarChart
        title="Activity Duration"
        yAxisLabel="10 min"
        data={chartData}
        colors={['#3b82f6', '#8b5cf6', '#ef4444']}
        legends={[
          { label: 'Light', color: '#3b82f6' },
          { label: 'Moderate', color: '#8b5cf6' },
          { label: 'Intense', color: '#ef4444' },
        ]}
        maxValue={50}
      /> */}
    </div>
  );
}
