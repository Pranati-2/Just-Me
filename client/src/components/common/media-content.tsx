import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { FiCheck, FiCopy } from 'react-icons/fi';

interface MediaContentProps {
  src: string;
  alt: string;
  mediaType: 'image' | 'video' | 'audio';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onCopy?: () => void;
  content?: string;
  formattedContent?: string | null;
}

export function MediaContent({
  src,
  alt,
  mediaType,
  size = 'md',
  className = '',
  onCopy,
  content,
  formattedContent
}: MediaContentProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  // Detect touch device using feature detection
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [copied, setCopied] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  
  // Determine size-based styling with better responsiveness
  const sizeStyles = {
    sm: 'max-w-full sm:max-w-[200px] max-h-[200px]',
    md: 'max-w-full sm:max-w-[400px] max-h-[400px]',
    lg: 'w-full max-h-[500px] object-contain'
  };
  
  // Reset the copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  // Handle long press for mobile/touch devices
  const handleTouchStart = () => {
    if (!isTouchDevice) return;
    
    setIsPressed(true);
    pressTimer.current = setTimeout(() => {
      handleCopy();
    }, 800); // 800ms long press to activate
  };
  
  const handleTouchEnd = () => {
    if (!isTouchDevice) return;
    
    setIsPressed(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  
  // Handle double-click for desktop
  const handleDoubleClick = () => {
    if (isTouchDevice) return; // Skip for touch devices, they use long press
    handleCopy();
  };
  
  // This function only handles media copying via double-click or long-press
  const handleCopy = () => {
    // Only copy media content (image/video), ignore text content
    if (mediaType === 'image' && mediaRef.current instanceof HTMLImageElement) {
      // Copy the image to clipboard using Canvas
      const canvas = document.createElement('canvas');
      canvas.width = mediaRef.current.naturalWidth;
      canvas.height = mediaRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(mediaRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            try {
              // Use the modern Clipboard API
              const data = [new ClipboardItem({ [blob.type]: blob })];
              navigator.clipboard.write(data)
                .then(() => {
                  setCopied(true);
                  toast({
                    title: 'Copied!',
                    description: 'Media copied to clipboard',
                  });
                  if (onCopy) onCopy();
                })
                .catch((err) => {
                  console.error('Error copying image: ', err);
                  toast({
                    title: 'Copy failed',
                    description: 'Unable to copy image to clipboard',
                    variant: 'destructive',
                  });
                });
            } catch (err) {
              // Fallback for browsers that don't support ClipboardItem
              toast({
                title: 'Copy not supported',
                description: 'Your browser doesn\'t support copying images',
                variant: 'destructive',
              });
            }
          }
        }, 'image/png');
      }
    } else if (mediaType === 'video' && src) {
      // Copy video URL to clipboard
      navigator.clipboard.writeText(src)
        .then(() => {
          setCopied(true);
          toast({
            title: 'Copied!',
            description: 'Video URL copied to clipboard',
          });
          if (onCopy) onCopy();
        })
        .catch(() => {
          toast({
            title: 'Copy failed',
            description: 'Unable to copy to clipboard',
            variant: 'destructive',
          });
        });
    }
  };
  
  const copyPlainContent = () => {
    if (!content) return;
    
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopied(true);
        toast({
          title: 'Copied!',
          description: 'Content copied to clipboard',
        });
        if (onCopy) onCopy();
      })
      .catch(() => {
        toast({
          title: 'Copy failed',
          description: 'Unable to copy to clipboard',
          variant: 'destructive',
        });
      });
  };

  // Render appropriate media based on type
  const renderMedia = () => {
    switch (mediaType) {
      case 'image':
        return (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={src}
            alt={alt}
            className={`object-cover ${sizeStyles[size]} ${className} ${isPressed ? 'scale-95 opacity-80' : ''} transition-all`}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          />
        );
      case 'video':
        return (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={src}
            className={`object-cover ${sizeStyles[size]} ${className} ${isPressed ? 'scale-95 opacity-80' : ''} transition-all`}
            controls
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          />
        );
      case 'audio':
        return (
          <audio
            src={src}
            className={`w-full ${className}`}
            controls
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div className="w-full flex justify-center">
        {renderMedia()}
      </div>
      
      {/* Copy indicator overlay */}
      {copied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded transition-opacity">
          <div className="bg-white text-primary rounded-full p-2">
            <FiCheck size={isMobile ? 16 : 24} />
          </div>
        </div>
      )}
      
      {/* Copy instruction tooltip */}
      <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-60 px-2 py-1 rounded opacity-70 hidden sm:block">
        {isTouchDevice ? 'Long press to copy' : 'Double-click to copy'}
      </div>
    </div>
  );
}