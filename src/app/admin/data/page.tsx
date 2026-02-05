'use client';

/**
 * Data Management Dashboard - Admin Panel
 * 
 * Comprehensive data management with Import, Export, and Update sections
 * URL: /admin/data
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  Edit3,
  Database,
  FileSpreadsheet,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Loader2,
  Table,
  FileJson,
  User,
  Calendar,
  CreditCard,
  ClipboardList,
  X,
  Check,
  AlertCircle,
  Eye,
  Save,
  ArrowLeft,
  FileText,
  Package,
  Users,
  Utensils,
  Activity,
  Heart,
  Tag,
  Bell,
  TrendingUp
} from 'lucide-react';

// Types
interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  fieldCount: number;
  requiredFields: string[];
  documentCount: number;
  fields: Array<{
    path: string;
    type: string;
    required: boolean;
  }>;
}

interface RecordData {
  _id: string;
  [key: string]: any;
}

interface RelatedData {
  lifestyleInfo?: any;
  medicalInfo?: any;
  dietaryRecall?: any;
  recentMealPlans?: any[];
  recentTasks?: any[];
  recentPayments?: any[];
  recentAppointments?: any[];
}

interface FieldInfo {
  path: string;
  type: string;
  required: boolean;
  enum?: string[];
}

type ActiveSection = 'import' | 'export' | 'updates';

// Model icon mapping
const MODEL_ICONS: Record<string, React.ElementType> = {
  User: Users,
  Lead: TrendingUp,
  Appointment: Calendar,
  Recipe: Utensils,
  MealPlan: ClipboardList,
  Payment: CreditCard,
  ProgressEntry: Activity,
  FoodLog: FileText,
  Task: ClipboardList,
  Tag: Tag,
  ServicePlan: Package,
  Notification: Bell,
  DietTemplate: FileSpreadsheet,
  Transformation: TrendingUp,
  default: Database
};

export default function DataManagementPage() {
  // State
  const [activeSection, setActiveSection] = useState<ActiveSection>('import');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  
  // Export state
  const [selectedExportModel, setSelectedExportModel] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);
  
  // Update state
  const [selectedUpdateModel, setSelectedUpdateModel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecordData[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);
  const [recordFields, setRecordFields] = useState<FieldInfo[]>([]);
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data/export');
      const data = await res.json();
      if (data.success) {
        setModels(data.models);
      } else {
        toast.error('Failed to load models');
      }
    } catch (error) {
      toast.error('Error loading models');
    } finally {
      setLoading(false);
    }
  };

  // Export handler
  const handleExport = async (modelName: string) => {
    setExporting(true);
    try {
      const url = `/api/admin/data/export?model=${modelName}&format=${exportFormat}&download=true`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get filename from header or generate one
      const disposition = res.headers.get('content-disposition');
      let filename = `${modelName}_export.${exportFormat}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download file
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success(`${modelName} data exported successfully!`);
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Search records
  const searchRecords = useCallback(async (modelName: string, query: string = '', page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/data/records?model=${modelName}&search=${encodeURIComponent(query)}&page=${page}&limit=20`
      );
      const data = await res.json();
      
      if (data.success) {
        setSearchResults(data.records);
        setPagination(data.pagination);
        setRecordFields(data.fields);
      } else {
        toast.error('Search failed');
      }
    } catch (error) {
      toast.error('Error searching records');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single record with related data
  const fetchRecordDetails = async (modelName: string, recordId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/data/records?model=${modelName}&id=${recordId}`);
      const data = await res.json();
      
      if (data.success) {
        setSelectedRecord(data.record);
        setRelatedData(data.relatedData || null);
        setRecordFields(data.fields);
        setEditingRecord(null);
      } else {
        toast.error('Failed to load record');
      }
    } catch (error) {
      toast.error('Error loading record');
    } finally {
      setLoading(false);
    }
  };

  // Save record changes
  const saveRecordChanges = async () => {
    if (!selectedUpdateModel || !selectedRecord || !editingRecord) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/data/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: selectedUpdateModel,
          recordId: selectedRecord._id,
          data: editingRecord
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Record updated successfully!');
        setSelectedRecord(data.record);
        setEditingRecord(null);
        // Refresh the search results
        searchRecords(selectedUpdateModel, searchQuery, pagination.page);
      } else {
        toast.error(data.error || 'Update failed');
      }
    } catch (error) {
      toast.error('Error updating record');
    } finally {
      setSaving(false);
    }
  };

  // Get model icon
  const getModelIcon = (modelName: string) => {
    const Icon = MODEL_ICONS[modelName] || MODEL_ICONS.default;
    return <Icon className="w-5 h-5" />;
  };

  // Format field value for display
  const formatFieldValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return '-';
    if (type === 'Date') {
      try {
        return new Date(value).toLocaleString();
      } catch {
        return String(value);
      }
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const router = useRouter();

  // Render sidebar
  const renderSidebar = () => (
    <div className="w-64 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border-r-2 border-blue-200 dark:border-blue-900 min-h-screen shadow-lg">
      <div className="p-6 border-b-2 border-blue-200 dark:border-blue-900 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Data Hub
            </h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-3">
        {/* Import Section */}
        <button
          onClick={() => router.push('/admin/import')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
            activeSection === 'import'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
          }`}
        >
          <Upload className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <p className="font-semibold">Import Data</p>
            <p className={`text-xs opacity-70 ${activeSection === 'import' ? 'text-blue-100' : ''}`}>
              Upload files
            </p>
          </div>
          {activeSection === 'import' && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        </button>

        {/* Export Section */}
        <button
          onClick={() => setActiveSection('export')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
            activeSection === 'export'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
          }`}
        >
          <Download className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <p className="font-semibold">Export Data</p>
            <p className={`text-xs opacity-70 ${activeSection === 'export' ? 'text-blue-100' : ''}`}>
              Download files
            </p>
          </div>
          {activeSection === 'export' && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        </button>

        {/* Updates Section */}
        <button
          onClick={() => setActiveSection('updates')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
            activeSection === 'updates'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/20'
          }`}
        >
          <Edit3 className="w-5 h-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <p className="font-semibold">Update Data</p>
            <p className={`text-xs opacity-70 ${activeSection === 'updates' ? 'text-blue-100' : ''}`}>
              Search & edit
            </p>
          </div>
          {activeSection === 'updates' && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        </button>
      </nav>

      {/* Quick Stats */}
      <div className="p-4 m-4 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-900 rounded-xl">
        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
          📊 Database Stats
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Models</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg font-bold text-sm">
              {models.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Records</span>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg font-bold text-sm">
              {models.reduce((acc, m) => acc + m.documentCount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-800 to-transparent border-t border-blue-200 dark:border-blue-900">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Data Management v1.0
        </p>
      </div>
    </div>
  );

  // Render Import Section
  const renderImportSection = () => (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Import Data
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Upload and validate data files for import
            </p>
          </div>
        </div>
      </div>

      {/* Redirect to existing import page */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
            <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Data Import Tool
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Our comprehensive import tool supports CSV, Excel, and JSON files with automatic model detection,
              validation, field mapping, and error handling.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 border">
                ✓ CSV Support
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 border">
                ✓ Excel Support
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 border">
                ✓ JSON Support
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 border">
                ✓ Auto Validation
              </span>
              <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 border">
                ✓ Error Handling
              </span>
            </div>
            <button
              onClick={() => setActiveSection('import')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Open Import Tool
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Available Models for Import */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Importable Models
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.slice(0, 9).map((model) => (
            <div
              key={model.name}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {getModelIcon(model.name)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{model.displayName}</p>
                  <p className="text-xs text-gray-500">{model.fieldCount} fields</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {model.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Export Section
  const renderExportSection = () => (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Export Data
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Download your data in CSV or JSON format
            </p>
          </div>
        </div>
      </div>

      {/* Export Format Selector */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-900 p-6">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide block mb-4">
          Export Format
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => setExportFormat('csv')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              exportFormat === 'csv'
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
            }`}
          >
            <Table className="w-5 h-5" />
            CSV Format
          </button>
          <button
            onClick={() => setExportFormat('json')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              exportFormat === 'json'
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
            }`}
          >
            <FileJson className="w-5 h-5" />
            JSON Format
          </button>
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading models...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.name}
              className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-6 transition-all ${
                selectedExportModel === model.name
                  ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${
                    selectedExportModel === model.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {getModelIcon(model.name)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{model.displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{model.name}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {model.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Fields</p>
                  <p className="text-xl font-bold text-blue-600">{model.fieldCount}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Records</p>
                  <p className="text-xl font-bold text-blue-600">{model.documentCount.toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={() => handleExport(model.name)}
                disabled={exporting}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  exporting
                    ? 'bg-blue-400 text-white cursor-wait'
                    : model.documentCount === 0
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download {exportFormat.toUpperCase()}
                  </>
                )}
              </button>
              {model.documentCount === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  ℹ️ No records to export
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render Update Section
  const renderUpdateSection = () => (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Edit3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Update Data
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Search, view, and edit records across all models
            </p>
          </div>
        </div>
      </div>

      {/* Model Selector */}
      {!selectedUpdateModel ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select a Model to Update
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <button
                key={model.name}
                onClick={() => {
                  setSelectedUpdateModel(model.name);
                  searchRecords(model.name, '', 1);
                }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-left hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    {getModelIcon(model.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{model.displayName}</p>
                    <p className="text-xs text-gray-500">{model.documentCount.toLocaleString()} records</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {model.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : selectedRecord ? (
        // Record Detail View
        <div>
          {/* Back button */}
          <button
            onClick={() => {
              setSelectedRecord(null);
              setRelatedData(null);
              setEditingRecord(null);
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to search results
          </button>

          {/* Record Header */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  {getModelIcon(selectedUpdateModel)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {(selectedRecord as any).firstName 
                      ? `${(selectedRecord as any).firstName} ${(selectedRecord as any).lastName || ''}`
                      : (selectedRecord as any).name || (selectedRecord as any).email || selectedRecord._id}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedUpdateModel} • ID: {selectedRecord._id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {editingRecord ? (
                  <>
                    <button
                      onClick={() => setEditingRecord(null)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveRecordChanges}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingRecord({ ...selectedRecord })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Record
                  </button>
                )}
              </div>
            </div>

            {/* Record Fields - Filter out password fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordFields.filter((field) => !field.path.toLowerCase().includes('password')).map((field) => (
                <div key={field.path} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                    {field.path}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {editingRecord ? (
                    field.enum ? (
                      <select
                        value={editingRecord[field.path] || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, [field.path]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">Select...</option>
                        {field.enum.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'Boolean' ? (
                      <select
                        value={editingRecord[field.path]?.toString() || 'false'}
                        onChange={(e) => setEditingRecord({ ...editingRecord, [field.path]: e.target.value === 'true' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === 'Number' ? 'number' : field.type === 'Date' ? 'datetime-local' : 'text'}
                        value={editingRecord[field.path] || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, [field.path]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    )
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white break-words">
                      {formatFieldValue(selectedRecord[field.path], field.type)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Related Data */}
          {relatedData && selectedUpdateModel === 'User' && (
            <div className="space-y-6">
              {/* Lifestyle Info */}
              {relatedData.lifestyleInfo && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Lifestyle Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(relatedData.lifestyleInfo)
                      .filter(([key]) => !key.startsWith('_') && key !== 'userId')
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">{key}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatFieldValue(value, 'String')}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Medical Info */}
              {relatedData.medicalInfo && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    Medical Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(relatedData.medicalInfo)
                      .filter(([key]) => !key.startsWith('_') && key !== 'userId')
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase">{key}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatFieldValue(value, 'String')}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Recent Payments */}
              {relatedData.recentPayments && relatedData.recentPayments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    Recent Payments ({relatedData.recentPayments.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left">Amount</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {relatedData.recentPayments.map((payment: any, i: number) => (
                          <tr key={i}>
                            <td className="px-4 py-2">₹{payment.amount || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {payment.status || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Appointments */}
              {relatedData.recentAppointments && relatedData.recentAppointments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Recent Appointments ({relatedData.recentAppointments.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left">Title</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {relatedData.recentAppointments.map((apt: any, i: number) => (
                          <tr key={i}>
                            <td className="px-4 py-2">{apt.title || apt.type || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {apt.status || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2">{apt.date ? new Date(apt.date).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Search Results View
        <div>
          {/* Back button and Search */}
          <div className="mb-6 space-y-4">
            <button
              onClick={() => {
                setSelectedUpdateModel(null);
                setSearchResults([]);
                setSearchQuery('');
              }}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to models
            </button>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchRecords(selectedUpdateModel, searchQuery, 1)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <button
                onClick={() => searchRecords(selectedUpdateModel, searchQuery, 1)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Model info */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 border-2 border-blue-300 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  {getModelIcon(selectedUpdateModel)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {models.find(m => m.name === selectedUpdateModel)?.displayName || selectedUpdateModel}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    📊 {pagination.total.toLocaleString()} total records
                  </p>
                </div>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Searching...</span>
                </div>
              )}
            </div>
          </div>

          {/* Results Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">Loading records...</p>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No records found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Try a different search term or browse all records</p>
              <button
                onClick={() => searchRecords(selectedUpdateModel, '', 1)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                View All Records
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {recordFields.filter((f) => !f.path.toLowerCase().includes('password')).slice(0, 5).map((field) => (
                        <th key={field.path} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                          {field.path}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {searchResults.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {recordFields.filter((f) => !f.path.toLowerCase().includes('password')).slice(0, 5).map((field) => (
                          <td key={field.path} className="px-4 py-3 text-gray-900 dark:text-white">
                            {formatFieldValue(record[field.path], field.type).substring(0, 50)}
                            {formatFieldValue(record[field.path], field.type).length > 50 ? '...' : ''}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => fetchRecordDetails(selectedUpdateModel, record._id)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-700 px-6 py-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Showing <span className="font-bold text-blue-600">Page {pagination.page}</span> of <span className="font-bold text-blue-600">{pagination.totalPages}</span>
                      <span className="ml-4 text-gray-600 dark:text-gray-400">({pagination.total.toLocaleString()} total)</span>
                    </p>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => searchRecords(selectedUpdateModel, searchQuery, 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        title="First page"
                      >
                        ⬅️
                      </button>
                      <button
                        onClick={() => searchRecords(selectedUpdateModel, searchQuery, pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Prev
                      </button>
                      <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{pagination.page}/{pagination.totalPages}</span>
                      </div>
                      <button
                        onClick={() => searchRecords(selectedUpdateModel, searchQuery, pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => searchRecords(selectedUpdateModel, searchQuery, pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        title="Last page"
                      >
                        ➡️
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Fixed */}
      <div className="fixed left-0 top-0 h-screen w-64 z-50">
        {renderSidebar()}
      </div>

      {/* Main Content - with margin for sidebar */}
      <div className="ml-64 flex-1 w-[calc(100%-16rem)] overflow-auto">
        <div className="min-h-screen">
          {activeSection === 'import' && renderImportSection()}
          {activeSection === 'export' && renderExportSection()}
          {activeSection === 'updates' && renderUpdateSection()}
        </div>
      </div>
    </div>
  );
}
