'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, RefreshCw, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getClientId } from '@/lib/utils';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  status: string;
  clientStatus?: 'leading' | 'active' | 'inactive' | 'onboarding' | 'paused';
  createdAt: string;
  healthGoals?: string[];
  tags?: string[];
  programStart?: string;
  programEnd?: string;
  lastDiet?: string;
  assignedDietitian?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export default function HealthCounselorAllUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      // Fetch all clients (not just assigned ones)
      const response = await fetch('/api/users?role=client');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    const matchesStatus = filterType === 'all' || 
      (user.clientStatus || 'leading') === filterType;
    
    return matchesSearch && matchesStatus;
  });

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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Users</h1>
            <p className="text-gray-600 mt-1">
              View all clients in the system
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-blue-900 font-semibold">{filteredUsers.length} Users</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users by name, email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-45 h-9">
                <SelectValue placeholder="Client Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="leading">Leading</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button size="sm" variant="ghost" onClick={fetchAllUsers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">C-Id</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Name</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Phone</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Email</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Status</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Assigned To</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user._id} className="hover:bg-gray-50">
                            <TableCell className="px-3">
                              <Link 
                                href={`/health-counselor/clients/${user._id}`}
                                className="text-blue-600 hover:underline font-medium text-sm"
                              >
                                {getClientId(user._id)}
                              </Link>
                            </TableCell>
                            <TableCell className="px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm whitespace-nowrap">{user.firstName} {user.lastName}</span>
                                <Link href={`/health-counselor/clients/${user._id}`}>
                                  <ExternalLink className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{user.phone || '-'}</TableCell>
                            <TableCell className="px-3 max-w-37.5 truncate text-sm">{user.email}</TableCell>
                            <TableCell className="px-3">
                              <Badge 
                                variant="outline"
                                className={
                                  user.clientStatus === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                  user.clientStatus === 'inactive' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                  user.clientStatus === 'onboarding' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  user.clientStatus === 'paused' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                  'bg-purple-100 text-purple-800 border-purple-200'
                                }
                              >
                                {user.clientStatus || 'leading'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">
                              {user.assignedDietitian 
                                ? `${user.assignedDietitian.firstName} ${user.assignedDietitian.lastName}` 
                                : '-'}
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{formatDate(user.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Footer */}
                <div className="px-4 py-3 border-t text-sm text-gray-600">
                  Showing {filteredUsers.length} users
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
