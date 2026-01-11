import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import ClientMealPlan from '@/lib/db/models/ClientMealPlan';
import Payment from '@/lib/db/models/Payment';
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/admin/clients/[clientId] - Get full client details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (!userRole || !userRole.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();
    const { clientId } = await params;

    const client = await withCache(
      `admin:clients:clientId:${JSON.stringify(clientId)
      .select('-password')
      .populate('assignedDietitian', 'firstName lastName email avatar phone specializations')
      .populate('assignedDietitians', 'firstName lastName email avatar phone specializations')
      .populate('assignedHealthCounselor', 'firstName lastName email avatar phone')
      .populate('assignedHealthCounselors', 'firstName lastName email avatar phone')
      .populate('tags')}`,
      async () => await User.findById(clientId)
      .select('-password')
      .populate('assignedDietitian', 'firstName lastName email avatar phone specializations')
      .populate('assignedDietitians', 'firstName lastName email avatar phone specializations')
      .populate('assignedHealthCounselor', 'firstName lastName email avatar phone')
      .populate('assignedHealthCounselors', 'firstName lastName email avatar phone')
      .populate('tags').lean(),
      { ttl: 120000, tags: ['admin'] }
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get meal plans
    const mealPlans = await withCache(
      `admin:clients:clientId:${JSON.stringify({ clientId })
      .populate('templateId', 'name category')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10)}`,
      async () => await ClientMealPlan.find({ clientId })
      .populate('templateId', 'name category')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10).lean(),
      { ttl: 120000, tags: ['admin'] }
    );

    // Get payments
    const payments = await withCache(
      `admin:clients:clientId:${JSON.stringify({ userId: clientId })
      .sort({ createdAt: -1 })
      .limit(20)}`,
      async () => await Payment.find({ userId: clientId })
      .sort({ createdAt: -1 })
      .limit(20).lean(),
      { ttl: 120000, tags: ['admin'] }
    );

    return NextResponse.json({
      client,
      mealPlans,
      payments
    });

  } catch (error) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
  }
}

// PUT /api/admin/clients/[clientId] - Update client details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (!userRole || !userRole.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();
    const { clientId } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const { password, _id, role, ...updateData } = body;

    const client = await User.findByIdAndUpdate(
      clientId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client, message: 'Client updated successfully' });

  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

// DELETE /api/admin/clients/[clientId] - Delete or deactivate client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (!userRole || !userRole.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'deactivate'; // 'deactivate' or 'delete'

    if (action === 'delete') {
      // Permanent delete - use with caution
      await User.findByIdAndDelete(clientId);
      return NextResponse.json({ message: 'Client deleted permanently' });
    } else {
      // Deactivate (soft delete)
      const client = await User.findByIdAndUpdate(
        clientId,
        { status: 'inactive' },
        { new: true }
      ).select('-password');

      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      return NextResponse.json({ client, message: 'Client deactivated successfully' });
    }

  } catch (error) {
    console.error('Error deleting/deactivating client:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
