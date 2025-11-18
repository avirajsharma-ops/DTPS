"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserRole, UserStatus } from "@/types";
import { toast } from "sonner";

interface HealthCounselor {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  bio?: string;
  experience?: string;
  consultationFee?: number;
  specializations?: string[];
  credentials?: string[];
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminHealthCounselorsPage() {
  const [healthCounselors, setHealthCounselors] = useState<HealthCounselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create/Edit form state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HealthCounselor | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: UserRole.HEALTH_COUNSELOR as UserRole,
    status: UserStatus.ACTIVE as UserStatus,
    phone: "",
    bio: "",
    experience: "",
    consultationFee: 0,
    specializations: [] as string[],
    credentials: [] as string[],
  });

  async function fetchHealthCounselors() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const response = await fetch(`/api/users/health-counselors?${params}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch health counselors');
      
      setHealthCounselors(data.healthCounselors || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load health counselors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealthCounselors();
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm({ 
      email: "", 
      password: "", 
      firstName: "", 
      lastName: "", 
      role: UserRole.HEALTH_COUNSELOR, 
      status: UserStatus.ACTIVE, 
      phone: "",
      bio: "",
      experience: "",
      consultationFee: 0,
      specializations: [],
      credentials: []
    });
    setOpen(true);
  }

  function openEdit(hc: HealthCounselor) {
    setEditing(hc);
    setForm({
      email: hc.email,
      password: "",
      firstName: hc.firstName,
      lastName: hc.lastName,
      role: hc.role,
      status: hc.status,
      phone: hc.phone || "",
      bio: hc.bio || "",
      experience: hc.experience || "",
      consultationFee: hc.consultationFee || 0,
      specializations: hc.specializations || [],
      credentials: hc.credentials || []
    });
    setOpen(true);
  }

  async function handleSubmit() {
    try {
      const url = editing ? `/api/users/${editing._id}` : '/api/users';
      const method = editing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to save health counselor');
      
      toast.success(editing ? 'Health counselor updated successfully' : 'Health counselor created successfully');
      setOpen(false);
      fetchHealthCounselors();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save health counselor');
    }
  }

  async function handleStatusToggle(id: string, currentStatus: string) {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this health counselor?`)) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} health counselor`);
      }

      const actionPast = currentStatus === 'active' ? 'deactivated' : 'activated';
      toast.success(`Health counselor ${actionPast} successfully`);
      fetchHealthCounselors();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update health counselor status');
    }
  }

  const filtered = healthCounselors.filter(hc =>
    hc.firstName.toLowerCase().includes(search.toLowerCase()) ||
    hc.lastName.toLowerCase().includes(search.toLowerCase()) ||
    hc.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (error) return <DashboardLayout><div className="text-red-500">Error: {error}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manage Health Counselors</h1>
          <Button onClick={openCreate}>New Health Counselor</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Health Counselors ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search health counselors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Fee</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(hc => (
                    <tr key={hc._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{hc.firstName} {hc.lastName}</td>
                      <td className="p-3">{hc.email}</td>
                      <td className="p-3">{hc.phone || '-'}</td>
                      <td className="p-3 capitalize">{hc.status}</td>
                      <td className="p-3">${hc.consultationFee || 0}</td>
                      <td className="p-3">{hc.createdAt ? new Date(hc.createdAt).toLocaleString() : '-'}</td>
                      <td className="p-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(hc)}>Edit</Button>
                        <Button
                          variant={hc.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleStatusToggle(hc._id, hc.status)}
                          className={hc.status === 'inactive' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        >
                          {hc.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Health Counselor' : 'Create Health Counselor'}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">First Name</label>
                <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Last Name</label>
                <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Password</label>
                <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Consultation Fee</label>
                <Input type="number" value={form.consultationFee} onChange={(e) => setForm(f => ({ ...f, consultationFee: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
