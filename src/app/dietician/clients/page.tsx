'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, RefreshCw, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  status: string;
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

export default function DieticianClientsPage() {
  const { data: session } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFreeze, setFilterFreeze] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  useEffect(() => {
    fetchMyClients();
  }, []);

  const fetchMyClients = async () => {
    try {
      setLoading(true);
      // Fetch only clients assigned to this dietician
      const response = await fetch('/api/users/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);
    
    return matchesSearch;
  });

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleAllClients = () => {
    setSelectedClients(prev =>
      prev.length === filteredClients.length
        ? []
        : filteredClients.map(c => c._id)
    );
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
         {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
            <p className="text-gray-600 mt-1">
              Manage your assigned clients
            </p>
          </div>
          
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-blue-900 font-semibold">{filteredClients.length} Clients</span>
          </div>
        </div>

        {/* Search */}
        <Card>
               <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Bulk Action
            </Button>
            <Select value={filterFreeze} onValueChange={setFilterFreeze}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter Freeze" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="freeze">Freeze</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button size="sm" variant="ghost" onClick={fetchMyClients}>
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
                        <TableHead className="w-10 px-3">
                          <Checkbox
                            checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                            onCheckedChange={toggleAllClients}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">C-Id</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Name</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Phone</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Email</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Tags</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Status</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Start</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">End</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Last Diet</TableHead>
                        <TableHead className="font-semibold text-xs whitespace-nowrap px-3">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                            No clients found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredClients.map((client) => (
                          <TableRow key={client._id} className="hover:bg-gray-50">
                            <TableCell className="px-3">
                              <Checkbox
                                checked={selectedClients.includes(client._id)}
                                onCheckedChange={() => toggleClientSelection(client._id)}
                              />
                            </TableCell>
                            <TableCell className="px-3">
                              <Link 
                                href={`/dietician/clients/${client._id}`}
                                className="text-blue-600 hover:underline font-medium text-sm"
                              >
                                P-{client._id.slice(-4).toUpperCase()}
                              </Link>
                            </TableCell>
                            <TableCell className="px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm whitespace-nowrap">{client.firstName} {client.lastName}</span>
                                <Link href={`/dietician/clients/${client._id}`}>
                                  <ExternalLink className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{client.phone || '-'}</TableCell>
                            <TableCell className="px-3 max-w-[150px] truncate text-sm">{client.email}</TableCell>
                            <TableCell className="px-3">
                              {client.tags && client.tags.length > 0 ? (
                                <div className="flex gap-1">
                                  {client.tags.slice(0, 2).map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="px-3">
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs px-1.5 py-0">
                                {client.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{client.programStart ? formatDate(client.programStart) : '-'}</TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{client.programEnd ? formatDate(client.programEnd) : '-'}</TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{client.lastDiet || '-'}</TableCell>
                            <TableCell className="px-3 text-sm whitespace-nowrap">{formatDate(client.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Footer */}
                <div className="px-4 py-3 border-t text-sm text-gray-600">
                  Showing {filteredClients.length} to 1 of {filteredClients.length} rows
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

