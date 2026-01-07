'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SendNotificationForm from '@/components/notifications/SendNotificationForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserRole } from '@/types';
import { Bell, Search, Users, Loader2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  hasFcmToken?: boolean;
}

// Define allowed roles outside component to prevent recreation
const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR];

export default function SendNotificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user && !ALLOWED_ROLES.includes(session.user.role as UserRole)) {
      router.push('/dashboard');
    }
  }, [status, session?.user?.role, router]);

  // Fetch all clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/notifications/send');
        const data = await response.json();
        if (data.success) {
          setClients(data.clients || []);
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (status === 'authenticated') {
      fetchClients();
    }
  }, [status]);

  // Filter clients based on search
  const filteredClients = clients.filter(
    client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role as UserRole)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Send Notifications
          </h1>
          <p className="text-muted-foreground">
            Send custom push notifications to your clients
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notification Form */}
          <div className="lg:col-span-2">
            <SendNotificationForm />
          </div>
          
          {/* Client List Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Clients
                  </div>
                  <Badge variant="secondary">{clients.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Client List */}
                <div className="h-[400px] overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No clients found' : 'No clients registered'}
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={client.avatar} alt={client.name} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                        {client.hasFcmToken ? (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            <Bell className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                            No Token
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                {/* Summary */}
                {!loading && clients.length > 0 && (
                  <div className="pt-3 border-t text-sm text-muted-foreground">
                    <p>Total: {clients.length} clients</p>
                    <p>With notifications enabled: {clients.filter(c => c.hasFcmToken).length}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
