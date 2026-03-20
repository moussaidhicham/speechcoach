'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  maxRating?: number;
  className?: string;
  editable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

/*
  Star colours use inline HSL values from the design system palette
  instead of Tailwind's amber-400. The amber stop is pulled from the
  --chart-2 family (warm sand) so stars feel at home on the warm background
  rather than importing an unrelated colour.

  Inactive stars use a warm grey tint rather than bg-muted which can look
  muddy next to the filled stars.
*/
const ACTIVE_COLOR   = 'hsl(30 40% 58%)'   // warm amber-sand, matches --chart-2
const INACTIVE_COLOR = 'hsl(40 12% 78%)'   // quiet warm grey

export function RatingStars({
  rating,
  onRatingChange,
  maxRating = 5,
  className,
  editable = true,
  size = 'md',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={editable ? 'radiogroup' : 'img'}
      aria-label={`Note : ${rating} sur ${maxRating}`}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const value   = i + 1;
        const isActive = value <= (hoverRating || rating);

        return (
          <button
            key={value}
            type="button"
            role={editable ? 'radio' : undefined}
            aria-checked={editable ? value === rating : undefined}
            aria-label={editable ? `${value} étoile${value > 1 ? 's' : ''}` : undefined}
            disabled={!editable}
            className={cn(
              'rounded transition-transform outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring/40',
              editable
                ? 'cursor-pointer active:scale-90 hover:scale-110'
                : 'cursor-default disabled:pointer-events-none'
            )}
            onMouseEnter={() => editable && setHoverRating(value)}
            onMouseLeave={() => editable && setHoverRating(0)}
            onClick={() => editable && onRatingChange?.(value)}
          >
            <Star
              className={sizeClasses[size]}
              style={{
                color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                fill:  isActive ? ACTIVE_COLOR : 'none',
                transition: 'color 0.1s, fill 0.1s',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}