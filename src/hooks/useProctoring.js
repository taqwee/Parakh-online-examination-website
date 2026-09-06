/**
 * src/hooks/useProctoring.js
 * Anti-Cheat & Security Monitoring Hook
 */
import { useEffect, useState, useCallback, useRef } from 'react';

export const useProctoring = ({
  isActive = false,
  maxWarnings = 3,
  onAutoSubmit = () => {}
}) => {
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [warningCount, setWarningCount] = useState(0);
  const [lastWarningReason, setLastWarningReason] = useState('');
  const [isTerminated, setIsTerminated] = useState(false);

  const onAutoSubmitRef = useRef(onAutoSubmit);
  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  // Request Fullscreen
  const enterFullScreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen trigger failed:', err);
    }
  }, []);

  // Exit Fullscreen cleanly
  const exitFullScreen = useCallback(async () => {
    try {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        if (document.exitFullscreen) await document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen().catch(() => {});
      }
    } catch (_) {}
  }, []);

  // Infraction Handler
  const triggerInfraction = useCallback((reason) => {
    if (!isActive || isTerminated) return;

    setLastWarningReason(reason);
    setWarningCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= maxWarnings) {
        setIsTerminated(true);
        if (onAutoSubmitRef.current) {
          onAutoSubmitRef.current();
        }
      }
      return nextCount;
    });
  }, [isActive, isTerminated, maxWarnings]);

  useEffect(() => {
    if (!isActive || isTerminated) return;

    // 1. Disable Right Click Context Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // 2. Disable Clipboard & Inspect Shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        triggerInfraction('Opening Developer Tools is prohibited.');
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(key)) {
          e.preventDefault();
        }
        if (e.shiftKey && ['i', 'j', 'c'].includes(key)) {
          e.preventDefault();
          triggerInfraction('Inspecting examination window is prohibited.');
        }
      }

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerInfraction('Capturing screenshots is prohibited.');
      }
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
    };

    // 3. Fullscreen Change
    const handleFullscreenChange = () => {
      const isFull = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFull);
      if (!isFull) {
        triggerInfraction('Exited full-screen assessment mode.');
      }
    };

    // 4. Tab Switch / Window Minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerInfraction('Switched application tabs or minimized window.');
      }
    };

    // 5. Window Blur
    const handleWindowBlur = () => {
      triggerInfraction('Window focus was lost.');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive, isTerminated, triggerInfraction]);

  return {
    isFullscreen,
    warningCount,
    lastWarningReason,
    isTerminated,
    maxWarnings,
    enterFullScreen,
    exitFullScreen
  };
};