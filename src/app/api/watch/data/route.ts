// API Route: Watch Health Data
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import { WatchService } from '@/watchconnectivity/backend/services/WatchService';

// GET /api/watch/data - Get watch health data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Range query
    if (startDateParam && endDateParam) {
      const watchHealthData = await WatchService.getWatchHealthDataRange(
        session.user.id,
        new Date(startDateParam),
        new Date(endDateParam)
      );
      
      return NextResponse.json({
        success: true,
        watchHealthData,
        watchDataCount: watchHealthData.length,
      });
    }
    
    // Single date query
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const watchHealthData = await WatchService.getWatchHealthData(session.user.id, targetDate);
    
    if (!watchHealthData) {
      return NextResponse.json({
        success: true,
        watchHealthData: null,
        message: 'No watch data for this date',
      });
    }
    
    return NextResponse.json({
      success: true,
      watchHealthData,
    });
  } catch (error) {
    console.error('Watch data fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watch data' },
      { status: 500 }
    );
  }
}

// POST /api/watch/data - Save watch health data (from native apps)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    const watchData = await req.json();
    
    // Validate required fields
    if (!watchData) {
      return NextResponse.json(
        { success: false, error: 'Watch data is required' },
        { status: 400 }
      );
    }
    
    const savedWatchData = await WatchService.saveWatchHealthData(
      session.user.id,
      watchData
    );
    
    return NextResponse.json({
      success: true,
      message: 'Watch data saved successfully',
      watchHealthData: savedWatchData,
    });
  } catch (error) {
    console.error('Watch data save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save watch data' },
      { status: 500 }
    );
  }
}
