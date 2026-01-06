import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

// GET /api/debug/check-dietitian - Check if specific dietitian exists
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const dietitianId = '691d925d1a6a3624fce60a77';
    
    // Check if the dietitian exists
    const dietitian = await User.findById(dietitianId);
    
    // Check first client with assignedDietitian
    const firstClient = await User.findOne({ 
      role: 'client',
      assignedDietitian: { $ne: null }
    }).populate('assignedDietitian', 'firstName lastName email avatar');
    
    // Check all clients with assignedDietitian set
    const clientsWithAssignment = await User.find({
      role: 'client',
      assignedDietitian: { $ne: null }
    }).select('firstName lastName assignedDietitian');
    
    return NextResponse.json({
      dietitianExists: !!dietitian,
      dietitianData: dietitian ? {
        _id: dietitian._id,
        firstName: dietitian.firstName,
        lastName: dietitian.lastName,
        email: dietitian.email,
        role: dietitian.role
      } : null,
      firstClient: firstClient ? {
        firstName: firstClient.firstName,
        lastName: firstClient.lastName,
        assignedDietitian: firstClient.assignedDietitian
      } : null,
      clientsWithAssignmentCount: clientsWithAssignment.length,
      clientsWithAssignmentSample: clientsWithAssignment.slice(0, 3)
    });
  } catch (error) {
    console.error('Error checking dietitian:', error);
    return NextResponse.json(
      { error: 'Failed to check dietitian', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
