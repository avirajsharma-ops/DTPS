"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserRole, UserStatus } from "@/types";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  avatar?: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Pagination and counts
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ admins: 0, dietitians: 0, healthCounselors: 0, clients: 0 });

  // Activity dialog state
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityFor, setActivityFor] = useState<AdminUser | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Create/Edit form state
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: UserRole.CLIENT as UserRole,
    status: UserStatus.ACTIVE as UserStatus,
    phone: "",
  });

  const filtered = useMemo(() => users, [users]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('page', String(page));
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data.users || []);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setCounts({
        admins: data.roleCounts?.admin || 0,
        dietitians: data.roleCounts?.dietitian || 0,
        healthCounselors: data.roleCounts?.healthCounselor || 0,
        clients: data.roleCounts?.client || 0,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);



  function openCreate() {
    setEditing(null);
    setForm({ email: "", password: "", firstName: "", lastName: "", role: UserRole.CLIENT, status: UserStatus.ACTIVE, phone: "" });
    setOpen(true);
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setForm({
      email: u.email,
      password: "",
      firstName: u.firstName,
      lastName: u.lastName,


      role: u.role,
      status: u.status,
      phone: u.phone || "",
    });
    setOpen(true);
  }


  async function openActivity(u: AdminUser) {
    setActivityFor(u);
    setActivity([]);
    setActivityLoading(true);
    setActivityOpen(true);
    try {
      const res = await fetch(`/api/admin/users/${u._id}/activity`);
      if (!res.ok) throw new Error((await res.json())?.error || 'Failed to load activity');
      const body = await res.json();
      setActivity(body.activity || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load activity');
    } finally {
      setActivityLoading(false);
    }
  }

  async function handleSave() {
    // Basic validation
    if (!form.email || !form.firstName || !form.lastName) {
      setError("Please fill required fields: email, first name, last name");
      return;
    }
    if (!editing && !form.password) {
      setError("Password is required when creating a new user");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let res: Response;


      if (editing) {
        const body: any = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          status: form.status,
          phone: form.phone || undefined,
        };
        res = await fetch(`/api/users/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      setOpen(false);
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle(id: string, currentStatus: string) {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Status update failed");
      await fetchUsers();
    } catch (e: any) {
      setError(e?.message || "Status update failed");
    }
  }

  return (
    <DashboardLayout>
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Users</h1>


        <div className="flex gap-2">
          <Input placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="dietitian">Dietitians</SelectItem>
              <SelectItem value="health_counselor">Health Counselors</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>New User</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Dietitians</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-semibold">{counts.dietitians}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Health Counselors</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-semibold">{counts.healthCounselors}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Clients</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-semibold">{counts.clients}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Admins</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-semibold">{counts.admins}</div></CardContent>
        </Card>
      </div>

      <div className="text-sm text-gray-600">Page {page} of {pages} · {total} users total</div>


      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center"><LoadingSpinner /></div>
          ) : error ? (
            <div className="text-red-600 text-sm">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{u.firstName} {u.lastName}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1).replace('_', ' ')}
                      </td>
                      <td className="p-3 capitalize">{u.role}</td>
                      <td className="p-3 capitalize">{u.status}</td>
                      <td className="p-3">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                      <td className="p-3 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => openActivity(u)}>Activity</Button>
                        <Button
                          variant={u.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleStatusToggle(u._id, u.status)}
                          className={u.status === 'inactive' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(page - 1) * 50 + 1}-{Math.min(page * 50, total)} of {total} users
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const start = Math.max(1, Math.min(pages - 4, page - 2));
              const n = start + i;
              if (n > pages) return null;
              return (
                <Button
                  key={n}
                  variant={n === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full"
                  disabled={loading}
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={page >= pages || loading}
            onClick={() => setPage(p => Math.min(pages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


            <div className="col-span-2">
              <label className="text-sm text-gray-600">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {!editing && (
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Password</label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-sm text-gray-600">First Name</label>
              <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Last Name</label>
              <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Role</label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.DIETITIAN}>Dietitian</SelectItem>
                  <SelectItem value={UserRole.HEALTH_COUNSELOR}>Health Counselor</SelectItem>
                  <SelectItem value={UserRole.CLIENT}>Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as UserStatus }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={UserStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={UserStatus.SUSPENDED}>Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Activity{activityFor ? ` — ${activityFor.firstName} ${activityFor.lastName}` : ''}</DialogTitle>
          </DialogHeader>
          {activityLoading ? (
            <div className="py-8 flex items-center justify-center"><LoadingSpinner /></div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              {activity.length === 0 ? (
                <div className="text-sm text-gray-500">No recent activity</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {activity.map((a, idx) => (
                    <li key={idx} className="p-2 border rounded">
                      <div className="font-medium capitalize">{a.kind.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500">{new Date(a.at).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </DashboardLayout>
  );
}

