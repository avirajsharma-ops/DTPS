'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  IndianRupee,
  Calendar,
  CheckCircle2,
  XCircle,
  Package,
  X,
  Clock
} from 'lucide-react';

interface PricingTier {
  _id?: string;
  durationDays: number;
  durationLabel: string;
  amount: number;
  isActive: boolean;
}

interface ServicePlan {
  _id: string;
  name: string;
  category: string;
  description?: string;
  pricingTiers: PricingTier[];
  features: string[];
  maxDiscountPercent: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

const CATEGORIES = [
  { value: 'weight-loss', label: 'Weight Loss' },
  { value: 'weight-gain', label: 'Weight Gain' },
  { value: 'muscle-gain', label: 'Muscle Gain' },
  { value: 'diabetes', label: 'Diabetes Management' },
  { value: 'pcos', label: 'PCOS' },
  { value: 'thyroid', label: 'Thyroid' },
  { value: 'general-wellness', label: 'General Wellness' },
  { value: 'detox', label: 'Detox' },
  { value: 'sports-nutrition', label: 'Sports Nutrition' },
  { value: 'custom', label: 'Custom' }
];

export default function AdminServicePlansPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'general-wellness',
    description: '',
    features: [] as string[],
    maxDiscountPercent: 40,
    isActive: true,
    pricingTiers: [] as PricingTier[]
  });

  const [featureInput, setFeatureInput] = useState('');
  
  // New pricing tier input
  const [newTier, setNewTier] = useState({
    durationDays: 7,
    durationLabel: '7 Days',
    amount: 0,
    isActive: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/service-plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load service plans');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general-wellness',
      description: '',
      features: [],
      maxDiscountPercent: 40,
      isActive: true,
      pricingTiers: []
    });
    setEditingPlan(null);
    setFeatureInput('');
    setNewTier({
      durationDays: 7,
      durationLabel: '7 Days',
      amount: 0,
      isActive: true
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a plan name');
      return;
    }

    if (formData.pricingTiers.length === 0) {
      toast.error('Please add at least one pricing tier');
      return;
    }

    try {
      setSaving(true);
      const url = '/api/admin/service-plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = editingPlan 
        ? { id: editingPlan._id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(editingPlan ? 'Service plan updated' : 'Service plan created');
        setDialogOpen(false);
        fetchPlans();
        resetForm();
      } else {
        toast.error(result.error || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan: ServicePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      category: plan.category,
      description: plan.description || '',
      features: plan.features || [],
      maxDiscountPercent: plan.maxDiscountPercent,
      isActive: plan.isActive,
      pricingTiers: plan.pricingTiers || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    try {
      const response = await fetch(`/api/admin/service-plans?id=${planId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Service plan deleted');
        fetchPlans();
      } else {
        toast.error(result.error || 'Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
    setDeleteConfirmId(null);
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()]
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  const addPricingTier = () => {
    if (!newTier.durationLabel || newTier.amount < 0) {
      toast.error('Please fill in tier details correctly');
      return;
    }
    setFormData({
      ...formData,
      pricingTiers: [...formData.pricingTiers, { ...newTier }]
    });
    setNewTier({
      durationDays: 7,
      durationLabel: '7 Days',
      amount: 0,
      isActive: true
    });
  };

  const removePricingTier = (index: number) => {
    setFormData({
      ...formData,
      pricingTiers: formData.pricingTiers.filter((_, i) => i !== index)
    });
  };

  const updatePricingTier = (index: number, field: string, value: any) => {
    const updatedTiers = [...formData.pricingTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setFormData({ ...formData, pricingTiers: updatedTiers });
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
            <p className="text-gray-500 mt-1">Manage diet and nutrition service plans with pricing</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Service Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit Service Plan' : 'Create Service Plan'}</DialogTitle>
                <DialogDescription>
                  {editingPlan ? 'Update the service plan details' : 'Create a new service plan with pricing tiers'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plan Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Weight Loss Program"
                    />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Describe the service plan... (use toolbar for formatting)"
                    minHeight="100px"
                  />
                </div>

                {/* Pricing Tiers */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Label className="text-base font-semibold">Pricing Tiers *</Label>
                  <p className="text-sm text-gray-500 mb-4">Add different pricing options based on duration</p>

                  {/* Existing Tiers */}
                  {formData.pricingTiers.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {formData.pricingTiers.map((tier, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={tier.durationDays}
                              onChange={(e) => updatePricingTier(index, 'durationDays', parseInt(e.target.value) || 1)}
                              placeholder="Days"
                            />
                            <Input
                              value={tier.durationLabel}
                              onChange={(e) => updatePricingTier(index, 'durationLabel', e.target.value)}
                              placeholder="Label (e.g., 1 Month)"
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                              <Input
                                type="number"
                                min="0"
                                value={tier.amount}
                                onChange={(e) => updatePricingTier(index, 'amount', parseInt(e.target.value) || 0)}
                                className="pl-8"
                                placeholder="Amount"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tier.isActive}
                                onChange={(e) => updatePricingTier(index, 'isActive', e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">Active</span>
                            </label>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePricingTier(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Tier */}
                  <div className="flex items-end gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Duration (Days)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newTier.durationDays}
                          onChange={(e) => setNewTier({ ...newTier, durationDays: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={newTier.durationLabel}
                          onChange={(e) => setNewTier({ ...newTier, durationLabel: e.target.value })}
                          placeholder="e.g., 1 Month"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Amount (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newTier.amount}
                          onChange={(e) => setNewTier({ ...newTier, amount: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" onClick={addPricingTier} className="w-full">
                          <Plus className="h-4 w-4 mr-1" /> Add Tier
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Max Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Discount % (Max 40%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="40"
                      value={formData.maxDiscountPercent}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        maxDiscountPercent: Math.min(40, parseInt(e.target.value) || 0) 
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum discount allowed on this plan</p>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span>Plan is Active</span>
                    </label>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <Label>Features</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      placeholder="Add a feature..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {feature}
                        <button type="button" onClick={() => removeFeature(index)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? (
                      <>
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                        Saving...
                      </>
                    ) : (
                      editingPlan ? 'Update Plan' : 'Create Plan'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No service plans yet</h3>
              <p className="text-gray-500 mt-1">Create your first service plan to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan._id} className={`relative ${!plan.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {getCategoryLabel(plan.category)}
                      </Badge>
                    </div>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {plan.description && (
                    <div 
                      className="mt-2 text-sm text-gray-500 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: plan.description }}
                    />
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing Tiers */}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-500">Pricing Options</Label>
                    <div className="space-y-1">
                      {plan.pricingTiers.filter(t => t.isActive).map((tier, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{tier.durationLabel}</span>
                            <span className="text-xs text-gray-400">({tier.durationDays} days)</span>
                          </div>
                          <span className="font-semibold text-blue-600">₹{tier.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Max Discount */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Max Discount</span>
                    <span className="font-medium">{plan.maxDiscountPercent}%</span>
                  </div>

                  {/* Features */}
                  {plan.features.length > 0 && (
                    <div>
                      <Label className="text-sm text-gray-500">Features</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {plan.features.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{plan.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(plan)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {deleteConfirmId === plan._id ? (
                      <div className="flex gap-1">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDelete(plan._id)}
                        >
                          Confirm
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteConfirmId(plan._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
