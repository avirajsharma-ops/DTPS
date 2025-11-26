"use client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save } from 'lucide-react';

export interface BasicInfoData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  parentAccount: string;
  altPhone: string;
  altEmails: string;
  anniversary: string;
  source: string;
  referralSource: string;
  generalGoal: string; // Goal text or enum
  maritalStatus: string;
  occupation: string;
  goalsList: string[]; // multi-select
  targetWeightBucket: string;
  sharePhotoConsent: boolean;
}

interface BasicInfoFormProps extends BasicInfoData {
  onChange: (field: keyof BasicInfoData, value: string) => void;
  onSave: () => void;
  loading?: boolean;
}

export function BasicInfoForm({ firstName, lastName, email, phone, dateOfBirth, gender, parentAccount, altPhone, altEmails, anniversary, source, referralSource, generalGoal, maritalStatus, occupation, goalsList, targetWeightBucket, sharePhotoConsent, onChange, onSave, loading }: BasicInfoFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Client's personal details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" value={firstName} onChange={e => onChange('firstName', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" value={lastName} onChange={e => onChange('lastName', e.target.value)} required />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={email} onChange={e => onChange('email', e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={e => onChange('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={e => onChange('dateOfBirth', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={val => onChange('gender', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="parentAccount">Parent Account</Label>
            <Input id="parentAccount" value={parentAccount} onChange={e => onChange('parentAccount', e.target.value)} placeholder="Parent name or ID" />
          </div>
          <div>
            <Label htmlFor="altPhone">Alternative Phone Number</Label>
            <Input id="altPhone" value={altPhone} onChange={e => onChange('altPhone', e.target.value)} placeholder="+91 90000 00000" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="altEmails">Alternative Emails</Label>
            <Input id="altEmails" value={altEmails} onChange={e => onChange('altEmails', e.target.value)} placeholder="comma separated" />
          </div>
          <div>
            <Label htmlFor="anniversary">Anniversary</Label>
            <Input id="anniversary" type="date" value={anniversary} onChange={e => onChange('anniversary', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="source">Source</Label>
            <Select value={source} onValueChange={val => onChange('source', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google-ads">Google Ads</SelectItem>
                <SelectItem value="facebook-ads">Facebook Ads</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="referralSource">Change Referral / Referral Source</Label>
            <Input id="referralSource" value={referralSource} onChange={e => onChange('referralSource', e.target.value)} placeholder="Referral name/code" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="generalGoal">Goal</Label>
            <Select value={generalGoal} onValueChange={val => onChange('generalGoal', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Not Specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-specified">Not Specified</SelectItem>
                <SelectItem value="weight-loss">Weight Loss</SelectItem>
                <SelectItem value="weight-gain">Weight Gain</SelectItem>
                <SelectItem value="disease-management">Disease Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="maritalStatus">Marital Status *</Label>
            <Select value={maritalStatus} onValueChange={val => onChange('maritalStatus', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="occupation">Occupation *</Label>
            <Input id="occupation" value={occupation} onChange={e => onChange('occupation', e.target.value)} placeholder="Occupation" />
          </div>
          <div>
            <Label htmlFor="targetWeightBucket">What is Your Target Weight?</Label>
            <Select value={targetWeightBucket} onValueChange={val => onChange('targetWeightBucket', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent className="max-h-72 overflow-auto">
                <SelectItem value="below-5">Below 5 Kgs</SelectItem>
                <SelectItem value="5-10">5 to 10 Kgs</SelectItem>
                <SelectItem value="10-15">10 to 15 Kgs</SelectItem>
                <SelectItem value="15-20">15 to 20 Kgs</SelectItem>
                <SelectItem value="20-25">20 to 25 Kgs</SelectItem>
                <SelectItem value="25-30">25 to 30 Kgs</SelectItem>
                <SelectItem value="more-30">More than 30 Kgs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>What Are Your Goals?</Label>
          <div className="flex flex-wrap gap-2">
            {['Weight Loss','Weight Gain','Weight Loss + Disease Management','Only Disease Management','Other'].map(item => {
              const value = item.toLowerCase().replace(/\s+/g,'-');
              const selected = goalsList.includes(value);
              return (
                <Button key={value} type="button" variant={selected ? 'default':'outline'} size="sm" onClick={() => {
                  const next = selected ? goalsList.filter(g => g !== value) : [...goalsList, value];
                  onChange('goalsList', next.join(','));
                }}>{item}</Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="sharePhotoConsent" checked={sharePhotoConsent} onChange={e => onChange('sharePhotoConsent', e.target.checked ? 'true':'false')} className="h-4 w-4" />
          <Label htmlFor="sharePhotoConsent">Ready to share front/side photos (for analysis)?</Label>
        </div>
        <div className="flex justify-end mt-4">
           <Button type="button" onClick={onSave} disabled={loading}>
             <Save className="mr-2 h-4 w-4" />
             Save Basic Info
           </Button>
         </div>
      </CardContent>
    </Card>
  );
}
export default BasicInfoForm;
