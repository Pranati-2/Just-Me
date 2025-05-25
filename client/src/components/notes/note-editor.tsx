import { useState, useEffect } from 'react';
import { useUser } from '@/context/new-user-context';
import RichTextEditor from '@/components/ui/rich-text-editor';
import TagInput from '@/components/ui/tag-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createNote, updateNote } from '@/lib/storage';
import { Note } from '@shared/schema';

interface NoteEditorProps {
  note?: Note;
  onSave?: (note: Note) => void;
  onDiscard?: () => void;
}

export default function NoteEditor({ note, onSave, onDiscard }: NoteEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.formattedContent?.html || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [lastEdited, setLastEdited] = useState<Date | null>(note ? new Date(note.updatedAt) : null);

  // Update the lastEdited timestamp every minute when actively editing
  useEffect(() => {
    if (note) {
      const interval = setInterval(() => {
        setLastEdited(new Date());
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [note]);
  
  // Autosave effect for title and tags
  useEffect(() => {
    if (!note?.id && (title.trim() || tags.length > 0)) {
      const draftId = note?.id?.toString() || 'new';
      const saveTimeout = setTimeout(() => {
        // Save to local draft
        import('@/lib/draft-utils').then(({ saveDraft }) => {
          const draftData = JSON.stringify({
            content,
            title,
            tags
          });
          saveDraft('note', draftId, draftData);
        });
      }, 2000); // 2 second debounce
      
      return () => clearTimeout(saveTimeout);
    }
  }, [title, tags, content, note?.id]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to save notes.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() && !content.trim()) {
      toast({
        title: "Content required",
        description: "Please add either a title or some content for your note.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const noteData = {
        userId: user.id,
        title,
        content,
        formattedContent: { html: content },
        tags,
        color: note?.color || 'yellow'
      };

      let savedNote;
      if (note?.id) {
        // Update existing note
        savedNote = await updateNote(note.id, noteData);
      } else {
        // Create new note
        savedNote = await createNote(noteData);
      }

      if (savedNote) {
        toast({
          title: "Note saved",
          description: "Your note has been saved successfully."
        });
        
        // Clear draft after successful save
        import('@/lib/draft-utils').then(({ clearDraft }) => {
          clearDraft('note', note?.id?.toString() || 'new');
        });
        
        if (onSave) onSave(savedNote);
      }
    } catch (error) {
      toast({
        title: "Error saving note",
        description: "An error occurred while saving your note.",
        variant: "destructive",
      });
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatLastEdited = () => {
    if (!lastEdited) return '';
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(lastEdited);
  };

  // Handle discard to clear any drafts
  const handleDiscard = () => {
    // Clear any existing draft
    import('@/lib/draft-utils').then(({ clearDraft }) => {
      clearDraft('note', note?.id?.toString() || 'new');
    });
    
    // Call the passed onDiscard callback
    if (onDiscard) onDiscard();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <Input
        type="text"
        placeholder="Title"
        className="w-full text-xl font-medium mb-2 border-0 focus-visible:ring-0 px-0"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Start typing your note here..."
        minHeight="180px"
        showSubmitButton={false}
        autosave={true}
        draftType="note"
        draftId={note?.id?.toString() || 'new'}
        onDraftFound={(draftContent) => {
          try {
            // Try to parse as JSON for drafts with additional data
            const draftData = JSON.parse(draftContent);
            setContent(draftData.content || draftContent);
            
            // Restore tags if available
            if (draftData.tags && Array.isArray(draftData.tags)) {
              setTags(draftData.tags);
            }
          } catch (e) {
            // For older drafts or simple string content
            setContent(draftContent);
          }
          
          toast({
            title: "Draft restored",
            description: "Your previous unsaved note has been restored.",
          });
        }}
      />
      
      {/* Tags section */}
      <div className="mt-4">
        <TagInput
          tags={tags}
          onChange={setTags}
          placeholder="Add tags..."
          size="large"
        />
      </div>
      
      <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {lastEdited ? `Last edited: ${formatLastEdited()}` : ''}
        </span>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDiscard} 
            className="mr-2"
          >
            Discard
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving || (!title.trim() && !content.trim())}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">
                  <i className="ri-loader-2-line"></i>
                </span>
                Saving...
              </>
            ) : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
