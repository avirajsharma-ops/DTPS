/**
 * API Route: Bulk Update Records
 * PUT /api/admin/data/bulk-update - Update multiple records by _id
 * 
 * Accepts an array of records, each must have _id field
 * Updates fields based on the data provided in each record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import { modelRegistry } from '@/lib/import';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

interface UpdateRecord {
  _id: string;
  [key: string]: any;
}

interface UpdateError {
  id: string;
  error: string;
}

export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { modelName, records } = body as { modelName: string; records: UpdateRecord[] };

    // Validation
    if (!modelName) {
      return NextResponse.json(
        { success: false, error: 'Model name is required' },
        { status: 400 }
      );
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Records array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all records have _id
    const invalidRecords = records.filter(r => !r._id);
    if (invalidRecords.length > 0) {
      return NextResponse.json(
        { success: false, error: `${invalidRecords.length} records missing _id field` },
        { status: 400 }
      );
    }

    await connectDB();

    // Get the registered model
    const registeredModel = modelRegistry.get(modelName);
    if (!registeredModel) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    const Model = registeredModel.model;
    const schemaFields = registeredModel.fields.map(f => f.path);
    
    // Process updates
    let updatedCount = 0;
    let failedCount = 0;
    const errors: UpdateError[] = [];

    // Use bulk operations for efficiency
    const bulkOps = [];

    for (const record of records) {
      const { _id, ...updateData } = record;
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        errors.push({ id: _id, error: 'Invalid ObjectId format' });
        failedCount++;
        continue;
      }

      // Clean update data - only include fields that exist in schema
      const cleanedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updateData)) {
        // Skip internal fields
        if (key.startsWith('_') || key === 'createdAt' || key === '__v') {
          continue;
        }
        
        // Check if field exists in schema (case-insensitive)
        const schemaField = schemaFields.find(sf => 
          sf.toLowerCase() === key.toLowerCase()
        );
        
        if (schemaField) {
          // Handle special cases
          if (value === '' || value === null || value === 'null') {
            cleanedData[schemaField] = null;
          } else if (value === 'true' || value === true) {
            cleanedData[schemaField] = true;
          } else if (value === 'false' || value === false) {
            cleanedData[schemaField] = false;
          } else {
            cleanedData[schemaField] = value;
          }
        }
      }

      // Skip if no valid fields to update
      if (Object.keys(cleanedData).length === 0) {
        errors.push({ id: _id, error: 'No valid fields to update' });
        failedCount++;
        continue;
      }

      // Add updatedAt timestamp
      cleanedData.updatedAt = new Date();

      bulkOps.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(_id) },
          update: { $set: cleanedData }
        }
      });
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
      try {
        const result = await Model.bulkWrite(bulkOps, { ordered: false });
        updatedCount = result.modifiedCount;
        
        // Check for records that weren't found
        const notModified = bulkOps.length - result.modifiedCount - result.matchedCount + result.modifiedCount;
        if (notModified > 0) {
          // Some records might have had no changes
        }
        
        // Track records not found
        if (result.matchedCount < bulkOps.length) {
          const notFoundCount = bulkOps.length - result.matchedCount;
          failedCount += notFoundCount;
          errors.push({ 
            id: 'multiple', 
            error: `${notFoundCount} records not found in database` 
          });
        }
      } catch (bulkError: any) {
        // Handle bulk write errors
        if (bulkError.writeErrors) {
          for (const writeError of bulkError.writeErrors) {
            const failedId = records[writeError.index]?._id || 'unknown';
            errors.push({ id: failedId, error: writeError.errmsg || 'Write error' });
            failedCount++;
          }
          updatedCount = bulkError.result?.nModified || 0;
        } else {
          throw bulkError;
        }
      }
    }

    console.log(`[BulkUpdate] Model: ${modelName}, Updated: ${updatedCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      success: true,
      message: `Bulk update completed`,
      updated: updatedCount,
      failed: failedCount,
      total: records.length,
      errors: errors.slice(0, 50) // Limit errors to prevent huge response
    });

  } catch (error: any) {
    console.error('[BulkUpdate] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Bulk update failed',
        updated: 0,
        failed: 0,
        errors: [{ id: 'unknown', error: error.message || 'Server error' }]
      },
      { status: 500 }
    );
  }
}

// GET - Get bulk update template/info for a model
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get('model');

    if (!modelName) {
      return NextResponse.json(
        { success: false, error: 'Model name is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const registeredModel = modelRegistry.get(modelName);
    if (!registeredModel) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    // Get fields for template
    const fields = registeredModel.fields
      .filter(f => !f.path.startsWith('_') && f.path !== 'createdAt' && f.path !== '__v')
      .map(f => ({
        name: f.path,
        type: f.type,
        required: f.required
      }));

    return NextResponse.json({
      success: true,
      modelName,
      displayName: registeredModel.displayName,
      fields,
      requiredIdField: '_id',
      instructions: 'Upload a file with _id column and any fields you want to update. Only matching records will be updated.'
    });

  } catch (error: any) {
    console.error('[BulkUpdate] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get template info' },
      { status: 500 }
    );
  }
}
