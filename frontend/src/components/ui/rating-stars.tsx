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

export function RatingStars({
  rating,
  onRatingChange,
  maxRating = 5,
  className,
  editable = true,
  size = 'md',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size];

  return (
    <div className={cn("flex gap-1", className)}>
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1;
        const isActive = starValue <= (hoverRating || rating);

        return (
          <button
            key={i}
            type="button"
            className={cn(
              "transition-all",
              editable ? "cursor-pointer active:scale-90" : "cursor-default",
              isActive ? "text-amber-400" : "text-muted"
            )}
            onMouseEnter={() => editable && setHoverRating(starValue)}
            onMouseLeave={() => editable && setHoverRating(0)}
            onClick={() => editable && onRatingChange?.(starValue)}
          >
            <Star
              className={cn(
                starSizeClass,
                isActive ? "fill-current" : "fill-none"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
