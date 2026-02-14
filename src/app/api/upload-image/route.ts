import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getImageKit } from '@/lib/imagekit';
import { UserRole } from '@/types';

/**
 * POST /api/upload-image
 * Upload a compressed image to ImageKit
 * Used for recipe images, user avatars, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is dietitian or admin
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.DIETITIAN) {
      return NextResponse.json(
        { error: 'Only dietitians and admins can upload images' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'recipes';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}-${file.name}`;

    // Use the specified folder path
    const folderPath = folder;

    try {
      const imagekit = getImageKit();
      const result = await imagekit.upload({
        file: Buffer.from(buffer),
        fileName: fileName,
        folder: folderPath,
        isPrivateFile: false,
      });

      return NextResponse.json({
        success: true,
        url: result.url,
        fileId: result.fileId,
        name: result.name,
        size: result.size,
      });
    } catch (imagekitError) {
      console.error('ImageKit upload error:', imagekitError);
      return NextResponse.json(
        { error: 'Failed to upload image to ImageKit' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process image upload' },
      { status: 500 }
    );
  }
}
