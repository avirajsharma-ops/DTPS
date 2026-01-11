import { NextResponse } from 'next/server';
import connectDB, { checkDBHealth, getConnectionStats } from '@/lib/db/connection';
import mongoose from 'mongoose';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connection with health utility
    const dbHealth = await checkDBHealth();
    const stats = getConnectionStats();
    
    const responseTime = Date.now() - startTime;
    
    if (!dbHealth.healthy) {
      return NextResponse.json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: dbHealth.error,
        connectionStats: stats,
        responseTimeMs: responseTime,
        version: process.env.npm_package_version || '1.0.0'
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      connectionStats: {
        readyState: stats.readyState,
        poolSize: mongoose.connection.db ? 'active' : 'initializing',
      },
      responseTimeMs: responseTime,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message || 'Database connection failed',
      responseTimeMs: responseTime,
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 500 });
  }
}
