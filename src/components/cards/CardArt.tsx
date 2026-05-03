'use client';

import React, { useState } from 'react';
import { getCardImage, getCardImageFallback } from '@/lib/card-media';
import { cn } from '@/lib/utils';
import { Star, ShieldAlert } from 'lucide-react';

interface CardArtProps {
  card: any;
  className?: string;
  showRarityLabel?: boolean;
}

export const CardArt: React.FC<CardArtProps> = ({ card, className, showRarityLabel = false }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getCardImage(card);
  const fallback = getCardImageFallback(card);

  const renderFallback = () => (
    <div 
      className={cn(
        "w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br",
        fallback.visualGradient
      )}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-50" />
      </div>
      
      {/* SOLGINE Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
        <span className="text-6xl font-black rotate-[-35deg] tracking-tighter">SOLGINE</span>
      </div>

      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-2xl relative z-10">
        <Star size={32} style={{ color: fallback.color }} className="opacity-60" fill="currentColor" />
      </div>

      <div className="text-2xl font-black font-space text-white tracking-tighter mb-1 relative z-10">
        {fallback.initials}
      </div>

      {showRarityLabel && (
        <div 
          className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 relative z-10"
          style={{ color: fallback.color }}
        >
          {fallback.rarityLabel}
        </div>
      )}

      {/* Rarity Glow Border */}
      <div 
        className="absolute inset-0 border-2 opacity-20 pointer-events-none rounded-[inherit]"
        style={{ borderColor: fallback.color }}
      />
    </div>
  );

  return (
    <div className={cn("w-full h-full relative overflow-hidden bg-zinc-900", className)}>
      {imageUrl && !imageError ? (
        <img 
          src={imageUrl} 
          alt={card.name || 'Card Art'} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          onError={() => setImageError(true)}
        />
      ) : (
        renderFallback()
      )}
    </div>
  );
};
