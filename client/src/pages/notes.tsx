import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import TabNavigation from '@/components/layout/tab-navigation';
import NoteEditor from '@/components/notes/note-editor';
import NoteCard from '@/components/notes/note-card';
import { getNotes, createNote, updateNote, deleteNote } from '@/lib/storage';
import { Note } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Notes() {
  const { user } = useUser();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title'>('newest');

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    // Apply search filter
    if (searchTerm.trim()) {
      const lowercasedSearch = searchTerm.toLowerCase();
      setFilteredNotes(
        notes.filter(
          note => 
            note.title.toLowerCase().includes(lowercasedSearch) || 
            note.content.toLowerCase().includes(lowercasedSearch) ||
            note.tags?.some(tag => tag.toLowerCase().includes(lowercasedSearch))
        )
      );
    } else {
      setFilteredNotes(notes);
    }
  }, [searchTerm, notes]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const userNotes = await getNotes();
      setNotes(userNotes);
      setFilteredNotes(userNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewNote = () => {
    setIsCreatingNote(true);
    setCurrentNote(null);
  };

  const handleSaveNote = async (note: Note) => {
    try {
      // Note is already saved by the NoteEditor component
      // We just need to refresh the notes list and update the UI
      await loadNotes(); // Refresh the notes list
      setIsCreatingNote(false);
      setCurrentNote(null);
    } catch (error) {
      console.error('Error after saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh notes. Please reload the page.',
        variant: 'destructive',
      });
    }
  };

  const handleEditNote = (note: Note) => {
    setCurrentNote(note);
    setIsCreatingNote(false);
  };

  // Direct delete handler without separate confirmation
  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote(noteId);
      toast({
        title: 'Note deleted',
        description: 'Your note has been deleted successfully.',
      });
      await loadNotes(); // Refresh the notes list
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyNote = async (noteToCopy: Note) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to copy notes.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newNote = await createNote({
        userId: user.id,
        title: `${noteToCopy.title} (Copy)`,
        content: noteToCopy.content,
        formattedContent: noteToCopy.formattedContent,
        tags: noteToCopy.tags,
        color: noteToCopy.color
      });
      
      toast({
        title: 'Note copied',
        description: 'A copy of your note has been created.',
      });
      
      await loadNotes();
    } catch (error) {
      console.error('Error copying note:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    setIsCreatingNote(false);
    setCurrentNote(null);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const cycleSortOrder = () => {
    const orders: ('newest' | 'oldest' | 'title')[] = ['newest', 'oldest', 'title'];
    const currentIndex = orders.indexOf(sortOrder);
    const nextIndex = (currentIndex + 1) % orders.length;
    setSortOrder(orders[nextIndex]);
    
    // Apply sorting
    sortNotes(orders[nextIndex]);
  };

  const sortNotes = (order: 'newest' | 'oldest' | 'title') => {
    const sortedNotes = [...filteredNotes];
    
    switch (order) {
      case 'newest':
        sortedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'oldest':
        sortedNotes.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case 'title':
        sortedNotes.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    
    setFilteredNotes(sortedNotes);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">My Notes</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900"
                onClick={cycleSortOrder}
                title={`Sort by: ${sortOrder}`}
              >
                <i className={sortOrder === 'newest' ? 'ri-sort-desc' : 
                             sortOrder === 'oldest' ? 'ri-sort-asc' : 
                             'ri-sort-alphabet'}></i>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900"
                onClick={toggleViewMode}
                title={`View as ${viewMode === 'grid' ? 'list' : 'grid'}`}
              >
                <i className={viewMode === 'grid' ? 'ri-layout-grid-line' : 'ri-list-check'}></i>
              </Button>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search notes..."
                  className="pl-8 pr-4 py-2 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-2.5 text-gray-400"></i>
              </div>
            </div>
          </div>
          
          {/* Note Editor - shown when creating a new note or editing an existing one */}
          {(isCreatingNote || currentNote) && (
            <NoteEditor
              note={currentNote || undefined}
              onSave={handleSaveNote}
              onDiscard={handleDiscard}
            />
          )}
          
          {/* Notes Grid/List */}
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredNotes.length === 0 && !isCreatingNote && !currentNote ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-4 text-yellow-500">
                <i className="ri-sticky-note-line text-5xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No notes yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first note to get started!
              </p>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleCreateNewNote}>
                <i className="ri-add-line mr-2"></i>
                Create Note
              </Button>
            </div>
          ) : !isCreatingNote && !currentNote && (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
            }>
              {filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                  onCopy={handleCopyNote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add New Note button - only show when not in edit mode */}
      {!isCreatingNote && !currentNote && (
        <div className="fixed bottom-6 right-6">
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white flex items-center"
            onClick={handleCreateNewNote}
          >
            <i className="ri-add-line mr-2"></i>
            +
          </Button>
        </div>
      )}
    </div>
  );
}
