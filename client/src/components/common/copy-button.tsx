import React, { useState, useEffect } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { copyFormattedContent } from '@/lib/copy-utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CopyButtonProps {
  content?: string;
  formattedContent?: string | null;
  className?: string;
  buttonText?: string;
  onCopy?: () => void;
}

export function CopyButton({
  content = '',
  formattedContent = null,
  className = '',
  buttonText,
  onCopy
}: CopyButtonProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    const success = await copyFormattedContent(formattedContent, content);
    
    if (success) {
      setCopied(true);
      toast({
        title: 'Copied!',
        description: formattedContent 
          ? 'Content copied with formatting' 
          : 'Content copied to clipboard',
      });
      if (onCopy) onCopy();
    } else {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`flex items-center space-x-1 ${className}`}
      onClick={handleCopy}
    >
      {copied ? <FiCheck size={isMobile ? 14 : 16} /> : <FiCopy size={isMobile ? 14 : 16} />}
      {buttonText && <span className="ml-1">{buttonText}</span>}
    </Button>
  );
}