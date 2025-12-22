/**
 * Image compression utility using browser canvas API
 * Compresses images before uploading to ImageKit
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const defaultOptions: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'image/jpeg'
};

/**
 * Compress an image file using canvas
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed file as base64 string and metadata
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ base64: string; mimeType: string; originalSize: number; compressedSize: number }> {
  const opts = { ...defaultOptions, ...options };
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxWidth = opts.maxWidth || 1200;
        const maxHeight = opts.maxHeight || 1200;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw white background for JPEG (to handle transparency)
        if (opts.format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64
        const base64 = canvas.toDataURL(opts.format || 'image/jpeg', opts.quality || 0.8);
        
        // Calculate compressed size (approximate from base64)
        const compressedSize = Math.round((base64.length * 3) / 4);
        
        resolve({
          base64,
          mimeType: opts.format || 'image/jpeg',
          originalSize: file.size,
          compressedSize
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image from a base64 string
 * @param base64String - The base64 encoded image
 * @param options - Compression options
 * @returns Promise with compressed base64 string
 */
export async function compressBase64Image(
  base64String: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...defaultOptions, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      const maxWidth = opts.maxWidth || 1200;
      const maxHeight = opts.maxHeight || 1200;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      if (opts.format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL(opts.format || 'image/jpeg', opts.quality || 0.8));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = base64String;
  });
}

/**
 * Convert File to base64 string
 * @param file - The file to convert
 * @returns Promise with base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract base64 data from a data URL
 * @param dataUrl - The data URL (e.g., "data:image/jpeg;base64,...")
 * @returns The base64 data without the prefix
 */
export function extractBase64Data(dataUrl: string): string {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  return matches ? matches[2] : dataUrl;
}

export default compressImage;
