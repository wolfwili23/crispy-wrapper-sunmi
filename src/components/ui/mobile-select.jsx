import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './drawer';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

/**
 * Drop-in replacement for Select on mobile: renders an Action Sheet Drawer.
 * Props: value, onValueChange, options=[{value, label}], placeholder, className
 */
export function MobileSelect({ value, onValueChange, options = [], placeholder, className }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-between gap-2 h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background",
          className
        )}
      >
        <span className={selected ? '' : 'text-muted-foreground'}>{selected?.label || placeholder || 'Seleziona...'}</span>
        <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {placeholder && (
            <DrawerHeader>
              <DrawerTitle className="text-sm text-muted-foreground font-medium">{placeholder}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="px-4 pb-8 space-y-1">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-colors",
                  value === o.value
                    ? "bg-primary text-white"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}