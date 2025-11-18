'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ClientsLayout from '@/components/layout/ClientsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle,
  Settings,
  Trash2,
  Download,
  Share,
  Target,
  Calendar,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

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

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = params?.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic-details');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      const clientResponse = await fetch(`/api/users/${clientId}`);
      if (clientResponse.ok) {
        const clientData = await clientResponse.json();
        setClient(clientData);
      }
      
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ClientsLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </ClientsLayout>
    );
  }

  if (!client) {
    return (
      <ClientsLayout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Client Not Found</h3>
              <p className="text-gray-600">The requested client could not be found.</p>
            </CardContent>
          </Card>
        </div>
      </ClientsLayout>
    );
  }

  return (
    <ClientsLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              {/* Contact Profile Section */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-orange-200">
                    <AvatarImage src={client.avatar} />
                    <AvatarFallback className="text-xl bg-orange-100 text-orange-600">
                      {client.firstName[0]}{client.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-6 h-6 border-2 border-white"></div>
                </div>
                
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {client.firstName} {client.lastName}
                  </h1>
                  <p className="text-sm text-gray-600">
                    P-{client._id.slice(-6)} ({client.gender || 'Not specified'}) | Vegetarian
                  </p>
                  <p className="text-sm text-gray-600">
                    Practitioner: Sachi Tiwari, Diksha, Varsha Rahamani
                  </p>
                  <p className="text-sm text-gray-600">
                    Last Login: {format(new Date(), 'MMM dd,yyyy')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Hub
                </Button>
                <Button variant="outline" className="border-gray-300">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-12 gap-6">
            
            {/* Left Sidebar */}
            <div className="col-span-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Send</h3>
                </div>
                <div className="p-4 space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Modify
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Tasks
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Planning
                  </Button>
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Weight Loss</Badge>
                  </div>
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                  <Textarea 
                    placeholder="Add notes about this client..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
              </div>
              
              {/* Navigation Menu */}
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4">
                  <nav className="space-y-2">
                    <button 
                      onClick={() => setActiveTab('forms')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Forms
                    </button>
                    <button 
                      onClick={() => setActiveTab('journal')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Journal
                    </button>
                    <button 
                      onClick={() => setActiveTab('progress')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Progress
                    </button>
                    <button 
                      onClick={() => setActiveTab('planning')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Planning
                    </button>
                    <button 
                      onClick={() => setActiveTab('payments')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Payments
                    </button>
                    <button 
                      onClick={() => setActiveTab('bookings')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Bookings
                    </button>
                    <button 
                      onClick={() => setActiveTab('documents')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      Documents
                    </button>
                  </nav>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Program Details Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Program Details</h3>
                    <p className="text-sm text-gray-600">Weight Loss</p>
                    <p className="text-sm text-gray-600">Duration: 90 Days</p>
                    <p className="text-sm text-gray-600">Date: Jul 25,2025 - Oct 29,2025</p>
                    <p className="text-sm text-gray-600">Contact Status: Active</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-4">
                    <button
                      onClick={() => setActiveTab('basic-details')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'basic-details'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Basic Details
                    </button>
                    <button
                      onClick={() => setActiveTab('medical-info')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'medical-info'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Medical Info
                    </button>
                    <button
                      onClick={() => setActiveTab('lifestyle')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'lifestyle'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Lifestyle
                    </button>
                    <button
                      onClick={() => setActiveTab('recall')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'recall'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Recall
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'basic-details' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">PERSONAL INFORMATION</h4>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">First Name *</Label>
                            <Input
                              value={client.firstName}
                              readOnly={!isEditing}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Last Name *</Label>
                            <Input
                              value={client.lastName}
                              readOnly={!isEditing}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Gender *</Label>
                            <Select value={client.gender || 'male'} disabled={!isEditing}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">DOB</Label>
                            <Input
                              type="date"
                              value={client.dateOfBirth ? format(new Date(client.dateOfBirth), 'yyyy-MM-dd') : ''}
                              readOnly={!isEditing}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Phone Number *</Label>
                            <Input
                              value={client.phone || ''}
                              readOnly={!isEditing}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Email</Label>
                            <Input
                              value={client.email}
                              readOnly={!isEditing}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'medical-info' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">ANTHROPOMETRIC MEASUREMENTS</h4>

                        <div className="grid grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <Label className="text-sm font-medium text-gray-700">Height (Ft)*</Label>
                            <div className="text-lg font-semibold mt-1">
                              {client.height ? Math.floor(client.height / 30.48) : '5'}
                            </div>
                          </div>
                          <div className="text-center">
                            <Label className="text-sm font-medium text-gray-700">Height (Inch)</Label>
                            <div className="text-lg font-semibold mt-1">
                              {client.height ? Math.round((client.height % 30.48) / 2.54) : '8'}
                            </div>
                          </div>
                          <div className="text-center">
                            <Label className="text-sm font-medium text-gray-700">Weight (Kg)*</Label>
                            <div className="text-lg font-semibold mt-1">
                              {client.weight || '82'}
                            </div>
                          </div>
                          <div className="text-center">
                            <Label className="text-sm font-medium text-gray-700">Target Weight (Kg)</Label>
                            <div className="text-lg font-semibold mt-1">72</div>
                          </div>
                          <div className="text-center">
                            <Label className="text-sm font-medium text-gray-700">BMI</Label>
                            <div className="text-lg font-semibold mt-1">
                              {client.weight && client.height
                                ? ((client.weight / Math.pow(client.height / 100, 2)).toFixed(1))
                                : '27.5'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-span-3">
              <div className="space-y-6">
                {/* Customer Activity Timeline */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Customer Activity Timeline</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Last Session Booked:</p>
                      <p className="text-gray-600">{format(new Date(), 'MMM dd,yyyy')}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Last Progress Updated:</p>
                      <p className="text-gray-600">Jul 09,2025 ⓘ</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Last Journal Updated:</p>
                      <p className="text-gray-600">-</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Last Plan Sent:</p>
                      <p className="text-gray-600">Sep 19,2025</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ClientsLayout>
  );
}
