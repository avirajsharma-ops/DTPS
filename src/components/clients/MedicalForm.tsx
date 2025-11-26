"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save } from 'lucide-react';

export interface MedicalData {
  medicalConditions: string;
  allergies: string;
  dietaryRestrictions: string;
  notes: string;
  diseaseHistory: DiseaseEntry[];
  medicalHistory: string;
  familyHistory: string;
  medication: string;
  bloodGroup: string;
  gutIssues: string[]; // acidity, bloating, constipation, none
  reports: UploadedReport[];
}

export interface DiseaseEntry {
  id: string;
  disease: string;
  since: string; // date or year
  frequency: string;
  severity: string;
  grading: string;
  action: string;
}

export interface UploadedReport {
  id: string;
  fileName: string;
  uploadedOn: string;
  fileType: string;
  url?: string;
}

interface MedicalFormProps extends MedicalData {
  onChange: (field: keyof MedicalData, value: any) => void;
  onSave: () => void;
  loading?: boolean;
}

export function MedicalForm({ medicalConditions, allergies, dietaryRestrictions, notes, diseaseHistory, medicalHistory, familyHistory, medication, bloodGroup, gutIssues, reports, onChange, onSave, loading }: MedicalFormProps) {
  const addDiseaseRow = () => {
    const newRow: DiseaseEntry = { id: Math.random().toString(36).slice(2), disease: '', since: '', frequency: '', severity: '', grading: '', action: '' };
    onChange('diseaseHistory', [...diseaseHistory, newRow]);
  };
  const updateDiseaseRow = (id: string, field: keyof DiseaseEntry, value: string) => {
    onChange('diseaseHistory', diseaseHistory.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const removeDiseaseRow = (id: string) => {
    onChange('diseaseHistory', diseaseHistory.filter(r => r.id !== id));
  };
  const toggleGutIssue = (issue: string) => {
    if (issue === 'none') {
      onChange('gutIssues', ['none']);
    } else {
      const next = gutIssues.includes(issue) ? gutIssues.filter(i => i !== issue && i !== 'none') : [...gutIssues.filter(i => i !== 'none'), issue];
      onChange('gutIssues', next);
    }
  };
  const addReport = (file: File, customName: string) => {
    const newReport: UploadedReport = {
      id: Math.random().toString(36).slice(2),
      fileName: customName || file.name,
      uploadedOn: new Date().toISOString().split('T')[0],
      fileType: file.type || 'unknown',
    };
    onChange('reports', [...reports, newReport]);
  };
  const removeReport = (id: string) => onChange('reports', reports.filter(r => r.id !== id));
  const handleReportInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(f => addReport(f, pendingReportName));
    setPendingReportName('');
    e.target.value = '';
  };
  const [pendingReportName, setPendingReportName] = React.useState('');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Information</CardTitle>
        <CardDescription>Health conditions and dietary restrictions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="medicalConditions">Medical Conditions</Label>
          <Input id="medicalConditions" value={medicalConditions} onChange={e => onChange('medicalConditions', e.target.value)} placeholder="Diabetes, hypertension, etc. (comma separated)" />
        </div>
        <div>
          <Label htmlFor="allergies">Allergies</Label>
          <Input id="allergies" value={allergies} onChange={e => onChange('allergies', e.target.value)} placeholder="Nuts, dairy, shellfish, etc. (comma separated)" />
        </div>
        <div>
          <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
          <Input id="dietaryRestrictions" value={dietaryRestrictions} onChange={e => onChange('dietaryRestrictions', e.target.value)} placeholder="Vegetarian, vegan, gluten-free, etc. (comma separated)" />
        </div>
        {/* Disease History Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Disease History</Label>
            <Button type="button" variant="outline" size="sm" onClick={addDiseaseRow}>Add</Button>
          </div>
          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-2">Disease</th>
                  <th className="p-2">Since</th>
                  <th className="p-2">Frequency</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Grading</th>
                  <th className="p-2">Action</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {diseaseHistory.map(row => (
                  <tr key={row.id} className="border-t">
                    <td className="p-1"><Input value={row.disease} onChange={e => updateDiseaseRow(row.id,'disease', e.target.value)} placeholder="Disease" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.since} onChange={e => updateDiseaseRow(row.id,'since', e.target.value)} placeholder="YYYY" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.frequency} onChange={e => updateDiseaseRow(row.id,'frequency', e.target.value)} placeholder="Freq" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.severity} onChange={e => updateDiseaseRow(row.id,'severity', e.target.value)} placeholder="Severity" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.grading} onChange={e => updateDiseaseRow(row.id,'grading', e.target.value)} placeholder="Grade" className="h-8 text-xs" /></td>
                    <td className="p-1"><Input value={row.action} onChange={e => updateDiseaseRow(row.id,'action', e.target.value)} placeholder="Action" className="h-8 text-xs" /></td>
                    <td className="p-1"><Button type="button" variant="ghost" size="sm" onClick={() => removeDiseaseRow(row.id)}>✕</Button></td>
                  </tr>
                ))}
                {diseaseHistory.length === 0 && (
                  <tr><td colSpan={7} className="p-3 text-center text-gray-500">No disease history added.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Any Medical History</Label>
            <Textarea value={medicalHistory} onChange={e => onChange('medicalHistory', e.target.value)} rows={2} placeholder="Past surgeries, hospitalizations..." />
          </div>
          <div>
            <Label>Family History</Label>
            <Textarea value={familyHistory} onChange={e => onChange('familyHistory', e.target.value)} rows={2} placeholder="Family diseases..." />
          </div>
        </div>
        <div>
          <Label>Any Medication</Label>
          <Textarea value={medication} onChange={e => onChange('medication', e.target.value)} rows={2} placeholder="Current medications..." />
        </div>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <Label>Blood Group</Label>
            <Input value={bloodGroup} onChange={e => onChange('bloodGroup', e.target.value)} placeholder="A+" />
          </div>
          <div className="col-span-2">
            <Label>Gut Issues *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Acidity','Bloating','Constipation','None'].map(issue => {
                const val = issue.toLowerCase();
                const selected = gutIssues.includes(val);
                return (
                  <Button key={val} type="button" size="sm" variant={selected ? 'default':'outline'} onClick={() => toggleGutIssue(val)}>{issue}</Button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Reports Upload */}
        <div className="space-y-2">
          <Label>Upload Medical Reports</Label>
          <div className="flex items-center gap-2">
            <Input placeholder="File Name (Optional)" value={pendingReportName} onChange={e => setPendingReportName(e.target.value)} className="flex-1" />
            <Input type="file" multiple onChange={handleReportInput} className="flex-1" />
          </div>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-2">File Name</th>
                  <th className="p-2">Uploaded On</th>
                  <th className="p-2">File Type</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.fileName}</td>
                    <td className="p-2">{r.uploadedOn}</td>
                    <td className="p-2">{r.fileType}</td>
                    <td className="p-2"><Button type="button" size="sm" variant="ghost" onClick={() => removeReport(r.id)}>Remove</Button></td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={4} className="p-3 text-center text-gray-500">No reports uploaded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea id="notes" value={notes} onChange={e => onChange('notes', e.target.value)} rows={3} placeholder="Any additional information about the client..." />
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Medical
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export default MedicalForm;
