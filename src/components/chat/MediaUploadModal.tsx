'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { X, Send, Image, Video, FileText, Music, Camera, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (file: File, caption?: string) => Promise<void>;
}

export function MediaUploadModal({ isOpen, onClose, onSend }: MediaUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setCaption('');
    
    // Create preview URL for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
      
      await onSend(selectedFile, caption);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Close modal after successful upload
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCaption('');
    setPreviewUrl('');
    setUploading(false);
    setUploadProgress(0);
    onClose();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (file.type.startsWith('video/')) return <Video className="w-8 h-8" />;
    if (file.type.startsWith('audio/')) return <Music className="w-8 h-8" />;
    return <FileText className="w-8 h-8" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Send Media
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            // File selection options
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Image className="w-6 h-6" />
                  <span className="text-sm">Photos</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                  onClick={() => {
                    if (videoInputRef.current) {
                      videoInputRef.current.click();
                    }
                  }}
                >
                  <Video className="w-6 h-6" />
                  <span className="text-sm">Videos</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                  onClick={() => {
                    if (documentInputRef.current) {
                      documentInputRef.current.click();
                    }
                  }}
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-sm">Documents</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.capture = 'environment';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-sm">Camera</span>
                </Button>
              </div>
              
              <div className="text-center">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
              </div>
            </div>
          ) : (
            // File preview and caption
            <div className="space-y-4">
              {/* File preview */}
              <div className="border rounded-lg p-4">
                {selectedFile.type.startsWith('image/') && previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded"
                  />
                )}
                
                {selectedFile.type.startsWith('video/') && previewUrl && (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-48 object-cover rounded"
                  />
                )}
                
                {!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/') && (
                  <div className="flex items-center space-x-3 p-4">
                    <div className="text-blue-600">
                      {getFileIcon(selectedFile)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Caption input */}
              <div>
                <Textarea
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[80px]"
                  disabled={uploading}
                />
              </div>
              
              {/* Upload progress */}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-gray-500 text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="flex-1"
                >
                  Change File
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={uploading}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
