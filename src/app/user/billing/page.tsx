'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ResponsiveLayout } from '@/components/client/layouts';
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
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

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
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

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
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            {status === 'paid' ? 'Paid' : 'Active'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status === 'failed' ? 'Failed' : 'Expired'}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-100 text-gray-700">
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <ResponsiveLayout title="Billing" subtitle="Manage your subscription">
      <div className="space-y-6">
        {/* Subscription Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
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

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Next billing: {format(displaySubscription.nextBillingDate, 'MMM d, yyyy')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                Change Plan
              </Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                Cancel
              </Button>
            </div>
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
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Payment Method</CardTitle>
              <Button variant="ghost" size="sm" className="text-green-600">
                Change
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="h-10 w-14 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                <p className="text-xs text-gray-500">Expires 12/25</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Billing History</CardTitle>
              <Button variant="ghost" size="sm" className="text-green-600">
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
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{invoice.planName}</p>
                      <p className="text-xs text-gray-500">{format(invoice.date, 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(invoice.amount)}</p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4 text-gray-500" />
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
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
}
