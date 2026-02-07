/**
 * API Route: Data Export
 * GET /api/admin/data/export - Export model data to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import { modelRegistry } from '@/lib/import';

export const runtime = 'nodejs';

// Helper to convert data to CSV
function convertToCSV(data: any[], fields: string[]): string {
  if (!data || data.length === 0) return '';

  // Header row
  const header = fields.join(',');

  // Data rows
  const rows = data.map(item => {
    return fields.map(field => {
      let value = getNestedValue(item, field);
      
      // Handle different types
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        if (Array.isArray(value)) {
          return `"${value.join('; ')}"`;
        }
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      return String(value);
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

export async function GET(request: NextRequest) {
  try {
    // Auth check - admin only
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get('model');
    const format = searchParams.get('format') || 'csv';
    const download = searchParams.get('download') === 'true';

    await connectDB();

    // If no model specified, return list of available models
    if (!modelName) {
      // Get ALL models, not just importable ones
      const allModels = modelRegistry.getAll();
      
      // Get counts for each model
      const modelsWithCounts = await Promise.all(
        allModels.map(async (m) => {
          let count = 0;
          try {
            count = await m.model.countDocuments();
          } catch (e) {
            console.error(`Error counting ${m.name}:`, e);
          }
          return {
            name: m.name,
            displayName: m.displayName,
            description: m.description,
            fieldCount: m.fields.filter(f => 
              !f.path.startsWith('_') && 
              f.path !== 'createdAt' && 
              f.path !== 'updatedAt'
            ).length,
            requiredFields: m.requiredFields,
            documentCount: count,
            fields: m.fields.filter(f => !f.path.startsWith('_')).map(f => ({
              path: f.path,
              type: f.type,
              required: f.required
            }))
          };
        })
      );

      return NextResponse.json({
        success: true,
        models: modelsWithCounts
      });
    }

    // Get the model
    const registeredModel = modelRegistry.get(modelName);
    if (!registeredModel) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    // Fetch all data from the model
    const data = await registeredModel.model.find({}).lean();

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        modelName,
        count: 0,
        message: 'No data found for this model'
      });
    }

    // Get field paths for export
    const fields = registeredModel.fields
      .filter(f => !f.path.startsWith('_') && !f.isNested)
      .map(f => f.path);

    // Add common fields
    if (!fields.includes('_id')) fields.unshift('_id');

    if (download) {
      if (format === 'json') {
        const jsonContent = JSON.stringify(data, null, 2);
        return new NextResponse(jsonContent, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${modelName}_export_${new Date().toISOString().split('T')[0]}.json"`
          }
        });
      } else {
        const csvContent = convertToCSV(data, fields);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${modelName}_export_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }
    }

    // Return data preview
    return NextResponse.json({
      success: true,
      modelName,
      displayName: registeredModel.displayName,
      count: data.length,
      fields,
      preview: data.slice(0, 10) // First 10 records as preview
    });

  } catch (error: any) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
