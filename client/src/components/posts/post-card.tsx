import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CopyExportActions } from '@/components/common/copy-export-actions';
import { DeleteButton } from '@/components/ui/delete-button';
import { useToast } from '@/hooks/use-toast';
import type { Post } from '@shared/schema';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function PostCard({
  post,
  onEdit,
  onDelete,
  showActions = true,
  compact = false,
}: PostCardProps) {
  const { toast } = useToast();
  // Parse formatted content
  const formattedContent = post.formattedContent || {};
  
  // Function to render HTML content safely
  const renderHTML = (html: string) => {
    return { __html: html || '' };
  };
  
  // Get platform-specific styles
  const getPlatformStyles = () => {
    switch (post.platform) {
      case 'twitter':
        return {
          headerBg: 'bg-blue-500',
          iconClass: 'ri-twitter-fill',
          cardBorder: 'border-blue-200',
        };
      case 'facebook':
        return {
          headerBg: 'bg-blue-600',
          iconClass: 'ri-facebook-fill',
          cardBorder: 'border-blue-300',
        };
      case 'instagram':
        return {
          headerBg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500',
          iconClass: 'ri-instagram-fill',
          cardBorder: 'border-pink-200',
        };
      case 'linkedin':
        return {
          headerBg: 'bg-blue-700',
          iconClass: 'ri-linkedin-fill',
          cardBorder: 'border-blue-300',
        };
      case 'youtube':
        return {
          headerBg: 'bg-red-600',
          iconClass: 'ri-youtube-fill',
          cardBorder: 'border-red-200',
        };
      case 'whatsapp':
        return {
          headerBg: 'bg-green-600',
          iconClass: 'ri-whatsapp-fill',
          cardBorder: 'border-green-200',
        };
      default:
        return {
          headerBg: 'bg-gray-600',
          iconClass: 'ri-global-line',
          cardBorder: 'border-gray-200',
        };
    }
  };
  
  const styles = getPlatformStyles();
  
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${compact ? 'max-w-sm' : 'w-full'} border ${styles.cardBorder}`}>
      {/* Post header */}
      <div className={`${styles.headerBg} text-white p-3 flex justify-between items-center`}>
        <div className="flex items-center">
          <i className={`${styles.iconClass} text-xl mr-2`}></i>
          <span className="font-medium capitalize">{post.platform}</span>
        </div>
        
        <div className="text-sm">
          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
        </div>
      </div>
      
      {/* Post content */}
      <div className="p-4">
        {/* Render different content based on platform and content type */}
        {post.platform === 'youtube' && formattedContent.videoUrl && (
          <div className="mb-3 aspect-video">
            <iframe
              className="w-full h-full"
              src={formattedContent.videoUrl}
              title={formattedContent.title || "YouTube video"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )}
        
        {post.platform === 'linkedin' && (
          <div className="flex items-start mb-3">
            {formattedContent.userProfilePic && (
              <img 
                src={formattedContent.userProfilePic} 
                alt="Profile" 
                className="w-12 h-12 rounded-full mr-3"
              />
            )}
            <div>
              <div className="font-semibold">{formattedContent.userName || 'User'}</div>
              <div className="text-gray-600 text-sm">{formattedContent.userDesignation || ''}</div>
            </div>
          </div>
        )}
        
        {/* For Instagram, we might have image content */}
        {post.platform === 'instagram' && post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mb-3">
            <img 
              src={post.mediaUrls[0]} 
              alt="Instagram post" 
              className="w-full h-auto rounded"
            />
          </div>
        )}
        
        {/* HTML formatted content if available */}
        {formattedContent.html ? (
          <div 
            className="prose prose-sm max-w-none" 
            dangerouslySetInnerHTML={renderHTML(formattedContent.html)}
          ></div>
        ) : (
          // Fallback to plain text
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        )}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {post.tags.map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Post actions */}
      {showActions && (
        <div className="border-t border-gray-100 px-4 py-2 flex justify-between">
          <div>
            <CopyExportActions 
              title={`${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} Post`}
              content={post.content}
              post={post}
              isHtml={!!formattedContent.html}
              fileName={`${post.platform}_post_${post.id}`}
              size="sm"
            />
          </div>
          
          <div className="flex space-x-2">
              {onEdit && (
                <button 
                  onClick={() => onEdit(post)}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <i className="ri-edit-line mr-1"></i>
                  Edit
                </button>
              )}
              
              {onDelete && (
                <DeleteButton
                  onDelete={() => onDelete(post.id)}
                  itemName={`${post.platform} post`}
                  text="Delete"
                  size="sm"
                />
              )}
            </div>
        </div>
      )}
    </div>
  );
}