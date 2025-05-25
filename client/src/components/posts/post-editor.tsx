import { useState, useEffect } from 'react';
import { useUser } from '@/context/new-user-context';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updatePost } from '@/lib/storage';
import { Post } from '@shared/schema';
import PostTags from './post-tags';
import { clearDraft } from '@/lib/draft-utils';
import { FaPen, FaTags, FaImage, FaVideo, FaSave, FaTimes, FaLink, FaPlus } from 'react-icons/fa';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

interface PostEditorProps {
  post: Post;
  platform: string;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: () => void;
}

export default function PostEditor({
  post,
  platform,
  isOpen,
  onClose,
  onPostUpdated
}: PostEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (post && isOpen) {
      // Initialize the editor with the current post content
      setContent(post.content || '');
      setAttachments(post.mediaUrls || []);
      setTags(post.tags || []);
      
      // Check if there's a draft with potentially more recent content
      const draftKey = `${platform}_${post.id}`;
      const savedDraft = localStorage.getItem(`draft_post_${draftKey}`);
      
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          if (draftData && typeof draftData === 'object') {
            // If the draft has content, use it
            if (draftData.content) {
              setContent(draftData.content);
            }
            // If the draft has attachments, use them
            if (draftData.attachments && Array.isArray(draftData.attachments)) {
              setAttachments(draftData.attachments);
            }
            // If the draft has tags, use them
            if (draftData.tags && Array.isArray(draftData.tags)) {
              setTags(draftData.tags);
            }
          }
        } catch (e) {
          console.error('Error parsing draft:', e);
        }
      }
    }
  }, [post, isOpen, platform]);

  if (!user) {
    return null;
  }

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
      
      // Prepare HTML content differently based on platform
      let htmlContent = content;
      
      // For Facebook, LinkedIn, and Twitter: embed images directly into HTML content
      if (platform === 'facebook' || platform === 'linkedin' || platform === 'twitter') {
        // Create HTML with images followed by text content
        if (attachments.length > 0) {
          const imageHtml = attachments.map(url => `<img src="${url}" alt="Post image" style="max-width: 100%; margin-bottom: 10px;" />`).join('');
          htmlContent = `${imageHtml}${content}`;
        }
      }
      
      // Prepare update data
      const updateData = {
        content: content,
        formattedContent: { 
          html: htmlContent,
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
      clearDraft('post', `${platform}_${post.id}`);
      
      // Close the dialog first to prevent UI lag
      onClose();
      
      // Use setTimeout to ensure the dialog is closed before triggering reload
      setTimeout(() => {
        // Notify parent component to reload posts
        onPostUpdated();
      }, 100);
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error updating post",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Autosave effect
  useEffect(() => {
    if (post && isOpen) {
      const draftKey = `${platform}_${post.id}`;
      // Save content, attachments, and tags to localStorage as draft
      const draftData = JSON.stringify({
        content,
        attachments,
        tags
      });
      
      localStorage.setItem(`draft_post_${draftKey}`, draftData);
    }
  }, [content, attachments, tags, post, isOpen, platform]);
  
  // When dialog is closed, draft is already saved by autosave effect
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center text-lg font-semibold">
            <FaPen className="mr-2 text-primary" size={14} />
            Edit {platform === 'youtube' ? 'YouTube' : platform.charAt(0).toUpperCase() + platform.slice(1)} post
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-1 text-sm">
            Update your content below
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-3 overflow-y-auto flex-1">
          <div className="mb-3 bg-white p-2 rounded-md border">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Edit your post..."
              minHeight="150px"
              showSubmitButton={false}
              autosave={true}
              draftType="post"
              draftId={`${platform}_${post.id}`}
              onDraftFound={(draftContent) => {
                setContent(draftContent);
                toast({
                  title: "Draft restored",
                  description: "Your previously unsaved changes have been restored.",
                });
              }}
            />
          </div>
          
          {/* Link section - especially for YouTube */}
          {platform === 'youtube' && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <FaLink className="mr-2 text-primary" size={14} />
                Video Link
              </h4>
              <div className="flex gap-2 p-2 bg-gray-50 rounded-md border">
                <input 
                  type="text" 
                  placeholder="Enter YouTube video URL"
                  className="flex-1 text-sm p-1.5 border rounded-md"
                  value={attachments[0] || ''}
                  onChange={(e) => setAttachments([e.target.value])}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Paste a YouTube link (e.g., https://www.youtube.com/watch?v=VIDEOID)
              </p>
            </div>
          )}
          
          {/* Attachment section with add button for Instagram */}
          {platform === 'instagram' && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
                <span className="flex items-center">
                  <FaImage className="mr-2 text-primary" size={14} />
                  Images
                </span>
                <label 
                  htmlFor="instagram-image-upload"
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md cursor-pointer flex items-center"
                >
                  <FaPlus size={10} className="mr-1" /> Add Image
                </label>
                <input
                  id="instagram-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Create a URL for the file
                      const url = URL.createObjectURL(file);
                      setAttachments([...attachments, url]);
                    }
                  }}
                />
              </h4>
              
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md border">
                  {attachments.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Attachment ${index}`} 
                        className="h-16 w-16 object-cover rounded-md shadow-sm"
                      />
                      <button 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Add images to enhance your Instagram post
              </p>
            </div>
          )}
          
          {/* Attachment section for Facebook, LinkedIn, and Twitter */}
          {(platform === 'facebook' || platform === 'linkedin' || platform === 'twitter') && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
                <span className="flex items-center">
                  <FaImage className="mr-2 text-primary" size={14} />
                  Images & Attachments
                </span>
                <label 
                  htmlFor={`${platform}-image-upload`}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md cursor-pointer flex items-center"
                >
                  <FaPlus size={10} className="mr-1" /> Add Image
                </label>
                <input
                  id={`${platform}-image-upload`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Use FileReader for more reliable base64 encoding
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target && event.target.result) {
                          const dataUrl = event.target.result as string;
                          setAttachments([...attachments, dataUrl]);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </h4>
              
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md border">
                  {attachments.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Attachment ${index}`} 
                        className="h-16 w-16 object-cover rounded-md shadow-sm"
                      />
                      <button 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Add images to enhance your {platform.charAt(0).toUpperCase() + platform.slice(1)} post
              </p>
            </div>
          )}
          
          {/* Attachment previews (for other non-specific platforms) */}
          {platform !== 'youtube' && platform !== 'instagram' && platform !== 'facebook' && platform !== 'linkedin' && platform !== 'twitter' && attachments.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <FaImage className="mr-2 text-primary" size={14} />
                Attachments
              </h4>
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md border">
                {attachments.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Attachment ${index}`} 
                      className="h-16 w-16 object-cover rounded-md shadow-sm"
                    />
                    <button 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tags section */}
          <div className="mb-2">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <FaTags className="mr-2 text-primary" size={14} />
              Tags
            </h4>
            <div className="p-2 bg-gray-50 rounded-md border">
              <PostTags tags={tags} onChange={setTags} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add relevant tags to help categorize your post
            </p>
          </div>
        </div>
        
        <DialogFooter className="border-t pt-3 mt-1">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-300 hover:bg-gray-100 text-sm h-9 px-3"
              size="sm"
            >
              <FaTimes className="mr-1.5 text-gray-500" size={12} />
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating || !content.trim()}
              className="bg-primary hover:bg-primary/90 text-white text-sm h-9 px-3"
              size="sm"
            >
              {isUpdating ? (
                <span className="animate-spin mr-1.5">
                  <i className="ri-loader-2-line" style={{fontSize: '12px'}}></i>
                </span>
              ) : (
                <FaSave className="mr-1.5" size={12} />
              )}
              Update
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}