import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import bcrypt from 'bcryptjs';

// POST /api/admin/users/[id]/password - Admin set/reset user password
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        // Only admin can access this endpoint
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { newPassword } = body;

        // Validate password
        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find the user
        const user = await User.findById(id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user with new password
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetTokenExpiry = null;

        await user.save();

        return NextResponse.json({
            success: true,
            message: `Password changed successfully for ${user.firstName} ${user.lastName}`,
        });

    } catch (error) {
        console.error('Error setting user password:', error);
        return NextResponse.json(
            { error: 'Failed to set password' },
            { status: 500 }
        );
    }
}
