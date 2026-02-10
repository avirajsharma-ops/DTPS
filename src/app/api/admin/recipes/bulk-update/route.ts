/**
 * API Route: Bulk Update Recipes by UUID
 * PUT /api/admin/recipes/bulk-update - Update recipes using UUID identifier only
 * POST /api/admin/recipes/bulk-update - Upload CSV file for bulk updates using UUID
 * 
 * IMPORTANT: UUID is the ONLY accepted identifier for recipe lookups.
 * - Updates are identified strictly by UUID
 * - Existing recipes are updated via $set operations
 * - No new recipes are created during update operations
 * - Requests without valid UUID are skipped with status 'cancelled'
 * - Arrays are replaced completely (not appended)
 * - All updates use MongoDB $set operator for consistency
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import Recipe from '@/lib/db/models/Recipe';
import mongoose from 'mongoose';
import { clearCacheByTag } from '@/lib/api/utils';

export const runtime = 'nodejs';

/**
 * Parse Python-style string arrays to proper JSON arrays
 * Handles strings like "[{'name': 'value', ...}]"
 */
function parsePythonStyleArray(value: any): any {
  if (typeof value !== 'string') return value;
  
  // Check if it looks like a Python-style array with single quotes
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return value;
  
  // Check if it contains Python-style single quotes for strings
  if (trimmed.includes("{'") || trimmed.includes("': '") || trimmed.includes("', '")) {
    try {
      // Replace Python-style quotes with JSON-style quotes
      let jsonStr = trimmed
        .replace(/'/g, '"')
        .replace(/"(\d+\.?\d*)"/g, '$1')
        .replace(/: None/g, ': null')
        .replace(/: True/g, ': true')
        .replace(/: False/g, ': false');
      
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (e) {
      try {
        const sanitized = trimmed
          .replace(/'/g, '"')
          .replace(/None/g, 'null')
          .replace(/True/g, 'true')
          .replace(/False/g, 'false');
        return JSON.parse(sanitized);
      } catch (e2) {
        console.error('Failed to parse Python-style array:', e2);
        return value;
      }
    }
  }
  
  // Try parsing as regular JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Convert string boolean values to actual booleans
 */
function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }
  return Boolean(value);
}

/**
 * Normalize field values based on field type
 */
function normalizeFieldValue(field: string, value: any): any {
  // Boolean fields
  if (['isActive', 'isPublic', 'isPremium', 'isTemplate'].includes(field)) {
    return normalizeBoolean(value);
  }
  
  // Numeric fields
  if (['prepTime', 'cookTime', 'servings'].includes(field)) {
    const num = parseInt(value);
    return isNaN(num) ? value : num;
  }

  // Parse arrays if they are strings
  if (['ingredients', 'instructions', 'tags', 'dietaryRestrictions', 'allergens', 'medicalContraindications'].includes(field)) {
    let parsed = parsePythonStyleArray(value);
    
    // For ingredients, ensure quantity is a number
    if (field === 'ingredients' && Array.isArray(parsed)) {
      parsed = parsed.map((ing: any) => {
        if (typeof ing === 'object' && ing !== null) {
          return {
            name: ing.name || '',
            quantity: typeof ing.quantity === 'number' ? ing.quantity : parseFloat(String(ing.quantity)) || 1,
            unit: ing.unit || 'unit',
            remarks: ing.remarks || ''
          };
        }
        return ing;
      });
    }
    
    return parsed;
  }

  return value;
}

interface UpdateRecord {
  uuid: string | number;
  [key: string]: any;
}

interface UpdateResult {
  uuid: string | number;
  status: 'completed' | 'failed' | 'cancelled';
  message: string;
  errorDetails?: string;
  errorCode?: string;
  changedFields?: string[];
  changedFieldsCount?: number;
}

// Valid recipe fields that can be updated
const UPDATABLE_FIELDS = [
  'name', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime',
  'servings', 'nutrition', 'tags', 'dietaryRestrictions', 'allergens',
  'medicalContraindications', 'difficulty', 'image', 'images', 'video',
  'isPublic', 'isPremium', 'isActive', 'cuisine', 'category', 'tips', 'variations'
];

// Parse CSV content to array of records (UUID required)
function parseCSV(csvContent: string): UpdateRecord[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Validate uuid column exists (REQUIRED - only identifier allowed)
  const uuidIndex = headers.findIndex(h => h.toLowerCase() === 'uuid');
  
  if (uuidIndex === -1) {
    throw new Error('CSV must have a "uuid" column to identify recipes for updating. This is the only supported identifier.');
  }

  const records: UpdateRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line handling quoted values
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}`);
      continue;
    }

    const record: Partial<UpdateRecord> = {};
    let uuid: string | number | null = null;
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value = values[j];
      
      // Skip empty values
      if (value === '' || value === undefined) continue;
      
      // Extract and validate UUID
      if (header.toLowerCase() === 'uuid') {
        uuid = value;
        record.uuid = value;
        continue;
      }
      
      // Store the final value (can be any type after parsing)
      let parsedValue: any = value;
      
      // Parse JSON arrays/objects
      if (typeof value === 'string' && ((value.startsWith('[') && value.endsWith(']')) || 
          (value.startsWith('{') && value.endsWith('}')))) {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string if JSON parse fails
        }
      }
      
      // Parse booleans
      if (parsedValue === 'true') parsedValue = true;
      if (parsedValue === 'false') parsedValue = false;
      
      // Parse numbers for numeric fields
      if (['prepTime', 'cookTime', 'servings'].includes(header) && typeof parsedValue === 'string') {
        const numValue = parseFloat(parsedValue);
        if (!isNaN(numValue)) parsedValue = numValue;
      }
      
      record[header] = parsedValue;
    }
    
    // Validate record has UUID
    if (uuid) {
      records.push(record as UpdateRecord);
    } else {
      console.warn(`Row ${i + 1} skipped: missing UUID value`);
    }
  }

  return records;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// PUT - Bulk update with JSON payload (UUID only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = ((session.user as any).role || '').toLowerCase();
    if (!['admin', 'dietitian', 'health_counselor'].includes(userRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { records, reason } = body as { records: UpdateRecord[]; reason?: string };

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Records array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all records have UUID
    const invalidRecords = records.filter(r => !r.uuid);
    if (invalidRecords.length > 0) {
      return NextResponse.json(
        { success: false, error: `${invalidRecords.length} records missing required uuid field` },
        { status: 400 }
      );
    }

    await connectDB();
    
    const results: UpdateResult[] = [];
    let completedCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;

    for (const record of records) {
      const { uuid, ...updateData } = record;
      
      try {
        // Find recipe by UUID ONLY (this is the single source of truth)
        const uuidStr = String(uuid);
        const uuidNum = isNaN(Number(uuid)) ? null : Number(uuid);
        
        const recipe = await Recipe.findOne({
          $or: [
            { uuid: uuidStr },
            ...(uuidNum !== null ? [{ uuid: uuidNum }] : [])
          ]
        });
        
        if (!recipe) {
          results.push({
            uuid,
            status: 'cancelled',
            message: `Recipe not found with UUID: ${uuid}`,
            errorCode: 'UUID_NOT_FOUND'
          });
          cancelledCount++;
          continue;
        }

        // Track changes
        const changedFields: string[] = [];
        const updatePayload: Record<string, any> = {};

        for (const [key, rawValue] of Object.entries(updateData)) {
          // Skip non-updatable fields
          if (!UPDATABLE_FIELDS.includes(key)) continue;
          
          const oldValue = (recipe as any)[key];
          
          // Parse and normalize field values
          let newValue = parsePythonStyleArray(rawValue);
          newValue = normalizeFieldValue(key, newValue);
          
          // Only include if value actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push(key);
            updatePayload[key] = newValue;
          }
        }

        // If no changes detected, skip
        if (changedFields.length === 0) {
          results.push({
            uuid,
            status: 'cancelled',
            message: 'No field changes detected',
            errorCode: 'NO_CHANGES'
          });
          cancelledCount++;
          continue;
        }

        // Add timestamp for tracking
        updatePayload.updatedAt = new Date();

        // Update recipe using $set (replaces fields completely, doesn't append)
        const updated = await Recipe.findByIdAndUpdate(
          recipe._id,
          { $set: updatePayload },
          { new: true, runValidators: true }
        );

        results.push({
          uuid,
          status: 'completed',
          message: `Successfully updated ${changedFields.length} field(s)`,
          changedFields,
          changedFieldsCount: changedFields.length
        });
        completedCount++;

      } catch (error: any) {
        results.push({
          uuid,
          status: 'failed',
          message: 'Update operation failed',
          errorDetails: error.message || 'Unknown error',
          errorCode: error.code || 'UPDATE_ERROR'
        });
        failedCount++;
      }
    }

    // Clear recipe cache for immediate reflection
    clearCacheByTag('recipes');

    return NextResponse.json({
      success: true,
      message: 'Bulk update operation completed',
      summary: {
        total: records.length,
        completed: completedCount,
        failed: failedCount,
        cancelled: cancelledCount
      },
      results
    });

  } catch (error: any) {
    console.error('[RecipeBulkUpdate] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Bulk update failed' },
      { status: 500 }
    );
  }
}

// POST - Bulk update with CSV file upload (UUID only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = ((session.user as any).role || '').toLowerCase();
    if (!['admin', 'dietitian', 'health_counselor'].includes(userRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const reason = formData.get('reason') as string || 'Bulk update via CSV';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are accepted' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const csvContent = await file.text();
    let records: UpdateRecord[];
    
    try {
      records = parseCSV(csvContent);
    } catch (parseError: any) {
      return NextResponse.json(
        { success: false, error: `CSV parse error: ${parseError.message}` },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid records with UUID found in CSV' },
        { status: 400 }
      );
    }

    await connectDB();

    const results: UpdateResult[] = [];
    let completedCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;

    for (const record of records) {
      const { uuid, ...updateData } = record;
      
      try {
        // Find recipe by UUID ONLY (this is the single source of truth)
        const uuidStr = String(uuid);
        const uuidNum = isNaN(Number(uuid)) ? null : Number(uuid);
        
        const recipe = await Recipe.findOne({
          $or: [
            { uuid: uuidStr },
            ...(uuidNum !== null ? [{ uuid: uuidNum }] : [])
          ]
        });
        
        if (!recipe) {
          results.push({
            uuid,
            status: 'cancelled',
            message: `Recipe not found with UUID: ${uuid}`,
            errorCode: 'UUID_NOT_FOUND'
          });
          cancelledCount++;
          continue;
        }

        // Track changes
        const changedFields: string[] = [];
        const updatePayload: Record<string, any> = {};

        for (const [key, rawValue] of Object.entries(updateData)) {
          if (!UPDATABLE_FIELDS.includes(key)) continue;
          
          const oldValue = (recipe as any)[key];
          
          // Parse and normalize field values
          let newValue = parsePythonStyleArray(rawValue);
          newValue = normalizeFieldValue(key, newValue);
          
          // Only include if value actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push(key);
            updatePayload[key] = newValue;
          }
        }

        // If no changes detected, skip
        if (changedFields.length === 0) {
          results.push({
            uuid,
            status: 'cancelled',
            message: 'No field changes detected',
            errorCode: 'NO_CHANGES'
          });
          cancelledCount++;
          continue;
        }

        // Add timestamp for tracking
        updatePayload.updatedAt = new Date();

        // Update recipe using $set (replaces fields completely, doesn't append)
        const updated = await Recipe.findByIdAndUpdate(
          recipe._id,
          { $set: updatePayload },
          { new: true, runValidators: true }
        );

        results.push({
          uuid,
          status: 'completed',
          message: `Successfully updated ${changedFields.length} field(s)`,
          changedFields,
          changedFieldsCount: changedFields.length
        });
        completedCount++;

      } catch (error: any) {
        results.push({
          uuid,
          status: 'failed',
          message: 'Update operation failed',
          errorDetails: error.message || 'Unknown error',
          errorCode: error.code || 'UPDATE_ERROR'
        });
        failedCount++;
      }
    }

    // Clear recipe cache for immediate reflection
    clearCacheByTag('recipes');

    return NextResponse.json({
      success: true,
      message: 'CSV bulk update operation completed',
      fileName: file.name,
      summary: {
        total: records.length,
        completed: completedCount,
        failed: failedCount,
        cancelled: cancelledCount
      },
      results
    });

  } catch (error: any) {
    console.error('[RecipeBulkUpdate CSV] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CSV bulk update failed' },
      { status: 500 }
    );
  }
}

// GET - Get template info and sample CSV format
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (format === 'csv') {
      // Return sample CSV template
      const csvHeader = 'uuid,name,description,prepTime,cookTime,servings,difficulty,isPublic,isPremium,tags';
      const csvSample = '10,"Updated Recipe Name","Updated description",15,30,4,easy,true,false,"[""healthy"",""quick""]"';
      const csvContent = `${csvHeader}\n${csvSample}`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="recipe_bulk_update_template.csv"'
        }
      });
    }

    return NextResponse.json({
      success: true,
      instructions: 'Upload a CSV file with a "uuid" column to identify recipes for updating.',
      requiredField: 'uuid (string or numeric - used to locate recipes)',
      identificationMethod: 'UUID is the ONLY accepted identifier for recipe lookups',
      updateMode: 'Updates only - no new recipes are created',
      operationMode: '$set operations used to replace field values completely',
      updatableFields: UPDATABLE_FIELDS,
      sampleCSV: {
        headers: ['uuid', 'name', 'description', 'prepTime', 'cookTime', 'difficulty', 'isPublic', 'tags'],
        sampleRow: ['10', 'Updated Recipe Name', 'New description', '15', '30', 'easy', 'true', '["healthy","quick"]']
      },
      notes: [
        'Use "uuid" column to identify the recipe to update (REQUIRED - only accepted identifier)',
        'Only include columns for fields you want to change',
        'Arrays (like tags, ingredients) should be JSON formatted',
        'Boolean values: use true/false or TRUE/FALSE or 1/0',
        'Numeric values: use standard numbers (no quotes)',
        'Records without UUID will be skipped and logged',
        'If UUID does not match any recipe, that row is marked as "cancelled"',
        'Updates reflect immediately across all dashboards and APIs',
        'Use $set operations - arrays are completely replaced (not appended)',
        'All updates include updatedAt timestamp'
      ],
      exampleRequests: {
        putMethod: {
          endpoint: 'PUT /api/admin/recipes/bulk-update',
          payload: {
            records: [
              { uuid: '10', name: 'Updated Name', prepTime: 20 },
              { uuid: '15', description: 'New description', isPublic: true }
            ],
            reason: 'Admin bulk update'
          }
        },
        postMethod: {
          endpoint: 'POST /api/admin/recipes/bulk-update',
          description: 'Upload CSV file with form-data',
          formData: {
            file: 'recipe_updates.csv',
            reason: 'Admin bulk update (optional)'
          }
        }
      },
      responseStatuses: {
        completed: 'Recipe successfully updated',
        cancelled: 'Update skipped - no recipe found with UUID or no field changes',
        failed: 'Update operation encountered an error'
      }
    });

  } catch (error: any) {
    console.error('[RecipeBulkUpdate] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get template info' },
      { status: 500 }
    );
  }
}
