'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Smile, Mic, X } from 'lucide-react';
import { MediaUploadModal } from './MediaUploadModal';
import { VoiceRecorder } from './VoiceRecorder';

// Dynamic import for emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ChatInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file' | 'video' | 'audio' | 'voice', attachments?: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnail?: string;
    duration?: number;
    width?: number;
    height?: number;
  }[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  recipientId?: string; // Add recipient ID for voice messages
}

export function ChatInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  className,
  recipientId
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji;
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);

    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Handle media upload
  const handleMediaUpload = async (file: File, caption?: string) => {
    try {
      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'message');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();

      // Determine message type based on file type
      let messageType: 'text' | 'image' | 'file' | 'video' | 'audio' = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      else if (file.type.startsWith('video/')) messageType = 'video';
      else if (file.type.startsWith('audio/')) messageType = 'audio';

      // Create attachment data
      const attachment = {
        url: uploadData.url,
        filename: uploadData.filename || file.name,
        size: uploadData.size || file.size,
        mimeType: uploadData.type || file.type,
      };

      // Send message with attachment data
      await onSendMessage(caption || file.name, messageType, [attachment]);

      setShowMediaUpload(false);
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  };

  // Handle voice recording
  const handleVoiceRecording = async (audioBlob: Blob) => {
    try {
      // Convert blob to file with proper audio format
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: audioBlob.type || 'audio/webm'
      });

      // Upload audio file
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('type', 'message');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload voice message');
      }

      const uploadData = await uploadResponse.json();

      // Create attachment data
      const attachment = {
        url: uploadData.url,
        filename: uploadData.filename || audioFile.name,
        size: uploadData.size || audioFile.size,
        mimeType: uploadData.type || audioFile.type,
        duration: Math.floor(audioBlob.size / 16000) // Rough estimate
      };

      // Send voice message using the onSendMessage callback
      await onSendMessage('Voice message', 'voice', [attachment]);

      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error uploading voice message:', error);
      alert('Failed to send voice message. Please try again.');
    }
  };

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  }, [onTyping]);

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    handleTyping();
  };

  // Handle send message
  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !attachedFile) return;

    if (attachedFile) {
      // Handle file upload
      const fileUrl = URL.createObjectURL(attachedFile);
      const fileType = attachedFile.type.startsWith('image/') ? 'image' : 'file';
      onSendMessage(fileUrl, fileType);
      setAttachedFile(null);
    } else {
      onSendMessage(trimmedMessage);
    }

    setMessage('');
    if (onTyping) onTyping(false);

    // Reset textarea height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, 0);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  // Handle voice recording (placeholder)
  const handleVoiceRecord = () => {
    setShowVoiceRecorder(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const canSend = message.trim() || attachedFile;

  return (
    <div className={cn("border-t bg-white p-4", className)}>
      {/* File attachment preview */}
      {attachedFile && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <span className="text-blue-600 text-xs">
                  {attachedFile.type.startsWith('image/') ? '🖼️' : '📎'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {attachedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAttachedFile(null)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="mb-3">
          <VoiceRecorder
            onSend={handleVoiceRecording}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2">
        {/* Attachment button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMediaUpload(true)}
          disabled={disabled}
          className="h-10 w-10 p-0 shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none pr-12 py-2"
            rows={1}
          />

          {/* Emoji button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0",
              showEmojiPicker && "bg-gray-100"
            )}
            disabled={disabled}
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        {/* Send/Voice button */}
        {canSend ? (
          <Button
            onClick={handleSendMessage}
            disabled={disabled}
            className="h-10 w-10 p-0 shrink-0 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={handleVoiceRecord}
            disabled={disabled}
            className={cn(
              "h-10 w-10 p-0 shrink-0 rounded-full",
              isRecording && "bg-red-100 text-red-600"
            )}
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full right-0 mb-2 z-50"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiSelect}
            width={350}
            height={400}
            searchDisabled={false}
            skinTonesDisabled={false}
            previewConfig={{
              showPreview: false
            }}
          />
        </div>
      )}

      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        onSend={handleMediaUpload}
      />
    </div>
  );
}
