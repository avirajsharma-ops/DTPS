import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import dbConnect from '@/lib/db/connection';
import Blog from '@/lib/db/models/Blog';
import { getImageKit } from '@/lib/imagekit';
import { UserRole } from '@/types';
import { compressBase64ImageServer } from '@/lib/imageCompressionServer';

// GET - Get single blog (admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const blog = await withCache(
      `admin:blogs:id:${JSON.stringify(id)}`,
      async () => await Blog.findById(id),
      { ttl: 120000, tags: ['admin'] }
    );
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    return NextResponse.json({ blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog' },
      { status: 500 }
    );
  }
}

// PUT - Update blog
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const blog = await withCache(
      `admin:blogs:id:${JSON.stringify(id)}`,
      async () => await Blog.findById(id),
      { ttl: 120000, tags: ['admin'] }
    );
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const content = formData.get('content') as string;
    const category = formData.get('category') as string;
    const author = formData.get('author') as string;
    const readTime = formData.get('readTime') as string | null;
    const tags = formData.get('tags') as string | null;
    const isFeatured = formData.get('isFeatured') === 'true';
    const isActive = formData.get('isActive') === 'true';
    const displayOrder = parseInt(formData.get('displayOrder') as string) || 0;
    const featuredImageData = formData.get('featuredImage') as string | null;
    const metaTitle = formData.get('metaTitle') as string | null;
    const metaDescription = formData.get('metaDescription') as string | null;

    // Update basic fields
    if (title) blog.title = title;
    if (description) blog.description = description;
    if (content) blog.content = content;
    if (category) blog.category = category as IBlog['category'];
    if (author) blog.author = author;
    if (readTime) blog.readTime = parseInt(readTime);
    if (tags !== null) {
      blog.tags = tags 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
    }
    blog.isFeatured = isFeatured;
    blog.isActive = isActive;
    blog.displayOrder = displayOrder;
    if (metaTitle !== null) blog.metaTitle = metaTitle || undefined;
    if (metaDescription !== null) blog.metaDescription = metaDescription || undefined;

    // Upload new image if provided - single upload only
    if (featuredImageData && featuredImageData.includes('base64')) {
      try {
        const imageBase64 = featuredImageData.split('base64,')[1];
        
        // Compress image once
        const compressedImage = await compressBase64ImageServer(imageBase64, {
          quality: 85,
          maxWidth: 1920,
          maxHeight: 1080,
          format: 'jpeg'
        });

        // Upload single image to ImageKit
        const imageKitInstance = getImageKit();
        const uploadResult = await imageKitInstance.upload({
          file: compressedImage,
          fileName: `blog_${Date.now()}.jpg`,
          folder: '/blogs',
        });
        
        // Use the same URL for featured image
        blog.featuredImage = uploadResult.url;
        
        // Generate thumbnail URL using ImageKit's URL transformation
        const filePath = (uploadResult as any).filePath as string | undefined;
        if (filePath && uploadResult.url.endsWith(filePath)) {
          const baseUrl = uploadResult.url.slice(0, -filePath.length);
          blog.thumbnailImage = `${baseUrl}/tr:w-600,h-400,fo-auto${filePath}`;
        } else {
          blog.thumbnailImage = uploadResult.url;
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
      }
    }

    await blog.save();

    return NextResponse.json({ success: true, blog });
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json(
      { error: 'Failed to update blog' },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    // Note: Images on ImageKit are not deleted to save on API calls
    // You can implement image cleanup if needed

    return NextResponse.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog' },
      { status: 500 }
    );
  }
}

// Import IBlog type for category typing
import { IBlog } from '@/lib/db/models/Blog';
import { withCache, clearCacheByTag } from '@/lib/api/utils';
