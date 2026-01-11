import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import Tag from '@/lib/db/models/Tag';
import { withConditionalCache, errorResponse } from '@/lib/api/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.role?.toLowerCase().includes('admin')) {
      return errorResponse('Unauthorized. Admin access required.', 403, 'ADMIN_REQUIRED');
    }

    await connectDB();

    // Get all tags with sorting
    const tags = await Tag.find({}).sort({ name: 1 }).lean();

    // Use conditional caching for tags (relatively static data)
    return withConditionalCache(tags, req, {
      maxAge: 60, // Cache for 60 seconds
      private: true,
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return errorResponse(
      error.message || 'Failed to fetch tags',
      500,
      'FETCH_ERROR'
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description = '', color = '#3B82F6', icon = 'tag' } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: name.trim() });
    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      );
    }

    // Create new tag
    const newTag = new Tag({
      name: name.trim(),
      description: description.trim(),
      color,
      icon
    });

    await newTag.save();

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
