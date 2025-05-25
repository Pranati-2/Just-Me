import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/new-user-context';
import { useToast } from '@/hooks/use-toast';
import { getPosts, createPost, deletePost } from '@/lib/storage';
import { copyFormattedContent } from '@/lib/copy-utils';
import { MediaContent } from '@/components/common/media-content';
import { Post } from '@shared/schema';
import PostTags from '@/components/posts/post-tags';
import { formatDistanceToNow } from 'date-fns';
import { FaYoutube, FaSearch, FaLink, FaShareAlt, FaDownload, FaTrash, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import TabNavigation from '@/components/layout/tab-navigation';
import SimplePostEditor from '@/components/posts/simple-post-editor';
import SocialSharePopup from '@/components/posts/social-share-popup';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { getDraft, saveDraft, clearDraft } from '@/lib/draft-utils';
import { CopyExportActions } from '@/components/common/copy-export-actions';

export default function YouTube() {
  const { user } = useUser();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [videoTags, setVideoTags] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<number | null>(null);

  useEffect(() => {
    loadPosts();
    
    // Check for saved draft values
    const savedUrl = getDraft('platform_form', 'youtube_url');
    const savedTitle = getDraft('platform_form', 'youtube_title');
    const savedDescription = getDraft('platform_form', 'youtube_description');
    const savedTags = getDraft('platform_form', 'youtube_tags');
    
    // Check if we have any saved drafts
    const hasDrafts = savedUrl || savedTitle || savedDescription || savedTags;
    
    if (savedUrl) setVideoUrl(savedUrl);
    if (savedTitle) setVideoTitle(savedTitle);
    if (savedDescription) setVideoDescription(savedDescription);
    if (savedTags) {
      try {
        const parsedTags = JSON.parse(savedTags);
        if (Array.isArray(parsedTags)) {
          setVideoTags(parsedTags);
        }
      } catch (error) {
        console.error('Error parsing saved tags:', error);
      }
    }
    
    // Notify user of restored draft if any content was loaded
    if (hasDrafts) {
      toast({
        title: "Draft restored",
        description: "Your previously unsaved changes have been restored.",
      });
    }
    
    // If we have a URL, trigger the URL change handler to load preview
    if (savedUrl) {
      try {
        const url = new URL(savedUrl);
        let videoId = '';
        
        if (url.hostname === 'youtu.be') {
          videoId = url.pathname.substring(1);
        } else if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
          videoId = url.searchParams.get('v') || '';
        }
        
        if (videoId) {
          setVideoPreview(`https://www.youtube.com/embed/${videoId}`);
        }
      } catch (error) {
        // Invalid URL, just ignore
      }
    }
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const youtubePosts = await getPosts('youtube');
      setPosts(youtubePosts);
    } catch (error) {
      console.error('Error loading YouTube posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setVideoUrl(newUrl);
    
    // Save to draft
    saveDraft('platform_form', 'youtube_url', newUrl);
    
    // Extract video ID from YouTube URL
    try {
      // Check if we have a valid URL first
      if (!newUrl || !newUrl.includes('youtube.com') && !newUrl.includes('youtu.be')) {
        setVideoPreview(null);
        return;
      }
      
      // Try to extract the video ID using URL parsing
      const url = new URL(newUrl);
      let videoId = '';
      
      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.substring(1);
      } else if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
        videoId = url.searchParams.get('v') || '';
      }
      
      // If we got a video ID, set the preview
      if (videoId) {
        setVideoPreview(`https://www.youtube.com/embed/${videoId}`);
      } else {
        // Try regex as backup extraction method
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = newUrl.match(regExp);
        if (match && match[7].length === 11) {
          videoId = match[7];
          setVideoPreview(`https://www.youtube.com/embed/${videoId}`);
        } else {
          setVideoPreview(null);
        }
      }
    } catch (error) {
      // URL parsing failed, but let's allow posting anyway
      console.error('Error parsing YouTube URL:', error);
      setVideoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to post videos.",
        variant: "destructive",
      });
      return;
    }
    
    if (!videoUrl) {
      toast({
        title: "Missing video URL",
        description: "Please enter a YouTube video URL.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create embed HTML
      let embedHtml = '';
      if (videoPreview) {
        embedHtml = `<iframe width="100%" height="100%" src="${videoPreview}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
      
      const html = `
        <div>
          ${embedHtml}
          <p>${videoDescription}</p>
        </div>
      `;
      
      await createPost('youtube', {
        userId: user.id,
        platform: 'youtube',
        content: videoDescription || videoUrl,
        formattedContent: { 
          html,
          videoUrl: videoUrl || undefined,
          embedUrl: videoPreview || undefined,
          title: videoTitle || 'New Video'
        },
        mediaUrls: [videoUrl],
        tags: videoTags
      });
      
      // Reset form
      setVideoUrl('');
      setVideoTitle('');
      setVideoDescription('');
      setVideoTags([]);
      setVideoPreview(null);
      
      // Clear all saved drafts
      clearDraft('platform_form', 'youtube_url');
      clearDraft('platform_form', 'youtube_title');
      clearDraft('platform_form', 'youtube_description');
      clearDraft('platform_form', 'youtube_tags');
      
      // Refresh posts
      await loadPosts();
      
      toast({
        title: 'Video shared',
        description: 'Your video has been posted successfully.',
      });
    } catch (error) {
      console.error('Error sharing video:', error);
      toast({
        title: 'Error',
        description: 'Failed to share video. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePostConfirm = (postId: number) => {
    setConfirmDeletePostId(postId);
  };
  
  const handleDeletePost = async () => {
    if (!confirmDeletePostId) return;
    
    try {
      await deletePost('youtube', confirmDeletePostId);
      setPosts(posts.filter(post => post.id !== confirmDeletePostId));
      setConfirmDeletePostId(null);
      toast({
        title: 'Video deleted',
        description: 'Your video has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = (postId: number) => {
    setShowShareOptions(showShareOptions === postId ? null : postId);
  };

  const handleCopy = async (post: Post) => {
    const formattedContent = post.formattedContent as { title?: string } || {};
    const title = formattedContent.title || 'YouTube Video';
    const videoUrl = post.mediaUrls?.[0] || '';
    const description = post.content || '';
    
    // Format the content to be copied with proper HTML formatting
    let htmlContent = null;
    if (post.formattedContent?.html) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = post.formattedContent.html;
      
      // Remove all iframes and images but keep their descriptions
      const iframes = tempDiv.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        const textNode = document.createTextNode(`[Video: ${title}]\n${videoUrl}`);
        iframe.parentNode?.replaceChild(textNode, iframe);
      });
      
      // Remove any images that might be present
      const images = tempDiv.querySelectorAll('img');
      images.forEach(img => {
        const altText = img.getAttribute('alt');
        if (altText) {
          const textNode = document.createTextNode(`[Image: ${altText}]`);
          img.parentNode?.replaceChild(textNode, img);
        } else {
          img.remove();
        }
      });
      
      htmlContent = tempDiv.innerHTML;
    }

    // Use copyFormattedContent utility to preserve formatting
    const success = await copyFormattedContent(
      htmlContent, 
      `${title}\n${videoUrl}\n\n${description}`
    );
    
    if (success) {
      toast({
        title: 'Copied',
        description: 'Video information copied to clipboard.',
      });
    } else {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleShareOnPlatform = (platform: string, post: Post) => {
    const videoUrl = post.mediaUrls?.[0] || '';
    const formattedContent = post.formattedContent as { title?: string } || {};
    const title = formattedContent.title || 'Check out this video';
    
    let url = '';
    
    switch(platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(title + ' ' + videoUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(videoUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(videoUrl)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
    
    setShowShareOptions(null);
  };
  
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };
  
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingPost(null);
  };
  
  const handlePostUpdated = async () => {
    await loadPosts();
    setIsEditDialogOpen(false);
    setEditingPost(null);
    toast({
      title: "Video updated",
      description: "Your video has been updated successfully."
    });
  };
  
  // Share popup positioning refs
  const [postShareRefs, setPostShareRefs] = useState<{[key: number]: React.RefObject<HTMLButtonElement>}>({});
  const [sharePopupPosition, setSharePopupPosition] = useState<{top: number, left: number}>({top: 0, left: 0});
  
  // Create refs for all posts when they load
  useEffect(() => {
    const refs: {[key: number]: React.RefObject<HTMLButtonElement>} = {};
    posts.forEach(post => {
      refs[post.id] = React.createRef<HTMLButtonElement>();
    });
    setPostShareRefs(refs);
  }, [posts]);
  
  const handleSharePost = (post: Post) => {
    setSharingPost(post);
    
    // Position the popup
    const buttonRef = postShareRefs[post.id];
    if (buttonRef && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setSharePopupPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
    
    setIsShareDialogOpen(true);
  };
  
  const handleShareComplete = () => {
    toast({
      title: 'Video shared',
      description: 'Your video has been shared successfully.',
    });
  };
  
  const handleShareDialogClose = () => {
    setIsShareDialogOpen(false);
    setSharingPost(null);
  };

  // Filter posts based on search query
  const filteredPosts = searchQuery
    ? posts.filter(
        post => {
          const formattedContent = post.formattedContent as { title?: string } || {};
          const lowerSearchQuery = searchQuery.toLowerCase();
          
          // Search in title, content, and tags
          return (
            formattedContent.title?.toLowerCase().includes(lowerSearchQuery) || 
            post.content.toLowerCase().includes(lowerSearchQuery) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerSearchQuery)))
          );
        }
      )
    : posts;

  const extractVideoId = (url: string) => {
    try {
      // First try using URL object
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.substring(1);
      } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        return urlObj.searchParams.get('v');
      }
      
      // If URL parsing doesn't give us a video ID, try regex
      if (!url) return null;
      
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[7] && match[7].length === 11) {
        return match[7];
      }
    } catch (error) {
      console.error('Error extracting YouTube video ID:', error);
      
      // Try regex as a fallback if URL parsing fails
      if (!url) return null;
      
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[7] && match[7].length === 11) {
        return match[7];
      }
    }
    return null;
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <FaYoutube size={20} />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-800">YouTube</h1>
            </div>
            <div className="ml-12 relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" size={14} />
              </div>
              <Input 
                type="text" 
                placeholder="Search videos..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-medium mb-4">Share a YouTube Video</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube Video URL
                  </label>
                  <div className="flex">
                    <Input
                      id="videoUrl"
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={handleVideoUrlChange}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="ml-2"
                      onClick={() => setVideoPreview(null)}
                      disabled={!videoPreview}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                {videoPreview && (
                  <div className="border rounded-md overflow-hidden aspect-video">
                    <iframe 
                      src={videoPreview} 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
                
                <div>
                  <label htmlFor="videoTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Title (optional)
                  </label>
                  <Input
                    id="videoTitle"
                    type="text"
                    placeholder="Video title"
                    value={videoTitle}
                    onChange={(e) => {
                      setVideoTitle(e.target.value);
                      saveDraft('platform_form', 'youtube_title', e.target.value);
                    }}
                  />
                </div>
                
                <div>
                  <label htmlFor="videoDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <Textarea
                    id="videoDescription"
                    placeholder="Add a description..."
                    value={videoDescription}
                    onChange={(e) => {
                      setVideoDescription(e.target.value);
                      saveDraft('platform_form', 'youtube_description', e.target.value);
                    }}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (optional)
                  </label>
                  <PostTags 
                    tags={videoTags} 
                    onChange={(tags) => {
                      setVideoTags(tags);
                      // We can't directly save tags since they're an array
                      saveDraft('platform_form', 'youtube_tags', JSON.stringify(tags));
                    }} 
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={!videoUrl}
                    className="bg-red-600 hover:bg-red-700"
                    title="Share this YouTube video"
                  >
                    Share Video
                  </Button>
                </div>
              </form>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="mb-4 text-red-600">
                  <FaYoutube size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {searchQuery ? 'No search results found' : 'No videos yet'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? 'Try a different search term or clear your search'
                    : 'Share your first YouTube video using the form above!'}
                </p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const formattedContent = post.formattedContent as { embedUrl?: string, title?: string } || {};
                const embedUrl = formattedContent.embedUrl || 
                  (post.mediaUrls?.[0] ? `https://www.youtube.com/embed/${extractVideoId(post.mediaUrls[0])}` : null);
                
                return (
                  <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={user?.profilePicture || ""} 
                              alt={user?.displayName || "User"} 
                              className="object-cover"
                            />
                            <AvatarFallback className="text-sm bg-primary text-white">
                              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{formattedContent.title || "Video"}</h3>
                            <div className="flex items-center text-xs text-gray-500">
                              <span>{user?.displayName || user?.username || "User"}</span>
                              <span className="mx-1">•</span>
                              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relative group">
                          {post.userId === user?.id && (
                            <div className="flex">
                              <button className="text-gray-500 hover:text-gray-700 p-1 ml-1">
                                <i 
                                  className="ri-edit-line" 
                                  style={{ fontSize: '16px' }}
                                  onClick={() => handleEditPost(post)}
                                  title="Edit"
                                />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700 p-1">
                                <FaTrash 
                                  size={16} 
                                  onClick={() => handleDeletePostConfirm(post.id)}
                                  className="text-gray-400 hover:text-red-500"
                                  title="Delete"
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced video embed with playback controls and copy functionality */}
                    <div className="aspect-video bg-black relative group">
                      {embedUrl ? (
                        <>
                          <iframe 
                            src={embedUrl} 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                          ></iframe>
                          
                          {/* Interactive overlay for long-press/double-click */}
                          <div 
                            className="absolute inset-0 cursor-pointer opacity-0 z-10"
                            title="Double-click or long-press to copy video URL"
                            onDoubleClick={() => {
                              if (post.mediaUrls?.[0]) {
                                navigator.clipboard.writeText(post.mediaUrls[0]);
                                toast({
                                  title: 'Video URL copied',
                                  description: 'Link copied to clipboard.',
                                });
                              }
                            }}
                            onTouchStart={(e) => {
                              const timer = setTimeout(() => {
                                if (post.mediaUrls?.[0]) {
                                  navigator.clipboard.writeText(post.mediaUrls[0]);
                                  toast({
                                    title: 'Video URL copied',
                                    description: 'Link copied to clipboard.',
                                  });
                                }
                              }, 800);
                              // @ts-ignore
                              e.target._longPressTimer = timer;
                            }}
                            onTouchEnd={(e) => {
                              // @ts-ignore
                              clearTimeout(e.target._longPressTimer);
                            }}
                            onTouchCancel={(e) => {
                              // @ts-ignore
                              clearTimeout(e.target._longPressTimer);
                            }}
                          />
                          
                          {/* Visual indicator for copy functionality */}
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {navigator.userAgent.includes('Mobile') ? 'Long-press' : 'Double-click'} to copy
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <FaYoutube size={48} className="mx-auto mb-2" />
                            <span>Video preview not available</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {post.formattedContent?.html ? (
                        <div 
                          className="text-gray-800 mb-4" 
                          dangerouslySetInnerHTML={{ __html: post.formattedContent.html }}
                        />
                      ) : post.content && (
                        <p className="text-gray-800 mb-4">{post.content}</p>
                      )}
                      
                      {/* Tags display */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag, index) => (
                              <span 
                                key={index} 
                                className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-gray-500 border-t pt-3">
                        <div className="flex space-x-4">
                          <button 
                            className="flex items-center space-x-1 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md"
                            onClick={() => handleEditPost(post)}
                          >
                            <i className="ri-edit-line mr-1"></i>
                            <span className="text-sm">Edit</span>
                          </button>
                          <button 
                            ref={postShareRefs[post.id]}
                            className="flex items-center space-x-1 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-md"
                            onClick={() => handleSharePost(post)}
                          >
                            <i className="ri-share-line mr-1"></i>
                            <span className="text-sm">Share</span>
                          </button>
                        </div>
                        <div className="flex space-x-4">

                          
                          <div className="flex items-center space-x-1 hover:text-blue-600">
                            <button
                              onClick={() => handleCopy(post)}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md bg-blue-50"
                              title="Copy formatted text content"
                            >
                              <i className="ri-file-copy-line mr-1"></i>
                              <span className="text-sm">Copy Text</span>
                            </button>
                          </div>
                          
                          {post.mediaUrls?.[0] && (
                            <a 
                              href={post.mediaUrls[0]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 hover:text-blue-600"
                            >
                              <FaLink size={16} />
                              <span className="text-sm">Open</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Post Dialog */}
      {editingPost && (
        <SimplePostEditor
          post={editingPost}
          platform="youtube"
          isOpen={isEditDialogOpen}
          onClose={handleEditDialogClose}
          onPostUpdated={handlePostUpdated}
        />
      )}
      
      {/* Social Share Popup */}
      {isShareDialogOpen && sharingPost && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={handleShareDialogClose}></div>
          <SocialSharePopup
            post={sharingPost}
            isOpen={isShareDialogOpen}
            onClose={() => {
              handleShareDialogClose();
              handleShareComplete();
            }}
            position="vertical"
          />
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDeletePostId !== null}
        onClose={() => setConfirmDeletePostId(null)}
        onConfirm={handleDeletePost}
        title="Confirm Delete"
        description="Are you sure you want to delete this video? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </>
  );
}
