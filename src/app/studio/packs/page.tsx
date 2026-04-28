'use client';

import { useState } from 'react';
import { 
  Package, 
  Plus, 
  Settings2, 
  TrendingUp, 
  DollarSign, 
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PackBuilder() {
  const [packName, setPackName] = useState('');
  const [price, setPrice] = useState(0);
  const [supply, setSupply] = useState(1000);
  
  const [rarityOdds, setRarityOdds] = useState({
    Common: 70,
    Rare: 20,
    Epic: 8,
    Legendary: 2
  });

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black font-space text-white uppercase tracking-tighter">Pack Architect</h1>
          <p className="text-primary font-space font-bold tracking-[0.3em] uppercase text-xs">Designing asset distribution</p>
        </div>
        <button className="flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-gradient text-white font-bold font-space shadow-lg hover:scale-105 transition-all">
          DEPLOY PACK TO MARKET
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pack Config */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 space-y-8">
             <div className="space-y-4">
                <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Base Configuration</label>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <p className="text-xs text-zinc-400 ml-1">Pack Name</p>
                     <input 
                       type="text" 
                       placeholder="GENESIS CORE"
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-space focus:border-primary outline-none transition-all"
                       value={packName}
                       onChange={(e) => setPackName(e.target.value)}
                     />
                   </div>
                   <div className="space-y-2">
                     <p className="text-xs text-zinc-400 ml-1">Unit Price (SOLG)</p>
                     <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input 
                          type="number" 
                          placeholder="250"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-space focus:border-primary outline-none transition-all"
                          value={price}
                          onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                        />
                     </div>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Probability Matrix (Total: 100%)</label>
                  <span className={cn(
                    "text-xs font-bold",
                    Object.values(rarityOdds).reduce((a, b) => a + b, 0) === 100 ? "text-secondary" : "text-red-400"
                  )}>
                    {Object.values(rarityOdds).reduce((a, b) => a + b, 0)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(rarityOdds).map(([rarity, val]) => (
                    <div key={rarity} className="space-y-2">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter text-center">{rarity}</p>
                      <input 
                        type="number" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center font-black font-space focus:border-primary outline-none transition-all"
                        value={val}
                        onChange={(e) => setRarityOdds({ ...rarityOdds, [rarity]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
             </div>

             <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Inclusion Pool</label>
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                   <input 
                     type="text" 
                     placeholder="Search cards to include in this pack..."
                     className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-space focus:border-primary outline-none transition-all"
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <CardToggle name="CORE SENTINEL" rarity="Common" />
                   <CardToggle name="VORTEX REAPER" rarity="Rare" selected />
                </div>
             </div>
          </div>
        </div>

        {/* Live Preview / Summary */}
        <div className="space-y-6">
           <div className="glass-card p-8 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary-gradient flex items-center justify-center text-white neon-glow-purple">
                   <Package size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-black font-space text-white">{packName || 'NEW PACK'}</h3>
                   <p className="text-xs text-primary font-bold font-space uppercase tracking-widest">Active Draft</p>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Est. Revenue</span>
                    <span className="text-white font-black font-space">{(price * supply).toLocaleString()} SOLG</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Supply Limit</span>
                    <span className="text-white font-black font-space">{supply.toLocaleString()} Units</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Project ID</span>
                    <span className="text-white font-mono text-xs">SOLG_0x82...</span>
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                 <p className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest mb-4">Deployment Status</p>
                 <StatusItem label="Security Rules Applied" done />
                 <StatusItem label="Metadata Verified" done />
                 <StatusItem label="Economy Balanced" done />
                 <StatusItem label="Solana Minting Ready" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function CardToggle({ name, rarity, selected }: any) {
  return (
    <div className={cn(
      "p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
      selected ? "bg-primary/10 border-primary/40" : "bg-white/5 border-white/5 hover:border-white/10"
    )}>
      <div>
        <p className="text-sm font-black font-space text-white">{name}</p>
        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{rarity}</p>
      </div>
      {selected ? <CheckCircle2 size={16} className="text-primary" /> : <div className="w-4 h-4 rounded-full border-2 border-white/10"></div>}
    </div>
  );
}

function StatusItem({ label, done }: any) {
  return (
    <div className="flex items-center gap-3">
      {done ? <CheckCircle2 size={14} className="text-secondary" /> : <div className="w-[14px] h-[14px] rounded-full border-2 border-white/10"></div>}
      <span className={cn("text-xs font-medium", done ? "text-white" : "text-zinc-500")}>{label}</span>
    </div>
  );
}
