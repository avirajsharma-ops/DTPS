'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Activity, 
  Ruler,
  Camera,
  Plus,
  Target,
  Flame,
  Droplets,
  Calendar,
  Edit3,
  Trash2
} from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import BottomNavBar from '@/components/client/BottomNavBar';
import { toast } from 'sonner';

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

interface MeasurementEntry {
  date: string;
  waist?: number;
  hips?: number;
  chest?: number;
  arms?: number;
  thighs?: number;
}

interface TransformationPhoto {
  _id: string;
  url: string;
  date: string;
  notes: string;
}

interface ProgressData {
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
  weightChange: number;
  bmi: number;
  progressPercent: number;
  weightHistory: Array<{ date: string; weight: number }>;
  measurements: {
    waist: number;
    hips: number;
    chest: number;
    arms: number;
    thighs: number;
  };
  todayMeasurements?: {
    waist: number;
    hips: number;
    chest: number;
    arms: number;
    thighs: number;
  };
  measurementHistory: MeasurementEntry[];
  lastMeasurementDate?: string;
  canAddMeasurement?: boolean;
  daysUntilNextMeasurement?: number;
  goals: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    water?: number;
    steps?: number;
  };
  todayIntake?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  calorieHistory?: Array<{ date: string; calories: number }>;
  transformationPhotos?: TransformationPhoto[];
}

// Time Range Filter Component
function TimeRangeFilter({ 
  value, 
  onChange 
}: { 
  value: TimeRange; 
  onChange: (v: TimeRange) => void 
}) {
  const options: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y'];
  
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            value === option
              ? 'bg-green-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

// Simple Line Chart Component
function LineChart({ 
  data, 
  height = 120, 
  color = '#22c55e',
  labels = []
}: { 
  data: number[], 
  height?: number, 
  color?: string,
  labels?: string[]
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Not enough data to display chart
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 10;
  const chartWidth = 300;
  const chartHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((value - min) / range) * chartHeight + padding;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${chartHeight + padding} ${points} ${chartWidth},${chartHeight + padding}`;

  return (
    <div>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`areaGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <polygon points={areaPoints} fill={`url(#areaGradient-${color})`} />
        
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * chartWidth;
          const y = chartHeight - ((value - min) / range) * chartHeight + padding;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      {labels.length > 0 && (
        <div className="flex justify-between mt-1 px-1">
          {labels.map((label, i) => (
            <span key={i} className="text-[10px] text-gray-400">{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// Circular Progress Component
function CircularProgress({ 
  value, 
  max, 
  size = 80, 
  strokeWidth = 8, 
  color = '#22c55e',
  label,
  unit
}: { 
  value: number; 
  max: number; 
  size?: number; 
  strokeWidth?: number; 
  color?: string;
  label: string;
  unit: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-gray-600 mt-2 font-medium">{label}</span>
    </div>
  );
}

// Macro Bar Component
function MacroBar({ 
  label, 
  value, 
  max, 
  color, 
  icon: Icon 
}: { 
  label: string; 
  value: number; 
  max: number; 
  color: string; 
  icon: React.ElementType;
}) {
  const progress = Math.min((value / max) * 100, 100);
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">{value}g / {max}g</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${color}`}
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper function to get date range
function getDateRange(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case '1W': return subDays(now, 7);
    case '1M': return subMonths(now, 1);
    case '3M': return subMonths(now, 3);
    case '6M': return subMonths(now, 6);
    case '1Y': return subYears(now, 1);
    default: return subDays(now, 7);
  }
}

export default function UserProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showMeasurementReminderPopup, setShowMeasurementReminderPopup] = useState(false);
  const [showMeasurementRestrictionPopup, setShowMeasurementRestrictionPopup] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [measurements, setMeasurements] = useState({
    waist: '',
    hips: '',
    chest: '',
    arms: '',
    thighs: ''
  });
  const [photoNotes, setPhotoNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'weight' | 'nutrition' | 'body'>('weight');
  const [timeRange, setTimeRange] = useState<TimeRange>('1W');
  const [selectedPhoto, setSelectedPhoto] = useState<TransformationPhoto | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchProgressData();
    }
  }, [session, timeRange]);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/client/progress?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
        if (data.measurements) {
          setMeasurements({
            waist: data.measurements.waist?.toString() || '',
            hips: data.measurements.hips?.toString() || '',
            chest: data.measurements.chest?.toString() || '',
            arms: data.measurements.arms?.toString() || '',
            thighs: data.measurements.thighs?.toString() || ''
          });
        }
        // Check if it's time to remind user to add measurements (7 days passed)
        if (data.canAddMeasurement && data.lastMeasurementDate) {
          const lastMeasDate = new Date(data.lastMeasurementDate);
          const daysSince = Math.floor((new Date().getTime() - lastMeasDate.getTime()) / (24 * 60 * 60 * 1000));
          if (daysSince >= 7) {
            // Show reminder popup once per session
            const reminderShown = sessionStorage.getItem('measurementReminderShown');
            if (!reminderShown) {
              setShowMeasurementReminderPopup(true);
              sessionStorage.setItem('measurementReminderShown', 'true');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Add Measurement button click
  const handleAddMeasurementClick = () => {
    if (progressData?.canAddMeasurement === false) {
      setShowMeasurementRestrictionPopup(true);
    } else {
      setShowMeasurementsModal(true);
    }
  };

  const handleLogWeight = async () => {
    if (!newWeight || isNaN(parseFloat(newWeight))) {
      toast.error('Please enter a valid weight');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/client/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'weight',
          value: parseFloat(newWeight)
        })
      });

      if (response.ok) {
        toast.success('Weight logged successfully!');
        setShowWeightModal(false);
        setNewWeight('');
        fetchProgressData();
      } else {
        toast.error('Failed to log weight');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeasurements = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/client/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'measurements',
          measurements: {
            waist: parseFloat(measurements.waist) || 0,
            hips: parseFloat(measurements.hips) || 0,
            chest: parseFloat(measurements.chest) || 0,
            arms: parseFloat(measurements.arms) || 0,
            thighs: parseFloat(measurements.thighs) || 0
          }
        })
      });

      if (response.ok) {
        toast.success('Measurements saved successfully!');
        setShowMeasurementsModal(false);
        fetchProgressData();
      } else {
        toast.error('Failed to save measurements');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'progress');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        toast.error('Failed to upload image');
        return;
      }

      const uploadResult = await uploadRes.json();
      const photoUrl = uploadResult.url || `/api/files/${uploadResult.fileId || uploadResult._id}`;

      // Save the photo entry
      const saveRes = await fetch('/api/client/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          photoUrl: photoUrl,
          notes: photoNotes
        })
      });

      if (saveRes.ok) {
        toast.success('Photo added successfully!');
        setShowPhotoModal(false);
        setPhotoNotes('');
        fetchProgressData();
      } else {
        toast.error('Failed to save photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Something went wrong');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const response = await fetch(`/api/client/progress?id=${photoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Photo deleted successfully');
        fetchProgressData();
        setShowPhotoViewer(false);
        setSelectedPhoto(null);
      } else {
        toast.error('Failed to delete photo');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  // Default data if no API data
  const data: ProgressData = progressData || {
    currentWeight: 0,
    startWeight: 0,
    targetWeight: 0,
    weightChange: 0,
    bmi: 0,
    progressPercent: 0,
    weightHistory: [],
    measurements: { waist: 0, hips: 0, chest: 0, arms: 0, thighs: 0 },
    todayMeasurements: { waist: 0, hips: 0, chest: 0, arms: 0, thighs: 0 },
    measurementHistory: [],
    goals: { calories: 2000, protein: 120, carbs: 250, fat: 65, water: 8, steps: 10000 },
    todayIntake: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    calorieHistory: [],
    transformationPhotos: []
  };

  // Use today's measurements if available, otherwise use latest measurements
  const displayMeasurements = data.todayMeasurements && 
    (data.todayMeasurements.waist || data.todayMeasurements.hips || data.todayMeasurements.chest || data.todayMeasurements.arms || data.todayMeasurements.thighs)
    ? data.todayMeasurements 
    : data.measurements;

  const weightToGo = Math.max(0, data.currentWeight - data.targetWeight);
  
  // Filter data based on time range
  const filteredWeightHistory = useMemo(() => {
    const startDate = getDateRange(timeRange);
    return data.weightHistory.filter(entry => new Date(entry.date) >= startDate);
  }, [data.weightHistory, timeRange]);

  const filteredMeasurementHistory = useMemo(() => {
    const startDate = getDateRange(timeRange);
    return (data.measurementHistory || []).filter(entry => new Date(entry.date) >= startDate);
  }, [data.measurementHistory, timeRange]);

  const filteredCalorieHistory = useMemo(() => {
    const startDate = getDateRange(timeRange);
    return (data.calorieHistory || []).filter(entry => new Date(entry.date) >= startDate);
  }, [data.calorieHistory, timeRange]);

  // Chart data
  const weightChartData = filteredWeightHistory.length > 1 
    ? filteredWeightHistory.map(e => e.weight)
    : data.currentWeight > 0 ? [data.currentWeight] : [];

  const weightChartLabels = filteredWeightHistory.length > 1
    ? filteredWeightHistory.map(e => format(new Date(e.date), 'dd'))
    : [];

  const calorieChartData = filteredCalorieHistory.length > 1
    ? filteredCalorieHistory.map(e => e.calories)
    : [];

  const calorieChartLabels = filteredCalorieHistory.length > 1
    ? filteredCalorieHistory.map(e => format(new Date(e.date), 'dd'))
    : [];

  // Get waist history for body measurements chart
  const waistChartData = filteredMeasurementHistory.length > 0
    ? filteredMeasurementHistory.filter(e => e.waist).map(e => e.waist!)
    : [];

  const waistChartLabels = filteredMeasurementHistory.length > 0
    ? filteredMeasurementHistory.filter(e => e.waist).map(e => format(new Date(e.date), 'dd'))
    : [];

  // BMI display value - ensure it's properly formatted and reasonable
  const bmiValue = data.bmi && !isNaN(data.bmi) && data.bmi > 0 && data.bmi < 100 
    ? data.bmi.toFixed(1) 
    : '--';

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
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
            <h1 className="text-lg font-bold text-gray-900">My Progress</h1>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-1 pb-3">
          {[
            { id: 'weight', label: 'Weight', icon: Scale },
            { id: 'nutrition', label: 'Nutrition', icon: Flame },
            { id: 'body', label: 'Body', icon: Ruler }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Time Range Filter - shown for all tabs */}
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Weight Tab */}
        {activeTab === 'weight' && (
          <>
            {/* Weight Overview Card */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-5 text-white shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/70 text-sm">Current Weight</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{data.currentWeight || '--'}</span>
                    <span className="text-lg opacity-70">kg</span>
                  </div>
                  {data.weightChange !== 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {data.weightChange < 0 ? (
                        <TrendingDown className="w-4 h-4 text-green-200" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-red-200" />
                      )}
                      <span className="text-sm">
                        {Math.abs(data.weightChange)} kg this week
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setShowWeightModal(true)}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="bg-white/20 rounded-full h-3 mb-2">
                <div 
                  className="bg-white rounded-full h-3 transition-all duration-500"
                  style={{ width: `${Math.min(data.progressPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span>Start: {data.startWeight || '--'} kg</span>
                <span className="font-medium">{data.progressPercent}% to goal</span>
                <span>Goal: {data.targetWeight || '--'} kg</span>
              </div>
            </div>

            {/* Weight Chart */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Weight Trend</h3>
                <span className="text-sm text-gray-500">
                  {timeRange === '1W' ? 'Last 7 days' : 
                   timeRange === '1M' ? 'Last month' :
                   timeRange === '3M' ? 'Last 3 months' :
                   timeRange === '6M' ? 'Last 6 months' : 'Last year'}
                </span>
              </div>
              <div className="h-32">
                {weightChartData.length > 1 ? (
                  <LineChart data={weightChartData} color="#22c55e" labels={weightChartLabels} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Not enough data to display chart
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <Scale className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900">{bmiValue}</p>
                <p className="text-xs text-gray-500">BMI</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900">{weightToGo.toFixed(1)}</p>
                <p className="text-xs text-gray-500">kg to go</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-gray-900">{data.weightHistory.length}</p>
                <p className="text-xs text-gray-500">entries</p>
              </div>
            </div>

            {/* Recent Entries */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Recent Entries</h3>
              {filteredWeightHistory.length > 0 ? (
                <div className="space-y-2">
                  {filteredWeightHistory.slice(0, 5).map((entry, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-sm text-gray-600">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </span>
                      <span className="font-bold text-gray-900">{entry.weight} kg</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Scale className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No weight entries yet</p>
                  <button 
                    onClick={() => setShowWeightModal(true)}
                    className="mt-2 text-green-600 font-medium text-sm"
                  >
                    Log your first weight
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <>
            {/* Calorie History Chart - Moved to Top */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Calorie Trend</h3>
                <span className="text-sm text-gray-500">
                  {timeRange === '1W' ? 'Last 7 days' : 
                   timeRange === '1M' ? 'Last month' :
                   timeRange === '3M' ? 'Last 3 months' :
                   timeRange === '6M' ? 'Last 6 months' : 'Last year'}
                </span>
              </div>
              <div className="h-32">
                {calorieChartData.length > 1 ? (
                  <LineChart data={calorieChartData} color="#f59e0b" labels={calorieChartLabels} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Not enough calorie data to display chart
                  </div>
                )}
              </div>
            </div>

            {/* Daily Calories */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Today's Calories</h3>
                <span className="text-sm text-green-600 font-medium">
                  {data.todayIntake?.calories || 0} / {data.goals?.calories || 2000}
                </span>
              </div>
              
              {/* Calorie Progress Ring */}
              <div className="flex justify-center mb-6">
                <CircularProgress
                  value={data.todayIntake?.calories || 0}
                  max={data.goals?.calories || 2000}
                  size={140}
                  strokeWidth={12}
                  color="#22c55e"
                  label="Calories"
                  unit="kcal"
                />
              </div>

              {/* Remaining Calories */}
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.max(0, (data.goals?.calories || 2000) - (data.todayIntake?.calories || 0))}
                </p>
                <p className="text-xs text-gray-500">calories</p>
              </div>
            </div>

            {/* Macros */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Macronutrients</h3>
              
              <div className="flex justify-around mb-6">
                <CircularProgress
                  value={data.todayIntake?.protein || 0}
                  max={data.goals?.protein || 120}
                  size={80}
                  strokeWidth={8}
                  color="#ef4444"
                  label="Protein"
                  unit="g"
                />
                <CircularProgress
                  value={data.todayIntake?.carbs || 0}
                  max={data.goals?.carbs || 250}
                  size={80}
                  strokeWidth={8}
                  color="#f59e0b"
                  label="Carbs"
                  unit="g"
                />
                <CircularProgress
                  value={data.todayIntake?.fat || 0}
                  max={data.goals?.fat || 65}
                  size={80}
                  strokeWidth={8}
                  color="#8b5cf6"
                  label="Fat"
                  unit="g"
                />
              </div>

              {/* Macro Bars */}
              <div className="space-y-4">
                <MacroBar 
                  label="Protein" 
                  value={data.todayIntake?.protein || 0} 
                  max={data.goals?.protein || 120} 
                  color="bg-red-500" 
                  icon={Activity}
                />
                <MacroBar 
                  label="Carbohydrates" 
                  value={data.todayIntake?.carbs || 0} 
                  max={data.goals?.carbs || 250} 
                  color="bg-amber-500" 
                  icon={Flame}
                />
                <MacroBar 
                  label="Fat" 
                  value={data.todayIntake?.fat || 0} 
                  max={data.goals?.fat || 65} 
                  color="bg-purple-500" 
                  icon={Droplets}
                />
              </div>
            </div>

            {/* Daily Goals */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Daily Goals</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-xl p-4">
                  <Flame className="w-6 h-6 text-orange-500 mb-2" />
                  <p className="text-xl font-bold text-gray-900">{data.goals?.calories || 2000}</p>
                  <p className="text-xs text-gray-500">Calories/day</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <Activity className="w-6 h-6 text-red-500 mb-2" />
                  <p className="text-xl font-bold text-gray-900">{data.goals?.protein || 120}g</p>
                  <p className="text-xs text-gray-500">Protein/day</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <Droplets className="w-6 h-6 text-blue-500 mb-2" />
                  <p className="text-xl font-bold text-gray-900">{data.goals?.water || 8}</p>
                  <p className="text-xs text-gray-500">Glasses water</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <Target className="w-6 h-6 text-green-500 mb-2" />
                  <p className="text-xl font-bold text-gray-900">{(data.goals?.steps || 10000).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Steps/day</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Body Tab */}
        {activeTab === 'body' && (
          <>
            {/* Body Measurements Chart */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Measurement Trend (Waist)</h3>
                <span className="text-sm text-gray-500">
                  {timeRange === '1W' ? 'Last 7 days' : 
                   timeRange === '1M' ? 'Last month' :
                   timeRange === '3M' ? 'Last 3 months' :
                   timeRange === '6M' ? 'Last 6 months' : 'Last year'}
                </span>
              </div>
              <div className="h-32">
                {waistChartData.length > 1 ? (
                  <LineChart data={waistChartData} color="#22c55e" labels={waistChartLabels} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Not enough measurement data to display chart
                  </div>
                )}
              </div>
            </div>

            {/* Body Measurements */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">Body Measurements</h3>
                <button 
                  onClick={handleAddMeasurementClick}
                  className="text-green-600 text-sm font-medium flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              
              {/* Show date indicator */}
              <p className="text-xs text-gray-500 mb-3">
                {data.todayMeasurements && (data.todayMeasurements.waist || data.todayMeasurements.hips) 
                  ? `Today's measurements (${format(new Date(), 'MMM d, yyyy')})` 
                  : 'Latest measurements'}
              </p>

              {/* Responsive Grid - Larger boxes for readability */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Waist', value: displayMeasurements.waist, color: 'bg-blue-100 text-blue-600' },
                  { label: 'Hips', value: displayMeasurements.hips, color: 'bg-pink-100 text-pink-600' },
                  { label: 'Chest', value: displayMeasurements.chest, color: 'bg-green-100 text-green-600' },
                  { label: 'Arms', value: displayMeasurements.arms, color: 'bg-purple-100 text-purple-600' },
                  { label: 'Thighs', value: displayMeasurements.thighs, color: 'bg-amber-100 text-amber-600' }
                ].map((item) => (
                  <div key={item.label} className="text-center p-2">
                    <div className={`h-14 sm:h-16 rounded-xl ${item.color} flex items-center justify-center mb-1`}>
                      <span className="text-base sm:text-lg font-bold">{item.value || '--'}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.label}</p>
                    <p className="text-[10px] text-gray-400">cm</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Measurement History */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Measurement History</h3>
              {filteredMeasurementHistory.length > 0 ? (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-1 text-gray-500 font-medium text-xs">Date</th>
                        <th className="text-center py-2 px-1 text-gray-500 font-medium text-xs">Waist</th>
                        <th className="text-center py-2 px-1 text-gray-500 font-medium text-xs">Hips</th>
                        <th className="text-center py-2 px-1 text-gray-500 font-medium text-xs">Chest</th>
                        <th className="text-center py-2 px-1 text-gray-500 font-medium text-xs">Arms</th>
                        <th className="text-center py-2 px-1 text-gray-500 font-medium text-xs">Thighs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMeasurementHistory.slice(0, 10).map((entry, index) => (
                        <tr key={index} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 px-1 text-gray-600 text-xs">
                            {format(new Date(entry.date), 'MMM d')}
                          </td>
                          <td className="py-2 px-1 text-center font-medium text-xs">{entry.waist || '-'}</td>
                          <td className="py-2 px-1 text-center font-medium text-xs">{entry.hips || '-'}</td>
                          <td className="py-2 px-1 text-center font-medium text-xs">{entry.chest || '-'}</td>
                          <td className="py-2 px-1 text-center font-medium text-xs">{entry.arms || '-'}</td>
                          <td className="py-2 px-1 text-center font-medium text-xs">{entry.thighs || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No measurement history yet</p>
                  <button 
                    onClick={handleAddMeasurementClick}
                    className="mt-2 text-green-600 font-medium text-sm"
                  >
                    Add your first measurement
                  </button>
                </div>
              )}
            </div>

            {/* BMI Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Body Mass Index (BMI)</h3>
              
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex flex-col items-center justify-center flex-shrink-0 overflow-hidden">
                  <span className="text-lg sm:text-xl font-bold text-green-600 truncate max-w-full px-2">{bmiValue}</span>
                  <span className="text-xs text-gray-500">BMI</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">
                    {!data.bmi || isNaN(data.bmi) ? 'Unknown' :
                     data.bmi < 18.5 ? 'Underweight' : 
                     data.bmi < 25 ? 'Normal Weight' : 
                     data.bmi < 30 ? 'Overweight' : 'Obese'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">
                    {!data.bmi || isNaN(data.bmi) ? 'Add weight and height to calculate' :
                     data.bmi < 18.5 ? 'Consider gaining some healthy weight' : 
                     data.bmi < 25 ? 'You are in a healthy weight range' : 
                     data.bmi < 30 ? 'Consider losing some weight' : 'Consult with a healthcare provider'}
                  </p>
                  
                  {/* BMI Scale */}
                  <div className="h-2 rounded-full" style={{ background: 'linear-gradient(to right, #60a5fa, #4ade80, #facc15, #ef4444)' }}>
                    {data.bmi && !isNaN(data.bmi) && (
                      <div 
                        className="w-3 h-3 -mt-0.5 rounded-full bg-white border-2 border-gray-800"
                        style={{ marginLeft: `${Math.min(Math.max((data.bmi - 15) / 25 * 100, 0), 100)}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>15</span>
                    <span>18.5</span>
                    <span>25</span>
                    <span>30</span>
                    <span>40</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Photos */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Transformation Photos</h3>
                <button 
                  onClick={() => setShowPhotoModal(true)}
                  className="text-green-600 text-sm font-medium flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Camera className="w-4 h-4" /> Add
                </button>
              </div>
              
              {data.transformationPhotos && data.transformationPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {data.transformationPhotos.map((photo) => (
                    <div 
                      key={photo._id} 
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setShowPhotoViewer(true);
                      }}
                    >
                      <img 
                        src={photo.url} 
                        alt="Progress photo" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs py-1 px-2 mb-2 bg-black/50 rounded">
                          {format(new Date(photo.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transformation photos yet</p>
                  <p className="text-xs text-gray-400 mt-1">Track your journey with photos</p>
                  <button 
                    onClick={() => setShowPhotoModal(true)}
                    className="mt-3 text-green-600 font-medium text-sm"
                  >
                    Add your first photo
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Log Today's Weight</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="Enter weight"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-medium"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogWeight}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Measurements Modal */}
      {showMeasurementsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Measurements</h3>
            <p className="text-sm text-gray-500 mb-4">
              Recording for: {format(new Date(), 'MMMM d, yyyy')}
            </p>
            
            <div className="space-y-4">
              {[
                { key: 'waist', label: 'Waist' },
                { key: 'hips', label: 'Hips' },
                { key: 'chest', label: 'Chest' },
                { key: 'arms', label: 'Arms' },
                { key: 'thighs', label: 'Thighs' }
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{field.label} (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurements[field.key as keyof typeof measurements]}
                    onChange={(e) => setMeasurements({ ...measurements, [field.key]: e.target.value })}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowMeasurementsModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeasurements}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Add Transformation Photo</h3>
            <p className="text-sm text-gray-500 mb-4">
              Date: {format(new Date(), 'MMMM d, yyyy')}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Notes (optional)</label>
                <textarea
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                  placeholder="E.g., Front view, After 2 weeks..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploadingPhoto}
                />
                <label
                  htmlFor="photo-upload"
                  className={`w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Tap to select photo</span>
                      <span className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP (max 10MB)</span>
                    </>
                  )}
                </label>
              </div>

              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setPhotoNotes('');
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showPhotoViewer && selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 text-white">
            <div>
              <p className="font-medium">{format(new Date(selectedPhoto.date), 'MMMM d, yyyy')}</p>
              {selectedPhoto.notes && (
                <p className="text-sm text-gray-300">{selectedPhoto.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDeletePhoto(selectedPhoto._id)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setShowPhotoViewer(false);
                  setSelectedPhoto(null);
                }}
                className="p-2 text-white hover:text-gray-300 transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img 
              src={selectedPhoto.url} 
              alt="Progress photo" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Measurement Reminder Popup - Shows after 7 days */}
      {showMeasurementReminderPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center animate-bounce-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ruler className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Time to Measure!</h3>
            <p className="text-gray-600 mb-6">
              It's been 7 days since your last body measurement. Track your progress by adding new measurements today!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMeasurementReminderPopup(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Later
              </button>
              <button
                onClick={() => {
                  setShowMeasurementReminderPopup(false);
                  setShowMeasurementsModal(true);
                }}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                Add Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement Restriction Popup - Shows when trying to add before 7 days */}
      {showMeasurementRestrictionPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Please Wait</h3>
            <p className="text-gray-600 mb-2">
              Body measurements can only be recorded once every 7 days for accurate tracking.
            </p>
            <p className="text-lg font-semibold text-green-600 mb-6">
              {data.daysUntilNextMeasurement === 1 
                ? '1 day remaining' 
                : `${data.daysUntilNextMeasurement || 0} days remaining`}
            </p>
            {data.lastMeasurementDate && (
              <p className="text-sm text-gray-500 mb-4">
                Last recorded: {format(new Date(data.lastMeasurementDate), 'MMM d, yyyy')}
              </p>
            )}
            <button
              onClick={() => setShowMeasurementRestrictionPopup(false)}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavBar />
    </div>
  );
}
