import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/new-user-context';
import { useToast } from '@/hooks/use-toast';
import PostComposer from '@/components/posts/post-composer';
import PostEditor from '@/components/posts/post-editor';
import SocialSharePopup from '@/components/posts/social-share-popup';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { getPosts, deletePost } from '@/lib/storage';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { CopyButton } from '@/components/common/copy-button';
import { MediaContent } from '@/components/common/media-content';
import { copyFormattedContent, extractImagesFromHtml } from '@/lib/copy-utils';
import { Post } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { SearchBar } from '@/components/ui/search-bar';
import TabNavigation from '@/components/layout/tab-navigation';
import ConfirmationModal from '@/components/ui/confirmation-modal';

export default function Twitter() {
  const { user } = useUser();
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
        const twitterPosts = await getPosts('twitter');
        setPosts(twitterPosts);
        setFilteredPosts(twitterPosts);
      } catch (error) {
        console.error('Error loading Twitter posts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tweets. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);
  
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
      const twitterPosts = await getPosts('twitter');
      setPosts(twitterPosts);
      setFilteredPosts(twitterPosts);
    } catch (error) {
      console.error('Error refreshing Twitter posts:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deletePost('twitter', postId);
      const updatedPosts = posts.filter(post => post.id !== postId);
      setPosts(updatedPosts);
      setFilteredPosts(updatedPosts);
      toast({
        title: 'Tweet deleted',
        description: 'Your tweet has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting tweet:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tweet. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsEditDialogOpen(true);
  };
  
  // Handle copying post with formatted content preserved
  const handleCopy = async (post: Post) => {
    const success = await copyFormattedContent(
      post.formattedContent?.html || null, 
      post.content || ''
    );
    
    if (success) {
      toast({
        title: 'Copied',
        description: post.formattedContent?.html 
          ? 'Tweet copied with formatting.' 
          : 'Tweet content copied to clipboard.',
      });
    } else {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingPost(null);
  };
  
  const handlePostUpdated = async () => {
    try {
      const twitterPosts = await getPosts('twitter');
      setPosts(twitterPosts);
      setFilteredPosts(twitterPosts);
      toast({
        title: 'Tweet updated',
        description: 'Your tweet has been updated successfully.',
      });
    } catch (error) {
      console.error('Error refreshing Twitter posts:', error);
    }
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
  
  const handleShareDialogClose = () => {
    setIsShareDialogOpen(false);
    setSharingPost(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="40" height="40">
                <path fill="#03A9F4" d="M42,12.429c-1.323,0.586-2.746,0.977-4.247,1.162c1.526-0.906,2.7-2.351,3.251-4.058c-1.428,0.837-3.01,1.452-4.693,1.776C34.967,9.884,33.05,9,30.926,9c-4.08,0-7.387,3.278-7.387,7.32c0,0.572,0.067,1.129,0.193,1.67c-6.138-0.308-11.582-3.226-15.224-7.654c-0.64,1.082-1,2.349-1,3.686c0,2.541,1.301,4.778,3.285,6.096c-1.211-0.037-2.351-0.374-3.349-0.914c0,0.022,0,0.055,0,0.086c0,3.551,2.547,6.508,5.923,7.181c-0.617,0.169-1.269,0.263-1.941,0.263c-0.477,0-0.942-0.054-1.392-0.135c0.94,2.902,3.667,5.023,6.898,5.086c-2.528,1.96-5.712,3.134-9.174,3.134c-0.598,0-1.183-0.034-1.761-0.104C9.268,36.786,13.152,38,17.321,38c13.585,0,21.017-11.156,21.017-20.834c0-0.317-0.01-0.633-0.025-0.945C39.763,15.197,41.013,13.905,42,12.429"/>
              </svg>
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-800">Twitter</h1>
          </div>
          <div className="ml-12 relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={14} />
            </div>
            <Input 
              type="text" 
              placeholder="Search tweets..." 
              className="pl-10"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          <PostComposer
            platform="twitter"
            onPostCreated={handlePostCreated}
            placeholder="What's happening?"
            buttonText="Tweet"
            buttonColor="#1DA1F2"
          />

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-4 text-blue-500">
                <i className="ri-twitter-fill text-5xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No tweets yet</h3>
              <p className="text-gray-600">
                Share your thoughts with the world by posting your first tweet!
              </p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <h3 className="text-lg font-medium text-gray-800 mb-2">No matching tweets</h3>
              <p className="text-gray-600">
                Try a different search term.
              </p>
            </div>
          ) : (
            filteredPosts.map(post => (
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
                        <span className="text-gray-500 text-sm ml-1">@{user?.username || "user"}</span>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="text-gray-500 hover:text-gray-700 p-1">
                      <i className="ri-more-line"></i>
                    </button>
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleEditPost(post)}
                      >
                        Edit Tweet
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        Delete Tweet
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
                          alt={`Tweet image ${index + 1}`}
                          mediaType="image"
                          className="max-h-64 rounded-lg mb-2"
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

                <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-gray-500 text-sm">
                    <button 
                      className="flex items-center hover:text-blue-500 transition-colors px-2 py-1 bg-gray-50 rounded-md border border-gray-200"
                      onClick={() => handleEditPost(post)}
                      title="Edit"
                    >
                      <i className="ri-edit-line mr-1"></i>
                      <span>Edit</span>
                    </button>
                    <button 
                      className="flex items-center hover:text-blue-500 transition-colors px-2 py-1 bg-gray-50 rounded-md border border-gray-200"
                      onClick={() => handleCopy(post)}
                      title="Copy"
                    >
                      <i className="ri-file-copy-line mr-1"></i>
                      <span>Copy</span>
                    </button>
                    <button 
                      className="flex items-center hover:text-blue-500 transition-colors px-2 py-1 bg-gray-50 rounded-md border border-gray-200"
                      onClick={() => handleSharePost(post)}
                      title="Share"
                    >
                      <i className="ri-share-line mr-1"></i>
                      <span>Share</span>
                    </button>
                  </div>
                  
                  {/* Prominent Delete Button */}
                  <button 
                    className="bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 px-2 py-1 rounded-md text-sm flex items-center"
                    onClick={() => setConfirmDeletePostId(post.id)}
                    title="Delete"
                  >
                    <i className="ri-delete-bin-line mr-1"></i>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {editingPost && (
        <PostEditor
          post={editingPost}
          platform="twitter"
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
            onClose={handleShareDialogClose}
            position="vertical"
          />
        </div>
      )}
      
      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={confirmDeletePostId !== null}
        onClose={() => setConfirmDeletePostId(null)} 
        onConfirm={() => {
          if (confirmDeletePostId) {
            handleDeletePost(confirmDeletePostId);
            setConfirmDeletePostId(null);
          }
        }}
        title="Confirm Delete"
        description="Are you sure you want to delete this tweet? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
