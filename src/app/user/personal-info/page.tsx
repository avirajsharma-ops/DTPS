"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  User,
  Users,
  Phone,
  Mail,
  Calendar,
  Camera,
  Loader2,
  Target,
  Scale,
  Activity,
  Gift
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface PersonalData {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  profileImage: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  activityLevel: string;
  generalGoal: string;
  dietType: string;
  alternativeEmail: string;
  alternativePhone: string;
  anniversary: string;
  source: string;
  referralSource: string;
}

const activityLevels = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "lightly_active", label: "Lightly Active", desc: "Light exercise 1-3 days/week" },
  { value: "moderately_active", label: "Moderately Active", desc: "Moderate exercise 3-5 days/week" },
  { value: "very_active", label: "Very Active", desc: "Hard exercise 6-7 days/week" },
  { value: "extremely_active", label: "Extremely Active", desc: "Very hard exercise, physical job" }
];

const healthGoals = [
  { value: "weight-loss", label: "Weight Loss" },
  { value: "weight-gain", label: "Weight Gain" },
  { value: "muscle-gain", label: "Muscle Gain" },
  { value: "maintain-weight", label: "Maintain Weight" },
  { value: "disease-management", label: "Disease Management" },
  { value: "not-specified", label: "Not Specified" }
];

const dietTypes = [
  { value: "standard", label: "Standard" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" }
];

export default function PersonalInfoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<PersonalData>({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    profileImage: "",
    heightCm: "",
    weightKg: "",
    targetWeightKg: "",
    activityLevel: "",
    generalGoal: "",
    dietType: "",
    alternativeEmail: "",
    alternativePhone: "",
    anniversary: "",
    source: "",
    referralSource: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/client/profile");
        if (res.ok) {
          const result = await res.json();
          const user = result.user || result;
          // Parse name into firstName and lastName if only name exists
          let firstName = user.firstName || "";
          let lastName = user.lastName || "";
          if (!firstName && !lastName && user.name) {
            const nameParts = user.name.split(" ");
            firstName = nameParts[0] || "";
            lastName = nameParts.slice(1).join(" ") || "";
          }
          setData({
            firstName,
            lastName,
            phone: user.phone || "",
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
            gender: user.gender || "",
            profileImage: user.profileImage || user.avatar || "",
            heightCm: user.heightCm || "",
            weightKg: user.weightKg || "",
            targetWeightKg: user.targetWeightKg || "",
            activityLevel: user.activityLevel || "",
            generalGoal: user.generalGoal || "",
            dietType: user.dietType || "",
            alternativeEmail: user.alternativeEmail || "",
            alternativePhone: user.alternativePhone || "",
            anniversary: user.anniversary ? user.anniversary.split("T")[0] : "",
            source: user.source || "",
            referralSource: user.referralSource || ""
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Combine firstName and lastName into name for backward compatibility
      const saveData = {
        ...data,
        name: `${data.firstName} ${data.lastName}`.trim()
      };
      const res = await fetch("/api/client/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData)
      });

      const result = await res.json();
      
      if (res.ok) {
        toast.success("Personal information saved successfully");
        router.push("/user/profile");
      } else {
        toast.error(result.error || "Failed to save personal information");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        setData({ ...data, profileImage: result.url });
        toast.success("Profile image uploaded");
      } else {
        toast.error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  // Convert cm to feet/inches for display
  const cmToFeetInches = (cm: string) => {
    const cmNum = parseFloat(cm);
    if (isNaN(cmNum) || cmNum <= 0) return { feet: 0, inches: 0 };
    const totalInches = cmNum / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  const heightDisplay = cmToFeetInches(data.heightCm);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#3AB1A0]/10 via-white to-[#3AB1A0]/10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/user/profile" className="p-2 -ml-2 rounded-xl hover:bg-[#3AB1A0]/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Personal Information</h1>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#3AB1A0] text-white rounded-xl text-sm font-semibold hover:bg-[#2a9989] transition-colors disabled:opacity-50 shadow-lg shadow-[#3AB1A0]/25"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="px-4 py-6 pb-24 space-y-6">
        {/* Profile Image */}
        <div className="flex justify-center">
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            {data.profileImage ? (
              <img 
                src={data.profileImage} 
                alt="Profile" 
                loading="lazy"
                className="w-28 h-28 rounded-2xl border-4 border-[#3AB1A0]/20 object-cover shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-linear-to-br from-[#3AB1A0] to-[#2a9989] flex items-center justify-center border-4 border-[#3AB1A0]/20 shadow-xl">
                <span className="text-3xl font-bold text-white">
                  {getInitials(data.firstName, data.lastName)}
                </span>
              </div>
            )}
            <button 
              onClick={handleImageClick}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#3AB1A0] rounded-xl flex items-center justify-center shadow-lg hover:bg-[#2a9989] transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Basic Details */}
        <Section title="Basic Details" icon={User}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="First Name"
                value={data.firstName}
                onChange={(v) => setData({ ...data, firstName: v })}
                placeholder="First name"
              />
              <InputField
                label="Last Name"
                value={data.lastName}
                onChange={(v) => setData({ ...data, lastName: v })}
                placeholder="Last name"
              />
            </div>
            
            <InputField
              label="Phone Number"
              value={data.phone}
              onChange={(v) => setData({ ...data, phone: v })}
              placeholder="Enter phone number"
              type="tel"
            />

            <InputField
              label="Alternative Phone"
              value={data.alternativePhone}
              onChange={(v) => setData({ ...data, alternativePhone: v })}
              placeholder="Alternative phone number"
              type="tel"
            />

            <InputField
              label="Alternative Email"
              value={data.alternativeEmail}
              onChange={(v) => setData({ ...data, alternativeEmail: v })}
              placeholder="Alternative email address"
              type="email"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={data.dateOfBirth}
                onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <div className="flex gap-2 flex-wrap">
                {["male", "female", "other"].map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setData({ ...data, gender })}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      data.gender === gender
                        ? "bg-[#3AB1A0] text-white shadow-lg shadow-[#3AB1A0]/25"
                        : "bg-gray-50 text-gray-600 hover:bg-[#3AB1A0]/10"
                    }`}
                  >
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Anniversary</label>
              <input
                type="date"
                value={data.anniversary}
                onChange={(e) => setData({ ...data, anniversary: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </Section>

        {/* Referral Source */}
        <Section title="How did you hear about us?" icon={Users}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Source</label>
              <select
                value={data.source}
                onChange={(e) => setData({ ...data, source: e.target.value, referralSource: e.target.value !== 'other' ? '' : data.referralSource })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
              >
                <option value="">Select source</option>
                <option value="google_ads">Google Ads</option>
                <option value="facebook_ads">Facebook Ads</option>
                <option value="instagram">Instagram</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
            {data.source === 'other' && (
              <InputField
                label="Please specify"
                value={data.referralSource}
                onChange={(v) => setData({ ...data, referralSource: v })}
                placeholder="Which platform?"
              />
            )}
          </div>
        </Section>

        {/* Body Metrics */}
        <Section title="Body Metrics" icon={Scale}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Height (CM)</label>
              <input
                type="number"
                value={data.heightCm}
                onChange={(e) => setData({ ...data, heightCm: e.target.value })}
                placeholder="Height in CM"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
              />
              {data.heightCm && (
                <p className="text-xs text-gray-500">
                  {heightDisplay.feet} ft {heightDisplay.inches} in
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Current Weight (KG)</label>
                <input
                  type="number"
                  value={data.weightKg}
                  onChange={(e) => setData({ ...data, weightKg: e.target.value })}
                  placeholder="Weight"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Target Weight (KG)</label>
                <input
                  type="number"
                  value={data.targetWeightKg}
                  onChange={(e) => setData({ ...data, targetWeightKg: e.target.value })}
                  placeholder="Target"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Activity Level */}
        <Section title="Activity Level" icon={Activity}>
          <div className="space-y-2">
            {activityLevels.map(level => (
              <button
                key={level.value}
                onClick={() => setData({ ...data, activityLevel: level.value })}
                className={`w-full p-3 rounded-xl text-left transition-all border ${
                  data.activityLevel === level.value
                    ? "bg-[#3AB1A0]/10 border-[#3AB1A0] ring-2 ring-[#3AB1A0]"
                    : "bg-gray-50 border-gray-200 hover:border-green-300"
                }`}
              >
                <p className={`font-medium ${data.activityLevel === level.value ? 'text-green-700' : 'text-gray-900'}`}>
                  {level.label}
                </p>
                <p className="text-xs text-gray-500">{level.desc}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Health Goal */}
        <Section title="Health Goal" icon={Target}>
          <div className="flex flex-wrap gap-2">
            {healthGoals.map(goal => (
              <button
                key={goal.value}
                onClick={() => setData({ ...data, generalGoal: goal.value })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  data.generalGoal === goal.value
                    ? "bg-[#3AB1A0] text-white shadow-lg shadow-[#3AB1A0]/25"
                    : "bg-gray-50 text-gray-600 hover:bg-[#3AB1A0]/10"
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Diet Type */}
        <Section title="Diet Type" icon={Target}>
          <div className="flex flex-wrap gap-2">
            {dietTypes.map(diet => (
              <button
                key={diet.value}
                onClick={() => setData({ ...data, dietType: diet.value })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  data.dietType === diet.value
                    ? "bg-[#3AB1A0] text-white shadow-lg shadow-[#3AB1A0]/25"
                    : "bg-gray-50 text-gray-600 hover:bg-[#3AB1A0]/10"
                }`}
              >
                {diet.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Email Display (Read-only) */}
        <Section title="Account" icon={Mail}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600">
              {session?.user?.email || "Not available"}
            </div>
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>
        </Section>
      </div>
    </div>
  );
}

// Section Component
function Section({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#3AB1A0] rounded-xl flex items-center justify-center shadow-lg shadow-[#3AB1A0]/25">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Input Field Component
function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] focus:border-transparent transition-all"
      />
    </div>
  );
}
