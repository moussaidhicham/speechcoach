'use client';

import React from 'react';
import { Mic } from 'lucide-react';

export function Header({ title, subtitle, children }: { title: string, subtitle?: string, children?: React.ReactNode }) {
  return (
    <header className="h-16 border-b bg-card px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
}
