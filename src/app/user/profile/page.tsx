"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Heart,
  Activity,
  Utensils,
  Edit3,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Droplets,
  Scale,
  Target,
  Flame,
  Moon,
  Wine,
  Cigarette,
  Clock,
  ChefHat,
  AlertCircle,
  FileText,
  Baby,
  Stethoscope,
  ArrowLeft,
  Settings,
  ChevronRight,
  Gift,
  Users,
  Eye,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface ProfileData {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  profileImage: string;
  avatar?: string;
  createdAt: string;
  heightCm: number;
  weightKg: number;
  generalGoal: string;
  dietType: string;
  activityLevel: string;
  alternativeEmail: string;
  alternativePhone: string;
  anniversary: string;
  source: string;
  referralSource: string;
  assignedDietitian?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface MedicalData {
  medicalConditions: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  bloodGroup: string;
  gutIssues: string[];
  isPregnant: boolean;
  isLactating: boolean;
  menstrualCycle: string;
  bloodFlow: string;
  diseaseHistory: string;
  reports: Array<{ name: string; url: string; _id?: string; category?: string; createdAt?: string }>;
}

interface LifestyleData {
  heightFeet: number;
  heightInch: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  foodPreference: string;
  preferredCuisine: string[];
  allergiesFood: string[];
  fastDays: string[];
  eatOutFrequency: string;
  smokingFrequency: string;
  alcoholFrequency: string;
  activityLevel: string;
  cookingOil: string[];
  cravingType: string[] | string;
  waterIntake: string;
  sleepHours: number;
}

interface DietaryRecallData {
  meals: Array<{
    mealType: string;
    hour: string;
    minute: string;
    meridian: string;
    food: string;
  }>;
  date: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [medicalData, setMedicalData] = useState<MedicalData | null>(null);
  const [lifestyleData, setLifestyleData] = useState<LifestyleData | null>(null);
  const [dietaryRecallData, setDietaryRecallData] = useState<DietaryRecallData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        const [profileRes, medicalRes, lifestyleRes, recallRes] = await Promise.all([
          fetch("/api/client/profile"),
          fetch("/api/client/medical-info"),
          fetch("/api/client/lifestyle-info"),
          fetch("/api/client/dietary-recall")
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfileData(data.user || data);
        }

        if (medicalRes.ok) {
          const data = await medicalRes.json();
          setMedicalData(data);
        }

        if (lifestyleRes.ok) {
          const data = await lifestyleRes.json();
          setLifestyleData(data);
        }

        if (recallRes.ok) {
          const data = await recallRes.json();
          if (data.recalls && data.recalls.length > 0) {
            setDietaryRecallData(data.recalls[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchAllData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: "personal", label: "Personal", icon: User, color: "blue" },
    { id: "medical", label: "Medical", icon: Heart, color: "red" },
    { id: "lifestyle", label: "Lifestyle", icon: Activity, color: "green" },
    { id: "dietary", label: "Diet Recall", icon: Utensils, color: "orange" },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getGoalLabel = (goal: string) => {
    const labels: Record<string, string> = {
      'weight-loss': 'Weight Loss',
      'weight-gain': 'Weight Gain',
      'disease-management': 'Disease Management',
      'weight-loss-disease-management': 'Weight Loss + Disease'
    };
    return labels[goal] || goal || 'Not set';
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'google_ads': 'Google Ads',
      'facebook_ads': 'Facebook Ads',
      'instagram': 'Instagram',
      'referral': 'Referral',
      'other': 'Other'
    };
    return labels[source] || source || 'Not set';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#3AB1A0]/10 via-white to-[#E06A26]/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/user" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-black">My Profile</h1>
          </div>
          <Link
            href="/user/settings"
            className="p-2 rounded-xl bg-[#3AB1A0]/10 hover:bg-[#3AB1A0]/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-[#3AB1A0]" />
          </Link>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="px-4 py-6">
        <div className="bg-linear-to-r from-[#3AB1A0] via-[#2a9989] to-[#E06A26] rounded-3xl p-6 shadow-xl shadow-[#3AB1A0]/20 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="relative">
             
             
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-lg">
                {profileData?.avatar ? (
                  <img 
                    src={session?.user?.avatar} 
                    alt="Profile" 
                    className="object-cover w-full h-full rounded-2xl"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {getInitials(profileData?.firstName && profileData?.lastName ? `${profileData.firstName} ${profileData.lastName}` : profileData?.name || session?.user?.name || "User")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {profileData?.firstName && profileData?.lastName ? `${profileData.firstName} ${profileData.lastName}` : profileData?.name || session?.user?.name || "User"}
              </h2>
              <p className="text-blue-100 text-sm mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {profileData?.email || session?.user?.email}
              </p>
              {profileData?.phone && (
                <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {profileData.phone}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-white/70 text-xs">Age</p>
              <p className="text-white font-bold text-lg">
                {calculateAge(profileData?.dateOfBirth || "") || "--"}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-white/70 text-xs">Height</p>
              <p className="text-white font-bold text-lg">
                {lifestyleData?.heightCm || profileData?.heightCm || "--"} cm
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-white/70 text-xs">Weight</p>
              <p className="text-white font-bold text-lg">
                {profileData?.weightKg  || "--"} kg
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Tab Pills */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const colorClasses: Record<string, string> = {
              blue: isActive ? "bg-[#3AB1A0] text-white shadow-[#3AB1A0]/30" : "bg-white text-gray-600 hover:bg-[#3AB1A0]/10",
              red: isActive ? "bg-[#E06A26] text-white shadow-[#E06A26]/30" : "bg-white text-gray-600 hover:bg-[#E06A26]/10",
              green: isActive ? "bg-[#3AB1A0] text-white shadow-[#3AB1A0]/30" : "bg-white text-gray-600 hover:bg-[#3AB1A0]/10",
              orange: isActive ? "bg-[#E06A26] text-white shadow-[#E06A26]/30" : "bg-white text-gray-600 hover:bg-[#E06A26]/10",
            };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${colorClasses[tab.color]}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4 pb-24">
        {/* Personal Tab */}
        {activeTab === "personal" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link
                href="/user/personal-info"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3AB1A0]/10 text-[#3AB1A0] rounded-lg text-sm font-medium hover:bg-[#3AB1A0]/20 transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Personal Info
              </Link>
            </div>
            <InfoCard title="Basic Information" icon={User} color="blue">
              <InfoRow icon={User} label="First Name" value={profileData?.firstName || "Not set"} />
              <InfoRow icon={User} label="Last Name" value={profileData?.lastName || "Not set"} />
              <InfoRow icon={Mail} label="Email" value={profileData?.email || "Not set"} />
              <InfoRow icon={Phone} label="Phone" value={profileData?.phone || "Not set"} />
              <InfoRow icon={Mail} label="Alternative Email" value={profileData?.alternativeEmail || "Not set"} />
              <InfoRow icon={Phone} label="Alternative Phone" value={profileData?.alternativePhone || "Not set"} />
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(profileData?.dateOfBirth || "")} />
              <InfoRow icon={User} label="Gender" value={profileData?.gender || "Not set"} />
              <InfoRow icon={Gift} label="Anniversary" value={formatDate(profileData?.anniversary || "")} />
            </InfoCard>

            <InfoCard title="Referral Source" icon={Users} color="orange">
              <InfoRow icon={Users} label="How did you hear about us?" value={getSourceLabel(profileData?.source || "")} />
              {profileData?.source === 'other' && profileData?.referralSource && (
                <InfoRow icon={Users} label="Other Platform" value={profileData.referralSource} />
              )}
            </InfoCard>

            <InfoCard title="Health Goal" icon={Target} color="green">
              <InfoRow icon={Target} label="Primary Goal" value={getGoalLabel(profileData?.generalGoal || "")} />
              <InfoRow icon={Utensils} label="Diet Type" value={profileData?.dietType || "Not set"} />
              <InfoRow icon={Activity} label="Activity Level" value={profileData?.activityLevel || "Not set"} />
            </InfoCard>

            <InfoCard title="Body Metrics" icon={Scale} color="orange">
              <InfoRow icon={Scale} label="Height" value={profileData?.heightCm ? `${profileData.heightCm} cm` : "Not set"} />
              <InfoRow icon={Scale} label="Weight" value={profileData?.weightKg ? `${profileData.weightKg} kg` : "Not set"} />
            </InfoCard>

            <InfoCard title="Account" icon={Calendar} color="blue">
              <InfoRow icon={Calendar} label="Member Since" value={formatDate(profileData?.createdAt || "")} />
            </InfoCard>
          </div>
        )}

        {/* Medical Tab */}
        {activeTab === "medical" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link
                href="/user/medical-info"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E06A26]/10 text-[#E06A26] rounded-lg text-sm font-medium hover:bg-[#E06A26]/20 transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Medical Info
              </Link>
            </div>

            <InfoCard title="Blood & Health" icon={Droplets} color="red">
              <InfoRow icon={Droplets} label="Blood Group" value={medicalData?.bloodGroup || "Not set"} />
              <TagsRow
                icon={AlertCircle}
                label="Medical Conditions"
                values={medicalData?.medicalConditions || []}
                emptyText="No conditions listed"
                colorClass="bg-red-100 text-red-600"
              />
              <TagsRow
                icon={AlertCircle}
                label="Allergies"
                values={medicalData?.allergies || []}
                emptyText="No allergies listed"
                colorClass="bg-orange-100 text-orange-600"
              />
            </InfoCard>

            <InfoCard title="Dietary Restrictions" icon={Utensils} color="orange">
              <TagsRow
                icon={Utensils}
                label="Restrictions"
                values={medicalData?.dietaryRestrictions || []}
                emptyText="No restrictions"
                colorClass="bg-yellow-100 text-yellow-700"
              />
              <TagsRow
                icon={Stethoscope}
                label="Gut Issues"
                values={medicalData?.gutIssues || []}
                emptyText="No gut issues"
                colorClass="bg-[#DB9C6E]/20 text-[#DB9C6E]"
              />
            </InfoCard>

            <InfoCard title="Women's Health" icon={Baby} color="pink">
              <InfoRow icon={Baby} label="Pregnant" value={medicalData?.isPregnant ? "Yes" : "No"} />
              <InfoRow icon={Baby} label="Lactating" value={medicalData?.isLactating ? "Yes" : "No"} />
              <InfoRow icon={Calendar} label="Menstrual Cycle" value={medicalData?.menstrualCycle || "Not specified"} />
              <InfoRow icon={Droplets} label="Blood Flow" value={medicalData?.bloodFlow || "Not specified"} />
            </InfoCard>

            <InfoCard title="Medical Reports" icon={FileText} color="blue">
              {medicalData?.reports && medicalData.reports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Date</th>
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">Report Name</th>
                        <th className="text-center py-2 px-2 text-gray-500 font-medium">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicalData.reports.map((report, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 text-gray-600">
                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-medium text-gray-700">{report.name}</span>
                            {report.category && (
                              <span className="ml-2 text-xs bg-[#3AB1A0]/20 text-[#3AB1A0] px-2 py-0.5 rounded-full">{report.category}</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <a
                              href={report.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4 text-[#3AB1A0]" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No medical reports uploaded</p>
              )}
            </InfoCard>

            {/* Assigned Dietitian Section */}
            {profileData?.assignedDietitian && (
              <InfoCard title="Your Dietitian" icon={UserCheck} color="orange">
                <div className="bg-linear-to-r from-[#E06A26]/10 to-[#3AB1A0]/10 rounded-xl p-4 space-y-3 border border-[#E06A26]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#E06A26] to-[#DB9C6E] flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {profileData.assignedDietitian.firstName} {profileData.assignedDietitian.lastName}
                      </p>
                      <p className="text-sm text-[#E06A26]">Your Assigned Dietitian</p>
                    </div>
                  </div>

                  {profileData.assignedDietitian.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-[#3AB1A0]" />
                      <a href={`tel:${profileData.assignedDietitian.phone}`} className="text-gray-700 hover:text-[#E06A26]">
                        {profileData.assignedDietitian.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-[#3AB1A0]" />
                    <a href={`mailto:${profileData.assignedDietitian.email}`} className="text-gray-700 hover:text-[#E06A26]">
                      {profileData.assignedDietitian.email}
                    </a>
                  </div>
                </div>
              </InfoCard>
            )}
          </div>
        )}

        {/* Lifestyle Tab */}
        {activeTab === "lifestyle" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link
                href="/user/lifestyle-info"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3AB1A0]/10 text-[#3AB1A0] rounded-lg text-sm font-medium hover:bg-[#3AB1A0]/20 transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Lifestyle Info
              </Link>
            </div>

            <InfoCard title="Food Preferences" icon={ChefHat} color="orange">
              <InfoRow icon={Utensils} label="Food Preference" value={lifestyleData?.foodPreference || "Not set"} />
              <TagsRow
                icon={ChefHat}
                label="Preferred Cuisine"
                values={lifestyleData?.preferredCuisine || []}
                emptyText="Not specified"
                colorClass="bg-[#3AB1A0]/20 text-[#3AB1A0]"
              />
              <TagsRow
                icon={AlertCircle}
                label="Food Allergies"
                values={lifestyleData?.allergiesFood || []}
                emptyText="None"
                colorClass="bg-orange-100 text-orange-600"
              />
              <TagsRow
                icon={Calendar}
                label="Fasting Days"
                values={lifestyleData?.fastDays || []}
                emptyText="None"
                colorClass="bg-[#DB9C6E]/20 text-[#DB9C6E]"
              />
            </InfoCard>

            <InfoCard title="Habits & Activity" icon={Activity} color="blue">
              <InfoRow icon={Activity} label="Activity Level" value={lifestyleData?.activityLevel || "Not set"} />
              <InfoRow icon={Utensils} label="Eat Out Frequency" value={lifestyleData?.eatOutFrequency || "Not set"} />
              <InfoRow icon={Cigarette} label="Smoking" value={lifestyleData?.smokingFrequency || "Not set"} />
              <InfoRow icon={Wine} label="Alcohol" value={lifestyleData?.alcoholFrequency || "Not set"} />
            </InfoCard>

            <InfoCard title="Cooking & Cravings" icon={Flame} color="red">
              <TagsRow
                icon={ChefHat}
                label="Cooking Oil"
                values={lifestyleData?.cookingOil || []}
                emptyText="Not specified"
                colorClass="bg-yellow-100 text-yellow-700"
              />
              <TagsRow
                icon={Flame}
                label="Cravings"
                values={Array.isArray(lifestyleData?.cravingType) ? lifestyleData.cravingType : lifestyleData?.cravingType ? [lifestyleData.cravingType] : []}
                emptyText="None"
                colorClass="bg-pink-100 text-pink-600"
              />
            </InfoCard>
          </div>
        )}

        {/* Dietary Recall Tab */}
        {activeTab === "dietary" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link
                href="/user/dietary-recall"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E06A26]/10 text-[#E06A26] rounded-lg text-sm font-medium hover:bg-[#E06A26]/20 transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Dietary Recall
              </Link>
            </div>

            {dietaryRecallData?.meals && dietaryRecallData.meals.length > 0 ? (
              <div className="space-y-3">
                {dietaryRecallData.meals.map((meal, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getMealColor(meal.mealType)}`}>
                          <Utensils className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-gray-800 capitalize">{meal.mealType}</span>
                      </div>
                      {meal.hour && meal.minute && (
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm bg-gray-50 px-2.5 py-1 rounded-lg">
                          <Clock className="w-4 h-4" />
                          {meal.hour}:{meal.minute} {meal.meridian}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm pl-13 ml-13">{meal.food || "No food recorded"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                  <Utensils className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-gray-500 mb-4">No dietary recall recorded yet</p>
                <Link
                  href="/user/dietary-recall"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
                >
                  <Edit3 className="w-4 h-4" />
                  Add Dietary Recall
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// Helper Components
function InfoCard({ title, icon: Icon, color, children }: { title: string; icon: React.ComponentType<{ className?: string }>; color: string; children: React.ReactNode }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-[#3AB1A0]/10 text-[#3AB1A0]",
    red: "bg-[#E06A26]/10 text-[#E06A26]",
    green: "bg-[#3AB1A0]/10 text-[#3AB1A0]",
    orange: "bg-[#E06A26]/10 text-[#E06A26]",
    pink: "bg-[#DB9C6E]/10 text-[#DB9C6E]"
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-700 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function TagsRow({
  icon: Icon,
  label,
  values,
  emptyText,
  colorClass
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  values: string[];
  emptyText: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium mb-1.5">{label}</p>
        {values && values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {values.map((v, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
                {v}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function getMealColor(mealType: string): string {
  const colors: Record<string, string> = {
    "early morning": "bg-[#DB9C6E]/20 text-[#DB9C6E]",
    "breakfast": "bg-[#E06A26]/20 text-[#E06A26]",
    "lunch": "bg-[#3AB1A0]/20 text-[#3AB1A0]",
    "evening snack": "bg-[#3AB1A0]/20 text-[#3AB1A0]",
    "dinner": "bg-[#E06A26]/20 text-[#E06A26]",
    "post dinner": "bg-[#DB9C6E]/20 text-[#DB9C6E]",
  };
  return colors[mealType?.toLowerCase()] || "bg-gray-100 text-gray-600";
}
