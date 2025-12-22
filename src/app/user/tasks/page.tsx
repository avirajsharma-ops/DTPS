'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    ArrowLeft,
    Calendar,
    Droplets,
    Footprints,
    Moon,
    Dumbbell,
    ChevronDown,
    ChevronUp,
    Check,
    Clock,
    Target,
    Loader2,
    CheckCircle2,
    Circle,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import BottomNavBar from '@/components/client/BottomNavBar';
import { Button } from '@/components/ui/button';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface AssignedWater {
    amount: number;
    assignedAt: string;
    isCompleted: boolean;
    completedAt?: string;
}

interface AssignedActivity {
    _id: string;
    name: string;
    sets: number;
    reps: number;
    duration: number;
    videoLink?: string;
    completed: boolean;
    completedAt?: string;
    time: string;
}

interface AssignedSteps {
    target: number;
    current: number;
    isCompleted: boolean;
}

interface AssignedSleep {
    targetHours: number;
    targetMinutes: number;
    currentHours: number;
    currentMinutes: number;
    isCompleted: boolean;
}

interface TasksData {
    water: AssignedWater | null;
    activities: AssignedActivity[];
    steps: AssignedSteps | null;
    sleep: AssignedSleep | null;
    date: string;
    dataHash?: string;
}

export default function TasksPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tasksData, setTasksData] = useState<TasksData>({
        water: null,
        activities: [],
        steps: null,
        sleep: null,
        date: new Date().toISOString()
    });
    const [lastDataHash, setLastDataHash] = useState<string | null>(null);
    const [completingTask, setCompletingTask] = useState<string | null>(null);

    // Expanded state for each card
    const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({
        water: false,
        activities: false,
        steps: false,
        sleep: false
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const fetchTasksData = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            setRefreshing(true);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const response = await fetch(`/api/client/tasks?date=${dateStr}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Tasks data fetched:', data);
                setTasksData(data);
                setLastDataHash(data.dataHash || null);
            }
        } catch (error) {
            console.error('Error fetching tasks data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate]);

    // Manual refresh handler
    const handleRefresh = () => {
        fetchTasksData(false);
        toast.success('Tasks refreshed!');
    };

    // Fetch on initial load and when date changes
    useEffect(() => {
        if (session?.user) {
            fetchTasksData(true);
        }
    }, [session, selectedDate, fetchTasksData]);

    // Refresh when page becomes visible (user switches tabs back) or window gains focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && session?.user) {
                console.log('Page became visible, refreshing tasks...');
                fetchTasksData(false);
            }
        };

        const handleFocus = () => {
            if (session?.user) {
                console.log('Window focused, refreshing tasks...');
                fetchTasksData(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [session, fetchTasksData]);

    const toggleCard = (cardId: string) => {
        setExpandedCards(prev => ({
            ...prev,
            [cardId]: !prev[cardId]
        }));
    };

    const handleCompleteTask = async (taskType: string, taskId?: string) => {
        setCompletingTask(taskId || taskType);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const response = await fetch('/api/client/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskType,
                    taskId,
                    date: dateStr,
                    action: 'complete'
                })
            });

            if (response.ok) {
                toast.success('Task marked as complete!');
                fetchTasksData(false);
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to complete task');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setCompletingTask(null);
        }
    };

    // Count completed tasks
    const getTaskStats = () => {
        let total = 0;
        let completed = 0;

        if (tasksData.water) {
            total++;
            if (tasksData.water.isCompleted) completed++;
        }
        if (tasksData.steps) {
            total++;
            if (tasksData.steps.isCompleted) completed++;
        }
        if (tasksData.sleep) {
            total++;
            if (tasksData.sleep.isCompleted) completed++;
        }
        tasksData.activities.forEach(activity => {
            total++;
            if (activity.completed) completed++;
        });

        return { total, completed };
    };

    const stats = getTaskStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <SpoonGifLoader size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white px-4 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <Link href="/user" className="p-2 -ml-2">
                        <ArrowLeft className="w-6 h-6 text-gray-700" />
                    </Link>
                    <h1 className="text-lg font-bold text-gray-900">My Tasks</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="flex items-center gap-1 p-2 bg-[#3AB1A0]/10 rounded-lg"
                        >
                            <Calendar className="w-5 h-5 text-[#3AB1A0]" />
                            <span className="text-sm font-medium text-[#3AB1A0]">
                                {format(selectedDate, 'dd MMM')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Date Picker */}
                {showDatePicker && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                        <input
                            type="date"
                            value={format(selectedDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                setSelectedDate(new Date(e.target.value));
                                setShowDatePicker(false);
                            }}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                )}
            </div>

            <div className="px-4 py-6 space-y-4">
                {/* Progress Summary */}
                <div className="bg-gradient-to-r from-[#3AB1A0] to-[#2A9A8B] rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-sm">Today's Progress</p>
                            <p className="text-3xl font-bold mt-1">
                                {stats.completed}/{stats.total} Tasks
                            </p>
                        </div>
                        <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 transform -rotate-90">
                                <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="rgba(255,255,255,0.3)"
                                    strokeWidth="6"
                                    fill="none"
                                />
                                <circle
                                    cx="32"
                                    cy="32"
                                    r="28"
                                    stroke="white"
                                    strokeWidth="6"
                                    fill="none"
                                    strokeDasharray={`${(stats.completed / (stats.total || 1)) * 175.93} 175.93`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold">
                                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {stats.total === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center">
                        <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tasks Assigned</h3>
                        <p className="text-gray-500 text-sm">
                            Your dietitian hasn't assigned any tasks for today yet.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Water Task Card */}
                        {tasksData.water && (
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleCard('water')}
                                    className="w-full p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tasksData.water.isCompleted ? 'bg-[#3AB1A0]/10' : 'bg-[#3AB1A0]/10'
                                            }`}>
                                            <Droplets className={`w-6 h-6 ${tasksData.water.isCompleted ? 'text-[#3AB1A0]' : 'text-[#3AB1A0]'
                                                }`} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-800">Water Intake</h3>
                                            <p className="text-sm text-gray-500">
                                                Goal: {tasksData.water.amount.toLocaleString()} ml
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tasksData.water.isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-[#3AB1A0]" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-gray-300" />
                                        )}
                                        {expandedCards.water ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {expandedCards.water && (
                                    <div className="px-4 pb-4 border-t border-gray-100">
                                        <div className="pt-4 space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Target Amount</span>
                                                <span className="font-medium">{tasksData.water.amount.toLocaleString()} ml</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Assigned</span>
                                                <span className="text-gray-500">
                                                    {format(new Date(tasksData.water.assignedAt), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            {tasksData.water.isCompleted ? (
                                                <div className="flex items-center gap-2 text-[#3AB1A0] bg-[#3AB1A0]/10 p-3 rounded-lg">
                                                    <Check className="w-5 h-5" />
                                                    <span className="font-medium">Completed</span>
                                                    {tasksData.water.completedAt && (
                                                        <span className="text-sm text-[#3AB1A0] ml-auto">
                                                            {format(new Date(tasksData.water.completedAt), 'h:mm a')}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleCompleteTask('water')}
                                                    disabled={completingTask === 'water'}
                                                    className="w-full py-3 bg-[#3AB1A0] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#2A9A8B] disabled:opacity-50"
                                                >
                                                    {completingTask === 'water' ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Check className="w-5 h-5" />
                                                    )}
                                                    Mark as Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Steps Task Card */}
                        {tasksData.steps && (
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleCard('steps')}
                                    className="w-full p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tasksData.steps.isCompleted ? 'bg-[#3AB1A0]/10' : 'bg-[#E06A26]/10'
                                            }`}>
                                            <Footprints className={`w-6 h-6 ${tasksData.steps.isCompleted ? 'text-[#3AB1A0]' : 'text-[#E06A26]'
                                                }`} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-800">Daily Steps</h3>
                                            <p className="text-sm text-gray-500">
                                                {tasksData.steps.current.toLocaleString()} / {tasksData.steps.target.toLocaleString()} steps
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tasksData.steps.isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-[#3AB1A0]" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-gray-300" />
                                        )}
                                        {expandedCards.steps ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {expandedCards.steps && (
                                    <div className="px-4 pb-4 border-t border-gray-100">
                                        <div className="pt-4 space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Target Steps</span>
                                                <span className="font-medium">{tasksData.steps.target.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Current Steps</span>
                                                <span className="font-medium">{tasksData.steps.current.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${tasksData.steps.isCompleted ? 'bg-[#3AB1A0]' : 'bg-[#E06A26]'
                                                        }`}
                                                    style={{ width: `${Math.min((tasksData.steps.current / tasksData.steps.target) * 100, 100)}%` }}
                                                />
                                            </div>
                                            {tasksData.steps.isCompleted ? (
                                                <div className="flex items-center gap-2 text-[#3AB1A0] bg-[#3AB1A0]/10 p-3 rounded-lg">
                                                    <Check className="w-5 h-5" />
                                                    <span className="font-medium">Goal Achieved!</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="text-sm text-gray-500 text-center">
                                                        Keep walking! You need {(tasksData.steps.target - tasksData.steps.current).toLocaleString()} more steps.
                                                    </p>
                                                    <Button
                                                        onClick={() => handleCompleteTask('steps')}
                                                        disabled={completingTask === 'steps'}
                                                        className="w-full bg-[#3AB1A0] hover:bg-[#2A9A8B] text-white"
                                                    >
                                                        {completingTask === 'steps' ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Marking...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check className="h-4 w-4 mr-2" />
                                                                Mark as Done
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sleep Task Card */}
                        {tasksData.sleep && (
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleCard('sleep')}
                                    className="w-full p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tasksData.sleep.isCompleted ? 'bg-[#3AB1A0]/10' : 'bg-[#DB9C6E]/10'
                                            }`}>
                                            <Moon className={`w-6 h-6 ${tasksData.sleep.isCompleted ? 'text-[#3AB1A0]' : 'text-[#DB9C6E]'
                                                }`} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-800">Sleep Goal</h3>
                                            <p className="text-sm text-gray-500">
                                                Target: {tasksData.sleep.targetHours}h {tasksData.sleep.targetMinutes}m
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tasksData.sleep.isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-[#3AB1A0]" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-gray-300" />
                                        )}
                                        {expandedCards.sleep ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {expandedCards.sleep && (
                                    <div className="px-4 pb-4 border-t border-gray-100">
                                        <div className="pt-4 space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Target Sleep</span>
                                                <span className="font-medium">{tasksData.sleep.targetHours}h {tasksData.sleep.targetMinutes}m</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Logged Sleep</span>
                                                <span className="font-medium">{tasksData.sleep.currentHours}h {tasksData.sleep.currentMinutes}m</span>
                                            </div>
                                            {tasksData.sleep.isCompleted ? (
                                                <div className="flex items-center gap-2 text-[#3AB1A0] bg-[#3AB1A0]/10 p-3 rounded-lg">
                                                    <Check className="w-5 h-5" />
                                                    <span className="font-medium">Sleep Goal Met!</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleCompleteTask('sleep')}
                                                    disabled={completingTask === 'sleep'}
                                                    className="w-full py-3 bg-[#DB9C6E] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#C48A5E] disabled:opacity-50"
                                                >
                                                    {completingTask === 'sleep' ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Check className="w-5 h-5" />
                                                    )}
                                                    Mark as Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Activities Task Card */}
                        {tasksData.activities.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleCard('activities')}
                                    className="w-full p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tasksData.activities.every(a => a.completed) ? 'bg-[#3AB1A0]/10' : 'bg-[#E06A26]/10'
                                            }`}>
                                            <Dumbbell className={`w-6 h-6 ${tasksData.activities.every(a => a.completed) ? 'text-[#3AB1A0]' : 'text-[#E06A26]'
                                                }`} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-800">Activities</h3>
                                            <p className="text-sm text-gray-500">
                                                {tasksData.activities.filter(a => a.completed).length}/{tasksData.activities.length} completed
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {tasksData.activities.every(a => a.completed) ? (
                                            <CheckCircle2 className="w-6 h-6 text-[#3AB1A0]" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-gray-300" />
                                        )}
                                        {expandedCards.activities ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {expandedCards.activities && (
                                    <div className="px-4 pb-4 border-t border-gray-100">
                                        <div className="pt-4 space-y-3">
                                            {tasksData.activities.map((activity) => (
                                                <div
                                                    key={activity._id}
                                                    className={`p-3 rounded-xl border ${activity.completed
                                                        ? 'border-[#3AB1A0]/30 bg-[#3AB1A0]/10'
                                                        : 'border-gray-200 bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-gray-800">{activity.name}</h4>
                                                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                                                {activity.sets > 0 && (
                                                                    <span className="bg-white px-2 py-1 rounded">
                                                                        {activity.sets} sets
                                                                    </span>
                                                                )}
                                                                {activity.reps > 0 && (
                                                                    <span className="bg-white px-2 py-1 rounded">
                                                                        {activity.reps} reps
                                                                    </span>
                                                                )}
                                                                {activity.duration > 0 && (
                                                                    <span className="bg-white px-2 py-1 rounded">
                                                                        {activity.duration} min
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {activity.completed ? (
                                                            <div className="flex items-center gap-1 text-[#3AB1A0]">
                                                                <Check className="w-5 h-5" />
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleCompleteTask('activity', activity._id)}
                                                                disabled={completingTask === activity._id}
                                                                className="p-2 bg-[#E06A26] text-white rounded-lg hover:bg-[#C55A1C] disabled:opacity-50"
                                                            >
                                                                {completingTask === activity._id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {activity.videoLink && (
                                                        <a
                                                            href={activity.videoLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-[#E06A26] mt-2 inline-block"
                                                        >
                                                            Watch Video →
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <BottomNavBar />
        </div>
    );
}
