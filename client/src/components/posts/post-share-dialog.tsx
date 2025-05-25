import { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Post } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface PostShareDialogProps {
  post: Post;
  platform: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostShareDialog({
  post,
  platform,
  isOpen,
  onClose
}: PostShareDialogProps) {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const handleShare = async () => {
    if (!recipientEmail || !senderName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    try {
      const response = await apiRequest('POST', '/api/share-post', {
        recipientEmail,
        senderName,
        post,
        platform
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Post shared!",
          description: `Your post has been shared with ${recipientEmail}.`,
        });
        onClose();
        setRecipientEmail('');
        setSenderName('');
      } else {
        throw new Error(result.message || 'Failed to share post');
      }
    } catch (error: any) {
      toast({
        title: "Error sharing post",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share via Email</DialogTitle>
          <p className="text-gray-500 text-sm mt-1">Send this post to someone via email</p>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient-email" className="text-right">
              To
            </Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="recipient@example.com"
              className="col-span-3"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sender-name" className="text-right">
              Your Name
            </Label>
            <Input
              id="sender-name"
              placeholder="Your Name"
              className="col-span-3"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>
          
          <div className="col-span-3 mt-2 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-500 mb-2">Preview:</p>
            <div className="text-sm">
              <strong>{platform.charAt(0).toUpperCase() + platform.slice(1)} Post:</strong> 
              <div className="mt-2">
                {post.formattedContent?.html ? (
                  <div dangerouslySetInnerHTML={{ __html: post.formattedContent.html }} />
                ) : (
                  <span>{post.content?.substring(0, 100)}...</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={isSending}
          >
            {isSending ? (
              <span className="animate-spin mr-2">
                <i className="ri-loader-2-line"></i>
              </span>
            ) : (
              <i className="ri-mail-send-line mr-2"></i>
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}