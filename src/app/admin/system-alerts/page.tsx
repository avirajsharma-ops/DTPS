'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  CheckCheck,
  Clock,
  Database,
  Server,
  CreditCard,
  Mail,
  Shield,
  Settings,
  Zap,
  Bug,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SystemAlert {
  _id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'critical';
  source: string;
  message: string;
  title?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  details?: Record<string, any>;
  errorStack?: string;
  affectedResource?: string;
  affectedResourceId?: string;
  resolvedBy?: { firstName: string; lastName: string; email: string };
  resolvedAt?: string;
  resolution?: string;
  createdBy?: { firstName: string; lastName: string; email: string };
  isRead: boolean;
  createdAt: string;
}

interface Stats {
  byType: { _id: string; count: number }[];
  bySource: { _id: string; count: number }[];
  byPriority: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
  byCategory: { _id: string; count: number }[];
  unreadCount: number;
  criticalCount: number;
  todayCount: number;
}

const typeIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
  critical: XCircle
};

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  critical: 'bg-red-200 text-red-800 border-red-300'
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  acknowledged: 'bg-yellow-500',
  resolved: 'bg-green-500',
  ignored: 'bg-gray-500'
};

const sourceIcons: Record<string, any> = {
  database: Database,
  api: Server,
  payment: CreditCard,
  email: Mail,
  auth: Shield,
  system: Settings,
  cron: Clock,
  integration: Zap
};

export default function SystemAlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Create alert state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'info' as SystemAlert['type'],
    source: 'system' as string,
    message: '',
    title: '',
    priority: 'medium' as SystemAlert['priority'],
    category: 'other' as string
  });

  useEffect(() => {
    fetchAlerts();
  }, [page, typeFilter, sourceFilter, priorityFilter, statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30'
      });

      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/system-alerts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchAlerts();
  };

  const handleCreateAlert = async () => {
    if (!newAlert.message.trim()) {
      toast.error('Message is required');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/system-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      });

      if (response.ok) {
        toast.success('Alert created successfully');
        setCreateDialogOpen(false);
        setNewAlert({
          type: 'info',
          source: 'system',
          message: '',
          title: '',
          priority: 'medium',
          category: 'other'
        });
        fetchAlerts();
      } else {
        toast.error('Failed to create alert');
      }
    } catch (error) {
      toast.error('Failed to create alert');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedAlerts.length === 0) {
      toast.error('Please select alerts first');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/system-alerts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          alertIds: selectedAlerts,
          resolution: action === 'resolve' ? resolution : undefined
        })
      });

      if (response.ok) {
        toast.success(`Successfully ${action}d ${selectedAlerts.length} alerts`);
        setSelectedAlerts([]);
        fetchAlerts();
      } else {
        toast.error('Failed to perform action');
      }
    } catch (error) {
      toast.error('Failed to perform action');
    } finally {
      setProcessing(false);
      setResolveDialogOpen(false);
      setResolution('');
    }
  };

  const handleUpdateStatus = async (alertId: string, status: string) => {
    try {
      const response = await fetch(`/api/system-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution: status === 'resolved' ? resolution : undefined })
      });

      if (response.ok) {
        toast.success('Alert updated');
        fetchAlerts();
      }
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  const getTypeIcon = (type: string) => {
    const Icon = typeIcons[type] || AlertCircle;
    return <Icon className="h-5 w-5" />;
  };

  const getSourceIcon = (source: string) => {
    const Icon = sourceIcons[source] || Bug;
    return <Icon className="h-4 w-4" />;
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.length === alerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(alerts.map(a => a._id));
    }
  };

  const toggleSelect = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Alerts</h1>
            <p className="text-gray-600">Monitor system health, errors, and database alerts</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Alert
            </Button>
            <Button onClick={fetchAlerts} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={stats.criticalCount > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Critical Alerts</p>
                    <p className={`text-2xl font-bold ${stats.criticalCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {stats.criticalCount}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stats.criticalCount > 0 ? 'bg-red-200' : 'bg-red-100'}`}>
                    <XCircle className={`h-5 w-5 ${stats.criticalCount > 0 ? 'text-red-700' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Unread Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.unreadCount}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Today's Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayCount}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{total}</p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedAlerts.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-blue-700">
                  {selectedAlerts.length} alert(s) selected
                </span>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('markRead')}>
                    <Eye className="h-4 w-4 mr-1" /> Mark Read
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('acknowledge')}>
                    <CheckCheck className="h-4 w-4 mr-1" /> Acknowledge
                  </Button>
                  <Button size="sm" variant="outline" className="text-green-700" onClick={() => setResolveDialogOpen(true)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                  </Button>
                  <Button size="sm" variant="outline" className="text-gray-700" onClick={() => handleBulkAction('ignore')}>
                    <XCircle className="h-4 w-4 mr-1" /> Ignore
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-700" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>
                  Showing {alerts.length} of {total} alerts
                </CardDescription>
              </div>
              {alerts.length > 0 && (
                <Checkbox
                  checked={selectedAlerts.length === alerts.length && alerts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner className="h-8 w-8" />
                <span className="ml-2 text-gray-600">Loading alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No alerts found</h3>
                <p className="text-gray-500">System is running smoothly</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${typeColors[alert.type] || 'bg-gray-100'} ${!alert.isRead ? 'ring-2 ring-blue-200' : ''}`}
                  >
                    <Checkbox
                      checked={selectedAlerts.includes(alert._id)}
                      onCheckedChange={() => toggleSelect(alert._id)}
                    />
                    
                    <div className="shrink-0">
                      {getTypeIcon(alert.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium">{alert.title || alert.message.substring(0, 50)}</h4>
                            <Badge variant="outline" className={priorityColors[alert.priority]}>
                              {alert.priority}
                            </Badge>
                            <div className={`w-2 h-2 rounded-full ${statusColors[alert.status]}`} title={alert.status} />
                          </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">{formatDate(alert.createdAt)}</p>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            {getSourceIcon(alert.source)}
                            <span className="text-xs capitalize">{alert.source}</span>
                          </div>
                        </div>
                      </div>

                      {alert.affectedResource && (
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {alert.affectedResource}{alert.affectedResourceId ? `: ${alert.affectedResourceId.substring(0, 8)}...` : ''}
                          </Badge>
                        </div>
                      )}

                      {alert.status === 'resolved' && alert.resolution && (
                        <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                          <span className="font-medium">Resolution: </span>{alert.resolution}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedAlert(alert); setDetailsDialogOpen(true); }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Details
                        </Button>
                        {alert.status === 'new' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(alert._id, 'acknowledged')}
                            >
                              <CheckCheck className="h-3 w-3 mr-1" /> Acknowledge
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-700"
                              onClick={() => { setSelectedAlert(alert); setResolveDialogOpen(true); }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Alert Details</DialogTitle>
            </DialogHeader>
            {selectedAlert && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="capitalize">{selectedAlert.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Source</label>
                    <p className="capitalize">{selectedAlert.source}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <Badge className={priorityColors[selectedAlert.priority]}>{selectedAlert.priority}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="capitalize">{selectedAlert.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="capitalize">{selectedAlert.category.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p>{formatDate(selectedAlert.createdAt)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedAlert.message}</p>
                </div>

                {selectedAlert.affectedResource && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Affected Resource</label>
                    <p>{selectedAlert.affectedResource} {selectedAlert.affectedResourceId && `(${selectedAlert.affectedResourceId})`}</p>
                  </div>
                )}

                {selectedAlert.errorStack && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Error Stack</label>
                    <pre className="mt-1 p-3 bg-red-50 rounded-lg text-xs overflow-x-auto text-red-800 max-h-40 overflow-y-auto">
                      {selectedAlert.errorStack}
                    </pre>
                  </div>
                )}

                {selectedAlert.details && Object.keys(selectedAlert.details).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Additional Details</label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto max-h-40 overflow-y-auto">
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedAlert.resolution && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resolution</label>
                    <p className="mt-1 p-3 bg-green-50 rounded-lg text-green-800">{selectedAlert.resolution}</p>
                    {selectedAlert.resolvedBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        Resolved by {selectedAlert.resolvedBy.firstName} {selectedAlert.resolvedBy.lastName} on {selectedAlert.resolvedAt && formatDate(selectedAlert.resolvedAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Alert(s)</DialogTitle>
              <DialogDescription>
                Add a resolution note for the selected alert(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Resolution Note</label>
                <Textarea
                  placeholder="Describe how this was resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedAlert) {
                    handleUpdateStatus(selectedAlert._id, 'resolved');
                    setResolveDialogOpen(false);
                    setResolution('');
                    setSelectedAlert(null);
                  } else {
                    handleBulkAction('resolve');
                  }
                }}
                disabled={processing}
              >
                {processing ? 'Resolving...' : 'Resolve'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Alert Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create System Alert</DialogTitle>
              <DialogDescription>
                Manually create a system alert for testing or announcements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newAlert.type} onValueChange={(v: any) => setNewAlert({...newAlert, type: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <Select value={newAlert.source} onValueChange={(v) => setNewAlert({...newAlert, source: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="auth">Auth</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newAlert.priority} onValueChange={(v: any) => setNewAlert({...newAlert, priority: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newAlert.category} onValueChange={(v) => setNewAlert({...newAlert, category: v})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="database_error">Database Error</SelectItem>
                      <SelectItem value="api_error">API Error</SelectItem>
                      <SelectItem value="auth_failure">Auth Failure</SelectItem>
                      <SelectItem value="payment_failure">Payment Failure</SelectItem>
                      <SelectItem value="email_failure">Email Failure</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Title (optional)</label>
                <Input
                  placeholder="Alert title..."
                  value={newAlert.title}
                  onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message *</label>
                <Textarea
                  placeholder="Alert message..."
                  value={newAlert.message}
                  onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAlert} disabled={processing || !newAlert.message.trim()}>
                {processing ? 'Creating...' : 'Create Alert'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

