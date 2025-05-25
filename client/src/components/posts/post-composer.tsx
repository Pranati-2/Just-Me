import { useState, useRef } from 'react';
import { useUser } from '@/context/new-user-context';
import RichTextEditor from '@/components/ui/rich-text-editor';
import TagInput from '@/components/ui/tag-input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/storage';
import { FaTimes, FaImage, FaVideo, FaChartBar, FaSmile, FaHashtag } from 'react-icons/fa';

interface PostComposerProps {
  platform: string;
  onPostCreated?: () => void;
  placeholder?: string;
  buttonText?: string;
  buttonColor?: string;
  buttonIcon?: string;
}

export default function PostComposer({
  platform,
  onPostCreated,
  placeholder = "What's on your mind?",
  buttonText = "Post",
  buttonColor = "#3B82F6",
  buttonIcon = "ri-send-plane-line"
}: PostComposerProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return <div className="text-center p-4">Please log in to post</div>;
  }

  const handlePost = async () => {
    if (!content.trim()) {
      toast({
        title: "Cannot post empty content",
        description: "Please write something before posting.",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
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
      
      // Create post request with current user profile information
      const result = await createPost(platform, {
        userId: user.id,
        platform,
        content: content,
        formattedContent: { 
          html: htmlContent,
          userName: user.displayName || user.username || '',
          userDesignation: user.designation || '',
          userProfilePic: user.profilePicture || ''
        },
        mediaUrls: attachments,
        tags: tags
      });
      
      // Only proceed if post creation was successful
      if (result) {
        toast({
          title: "Post created!",
          description: "Your post has been successfully published.",
        });
        
        // Reset form
        setContent('');
        setAttachments([]);
        setTags([]);
        setShowTagInput(false);
        
        // Clear draft after successful post
        import('@/lib/draft-utils').then(({ clearDraft }) => {
          clearDraft('platform', platform);
        });
        
        // Notify parent component
        if (onPostCreated) {
          onPostCreated();
        }
      } else {
        throw new Error('Post creation returned no data');
      }
    } catch (error) {
      toast({
        title: "Error creating post",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageButtonClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };
  
  const handleVideoButtonClick = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Use FileReader to convert to base64 for reliable storage
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (reader.result) {
        const resultString = reader.result.toString();
        
        // Add the new attachment
        setAttachments([...attachments, resultString]);
        
        // Save current content, attachments, and tags to draft
        import('@/lib/draft-utils').then(({ saveDraft }) => {
          const draftData = JSON.stringify({
            content,
            attachments: [...attachments, resultString],
            tags
          });
          saveDraft('platform', platform, draftData);
        });
      }
    };
    reader.readAsDataURL(file);
    
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={user.profilePicture || ""} 
            alt={user.displayName || "User"} 
            className="object-cover" 
          />
          <AvatarFallback className="text-xs bg-primary text-white">
            {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : user.username?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder={placeholder}
            minHeight="100px"
            showSubmitButton={false}
            autosave={true}
            draftType="platform"
            draftId={platform}
            onDraftFound={(draftContent) => {
              try {
                // Try to parse as JSON (for newer drafts with attachments and tags)
                const draftData = JSON.parse(draftContent);
                setContent(draftData.content || draftContent);
                
                // Restore attachments if available
                if (draftData.attachments && Array.isArray(draftData.attachments)) {
                  setAttachments(draftData.attachments);
                }
                
                // Restore tags if available
                if (draftData.tags && Array.isArray(draftData.tags)) {
                  setTags(draftData.tags);
                  if (draftData.tags.length > 0) {
                    setShowTagInput(true);
                  }
                }
              } catch (e) {
                // For older drafts or simple string content
                setContent(draftContent);
              }
              
              toast({
                title: "Draft restored",
                description: "Your previous unsaved post has been restored.",
              });
            }}
          />
          
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((url, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={url} 
                    alt={`Attachment ${index}`} 
                    className="h-16 w-16 object-cover rounded"
                  />
                  <button 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Tag input */}
          {(showTagInput || tags.length > 0) && (
            <div className="my-3">
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder="Add a tag..."
                size="default"
              />
            </div>
          )}
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex space-x-2">
              {/* Keep hidden inputs but make tag button visible */}
              <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                onChange={(e) => handleFileChange(e, 'image')}
                className="hidden"
                id="image-input"
              />
              <input
                type="file"
                accept="video/*"
                ref={videoInputRef}
                onChange={(e) => handleFileChange(e, 'video')}
                className="hidden"
                id="video-input"
              />
              <Button
                type="button"
                variant={showTagInput ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setShowTagInput(!showTagInput)}
              >
                <FaHashtag size={14} />
                <span>Tags</span>
              </Button>
            </div>
            <Button
              onClick={handlePost}
              disabled={isPosting || !content.trim()}
              className="px-4 py-2 rounded-full font-medium flex items-center"
              style={{ backgroundColor: buttonColor }}
            >
              {isPosting ? (
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : buttonIcon && (
                <i className={`${buttonIcon} mr-2`}></i>
              )}
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
