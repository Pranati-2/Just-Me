import React, { useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';

interface DeleteButtonProps {
  onDelete: () => void;
  itemName?: string;
  stopPropagation?: boolean;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DeleteButton({
  onDelete,
  itemName = 'item',
  stopPropagation = false,
  text = 'Delete',
  size = 'md',
}: DeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    setShowConfirm(true);
  };
  
  const handleClose = () => {
    setShowConfirm(false);
  };
  
  const handleConfirm = () => {
    onDelete();
  };
  
  // Determine size-specific classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <>
      <button 
        className={`bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-md flex items-center ${sizeClasses[size]}`}
        onClick={handleClick}
      >
        <i className="ri-delete-bin-line mr-1"></i>
        {text}
      </button>
      
      <ConfirmDialog 
        isOpen={showConfirm}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={`Delete ${itemName}`}
        description={`Are you sure you want to delete this ${itemName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}