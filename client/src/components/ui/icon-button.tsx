import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label?: string;
  iconOnly?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  color?: string;
}

export default function IconButton({
  icon,
  label,
  iconOnly = false,
  variant = 'ghost',
  size = 'icon',
  color,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "flex items-center justify-center",
        !iconOnly && label && "px-3",
        className
      )}
      {...props}
    >
      <i 
        className={icon} 
        style={color ? { color } : undefined} 
      />
      {!iconOnly && label && <span className="ml-2">{label}</span>}
    </Button>
  );
}
