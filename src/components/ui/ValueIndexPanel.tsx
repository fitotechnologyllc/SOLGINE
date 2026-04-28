import React from 'react';
import { TrendingUp, Activity, BarChart2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValueIndexProps {
  index: {
    estimatedValueLow: number;
    estimatedValueHigh: number;
    floorPrice: number;
    lastSale: number;
    averageSale: number;
    activeListings: number;
    demandScore: number;
  } | null;
  className?: string;
}

export function ValueIndexPanel({ index, className }: ValueIndexProps) {
  if (!index) {
    return (
      <div className={cn("glass-card p-4 flex flex-col items-center justify-center text-center text-zinc-500", className)}>
        <Activity size={24} className="mb-2 opacity-50" />
        <p className="font-space text-xs uppercase tracking-widest">No Market Data</p>
      </div>
    );
  }

  return (
    <div className={cn("glass-card p-5 space-y-4 border-white/5", className)}>
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={16} className="text-secondary" />
        <h3 className="font-black font-space text-white uppercase tracking-widest text-sm">Value Index</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Est. Value Range</p>
          <p className="text-sm font-black text-white">{index.estimatedValueLow} - {index.estimatedValueHigh} <span className="text-[10px] text-zinc-500">SOLG</span></p>
        </div>
        
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Floor Price</p>
          <p className="text-sm font-black text-white">{index.floorPrice > 0 ? `${index.floorPrice} ` : '-- '} <span className="text-[10px] text-zinc-500">SOLG</span></p>
        </div>

        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Last Sale</p>
          <p className="text-sm font-black text-white">{index.lastSale > 0 ? `${index.lastSale} ` : '-- '} <span className="text-[10px] text-zinc-500">SOLG</span></p>
        </div>
        
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Active Listings</p>
          <p className="text-sm font-black text-white">{index.activeListings}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-2 mt-2 pt-3 border-t border-white/5 text-[10px] text-zinc-500 leading-tight">
        <Info size={12} className="shrink-0 mt-0.5" />
        <p>Estimated values are informational only and may change based on market activity. Values are calculated from rarity, supply, and recent transactions.</p>
      </div>
    </div>
  );
}
