'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ResponsiveLayout } from '@/components/client/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Moon, 
  Globe, 
  Lock, 
  HelpCircle, 
  FileText, 
  MessageCircle,
  ChevronRight,
  LogOut,
  Smartphone,
  Mail,
  Volume2,
  Eye,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function UserSettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    mealReminders: true,
    appointmentReminders: true,
    progressUpdates: false,
    darkMode: false,
    soundEnabled: true,
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Save to API
  };

  const settingSections = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'pushNotifications',
          label: 'Push Notifications',
          description: 'Receive push notifications on your device',
          icon: Smartphone,
        },
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive updates via email',
          icon: Mail,
        },
        {
          key: 'mealReminders',
          label: 'Meal Reminders',
          description: 'Get reminded about your meals',
          icon: Bell,
        },
        {
          key: 'appointmentReminders',
          label: 'Appointment Reminders',
          description: 'Reminders for upcoming appointments',
          icon: Bell,
        },
        {
          key: 'progressUpdates',
          label: 'Weekly Progress Updates',
          description: 'Receive weekly progress summaries',
          icon: Bell,
        },
      ],
    },
    {
      title: 'Appearance',
      icon: Eye,
      items: [
        {
          key: 'darkMode',
          label: 'Dark Mode',
          description: 'Use dark theme',
          icon: Moon,
        },
        {
          key: 'soundEnabled',
          label: 'Sound Effects',
          description: 'Play sounds for notifications',
          icon: Volume2,
        },
      ],
    },
  ];

  const linkSections = [
    {
      title: 'Privacy & Security',
      icon: Shield,
      links: [
        { label: 'Privacy Settings', href: '/user/settings/privacy', icon: Lock },
        { label: 'Change Password', href: '/user/settings/password', icon: Lock },
        { label: 'Two-Factor Authentication', href: '/user/settings/2fa', icon: Shield },
      ],
    },
    {
      title: 'Support',
      icon: HelpCircle,
      links: [
        { label: 'Help Center', href: '/help', icon: HelpCircle },
        { label: 'Contact Support', href: '/contact', icon: MessageCircle },
        { label: 'Report a Problem', href: '/report', icon: MessageCircle },
      ],
    },
    {
      title: 'Legal',
      icon: FileText,
      links: [
        { label: 'Terms of Service', href: '/terms', icon: FileText },
        { label: 'Privacy Policy', href: '/privacy', icon: FileText },
      ],
    },
  ];

  return (
    <ResponsiveLayout title="Settings" subtitle="Manage your preferences">
      <div className="space-y-6">
        {/* Setting Sections with Toggles */}
        {settingSections.map((section) => (
          <Card key={section.title} className="border-0 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <section.icon className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              {section.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <item.icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <Label className="font-medium text-gray-900">{item.label}</Label>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onCheckedChange={(checked) => updateSetting(item.key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Link Sections */}
        {linkSections.map((section) => (
          <Card key={section.title} className="border-0 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2">
                <section.icon className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-1">
              {section.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{link.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Language Selection */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <Label className="font-medium text-gray-900">Language</Label>
                  <p className="text-xs text-gray-500">English (US)</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* App Version */}
        <Card className="border-0 shadow-sm bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-500">DTPS Nutrition</p>
            <p className="text-xs text-gray-400">Version 1.0.0</p>
          </CardContent>
        </Card>

        {/* Sign Out Button */}
        <Button 
          variant="outline" 
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </ResponsiveLayout>
  );
}
