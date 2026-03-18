'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarCustomProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const colors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
];

export function AvatarCustom({ src, name, size = 'md', className }: AvatarCustomProps) {
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Deterministic color based on name
  const colorIndex = name 
    ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length 
    : 0;
  const bgColor = colors[colorIndex];

  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const fullSrc = src ? (src.startsWith('http') ? src : `${apiUrl}${src}`) : null;

  return (
    <div 
      className={cn(
        "rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-background shadow-sm",
        !src && bgColor,
        !src && "text-white font-bold",
        sizeClasses[size],
        className
      )}
    >
      {fullSrc ? (
        <img 
          src={fullSrc} 
          alt={name || 'Avatar'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as any).parentElement.classList.add(bgColor);
            (e.target as any).parentElement.innerHTML = `<span class="font-bold text-white">${initials}</span>`;
          }}
        />
      ) : (
        <span className="uppercase">{initials}</span>
      )}
    </div>
  );
}
