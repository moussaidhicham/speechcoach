
'use client';
 
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
 
interface AvatarCustomProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imagePositionY?: number | null;
  imageScale?: number | null;
}
 
/*
  Palette uses CSS variables from the design system instead of hardcoded
  Tailwind color classes. Each pair is [background, text] as inline style values.
  Derived from the teal/sand/slate/rose family — all desaturated and calm.
*/
const PALETTE: [string, string][] = [
  ['hsl(172 38% 88%)', 'hsl(172 38% 22%)'],  // sage teal
  ['hsl(30  35% 88%)', 'hsl(30  40% 28%)'],  // warm sand
  ['hsl(210 22% 86%)', 'hsl(210 22% 26%)'],  // slate
  ['hsl(148 28% 86%)', 'hsl(148 28% 26%)'],  // muted green
  ['hsl(350 30% 88%)', 'hsl(350 35% 28%)'],  // dusty rose
  ['hsl(255 28% 88%)', 'hsl(255 30% 30%)'],  // soft lavender
  ['hsl(40  40% 86%)', 'hsl(40  40% 26%)'],  // amber sand
  ['hsl(195 30% 86%)', 'hsl(195 32% 26%)'],  // sky slate
];
 
function getPalette(name?: string | null): [string, string] {
  if (!name) return PALETTE[0];
  const index = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % PALETTE.length;
  return PALETTE[index];
}
 
function getInitials(name?: string | null): string {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
 
const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;
 
const imageDimensions = { sm: 28, md: 36, lg: 56, xl: 80 } as const;
 
export function AvatarCustom({
  src,
  name,
  size = 'md',
  className,
  imagePositionY,
  imageScale,
}: AvatarCustomProps) {
  const [hasImageError, setHasImageError] = React.useState(false);
 
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const fullSrc =
    src && !hasImageError
      ? (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:'))
        ? src
        : `${apiUrl}${src}`
      : null;
 
  const [bg, fg] = getPalette(name);
  const initials = getInitials(name);
  const safePositionY = typeof imagePositionY === 'number' ? imagePositionY : 50;
  const safeScale = typeof imageScale === 'number' ? imageScale : 1;
 
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full ring-2 ring-background',
        sizeClasses[size],
        className
      )}
      style={!fullSrc ? { background: bg } : undefined}
    >
      {fullSrc ? (
        <Image
          src={fullSrc}
          alt={name || 'Avatar'}
          width={imageDimensions[size]}
          height={imageDimensions[size]}
          className="h-full w-full object-cover"
          style={{
            objectPosition: `center ${safePositionY}%`,
            transform: `scale(${safeScale})`,
          }}
          loader={({ src: s }) => s}
          unoptimized
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center font-medium"
          style={{ color: fg }}
          aria-label={name || undefined}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
