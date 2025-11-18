import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Check database connection
    await connectDB();
    await mongoose.connection.db?.admin().ping();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    }, { status: 500 });
  }
}
