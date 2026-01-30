'use client';

/**
 * Data Import Page - Admin Panel
 * 
 * Complete UI for uploading, validating, and importing data
 * with model-wise tabs, validation errors, and editing capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Save,
  RefreshCw,
  Download,
  Edit2,
  Eye,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  FileJson,
  FileText,
  Table,
  X
} from 'lucide-react';

// Types
interface ValidationError {
  row: number;
  modelName: string;
  field: string;
  message: string;
  value: any;
  errorType: string;
}

interface RowData {
  rowIndex: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: ValidationError[];
}

interface ModelGroup {
  modelName: string;
  displayName: string;
  validCount: number;
  invalidCount: number;
  totalCount: number;
  rows: RowData[];
}

interface UnmatchedRow {
  rowIndex: number;
  data: Record<string, any>;
  matchAttempts?: Array<{
    modelName: string;
    confidence: number;
  }>;
}

interface ImportState {
  sessionId: string | null;
  fileName: string | null;
  fileType: string | null;
  totalRows: number;
  headers: string[];
  validation: {
    validRows: number;
    invalidRows: number;
    unmatchedRows: number;
    canSave: boolean;
  } | null;
  modelGroups: ModelGroup[];
  unmatchedData: UnmatchedRow[];
  allErrors: ValidationError[];
  status: 'idle' | 'uploading' | 'validated' | 'saving' | 'saved' | 'error';
}

interface ModelInfo {
  name: string;
  displayName: string;
  description: string;
  requiredFields: string[];
  fieldCount: number;
}

// Initial state
const initialState: ImportState = {
  sessionId: null,
  fileName: null,
  fileType: null,
  totalRows: 0,
  headers: [],
  validation: null,
  modelGroups: [],
  unmatchedData: [],
  allErrors: [],
  status: 'idle'
};

export default function DataImportPage() {
  const [state, setState] = useState<ImportState>(initialState);
  const [activeTab, setActiveTab] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [forceModel, setForceModel] = useState<string>('');
  const [editingRow, setEditingRow] = useState<{
    modelName: string;
    rowIndex: number;
    data: Record<string, any>;
  } | null>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState<number | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);

  // Load available models on mount
  useEffect(() => {
    loadAvailableModels();
  }, []);

  // Set initial active tab when model groups change
  useEffect(() => {
    if (state.modelGroups.length > 0 && !activeTab) {
      setActiveTab(state.modelGroups[0].modelName);
    }
  }, [state.modelGroups, activeTab]);

  const loadAvailableModels = async () => {
    try {
      const res = await fetch('/api/admin/import/models');
      const data = await res.json();
      if (data.success) {
        setAvailableModels(data.models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  // File drop handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setState(prev => ({ ...prev, status: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (forceModel) {
        formData.append('forceModel', forceModel);
      }

      const res = await fetch('/api/admin/import/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to upload file');
        setState(prev => ({ ...prev, status: 'error' }));
        return;
      }

      setState({
        sessionId: data.sessionId,
        fileName: data.fileName,
        fileType: data.fileType,
        totalRows: data.totalRows,
        headers: data.headers,
        validation: data.validation,
        modelGroups: data.modelGroups,
        unmatchedData: data.unmatchedData,
        allErrors: data.allErrors,
        status: 'validated'
      });

      if (data.validation.canSave) {
        toast.success('File validated successfully! Ready to save.');
      } else {
        toast.warning(`Found ${data.validation.invalidRows} invalid rows and ${data.validation.unmatchedRows} unmatched rows`);
      }

    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
      setState(prev => ({ ...prev, status: 'error' }));
    }
  }, [forceModel]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    disabled: state.status === 'uploading' || state.status === 'saving'
  });

  // Save handler
  const handleSave = async () => {
    if (!state.sessionId || !state.validation?.canSave) return;

    setState(prev => ({ ...prev, status: 'saving' }));

    try {
      const res = await fetch('/api/admin/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId })
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to save data');
        setState(prev => ({ ...prev, status: 'validated' }));
        return;
      }

      toast.success(`Successfully saved ${data.totalSaved} records!`);
      
      // Reset to initial state after successful save
      setTimeout(() => {
        setState(initialState);
        setActiveTab('');
        setEditingRow(null);
      }, 1500);

    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
      setState(prev => ({ ...prev, status: 'validated' }));
    }
  };

  // Clear handler
  const handleClear = async () => {
    if (state.sessionId) {
      try {
        await fetch(`/api/admin/import/session?sessionId=${state.sessionId}&action=delete`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }

    setState(initialState);
    setActiveTab('');
    setEditingRow(null);
    toast.info('Cleared all data');
  };

  // Remove row handler
  const handleRemoveRow = async (modelName: string | null, rowIndex: number) => {
    if (!state.sessionId) return;

    try {
      const params = new URLSearchParams({
        sessionId: state.sessionId,
        rowIndex: rowIndex.toString()
      });
      if (modelName) {
        params.append('modelName', modelName);
      }

      const res = await fetch(`/api/admin/import/row?${params}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        // Update local state
        if (modelName) {
          setState(prev => ({
            ...prev,
            modelGroups: prev.modelGroups.map(g => {
              if (g.modelName === modelName) {
                const rows = g.rows.filter(r => r.rowIndex !== rowIndex);
                return {
                  ...g,
                  rows,
                  totalCount: rows.length,
                  validCount: rows.filter(r => r.isValid).length,
                  invalidCount: rows.filter(r => !r.isValid).length
                };
              }
              return g;
            }),
            validation: prev.validation ? {
              ...prev.validation,
              canSave: data.sessionCanSave
            } : null
          }));
        } else {
          setState(prev => ({
            ...prev,
            unmatchedData: prev.unmatchedData.filter(r => r.rowIndex !== rowIndex),
            validation: prev.validation ? {
              ...prev.validation,
              unmatchedRows: prev.unmatchedData.length - 1,
              canSave: data.sessionCanSave
            } : null
          }));
        }
        toast.success('Row removed');
      }
    } catch (error) {
      toast.error('Failed to remove row');
    }
  };

  // Update row handler
  const handleUpdateRow = async () => {
    if (!state.sessionId || !editingRow) return;

    try {
      const res = await fetch('/api/admin/import/row', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          modelName: editingRow.modelName,
          rowIndex: editingRow.rowIndex,
          data: editingRow.data
        })
      });

      const data = await res.json();

      if (data.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          modelGroups: prev.modelGroups.map(g => {
            if (g.modelName === editingRow.modelName) {
              const rows = g.rows.map(r => {
                if (r.rowIndex === editingRow.rowIndex) {
                  return data.row;
                }
                return r;
              });
              return {
                ...g,
                rows,
                validCount: rows.filter(r => r.isValid).length,
                invalidCount: rows.filter(r => !r.isValid).length
              };
            }
            return g;
          }),
          validation: prev.validation ? {
            ...prev.validation,
            canSave: data.sessionCanSave
          } : null
        }));

        setEditingRow(null);
        toast.success('Row updated');
      } else {
        toast.error('Failed to update row');
      }
    } catch (error) {
      toast.error('Failed to update row');
    }
  };

  // Export handler
  const handleExport = async (modelName: string, format: 'csv' | 'json') => {
    if (!state.sessionId) return;

    window.open(
      `/api/admin/import/export?sessionId=${state.sessionId}&model=${modelName}&format=${format}`,
      '_blank'
    );
  };

  // Download template handler
  const handleDownloadTemplate = async (modelName: string) => {
    try {
      const res = await fetch(`/api/admin/import/models?model=${modelName}&action=template`);
      const data = await res.json();

      if (data.success) {
        const blob = new Blob([data.template.csvTemplate], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${modelName}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  // Render upload area
  const renderUploadArea = () => (
    <div className="space-y-4">
      {/* Model selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Force assign to model (optional):
        </label>
        <select
          value={forceModel}
          onChange={(e) => setForceModel(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">Auto-detect model</option>
          {availableModels.map(m => (
            <option key={m.name} value={m.name}>{m.displayName}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
          }
          ${state.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          {state.status === 'uploading' ? (
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          ) : (
            <Upload className="w-16 h-16 text-gray-400" />
          )}
          <div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to select a file (CSV, Excel, JSON)
            </p>
          </div>
        </div>
      </div>

      {/* Available models info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Supported Models ({availableModels.length})
        </h3>
        {availableModels.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading models...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableModels.map(m => (
              <div key={m.name} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{m.displayName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{m.fieldCount} fields</div>
                </div>
                <button
                  onClick={() => handleDownloadTemplate(m.name)}
                  className="ml-2 text-primary hover:text-primary/80 flex-shrink-0"
                  title="Download template"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render validation summary
  const renderValidationSummary = () => {
    if (!state.validation) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-sm">Total Rows</span>
          </div>
          <p className="text-2xl font-bold">{state.totalRows}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Valid</span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {state.validation.validRows}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Invalid</span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            {state.validation.invalidRows}
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Unmatched</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
            {state.validation.unmatchedRows}
          </p>
        </div>
      </div>
    );
  };

  // Render model tabs
  const renderModelTabs = () => {
    const tabs = [
      ...state.modelGroups.map(g => ({
        id: g.modelName,
        label: g.displayName,
        count: g.totalCount,
        invalidCount: g.invalidCount
      })),
      ...(state.unmatchedData.length > 0 ? [{
        id: 'unmatched',
        label: 'Unmatched',
        count: state.unmatchedData.length,
        invalidCount: state.unmatchedData.length
      }] : [])
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            {tab.label}
            <span className={`
              px-2 py-0.5 rounded-full text-xs
              ${activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
              }
            `}>
              {tab.count}
            </span>
            {tab.invalidCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                {tab.invalidCount} errors
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // Render data table for a model group
  const renderDataTable = () => {
    if (activeTab === 'unmatched') {
      return renderUnmatchedTable();
    }

    const group = state.modelGroups.find(g => g.modelName === activeTab);
    if (!group) return null;

    const rows = showErrorsOnly 
      ? group.rows.filter(r => !r.isValid)
      : group.rows;

    const headers = Object.keys(rows[0]?.data || {});

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showErrorsOnly}
                onChange={(e) => setShowErrorsOnly(e.target.checked)}
                className="rounded"
              />
              Show errors only
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport(group.modelName, 'csv')}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport(group.modelName, 'json')}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
            >
              <FileJson className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-16">Row</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-24">Status</th>
                {headers.slice(0, 8).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map(row => (
                <React.Fragment key={row.rowIndex}>
                  <tr className={`
                    ${row.isValid 
                      ? 'bg-white dark:bg-gray-800' 
                      : 'bg-red-50 dark:bg-red-900/10'
                    }
                  `}>
                    <td className="px-4 py-3 font-mono text-gray-500">{row.rowIndex}</td>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                          <XCircle className="w-3 h-3" />
                          {row.errors.length} error(s)
                        </span>
                      )}
                    </td>
                    {headers.slice(0, 8).map(h => (
                      <td key={h} className="px-4 py-3 max-w-[200px] truncate">
                        {formatCellValue(row.data[h])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingRow({
                            modelName: group.modelName,
                            rowIndex: row.rowIndex,
                            data: { ...row.data }
                          })}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveRow(group.modelName, row.rowIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Error details row */}
                  {!row.isValid && (
                    <tr className="bg-red-50/50 dark:bg-red-900/5">
                      <td colSpan={headers.slice(0, 8).length + 3} className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {row.errors.map((error, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                              <strong>{error.field}:</strong> {error.message}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render unmatched rows table
  const renderUnmatchedTable = () => {
    if (state.unmatchedData.length === 0) return null;

    const headers = Object.keys(state.unmatchedData[0]?.data || {});

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200 dark:border-yellow-800 overflow-hidden">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">These {state.unmatchedData.length} rows could not be matched to any model</span>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              Click "Why?" to see model match attempts, or remove these rows to proceed with saving.
            </p>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-16">Row</th>
                  {headers.slice(0, 6).map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.unmatchedData.map(row => (
                  <tr key={row.rowIndex} className="bg-yellow-50/50 dark:bg-yellow-900/5">
                    <td className="px-4 py-3 font-mono text-gray-500">{row.rowIndex}</td>
                    {headers.slice(0, 6).map(h => (
                      <td key={h} className="px-4 py-3 max-w-[150px] truncate">
                        {formatCellValue(row.data[h])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowMatchDetails(showMatchDetails === row.rowIndex ? null : row.rowIndex)}
                          className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          title="See why this row didn't match any model"
                        >
                          Why?
                        </button>
                        <button
                          onClick={() => handleRemoveRow(null, row.rowIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Remove this row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model match details panel */}
        {showMatchDetails !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex justify-between items-center">
              <div>
                <h3 className="font-medium text-blue-700 dark:text-blue-400">
                  Why Row {showMatchDetails} Didn't Match Any Model
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                  A row needs at least 60% confidence to match a model. All attempts below:
                </p>
              </div>
              <button
                onClick={() => setShowMatchDetails(null)}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
              >
                <X className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
              {state.unmatchedData
                .find(r => r.rowIndex === showMatchDetails)
                ?.matchAttempts?.sort((a, b) => b.confidence - a.confidence)
                .map((attempt, idx) => (
                  <div
                    key={attempt.modelName}
                    className={`p-3 rounded-lg border ${
                      attempt.confidence >= 60
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : attempt.confidence >= 40
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {idx + 1}. {attempt.modelName}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              attempt.confidence >= 60
                                ? 'bg-green-500'
                                : attempt.confidence >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${attempt.confidence}%` }}
                          />
                        </div>
                        <span className={`font-mono text-sm font-semibold ${
                          attempt.confidence >= 60 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {attempt.confidence.toFixed(1)}%
                        </span>
                        {attempt.confidence >= 60 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                )) || (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No match attempt data available for this row
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Edit modal
  const renderEditModal = () => {
    if (!editingRow) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">Edit Row {editingRow.rowIndex}</h3>
            <button
              onClick={() => setEditingRow(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(editingRow.data).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => setEditingRow({
                      ...editingRow,
                      data: { ...editingRow.data, [key]: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setEditingRow(null)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateRow}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Import</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Import data from CSV, Excel, or JSON files with automatic model detection
          </p>
        </div>
        
        {state.status !== 'idle' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Clear & Re-upload
            </button>
            
            <button
              onClick={handleSave}
              disabled={!state.validation?.canSave || state.status === 'saving' || state.status === 'saved'}
              className={`
                px-4 py-2 text-sm rounded-lg flex items-center gap-2 font-medium
                ${state.validation?.canSave && state.status !== 'saving' && state.status !== 'saved'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {state.status === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : state.status === 'saved' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* File info */}
      {state.fileName && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center gap-4">
          <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-300">{state.fileName}</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {state.fileType?.toUpperCase()} • {state.totalRows} rows • {state.headers.length} columns
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      {state.status === 'idle' || state.status === 'error' ? (
        renderUploadArea()
      ) : (
        <>
          {renderValidationSummary()}
          
          {/* Cannot save warning */}
          {!state.validation?.canSave && state.status === 'validated' && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Cannot save: Fix all validation errors first</span>
                </div>
                {state.allErrors.length > 0 && (
                  <button
                    onClick={() => setShowAllErrors(!showAllErrors)}
                    className="px-3 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 flex items-center gap-1"
                  >
                    {showAllErrors ? 'Hide' : 'Show'} All Errors ({state.allErrors.length})
                    {showAllErrors ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                You have {state.validation?.invalidRows || 0} invalid rows and {state.validation?.unmatchedRows || 0} unmatched rows. 
                Edit or remove them to enable saving.
              </p>
              
              {/* All errors list */}
              {showAllErrors && state.allErrors.length > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 dark:bg-red-900/30 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-red-700 dark:text-red-300">Row</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700 dark:text-red-300">Model</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700 dark:text-red-300">Field</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700 dark:text-red-300">Error</th>
                        <th className="px-3 py-2 text-left font-medium text-red-700 dark:text-red-300">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 dark:divide-red-800">
                      {state.allErrors.slice(0, 50).map((error, idx) => (
                        <tr key={idx} className="hover:bg-red-50 dark:hover:bg-red-900/20">
                          <td className="px-3 py-2 font-mono">{error.row}</td>
                          <td className="px-3 py-2">{error.modelName}</td>
                          <td className="px-3 py-2 font-medium">{error.field}</td>
                          <td className="px-3 py-2 text-red-600 dark:text-red-400">{error.message}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-[100px] truncate">
                            {formatCellValue(error.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {state.allErrors.length > 50 && (
                    <p className="text-center text-xs text-red-500 py-2 bg-red-50 dark:bg-red-900/30">
                      Showing first 50 of {state.allErrors.length} errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Saved success */}
          {state.status === 'saved' && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Data saved successfully!</span>
              </div>
            </div>
          )}

          {/* Tabs and content */}
          {(state.modelGroups.length > 0 || state.unmatchedData.length > 0) && (
            <>
              {renderModelTabs()}
              {renderDataTable()}
            </>
          )}
        </>
      )}

      {/* Edit modal */}
      {renderEditModal()}
    </div>
  );
}
