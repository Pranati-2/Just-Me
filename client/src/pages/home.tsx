import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Notes from '@/pages/notes';

export default function Home() {
  const [location, navigate] = useLocation();
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <Notes />
      </div>
    </div>
  );
}
