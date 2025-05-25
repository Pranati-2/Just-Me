import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import TabNavigation from '@/components/layout/tab-navigation';
import JournalEditor from '@/components/journal/journal-editor';
import JournalEntryComponent from '@/components/journal/journal-entry';
import { getJournalEntries, deleteJournalEntry } from '@/lib/storage';
import { JournalEntry } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function Journal() {
  const { user } = useUser();
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    loadJournalEntries();
  }, []);

  useEffect(() => {
    // Apply search filter
    if (searchTerm.trim()) {
      const lowercasedSearch = searchTerm.toLowerCase();
      setFilteredEntries(
        entries.filter(
          entry => 
            entry.title.toLowerCase().includes(lowercasedSearch) || 
            entry.content.toLowerCase().includes(lowercasedSearch) ||
            entry.tags?.some(tag => tag.toLowerCase().includes(lowercasedSearch)) ||
            (entry.mood && entry.mood.toLowerCase().includes(lowercasedSearch)) ||
            (entry.weather && entry.weather.toLowerCase().includes(lowercasedSearch)) ||
            (entry.location && entry.location.toLowerCase().includes(lowercasedSearch))
        )
      );
    } else {
      setFilteredEntries(entries);
    }
  }, [searchTerm, entries]);

  const loadJournalEntries = async () => {
    setIsLoading(true);
    try {
      const userEntries = await getJournalEntries();
      setEntries(userEntries);
      setFilteredEntries(userEntries);
    } catch (error) {
      console.error('Error loading journal entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load journal entries. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewEntry = () => {
    setIsCreatingEntry(true);
    setCurrentEntry(null);
  };

  const handleSaveEntry = async (entry: JournalEntry) => {
    try {
      await loadJournalEntries(); // Refresh the entries list
      setIsCreatingEntry(false);
      setCurrentEntry(null);
      toast({
        title: 'Journal entry saved',
        description: 'Your journal entry has been saved successfully.',
      });
    } catch (error) {
      console.error('Error after saving journal entry:', error);
    }
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setIsCreatingEntry(false);
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      await deleteJournalEntry(entryId);
      toast({
        title: 'Journal entry deleted',
        description: 'Your journal entry has been deleted successfully.',
      });
      await loadJournalEntries(); // Refresh the entries list
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete journal entry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    setIsCreatingEntry(false);
    setCurrentEntry(null);
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    setSortOrder(newOrder);
    
    // Apply sorting
    const sortedEntries = [...filteredEntries];
    if (newOrder === 'newest') {
      sortedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      sortedEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    setFilteredEntries(sortedEntries);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">My Journal</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900"
                onClick={toggleSortOrder}
                title={`Sort by: ${sortOrder === 'newest' ? 'newest first' : 'oldest first'}`}
              >
                <i className={`ri-calendar-line ${sortOrder === 'newest' ? '' : 'transform rotate-180'}`}></i>
              </Button>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search entries..."
                  className="pl-8 pr-4 py-2 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-2.5 text-gray-400"></i>
              </div>
            </div>
          </div>
          
          {/* Journal Entry Editor - shown when creating a new entry or editing an existing one */}
          {(isCreatingEntry || currentEntry) && (
            <JournalEditor
              entry={currentEntry || undefined}
              onSave={handleSaveEntry}
              onDiscard={handleDiscard}
            />
          )}
          
          {/* Journal Entries List */}
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredEntries.length === 0 && !isCreatingEntry && !currentEntry ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-4 text-green-500">
                <i className="ri-book-2-line text-5xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No journal entries yet</h3>
              <p className="text-gray-600 mb-4">
                Start journaling to capture your thoughts and experiences!
              </p>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleCreateNewEntry}>
                <i className="ri-add-line mr-2"></i>
                Create Entry
              </Button>
            </div>
          ) : !isCreatingEntry && !currentEntry && (
            <div className="space-y-4">
              {filteredEntries.map(entry => (
                <JournalEntryComponent
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add New Entry button at the top of the journal entries list */}
      {!isCreatingEntry && !currentEntry && (
        <div className="fixed bottom-6 right-6">
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center"
            onClick={handleCreateNewEntry}
          >
            <i className="ri-add-line mr-2"></i>
            +
          </Button>
        </div>
      )}
    </div>
  );
}
