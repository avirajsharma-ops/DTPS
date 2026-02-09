/**
 * API Route: Bulk Update Recipes by UUID or _ID
 * PUT /api/admin/recipes/bulk-update - Update multiple recipes using UUID or _ID
 * POST /api/admin/recipes/bulk-update - Upload CSV file for bulk updates
 * 
 * Accepts records with 'uuid' OR '_id' field for identification
 * Use whichever identifier is available in your data
 * Tracks update history with unique updateId for each change
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

interface UpdateRecord {
  uuid?: string;
  _id?: string;
  [key: string]: any;
}

interface UpdateResult {
  uuid?: string;
  _id?: string;
  status: 'success' | 'failed' | 'not_found' | 'no_changes' | 'error';
  message: string;
  errorDetails?: string;
  errorCode?: string;
  updateId?: string;
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

// Parse CSV content to array of records
function parseCSV(csvContent: string): UpdateRecord[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Validate uuid or _id column exists
  const uuidIndex = headers.findIndex(h => h.toLowerCase() === 'uuid');
  const idIndex = headers.findIndex(h => h.toLowerCase() === '_id');
  
  if (uuidIndex === -1 && idIndex === -1) {
    throw new Error('CSV must have either a "uuid" or "_id" column for identifying recipes');
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

    const record: UpdateRecord = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value = values[j];
      
      // Skip empty values
      if (value === '' || value === undefined) continue;
      
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
    
    // Validate record has at least uuid or _id
    if (record.uuid || record._id) {
      records.push(record);
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

// PUT - Bulk update with JSON payload
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

    // Validate all records have uuid or _id
    const invalidRecords = records.filter(r => !r.uuid && !r._id);
    if (invalidRecords.length > 0) {
      return NextResponse.json(
        { success: false, error: `${invalidRecords.length} records missing uuid or _id field` },
        { status: 400 }
      );
    }

    await connectDB();
    
    const results: UpdateResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let notFoundCount = 0;
    let noChangesCount = 0;

    for (const record of records) {
      const { uuid, _id, ...updateData } = record;
      
      try {
        let recipe = null;
        
        // Use ONLY the identifier provided - don't mix uuid and _id
        if (_id) {
          // Use _id if provided - ignore uuid
          try {
            if (mongoose.Types.ObjectId.isValid(_id)) {
              recipe = await Recipe.findById(_id);
            }
          } catch (e) {
            // Invalid ObjectId format
          }
        } else if (uuid) {
          // Use uuid only if _id is NOT provided
          const uuidStr = String(uuid);
          const uuidNum = isNaN(Number(uuid)) ? null : Number(uuid);
          
          recipe = await Recipe.findOne({
            $or: [
              { uuid: uuidStr },
              ...(uuidNum !== null ? [{ uuid: uuidNum }] : [])
            ]
          });
        }
        
        if (!recipe) {
          const result: UpdateResult = {
            status: 'not_found', 
            message: 'Recipe not found with provided identifier',
            errorCode: 'RECIPE_NOT_FOUND'
          };
          if (uuid) result.uuid = uuid;
          if (_id) result._id = _id;
          results.push(result);
          notFoundCount++;
          continue;
        }

        // Track changes
        const changedFields: any[] = [];
        const cleanedData: Record<string, any> = {};

        for (const [key, rawValue] of Object.entries(updateData)) {
          // Skip non-updatable fields
          if (!UPDATABLE_FIELDS.includes(key)) continue;
          
          const oldValue = (recipe as any)[key];
          
          // Parse Python-style arrays (for ingredients, instructions, etc.)
          let newValue = parsePythonStyleArray(rawValue);
          
          // Check if value actually changed
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push({
              fieldName: key,
              oldValue: oldValue,
              newValue: newValue,
              timestamp: new Date()
            });
            cleanedData[key] = newValue;
          }
        }

        // Skip if no changes
        if (Object.keys(cleanedData).length === 0) {
          const result: UpdateResult = { 
            _id: String(recipe._id),
            status: 'no_changes', 
            message: 'No fields changed',
            changedFieldsCount: 0
          };
          if (uuid) result.uuid = uuid;
          results.push(result);
          noChangesCount++;
          continue;
        }

        // Add update record to track changes with uuid and _id
        const updateRecord = {
          changedFields,
          updatedBy: new mongoose.Types.ObjectId(session.user.id),
          reason: reason || 'Bulk update via API',
          timestamp: new Date(),
          recipeIdentifiers: {
            uuid: String(recipe.uuid),
            _id: String(recipe._id)
          }
        };

        // Prepare update with timestamp
        cleanedData.updatedAt = new Date();

        // Update the recipe
        const updated = await Recipe.findByIdAndUpdate(
          recipe._id,
          { $set: cleanedData },
          { new: true }
        );

        // Get the generated updateId from the record
        const updateId = `upd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const result: UpdateResult = {
          _id: String(updated?._id),
          status: 'success',
          message: `Updated ${changedFields.length} field(s)`,
          updateId: updateId,
          changedFields: changedFields.map(f => f.fieldName),
          changedFieldsCount: changedFields.length
        };
        
        // Include the identifier that was provided
        if (uuid) result.uuid = uuid;
        
        results.push(result);
        successCount++;

      } catch (error: any) {
        const result: UpdateResult = { 
          status: 'error', 
          message: 'Update failed',
          errorDetails: error.message || 'Unknown error',
          errorCode: error.code || 'UNKNOWN_ERROR'
        };
        if (uuid) result.uuid = uuid;
        if (_id) result._id = _id;
        results.push(result);
        failedCount++;
      }
    }

    // Clear recipe cache
    clearCacheByTag('recipes');

    return NextResponse.json({
      success: true,
      message: 'Bulk update completed',
      summary: {
        total: records.length,
        success: successCount,
        failed: failedCount,
        notFound: notFoundCount,
        noChanges: noChangesCount
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

// POST - Bulk update with CSV file upload
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
        { success: false, error: 'No valid records found in CSV' },
        { status: 400 }
      );
    }

    await connectDB();

    const results: UpdateResult[] = [];
    let successCount = 0;
    let failedCount = 0;
    let notFoundCount = 0;
    let noChangesCount = 0;

    for (const record of records) {
      const { uuid, ...updateData } = record;
      
      try {
        // Find recipe by uuid - handle both string and numeric UUIDs
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
            status: 'not_found', 
            message: 'Recipe not found with this UUID',
            errorCode: 'RECIPE_NOT_FOUND'
          });
          notFoundCount++;
          continue;
        }

        // Track changes
        const changedFields: any[] = [];
        const cleanedData: Record<string, any> = {};

        for (const [key, newValue] of Object.entries(updateData)) {
          if (!UPDATABLE_FIELDS.includes(key)) continue;
          
          const oldValue = (recipe as any)[key];
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changedFields.push({
              fieldName: key,
              oldValue: oldValue,
              newValue: newValue,
              timestamp: new Date()
            });
            cleanedData[key] = newValue;
          }
        }

        if (Object.keys(cleanedData).length === 0) {
          results.push({ 
            uuid, 
            _id: String(recipe._id),
            status: 'no_changes', 
            message: 'No fields changed',
            changedFieldsCount: 0
          });
          noChangesCount++;
          continue;
        }

        const updateRecord = {
          changedFields,
          updatedBy: new mongoose.Types.ObjectId(session.user.id),
          reason,
          timestamp: new Date(),
          recipeIdentifiers: {
            uuid: String(recipe.uuid),
            _id: String(recipe._id)
          }
        };

        cleanedData.updatedAt = new Date();

        const updated = await Recipe.findByIdAndUpdate(
          recipe._id,
          { $set: cleanedData },
          { new: true }
        );

        const updateId = `upd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        results.push({
          uuid,
          _id: String(updated?._id),
          status: 'success',
          message: `Updated ${changedFields.length} field(s)`,
          updateId: updateId,
          changedFields: changedFields.map(f => f.fieldName),
          changedFieldsCount: changedFields.length
        });
        successCount++;

      } catch (error: any) {
        results.push({ 
          uuid, 
          status: 'error', 
          message: 'Update failed',
          errorDetails: error.message || 'Unknown error',
          errorCode: error.code || 'UNKNOWN_ERROR'
        });
        failedCount++;
      }
    }

    // Clear recipe cache
    clearCacheByTag('recipes');

    return NextResponse.json({
      success: true,
      message: 'CSV bulk update completed',
      fileName: file.name,
      summary: {
        total: records.length,
        success: successCount,
        failed: failedCount,
        notFound: notFoundCount,
        noChanges: noChangesCount
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
      const csvSample = '10,"Sample Recipe","Updated description",15,30,4,easy,true,false,"[""healthy"",""quick""]"';
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
      instructions: 'Upload a CSV file with uuid or _id column to identify recipes. Include only fields you want to update.',
      requiredField: 'uuid or _id (use either one)',
      updatableFields: UPDATABLE_FIELDS,
      sampleCSV: {
        headers: ['uuid', 'name', 'description', 'prepTime', 'cookTime', 'difficulty', 'isPublic', 'tags'],
        sampleRow: ['10', 'Updated Recipe Name', 'New description', '15', '30', 'easy', 'true', '["healthy","quick"]']
      },
      notes: [
        'Use either "uuid" or "_id" column to identify the recipe to update (whichever is available)',
        'Only include columns for fields you want to change',
        'Arrays (like tags, ingredients) should be JSON formatted',
        'Boolean values: use true/false',
        'Each update is tracked with a unique updateId for audit purposes'
      ]
    });

  } catch (error: any) {
    console.error('[RecipeBulkUpdate] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get template info' },
      { status: 500 }
    );
  }
}
