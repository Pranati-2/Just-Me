import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { getPosts, createPost, deletePost } from '@/lib/storage';
import { Post } from '@shared/schema';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FaWhatsapp, FaPaperclip, FaSmile, FaCopy, FaShare, FaDownload, FaLink, FaTrash, FaFacebook, FaArrowUp, FaCamera, FaMicrophone, FaSearch } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { MdSend, MdEmail, MdClose, MdMoreVert, MdRefresh } from 'react-icons/md';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { clearDraft } from '@/lib/draft-utils';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import SocialSharePopup from '@/components/posts/social-share-popup';

export default function WhatsApp() {
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Post[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showShareOptions, setShowShareOptions] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState<number | null>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    // Scroll to bottom of messages
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Get all messages and sort them by createdAt date (oldest first)
      const allMessages = await getPosts('whatsapp');
      const sortedMessages = [...allMessages].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading WhatsApp messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to send messages.",
        variant: "destructive",
      });
      return;
    }

    // Extract plain text content from HTML for basic storage
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newMessage;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    if (!plainText.trim() && !newMessage.includes('<img') && !newMessage.includes('<div')) {
      return;
    }

    try {
      // Close emoji picker if open
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
      }
      
      const message = await createPost('whatsapp', {
        userId: user.id,
        platform: 'whatsapp',
        // Store plain text in content field for search and compatibility
        content: plainText,
        formattedContent: { 
          html: newMessage // Store the rich HTML content
        },
        mediaUrls: mediaFiles,
        tags: [] // Empty array for tags
      });
      
      // Add new message to the list
      setMessages([...messages, message]);
      
      // Clear input and media files
      setNewMessage('');
      setMediaFiles([]);
      
      // Clear the draft after successful sending
      clearDraft('platform', 'whatsapp');
      
      // Scroll to bottom
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMessageConfirm = (messageId: number) => {
    setConfirmDeleteMessageId(messageId);
  };
  
  const handleDeleteMessage = async () => {
    if (!confirmDeleteMessageId) return;
    
    try {
      await deletePost('whatsapp', confirmDeleteMessageId);
      setMessages(messages.filter(msg => msg.id !== confirmDeleteMessageId));
      // Message deleted successfully, no need for toast notification
      setConfirmDeleteMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message. Please try again.',
        variant: 'destructive',
      });
      setConfirmDeleteMessageId(null);
    }
  };

  const handleShare = (messageId: number) => {
    setShowShareOptions(showShareOptions === messageId ? null : messageId);
  };

  const handleShareOnPlatform = (platform: string, message: Post) => {
    const formattedContent = message.formattedContent as { html?: string } || {};
    const text = formattedContent.html 
      ? new DOMParser().parseFromString(formattedContent.html, 'text/html').documentElement.textContent || ''
      : message.content;
      
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
      case 'email':
        url = `mailto:?subject=Shared Message&body=${encodeURIComponent(text)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
    
    setShowShareOptions(null);
  };

  const handleDownload = (message: Post) => {
    const formattedContent = message.formattedContent as { html?: string } || {};
    const text = formattedContent.html 
      ? new DOMParser().parseFromString(formattedContent.html, 'text/html').documentElement.textContent || ''
      : message.content;
    
    const element = document.createElement('a');
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `message_${message.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // We no longer need handleKeyDown as the RichTextEditor 
  // already handles the line breaks with Shift+Enter

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddLink = () => {
    const url = prompt('Enter the URL:');
    if (url) {
      setNewMessage((prev) => prev + ` ${url} `);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    console.log("Emoji clicked:", emojiData.emoji);
    // Insert emoji at cursor position or append to the end of content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newMessage;
    const plainText = tempDiv.textContent || '';
    
    // For Rich Text Editor, we need to insert the emoji into the HTML
    // If it's empty or just has empty formatting tags, just set it directly
    if (!plainText.trim()) {
      setNewMessage(emojiData.emoji);
    } else {
      // Otherwise append it to the existing content
      setNewMessage(prev => {
        // If the content ends with a closing tag, insert before it
        if (prev.endsWith('</p>')) {
          return prev.replace('</p>', emojiData.emoji + '</p>');
        } else {
          return prev + ' ' + emojiData.emoji;
        }
      });
    }
    // Keep emoji picker open for multiple emoji selection
  };

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const file = files[0];
    if (!file) return;
    
    // Check file type and size
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validDocTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const isValidFile = [...validImageTypes, ...validDocTypes].includes(file.type);
    const isTooBig = file.size > 5 * 1024 * 1024; // 5MB limit
    
    if (!isValidFile) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image or document file.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isTooBig) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }
    
    // Convert file to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // For demonstration purposes, we'll just store the data URL
        setMediaFiles([...mediaFiles, result]);
        
        // If it's an image, add it to the message
        if (validImageTypes.includes(file.type)) {
          const imgTag = `<img src="${result}" alt="Attached image" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin: 5px 0;" />`;
          setNewMessage((prev) => prev + ' ' + imgTag);
        } else {
          // For documents, add a link
          const fileName = file.name;
          const docLinkTag = `<div style="display: flex; align-items: center; margin: 5px 0; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span style="margin-left: 8px;">${fileName}</span>
          </div>`;
          setNewMessage((prev) => prev + ' ' + docLinkTag);
        }
        
        // File attached successfully, no need for toast notification
      }
    };
    reader.readAsDataURL(file);
    
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter messages based on search query
  const filteredMessages = searchQuery
    ? messages.filter(
        msg => {
          const formattedContent = msg.formattedContent as { html?: string } || {};
          return msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (formattedContent.html && 
             formattedContent.html.toLowerCase().includes(searchQuery.toLowerCase()));
        }
      )
    : messages;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
            <FaWhatsapp size={20} />
          </div>
          <div className="ml-3">
            <div className="font-medium">WhatsApp</div>
            <div className="text-xs text-gray-500">
              {filteredMessages.length} messages
            </div>
          </div>
        </div>
        <div className="ml-8 flex-1 max-w-md">
          <Input 
            type="text" 
            placeholder="Search messages..." 
            className="w-full text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 bg-gray-100 p-4 relative" style={{ 
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d1d5db\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="mb-4 text-green-500">
                <FaWhatsapp size={48} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchQuery ? 'No search results found' : 'No messages yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try a different search term or clear your search'
                  : 'Start a conversation by sending a message!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="pr-32"> {/* Increased right padding to accommodate both toolbars */}
            {filteredMessages.map((message, index) => {
              const isMyMessage = message.userId === user?.id;
              const showAvatar = index === 0 || filteredMessages[index - 1].userId !== message.userId;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex items-end mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMyMessage && showAvatar && (
                    <div className="flex-shrink-0 mr-2">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white">
                        U
                      </div>
                    </div>
                  )}
                  
                  <div className={`relative max-w-[75%] group ${isMyMessage ? 'bg-green-100' : 'bg-white'} p-3 rounded-lg shadow-sm`}>
                    <div className="text-sm" dangerouslySetInnerHTML={{ 
                      __html: (message.formattedContent as { html?: string } || {}).html || message.content 
                    }} />
                    <div className="text-right mt-1">
                      <span className="text-xs text-gray-500">
                        {format(new Date(message.createdAt), 'h:mm a')}
                      </span>
                      {isMyMessage && (
                        <span className="text-xs ml-1 text-blue-500">✓✓</span>
                      )}
                    </div>
                    
                    {/* Message actions - positioned to the right of message */}
                    <div 
                      className="absolute top-0 -right-2 translate-x-full bg-white rounded-md shadow-lg opacity-0 invisible 
                      group-hover:opacity-100 group-hover:visible 
                      transition-all duration-200 ease-in hover:opacity-100 hover:visible
                      flex flex-col divide-y divide-gray-100 border border-gray-200 z-10"
                      style={{ 
                        transitionDelay: '0.2s', 
                        transitionDuration: '0.3s', 
                        transitionProperty: 'opacity, visibility',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div className="absolute -bottom-2 left-0 right-0 h-3 bg-transparent"></div>
                      <button 
                        className="p-3 text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center"
                        onClick={() => {
                          const formattedContent = message.formattedContent as { html?: string } || {};
                          navigator.clipboard.writeText(
                            formattedContent.html 
                              ? new DOMParser().parseFromString(formattedContent.html, 'text/html').documentElement.textContent || ''
                              : message.content
                          );
                          // Message copied to clipboard - no need for toast notification
                        }}
                        title="Copy"
                        aria-label="Copy message to clipboard"
                      >
                        <FaCopy size={18} />
                        <span className="sr-only">Copy</span>
                      </button>
                      <button 
                        className="p-3 text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center"
                        onClick={() => handleShare(message.id)}
                        title="Share"
                        aria-label="Share message"
                      >
                        <FaShare size={18} />
                        <span className="sr-only">Share</span>
                      </button>
                      <button 
                        className="p-3 text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors flex items-center"
                        onClick={() => handleDownload(message)}
                        title="Download"
                        aria-label="Download message content"
                      >
                        <FaDownload size={18} />
                        <span className="sr-only">Download</span>
                      </button>
                      {isMyMessage && (
                        <button 
                          className="p-3 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center"
                          onClick={() => handleDeleteMessageConfirm(message.id)}
                          title="Delete"
                          aria-label="Delete message"
                        >
                          <FaTrash size={18} />
                          <span className="sr-only">Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Share options popup - using SocialSharePopup */}
                    {showShareOptions === message.id && (
                      <div className="fixed inset-0 flex items-center justify-center z-50">
                        <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowShareOptions(null)}></div>
                        <SocialSharePopup
                          post={message}
                          isOpen={showShareOptions === message.id}
                          onClose={() => setShowShareOptions(null)}
                          position="vertical"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="p-3 border-t border-gray-200 bg-white flex flex-col">
        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="mb-3 relative">
            <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-lg shadow-lg border overflow-hidden">
              <div className="flex justify-between items-center p-2 border-b">
                <h3 className="font-medium text-sm text-gray-700">Choose an emoji</h3>
                <button 
                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-500"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  <MdClose size={16} />
                </button>
              </div>
              <EmojiPicker 
                width="100%" 
                height={300} 
                theme={Theme.AUTO} 
                onEmojiClick={handleEmojiClick} 
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emoji..."
                previewConfig={{ showPreview: false }}
              />
            </div>
          </div>
        )}
        
        {/* Quick Emoji Bar - Always visible for easy access */}
        <div className="flex items-center mb-2 overflow-x-auto py-1 px-2 -mx-2">
          {["😊", "😂", "👍", "❤️", "🙏", "😍", "🔥", "👏", "🎉", "🤔"].map(emoji => (
            <button 
              key={emoji}
              className="p-1 mr-1 text-xl hover:bg-gray-100 rounded-md"
              onClick={() => handleEmojiClick({ emoji } as EmojiClickData)}
              title={`Add ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        
        {/* File input (hidden) */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
        
        <div className="flex items-end">
          <div className="flex-1 mx-2">
            <div className="border rounded-md overflow-hidden">
              <RichTextEditor
                value={newMessage}
                onChange={setNewMessage}
                placeholder="Type a message"
                minHeight="40px"
                showSubmitButton={false}
                onSubmit={handleSendMessage}
                autosave={true}
                draftType="platform"
                draftId="whatsapp"
                onDraftFound={(savedDraft) => {
                  setNewMessage(savedDraft);
                }}
              />
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !newMessage.includes('<img') && !newMessage.includes('<div')}
            className="rounded-full h-10 w-10 p-0"
            style={{ backgroundColor: '#25D366' }}
          >
            <MdSend size={18} />
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDeleteMessageId !== null}
        onClose={() => setConfirmDeleteMessageId(null)}
        onConfirm={handleDeleteMessage}
        title="Confirm Delete"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}
