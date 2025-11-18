'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationPermissionBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export function NotificationPermissionBanner({ 
  className, 
  onDismiss 
}: NotificationPermissionBannerProps) {
  const { notificationState, requestPermission } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if notifications are already granted, not supported, or dismissed
  if (notificationState.permission === 'granted' || 
      !notificationState.isSupported || 
      isDismissed) {
    return null;
  }

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const getAlertVariant = () => {
    switch (notificationState.permission) {
      case 'denied':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getIcon = () => {
    switch (notificationState.permission) {
      case 'denied':
        return <BellOff className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getMessage = () => {
    switch (notificationState.permission) {
      case 'denied':
        return 'Notifications are blocked. To receive message and call notifications, please enable them in your browser settings.';
      default:
        return 'Enable notifications to receive alerts for new messages and incoming calls even when the app is in the background.';
    }
  };

  const getActionButton = () => {
    switch (notificationState.permission) {
      case 'denied':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Open browser settings (this is browser-specific)
              alert('Please enable notifications in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Set notifications to "Allow"\n3. Refresh the page');
            }}  
          >
            Browser Settings
          </Button>
        );
      default:
        return (
          <Button
            variant="default"
            size="sm"
            onClick={handleRequestPermission}
            disabled={isRequesting}
          >
            {isRequesting ? 'Requesting...' : 'Enable Notifications'}
          </Button>
        );
    }
  };

  return (
    <Alert variant={getAlertVariant()} className={cn("relative", className="")}>
      {getIcon()}
      <AlertDescription className="">
        {getMessage()}
      </AlertDescription>
      
      <div className="flex items-center space-x-2 mt-3">
        {getActionButton()}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
        >
          Maybe Later
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="absolute top-2 right-2 h-6 w-6 p-0"
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
}
