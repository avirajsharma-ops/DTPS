import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import mongoose from 'mongoose';

// Notification model (inline since it might not exist)
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['meal', 'appointment', 'progress', 'message', 'reminder', 'system'],
    default: 'system'
  },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

// GET /api/client/notifications/unread-count - Get count of unread notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const count = await Notification.countDocuments({
      userId: session.user.id,
      read: false
    });

    return NextResponse.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Error fetching unread notifications count:', error);
    return NextResponse.json({
      success: true,
      count: 0
    });
  }
}
