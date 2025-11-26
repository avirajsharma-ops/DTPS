"use client";
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';

export interface RecallEntry {
  id: string;
  mealType: string; // e.g., Early Morning, Breakfast
  hour: string; // 1-12
  minute: string; // 00-59
  meridian: 'AM' | 'PM';
  food: string;
  amount: string;
  notes: string;
}

interface RecallFormProps {
  entries: RecallEntry[];
  onChange: (entries: RecallEntry[]) => void;
  onSave: () => void;
  loading?: boolean;
}

export function RecallForm({ entries, onChange, onSave, loading }: RecallFormProps) {
  // Predefined meal slots
  const defaultSlots: { mealType: string; hour: string; minute: string; meridian: 'AM'|'PM' }[] = [
    { mealType: 'Early Morning', hour: '8', minute: '00', meridian: 'AM' },
    { mealType: 'BreakFast', hour: '10', minute: '00', meridian: 'AM' },
    { mealType: 'Mid Morning', hour: '12', minute: '00', meridian: 'PM' },
    { mealType: 'Lunch', hour: '2', minute: '00', meridian: 'PM' },
    { mealType: 'Evening', hour: '4', minute: '00', meridian: 'PM' },
    { mealType: 'Late Evening', hour: '6', minute: '00', meridian: 'PM' },
    { mealType: 'Dinner', hour: '8', minute: '00', meridian: 'PM' },
    { mealType: 'Post Dinner', hour: '10', minute: '00', meridian: 'PM' },
  ];

  // Initialize default slots if empty (after initial render) to avoid setState during render
  useEffect(() => {
    if (entries.length === 0) {
      onChange(defaultSlots.map(s => ({
        id: Math.random().toString(36).slice(2),
        mealType: s.mealType,
        hour: s.hour,
        minute: s.minute,
        meridian: s.meridian,
        food: '',
        amount: '',
        notes: ''
      })));
    }
  }, [entries.length, onChange]);

  const addEntry = () => {
    onChange([
      ...entries,
      { id: Math.random().toString(36).slice(2), mealType: 'Custom', hour: '9', minute: '00', meridian: 'AM', food: '', amount: '', notes: '' }
    ]);
  };

  const updateEntry = (id: string, field: keyof RecallEntry, value: string) => {
    onChange(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>24h Dietary Recall</CardTitle>
        <CardDescription>Record foods consumed in the past 24 hours</CardDescription>
        <div className="mt-4">
          <Label className="text-xs font-semibold text-slate-600">Select customer to copy form</Label>
          <Input placeholder="Search or select customer (placeholder)" className="mt-1 h-8 text-xs" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">{entry.mealType}</h4>
                <div className="flex items-center gap-1">
                  <Input className="w-12 h-8 text-xs" value={entry.hour} onChange={e => updateEntry(entry.id,'hour', e.target.value)} />
                  <span className="text-sm font-medium">:</span>
                  <Input className="w-12 h-8 text-xs" value={entry.minute} onChange={e => updateEntry(entry.id,'minute', e.target.value)} />
                  <Select value={entry.meridian} onValueChange={(val: 'AM' | 'PM') => updateEntry(entry.id,'meridian', val)}>
                    <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Food Details</Label>
                <Textarea value={entry.food} onChange={e => updateEntry(entry.id, 'food', e.target.value)} rows={2} placeholder="Please enter food details here..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input value={entry.amount} onChange={e => updateEntry(entry.id, 'amount', e.target.value)} placeholder="e.g., 1 bowl" />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Input value={entry.notes} onChange={e => updateEntry(entry.id, 'notes', e.target.value)} placeholder="Any notes..." />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => removeEntry(entry.id)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-gray-500">No entries yet. Add the first one.</p>
          )}
        </div>
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={addEntry}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
          <Button type="button" onClick={onSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Recall
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export default RecallForm;
