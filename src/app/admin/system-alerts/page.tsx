"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface AlertItem {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  time?: string;
}

export default function SystemAlertsAdminPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<AlertItem["type"]>("info");
  const [priority, setPriority] = useState<NonNullable<AlertItem["priority"]>>("low");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/system-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, priority, message, category })
      });
      if (res.ok) {
        setMessage("");
        setCategory("");
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/system-alerts?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">System Alerts</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Alert</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Category (optional)" value={category} onChange={e => setCategory(e.target.value)} />
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} />
              <Button onClick={handleCreate} disabled={saving || !message.trim()}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="text-sm"><span className="font-medium capitalize">{a.type}</span> • <span className="capitalize">{a.priority}</span> {a.category ? `• ${a.category}` : ""}</div>
                      <div className="font-medium">{a.message}</div>
                      <div className="text-xs text-gray-500">{a.time}</div>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

