/**
 * API Route: Data Search & Update
 * GET /api/admin/data/records - Search records
 * PUT /api/admin/data/records - Update record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import { modelRegistry } from '@/lib/import';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

// GET - Search records
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
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const recordId = searchParams.get('id');

    await connectDB();

    if (!modelName) {
      return NextResponse.json(
        { success: false, error: 'Model name is required' },
        { status: 400 }
      );
    }

    const registeredModel = modelRegistry.get(modelName);
    if (!registeredModel) {
      return NextResponse.json(
        { success: false, error: 'Model not found' },
        { status: 404 }
      );
    }

    // If specific record ID provided, fetch that record with related data
    if (recordId) {
      const record = await registeredModel.model.findById(recordId).lean();
      
      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Record not found' },
          { status: 404 }
        );
      }

      // Fetch related data based on model type
      let relatedData: any = {};
      
      if (modelName === 'User') {
        // Fetch related data for users
        const LifestyleInfo = mongoose.models.LifestyleInfo || require('@/lib/db/models/LifestyleInfo').default;
        const MedicalInfo = mongoose.models.MedicalInfo || require('@/lib/db/models/MedicalInfo').default;
        const DietaryRecall = mongoose.models.DietaryRecall || require('@/lib/db/models/DietaryRecall').default;
        const ClientMealPlan = mongoose.models.ClientMealPlan || require('@/lib/db/models/ClientMealPlan').default;
        const Task = mongoose.models.Task || require('@/lib/db/models/Task').default;
        const Payment = mongoose.models.Payment || require('@/lib/db/models/Payment').default;
        const Appointment = mongoose.models.Appointment || require('@/lib/db/models/Appointment').default;
        
        const [lifestyle, medical, dietaryRecall, mealPlans, tasks, payments, appointments] = await Promise.all([
          LifestyleInfo.findOne({ userId: recordId }).lean().catch(() => null),
          MedicalInfo.findOne({ userId: recordId }).lean().catch(() => null),
          DietaryRecall.findOne({ userId: recordId }).lean().catch(() => null),
          ClientMealPlan.find({ client: recordId }).limit(5).lean().catch(() => []),
          Task.find({ $or: [{ assignedTo: recordId }, { createdBy: recordId }] }).limit(10).lean().catch(() => []),
          Payment.find({ $or: [{ client: recordId }, { user: recordId }] }).limit(10).lean().catch(() => []),
          Appointment.find({ $or: [{ client: recordId }, { dietitian: recordId }] }).limit(10).lean().catch(() => [])
        ]);

        relatedData = {
          lifestyleInfo: lifestyle,
          medicalInfo: medical,
          dietaryRecall,
          recentMealPlans: mealPlans,
          recentTasks: tasks,
          recentPayments: payments,
          recentAppointments: appointments
        };
      }

      return NextResponse.json({
        success: true,
        record,
        relatedData,
        fields: registeredModel.fields.filter(f => !f.path.startsWith('_')).map(f => ({
          path: f.path,
          type: f.type,
          required: f.required,
          enum: f.enum
        }))
      });
    }

    // Build search query
    let query: any = {};
    
    if (search) {
      // Search across multiple string fields
      const searchableFields = registeredModel.fields
        .filter(f => f.type === 'String' && !f.path.startsWith('_'))
        .map(f => f.path);

      if (searchableFields.length > 0) {
        query.$or = searchableFields.map(field => ({
          [field]: { $regex: search, $options: 'i' }
        }));
      }
    }

    // Get total count
    const total = await registeredModel.model.countDocuments(query);

    // Fetch paginated results
    const records = await registeredModel.model
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      modelName,
      displayName: registeredModel.displayName,
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      fields: registeredModel.fields.filter(f => !f.path.startsWith('_')).map(f => ({
        path: f.path,
        type: f.type,
        required: f.required
      }))
    });

  } catch (error: any) {
    console.error('Data search error:', error);
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

// PUT - Update record
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { modelName, recordId, data, relatedModel, relatedData } = body;

    if (!modelName || !recordId) {
      return NextResponse.json(
        { success: false, error: 'Model name and record ID are required' },
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

    // If updating related data
    if (relatedModel && relatedData) {
      let RelatedModelClass;
      
      switch (relatedModel) {
        case 'LifestyleInfo':
          RelatedModelClass = mongoose.models.LifestyleInfo || require('@/lib/db/models/LifestyleInfo').default;
          break;
        case 'MedicalInfo':
          RelatedModelClass = mongoose.models.MedicalInfo || require('@/lib/db/models/MedicalInfo').default;
          break;
        case 'DietaryRecall':
          RelatedModelClass = mongoose.models.DietaryRecall || require('@/lib/db/models/DietaryRecall').default;
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid related model' },
            { status: 400 }
          );
      }

      const updatedRelated = await RelatedModelClass.findOneAndUpdate(
        { userId: recordId },
        { $set: relatedData },
        { new: true, upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: `${relatedModel} updated successfully`,
        data: updatedRelated
      });
    }

    // Update main record
    // Remove fields that shouldn't be updated
    const updateData = { ...data };
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    updateData.updatedAt = new Date();

    const updatedRecord = await registeredModel.model.findByIdAndUpdate(
      recordId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record updated successfully',
      record: updatedRecord
    });

  } catch (error: any) {
    console.error('Data update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update record',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
