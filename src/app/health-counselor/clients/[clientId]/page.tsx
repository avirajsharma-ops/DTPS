'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  FileText,
  BookOpen,
  CreditCard,
  StickyNote,
  X,
  Plus,
  Eye,
  EyeOff,
  History,
  CheckSquare,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { BasicInfoForm, type BasicInfoData } from '@/components/clients/BasicInfoForm';
import { MedicalForm, type MedicalData } from '@/components/clients/MedicalForm';
import { LifestyleForm, type LifestyleData } from '@/components/clients/LifestyleForm';
import { RecallForm, type RecallEntry } from '@/components/clients/RecallForm';
import FormsSection from '@/components/clientDashboard/FormsSection';
import { JournalSection } from '@/components/journal';
import ProgressSection from '@/components/clientDashboard/ProgressSection';
import PlanningSection from '@/components/clientDashboard/PlanningSection';
import BookingsSection from '@/components/clientDashboard/BookingsSection';
import PaymentsSection from '@/components/clientDashboard/PaymentsSection';
import DocumentsSection from '@/components/clientDashboard/DocumentsSection';
import HistorySection from '@/components/clientDashboard/HistorySection';
import TasksSection from '@/components/clientDashboard/TasksSection';

interface ClientData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  activityLevel?: string;
  healthGoals?: string[];
  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  maritalStatus?: string;
  occupation?: string;
  source?: string;
  alternativePhone?: string;
  alternativeEmail?: string;
  anniversary?: string;
  assignedDietitian?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  sleepHours?: number | string;
  stressLevel?: string;
  smokingStatus?: string;
  alcoholConsumption?: string;
  waterIntake?: number | string;
  breakfast?: string;
  midMorningSnack?: string;
  lunch?: string;
  eveningSnack?: string;
  dinner?: string;
  dietaryNotes?: string;
  dietPlans?: Array<{
    _id?: string;
    title: string;
    status: string;
    calories: string;
    type: string;
    notes: string;
    startDate: string;
    endDate: string;
    days: number;
    progress: string;
  }>;
}

interface ClientNote {
  _id?: string;
  topicType: string;
  date: string;
  content: string;
  showToClient: boolean;
  attachments?: Array<{
    type: 'image' | 'video' | 'audio';
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
  }>;
  createdAt?: string;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

const NOTE_TOPIC_TYPES = [
  'General',
  'Diet Plan',
  'Escalation',
  'Medical',
  'Progress',
  'Consultation',
  'Renewal',
  'Follow-up',
  'Feedback',
  'Other'
] as const;

export default function HealthCounselorClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('forms');
  const [activeTab, setActiveTab] = useState('basic-details');

  // Notes panel state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState<ClientNote>({
    topicType: 'General',
    date: format(new Date(), 'yyyy-MM-dd'),
    content: '',
    showToClient: false,
    attachments: []
  });
  const [savingNote, setSavingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ClientNote | null>(null);

  // Active plan state
  const [activePlan, setActivePlan] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    duration: number;
    status: 'active' | 'inactive' | 'completed' | 'upcoming';
    hasMealPlan?: boolean;
  } | null>(null);

  // Form component states
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    parentAccount: '',
    altPhone: '',
    altEmails: '',
    anniversary: '',
    source: '',
    referralSource: '',
    generalGoal: '',
    maritalStatus: '',
    occupation: '',
    goalsList: [],
    targetWeightBucket: '',
    sharePhotoConsent: false,
    heightFeet: '',
    heightInch: '',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    idealWeightKg: '',
    bmi: '',
    activityLevel: ''
  });

  const [medicalData, setMedicalData] = useState<MedicalData>({
    medicalConditions: '',
    allergies: '',
    dietaryRestrictions: '',
    notes: '',
    diseaseHistory: [],
    medicalHistory: '',
    familyHistory: '',
    medication: '',
    bloodGroup: '',
    gutIssues: [],
    reports: [],
    isPregnant: false,
    isLactating: false,
    menstrualCycle: '',
    bloodFlow: ''
  });

  const [lifestyleData, setLifestyleData] = useState<LifestyleData>({
    foodPreference: '',
    preferredCuisine: [],
    allergiesFood: [],
    fastDays: [],
    nonVegExemptDays: [],
    foodLikes: '',
    foodDislikes: '',
    eatOutFrequency: '',
    smokingFrequency: '',
    alcoholFrequency: '',
    activityRate: '',
    cookingOil: [],
    monthlyOilConsumption: '',
    cookingSalt: '',
    carbonatedBeverageFrequency: '',
    cravingType: ''
  });

  const [recallEntries, setRecallEntries] = useState<RecallEntry[]>([]);

  useEffect(() => {
    if (params.clientId) {
      fetchClientDetails();
      fetchClientNotes();
      fetchActivePlan();
    }
  }, [params.clientId]);

  const fetchActivePlan = async () => {
    try {
      const mealPlanRes = await fetch(`/api/client-meal-plans?clientId=${params.clientId}`);
      if (mealPlanRes.ok) {
        const data = await mealPlanRes.json();
        const mealPlans = data.mealPlans || [];
        
        const activePlans = mealPlans
          .filter((p: any) => p.status === 'active')
          .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        if (activePlans.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const currentlyRunningPlan = activePlans.find((plan: any) => {
            const planStart = new Date(plan.startDate);
            const planEnd = new Date(plan.endDate);
            planStart.setHours(0, 0, 0, 0);
            planEnd.setHours(23, 59, 59, 999);
            return today >= planStart && today <= planEnd;
          });
          
          if (currentlyRunningPlan) {
            const planDuration = Math.ceil(
              (new Date(currentlyRunningPlan.endDate).getTime() - new Date(currentlyRunningPlan.startDate).getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
            
            setActivePlan({
              name: currentlyRunningPlan.name || 'Wellness Plan',
              startDate: currentlyRunningPlan.startDate,
              endDate: currentlyRunningPlan.endDate,
              duration: planDuration,
              status: 'active',
              hasMealPlan: true
            });
            return;
          }
        }
      }
      setActivePlan(null);
    } catch (error) {
      console.error('Error fetching active plan:', error);
      setActivePlan(null);
    }
  };

  const fetchClientNotes = async () => {
    try {
      const response = await fetch(`/api/users/${params.clientId}/notes`);
      if (response.ok) {
        const data = await response.json();
        // Filter notes - health counselor can only see their own notes
        const myNotes = (data?.notes || []).filter((note: ClientNote) => 
          note.createdBy?._id === (session?.user as any)?._id
        );
        setClientNotes(myNotes);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('Please fill in notes content');
      return;
    }

    try {
      setSavingNote(true);
      const response = await fetch(`/api/users/${params.clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });

      if (response.ok) {
        toast.success('Note saved successfully');
        setNewNote({
          topicType: 'General',
          date: format(new Date(), 'yyyy-MM-dd'),
          content: '',
          showToClient: false,
          attachments: []
        });
        setIsAddingNote(false);
        fetchClientNotes();
      } else {
        toast.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Error saving note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/users/${params.clientId}/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Note deleted');
        setClientNotes(prev => prev.filter(n => n._id !== noteId));
      } else {
        toast.error('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Error deleting note');
    }
  };

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${params.clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data?.user);

        // Populate form states
        setBasicInfo({
          firstName: data?.user?.firstName || '',
          lastName: data?.user?.lastName || '',
          email: data?.user?.email || '',
          phone: data?.user?.phone || '',
          dateOfBirth: data?.user?.dateOfBirth || '',
          gender: data?.user?.gender || '',
          parentAccount: data?.user?.parentAccount || '',
          altPhone: data?.user?.alternativePhone || '',
          altEmails: data?.user?.alternativeEmail || '',
          anniversary: data?.user?.anniversary || '',
          source: data?.user?.source || '',
          referralSource: data?.user?.referralSource || '',
          generalGoal: data?.user?.generalGoal || 'not-specified',
          maritalStatus: data?.user?.maritalStatus || '',
          occupation: data?.user?.occupation || '',
          goalsList: data?.user?.healthGoals || [],
          targetWeightBucket: data?.user?.targetWeightBucket || '',
          sharePhotoConsent: data?.user?.sharePhotoConsent || false,
          heightFeet: data?.user?.heightFeet || '',
          heightInch: data?.user?.heightInch || '',
          heightCm: String(data?.user?.heightCm || data?.user?.height || ''),
          weightKg: String(data?.user?.weightKg || data?.user?.weight || ''),
          targetWeightKg: data?.user?.targetWeightKg || '',
          idealWeightKg: data?.user?.idealWeightKg || '',
          bmi: data?.user?.bmi || '',
          activityLevel: data?.user?.activityLevel || ''
        });
      }
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  // Health counselors CAN edit client form data (basic info, medical, lifestyle)
  const handleSave = async () => {
    try {
      // Prepare the data to save
      const updateData = {
        // Basic Info
        firstName: basicInfo.firstName,
        lastName: basicInfo.lastName,
        email: basicInfo.email,
        phone: basicInfo.phone,
        dateOfBirth: basicInfo.dateOfBirth,
        gender: basicInfo.gender,
        parentAccount: basicInfo.parentAccount,
        alternativePhone: basicInfo.altPhone,
        alternativeEmail: basicInfo.altEmails,
        anniversary: basicInfo.anniversary,
        source: basicInfo.source,
        referralSource: basicInfo.referralSource,
        generalGoal: basicInfo.generalGoal,
        maritalStatus: basicInfo.maritalStatus,
        occupation: basicInfo.occupation,
        healthGoals: basicInfo.goalsList,
        targetWeightBucket: basicInfo.targetWeightBucket,
        sharePhotoConsent: basicInfo.sharePhotoConsent,
        heightFeet: basicInfo.heightFeet,
        heightInch: basicInfo.heightInch,
        heightCm: basicInfo.heightCm,
        height: basicInfo.heightCm,
        weightKg: basicInfo.weightKg,
        weight: basicInfo.weightKg,
        targetWeightKg: basicInfo.targetWeightKg,
        idealWeightKg: basicInfo.idealWeightKg,
        bmi: basicInfo.bmi,
        activityLevel: basicInfo.activityLevel,
        // Medical Data
        medicalConditions: medicalData.medicalConditions,
        allergies: medicalData.allergies,
        dietaryRestrictions: medicalData.dietaryRestrictions,
        medicalNotes: medicalData.notes,
        diseaseHistory: medicalData.diseaseHistory,
        medicalHistory: medicalData.medicalHistory,
        familyHistory: medicalData.familyHistory,
        medication: medicalData.medication,
        bloodGroup: medicalData.bloodGroup,
        gutIssues: medicalData.gutIssues,
        isPregnant: medicalData.isPregnant,
        isLactating: medicalData.isLactating,
        menstrualCycle: medicalData.menstrualCycle,
        bloodFlow: medicalData.bloodFlow,
        // Lifestyle Data
        foodPreference: lifestyleData.foodPreference,
        preferredCuisine: lifestyleData.preferredCuisine,
        allergiesFood: lifestyleData.allergiesFood,
        fastDays: lifestyleData.fastDays,
        nonVegExemptDays: lifestyleData.nonVegExemptDays,
        foodLikes: lifestyleData.foodLikes,
        foodDislikes: lifestyleData.foodDislikes,
        eatOutFrequency: lifestyleData.eatOutFrequency,
        smokingFrequency: lifestyleData.smokingFrequency,
        alcoholFrequency: lifestyleData.alcoholFrequency,
        activityRate: lifestyleData.activityRate,
        cookingOil: lifestyleData.cookingOil,
        monthlyOilConsumption: lifestyleData.monthlyOilConsumption,
        cookingSalt: lifestyleData.cookingSalt,
        carbonatedBeverageFrequency: lifestyleData.carbonatedBeverageFrequency,
        cravingType: lifestyleData.cravingType,
      };

      const response = await fetch(`/api/users/${params.clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success('Client data saved successfully');
        fetchClientDetails();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save client data');
      }
    } catch (error) {
      console.error('Error saving client data:', error);
      toast.error('Error saving client data');
    }
  };

  // Health counselors CAN edit dietary recall entries
  const handleSaveRecallEntry = async (entry: RecallEntry) => {
    try {
      const response = await fetch(`/api/users/${params.clientId}/recall`, {
        method: entry._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      if (response.ok) {
        toast.success('Recall entry saved');
        fetchClientDetails();
      } else {
        toast.error('Failed to save recall entry');
      }
    } catch (error) {
      console.error('Error saving recall entry:', error);
      toast.error('Error saving recall entry');
    }
  };

  const handleDeleteRecallEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/users/${params.clientId}/recall/${entryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Recall entry deleted');
        fetchClientDetails();
      } else {
        toast.error('Failed to delete recall entry');
      }
    } catch (error) {
      console.error('Error deleting recall entry:', error);
      toast.error('Error deleting recall entry');
    }
  };

  const calculateAge = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      const birthDate = new Date(dateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return null;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  const formatLastSeen = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Never';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Never';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Client not found</h3>
              <Button onClick={() => router.push('/health-counselor/clients')}>
                Back to Clients
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Navigation */}
          <div className="w-full bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
            <div className="max-w-full px-8 py-2 flex items-center justify-around gap-2 overflow-x-auto">
              <Button variant="ghost" size="sm" asChild className="mr-4">
                <Link href="/health-counselor/clients">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>

              <button
                onClick={() => setActiveSection('forms')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'forms'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Forms
              </button>

              <button
                onClick={() => setActiveSection('journal')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'journal'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Journal
              </button>

              <button
                onClick={() => setActiveSection('planning')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'planning'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Planning (View Only)
              </button>

              <button
                onClick={() => setActiveSection('payments')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'payments'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Payments
              </button>

              <button
                onClick={() => setActiveSection('bookings')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'bookings'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Bookings
              </button>

              <button
                onClick={() => setActiveSection('documents')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'documents'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Documents
              </button>

              <button
                onClick={() => setActiveSection('tasks')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'tasks'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </button>

              <button
                onClick={() => setActiveSection('history')}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSection === 'history'
                    ? 'text-blue-700 bg-blue-50 border border-blue-200 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <History className="h-4 w-4" />
                History
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Client Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-lg font-semibold bg-gradient-to-br from-blue-500 to-blue-600">
                      {client?.firstName?.[0] || ''}{client?.lastName?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-gray-900 truncate">
                          {client.firstName} {client.lastName}
                        </h1>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <span className="uppercase">{client?.gender}</span>
                          <span className="text-gray-400">|</span>
                          <span>{calculateAge(client?.dateOfBirth)} yrs</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                        <span className={`inline-block h-2 w-2 rounded-full ${activePlan?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="capitalize">{activePlan?.status === 'active' ? 'Active' : 'Inactive'}</span>
                        <span className="text-gray-300">•</span>
                        <span>Last seen: {formatLastSeen(client?.lastLoginAt || client?.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8 flex items-center gap-1.5"
                    onClick={() => setIsNotesOpen(true)}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    My Notes
                    {clientNotes.length > 0 && (
                      <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-blue-500">
                        {clientNotes.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>

              {/* Program Banner */}
              {activePlan ? (
                <div className="mt-5 rounded-2xl bg-gradient-to-r from-slate-600 via-slate-500 to-slate-400 px-6 py-5 shadow-lg">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${activePlan.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <p className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                          {activePlan.status === 'active' ? 'Currently Running' : 'Program Status'}
                        </p>
                      </div>
                      <h2 className="mt-2 text-xl text-white font-bold">{activePlan.name}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 px-4 py-3 shadow-md">
                        <p className="text-xs font-medium text-cyan-100 uppercase tracking-wide">Duration</p>
                        <p className="mt-1.5 text-lg font-bold text-white">{activePlan.duration} days</p>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-3 shadow-md">
                        <p className="text-xs font-medium text-violet-100 uppercase tracking-wide">Plan dates</p>
                        <p className="mt-1.5 text-sm font-semibold text-white">
                          {formatDate(activePlan.startDate)} – {formatDate(activePlan.endDate)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-3 shadow-md">
                        <p className="text-xs font-medium text-emerald-100 uppercase tracking-wide">Status</p>
                        <Badge className="mt-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-[11px] text-white font-semibold">
                          {activePlan.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-gradient-to-r from-gray-500 via-gray-400 to-gray-300 px-6 py-5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400"></div>
                    <p className="text-sm font-medium text-gray-200 uppercase tracking-wide">No Active Program</p>
                  </div>
                  <h2 className="mt-2 text-xl text-white font-bold">No Plan</h2>
                </div>
              )}
            </div>

            {/* Section Content */}
            {activeSection === 'forms' && (
              <FormsSection
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                basicInfo={basicInfo}
                medicalData={medicalData}
                lifestyleData={lifestyleData}
                recallEntries={recallEntries}
                setBasicInfo={setBasicInfo}
                setMedicalData={setMedicalData}
                setLifestyleData={setLifestyleData}
                setRecallEntries={setRecallEntries}
                handleSave={handleSave}
                handleSaveRecallEntry={handleSaveRecallEntry}
                handleDeleteRecallEntry={handleDeleteRecallEntry}
                loading={loading}
                clientId={params.clientId as string}
                userRole="dietitian"
              />
            )}

            {activeSection === 'journal' && (
              <JournalSection clientId={params.clientId as string} />
            )}

            {activeSection === 'planning' && (
              <div>
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>View Only:</strong> Health counselors can view meal plans but cannot create, edit, or delete them.
                  </p>
                </div>
                <PlanningSection client={client} />
              </div>
            )}

            {activeSection === 'payments' && (
              <PaymentsSection client={client} formatDate={formatDate} />
            )}

            {activeSection === 'bookings' && (
              <BookingsSection 
                clientId={client._id} 
                clientName={`${client.firstName} ${client.lastName}`}
                userRole="health_counselor"
                dietitianId={client.assignedDietitian?._id}
              />
            )}

            {activeSection === 'documents' && (
              <DocumentsSection client={client} formatDate={formatDate} />
            )}

            {activeSection === 'tasks' && (
              <TasksSection
                clientId={params.clientId as string}
                clientName={`${client?.firstName} ${client?.lastName}`}
                dietitianEmail={session?.user?.email}
                userRole="health_counselor"
              />
            )}

            {activeSection === 'history' && (
              <HistorySection clientId={params.clientId as string} />
            )}
          </div>
        </div>
      </div>

      {/* Notes Slide-out Panel */}
      <div 
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isNotesOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="absolute inset-0 bg-black/30"
          onClick={() => setIsNotesOpen(false)}
        />
        
        <div 
          className={`fixed top-1/2 right-0 -translate-y-1/2 h-[85vh] w-full max-w-sm bg-white shadow-2xl z-50 rounded-l-2xl overflow-hidden flex flex-col transition-transform duration-300 ease-out ${
            isNotesOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <StickyNote className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">My Notes</h2>
                <p className="text-xs text-gray-500">{clientNotes.length} notes</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
              onClick={() => setIsNotesOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Add Note Form */}
            {isAddingNote ? (
              <Card className="mb-4">
                <CardContent className="p-4 space-y-3">
                  <Select
                    value={newNote.topicType}
                    onValueChange={(v) => setNewNote(prev => ({ ...prev, topicType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_TOPIC_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={newNote.date}
                    onChange={(e) => setNewNote(prev => ({ ...prev, date: e.target.value }))}
                  />

                  <Textarea
                    placeholder="Write your note..."
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showToClient"
                      checked={newNote.showToClient}
                      onChange={(e) => setNewNote(prev => ({ ...prev, showToClient: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="showToClient" className="text-sm">Show to client</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingNote(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                    >
                      {savingNote ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                className="w-full mb-4"
                variant="outline"
                onClick={() => setIsAddingNote(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            )}

            {/* Notes List */}
            {clientNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <StickyNote className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientNotes.map((note) => (
                  <Card key={note._id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="text-xs mb-1">
                            {note.topicType}
                          </Badge>
                          <p className="text-sm text-gray-900 line-clamp-2">{note.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {note.date ? format(new Date(note.date), 'MMM d, yyyy') : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {note.showToClient ? (
                            <Eye className="h-3 w-3 text-green-600" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this note?')) {
                                handleDeleteNote(note._id!);
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
