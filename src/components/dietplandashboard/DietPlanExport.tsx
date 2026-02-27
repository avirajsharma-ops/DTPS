'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, FileSpreadsheet, Printer, FileImage, FileDown } from 'lucide-react';
import { DayPlan, MealTypeConfig, FoodOption } from './DietPlanDashboard';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { MEAL_TYPES, MEAL_TYPE_KEYS, normalizeMealType } from '@/lib/mealConfig';

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
  const [exportFor, setExportFor] = useState<'dietitian' | 'client'>('dietitian');

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

  // Helper function to format date properly
  const formatDateProper = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Helper function to get meal time — prefer actual stored time from plan data
  // This ensures custom meal times and bulk-edited times are reflected in exports
  const getMealTime = (mealType: string): string => {
    // First try stored time from plan data (reflects bulk time edits and custom meals)
    for (const day of weekPlan) {
      if (day.meals[mealType]?.time) {
        return day.meals[mealType].time;
      }
      // Also try normalized key form
      const key = normalizeMealType(mealType);
      if (key) {
        const label = MEAL_TYPES[key]?.label;
        if (label && label !== mealType && day.meals[label]?.time) {
          return day.meals[label].time;
        }
      }
    }
    // Fallback to canonical IST time from mealConfig
    const normalizedKey = normalizeMealType(mealType);
    if (normalizedKey && MEAL_TYPES[normalizedKey]) {
      return MEAL_TYPES[normalizedKey].time12h;
    }
    return '12:00 PM';
  };

  // Helper: get canonical sort order for a meal type
  const getCanonicalSortOrder = (mealType: string): number => {
    const normalizedKey = normalizeMealType(mealType);
    if (normalizedKey && MEAL_TYPES[normalizedKey]) {
      return MEAL_TYPES[normalizedKey].sortOrder;
    }
    return 99; // custom types go last
  };

  // Helper function to convert time string to numeric for sorting (proper AM/PM handling)
  const getTimeNumericValue = (timeStr: string): number => {
    if (!timeStr) return 1200;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'AM' && hours === 12) hours = 0;
      if (period === 'PM' && hours !== 12) hours += 12;
      return hours * 60 + minutes;
    }
    // Fallback: try 24h format
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':');
      return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    }
    return 1200;
  };

  // Helper: resolve meal type to display label
  const toDisplayLabel = (mt: string): string => {
    const key = normalizeMealType(mt);
    if (key && MEAL_TYPES[key]) return MEAL_TYPES[key].label;
    return mt;
  };

  // Helper: find meal in day's meals, trying both label and key forms
  const findMealInDay = (day: DayPlan, mealType: string) => {
    if (day.meals[mealType]) return day.meals[mealType];
    const key = normalizeMealType(mealType);
    if (key && day.meals[key]) return day.meals[key];
    const label = toDisplayLabel(mealType);
    if (label !== mealType && day.meals[label]) return day.meals[label];
    return undefined;
  };

  // Get all unique meal types from weekPlan and sort by time
  const getAllMealTypesSorted = (): string[] => {
    const allMealTypes = new Set<string>();
    weekPlan.forEach(day => {
      Object.keys(day.meals).forEach(mt => {
        const label = toDisplayLabel(mt);
        const meal = day.meals[mt];
        // Only include if it has food
        if (meal?.foodOptions?.some(opt => opt.food?.trim())) {
          allMealTypes.add(label);
        }
      });
    });

    return Array.from(allMealTypes).sort((a, b) => {
      const timeA = getMealTime(a);
      const timeB = getMealTime(b);
      const timeValueA = getTimeNumericValue(timeA);
      const timeValueB = getTimeNumericValue(timeB);

      // Sort purely by time
      if (timeValueA !== timeValueB) {
        return timeValueA - timeValueB;
      }

      // If same time, canonical types come before custom types
      const orderA = getCanonicalSortOrder(a);
      const orderB = getCanonicalSortOrder(b);
      return orderA - orderB;
    });
  };

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

  // Generate HTML table structure with date sorting
  const generateHTMLContent = useCallback((showMacros: boolean = true) => {
    const today = format(new Date(), 'dd MMM yyyy');

    // Sort days by actual date if available
    const sortedDays = [...weekPlan].sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return weekPlan.indexOf(a) - weekPlan.indexOf(b);
    });

    const includeMacrosStyle = showMacros ? '' : `
    .macro-cell { display: none !important; }
    thead tr th:nth-child(3),
    thead tr th:nth-child(4),
    thead tr th:nth-child(5),
    thead tr th:nth-child(6),
    thead tr th:nth-child(7),
    tbody tr td:nth-child(3),
    tbody tr td:nth-child(4),
    tbody tr td:nth-child(5),
    tbody tr td:nth-child(6),
    tbody tr td:nth-child(7) { display: none !important; }
    `;

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
    .export-type { font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 5px; }
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
    ${includeMacrosStyle}
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
      <div class="export-type">${showMacros ? '📋 Dietitian Version (with nutritional info)' : '👤 Client Version (meal plan only)'}</div>
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

    ${sortedDays.map((day, dayIndex) => {
      const totals = calculateDayTotals(day);
      const hasData = Object.keys(day.meals).length > 0;

      if (day.isHeld) {
        return `
        <div class="day-section">
          <div class="day-header" style="background: #fbbf24;">
            <span>📅 ${day.day}</span>
            <span class="date">${day.date ? formatDateProper(day.date) : ''}</span>
          </div>
          <div class="day-note">⏸️ Plan on hold${day.holdReason ? `: ${day.holdReason}` : ''}</div>
        </div>
        `;
      }

      return `
      <div class="day-section">
        <div class="day-header">
          <span>📅 ${day.day}</span>
          <span class="date">${day.date ? formatDateProper(day.date) : ''}</span>
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
            ${(() => {
          const allMealTypes = getAllMealTypesSorted();
          return allMealTypes.map(mealType => {
            const meal = findMealInDay(day, mealType);
            if (!meal) return '';

            const primaryFood = meal.foodOptions?.[0];
            const alternatives = meal.foodOptions?.slice(1) || [];

            if (!primaryFood) return '';

            return `
                <tr>
                  <td>
                    <div class="meal-name">${mealType}</div>
                    <div class="meal-time">${getMealTime(mealType)}</div>
                  </td>
                  <td>
                    <div class="food-item">
                      <span class="food-name">${primaryFood.food || '-'}</span>
                      ${primaryFood.unit ? `<span class="food-qty">(${primaryFood.unit})</span>` : ''}
                    </div>
                    ${alternatives.length > 0 ? `
                    <div class="alternatives">
                      <span class="alternatives-label">Alternatives:</span>
                      <ul style="margin: 4px 0 0 15px; padding: 0; list-style: disc;">
                        ${alternatives.map(alt => `<li style="margin-bottom: 2px;">${alt.food || '-'}${alt.unit ? ` (${alt.unit})` : ''}${showMacros && alt.cal ? ` — <span style="color:#6b7280; font-size:10px;">Cal: ${alt.cal}, C: ${alt.carbs || 0}g, P: ${alt.protein || 0}g, F: ${alt.fats || 0}g</span>` : ''}</li>`).join('')}
                      </ul>
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
          }).join('');
        })()}
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
          <div class="summary-value">${sortedDays.reduce((sum, day) => sum + calculateDayTotals(day).cal, 0).toFixed(0)}</div>
          <div class="summary-label">Total Calories</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${(sortedDays.reduce((sum, day) => sum + calculateDayTotals(day).cal, 0) / duration).toFixed(0)}</div>
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

  // Generate CSV content with proper date/time sorting
  const generateCSVContent = useCallback(() => {
    // Sort days by actual date if available, otherwise by index
    const sortedDays = [...weekPlan].sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return weekPlan.indexOf(a) - weekPlan.indexOf(b);
    });

    let csv = '"Diet Plan Export"\n';
    csv += `"Client","${clientName || 'N/A'}"\n`;
    csv += `"Generated","${format(new Date(), 'PPP HH:mm')}"\n`;
    csv += `"Duration","${duration} days"\n`;
    csv += `"Start Date","${startDate ? format(new Date(startDate), 'PPP') : 'N/A'}"\n`;
    csv += '\n';

    // Column headers
    csv += '"Day","Date","Meal Type","Meal Time","Food Item","Quantity","Calories","Carbs(g)","Protein(g)","Fats(g)","Fiber(g)","Alternative Options","Notes"\n';

    // Data rows
    sortedDays.forEach((day) => {
      // Skip held days or show them differently
      if (day.isHeld) {
        csv += `"${day.day}","${day.date ? formatDateProper(day.date) : ''}","ON HOLD","","","","","","","","","","⏸️ ${day.holdReason || 'Plan on hold'}"\n`;
        return;
      }

      const allMealTypes = getAllMealTypesSorted();

      allMealTypes.forEach(mealType => {
        const meal = findMealInDay(day, mealType);
        if (!meal?.foodOptions?.length) return;

        // Get primary food and alternatives
        const primaryFood = meal.foodOptions[0];
        const alternatives = meal.foodOptions.slice(1);

        const alternativesStr = alternatives
          .map(alt => `${alt.food}${alt.unit ? ` (${alt.unit})` : ''}`)
          .join(' | ');

        // Main food row
        csv += `"${day.day}","${day.date ? formatDateProper(day.date) : ''}","${mealType}","${getMealTime(mealType)}","${primaryFood.food || ''}","${primaryFood.unit || ''}","${primaryFood.cal || ''}","${primaryFood.carbs || ''}","${primaryFood.protein || ''}","${primaryFood.fats || ''}","${primaryFood.fiber || ''}","${alternativesStr}","${day.note || ''}"\n`;

        // Alternative rows (if any)
        alternatives.forEach((alt, altIndex) => {
          csv += `"","","(Alternative ${altIndex + 1})","","${alt.food || ''}","${alt.unit || ''}","${alt.cal || ''}","${alt.carbs || ''}","${alt.protein || ''}","${alt.fats || ''}","${alt.fiber || ''}","",""\n`;
        });
      });

      // Add day total row
      const dayTotals = calculateDayTotals(day);
      csv += `"${day.day} TOTAL","","","","","","${dayTotals.cal.toFixed(0)}","${dayTotals.carbs.toFixed(1)}","${dayTotals.protein.toFixed(1)}","${dayTotals.fats.toFixed(1)}","${dayTotals.fiber.toFixed(1)}","",""\n`;
      csv += '\n'; // Blank line between days for readability
    });

    // Weekly summary
    csv += '\n"WEEKLY SUMMARY"\n';
    const weeklyTotals = sortedDays.reduce(
      (acc, day) => {
        const totals = calculateDayTotals(day);
        return {
          cal: acc.cal + totals.cal,
          carbs: acc.carbs + totals.carbs,
          protein: acc.protein + totals.protein,
          fats: acc.fats + totals.fats,
          fiber: acc.fiber + totals.fiber
        };
      },
      { cal: 0, carbs: 0, protein: 0, fats: 0, fiber: 0 }
    );

    csv += `"Total Calories","${weeklyTotals.cal.toFixed(0)}"\n`;
    csv += `"Average Daily Calories","${(weeklyTotals.cal / duration).toFixed(0)}"\n`;
    csv += `"Total Carbs","${weeklyTotals.carbs.toFixed(1)} g"\n`;
    csv += `"Total Protein","${weeklyTotals.protein.toFixed(1)} g"\n`;
    csv += `"Total Fats","${weeklyTotals.fats.toFixed(1)} g"\n`;
    csv += `"Total Fiber","${weeklyTotals.fiber.toFixed(1)} g"\n`;

    return csv;
  }, [weekPlan, clientName, duration, startDate]);

  // Export handlers
  const handleExportHTML = useCallback(() => {
    const showMacros = exportFor === 'dietitian';
    const html = generateHTMLContent(showMacros);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = exportFor === 'dietitian' ? 'dietitian' : 'client';
    link.download = `diet-plan-${clientName?.replace(/\s+/g, '-') || 'export'}-${suffix}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Diet plan exported as HTML (${exportFor} version)`);
    setOpen(false);
  }, [generateHTMLContent, clientName, exportFor]);

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
    const showMacros = exportFor === 'dietitian';
    const html = generateHTMLContent(showMacros);
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
        toast.info(`Use "Save as PDF" in the print dialog to download as PDF (${exportFor} version)`);
        printWindow.print();
      };
    }
    setOpen(false);
  }, [generateHTMLContent, exportFor]);

  const handlePrint = useCallback(() => {
    const showMacros = exportFor === 'dietitian';
    const html = generateHTMLContent(showMacros);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success(`Print dialog opened (${exportFor} version)`);
    setOpen(false);
  }, [generateHTMLContent, exportFor]);

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
      {/* Only show button if not externally controlled */}
      {externalOpen === undefined && (
        <Button variant="outline" onClick={() => setOpen(true)} className="border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-slate-700 font-medium">
          <Download className="w-4 h-4 mr-2" />
          Export Diet Plan
        </Button>
      )}

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
              <label className="text-sm font-medium">Export For</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={exportFor === 'dietitian' ? 'default' : 'outline'}
                  className={`flex-1 ${exportFor === 'dietitian' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setExportFor('dietitian')}
                >
                  📋 Dietitian
                </Button>
                <Button
                  type="button"
                  variant={exportFor === 'client' ? 'default' : 'outline'}
                  className={`flex-1 ${exportFor === 'client' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => setExportFor('client')}
                >
                  👤 Client
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {exportFor === 'dietitian'
                  ? '✓ Includes all nutritional data (calories, macros, fiber)'
                  : '✓ Meal plan only (no nutritional information)'}
              </p>
            </div>

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
