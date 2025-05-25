import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getDocuments, deleteDocument } from '@/lib/storage';
import { Document } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DocumentEditor from '@/components/documents/document-editor';
import DocumentCard from '@/components/documents/document-card';

// Predefined categories
const categories = [
  { id: 'general', name: 'General' },
  { id: 'technical', name: 'Technical' },
  { id: 'project', name: 'Project' },
  { id: 'personal', name: 'Personal' },
  { id: 'workflow', name: 'Workflow' }
];

export default function Documentation() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    // Apply search and category filters
    let filtered = documents;
    
    if (searchTerm.trim()) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        doc => 
          doc.title.toLowerCase().includes(lowercasedSearch) || 
          doc.content.toLowerCase().includes(lowercasedSearch)
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(doc => doc.category === categoryFilter);
    }
    
    setFilteredDocuments(filtered);
  }, [searchTerm, categoryFilter, documents]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const userDocuments = await getDocuments();
      setDocuments(userDocuments);
      setFilteredDocuments(userDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDocument = () => {
    setIsCreatingDocument(true);
    setCurrentDocument(null);
  };

  const handleSaveDocument = async (document: Document) => {
    try {
      // Document is already saved by the DocumentEditor component
      // We just need to refresh the documents list and update the UI
      await loadDocuments(); // Refresh the documents list
      setIsCreatingDocument(false);
      setCurrentDocument(null);
    } catch (error) {
      console.error('Error after saving document:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh documents. Please reload the page.',
        variant: 'destructive',
      });
    }
  };

  const handleEditDocument = (document: Document) => {
    setCurrentDocument(document);
    setIsCreatingDocument(false);
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await deleteDocument(documentId);
      toast({
        title: 'Document deleted',
        description: 'Your document has been deleted successfully.',
      });
      await loadDocuments(); // Refresh the documents list
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    setIsCreatingDocument(false);
    setCurrentDocument(null);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Documentation</h2>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900"
                onClick={toggleViewMode}
                title={`View as ${viewMode === 'grid' ? 'list' : 'grid'}`}
              >
                <i className={viewMode === 'grid' ? 'ri-layout-grid-line' : 'ri-list-check'}></i>
              </Button>
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search documents..."
                  className="pl-8 pr-4 py-2 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-2.5 text-gray-400"></i>
              </div>
            </div>
          </div>
          
          {/* Document Editor - shown when creating a new document or editing an existing one */}
          {(isCreatingDocument || currentDocument) && (
            <DocumentEditor
              document={currentDocument || undefined}
              onSave={handleSaveDocument}
              onDiscard={handleDiscard}
            />
          )}
          
          {/* Documents List */}
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredDocuments.length === 0 && !isCreatingDocument && !currentDocument ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-4 text-purple-600">
                <i className="ri-file-text-line text-5xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-4">
                Create documentation to organize important information!
              </p>
              <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={handleCreateNewDocument}>
                <i className="ri-add-line mr-2"></i>
                Create Document
              </Button>
            </div>
          ) : !isCreatingDocument && !currentDocument && (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
            }>
              {filteredDocuments.map(document => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add New Document button - only show when not in edit mode */}
      {!isCreatingDocument && !currentDocument && (
        <div className="fixed bottom-6 right-6">
          <Button
            className="bg-purple-500 hover:bg-purple-600 text-white flex items-center"
            onClick={handleCreateNewDocument}
          >
            <i className="ri-add-line mr-2"></i>
            +
          </Button>
        </div>
      )}
    </div>
  );
}
