import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/new-user-context';
import { useToast } from '@/hooks/use-toast';
import TabNavigation from '@/components/layout/tab-navigation';
import PostComposer from '@/components/posts/post-composer';
import PostEditor from '@/components/posts/post-editor';
import SocialSharePopup from '@/components/posts/social-share-popup';
import { getPosts, deletePost } from '@/lib/storage';
import { copyFormattedContent } from '@/lib/copy-utils';
import { Post } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { SearchBar } from '@/components/ui/search-bar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { MediaContent } from '@/components/common/media-content';

// Helper function to check if HTML contains an image and extract it
function extractImage(html: string): string | null {
  if (!html) return null;
  const div = document.createElement('div');
  div.innerHTML = html;
  const img = div.querySelector('img');
  return img ? img.src : null;
}

export default function Facebook() {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<number | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const facebookPosts = await getPosts('facebook');
        setPosts(facebookPosts);
        setFilteredPosts(facebookPosts);
      } catch (error) {
        console.error('Error loading Facebook posts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load posts. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) {
      loadPosts();
    }
  }, [userLoading, user?.profilePicture, user?.displayName]);
  
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredPosts(posts);
      return;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const results = posts.filter(post => 
      post.content.toLowerCase().includes(lowerCaseQuery) ||
      post.formattedContent?.html?.toLowerCase().includes(lowerCaseQuery)
    );
    
    setFilteredPosts(results);
  };

  const handlePostCreated = async () => {
    try {
      const facebookPosts = await getPosts('facebook');
      setPosts(facebookPosts);
      setFilteredPosts(facebookPosts);
    } catch (error) {
      console.error('Error refreshing Facebook posts:', error);
    }
  };

  const handleDeletePostConfirm = (postId: number) => {
    setConfirmDeletePostId(postId);
  };
  
  const handleDeletePost = async () => {
    if (!confirmDeletePostId) return;
    
    try {
      await deletePost('facebook', confirmDeletePostId);
      const updatedPosts = posts.filter(post => post.id !== confirmDeletePostId);
      setPosts(updatedPosts);
      setFilteredPosts(updatedPosts);
      toast({
        title: 'Post deleted',
        description: 'Your post has been deleted successfully.',
      });
      setConfirmDeletePostId(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post. Please try again.',
        variant: 'destructive',
      });
      setConfirmDeletePostId(null);
    }
  };

  // Handle edit post
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };

  // Handle post edit completed
  const handlePostUpdated = async () => {
    setIsEditDialogOpen(false);
    setEditingPost(null);
    await handlePostCreated();
  };
  
  // Share popup positioning refs
  const [postShareRefs, setPostShareRefs] = useState<{[key: number]: React.RefObject<HTMLDivElement>}>({});
  const [sharePopupPosition, setSharePopupPosition] = useState<{top: number, left: number}>({top: 0, left: 0});
  
  // Create refs for all posts when they load
  useEffect(() => {
    const refs: {[key: number]: React.RefObject<HTMLDivElement>} = {};
    posts.forEach(post => {
      refs[post.id] = React.createRef<HTMLDivElement>();
    });
    setPostShareRefs(refs);
  }, [posts]);
  
  // Handle share post
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

  // Handle share completed
  const handleShareComplete = () => {
    setIsShareDialogOpen(false);
    setSharingPost(null);
    toast({
      title: 'Post shared',
      description: 'Your post has been shared successfully.',
    });
  };
  
  // Handle copying post with formatted content preserved but without images
  const handleCopy = async (post: Post) => {
    let formattedHtml = post.formattedContent?.html || null;
    
    // Remove images from HTML content if present
    if (formattedHtml) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formattedHtml;
      
      // Remove all images but keep their alt text
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
      
      // Use the cleaned HTML without images
      formattedHtml = tempDiv.innerHTML;
    }
    
    const success = await copyFormattedContent(
      formattedHtml, 
      post.content || ''
    );
    
    if (success) {
      toast({
        title: 'Copied',
        description: 'Post content copied to clipboard (without images).',
      });
    } else {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  // Extract image from HTML content if available
  const extractImage = (htmlContent: string): string | null => {
    const imgRegex = /<img.*?src="(.*?)".*?>/;
    const match = htmlContent.match(imgRegex);
    return match ? match[1] : null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">
                <path fill="#1877F2" d="M24,4C12.954,4,4,12.954,4,24s8.954,20,20,20s20-8.954,20-20S35.046,4,24,4z"/>
                <path fill="#fff" d="M26.707,29.301h5.176l0.813-5.258h-5.989v-2.874c0-2.184,0.714-4.121,2.757-4.121h3.283V12.46 c-0.577-0.078-1.797-0.248-4.102-0.248c-4.814,0-7.636,2.542-7.636,8.334v3.498H16.06v5.258h4.948v14.452 C21.988,43.9,22.981,44,24,44c0.921,0,1.82-0.084,2.707-0.204V29.301z"/>
              </svg>
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-800">Facebook</h1>
          </div>
          <div className="ml-12 relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={14} />
            </div>
            <Input 
              type="text" 
              placeholder="Search posts..." 
              className="pl-10"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          <PostComposer
            platform="facebook"
            onPostCreated={handlePostCreated}
            placeholder="What's on your mind?"
            buttonText="Post"
            buttonColor="#1877F2"
          />

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-4 text-blue-600">
                <i className="ri-facebook-fill text-5xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No posts yet</h3>
              <p className="text-gray-600">
                Share updates, photos, and thoughts with your friends!
              </p>
            </div>
          ) : (
            posts.map(post => {
              const imageUrl = extractImage(post.formattedContent?.html || '');
              
              return (
                <div key={post.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={user?.profilePicture || ""} 
                          alt={user?.displayName || "User"} 
                          className="object-cover"
                        />
                        <AvatarFallback className="text-xs bg-primary text-white">
                          {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.username?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <span className="font-bold text-sm">{user?.displayName || "User"}</span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="relative group">
                      <button className="text-gray-500 hover:text-gray-700">
                        <i className="ri-more-line"></i>
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                        <button 
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                          onClick={() => handleDeletePostConfirm(post.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Post
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {/* Display post content with images intact and interactive image copying */}
                    {post.formattedContent?.html && extractImage(post.formattedContent.html) ? (
                      <div className="relative">
                        <div 
                          dangerouslySetInnerHTML={{ __html: post.formattedContent.html }} 
                          className="break-words"
                        />
                        
                        {/* Overlay for double-click and long-press on images */}
                        <div 
                          className="absolute inset-0 cursor-pointer"
                          onDoubleClick={() => {
                            // Extract and copy the image when double-clicked
                            const imgSrc = extractImage(post.formattedContent?.html || '');
                            if (imgSrc) {
                              // Create a temporary image to draw to canvas
                              const img = new Image();
                              img.crossOrigin = "anonymous";
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.naturalWidth;
                                canvas.height = img.naturalHeight;
                                const ctx = canvas.getContext('2d');
                                
                                if (ctx) {
                                  ctx.drawImage(img, 0, 0);
                                  canvas.toBlob((blob) => {
                                    if (blob) {
                                      try {
                                        const data = [new ClipboardItem({ [blob.type]: blob })];
                                        navigator.clipboard.write(data)
                                          .then(() => {
                                            toast({
                                              title: 'Image copied',
                                              description: 'Image copied to clipboard',
                                            });
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
                                        toast({
                                          title: 'Copy not supported',
                                          description: 'Your browser doesn\'t support copying images',
                                          variant: 'destructive',
                                        });
                                      }
                                    }
                                  }, 'image/png');
                                }
                              };
                              
                              img.onerror = () => {
                                toast({
                                  title: 'Copy failed',
                                  description: 'Unable to load the image for copying',
                                  variant: 'destructive',
                                });
                              };
                              
                              img.src = imgSrc;
                            }
                          }}
                          onTouchStart={(e) => {
                            // Set up long press for mobile
                            const timer = setTimeout(() => {
                              // Extract and copy the image after long press
                              const imgSrc = extractImage(post.formattedContent?.html || '');
                              if (imgSrc) {
                                navigator.clipboard.writeText(imgSrc)
                                  .then(() => {
                                    toast({
                                      title: 'Image URL copied',
                                      description: 'Image URL copied to clipboard',
                                    });
                                  })
                                  .catch(() => {
                                    toast({
                                      title: 'Copy failed',
                                      description: 'Unable to copy to clipboard',
                                      variant: 'destructive',
                                    });
                                  });
                              }
                            }, 800); // 800ms long press to trigger
                            
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
                        
                        <div className="mt-1 text-xs text-gray-500">
                          Double-click/long-press the image to copy it directly
                        </div>
                      </div>
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: post.formattedContent?.html || post.content }}
                        className="break-words"
                      />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-200">

                  </div>

                  <div className="mt-2 pt-1 flex justify-between text-gray-600">
                    <button 
                      className="flex items-center py-1 px-2 hover:bg-gray-100 rounded"
                      onClick={() => handleEditPost(post)}
                    >
                      <i className="ri-edit-line mr-1"></i>
                      <span className="text-sm">Edit</span>
                    </button>
                    <div className="flex items-center py-1 px-2 hover:bg-green-100 rounded text-green-600">
                      <button
                        onClick={() => handleCopy(post)}
                        className="flex items-center space-x-1 text-green-600" 
                        title="Copy formatted text (without images)"
                      >
                        <i className="ri-file-copy-line text-lg"></i>
                        <span className="text-sm">Copy</span>
                      </button>
                    </div>
                    <div ref={postShareRefs[post.id]} className="relative">
                      <button 
                        className="flex items-center py-1 px-2 hover:bg-gray-100 rounded mt-0.5"
                        onClick={() => handleSharePost(post)}
                      >
                        <i className="ri-share-forward-line mr-1"></i>
                        <span className="text-sm">Share</span>
                      </button>
                    </div>
                    {post.userId === user?.id && (
                      <button 
                        className="flex items-center py-1 px-2 hover:bg-red-100 rounded text-red-500"
                        onClick={() => handleDeletePostConfirm(post.id)}
                      >
                        <i className="ri-delete-bin-line mr-1"></i>
                        <span className="text-sm">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Post Dialog */}
      {isEditDialogOpen && editingPost && (
        <PostEditor
          post={editingPost}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onPostUpdated={handlePostUpdated}
          platform="facebook"
        />
      )}

      {/* Social Share Popup */}
      {isShareDialogOpen && sharingPost && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => {
            setIsShareDialogOpen(false);
            handleShareComplete();
          }}></div>
          <SocialSharePopup
            post={sharingPost}
            isOpen={isShareDialogOpen}
            onClose={() => {
              setIsShareDialogOpen(false);
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
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
