import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Download, 
  FileText, 
  CheckIcon, 
  MoreVertical,
  Type,
  Image
} from 'lucide-react';
import { 
  copyPostToClipboard, 
  copyToClipboard, 
  copyHtmlToClipboard, 
  copyPostTextOnly, 
  copyPostMediaOnly 
} from '@/lib/copy-utils';
import { exportContent } from '@/lib/export-utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface CopyExportActionsProps {
  title: string;
  content: string;
  isHtml?: boolean;
  showExport?: boolean;
  showCopy?: boolean;
  className?: string;
  fileName?: string;
  post?: any; // For posts that have formattedContent
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  onCopy?: () => void; // Callback function to execute after successful copy
}

export function CopyExportActions({
  title,
  content,
  isHtml = false,
  showExport = true,
  showCopy = true,
  className = '',
  fileName,
  post,
  size = 'md',
  iconOnly = false,
  onCopy,
}: CopyExportActionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  // Size-specific classes
  const buttonSizeClasses = {
    sm: 'h-7 px-2 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4',
  };
  
  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Handle copy of complete content (both text and media)
  const handleCopy = async () => {
    try {
      let success = false;
      
      if (post) {
        success = await copyPostToClipboard(post);
      } else if (isHtml) {
        success = await copyHtmlToClipboard(content);
      } else {
        success = await copyToClipboard(content);
      }
      
      if (success) {
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Content has been copied successfully",
        });
        
        // Call the onCopy callback if provided
        if (onCopy && typeof onCopy === 'function') {
          onCopy();
        }
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        toast({
          title: "Copy failed",
          description: "Unable to copy content to clipboard",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Unable to copy content to clipboard",
        variant: "destructive",
      });
    }
  };
  
  // Handle copy of text content only
  const handleCopyTextOnly = async () => {
    try {
      let success = false;
      
      if (post) {
        success = await copyPostTextOnly(post);
      } else if (isHtml) {
        // For non-post HTML content, we extract text only
        const tempElement = document.createElement('div');
        tempElement.innerHTML = content;
        const textOnly = tempElement.textContent || tempElement.innerText || '';
        success = await copyToClipboard(textOnly);
      } else {
        success = await copyToClipboard(content);
      }
      
      if (success) {
        setCopied(true);
        toast({
          title: "Copied text to clipboard",
          description: "Text content has been copied successfully",
        });
        
        // Call the onCopy callback if provided
        if (onCopy && typeof onCopy === 'function') {
          onCopy();
        }
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        toast({
          title: "Copy failed",
          description: "Unable to copy text content to clipboard",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error copying text content to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Unable to copy text content to clipboard",
        variant: "destructive",
      });
    }
  };
  
  // Handle copy of media content only
  const handleCopyMediaOnly = async () => {
    try {
      let success = false;
      
      if (post) {
        success = await copyPostMediaOnly(post);
      } else if (isHtml) {
        // For non-post HTML content, extract and copy only image elements
        const tempElement = document.createElement('div');
        tempElement.innerHTML = content;
        const images = tempElement.querySelectorAll('img');
        
        if (images.length > 0) {
          let mediaHtml = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">';
          mediaHtml += '<div style="font-weight: bold; margin-bottom: 10px; color: #444;">MEDIA CONTENT</div>';
          mediaHtml += '<hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;" />';
          mediaHtml += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
          
          images.forEach((img, index) => {
            const src = img.getAttribute('src') || '';
            const alt = img.getAttribute('alt') || `Image ${index + 1}`;
            if (src) {
              mediaHtml += `<div style="margin-bottom: 10px;">
                <img src="${src}" alt="${alt}" style="max-width: 300px; max-height: 300px; border-radius: 4px;" />
              </div>`;
            }
          });
          
          mediaHtml += '</div></div>';
          success = await copyHtmlToClipboard(mediaHtml);
        } else {
          success = await copyToClipboard('No media content found.');
        }
      } else {
        // For plain text, there's no media to copy
        success = await copyToClipboard('No media content found.');
      }
      
      if (success) {
        setCopied(true);
        toast({
          title: "Copied media to clipboard",
          description: "Media content has been copied successfully",
        });
        
        // Call the onCopy callback if provided
        if (onCopy && typeof onCopy === 'function') {
          onCopy();
        }
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        toast({
          title: "Copy failed",
          description: "Unable to copy media content to clipboard",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error copying media content to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Unable to copy media content to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    try {
      await exportContent(
        title, 
        post?.formattedContent?.html || content, 
        format,
        fileName || title.toLowerCase().replace(/[^a-z0-9]/g, '_')
      );
      
      toast({
        title: `Export as ${format.toUpperCase()} successful`,
        description: `File has been downloaded successfully`,
      });
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      toast({
        title: `Export failed`,
        description: `Unable to export content as ${format.toUpperCase()}`,
        variant: "destructive",
      });
    }
  };

  if (iconOnly) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className={`rounded-full p-0 h-8 w-8 ${className}`}
          >
            <MoreVertical className={iconSizeClasses[size]} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showCopy && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy content
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy complete content
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyTextOnly}>
                    <Type className="mr-2 h-4 w-4" />
                    Copy text only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyMediaOnly}>
                    <Image className="mr-2 h-4 w-4" />
                    Copy media only
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          
          {showExport && (
            <>
              {showCopy && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as Word
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showCopy && (
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={buttonSizeClasses[size]}
                  >
                    {copied ? (
                      <>
                        <CheckIcon className={`${iconSizeClasses[size]} mr-1 text-green-500`} />
                        {!iconOnly && <span>Copied</span>}
                      </>
                    ) : (
                      <>
                        <Copy className={`${iconSizeClasses[size]} mr-1`} />
                        {!iconOnly && <span>Copy</span>}
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy content to clipboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy complete content
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyTextOnly}>
              <Type className="mr-2 h-4 w-4" />
              Copy text only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyMediaOnly}>
              <Image className="mr-2 h-4 w-4" />
              Copy media only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      
      {showExport && (
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={buttonSizeClasses[size]}
                  >
                    <Download className={`${iconSizeClasses[size]} mr-1`} />
                    {!iconOnly && <span>Export</span>}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('docx')}>
              <FileText className="mr-2 h-4 w-4" />
              Export as Word
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}