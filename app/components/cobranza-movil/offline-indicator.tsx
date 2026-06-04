
'use client';

import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"} 
      className="flex items-center gap-1 animate-pulse"
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </Badge>
  );
}
