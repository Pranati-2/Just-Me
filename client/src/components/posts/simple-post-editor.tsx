import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/new-user-context';
import { useToast } from '@/hooks/use-toast';
import { updatePost } from '@/lib/storage';
import { Post } from '@shared/schema';
import { clearDraft, saveDraft, getDraft } from '@/lib/draft-utils';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { CustomInput } from '@/components/ui/custom-input';
import { FaYoutube, FaInstagram, FaSave, FaTimes, FaLink, FaImage, FaTag, FaHistory } from 'react-icons/fa';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimplePostEditorProps {
  post: Post;
  platform: string;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: () => void;
}

export default function SimplePostEditor({
  post,
  platform,
  isOpen,
  onClose,
  onPostUpdated
}: SimplePostEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [content, setContent] = useState(post?.content || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [attachments, setAttachments] = useState<string[]>(post?.mediaUrls || []);
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for draft on open
  useEffect(() => {
    if (post && isOpen) {
      const draftKey = `post_${platform}_${post.id}`;
      const savedDraft = getDraft('post', draftKey);
      
      if (savedDraft) {
        try {
          // Try to parse the draft as JSON
          const draftData = JSON.parse(savedDraft);
          // If valid draft data exists, offer to restore it
          if (draftData && typeof draftData === 'object') {
            setHasDraft(true);
            // Don't auto-restore, just show the notification
            // The user will need to explicitly click "Restore"
          } else {
            // Initialize the editor with the current post content
            setContent(post.content || '');
            setAttachments(post.mediaUrls || []);
            setTags(post.tags || []);
          }
        } catch (e) {
          console.error('Error parsing draft:', e);
          // If there's an error parsing the draft, just use the post content
          setContent(post.content || '');
          setAttachments(post.mediaUrls || []);
          setTags(post.tags || []);
        }
      } else {
        // No draft, initialize with post content
        setContent(post.content || '');
        setAttachments(post.mediaUrls || []);
        setTags(post.tags || []);
      }
    }
  }, [post, isOpen, platform]);
  
  // Autosave effect
  useEffect(() => {
    if (post && isOpen) {
      // Cancel any existing timeout
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      
      // Set new timeout for autosave
      autosaveTimeoutRef.current = setTimeout(() => {
        const draftKey = `post_${platform}_${post.id}`;
        const draftData = JSON.stringify({
          content,
          attachments,
          tags
        });
        saveDraft('post', draftKey, draftData);
      }, 2000); // Save after 2 seconds of inactivity
    }
    
    // Cleanup timeout on unmount or when inputs change
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [content, attachments, tags, post, isOpen, platform]);
  
  // Function to restore draft
  const handleRestoreDraft = () => {
    const draftKey = `post_${platform}_${post.id}`;
    const savedDraft = getDraft('post', draftKey);
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        if (draftData && typeof draftData === 'object') {
          setContent(draftData.content || '');
          setAttachments(draftData.attachments || []);
          setTags(draftData.tags || []);
          setHasDraft(false);
          
          toast({
            title: "Draft restored",
            description: "Your unsaved changes have been restored.",
          });
        }
      } catch (e) {
        console.error('Error restoring draft:', e);
        toast({
          title: "Error restoring draft",
          description: "There was a problem restoring your draft.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Function to discard draft
  const handleDiscardDraft = () => {
    const draftKey = `post_${platform}_${post.id}`;
    clearDraft('post', draftKey);
    setHasDraft(false);
    
    // Reset to original post content
    setContent(post.content || '');
    setAttachments(post.mediaUrls || []);
    setTags(post.tags || []);
    
    toast({
      title: "Draft discarded",
      description: "Your unsaved changes have been discarded.",
    });
  };

  if (!user) {
    return null;
  }
  
  // Handle tag input
  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpdate = async () => {
    if (!content.trim()) {
      toast({
        title: "Cannot update with empty content",
        description: "Please write something before updating your post.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Get the existing user profile info from the post if available
      const existingFormattedContent = post.formattedContent || {}; 
      const existingUserName = existingFormattedContent.userName;
      const existingUserDesignation = existingFormattedContent.userDesignation;
      const existingUserProfilePic = existingFormattedContent.userProfilePic;
      
      // Prepare update data
      const updateData = {
        content: content,
        formattedContent: {
          // For Instagram, include images in the HTML content
          html: platform === 'instagram' && attachments.length > 0 
            ? `<div>${attachments.map(url => `<img src="${url}" alt="Post image" />`).join('')}<p>${content}</p></div>` 
            : content,
          userName: existingUserName || user.displayName || user.username || '',
          userDesignation: existingUserDesignation || user.designation || '',
          userProfilePic: existingUserProfilePic || user.profilePicture || ''
        },
        mediaUrls: attachments,
        tags: tags
      };
      
      console.log(`Updating ${platform} post ${post.id}:`, updateData);
      
      // Update the post while preserving the user profile info
      const result = await updatePost(platform, post.id, updateData);
      
      if (!result) {
        throw new Error(`Post ${post.id} not found or could not be updated`);
      }
      
      console.log(`Post updated successfully:`, result);
      
      toast({
        title: "Post updated!",
        description: "Your post has been successfully updated.",
      });
      
      // Clear any saved draft
      clearDraft('post', `post_${platform}_${post.id}`);
      
      // Close the dialog first
      onClose();
      
      // Wait a moment then notify parent to refresh
      setTimeout(() => onPostUpdated(), 200);
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error updating post",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Platform-specific icon
  const PlatformIcon = platform === 'youtube' ? FaYoutube : FaInstagram;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="flex items-center text-lg">
            <PlatformIcon className="mr-2 text-primary" size={16} />
            Edit {platform === 'youtube' ? 'YouTube' : 'Instagram'} Post
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-3 space-y-4">
          {/* Draft notification */}
          {hasDraft && (
            <Alert className="bg-blue-50 border-blue-200">
              <div className="flex items-center">
                <FaHistory className="h-4 w-4 text-blue-600 mr-2" />
                <AlertDescription className="text-blue-700 text-sm flex-1">
                  You have unsaved changes for this post.
                </AlertDescription>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    onClick={handleRestoreDraft}
                  >
                    Restore
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100"
                    onClick={handleDiscardDraft}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            </Alert>
          )}
          
          {/* Content textarea */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Content</label>
            <CustomTextarea 
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Enter post content..."
              className="min-h-[100px] resize-none"
            />
          </div>
          
          {/* YouTube link input */}
          {platform === 'youtube' && (
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <FaLink size={12} className="text-primary" /> Video Link
              </label>
              <CustomInput
                value={attachments[0] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAttachments([e.target.value])}
                placeholder="Paste YouTube video URL"
              />
            </div>
          )}
          
          {/* Instagram image upload */}
          {platform === 'instagram' && (
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-1">
                <FaImage size={12} className="text-primary" /> Images
              </label>
              
              <div className="flex gap-2 flex-wrap">
                {attachments.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Attachment ${index}`} 
                      className="h-16 w-16 object-cover rounded-md"
                    />
                    <button 
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
                
                {/* Add image button */}
                <label 
                  className="h-16 w-16 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-md cursor-pointer hover:border-primary transition-colors"
                >
                  <FaImage className="text-gray-400" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Create a FileReader to read the file as data URL (base64)
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target && event.target.result) {
                            // Use the base64 data URL which is more reliable than createObjectURL
                            const dataUrl = event.target.result as string;
                            setAttachments([...attachments, dataUrl]);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}
          
          {/* Tags input */}
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1">
              <FaTag size={12} className="text-primary" /> Tags
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span 
                  key={tag} 
                  className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs flex items-center"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 text-primary/80 hover:text-primary">
                    <FaTimes size={10} />
                  </button>
                </span>
              ))}
            </div>
            <CustomInput
              value={tagInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
              onKeyDown={handleTagInput}
              placeholder="Type a tag and press Enter"
            />
          </div>
        </div>
        
        <DialogFooter className="border-t pt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            size="sm"
          >
            <FaTimes className="mr-1.5" size={12} />
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating || !content.trim()}
            size="sm"
          >
            {isUpdating ? (
              <div className="animate-spin mr-1.5 h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <FaSave className="mr-1.5" size={12} />
            )}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}