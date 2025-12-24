import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import { File } from '@/lib/db/models/File';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getImageKit } from '@/lib/imagekit';
import { compressImageServer, serverCompressionPresets } from '@/lib/imageCompressionServer';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'avatar', 'document', 'recipe-image', 'message'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = {
      avatar: ['image/jpeg', 'image/png', 'image/webp'],
      document: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'recipe-image': ['image/jpeg', 'image/png', 'image/webp'],
      'message': ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'audio/mpeg', 'audio/wav', 'audio/webm', 'video/mp4', 'video/webm'],
      'note-attachment': ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/x-m4a', 'audio/aac'],
      'progress': ['image/jpeg', 'image/png', 'image/webp'],
      'progress-photo': ['image/jpeg', 'image/png', 'image/webp']
    };

    const maxSizes = {
      avatar: 5 * 1024 * 1024, // 5MB
      document: 10 * 1024 * 1024, // 10MB
      'recipe-image': 10 * 1024 * 1024, // 10MB
      'message': 25 * 1024 * 1024, // 25MB for messages (images, videos, audio)
      'note-attachment': 50 * 1024 * 1024, // 50MB for note attachments
      'progress': 10 * 1024 * 1024, // 10MB for progress photos
      'progress-photo': 10 * 1024 * 1024 // 10MB for progress photos
    };

    const fileType = type as keyof typeof allowedTypes;
    
    if (!allowedTypes[fileType]?.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    if (file.size > maxSizes[fileType]) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}.${fileExtension}`;

    // Convert file to buffer and then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // For avatar uploads, use ImageKit with compression
    if (fileType === 'avatar') {
      try {
        const ik = getImageKit();
        
        // Compress image before upload
        const compressedBase64 = await compressImageServer(buffer, serverCompressionPresets.avatar);
        
        const uploadResponse = await ik.upload({
          file: compressedBase64,
          fileName: `${session.user.id}-${fileName.replace(/\.[^/.]+$/, '.webp')}`,
          folder: '/profile',
        });

        // Save file reference to MongoDB
        const savedFile = await File.create({
          filename: fileName,
          originalName: file.name,
          mimeType: 'image/webp',
          size: file.size,
          data: compressedBase64,
          type: fileType,
          localPath: uploadResponse.url,
          imageKitFileId: uploadResponse.fileId,
          uploadedBy: session.user.id
        });

        return NextResponse.json({
          url: uploadResponse.url,
          dbUrl: `/api/files/${savedFile._id}`,
          localUrl: uploadResponse.url,
          filename: fileName,
          size: file.size,
          type: file.type,
          fileId: savedFile._id
        });
      } catch (imagekitError) {
        console.error('Error uploading to ImageKit:', imagekitError);
        // Fall through to local storage if ImageKit fails
      }
    }

    // Also save file locally for faster access (for non-avatar types or if ImageKit fails)
    let localUrl = '';
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', fileType);
      await mkdir(uploadDir, { recursive: true });
      const localPath = path.join(uploadDir, fileName);
      await writeFile(localPath, buffer);
      localUrl = `/uploads/${fileType}/${fileName}`;
    } catch (localError) {
      console.error('Error saving file locally:', localError);
      // Continue even if local save fails - we still have DB storage
    }

    // Save file to MongoDB
    const savedFile = await File.create({
      filename: fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64Data,
      type: fileType,
      localPath: localUrl || null,
      uploadedBy: session.user.id
    });

    // Return local URL if available, otherwise DB file URL
    const fileUrl = localUrl || `/api/files/${savedFile._id}`;

    return NextResponse.json({
      url: fileUrl,
      dbUrl: `/api/files/${savedFile._id}`,
      localUrl: localUrl || null,
      filename: fileName,
      size: file.size,
      type: file.type,
      fileId: savedFile._id
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    console.error('Detailed error:', {
      message: errorMessage,
      error: error
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'No file ID provided' }, { status: 400 });
    }

    // Find and delete the file, ensuring it belongs to the current user
    const deletedFile = await File.findOneAndDelete({
      _id: fileId,
      uploadedBy: session.user.id
    });

    if (!deletedFile) {
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
