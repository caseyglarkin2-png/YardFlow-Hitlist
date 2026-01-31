'use client';

import { useState, useEffect, useCallback } from 'react';
import { Minimize2, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extended types for cross-browser fullscreen API
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface WarRoomToggleProps {
  className?: string;
}

export function WarRoomToggle({ className }: WarRoomToggleProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const enterFullScreen = useCallback(async () => {
    try {
      const elem = document.documentElement as FullscreenElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      document.body.classList.add('war-room-mode');
      setIsFullScreen(true);
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, []);

  const exitFullScreen = useCallback(async () => {
    try {
      const doc = document as FullscreenDocument;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
      document.body.classList.remove('war-room-mode');
      setIsFullScreen(false);
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (isFullScreen) {
      exitFullScreen();
    } else {
      enterFullScreen();
    }
  }, [isFullScreen, enterFullScreen, exitFullScreen]);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!document.fullscreenElement;
      setIsFullScreen(isCurrentlyFullScreen);
      if (!isCurrentlyFullScreen) {
        document.body.classList.remove('war-room-mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Keyboard shortcut: F11 or Ctrl+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key === 'F')) {
        e.preventDefault();
        toggleFullScreen();
      }
      if (e.key === 'Escape' && isFullScreen) {
        exitFullScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, toggleFullScreen, exitFullScreen]);

  return (
    <Button
      onClick={toggleFullScreen}
      variant={isFullScreen ? 'destructive' : 'default'}
      size="lg"
      className={className}
    >
      {isFullScreen ? (
        <>
          <Minimize2 className="mr-2 h-5 w-5" />
          Exit War Room Mode
        </>
      ) : (
        <>
          <Monitor className="mr-2 h-5 w-5" />
          War Room Mode
        </>
      )}
    </Button>
  );
}

/**
 * War Room Mode Styles
 * Add these to your globals.css or tailwind.css
 *
 * .war-room-mode {
 *   --war-room-scale: 1.25;
 * }
 *
 * .war-room-mode .dashboard-nav,
 * .war-room-mode nav,
 * .war-room-mode header {
 *   display: none !important;
 * }
 *
 * .war-room-mode main {
 *   max-width: 100% !important;
 *   padding: 1rem !important;
 * }
 *
 * .war-room-mode .text-sm {
 *   font-size: 1rem !important;
 * }
 *
 * .war-room-mode .text-xs {
 *   font-size: 0.875rem !important;
 * }
 *
 * .war-room-mode .text-3xl {
 *   font-size: 3rem !important;
 * }
 *
 * .war-room-mode .text-xl {
 *   font-size: 1.5rem !important;
 * }
 *
 * .war-room-mode .p-6 {
 *   padding: 2rem !important;
 * }
 */
