import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FaBold, FaItalic, FaUnderline, FaLink, FaPaperclip, FaImage, FaVideo, FaCopy, FaHistory, FaSmile, FaTimes } from 'react-icons/fa';
import { getDraft, saveDraft, clearDraft } from '@/lib/draft-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  showSubmitButton?: boolean;
  // Optional params for autosave functionality
  autosave?: boolean;
  draftType?: string; // 'platform', 'note', 'journal', 'doc'
  draftId?: string | number; // Platform name, content ID, or 'new'
  onDraftFound?: (draftContent: string) => void; // Called when a draft is found on initial load
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '150px',
  onSubmit,
  submitLabel = 'Save',
  showSubmitButton = true,
  autosave = false,
  draftType,
  draftId,
  onDraftFound
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftAlert, setShowDraftAlert] = useState(false);

  // Simple function to save cursor position
  const saveCaretPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  };

  // Simple function to restore cursor position
  const restoreCaretPosition = (range: Range | null) => {
    if (range && editorRef.current) {
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.error("Error restoring cursor position:", error);
      }
    }
  };
  
  // On initial load, check for saved drafts if autosave is enabled
  useEffect(() => {
    if (autosave && draftType && draftId) {
      const savedDraft = getDraft(draftType, draftId);
      if (savedDraft && savedDraft !== value) {
        setHasDraft(true);
        setShowDraftAlert(true);
        
        // Auto-hide the alert after 3 seconds
        const timer = setTimeout(() => {
          setShowDraftAlert(false);
        }, 3000);
        
        // If callback provided, let the parent component know about the draft
        if (onDraftFound) {
          onDraftFound(savedDraft);
        }
        
        return () => clearTimeout(timer);
      }
    }
    
    if (editorRef.current) {
      editorRef.current.innerHTML = value;
      
      // Position cursor at the end
      if (value) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // false = collapse to end
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, []);
  
  // Set up autosave functionality
  useEffect(() => {
    if (autosave && draftType && draftId && value) {
      const timeoutId = setTimeout(() => {
        saveDraft(draftType, draftId, value);
      }, 1000); // Save after 1 second of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [value, autosave, draftType, draftId]);
  
  // Maintain cursor position when value changes from parent component
  const lastValueRef = useRef(value);
  useEffect(() => {
    // Skip if the editorRef isn't set yet
    if (!editorRef.current) return;
    
    // Only handle cases where the value changed from outside
    // If the value is actually different than what we already have
    if (value !== lastValueRef.current && value !== editorRef.current.innerHTML) {
      // Save cursor position
      const selection = saveCaretPosition();
      
      // Update content
      editorRef.current.innerHTML = value;
      
      // Restore cursor, but only if we had a previous selection
      if (selection) {
        setTimeout(() => {
          restoreCaretPosition(selection);
        }, 0);
      }
    }
    
    // Update ref for next check
    lastValueRef.current = value;
  }, [value]);
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML || '';
      onChange(newContent);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    setTimeout(() => {
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML || '';
        onChange(newContent);
      }
    }, 0);
  };
  

  const execCommand = (command: string, value: string = '') => {
    // Save cursor position
    const selection = saveCaretPosition();
    
    // Execute the command
    document.execCommand(command, false, value);
    
    // Update the model
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    
    // Restore cursor position with slight delay to ensure UI update completes
    setTimeout(() => {
      restoreCaretPosition(selection);
    }, 0);
  };

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');

  const handleLink = () => {
    if (isLinkDialogOpen) {
      if (linkUrl) {
        execCommand('createLink', linkUrl);
      }
      setIsLinkDialogOpen(false);
      setLinkUrl('');
    } else {
      setIsLinkDialogOpen(true);
    }
  };

  const handleAttachment = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImage = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleVideo = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // Save cursor position
        const selection = saveCaretPosition();
        
        if (type === 'image') {
          // Create a more controlled image insertion with styling
          const imageUrl = event.target.result.toString();
          const imageHtml = `<img src="${imageUrl}" alt="Embedded image" style="max-width: 100%; margin: 8px 0; display: block;" />`;
          
          // Insert at cursor position
          document.execCommand('insertHTML', false, imageHtml);
          
          // Manual update to ensure image is properly saved
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        } else if (type === 'video') {
          // Create a more controlled video element with styling
          const videoUrl = event.target.result.toString();
          const videoHtml = `<video controls src="${videoUrl}" style="max-width: 100%; margin: 8px 0; display: block;"></video>`;
          
          // Insert at cursor position
          document.execCommand('insertHTML', false, videoHtml);
          
          // Manual update to ensure video is properly saved
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        } else {
          // For regular files, insert a styled link
          const fileName = file.name;
          const fileUrl = event.target.result.toString();
          const fileHtml = `<div style="margin: 8px 0;">
            <a href="${fileUrl}" download="${fileName}" 
              style="display: inline-flex; align-items: center; padding: 6px 12px; background: #f1f5f9; border-radius: 4px; text-decoration: none; color: #0f172a;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              ${fileName}
            </a>
          </div>`;
          
          // Insert at cursor position
          document.execCommand('insertHTML', false, fileHtml);
          
          // Manual update to ensure file link is properly saved
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }
        
        // Restore cursor position after insertion
        setTimeout(() => {
          // Put cursor after the inserted element
          if (selection) {
            try {
              const newSelection = window.getSelection();
              if (newSelection) {
                const range = document.createRange();
                range.setStartAfter(editorRef.current!.lastChild!);
                range.collapse(true);
                newSelection.removeAllRanges();
                newSelection.addRange(range);
              }
            } catch (e) {
              console.log('Error positioning cursor after insertion:', e);
            }
          }
        }, 10);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopy = () => {
    document.execCommand('copy');
  };
  
  // Handle emoji picker toggle
  const handleEmojiToggle = () => {
    setIsEmojiPickerOpen(!isEmojiPickerOpen);
  };
  
  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    // Save cursor position
    const selection = saveCaretPosition();
    
    // Insert emoji at cursor position
    document.execCommand('insertText', false, emojiData.emoji);
    
    // Update the model
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    
    // Restore cursor position (after the inserted emoji)
    setTimeout(() => {
      restoreCaretPosition(selection);
    }, 0);
    
    // Close the emoji picker
    setIsEmojiPickerOpen(false);
  };
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Method to restore a previously saved draft
  const handleRestoreDraft = () => {
    if (autosave && draftType && draftId) {
      const savedDraft = getDraft(draftType, draftId);
      if (savedDraft) {
        if (editorRef.current) {
          editorRef.current.innerHTML = savedDraft;
        }
        onChange(savedDraft);
        setHasDraft(false);
        setShowDraftAlert(false);
      }
    }
  };
  
  // Method to discard a draft without restoring it
  const handleDiscardDraft = () => {
    if (autosave && draftType && draftId) {
      clearDraft(draftType, draftId);
      setHasDraft(false);
      setShowDraftAlert(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      {hasDraft && autosave && showDraftAlert && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 text-blue-800 px-4 py-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <FaHistory className="mr-2" />
              <AlertDescription className="text-sm">
                You have an unsaved draft. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto mx-1 text-blue-600 font-medium"
                  onClick={handleRestoreDraft}
                >
                  Restore
                </Button>
                or
                <Button 
                  variant="link" 
                  className="p-0 h-auto mx-1 text-blue-600 font-medium"
                  onClick={handleDiscardDraft}
                >
                  Discard
                </Button>
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-blue-800"
              onClick={() => setShowDraftAlert(false)}
              title="Close"
            >
              <FaTimes size={14} />
            </Button>
          </div>
        </Alert>
      )}
      <div className="border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleBold}
            title="Bold"
          >
            <FaBold size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleItalic}
            title="Italic"
          >
            <FaItalic size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleUnderline}
            title="Underline"
          >
            <FaUnderline size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleLink}
            title="Link"
          >
            <FaLink size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleAttachment}
            title="Attach file"
          >
            <FaPaperclip size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleImage}
            title="Image"
          >
            <FaImage size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleVideo}
            title="Video"
          >
            <FaVideo size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEmojiToggle}
            title="Emoji"
          >
            <FaSmile size={16} />
          </Button>
          <div className="ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
              title="Copy"
            >
              <FaCopy size={16} />
            </Button>
          </div>
        </div>
        
        {isLinkDialogOpen && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL"
              className="flex-1 px-2 py-1 text-sm border rounded"
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleLink}>
              Add Link
            </Button>
          </div>
        )}
      </div>

        <div
          ref={editorRef}
          contentEditable
          className="your-classname"
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
          style={{ minHeight }}
          >
        </div>


      {showSubmitButton && (
        <div className="flex justify-end border-t border-gray-200 p-2 bg-gray-50">
          <Button 
            type="button" 
            onClick={() => {
              // Clear the draft when saving successfully
              if (autosave && draftType && draftId) {
                clearDraft(draftType, draftId);
              }
              // Call original onSubmit
              if (onSubmit) onSubmit();
            }}
          >
            {submitLabel}
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e, 'file')}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        onChange={(e) => handleFileChange(e, 'image')}
        className="hidden"
      />
      <input
        type="file"
        accept="video/*"
        ref={videoInputRef}
        onChange={(e) => handleFileChange(e, 'video')}
        className="hidden"
      />
      
      {/* Emoji Picker */}
      {isEmojiPickerOpen && (
        <div 
          ref={emojiPickerRef} 
          className="fixed z-50 shadow-lg rounded-lg overflow-hidden"
          style={{ 
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxHeight: '80vh',
            maxWidth: '90vw'
          }}
        >
          <div className="bg-slate-800 text-white py-2 px-3 flex justify-between items-center">
            <span className="text-sm font-medium">Choose an emoji</span>
            <button 
              className="text-slate-300 hover:text-white"
              onClick={() => setIsEmojiPickerOpen(false)}
            >
              ✕
            </button>
          </div>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme={Theme.AUTO}
            lazyLoadEmojis={true}
            width={320}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
