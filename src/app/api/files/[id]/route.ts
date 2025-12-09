import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import { File as FileModel } from '@/lib/db/models/File';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const fileDoc = await FileModel.findById(id);
    if (!fileDoc) {
      return new NextResponse('File not found', { status: 404 });
    }
    const buffer = Buffer.from(fileDoc.data, 'base64');
    
    // Sanitize filename for Content-Disposition header
    const sanitizedFilename = fileDoc.originalName
      .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII chars
      .replace(/"/g, '\\"'); // Escape quotes
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': fileDoc.mimeType,
        'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Error serving file', { status: 500 });
  }
}
