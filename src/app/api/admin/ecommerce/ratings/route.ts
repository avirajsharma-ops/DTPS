import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import EcommerceRating from '@/lib/db/models/EcommerceRating';

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
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const ratings = await EcommerceRating.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Error fetching ecommerce ratings:', error);
    return NextResponse.json({ error: 'Failed to fetch ecommerce ratings' }, { status: 500 });
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

    const rating = await EcommerceRating.create(body);
    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Error creating ecommerce rating:', error);
    return NextResponse.json({ error: 'Failed to create ecommerce rating' }, { status: 500 });
  }
}
