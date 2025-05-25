import React, { useState, useEffect } from 'react';
import { FaLinkedin, FaSearch } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@shared/schema';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import PostComposer from '@/components/posts/post-composer';
import PostEditor from '@/components/posts/post-editor';
import SocialSharePopup from '@/components/posts/social-share-popup';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { MediaContent } from '@/components/common/media-content';
import { copyFormattedContent, extractImagesFromHtml } from '@/lib/copy-utils';
import { getPosts, createPost, updatePost, deletePost } from '@/lib/storage';

// Debug - log when module loads
console.log('LinkedIn page module loading');

// Check LinkedIn posts in localForage directly
const checkAndInitializeLinkedInPosts = async () => {
  try {
    console.log('Checking LinkedIn posts directly...');
    const posts = await getPosts('linkedin');
    console.log('LinkedIn posts from direct check:', posts);
    
    // If no posts exist, create a test post
    if (posts.length === 0) {
      console.log('No LinkedIn posts found, creating test post...');
      const testPost = {
        userId: 1,
        platform: 'linkedin',
        content: 'This is a test LinkedIn post. You can edit or delete this.',
        formattedContent: {
          html: '<p>This is a test LinkedIn post. You can edit or delete this.</p>',
          userName: 'Test User',
          userDesignation: 'Software Developer',
          userProfilePic: ''
        },
        tags: ['test', 'linkedin'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await createPost(testPost.platform, testPost);
      return await getPosts('linkedin');
    }
    
    return posts;
  } catch (error) {
    console.error('Error in checkAndInitializeLinkedInPosts:', error);
    return [];
  }
};

// Run the check immediately
checkAndInitializeLinkedInPosts();

export default function LinkedIn() {
  console.log('LinkedIn component rendering');
  const { user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<number | null>(null);
  
  // This effect runs once on mount to set initial posts
  useEffect(() => {
    // Use our pre-initialized posts
    checkAndInitializeLinkedInPosts().then(initialPosts => {
      console.log('Setting initial posts from pre-check:', initialPosts);
      setPosts(initialPosts);
      setIsLoading(false);
    });
  }, []);

  // Call load posts immediately on first render
  useEffect(() => {
    console.log('LinkedIn useEffect - initial page load');
    
    // Define the load function
    const loadLinkedInPosts = async () => {
      console.log('Loading LinkedIn posts');
      try {
        // Force loading to true
        setIsLoading(true);
        
        // Clear timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
          console.log('Safety timeout triggered');
          setIsLoading(false);
        }, 5000);
        
        // Directly call localForage to get posts
        console.log('Calling getPosts("linkedin")');
        const linkedInPosts = await getPosts('linkedin');
        
        // Clear safety timeout
        clearTimeout(safetyTimeout);
        
        console.log('LinkedIn posts loaded:', linkedInPosts);
        setPosts(linkedInPosts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading posts:', error);
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'There was an error loading your posts. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    loadLinkedInPosts();
  }, [toast]);
  
  const reloadPosts = async () => {
    console.log('reloadPosts called');
    setIsLoading(true);
    try {
      const refreshedPosts = await getPosts('linkedin');
      setPosts(refreshedPosts);
    } catch (error) {
      console.error('Error reloading posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh posts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePostCreated = async () => {
    console.log('handlePostCreated called');
    await reloadPosts();
    // Post created successfully, no need for toast notification
  };

  // Show the confirmation dialog when delete is requested
  const confirmPostDelete = (postId: number) => {
    setConfirmDeletePostId(postId);
  };

  // Called when user confirms deletion in the modal
  const handleDeletePost = async () => {
    if (!confirmDeletePostId) return;
    
    console.log('handleDeletePost called with ID:', confirmDeletePostId);
    setIsLoading(true);
    try {
      const success = await deletePost('linkedin', confirmDeletePostId);
      if (success) {
        await reloadPosts();
        // Post deleted successfully, no need for toast notification
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setConfirmDeletePostId(null);
    }
  };
  
  const handleEditPost = (post: Post) => {
    console.log('handleEditPost called with post:', post);
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };
  
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingPost(null);
  };
  
  const handlePostUpdated = async () => {
    console.log('handlePostUpdated called');
    await reloadPosts();
    setIsEditDialogOpen(false);
    setEditingPost(null);
    // Post updated successfully, no need for toast notification
  };
  
  const handleSharePost = (post: Post) => {
    setSharingPost(post);
    setIsShareDialogOpen(true);
  };
  
  const handleShareDialogClose = () => {
    setIsShareDialogOpen(false);
    setSharingPost(null);
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

  // Filter posts based on search query
  const filteredPosts = searchQuery
    ? posts.filter(post => {
        const lowerSearchQuery = searchQuery.toLowerCase();
        
        // Search in content and formatted content if available
        return (
          post.content.toLowerCase().includes(lowerSearchQuery) ||
          (post.formattedContent?.html?.toLowerCase().includes(lowerSearchQuery)) ||
          (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerSearchQuery)))
        );
      })
    : posts;

  console.log('LinkedIn render with posts count:', posts.length);
    
  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* LinkedIn Header with Search Bar */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <FaLinkedin size={16} className="sm:text-lg" />
                </div>
                <h1 className="ml-2 sm:ml-3 text-lg sm:text-xl font-semibold text-gray-800">LinkedIn</h1>
              </div>
              <div className="w-full sm:ml-6 relative flex-1 max-w-full sm:max-w-md flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" size={14} />
                </div>
                <Input 
                  type="text" 
                  placeholder="Search posts..." 
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  className="ml-2 p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center"
                  onClick={reloadPosts}
                  title="Refresh posts"
                >
                  <i className="ri-refresh-line text-base sm:text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            <PostComposer
              platform="linkedin"
              onPostCreated={handlePostCreated}
              placeholder="What do you want to talk about?"
              buttonText="Post"
              buttonColor="#0A66C2"
            />

            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="mb-4 text-blue-700">
                  <i className="ri-linkedin-fill text-5xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No posts yet</h3>
                <p className="text-gray-600">
                  Share your professional achievements or insights by posting to your LinkedIn profile!
                </p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="mb-4 text-blue-700">
                  <FaLinkedin size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  No search results found
                </h3>
                <p className="text-gray-600">
                  Try a different search term or clear your search
                </p>
              </div>
            ) : (
              filteredPosts.map(post => (
                <div key={post.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between">
                    <div className="flex items-start space-x-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={(post.formattedContent?.userProfilePic as string) || user?.profilePicture || ""} 
                          alt={(post.formattedContent?.userName as string) || user?.displayName || "User"} 
                          className="object-cover"
                        />
                        <AvatarFallback className="text-xs bg-primary text-white">
                          {(post.formattedContent && post.formattedContent.userName) ? 
                            (post.formattedContent.userName as string).split(' ').map(n => n[0]).join('').toUpperCase() : 
                            user?.displayName ? 
                              user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 
                              user?.username?.substring(0, 2).toUpperCase() || 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center">
                          <span className="font-bold text-sm">{(post.formattedContent?.userName as string) || user?.displayName || "User"}</span>
                          <span className="text-blue-500 ml-1">
                            <i className="ri-checkbox-circle-fill text-xs"></i>
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">{(post.formattedContent?.userDesignation as string) || user?.designation || "LinkedIn User"}</p>
                        <span className="text-gray-500 text-xs flex items-center">
                          <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                          <span className="mx-1">•</span>
                          <i className="ri-earth-line"></i>
                        </span>
                      </div>
                    </div>
                    <div className="relative group">
                      <button className="text-gray-500 hover:text-gray-700">
                        <i className="ri-more-line"></i>
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                        <button 
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => confirmPostDelete(post.id)}
                        >
                          Delete Post
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {/* Check if there are images in the HTML content */}
                    {post.formattedContent?.html && extractImagesFromHtml(post.formattedContent.html).length > 0 ? (
                      <div className="mb-2">
                        {extractImagesFromHtml(post.formattedContent.html).map((img, index) => (
                          <MediaContent 
                            key={index}
                            src={img}
                            alt={`LinkedIn post image ${index + 1}`}
                            mediaType="image"
                            className="max-h-72 rounded-lg mb-2"
                            content={post.content}
                            formattedContent={post.formattedContent?.html || null}
                          />
                        ))}
                        <div dangerouslySetInnerHTML={{ __html: post.formattedContent.html.replace(/<img[^>]*>/g, '') }} className="break-words" />
                      </div>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: post.formattedContent?.html || post.content }} className="break-words" />
                    )}
                  </div>

                  {/* Tags display */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}


                  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-2 text-gray-500">
                    <button 
                      className="flex items-center py-1 px-2 sm:px-3 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-600 font-medium border border-gray-200"
                      onClick={() => handleEditPost(post)}
                      title="Edit"
                    >
                      <i className="ri-edit-line mr-1"></i>
                      <span className="text-sm">Edit</span>
                    </button>
                    <button 
                      className="flex items-center py-1 px-2 sm:px-3 bg-green-50 hover:bg-green-100 rounded-md text-green-600 font-medium border border-green-100"
                      onClick={() => handleCopy(post)}
                      title="Copy"
                    >
                      <i className="ri-file-copy-line mr-1"></i>
                      <span className="text-sm">Copy</span>
                    </button>
                    <button 
                      className="flex items-center py-1 px-2 sm:px-3 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-600 font-medium border border-blue-100"
                      onClick={() => handleSharePost(post)}
                      title="Share"
                    >
                      <i className="ri-share-forward-line mr-1"></i>
                      <span className="text-sm">Share</span>
                    </button>
                    <button 
                      className="flex items-center py-1 px-2 sm:px-3 bg-red-50 hover:bg-red-100 rounded-md text-red-600 font-medium border border-red-100"
                      onClick={() => confirmPostDelete(post.id)}
                      title="Delete"
                    >
                      <i className="ri-delete-bin-line mr-1"></i>
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Dialog */}
      {editingPost && (
        <PostEditor
          post={editingPost}
          platform="linkedin"
          isOpen={isEditDialogOpen}
          onClose={handleEditDialogClose}
          onPostUpdated={handlePostUpdated}
        />
      )}
      
      {/* Share Dialog */}
      {isShareDialogOpen && sharingPost && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={handleShareDialogClose}></div>
          <SocialSharePopup
            post={sharingPost}
            isOpen={isShareDialogOpen}
            onClose={handleShareDialogClose}
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
    </>
  );
}