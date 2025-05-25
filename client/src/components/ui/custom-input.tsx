import React, { forwardRef, useRef, useEffect } from 'react';
import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const CustomInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement | null>(null);
    const combinedRef = (node: HTMLInputElement) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Set cursor position to end of text when value changes
    useEffect(() => {
      if (innerRef.current && props.value) {
        const length = innerRef.current.value.length;
        innerRef.current.selectionStart = length;
        innerRef.current.selectionEnd = length;
      }
    }, [props.value]);

    return (
      <input
        type={type || "text"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={combinedRef}
        {...props}
      />
    );
  }
);

CustomInput.displayName = "CustomInput";

export { CustomInput };