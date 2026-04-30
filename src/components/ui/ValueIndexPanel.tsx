import React from 'react';
import { TrendingUp, Activity, BarChart2, Info, Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValueIndexProps {
  index: {
    estimatedValueLow?: number;
    estimatedValueHigh?: number;
    estimatedValue?: number;
    floorPrice: number;
    lastSale: number;
    averageSale: number;
    activeListings: number;
    demandScore: number;
    scarcityScore?: number;
    trendingScore?: number;
    priceChange24h?: number;
    mintedCount?: number;
    supplyLimit?: number;
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

  const isTrending = (index.trendingScore || 0) > 10;
  const priceChange = index.priceChange24h || 0;

  return (
    <div className={cn("glass-card p-5 space-y-4 border-white/5 relative overflow-hidden", className)}>
      {isTrending && (
        <div className="absolute top-0 right-0 p-2">
          <div className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-bl-xl flex items-center gap-1 border-l border-b border-orange-500/20">
            <Flame size={12} className="fill-orange-500" />
            <span className="text-[10px] font-black font-space uppercase">Trending</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-secondary" />
          <h3 className="font-black font-space text-white uppercase tracking-widest text-sm">Value Index</h3>
        </div>
        
        {priceChange !== 0 && (
          <div className={cn(
            "flex items-center gap-0.5 text-[10px] font-black font-space px-1.5 py-0.5 rounded-lg",
            priceChange > 0 ? "text-secondary bg-secondary/10" : "text-red-400 bg-red-400/10"
          )}>
            {priceChange > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(priceChange).toFixed(1)}%
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/40 rounded-xl p-3 border border-white/5 col-span-2">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Market Adjusted Value</p>
          <p className="text-xl font-black text-white">
            {index.estimatedValue || index.averageSale || '--'} 
            <span className="text-[10px] text-zinc-500 ml-1">SOLG</span>
          </p>
        </div>

        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Floor Price</p>
          <p className="text-sm font-black text-white">{index.floorPrice > 0 ? `${index.floorPrice} ` : '-- '} <span className="text-[10px] text-zinc-500">SOLG</span></p>
        </div>
        
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Demand Score</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white">{Math.round(index.demandScore || 0)}/100</p>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-secondary" style={{ width: `${Math.min(100, index.demandScore || 0)}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Scarcity</p>
          <p className={cn(
            "text-sm font-black",
            (index.scarcityScore || 0) > 80 ? "text-orange-400" : "text-white"
          )}>
            {Math.round(index.scarcityScore || 0)}%
          </p>
        </div>
        
        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] font-bold font-space text-zinc-500 uppercase tracking-widest mb-1">Active Supply</p>
          <p className="text-sm font-black text-white">
            {index.mintedCount || 0}
            {index.supplyLimit ? <span className="text-[10px] text-zinc-500 ml-0.5">/ {index.supplyLimit}</span> : null}
          </p>
        </div>
      </div>

      {(index.supplyLimit && (index.mintedCount || 0) / index.supplyLimit > 0.8) && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3">
          <Activity size={16} className="text-orange-500" />
          <div>
             <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Supply Alert</p>
             <p className="text-[9px] text-orange-200/60 leading-tight">Less than 20% remains. Rarity multiplier increasing.</p>
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-2 mt-2 pt-3 border-t border-white/5 text-[10px] text-zinc-500 leading-tight">
        <Info size={12} className="shrink-0 mt-0.5" />
        <p>Estimated values are informational only and may change based on market activity. Values are calculated from rarity, supply, and recent transactions.</p>
      </div>
    </div>
  );
}

