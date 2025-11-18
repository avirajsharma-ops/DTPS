'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Target,
  Activity,
  UtensilsCrossed,
  IndianRupee,
  FileText,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import ClientDietPlanTab from '@/components/dietician/ClientDietPlanTab';
import ClientPaymentsTab from '@/components/dietician/ClientPaymentsTab';
import ClientDetailsTab from '@/components/dietician/ClientDetailsTab';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  activityLevel?: string;
  healthGoals?: string[];
  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  createdAt: string;
}

export default function DieticianClientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = params?.id as string;
  const defaultTab = searchParams?.get('tab') || 'details';
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const clientResponse = await fetch(`/api/users/${clientId}`);
      if (clientResponse.ok) {
        const data = await clientResponse.json();
        // API returns { user } so we need to extract the user object
        setClient(data.user || data);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Client Not Found</h3>
              <p className="text-gray-600 mb-4">The requested client could not be found.</p>
              <Button asChild>
                <Link href="/dietician/clients">Back to Clients</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild className="cursor-pointer">
          <Link href="/dietician/clients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Link>
        </Button>

        {/* Client Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={client.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                    {client.firstName?.[0] || 'U'}{client.lastName?.[0] || 'N'}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {client.firstName} {client.lastName}
                  </h1>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {client.email}
                    </div>
                    {client.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={
                      client.status === 'active' ? 'bg-green-100 text-green-800' :
                      client.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {client.status}
                    </Badge>
                    {client.gender && (
                      <Badge variant="outline">{client.gender}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right text-sm text-gray-600">
                <div className="flex items-center justify-end">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {formatDate(client.createdAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="diet-plan" className="cursor-pointer">
              <UtensilsCrossed className="h-4 w-4 mr-2" />
              Diet Plan
            </TabsTrigger>
            <TabsTrigger value="payments" className="cursor-pointer">
              <IndianRupee className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <ClientDetailsTab client={client} onUpdate={fetchClientData} />
          </TabsContent>

          <TabsContent value="diet-plan">
            <ClientDietPlanTab clientId={clientId} client={client} />
          </TabsContent>

          <TabsContent value="payments">
            <ClientPaymentsTab clientId={clientId} client={client} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

