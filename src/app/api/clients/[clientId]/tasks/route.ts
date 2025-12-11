import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import Task from '@/lib/db/models/Task';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { clientId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: any = { client: clientId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const tasks = await Task.find(query)
      .populate('client', 'firstName lastName email')
      .populate('dietitian', 'firstName lastName email')
      .populate('tags', 'name color icon')
      .sort({ startDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { clientId } = await params;
    const body = await req.json();

    // Validate required fields
    if (!body.taskType || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure title is always set - use taskType as fallback if title is not provided
    const taskTitle = body.title && body.title.trim() ? body.title.trim() : body.taskType;

    // Create new task
    const task = new Task({
      ...body,
      title: taskTitle,
      client: clientId,
      dietitian: session.user?.id,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate)
    });

    await task.save();

    // Populate references
    await task.populate('client', 'firstName lastName email');
    await task.populate('dietitian', 'firstName lastName email');
    await task.populate('tags', 'name color icon');

    return NextResponse.json(
      {
        success: true,
        message: 'Task created successfully',
        task
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}
