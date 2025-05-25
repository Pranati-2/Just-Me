import React from 'react';
import { Post } from '@shared/schema';
import { 
  FaWhatsapp, 
  FaFacebook, 
  FaXTwitter, 
  FaLinkedin, 
  FaInstagram, 
  FaYoutube 
} from 'react-icons/fa6';
import { MdClose, MdEmail } from 'react-icons/md';

interface SocialSharePopupProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  position?: 'vertical' | 'horizontal';
  className?: string;
}

export default function SocialSharePopup({
  post,
  isOpen,
  onClose,
  position = 'vertical',
  className = ''
}: SocialSharePopupProps) {
  if (!isOpen) return null;

  const handleShareOnPlatform = (platform: string) => {
    const formattedContent = post.formattedContent as { html?: string } || {};
    const text = formattedContent.html 
      ? new DOMParser().parseFromString(formattedContent.html, 'text/html').documentElement.textContent || ''
      : post.content;
      
    let url = '';
    
    switch(platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`;
        break;
      case 'instagram':
        // Instagram doesn't have a direct share API, open Instagram in a new tab
        url = `https://www.instagram.com/`;
        break;
      case 'youtube':
        // YouTube doesn't have a direct share API, open YouTube in a new tab
        url = `https://www.youtube.com/`;
        break;
      case 'email':
        url = `mailto:?subject=Shared Post&body=${encodeURIComponent(text)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
    
    onClose();
  };

  const containerClass = position === 'vertical' 
    ? 'flex flex-col gap-2' 
    : 'flex gap-4 justify-center';

  return (
    <div 
      className={`bg-white rounded-md shadow-lg p-2 z-50 border border-gray-200 max-w-[320px] fixed-center ${className}`}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex justify-between items-center mb-2 border-b pb-2">
        <span className="text-sm font-medium">Share On</span>
        <button 
          className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
          onClick={onClose}
        >
          <MdClose size={16} />
        </button>
      </div>
      <div className={containerClass}>
        <button 
          className={`
            p-2 text-green-500 hover:bg-green-50 rounded-md border border-transparent 
            hover:border-green-100 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('whatsapp')}
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
        >
          <FaWhatsapp size={20} />
          <span className="text-sm">WhatsApp</span>
        </button>
        <button 
          className={`
            p-2 text-blue-500 hover:bg-blue-50 rounded-md border border-transparent 
            hover:border-blue-100 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('twitter')}
          title="Share on Twitter"
          aria-label="Share on Twitter"
        >
          <FaXTwitter size={20} />
          <span className="text-sm">Twitter</span>
        </button>
        <button 
          className={`
            p-2 text-blue-600 hover:bg-blue-50 rounded-md border border-transparent 
            hover:border-blue-100 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('facebook')}
          title="Share on Facebook"
          aria-label="Share on Facebook"
        >
          <FaFacebook size={20} />
          <span className="text-sm">Facebook</span>
        </button>
        <button 
          className={`
            p-2 text-blue-700 hover:bg-blue-50 rounded-md border border-transparent 
            hover:border-blue-100 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('linkedin')}
          title="Share on LinkedIn"
          aria-label="Share on LinkedIn"
        >
          <FaLinkedin size={20} />
          <span className="text-sm">LinkedIn</span>
        </button>
        <button 
          className={`
            p-2 text-pink-500 hover:bg-pink-50 rounded-md border border-transparent 
            hover:border-pink-100 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('instagram')}
          title="Share on Instagram"
          aria-label="Share on Instagram"
        >
          <FaInstagram size={20} />
          <span className="text-sm">Instagram</span>
        </button>
        <button 
          className={`
            p-2 text-red-600 hover:bg-red-50 rounded-md border border-transparent 
            hover:border-red-100 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('youtube')}
          title="Share on YouTube"
          aria-label="Share on YouTube"
        >
          <FaYoutube size={20} />
          <span className="text-sm">YouTube</span>
        </button>
        <button 
          className={`
            p-2 text-gray-600 hover:bg-gray-50 rounded-md border border-transparent 
            hover:border-gray-200 transition-colors flex items-center gap-2
          `}
          onClick={() => handleShareOnPlatform('email')}
          title="Share via Email"
          aria-label="Share via Email"
        >
          <MdEmail size={20} />
          <span className="text-sm">Email</span>
        </button>
      </div>
    </div>
  );
}