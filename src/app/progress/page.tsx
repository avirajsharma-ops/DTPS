'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddMeasurementModal } from '@/components/modals/AddMeasurementModal';
import { AddProgressPhotoModal } from '@/components/modals/AddProgressPhotoModal';
import { PhotoGalleryModal } from '@/components/modals/PhotoGalleryModal';
import { MeasurementSummaryModal } from '@/components/modals/MeasurementSummaryModal';
import { PhotoComparisonModal } from '@/components/modals/PhotoComparisonModal';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Ruler,
  Target,
  Camera,
  Award,
  Zap,
  Plus,
  Eye,
  User,
  Bell
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

interface ProgressPhoto {
  id: string;
  url: string;
  type: 'front' | 'side' | 'back';
  notes?: string;
  createdAt: string;
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [latestEntries, setLatestEntries] = useState<LatestEntries>({});
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'weight' | 'measurements' | 'photos'>('weight');
  const [userGoals, setUserGoals] = useState<any>(null);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'front' | 'side' | 'back'>('front');
  const [showMeasurementSummary, setShowMeasurementSummary] = useState(false);
  const [showPhotoComparison, setShowPhotoComparison] = useState(false);
  const [lastAddedMeasurement, setLastAddedMeasurement] = useState<any>(null);
  const [lastAddedPhoto, setLastAddedPhoto] = useState<ProgressPhoto | null>(null);
  const [previousMeasurementValue, setPreviousMeasurementValue] = useState<number | undefined>(undefined);

  // Update time every minute for greeting
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'client') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user.role === 'client') {
      fetchProgressEntries();
      fetchUserGoals();
      fetchProgressPhotos();
    }
  }, [session]);

  const fetchProgressEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/progress');
      if (response.ok) {
        const data = await response.json();
        setProgressEntries(data.progressEntries || []);
        setLatestEntries(data.latestEntries || {});
      }
    } catch (error) {
      console.error('Error fetching progress entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGoals = async () => {
    try {
      const response = await fetch('/api/dashboard/client-stats');
      if (response.ok) {
        const data = await response.json();
        setUserGoals(data);
      }
    } catch (error) {
      console.error('Error fetching user goals:', error);
    }
  };

  const fetchProgressPhotos = async () => {
    try {
      const response = await fetch('/api/progress/photos');
      if (response.ok) {
        const data = await response.json();
        setProgressPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    }
  };

  const handleAddMeasurement = async (measurement: { type: string; value: number; unit: string; notes?: string }) => {
    try {
      // Get previous value for comparison
      const previousEntry = latestEntries[measurement.type];
      const previousValue = previousEntry ? previousEntry.value : undefined;

      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(measurement),
      });

      if (response.ok) {
        // Refresh data
        await fetchProgressEntries();

        // Show summary modal
        setLastAddedMeasurement({
          ...measurement,
          recordedAt: new Date()
        });
        setPreviousMeasurementValue(previousValue);
        setShowMeasurementSummary(true);
      } else {
        console.error('Failed to add measurement');
      }
    } catch (error) {
      console.error('Error adding measurement:', error);
    }
  };

  const handleAddPhoto = async (photo: { file: File; notes?: string; type: 'front' | 'side' | 'back' }) => {
    try {
      // Get previous photo of same type for comparison
      const previousPhoto = progressPhotos
        .filter(p => p.type === photo.type)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const formData = new FormData();
      formData.append('file', photo.file);
      formData.append('photoType', photo.type); // Changed to match API
      if (photo.notes) {
        formData.append('notes', photo.notes);
      }

      const response = await fetch('/api/progress/photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const data = await response.json();
      console.log('Upload successful:', data);

      // Refresh photos
      await fetchProgressPhotos();

      // Show comparison modal with new response format
      const newPhoto: ProgressPhoto = {
        id: data.photo._id,
        url: data.photo.url,
        type: photo.type,
        notes: photo.notes,
        createdAt: data.photo.createdAt
      };

      setLastAddedPhoto(newPhoto);
      setSelectedPhotoType(photo.type);
      setShowPhotoComparison(true);
    } catch (error) {
      console.error('Error adding photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/progress/photos?id=${photoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh photos
        await fetchProgressPhotos();
      } else {
        console.error('Failed to delete photo');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleViewAllPhotos = (photoType: 'front' | 'side' | 'back') => {
    setSelectedPhotoType(photoType);
    setShowGalleryModal(true);
  };

  // Get weight data from progress entries
  const weightEntries = progressEntries.filter(entry => entry.type === 'weight');
  const weightData = weightEntries
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map(entry => ({
      date: entry.recordedAt,
      value: entry.value
    }));

  // Calculate weight statistics
  const currentWeight = latestEntries.weight?.value || userGoals?.weight?.current || 0;
  const startWeight = weightData.length > 0 ? weightData[0].value : userGoals?.weight?.start || currentWeight;
  const goalWeight = userGoals?.weight?.target || 65;
  const weightLost = startWeight - currentWeight;
  const weightToGo = Math.max(0, currentWeight - goalWeight);
  const progressPercentage = startWeight !== goalWeight
    ? Math.round(((startWeight - currentWeight) / (startWeight - goalWeight)) * 100)
    : 0;

  // Get measurement data from progress entries
  const getMeasurementData = (type: string) => {
    const entries = progressEntries.filter(entry => entry.type === type);
    const latest = latestEntries[type];
    const previous = entries.length > 1 ? entries[entries.length - 2] : null;
    const change = latest && previous ? latest.value - previous.value : 0;

    return {
      type: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      value: latest?.value || 0,
      unit: latest?.unit || (type === 'body_fat' ? '%' : 'cm'),
      change: change,
      icon: type === 'body_fat' ? Target : Ruler,
      color: type === 'waist' ? 'from-blue-400 to-cyan-500' :
             type === 'chest' ? 'from-purple-400 to-pink-500' :
             type === 'hips' ? 'from-amber-400 to-orange-500' :
             'from-rose-400 to-red-500'
    };
  };

  const measurements = [
    getMeasurementData('waist'),
    getMeasurementData('chest'),
    getMeasurementData('hips'),
    getMeasurementData('body_fat'),
  ].filter(m => m.value > 0); // Only show measurements that have data

  // Calculate achievements based on real data
  const calculateAchievements = () => {
    const daysSinceStart = weightData.length > 0
      ? Math.floor((new Date().getTime() - new Date(weightData[0].date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return [
      {
        title: '7 Day Streak',
        icon: Zap,
        color: 'from-amber-400 to-orange-500',
        earned: daysSinceStart >= 7
      },
      {
        title: '5kg Lost',
        icon: Award,
        color: 'from-emerald-400 to-teal-500',
        earned: weightLost >= 5
      },
      {
        title: '30 Day Streak',
        icon: Zap,
        color: 'from-purple-400 to-pink-500',
        earned: daysSinceStart >= 30
      },
      {
        title: '10kg Lost',
        icon: Award,
        color: 'from-blue-400 to-cyan-500',
        earned: weightLost >= 10
      },
    ];
  };

  const achievements = calculateAchievements();

  // Greeting functions
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingEmoji = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <LoadingSpinner className="h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  if (!session || session.user.role !== 'client') {
    return null;
  }

  return (
    <>
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex px-4">
          <button
            onClick={() => setSelectedTab('weight')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              selectedTab === 'weight'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Weight
          </button>
          <button
            onClick={() => setSelectedTab('measurements')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              selectedTab === 'measurements'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Measurements
          </button>
          <button
            onClick={() => setSelectedTab('photos')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              selectedTab === 'photos'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Photos
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-20">
        <div className="space-y-4">
        {/* Weight Tab */}
        {selectedTab === 'weight' && (
          <>
            {/* Weight Summary Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Weight Progress</h2>
                <Scale className="h-6 w-6" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs opacity-90 mb-1">Start</p>
                  <p className="text-2xl font-bold">{startWeight}</p>
                  <p className="text-xs opacity-75">kg</p>
                </div>
                <div>
                  <p className="text-xs opacity-90 mb-1">Current</p>
                  <p className="text-3xl font-bold">{currentWeight}</p>
                  <p className="text-xs opacity-75">kg</p>
                </div>
                <div>
                  <p className="text-xs opacity-90 mb-1">Goal</p>
                  <p className="text-2xl font-bold">{goalWeight}</p>
                  <p className="text-xs opacity-75">kg</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="opacity-90">Progress</span>
                  <span className="font-bold">{progressPercentage}%</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs opacity-90">
                  <span>Lost: {weightLost.toFixed(1)} kg</span>
                  <span>To go: {weightToGo.toFixed(1)} kg</span>
                </div>
              </div>
            </div>

            {/* Chart Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Weight Trend</h3>
                <button className="text-sm text-emerald-600 font-medium">View All</button>
              </div>
              
              {/* Enhanced Weight Chart Visualization */}
              <div className="h-48 flex items-end justify-between space-x-1 bg-gradient-to-t from-gray-50 to-white rounded-xl p-4">
                {weightData.length > 0 ? weightData.map((point, index) => {
                  const minWeight = Math.min(...weightData.map(d => d.value)) - 2;
                  const maxWeight = Math.max(...weightData.map(d => d.value)) + 2;
                  const height = ((point.value - minWeight) / (maxWeight - minWeight)) * 100;
                  const isLatest = index === weightData.length - 1;
                  const prevPoint = index > 0 ? weightData[index - 1] : null;
                  const isIncreasing = prevPoint ? point.value > prevPoint.value : false;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group">
                      <div className="w-full flex items-end justify-center relative" style={{ height: '140px' }}>
                        <div
                          className={`w-full rounded-t-xl transition-all duration-700 shadow-sm ${
                            isLatest
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-emerald-200'
                              : 'bg-gradient-to-t from-emerald-500 to-emerald-300'
                          }`}
                          style={{ height: `${Math.max(height, 15)}%` }}
                        />
                        {isLatest && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                            <div className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                              {point.value}kg
                            </div>
                          </div>
                        )}
                        {prevPoint && (
                          <div className={`absolute -top-4 right-0 w-3 h-3 rounded-full ${
                            isIncreasing ? 'bg-red-400' : 'bg-green-400'
                          }`} />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 group-hover:text-gray-700 transition-colors">
                        {format(new Date(point.date), 'MMM d')}
                      </p>
                    </div>
                  );
                }) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="h-8 w-8 text-emerald-500" />
                      </div>
                      <p className="font-semibold text-gray-600">No weight data yet</p>
                      <p className="text-sm text-gray-500">Start tracking to see your progress</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Weight Button */}
            <button
              onClick={() => setShowMeasurementModal(true)}
              className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg flex items-center justify-center space-x-3 text-white font-bold text-lg active:scale-98 transition-all hover:shadow-xl"
            >
              <Scale className="h-6 w-6" />
              <span>Add Weight Entry</span>
              <Plus className="h-5 w-5" />
            </button>

            {/* Recent Entries */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Recent Entries</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{weightData.length} entries</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                {weightData.length > 0 ? weightData.slice(-5).reverse().map((entry, index) => {
                  const prevEntry = index < weightData.length - 1 ? weightData[weightData.length - 2 - index] : null;
                  const change = prevEntry ? entry.value - prevEntry.value : 0;
                  const isLatest = index === 0;

                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      isLatest ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                          isLatest
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg'
                            : 'bg-emerald-100'
                        }`}>
                          <Scale className={`h-6 w-6 ${isLatest ? 'text-white' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className={`text-lg font-bold ${isLatest ? 'text-emerald-700' : 'text-gray-900'}`}>
                              {entry.value} kg
                            </p>
                            {isLatest && (
                              <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                                Latest
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      {change !== 0 && (
                        <div className="flex items-center space-x-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            change < 0 ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {change < 0 ? (
                              <TrendingDown className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <span className={`text-sm font-bold ${change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change < 0 ? '-' : '+'}{Math.abs(change).toFixed(1)} kg
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-12">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                      <Scale className="h-10 w-10 text-emerald-500" />
                    </div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">Ready to start tracking?</p>
                    <p className="text-sm text-gray-500 mb-4">Add your first weight entry to see your progress</p>
                    <button
                      onClick={() => setShowMeasurementModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-transform"
                    >
                      Add First Entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Measurements Tab */}
        {selectedTab === 'measurements' && (
          <>
            {measurements.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {measurements.map((measurement, index) => (
                    <div key={index} className="bg-white rounded-2xl shadow-sm p-4">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${measurement.color} flex items-center justify-center text-white mb-3`}>
                        <measurement.icon className="h-6 w-6" />
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{measurement.type}</p>
                      <p className="text-2xl font-bold text-gray-900">{measurement.value}</p>
                      <p className="text-xs text-gray-500 mb-2">{measurement.unit}</p>
                      {measurement.change !== 0 && (
                        <div className="flex items-center space-x-1">
                          {measurement.change < 0 ? (
                            <TrendingDown className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs font-semibold ${measurement.change < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {measurement.change > 0 ? '+' : ''}{measurement.change.toFixed(1)} {measurement.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Measurement Button */}
                <button
                  onClick={() => setShowMeasurementModal(true)}
                  className="w-full py-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg flex items-center justify-center space-x-3 text-white font-bold text-lg active:scale-98 transition-all hover:shadow-xl"
                >
                  <Ruler className="h-6 w-6" />
                  <span>Add Measurement</span>
                  <Plus className="h-5 w-5" />
                </button>
              </>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Ruler className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Measurements Yet</h3>
                <p className="text-sm text-gray-500 mb-6">Track your body measurements to see detailed progress</p>
                <button
                  onClick={() => setShowMeasurementModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-transform"
                >
                  Add First Measurement
                </button>
              </div>
            )}
          </>
        )}

        {/* Photos Tab */}
        {selectedTab === 'photos' && (
          <>
            {progressPhotos.length > 0 ? (
              <>
                {/* Photo Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {['front', 'side', 'back'].map((photoType) => {
                    const typePhotos = progressPhotos.filter(photo => photo.type === photoType);
                    const latestPhoto = typePhotos[0]; // Most recent photo

                    return (
                      <div key={photoType} className="bg-white rounded-2xl shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-bold text-gray-900 capitalize">{photoType} View</h3>
                          <span className="text-xs text-gray-500">{typePhotos.length} photos</span>
                        </div>

                        {latestPhoto ? (
                          <div className="space-y-3">
                            <div className="relative">
                              <img
                                src={latestPhoto.url}
                                alt={`${photoType} progress photo`}
                                className="w-full h-48 object-cover rounded-xl"
                              />
                              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                                <span className="text-xs text-white">Latest</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500">
                                {format(new Date(latestPhoto.createdAt), 'MMM d, yyyy')}
                              </p>
                              <button
                                onClick={() => handleViewAllPhotos(photoType as 'front' | 'side' | 'back')}
                                className="text-xs text-emerald-600 font-medium flex items-center space-x-1"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View All</span>
                              </button>
                            </div>
                            {latestPhoto.notes && (
                              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                                {latestPhoto.notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                            <div className="text-center">
                              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No {photoType} photos yet</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Photo Button */}
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="w-full py-4 bg-white rounded-2xl shadow-sm flex items-center justify-center space-x-2 text-emerald-600 font-semibold active:scale-98 transition-transform"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Progress Photo</span>
                </button>
              </>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Progress Photos Yet</h3>
                <p className="text-sm text-gray-500 mb-6">Take photos to track your visual progress over time</p>
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow-lg active:scale-95 transition-transform"
                >
                  Take First Photo
                </button>
              </div>
            )}
          </>
        )}

        {/* Achievements */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Achievements</h3>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((achievement, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-xl border-2 ${
                  achievement.earned 
                    ? 'border-emerald-200 bg-emerald-50' 
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${achievement.color} flex items-center justify-center text-white mb-2`}>
                  <achievement.icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{achievement.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Modals */}
      <AddMeasurementModal
        isOpen={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
        onAdd={handleAddMeasurement}
      />

      <AddProgressPhotoModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onAdd={handleAddPhoto}
      />

      <PhotoGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        photos={progressPhotos}
        photoType={selectedPhotoType}
        onDelete={handleDeletePhoto}
      />

      {lastAddedMeasurement && (
        <MeasurementSummaryModal
          isOpen={showMeasurementSummary}
          onClose={() => {
            setShowMeasurementSummary(false);
            setLastAddedMeasurement(null);
            setPreviousMeasurementValue(undefined);
          }}
          measurement={lastAddedMeasurement}
          previousValue={previousMeasurementValue}
        />
      )}

      {lastAddedPhoto && (
        <PhotoComparisonModal
          isOpen={showPhotoComparison}
          onClose={() => {
            setShowPhotoComparison(false);
            setLastAddedPhoto(null);
          }}
          newPhoto={lastAddedPhoto}
          previousPhoto={progressPhotos
            .filter(p => p.type === lastAddedPhoto.type && p.id !== lastAddedPhoto.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          }
          photoType={selectedPhotoType}
        />
      )}
    </>
  );
}

