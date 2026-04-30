'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useProject } from '@/components/providers/ProjectProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Plus, PackageSearch, Image as ImageIcon, Zap, X, ArrowRight, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudioPacksPage() {
  const { user } = useAuth();
  const { projectId, activeProject } = useProject();
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
    rarityOdds: {
      common: 70,
      uncommon: 20,
      rare: 8,
      epic: 1.5,
      legendary: 0.4,
      mythic: 0.1
    }
  });

  useEffect(() => {
    if (!projectId) return;
    
    const q = query(collection(db, 'boosterPacks'), where('projectId', '==', projectId));
    const unsub = onSnapshot(q, (snap) => {
      setPacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [projectId]);

  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Normalize odds to 0-1 range
    const normalizedOdds = Object.fromEntries(
      Object.entries(formData.rarityOdds).map(([k, v]) => [k, v / 100])
    );

    const loadingToast = toast.loading('Creating booster pack...');
    try {
      const res = await fetch('/api/studio/create-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          rarityOdds: normalizedOdds,
          projectId, 
          ownerUid: user.uid 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Pack Created!', { id: loadingToast });
      setIsCreating(false);
      setFormData({ 
        name: '', price: '', description: '', imageUrl: '', 
        rarityOdds: { common: 70, uncommon: 20, rare: 8, epic: 1.5, legendary: 0.4, mythic: 0.1 } 
      });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  return (
    <div className="p-10 space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-secondary font-space font-bold tracking-[0.3em] uppercase text-xs mb-2">Booster Infrastructure</p>
          <h1 className="text-4xl font-black font-space text-white uppercase tracking-tighter">ECONOMY_PACKS</h1>
          <p className="text-zinc-500 text-xs font-space uppercase tracking-widest mt-2">{activeProject?.name} • {packs.length} Active Configurations</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary-gradient text-white font-black font-space shadow-lg hover:scale-105 transition-all uppercase tracking-widest text-xs"
        >
          <Plus size={18} />
          Create_Booster_Pack
        </button>
      </header>

      {/* Packs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[1,2,3].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {packs.map((pack) => (
             <div key={pack.id} className="glass-card group p-6 space-y-6 hover:border-secondary/30 transition-all">
                <div className="flex justify-between items-start">
                   <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                      <PackageSearch size={32} />
                   </div>
                   <div className="text-right">
                      <p className="text-xl font-black font-space text-white">{pack.price} SOLG</p>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Base Price</p>
                   </div>
                </div>

                <div>
                   <h3 className="text-xl font-black font-space text-white uppercase truncate">{pack.name}</h3>
                   <p className="text-xs text-zinc-500 font-space uppercase tracking-tight mt-1 line-clamp-2">{pack.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                   {Object.entries(pack.rarityOdds).map(([rarity, odds]: [string, any]) => (
                     <div key={rarity} className="p-2 rounded-lg bg-black/40 border border-white/5">
                        <p className="text-[8px] font-black text-zinc-500 uppercase">{rarity}</p>
                        <p className="text-[10px] font-bold text-white">{(odds * 100).toFixed(1)}%</p>
                     </div>
                   ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Active</span>
                   </div>
                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{pack.soldCount || 0} Sold</span>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Create Pack Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsCreating(false)} />
           <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                 <h3 className="text-xl font-black font-space text-white uppercase tracking-tighter">PACK_ARCHITECT</h3>
                 <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </header>

              <form onSubmit={handleCreatePack} className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Pack Name</label>
                       <input 
                         required
                         type="text" 
                         placeholder="e.g. Genesis Booster"
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-space focus:outline-none focus:border-secondary/50"
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Base Price (SOLG)</label>
                       <input 
                         required
                         type="number" 
                         placeholder="100"
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-space focus:outline-none focus:border-secondary/50"
                         value={formData.price}
                         onChange={e => setFormData({...formData, price: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Rarity Odds (%)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                       {Object.keys(formData.rarityOdds).map((rarity) => (
                         <div key={rarity} className="space-y-1">
                            <p className="text-[8px] font-black text-zinc-600 uppercase text-center">{rarity}</p>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center text-xs text-white font-mono focus:outline-none focus:border-secondary/50"
                              value={(formData.rarityOdds as any)[rarity]}
                              onChange={e => setFormData({
                                ...formData, 
                                rarityOdds: { ...formData.rarityOdds, [rarity]: parseFloat(e.target.value) }
                              })}
                            />
                         </div>
                       ))}
                    </div>
                    <p className="text-[9px] text-zinc-600 italic mt-2">Note: Ensure total odds roughly equal 100%.</p>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Description</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="What's inside this pack?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-space focus:outline-none focus:border-secondary/50 resize-none"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                 </div>

                 <button 
                   type="submit"
                   className="w-full py-4 rounded-xl bg-white text-black font-black font-space uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-secondary transition-all mt-4 shadow-xl"
                 >
                   INITIALIZE_ECONOMY_PACK
                   <ArrowRight size={18} />
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
