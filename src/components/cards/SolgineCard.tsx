'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Swords, Box, Info, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRarityColor } from '@/lib/card-utils';
import { CardArt } from './CardArt';
import { getCardImage } from '@/lib/card-media';

export type CardRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
export type CardFinish = 'None' | 'Holographic' | 'Animated Holo' | 'Prismatic' | 'Glitch' | 'Mythic Aura';

export interface CardStats {
  atk: number;
  def: number;
  spd: number;
  util: number;
}

export interface SolgineCardProps {
  cardId: string;
  name: string;
  type: string;
  rarity: CardRarity;
  finish?: CardFinish;
  artworkUrl: string;
  stats: CardStats;
  description: string;
  projectLogo?: string;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'collection' | 'market';
  ownedCount?: number;
  price?: number;
  currency?: string;
}

const rarityStyles: Record<CardRarity, { border: string; bg: string; glow: string; text: string }> = {
  Common: {
    border: 'border-zinc-700',
    bg: 'from-zinc-900/80 to-black',
    glow: 'group-hover:shadow-zinc-500/10',
    text: 'text-zinc-400',
  },
  Rare: {
    border: 'border-blue-500/30',
    bg: 'from-blue-900/20 to-black',
    glow: 'group-hover:shadow-blue-500/20',
    text: 'text-blue-400',
  },
  Epic: {
    border: 'border-purple-500/40',
    bg: 'from-purple-900/20 to-black',
    glow: 'group-hover:shadow-purple-500/30',
    text: 'text-purple-400',
  },
  Legendary: {
    border: 'border-amber-500/50',
    bg: 'from-amber-900/20 to-black',
    glow: 'group-hover:shadow-amber-500/40',
    text: 'text-amber-500',
  },
  Mythic: {
    border: 'border-transparent bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px]',
    bg: 'from-black to-black',
    glow: 'group-hover:shadow-pink-500/50',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400',
  },
};

export const SolgineCard: React.FC<SolgineCardProps> = (props) => {
  const {
    cardId,
    name,
    type,
    rarity,
    finish = 'None',
    artworkUrl,
    stats,
    description,
    projectLogo,
    className,
    onClick,
    variant = 'default',
    ownedCount,
    price,
    currency = 'SOLG'
  } = props;
  const normalizedRarity = (rarity?.charAt(0).toUpperCase() + rarity?.slice(1).toLowerCase()) as CardRarity;
  const style = rarityStyles[normalizedRarity] || rarityStyles.Common;

  return (
    <motion.div
      whileHover={{ y: -12, scale: 1.04, rotateY: 5 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "relative group aspect-[3/4.5] w-full max-w-[320px] rounded-[2rem] cursor-pointer transition-all duration-500 shadow-2xl",
        normalizedRarity === 'Mythic' ? style.border : cn("border bg-gradient-to-b p-2 pt-3", style.border, style.bg),
        style.glow,
        "hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {/* Top Initials Badge (PR / VW / CD) - High Z-Index to avoid covering */}
      <div className="absolute top-[12px] left-[12px] z-[50] flex items-center justify-center w-9 h-9 rounded-xl bg-black/80 backdrop-blur-2xl border border-white/30 shadow-[0_8px_16px_rgba(0,0,0,0.5)] transform group-hover:scale-110 group-hover:border-white/50 transition-all duration-500">
        <span className={cn("text-xs font-black font-space tracking-tighter", style.text)}>
          {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </span>
      </div>
      {/* Rarity Glow Animation */}
      <div className={cn(
        "absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl",
        normalizedRarity === 'Common' && "bg-zinc-500/10",
        normalizedRarity === 'Rare' && "bg-blue-500/20",
        normalizedRarity === 'Epic' && "bg-purple-500/30",
        normalizedRarity === 'Legendary' && "bg-amber-500/40",
        normalizedRarity === 'Mythic' && "bg-pink-500/50"
      )} />

      {/* Owned Count Badge */}
      {variant === 'collection' && ownedCount !== undefined && (
        <div className="absolute top-4 right-4 z-30 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 shadow-xl flex items-center gap-1.5 transform group-hover:scale-110 transition-transform">
           <div className={cn("w-2 h-2 rounded-full animate-pulse", 
             normalizedRarity === 'Common' ? "bg-zinc-400" : 
             normalizedRarity === 'Rare' ? "bg-blue-400" : 
             normalizedRarity === 'Epic' ? "bg-purple-400" : 
             normalizedRarity === 'Legendary' ? "bg-amber-400" : 
             "bg-pink-400"
           )} />
           <span className="text-[10px] font-black font-space text-white">x{ownedCount}</span>
        </div>
      )}
      {/* Mythic Specific Animated Border/Glow */}
      {normalizedRarity === 'Mythic' && (
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-[spin_4s_linear_infinite] opacity-50 blur-xl" />
      )}

      {/* Main Content Container */}
      <div className={cn(
        "relative z-10 w-full h-full flex flex-col p-1",
        normalizedRarity === 'Mythic' ? "bg-[#0a0a0a] p-3 rounded-[1.8rem]" : "bg-transparent"
      )}>
        
        {/* TOP: Rarity & ID - Shifted Right to avoid badge */}
        <div className="flex items-center justify-end gap-3 mb-3 px-1">
          <div className="text-[9px] font-mono text-zinc-500 tracking-tighter">
            #{cardId.slice(-6).toUpperCase()}
          </div>
          <div className={cn(
            "px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest",
            style.text
          )}>
            {rarity}
          </div>
        </div>

        <div className="relative h-[140px] rounded-2xl overflow-hidden mb-3 border border-white/10 bg-zinc-950 shadow-2xl group/art z-[5]">
          <CardArt card={props} className="w-full h-full scale-110 group-hover/art:scale-125 transition-transform duration-700" />
          
          {/* Finish Effects Overlays */}
          {finish === 'Holographic' && (
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10 opacity-30 pointer-events-none" />
          )}
          {finish === 'Animated Holo' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite] pointer-events-none" />
          )}
          {finish === 'Prismatic' && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-green-500/10 to-blue-500/10 mix-blend-overlay opacity-50 animate-[hue-rotate_10s_linear_infinite] pointer-events-none" />
          )}
          {finish === 'Glitch' && (
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-cyan-500/20 translate-x-[2px] mix-blend-screen animate-pulse" />
                <div className="absolute inset-0 bg-red-500/20 -translate-x-[2px] mix-blend-screen animate-pulse delay-75" />
             </div>
          )}
          {finish === 'Mythic Aura' && (
            <div className="absolute inset-0 pointer-events-none">
               <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-60 animate-pulse" />
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/20 blur-[40px] rounded-full animate-glow" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-40" />
        </div>

        {/* BELOW ARTWORK: Name & Type */}
        <div className="px-1 mb-3">
           <h3 className={cn("text-xl font-black font-space uppercase leading-none tracking-tighter mb-1", style.text)}>
              {name}
           </h3>
           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
              {type}
           </p>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-4 gap-2 mb-4 px-1">
           <StatBox icon={Swords} value={stats.atk} label="ATK" color="text-red-400" />
           <StatBox icon={Shield} value={stats.def} label="DEF" color="text-blue-400" />
           <StatBox icon={Zap} value={stats.spd} label="SPD" color="text-amber-400" />
           <StatBox icon={Box} value={stats.util} label="UTIL" color="text-emerald-400" />
        </div>

        {/* BOTTOM: Description & Branding */}
        <div className="mt-auto pt-3 pb-2 border-t border-white/5 flex flex-col gap-3 px-1">
           <p className="text-[10px] text-zinc-400 leading-relaxed font-medium line-clamp-2 italic opacity-80 min-h-[2.5em]">
              "{description}"
           </p>
           
           <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 max-w-[65%]">
                 {projectLogo ? (
                   <img src={projectLogo} alt="Project" className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" />
                 ) : (
                   <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Star size={10} className="text-zinc-500" />
                   </div>
                 )}
                 <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest truncate">SOLGINE_GENESIS</span>
              </div>
              
              {(variant === 'collection' || variant === 'market') && price !== undefined && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 group-hover:border-white/30 transition-colors shadow-lg">
                   <span className="text-[10px] font-black font-space text-white">{price}</span>
                   <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">{currency}</span>
                </div>
              )}

              {variant === 'default' && finish !== 'None' && (
                <div className="flex items-center gap-1.5 shrink-0">
                   <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#9945ff]" />
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest">{finish}</span>
                   </div>
                </div>
              )}
           </div>
        </div>

      </div>

      {/* Global Shine Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 pointer-events-none group-hover:via-white/[0.08] transition-all duration-500" />
    </motion.div>
  );
};

function StatBox({ icon: Icon, value, label, color }: { icon: any, value: number, label: string, color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-1.5 border border-white/5 flex flex-col items-center justify-center group/stat hover:bg-white/10 transition-colors">
       <Icon size={12} className={cn("mb-1", color)} />
       <span className="text-xs font-black font-space text-white leading-none mb-0.5">{value}</span>
       <span className="text-[7px] font-bold text-zinc-500 tracking-tighter uppercase">{label}</span>
    </div>
  );
}
