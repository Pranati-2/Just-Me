import { useState, useEffect } from 'react';
import { useUser } from '@/context/new-user-context';
import RichTextEditor from '@/components/ui/rich-text-editor';
import TagInput from '@/components/ui/tag-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createDocument, updateDocument } from '@/lib/storage';
import { Document } from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentEditorProps {
  document?: Document;
  onSave?: (document: Document) => void;
  onDiscard?: () => void;
}

// Predefined categories
const categories = [
  { id: 'general', name: 'General' },
  { id: 'technical', name: 'Technical' },
  { id: 'project', name: 'Project' },
  { id: 'personal', name: 'Personal' },
  { id: 'workflow', name: 'Workflow' }
];

export default function DocumentEditor({ document, onSave, onDiscard }: DocumentEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  // Data for the document
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState(document?.formattedContent?.html || document?.content || '');
  const [category, setCategory] = useState(document?.category || 'general');
  const [tags, setTags] = useState<string[]>(document?.tags || []);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Reset form when a new document is loaded for editing
    if (document) {
      setTitle(document.title);
      setContent(document.formattedContent?.html || document.content);
      setCategory(document.category || 'general');
      setTags(document.tags || []);
    } else {
      // Clear fields when creating a new document
      setTitle('');
      setContent('');
      setCategory('general');
      setTags([]);
    }
  }, [document]);
  
  // Autosave effect for all fields
  useEffect(() => {
    if (!document?.id && (title.trim() || content.trim() || tags.length > 0)) {
      const draftId = document?.id?.toString() || 'new';
      const saveTimeout = setTimeout(() => {
        // Save to local draft
        import('@/lib/draft-utils').then(({ saveDraft }) => {
          const draftData = JSON.stringify({
            content,
            title,
            category,
            tags
          });
          saveDraft('document', draftId, draftData);
        });
      }, 2000); // 2 second debounce
      
      return () => clearTimeout(saveTimeout);
    }
  }, [title, content, category, tags, document?.id]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to save documents.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() && !content.trim()) {
      toast({
        title: "Content required",
        description: "Please add either a title or some content for your document.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const documentData = {
        userId: user.id,
        title,
        content,
        formattedContent: { html: content },
        category,
        tags
      };

      let savedDocument;
      if (document?.id) {
        // Update existing document
        savedDocument = await updateDocument(document.id, documentData);
      } else {
        // Create new document
        savedDocument = await createDocument(documentData);
      }

      if (savedDocument) {
        toast({
          title: "Document saved",
          description: "Your document has been saved successfully."
        });
        
        // Clear draft after successful save
        import('@/lib/draft-utils').then(({ clearDraft }) => {
          clearDraft('document', document?.id?.toString() || 'new');
        });
        
        if (onSave) onSave(savedDocument);
      }
    } catch (error) {
      toast({
        title: "Error saving document",
        description: "An error occurred while saving your document.",
        variant: "destructive",
      });
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="mb-4">
        <label htmlFor="doc-title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <Input
          id="doc-title"
          type="text"
          placeholder="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="doc-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <Select value={category} onValueChange={(value) => setCategory(value)}>
          <SelectTrigger id="doc-category" className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="mb-4">
        <label htmlFor="doc-content" className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start writing your document..."
          minHeight="300px"
          showSubmitButton={false}
          autosave={true}
          draftType="document"
          draftId={document?.id?.toString() || 'new'}
          onDraftFound={(draftContent) => {
            try {
              // Try to parse as JSON for drafts with additional data
              const draftData = JSON.parse(draftContent);
              setContent(draftData.content || draftContent);
              
              // Restore other fields if available
              if (draftData.title) setTitle(draftData.title);
              if (draftData.category) setCategory(draftData.category);
              if (draftData.tags && Array.isArray(draftData.tags)) setTags(draftData.tags);
            } catch (e) {
              // For older drafts or simple string content
              setContent(draftContent);
            }
            
            toast({
              title: "Draft restored",
              description: "Your previous unsaved document has been restored.",
            });
          }}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="doc-tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="Add tags..."
          size="large"
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={() => {
            // Clear any existing draft
            import('@/lib/draft-utils').then(({ clearDraft }) => {
              clearDraft('document', document?.id?.toString() || 'new');
            });
            
            // Call the passed onDiscard callback
            if (onDiscard) onDiscard();
          }}
        >
          Discard
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving || (!title.trim() && !content.trim())}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isSaving ? (
            <>
              <span className="animate-spin mr-2">
                <i className="ri-loader-2-line"></i>
              </span>
              Saving...
            </>
          ) : 'Save Document'}
        </Button>
      </div>
    </div>
  );
}