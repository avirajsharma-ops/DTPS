'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  Eye,
  UserPlus,
  UserMinus,
  Filter,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRightLeft,
  Check
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getClientId, getDietitianId } from '@/lib/utils';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  status: string;
  createdAt: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  activityLevel?: string;
  healthGoals?: string[];
  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  assignedDietitian?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  assignedDietitians?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  }[];
  assignedHealthCounselor?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

interface Dietitian {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  specialization?: string;
  status: string;
  clientCount: number;
}

interface HealthCounselor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  status: string;
  clientCount: number;
}

export default function AdminAllClientsPage() {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [dietitians, setDietitians] = useState<Dietitian[]>([]);
  const [healthCounselors, setHealthCounselors] = useState<HealthCounselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [stats, setStats] = useState({ total: 0, assigned: 0, unassigned: 0 });
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDietitianId, setSelectedDietitianId] = useState('');
  const [selectedHealthCounselorId, setSelectedHealthCounselorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMode, setAssignMode] = useState<'add' | 'replace' | 'remove'>('add');
  const [dietitianSearchTerm, setDietitianSearchTerm] = useState('');
  const [healthCounselorSearchTerm, setHealthCounselorSearchTerm] = useState('');

  // Transfer dialog state (bulk transfer)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [transferDietitianId, setTransferDietitianId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Detail view dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchClients();
      fetchDietitians();
      fetchHealthCounselors();
    }
  }, [filterStatus, filterAssigned, status]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterAssigned !== 'all') params.append('assigned', filterAssigned);
      
      const response = await fetch(`/api/admin/clients?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
        setStats(data.stats || { total: 0, assigned: 0, unassigned: 0 });
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchDietitians = async () => {
    try {
      const response = await fetch('/api/admin/dietitians');
      if (response.ok) {
        const data = await response.json();
        setDietitians(data.dietitians || []);
      }
    } catch (error) {
      console.error('Error fetching dietitians:', error);
    }
  };

  const fetchHealthCounselors = async () => {
    try {
      const response = await fetch('/api/admin/health-counselors');
      if (response.ok) {
        const data = await response.json();
        setHealthCounselors(data.healthCounselors || []);
      }
    } catch (error) {
      console.error('Error fetching health counselors:', error);
    }
  };

  const openDetailDialog = (client: Client) => {
    setDetailClient(client);
    setDetailDialogOpen(true);
  };

  const openAssignDialog = (client: Client) => {
    setSelectedClient(client);
    setSelectedDietitianId('');
    setSelectedHealthCounselorId('');
    setAssignMode('add');
    setDietitianSearchTerm('');
    setHealthCounselorSearchTerm('');
    setAssignDialogOpen(true);
  };

  const handleAssignDietitian = async () => {
    if (!selectedClient) return;

    try {
      setAssigning(true);
      const payload = { 
        dietitianId: selectedDietitianId || null,
        healthCounselorId: selectedHealthCounselorId === '' ? null : selectedHealthCounselorId || null,
        mode: assignMode
      };
      
      console.log('Sending assignment payload:', payload);
      
      const response = await fetch(`/api/admin/clients/${selectedClient._id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Assignment response:', data);
        toast.success(data.message);
        
        // Update the client in the list
        setClients(prevClients =>
          prevClients.map(c =>
            c._id === selectedClient._id ? data.client : c
          )
        );
        
        setAssignDialogOpen(false);
        fetchClients(); // Refresh to update stats
      } else {
        const error = await response.json();
        console.error('Assignment error:', error);
        toast.error(error.error || 'Failed to assign professional');
      }
    } catch (error) {
      console.error('Error assigning professional:', error);
      toast.error('Failed to assign professional');
    } finally {
      setAssigning(false);
    }
  };

  // Remove a specific dietitian from a client
  const handleRemoveDietitian = async (clientId: string, dietitianId: string) => {
    try {
      setAssigning(true);
      const response = await fetch(`/api/admin/clients/${clientId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dietitianId: dietitianId,
          mode: 'remove'
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Dietitian removed successfully');
        
        // Update the client in the list
        setClients(prevClients =>
          prevClients.map(c =>
            c._id === clientId ? data.client : c
          )
        );
        
        // Update selected client if it's the same
        if (selectedClient?._id === clientId) {
          setSelectedClient(data.client);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove dietitian');
      }
    } catch (error) {
      console.error('Error removing dietitian:', error);
      toast.error('Failed to remove dietitian');
    } finally {
      setAssigning(false);
    }
  };

  // Remove health counselor from a client
  const handleRemoveHealthCounselor = async (clientId: string) => {
    try {
      setAssigning(true);
      const response = await fetch(`/api/admin/clients/${clientId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          healthCounselorId: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Health counselor removed successfully');
        
        // Update the client in the list
        setClients(prevClients =>
          prevClients.map(c =>
            c._id === clientId ? data.client : c
          )
        );
        
        // Update selected client if it's the same
        if (selectedClient?._id === clientId) {
          setSelectedClient(data.client);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove health counselor');
      }
    } catch (error) {
      console.error('Error removing health counselor:', error);
      toast.error('Failed to remove health counselor');
    } finally {
      setAssigning(false);
    }
  };

  // Toggle client selection for bulk transfer
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Select all visible clients
  const selectAllClients = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c._id));
    }
  };

  // Handle bulk transfer
  const handleBulkTransfer = async () => {
    if (selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }
    if (!transferDietitianId) {
      toast.error('Please select a dietitian to transfer to');
      return;
    }

    try {
      setTransferring(true);
      
      // Transfer each client
      const results = await Promise.all(
        selectedClients.map(async (clientId) => {
          const response = await fetch(`/api/admin/clients/${clientId}/assign`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dietitianId: transferDietitianId })
          });
          return { clientId, success: response.ok };
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Successfully transferred ${successCount} client(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to transfer ${failCount} client(s)`);
      }

      setTransferDialogOpen(false);
      setSelectedClients([]);
      setTransferDietitianId('');
      fetchClients();
    } catch (error) {
      console.error('Error transferring clients:', error);
      toast.error('Failed to transfer clients');
    } finally {
      setTransferring(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const calculateAge = (dateOfBirth: string | undefined) => {
    if (!dateOfBirth) return null;
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Clients</h1>
            <p className="text-gray-600 mt-1">
              Manage and assign clients to dietitians
            </p>
          </div>
          {selectedClients.length > 0 && (
            <Button 
              onClick={() => setTransferDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer {selectedClients.length} Client(s)
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600" />
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 sm:h-8 w-6 sm:w-8 text-green-600" />
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.assigned}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Unassigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <XCircle className="h-6 sm:h-8 w-6 sm:w-8 text-orange-600" />
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.unassigned}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Assignment Filter */}
              <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="true">Assigned Only</SelectItem>
                  <SelectItem value="false">Unassigned Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search terms or filters'
                  : 'Clients will appear here once they register'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left">
                        <Checkbox
                          checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                          onCheckedChange={selectAllClients}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Health Info
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dietitian
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Health Counselor
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr key={client._id} className={`hover:bg-gray-50 ${selectedClients.includes(client._id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <Checkbox
                            checked={selectedClients.includes(client._id)}
                            onCheckedChange={() => toggleClientSelection(client._id)}
                            aria-label={`Select ${client.firstName} ${client.lastName}`}
                          />
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Avatar className="h-8 sm:h-10 w-8 sm:w-10">
                              <AvatarImage src={client.avatar} />
                              <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-600 text-white text-xs sm:text-sm">
                                {client.firstName?.[0] || 'U'}{client.lastName?.[0] || 'N'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-2 sm:ml-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {client.firstName} {client.lastName}
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                  {getClientId(client._id)}
                                </span>
                              </div>
                              {/* Show email on mobile */}
                              <div className="text-xs text-gray-500 sm:hidden truncate max-w-30">
                                {client.email}
                              </div>
                              {client.dateOfBirth && calculateAge(client.dateOfBirth) && (
                                <div className="text-xs text-gray-500 hidden sm:block">
                                  {calculateAge(client.dateOfBirth)} years, {client.gender || 'N/A'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{client.email}</div>
                          {client.phone && (
                            <div className="text-xs text-gray-500">{client.phone}</div>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {client.weight && <span>⚖️ {client.weight}kg</span>}
                            {client.height && <span className="ml-2">📏 {client.height}cm</span>}
                          </div>
                          {client.healthGoals && client.healthGoals.length > 0 && (
                            <div className="text-xs text-gray-500 capitalize">
                              🎯 {client.healthGoals[0]}
                              {client.healthGoals.length > 1 && ` +${client.healthGoals.length - 1}`}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          {(client.assignedDietitians && client.assignedDietitians.length > 0) ? (
                            <div className="space-y-2">
                              {client.assignedDietitians.map((dietitian) => (
                                <div key={dietitian._id} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={dietitian.avatar} />
                                    <AvatarFallback className="bg-green-100 text-green-800 text-xs">
                                      {dietitian.firstName?.[0]}{dietitian.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="hidden sm:block">
                                    <div className="text-xs font-medium text-gray-900">
                                      {dietitian.firstName} {dietitian.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">{dietitian.email}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                              <UserMinus className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Unassigned</span>
                            </Badge>
                          )}
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          {client.assignedHealthCounselor ? (
                            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={client.assignedHealthCounselor.avatar} />
                                <AvatarFallback className="bg-purple-100 text-purple-800 text-xs">
                                  {client.assignedHealthCounselor.firstName?.[0]}{client.assignedHealthCounselor.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-xs font-medium text-gray-900">
                                  {client.assignedHealthCounselor.firstName} {client.assignedHealthCounselor.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{client.assignedHealthCounselor.email}</div>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                              <UserMinus className="h-3 w-3 mr-1" />
                              <span>Not Assigned</span>
                            </Badge>
                          )}
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(client.status)}>
                            {client.status}
                          </Badge>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(client.createdAt)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignDialog(client)}
                              className="text-xs px-2 sm:px-3"
                            >
                              <UserPlus className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">{client.assignedDietitian ? 'Reassign' : 'Assign'}</span>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openDetailDialog(client)}
                              className="text-xs px-2 sm:px-3"
                            >
                              <Eye className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Professionals</DialogTitle>
              <DialogDescription>
                {selectedClient && (
                  <>
                    Assign dietitians and health counselors for <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Currently assigned professionals */}
              <div className="space-y-3">
                {/* Dietitians */}
                {selectedClient?.assignedDietitians && selectedClient.assignedDietitians.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-900 mb-2 font-medium">Currently assigned dietitians:</p>
                    <div className="space-y-2">
                      {selectedClient.assignedDietitians.map((dietitian) => (
                        <div key={dietitian._id} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={dietitian.avatar} />
                              <AvatarFallback className="bg-green-200 text-green-800 text-xs">
                                {dietitian.firstName?.[0]}{dietitian.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm font-medium text-gray-900">
                                {dietitian.firstName} {dietitian.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{dietitian.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveDietitian(selectedClient._id, dietitian._id)}
                            disabled={assigning}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health Counselor */}
                {selectedClient?.assignedHealthCounselor && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 mb-2 font-medium">Currently assigned health counselor:</p>
                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedClient.assignedHealthCounselor.avatar} />
                          <AvatarFallback className="bg-purple-200 text-purple-800 text-xs">
                            {selectedClient.assignedHealthCounselor.firstName?.[0]}{selectedClient.assignedHealthCounselor.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-2">
                          <p className="text-sm font-medium text-gray-900">
                            {selectedClient.assignedHealthCounselor.firstName} {selectedClient.assignedHealthCounselor.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{selectedClient.assignedHealthCounselor.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveHealthCounselor(selectedClient._id)}
                        disabled={assigning}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Assignment mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">Assignment Mode</label>
                <Select value={assignMode} onValueChange={(v) => setAssignMode(v as 'add' | 'replace')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add to existing dietitians</SelectItem>
                    <SelectItem value="replace">Replace all with selected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dietitian Selection Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Dietitian Assignment</h4>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Dietitian to Add
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search dietitians..."
                      value={dietitianSearchTerm}
                      onChange={(e) => setDietitianSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedDietitianId} onValueChange={setSelectedDietitianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a dietitian..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dietitians
                        .filter(d => assignMode === 'replace' || !selectedClient?.assignedDietitians?.some(ad => ad._id === d._id))
                        .filter(d => {
                          if (!dietitianSearchTerm.trim()) return true;
                          const searchLower = dietitianSearchTerm.toLowerCase();
                          const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
                          return fullName.includes(searchLower) || d.email?.toLowerCase().includes(searchLower);
                        })
                        .map((dietitian) => (
                        <SelectItem key={dietitian._id} value={dietitian._id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{dietitian.firstName} {dietitian.lastName}</span>
                            <Badge variant="outline" className="ml-2">
                              {dietitian.clientCount} clients
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDietitianId && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    {(() => {
                      const dietitian = dietitians.find(d => d._id === selectedDietitianId);
                      if (!dietitian) return null;
                      return (
                        <div>
                          <p className="text-sm text-green-900 mb-1">Selected dietitian:</p>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={dietitian.avatar} />
                              <AvatarFallback className="bg-green-200 text-green-800 text-xs">
                                {dietitian.firstName?.[0]}{dietitian.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm font-medium text-green-900">
                                {dietitian.firstName} {dietitian.lastName}
                              </p>
                              <p className="text-xs text-green-700">
                                {dietitian.email} • {dietitian.clientCount} clients
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Health Counselor Selection Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Health Counselor Assignment</h4>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Health Counselor
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search health counselors..."
                      value={healthCounselorSearchTerm}
                      onChange={(e) => setHealthCounselorSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedHealthCounselorId} onValueChange={setSelectedHealthCounselorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a health counselor or leave empty for none..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (No Health Counselor)</SelectItem>
                      {healthCounselors
                        .filter(hc => {
                          if (!healthCounselorSearchTerm.trim()) return true;
                          const searchLower = healthCounselorSearchTerm.toLowerCase();
                          const fullName = `${hc.firstName} ${hc.lastName}`.toLowerCase();
                          return fullName.includes(searchLower) || hc.email?.toLowerCase().includes(searchLower);
                        })
                        .map((hc) => (
                        <SelectItem key={hc._id} value={hc._id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{hc.firstName} {hc.lastName}</span>
                            <Badge variant="outline" className="ml-2">
                              {hc.clientCount} clients
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedHealthCounselorId && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    {(() => {
                      const hc = healthCounselors.find(h => h._id === selectedHealthCounselorId);
                      if (!hc) return null;
                      return (
                        <div>
                          <p className="text-sm text-purple-900 mb-1">Selected health counselor:</p>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={hc.avatar} />
                              <AvatarFallback className="bg-purple-200 text-purple-800 text-xs">
                                {hc.firstName?.[0]}{hc.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-2">
                              <p className="text-sm font-medium text-purple-900">
                                {hc.firstName} {hc.lastName}
                              </p>
                              <p className="text-xs text-purple-700">
                                {hc.email} • {hc.clientCount} clients
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignDietitian}
                disabled={assigning}
              >
                {assigning ? 'Assigning...' : 'Save Assignments'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog (Bulk Transfer) */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                Transfer Clients
              </DialogTitle>
              <DialogDescription>
                Transfer {selectedClients.length} selected client(s) to a new dietitian
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Selected clients list */}
              <div className="max-h-32 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Clients:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClients.map(clientId => {
                    const client = clients.find(c => c._id === clientId);
                    return client ? (
                      <Badge key={clientId} variant="secondary" className="text-xs">
                        {client.firstName} {client.lastName}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select New Dietitian
                </label>
                <Select value={transferDietitianId} onValueChange={setTransferDietitianId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a dietitian..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dietitians.map((dietitian) => (
                      <SelectItem key={dietitian._id} value={dietitian._id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{dietitian.firstName} {dietitian.lastName}</span>
                          <Badge variant="outline" className="ml-2">
                            {dietitian.clientCount} clients
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {transferDietitianId && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {(() => {
                    const dietitian = dietitians.find(d => d._id === transferDietitianId);
                    if (!dietitian) return null;
                    return (
                      <div>
                        <p className="text-sm text-blue-900 mb-1">Transferring to:</p>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={dietitian.avatar} />
                            <AvatarFallback className="bg-blue-200 text-blue-800 text-xs">
                              {dietitian.firstName?.[0]}{dietitian.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-blue-900">
                              {dietitian.firstName} {dietitian.lastName}
                            </p>
                            <p className="text-xs text-blue-700">
                              {dietitian.email} • {dietitian.clientCount} current clients
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> The new dietitian will have full access to all client data including diet plans, payments, and medical records.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setTransferDialogOpen(false);
                  setTransferDietitianId('');
                }}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkTransfer}
                disabled={transferring || !transferDietitianId}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {transferring ? 'Transferring...' : `Transfer ${selectedClients.length} Client(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Client Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Client Details</DialogTitle>
            </DialogHeader>

            {detailClient && (
              <div className="space-y-6 py-4">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">First Name</p>
                      <p className="text-sm font-medium text-gray-900">{detailClient.firstName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Last Name</p>
                      <p className="text-sm font-medium text-gray-900">{detailClient.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium text-gray-900">{detailClient.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{detailClient.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Client ID</p>
                      <p className="text-sm font-medium text-gray-900">{getClientId(detailClient._id)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                      <Badge className={getStatusColor(detailClient.status)}>
                        {detailClient.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Health Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Health Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</p>
                      <p className="text-sm font-medium text-gray-900">
                        {detailClient.dateOfBirth ? formatDate(detailClient.dateOfBirth) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Age</p>
                      <p className="text-sm font-medium text-gray-900">
                        {detailClient.dateOfBirth ? calculateAge(detailClient.dateOfBirth) : 'N/A'} years
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Gender</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{detailClient.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Height</p>
                      <p className="text-sm font-medium text-gray-900">{detailClient.height ? `${detailClient.height} cm` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Weight</p>
                      <p className="text-sm font-medium text-gray-900">{detailClient.weight ? `${detailClient.weight} kg` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Activity Level</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{detailClient.activityLevel || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Health Goals */}
                {detailClient.healthGoals && detailClient.healthGoals.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Health Goals</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailClient.healthGoals.map((goal, idx) => (
                        <Badge key={idx} variant="secondary">{goal}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medical Conditions */}
                {detailClient.medicalConditions && detailClient.medicalConditions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Medical Conditions</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailClient.medicalConditions.map((condition, idx) => (
                        <Badge key={idx} variant="outline" className="text-red-700 border-red-300">{condition}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergies */}
                {detailClient.allergies && detailClient.allergies.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Allergies</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailClient.allergies.map((allergy, idx) => (
                        <Badge key={idx} variant="outline" className="text-orange-700 border-orange-300">{allergy}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dietary Restrictions */}
                {detailClient.dietaryRestrictions && detailClient.dietaryRestrictions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">Dietary Restrictions</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailClient.dietaryRestrictions.map((restriction, idx) => (
                        <Badge key={idx} variant="outline" className="text-green-700 border-green-300">{restriction}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Professionals */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Assigned Professionals</h3>
                  <div className="space-y-3">
                    {/* Dietitians */}
                    {detailClient.assignedDietitians && detailClient.assignedDietitians.length > 0 ? (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dietitians</p>
                        <div className="space-y-2">
                          {detailClient.assignedDietitians.map((dietitian) => (
                            <div key={dietitian._id} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={dietitian.avatar} />
                                <AvatarFallback className="bg-green-200 text-green-800 text-xs">
                                  {dietitian.firstName?.[0]}{dietitian.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{dietitian.firstName} {dietitian.lastName}</p>
                                <p className="text-xs text-gray-500">{dietitian.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No dietitian assigned</p>
                    )}

                    {/* Health Counselor */}
                    {detailClient.assignedHealthCounselor ? (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Health Counselor</p>
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={detailClient.assignedHealthCounselor.avatar} />
                            <AvatarFallback className="bg-purple-200 text-purple-800 text-xs">
                              {detailClient.assignedHealthCounselor.firstName?.[0]}{detailClient.assignedHealthCounselor.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{detailClient.assignedHealthCounselor.firstName} {detailClient.assignedHealthCounselor.lastName}</p>
                            <p className="text-xs text-gray-500">{detailClient.assignedHealthCounselor.email}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No health counselor assigned</p>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="space-y-2 text-xs text-gray-500 border-t pt-4">
                  <p>Joined: {formatDate(detailClient.createdAt)}</p>
                  <p>Client ID: {detailClient._id}</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
