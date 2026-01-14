'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, FileSpreadsheet, Printer, FileImage, FileDown } from 'lucide-react';
import { DayPlan, MealTypeConfig, FoodOption } from './DietPlanDashboard';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DietPlanExportProps {
  weekPlan: DayPlan[];
  mealTypes: string[];
  clientName?: string;
  clientInfo?: {
    age?: number;
    goal?: string;
    dietaryRestrictions?: string;
    medicalConditions?: string;
    allergies?: string;
  };
  duration: number;
  startDate?: string;
  externalOpen?: boolean; // External control to open dialog
  onExternalOpenChange?: (open: boolean) => void; // Callback when dialog state changes externally
}

export function DietPlanExport({ weekPlan, mealTypes, clientName, clientInfo, duration, startDate, externalOpen, onExternalOpenChange }: DietPlanExportProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both internal and external open state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  
  const [exportFormat, setExportFormat] = useState<'html' | 'csv' | 'pdf' | 'print'>('pdf');

  // Calculate daily totals
  const calculateDayTotals = (day: DayPlan) => {
    let cal = 0, carbs = 0, protein = 0, fats = 0, fiber = 0;
    
    Object.values(day.meals).forEach(meal => {
      if (meal?.foodOptions?.[0]) {
        const opt = meal.foodOptions[0];
        cal += parseFloat(opt.cal) || 0;
        carbs += parseFloat(opt.carbs) || 0;
        protein += parseFloat(opt.protein) || 0;
        fats += parseFloat(opt.fats) || 0;
        fiber += parseFloat(opt.fiber) || 0;
      }
    });
    
    return { cal, carbs, protein, fats, fiber };
  };

  // Generate HTML table structure
  const generateHTMLContent = useCallback(() => {
    const today = format(new Date(), 'dd MMM yyyy');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diet Plan - ${clientName || 'Client'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; }
    .header h1 { color: #16a34a; font-size: 28px; margin-bottom: 10px; }
    .header p { color: #666; font-size: 14px; }
    .client-info { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
    .client-info-item { font-size: 13px; }
    .client-info-item strong { color: #16a34a; }
    .day-section { margin-bottom: 25px; page-break-inside: avoid; }
    .day-header { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 12px 15px; border-radius: 8px 8px 0 0; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
    .day-header .date { font-size: 12px; opacity: 0.9; }
    .day-note { background: #fef3c7; padding: 10px 15px; font-size: 12px; color: #92400e; border-left: 4px solid #f59e0b; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; text-align: left; border: 1px solid #e5e7eb; font-size: 13px; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .meal-name { font-weight: 600; color: #16a34a; white-space: nowrap; }
    .meal-time { font-size: 11px; color: #6b7280; }
    .food-item { margin-bottom: 5px; }
    .food-name { font-weight: 500; }
    .food-qty { color: #6b7280; font-size: 12px; }
    .macro-cell { text-align: center; font-size: 12px; }
    .macro-value { font-weight: 600; color: #374151; }
    .macro-label { font-size: 10px; color: #9ca3af; }
    .totals-row { background: #f0fdf4; font-weight: 600; }
    .totals-row td { color: #16a34a; }
    .alternatives { background: #fef9c3; font-size: 11px; padding: 5px 10px; border-radius: 4px; margin-top: 5px; }
    .alternatives-label { font-weight: 600; color: #854d0e; }
    .summary { margin-top: 30px; padding: 20px; background: #f0fdf4; border-radius: 8px; }
    .summary h3 { color: #16a34a; margin-bottom: 15px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
    .summary-item { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary-value { font-size: 24px; font-weight: 700; color: #16a34a; }
    .summary-label { font-size: 12px; color: #6b7280; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; padding: 10px; }
      .day-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🥗 Personalized Diet Plan</h1>
      <p><strong>${clientName || 'Client'}</strong> | Generated on ${today} | ${duration} Days Plan</p>
    </div>

    ${clientInfo ? `
    <div class="client-info">
      ${clientInfo.age ? `<div class="client-info-item"><strong>Age:</strong> ${clientInfo.age} years</div>` : ''}
      ${clientInfo.goal ? `<div class="client-info-item"><strong>Goal:</strong> ${clientInfo.goal}</div>` : ''}
      ${clientInfo.dietaryRestrictions ? `<div class="client-info-item"><strong>Dietary Restrictions:</strong> ${clientInfo.dietaryRestrictions}</div>` : ''}
      ${clientInfo.medicalConditions ? `<div class="client-info-item"><strong>Medical Conditions:</strong> ${clientInfo.medicalConditions}</div>` : ''}
      ${clientInfo.allergies ? `<div class="client-info-item"><strong>Allergies:</strong> ${clientInfo.allergies}</div>` : ''}
    </div>
    ` : ''}

    ${weekPlan.map((day, dayIndex) => {
      const totals = calculateDayTotals(day);
      const hasData = Object.keys(day.meals).length > 0;
      
      if (day.isHeld) {
        return `
        <div class="day-section">
          <div class="day-header" style="background: #fbbf24;">
            <span>📅 ${day.day}</span>
            <span class="date">${day.date || ''}</span>
          </div>
          <div class="day-note">⏸️ Plan on hold${day.holdReason ? `: ${day.holdReason}` : ''}</div>
        </div>
        `;
      }
      
      return `
      <div class="day-section">
        <div class="day-header">
          <span>📅 ${day.day}</span>
          <span class="date">${day.date || ''}</span>
        </div>
        ${day.note ? `<div class="day-note">📝 ${day.note}</div>` : ''}
        <table>
          <thead>
            <tr>
              <th style="width: 120px;">Meal</th>
              <th>Food Items</th>
              <th style="width: 70px;" class="macro-cell">Calories</th>
              <th style="width: 70px;" class="macro-cell">Carbs(g)</th>
              <th style="width: 70px;" class="macro-cell">Protein(g)</th>
              <th style="width: 70px;" class="macro-cell">Fats(g)</th>
              <th style="width: 70px;" class="macro-cell">Fiber(g)</th>
            </tr>
          </thead>
          <tbody>
            ${mealTypes.map(mealType => {
              const meal = day.meals[mealType];
              if (!meal) return '';
              
              const primaryFood = meal.foodOptions?.[0];
              const alternatives = meal.foodOptions?.slice(1) || [];
              
              if (!primaryFood) return '';
              
              return `
              <tr>
                <td>
                  <div class="meal-name">${mealType}</div>
                  <div class="meal-time">${meal.time || ''}</div>
                </td>
                <td>
                  <div class="food-item">
                    <span class="food-name">${primaryFood.food || '-'}</span>
                    ${primaryFood.unit ? `<span class="food-qty">(${primaryFood.unit})</span>` : ''}
                  </div>
                  ${alternatives.length > 0 ? `
                  <div class="alternatives">
                    <span class="alternatives-label">Alternatives:</span>
                    ${alternatives.map((alt, i) => `${alt.food || '-'}${alt.unit ? ` (${alt.unit})` : ''}`).join(' | ')}
                  </div>
                  ` : ''}
                </td>
                <td class="macro-cell"><div class="macro-value">${primaryFood.cal || '0'}</div></td>
                <td class="macro-cell"><div class="macro-value">${primaryFood.carbs || '0'}</div></td>
                <td class="macro-cell"><div class="macro-value">${primaryFood.protein || '0'}</div></td>
                <td class="macro-cell"><div class="macro-value">${primaryFood.fats || '0'}</div></td>
                <td class="macro-cell"><div class="macro-value">${primaryFood.fiber || '0'}</div></td>
              </tr>
              `;
            }).join('')}
            ${hasData ? `
            <tr class="totals-row">
              <td colspan="2" style="text-align: right;"><strong>Daily Total</strong></td>
              <td class="macro-cell"><strong>${totals.cal.toFixed(0)}</strong></td>
              <td class="macro-cell"><strong>${totals.carbs.toFixed(1)}</strong></td>
              <td class="macro-cell"><strong>${totals.protein.toFixed(1)}</strong></td>
              <td class="macro-cell"><strong>${totals.fats.toFixed(1)}</strong></td>
              <td class="macro-cell"><strong>${totals.fiber.toFixed(1)}</strong></td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      `;
    }).join('')}

    <div class="summary">
      <h3>📊 Plan Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${duration}</div>
          <div class="summary-label">Total Days</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${mealTypes.length}</div>
          <div class="summary-label">Meals Per Day</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${weekPlan.reduce((sum, day) => sum + calculateDayTotals(day).cal, 0).toFixed(0)}</div>
          <div class="summary-label">Total Calories</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${(weekPlan.reduce((sum, day) => sum + calculateDayTotals(day).cal, 0) / duration).toFixed(0)}</div>
          <div class="summary-label">Avg Daily Calories</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Generated by DT Poonam Sagar Nutrition System | ${today}</p>
      <p>This diet plan is personalized and should be followed as prescribed by your dietitian.</p>
    </div>
  </div>
</body>
</html>
    `;
  }, [weekPlan, mealTypes, clientName, clientInfo, duration]);

  // Generate CSV content
  const generateCSVContent = useCallback(() => {
    let csv = 'Diet Plan Export\n';
    csv += `Client: ${clientName || 'N/A'}\n`;
    csv += `Generated: ${format(new Date(), 'PPP')}\n`;
    csv += `Duration: ${duration} days\n\n`;
    
    csv += 'Day,Date,Meal,Time,Food,Quantity,Calories,Carbs(g),Protein(g),Fats(g),Fiber(g),Notes\n';
    
    weekPlan.forEach(day => {
      mealTypes.forEach(mealType => {
        const meal = day.meals[mealType];
        if (meal?.foodOptions?.[0]) {
          const opt = meal.foodOptions[0];
          csv += `"${day.day}","${day.date || ''}","${mealType}","${meal.time || ''}","${opt.food || ''}","${opt.unit || ''}","${opt.cal || ''}","${opt.carbs || ''}","${opt.protein || ''}","${opt.fats || ''}","${opt.fiber || ''}","${day.note || ''}"\n`;
        }
      });
    });
    
    return csv;
  }, [weekPlan, mealTypes, clientName, duration]);

  // Export handlers
  const handleExportHTML = useCallback(() => {
    const html = generateHTMLContent();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diet-plan-${clientName?.replace(/\s+/g, '-') || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Diet plan exported as HTML');
    setOpen(false);
  }, [generateHTMLContent, clientName]);

  const handleExportCSV = useCallback(() => {
    const csv = generateCSVContent();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diet-plan-${clientName?.replace(/\s+/g, '-') || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Diet plan exported as CSV');
    setOpen(false);
  }, [generateCSVContent, clientName]);

  const handleExportPDF = useCallback(() => {
    const html = generateHTMLContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Add print-to-PDF optimized styles
      const pdfOptimizedHtml = html.replace('</head>', `
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 10mm; }
            .container { box-shadow: none !important; }
          }
        </style>
        </head>
      `);
      printWindow.document.write(pdfOptimizedHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        // Show instructions for saving as PDF
        toast.info('Use "Save as PDF" in the print dialog to download as PDF');
        printWindow.print();
      };
    }
    setOpen(false);
  }, [generateHTMLContent]);

  const handlePrint = useCallback(() => {
    const html = generateHTMLContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success('Print dialog opened');
    setOpen(false);
  }, [generateHTMLContent]);

  const handleExport = () => {
    switch (exportFormat) {
      case 'html':
        handleExportHTML();
        break;
      case 'csv':
        handleExportCSV();
        break;
      case 'pdf':
        handleExportPDF();
        break;
      case 'print':
        handlePrint();
        break;
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-slate-700 font-medium">
        <Download className="w-4 h-4 mr-2" />
        Export Diet Plan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Diet Plan</DialogTitle>
            <DialogDescription>
              Choose a format to download the diet plan for {clientName || 'this client'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      <span>PDF (Download)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="html">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>HTML (Formatted Table)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>CSV (Spreadsheet)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="print">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      <span>Print Preview</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm space-y-1">
              <p className="font-medium">Export includes:</p>
              <ul className="text-gray-600 dark:text-gray-400 text-xs space-y-0.5">
                <li>• {duration} days of meal plans</li>
                <li>• {mealTypes.length} meals per day</li>
                <li>• Nutritional information (calories, macros)</li>
                <li>• Alternative food options</li>
                <li>• Daily notes and special instructions</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
