'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useProject } from '@/components/providers/ProjectProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Plus, Layers, Image as ImageIcon, Shield, Zap, X, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudioCardsPage() {
  const { user } = useAuth();
  const { projectId, activeProject } = useProject();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    rarity: 'Common',
    supplyLimit: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (!projectId) return;
    
    const q = query(collection(db, 'cards'), where('projectId', '==', projectId));
    const unsub = onSnapshot(q, (snap) => {
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [projectId]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const loadingToast = toast.loading('Creating card...');
    try {
      const res = await fetch('/api/studio/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, projectId, ownerUid: user.uid })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Card Created!', { id: loadingToast });
      setIsCreating(false);
      setFormData({ name: '', rarity: 'Common', supplyLimit: '', imageUrl: '' });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  return (
    <div className="p-10 space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-primary font-space font-bold tracking-[0.3em] uppercase text-xs mb-2">Asset Management</p>
          <h1 className="text-4xl font-black font-space text-white uppercase tracking-tighter">PROJECT_CARDS</h1>
          <p className="text-zinc-500 text-xs font-space uppercase tracking-widest mt-2">{activeProject?.name} • {cards.length} Total Assets</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-gradient text-white font-black font-space shadow-lg hover:scale-105 transition-all uppercase tracking-widest text-xs"
        >
          <Plus size={18} />
          Create_New_Card
        </button>
      </header>

      {/* Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
           {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
           {cards.map((card) => (
             <div key={card.id} className="glass-card group hover:border-primary/30 transition-all overflow-hidden flex flex-col">
                <div className="aspect-[3/4] bg-white/5 relative overflow-hidden">
                   {card.imageUrl ? (
                     <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-zinc-800">
                        <ImageIcon size={48} />
                     </div>
                   )}
                   <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase text-white tracking-widest">
                      {card.rarity}
                   </div>
                </div>
                <div className="p-4 space-y-1">
                   <h4 className="text-sm font-black font-space text-white uppercase truncate">{card.name}</h4>
                   <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                      <span>Supply: {card.supplyLimit || '∞'}</span>
                      <span className="text-primary">{card.mintedCount || 0} Minted</span>
                   </div>
                </div>
             </div>
           ))}
           
           {cards.length === 0 && (
             <div className="col-span-full py-20 text-center border-2 border-white/5 border-dashed rounded-3xl">
                <Layers size={48} className="mx-auto text-zinc-800 mb-4" />
                <p className="text-zinc-600 font-black font-space uppercase tracking-widest">No cards found in this project</p>
                <button onClick={() => setIsCreating(true)} className="mt-4 text-primary text-xs font-black uppercase tracking-widest hover:underline">Start Designing Now</button>
             </div>
           )}
        </div>
      )}

      {/* Create Card Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsCreating(false)} />
           <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                 <h3 className="text-xl font-black font-space text-white uppercase tracking-tighter">NEW_ASSET_ARCHITECT</h3>
                 <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </header>

              <form onSubmit={handleCreateCard} className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Card Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Neon Samurai"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-space focus:outline-none focus:border-primary/50"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Rarity Class</label>
                       <select 
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-space focus:outline-none focus:border-primary/50 appearance-none"
                         value={formData.rarity}
                         onChange={e => setFormData({...formData, rarity: e.target.value})}
                       >
                          <option>Common</option>
                          <option>Uncommon</option>
                          <option>Rare</option>
                          <option>Epic</option>
                          <option>Legendary</option>
                          <option>Mythic</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Supply Limit</label>
                       <input 
                         type="number" 
                         placeholder="Leave blank for infinite"
                         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-space focus:outline-none focus:border-primary/50"
                         value={formData.supplyLimit}
                         onChange={e => setFormData({...formData, supplyLimit: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Card Artwork URL</label>
                    <input 
                      required
                      type="url" 
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    />
                 </div>

                 <button 
                   type="submit"
                   className="w-full py-4 rounded-xl bg-white text-black font-black font-space uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary transition-all mt-4 shadow-xl"
                 >
                   INITIALIZE_ASSET
                   <ArrowRight size={18} />
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
