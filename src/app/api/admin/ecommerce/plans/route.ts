import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import EcommercePlan from '@/lib/db/models/EcommercePlan';

const isAdmin = (session: any) => session?.user?.role === 'admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const query: any = {};
    if (status && status !== 'all') query.isActive = status === 'active';
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    const plans = await EcommercePlan.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching ecommerce plans:', error);
    return NextResponse.json({ error: 'Failed to fetch ecommerce plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const plan = await EcommercePlan.create(body);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error creating ecommerce plan:', error);
    return NextResponse.json({ error: 'Failed to create ecommerce plan' }, { status: 500 });
  }
}
