import { ChangeEvent, useState, useEffect } from 'react';
import { Input } from './input';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ onSearch, placeholder = "Search...", className = "" }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        onSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, onSearch]);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query) {
      onSearch(''); // Reset search when query is cleared
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        type="search"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleSearch}
        className="pl-10 w-full"
      />
    </div>
  );
}