'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  IndianRupee,
  FileText,
  ChevronRight,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface Invoice {
  id: string;
  planName: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: Date;
  dueDate?: Date;
  downloadUrl?: string;
}

interface Subscription {
  id: string;
  planName: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  nextBillingDate: Date;
  features: string[];
}

export default function UserBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchBillingData();
    }
  }, [session]);

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/client/billing');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default data
  const defaultSubscription: Subscription = {
    id: '1',
    planName: 'Premium Plan',
    price: 2999,
    billingCycle: 'monthly',
    status: 'active',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    features: [
      'Personalized meal plans',
      'Unlimited dietitian consultations',
      'Progress tracking',
      'Recipe recommendations',
      'Priority support',
    ],
  };

  const defaultInvoices: Invoice[] = [
    {
      id: 'INV-001',
      planName: 'Premium Plan',
      amount: 2999,
      status: 'paid',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'INV-002',
      planName: 'Premium Plan',
      amount: 2999,
      status: 'paid',
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'INV-003',
      planName: 'Initial Consultation',
      amount: 499,
      status: 'paid',
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  ];

  const displaySubscription = subscription || defaultSubscription;
  const displayInvoices = invoices.length > 0 ? invoices : defaultInvoices;

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'active':
        return (
          <Badge className="text-green-700 bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            {status === 'paid' ? 'Paid' : 'Active'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="text-yellow-700 bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
      case 'expired':
        return (
          <Badge className="text-red-700 bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status === 'failed' ? 'Failed' : 'Expired'}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="text-gray-700 bg-gray-100">
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center px-4 py-4">
          <Link href="/user" className="absolute left-4 flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#3AB1A0]/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-black">Billing</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Subscription Card */}
        <Card className="border-0 shadow-sm bg-linear-to-br from-[#3AB1A0]/10 to-emerald-50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Current Plan</p>
                <h2 className="text-xl font-bold text-gray-900">{displaySubscription.planName}</h2>
              </div>
              {getStatusBadge(displaySubscription.status)}
            </div>

            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(displaySubscription.price)}
              </span>
              <span className="text-gray-500">/{displaySubscription.billingCycle}</span>
            </div>

            <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Next billing: {format(displaySubscription.nextBillingDate, 'MMM d, yyyy')}</span>
              </div>
            </div>

            {/* <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                Change Plan
              </Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                Cancel
              </Button>
            </div> */}
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">Plan Features</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <ul className="space-y-2">
              {displaySubscription.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-[#2a9989] shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

     

        {/* Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Billing History</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#2a9989]">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-3">
              {displayInvoices.slice(0, 5).map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invoice.planName}</p>
                      <p className="text-xs text-gray-500">{format(invoice.date, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Download className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border-0 shadow-sm bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Need help with billing?</p>
                <p className="text-sm text-gray-500">Contact our support team</p>
              </div>
              <Button variant="outline">
                Get Help
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
