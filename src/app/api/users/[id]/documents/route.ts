import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { File as FileModel } from '@/lib/db/models/File';
import { UserRole } from '@/types';
import { logHistoryServer } from '@/lib/server/history';

// POST /api/users/[id]/documents - Upload document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const file = formData.get('file') as File;

    if (!type || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and PDFs are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to base64 and save to MongoDB
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Save file to File collection in MongoDB
    const savedFile = await FileModel.create({
      filename: `${Date.now()}-${file.name}`,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64Data,
      type: 'document',
      uploadedBy: session.user.id
    });

    // Generate the API URL for accessing this file
    const fileUrl = `/api/files/${savedFile._id}`;

    // Update user document
    const user = await User.findById(id);
    if (!user) {
      // Clean up the saved file if user not found
      await FileModel.findByIdAndDelete(savedFile._id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isSelf = session.user.id === id;
    const isDietitianAssigned =
      session.user.role === UserRole.DIETITIAN &&
      (user.assignedDietitian?.toString() === session.user.id ||
       user.assignedDietitians?.some((d: { toString: () => string }) => d.toString() === session.user.id));

    if (!isAdmin && !isSelf && !isDietitianAssigned) {
      // Clean up the saved file if not authorized
      await FileModel.findByIdAndDelete(savedFile._id);
      return NextResponse.json(
        { error: 'Forbidden: You cannot upload documents for this user' },
        { status: 403 }
      );
    }

    user.documents = user.documents || [];
    user.documents.push({
      type,
      fileName: file.name,
      filePath: fileUrl,
      uploadedAt: new Date(),
    });
    await user.save();

    // Log history for document upload
    await logHistoryServer({
      userId: id,
      action: 'upload',
      category: 'document',
      description: `Document uploaded: ${file.name} (${type})`,
      performedById: session.user.id,
      metadata: {
        fileName: file.name,
        fileType: type,
        fileSize: file.size,
        mimeType: file.type,
        fileUrl
      }
    });

    return NextResponse.json({
      message: 'Document uploaded successfully',
      documents: user.documents
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// GET /api/users/[id]/documents - Get all documents for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const user = await User.findById(id).select('documents');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ documents: user.documents || [] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
