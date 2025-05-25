import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/new-user-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import TabNavigation from '@/components/layout/tab-navigation';
import PostComposer from '@/components/posts/post-composer';
import SimplePostEditor from '@/components/posts/simple-post-editor';
import SocialSharePopup from '@/components/posts/social-share-popup';
import { MediaContent } from '@/components/common/media-content';
import { getPosts, deletePost } from '@/lib/storage';
import { copyFormattedContent } from '@/lib/copy-utils';
import { Post } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { FaSearch, FaLink, FaShareAlt, FaTwitter, FaFacebook, FaWhatsapp } from 'react-icons/fa';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { CopyExportActions } from '@/components/common/copy-export-actions';

export default function Instagram() {
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareOptions, setShowShareOptions] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<number | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        const instagramPosts = await getPosts('instagram');
        setPosts(instagramPosts);
      } catch (error) {
        console.error('Error loading Instagram posts:', error);
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

  const handlePostCreated = async () => {
    try {
      const instagramPosts = await getPosts('instagram');
      setPosts(instagramPosts);
    } catch (error) {
      console.error('Error refreshing Instagram posts:', error);
    }
  };

  const handleDeletePostConfirm = (postId: number) => {
    setConfirmDeletePostId(postId);
  };
  
  const handleDeletePost = async () => {
    if (!confirmDeletePostId) return;
    
    try {
      await deletePost('instagram', confirmDeletePostId);
      setPosts(posts.filter(post => post.id !== confirmDeletePostId));
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

  // Helper to extract image from HTML content
  const extractImage = (htmlContent: string): string | null => {
    // More robust regex that can handle various attributes and quotation styles
    const imgRegex = /<img[^>]*src=['"](.*?)['"][^>]*>/;
    const match = htmlContent.match(imgRegex);
    console.log('Extracted image from HTML:', match?.[1] || 'none found', 'from HTML:', htmlContent);
    return match ? match[1] : null;
  };
  
  const handleShare = (postId: number) => {
    setShowShareOptions(showShareOptions === postId ? null : postId);
  };
  
  const handleCopy = async (post: Post) => {
    // Use our new copyFormattedContent utility to preserve formatting
    const success = await copyFormattedContent(
      post.formattedContent?.html || null, 
      post.content || ''
    );
    
    if (success) {
      toast({
        title: 'Copied',
        description: post.formattedContent?.html 
          ? 'Post copied with formatting.' 
          : 'Post content copied to clipboard.',
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
    const imageUrl = extractImage(post.formattedContent?.html || '');
    const postContent = post.content || '';
    
    let url = '';
    
    switch(platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(postContent + ' ' + (imageUrl || ''))}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postContent)}&url=${encodeURIComponent(imageUrl || '')}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl || '')}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent('Instagram Post')}&body=${encodeURIComponent(postContent + '\n\n' + (imageUrl || ''))}`;
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
    try {
      const instagramPosts = await getPosts('instagram');
      setPosts(instagramPosts);
      setIsEditDialogOpen(false);
      setEditingPost(null);
      toast({
        title: "Post updated",
        description: "Your post has been updated successfully."
      });
    } catch (error) {
      console.error('Error refreshing Instagram posts:', error);
    }
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
      title: 'Post shared',
      description: 'Your post has been shared successfully.',
    });
  };
  
  const handleShareDialogClose = () => {
    setIsShareDialogOpen(false);
    setSharingPost(null);
  };
  
  // Filter posts based on search query
  const filteredPosts = searchQuery
    ? posts.filter(
        post => post.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">
                <radialGradient id="instaGrad" cx="19.38" cy="42.035" r="44.899" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stop-color="#fd5"></stop>
                  <stop offset=".328" stop-color="#ff543f"></stop>
                  <stop offset=".348" stop-color="#fc5245"></stop>
                  <stop offset=".504" stop-color="#e64771"></stop>
                  <stop offset=".643" stop-color="#d53e91"></stop>
                  <stop offset=".761" stop-color="#cc39a4"></stop>
                  <stop offset=".841" stop-color="#c837ab"></stop>
                </radialGradient>
                <path fill="url(#instaGrad)" d="M34.017,41.99l-20,0.019c-4.4,0.004-8.003-3.592-8.008-7.992l-0.019-20    c-0.004-4.4,3.592-8.003,7.992-8.008l20-0.019c4.4-0.004,8.003,3.592,8.008,7.992l0.019,20 C42.014,38.383,38.417,41.986,34.017,41.99z"></path>
                <path fill="#fff" d="M24,31c-3.859,0-7-3.14-7-7s3.141-7,7-7s7,3.14,7,7S27.859,31,24,31z M24,19c-2.757,0-5,2.243-5,5     s2.243,5,5,5s5-2.243,5-5S26.757,19,24,19z"></path>
                <circle cx="31.5" cy="16.5" r="1.5" fill="#fff"></circle>
                <path fill="#fff" d="M30,37H18c-3.859,0-7-3.14-7-7V18c0-3.86,3.141-7,7-7h12c3.859,0,7,3.14,7,7v12       C37,33.86,33.859,37,30,37z M18,13c-2.757,0-5,2.243-5,5v12c0,2.757,2.243,5,5,5h12c2.757,0,5-2.243,5-5V18c0-2.757-2.243-5-5-5H18z"></path>
              </svg>
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-800">Instagram</h1>
          </div>
          <div className="ml-12 relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" size={14} />
            </div>
            <Input 
              type="text" 
              placeholder="Search posts..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          <PostComposer
            platform="instagram"
            onPostCreated={handlePostCreated}
            placeholder="Share a photo or story..."
            buttonText="Share"
            buttonColor="#E4405F"
            buttonIcon="ri-instagram-line"
          />

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-4 text-pink-500">
                <i className="ri-instagram-line text-5xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchQuery ? 'No search results found' : 'No posts yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try a different search term or clear your search'
                  : 'Share photos and stories with your followers!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-full overflow-hidden">
              {filteredPosts.map(post => {
                const imageUrl = extractImage(post.formattedContent?.html || '');
                
                return (
                  <div key={post.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage 
                              src={user?.profilePicture || ""} 
                              alt={user?.displayName || "User"} 
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs bg-primary text-white">
                              {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.username?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{user?.displayName || "User"}</span>
                        </div>
                        <div className="relative group">
                          <button className="text-gray-500 hover:text-gray-700">
                            <i className="ri-more-line"></i>
                          </button>
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                            {post.userId === user?.id && (
                              <>
                                <button 
                                  className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 flex items-center"
                                  onClick={() => handleEditPost(post)}
                                >
                                  <i className="ri-edit-line mr-2"></i>
                                  Edit Post
                                </button>
                                <button 
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                                  onClick={() => handleDeletePostConfirm(post.id)}
                                >
                                  <i className="ri-delete-bin-line mr-2"></i>
                                  Delete Post
                                </button>
                              </>
                            )}
                            <div className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 overflow-hidden">
                              <div className="max-w-full overflow-hidden">
                                <CopyExportActions
                                  title="Instagram Post"
                                  content={post.content}
                                  post={post}
                                  isHtml={!!post.formattedContent?.html}
                                  showExport={false}
                                  iconOnly={false}
                                  size="sm"
                                />
                              </div>
                            </div>
                            <button 
                              ref={postShareRefs[post.id]}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 flex items-center"
                              onClick={() => handleSharePost(post)}
                            >
                              <i className="ri-share-line mr-2"></i>
                              Share Post
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Post Image */}
                    {imageUrl ? (
                      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        <MediaContent 
                          src={imageUrl} 
                          alt="Instagram Post" 
                          mediaType="image"
                          className="w-full h-full object-cover"
                          content={post.content}
                          formattedContent={post.formattedContent?.html || null}
                        />
                      </div>
                    ) : (
                      <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        <div className="text-gray-400 flex flex-col items-center">
                          <i className="ri-image-line text-4xl mb-2"></i>
                          <span className="text-sm">No image</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="p-3">
                      <div className="flex flex-wrap justify-between mb-2">
                        <div className="flex flex-wrap gap-2">
                          <button 
                            className="flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 sm:px-3 py-1.5 rounded-md transition-colors"
                            onClick={() => handleEditPost(post)}
                          >
                            <i className="ri-edit-line text-lg sm:mr-1"></i>
                            <span className="text-xs sm:text-sm font-medium">Edit</span>
                          </button>
                          {post.userId === user?.id && (
                            <button 
                              className="flex items-center bg-red-50 hover:bg-red-100 text-red-600 px-2 sm:px-3 py-1.5 rounded-md transition-colors"
                              onClick={() => handleDeletePostConfirm(post.id)}
                            >
                              <i className="ri-delete-bin-line text-lg sm:mr-1"></i>
                              <span className="text-xs sm:text-sm font-medium">Delete</span>
                            </button>
                          )}
                          <button 
                            className="flex items-center bg-pink-50 hover:bg-pink-100 text-pink-600 px-2 sm:px-3 py-1.5 rounded-md transition-colors"
                            onClick={() => handleSharePost(post)}
                          >
                            <i className="ri-share-line text-lg sm:mr-1"></i>
                            <span className="text-xs sm:text-sm font-medium">Share</span>
                          </button>
                          <button 
                            className="flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 px-2 sm:px-3 py-1.5 rounded-md transition-colors"
                            onClick={() => handleCopy(post)}
                          >
                            <i className="ri-file-copy-line text-lg sm:mr-1"></i>
                            <span className="text-xs sm:text-sm font-medium">Copy</span>
                          </button>
                        </div>
                        <div className="relative">
                          <button 
                            className="text-gray-800 hover:text-gray-600 transition-colors"
                            onClick={() => handleShare(post.id)}
                          >
                            <i className="ri-share-forward-line text-2xl"></i>
                          </button>
                          
                          {showShareOptions === post.id && (
                            <div className="absolute right-0 lg:right-auto lg:left-0 mt-2 bg-white rounded-md shadow-md p-2 z-10 w-auto max-w-[200px] overflow-hidden">
                              <div className="flex flex-col gap-2">
                                <button 
                                  className="flex items-center gap-2 text-left px-2 py-1.5 hover:bg-gray-100 rounded truncate"
                                  onClick={() => handleShareOnPlatform('twitter', post)}
                                >
                                  <FaTwitter size={14} className="text-sky-500 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm truncate">Share on Twitter</span>
                                </button>
                                <button 
                                  className="flex items-center gap-2 text-left px-2 py-1.5 hover:bg-gray-100 rounded truncate"
                                  onClick={() => handleShareOnPlatform('facebook', post)}
                                >
                                  <FaFacebook size={14} className="text-blue-600 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm truncate">Share on Facebook</span>
                                </button>
                                <button 
                                  className="flex items-center gap-2 text-left px-2 py-1.5 hover:bg-gray-100 rounded truncate"
                                  onClick={() => handleShareOnPlatform('whatsapp', post)}
                                >
                                  <FaWhatsapp size={14} className="text-green-500 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm truncate">Share on WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Caption */}
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{user?.displayName || "User"}</span>{' '}
                          <span dangerouslySetInnerHTML={{ 
                            __html: post.formattedContent?.html 
                              ? post.formattedContent.html.replace(/<img.*?>/, '') 
                              : post.content 
                          }} />
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Post Dialog */}
      {editingPost && (
        <SimplePostEditor
          post={editingPost}
          platform="instagram"
          isOpen={isEditDialogOpen}
          onClose={handleEditDialogClose}
          onPostUpdated={handlePostUpdated}
        />
      )}
      
      {/* Social Share Popup */}
      {isShareDialogOpen && sharingPost && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => {
            handleShareDialogClose();
            handleShareComplete();
          }}></div>
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
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
