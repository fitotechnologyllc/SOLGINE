/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Library, Search, Filter, Sword, Shield, Zap, X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { ValueIndexPanel } from '@/components/ui/ValueIndexPanel';

export default function CollectionPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [valueIndices, setValueIndices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState('All');
  
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [isListing, setIsListing] = useState(false);

  const { user } = useAuth();

  const fetchCollection = async () => {
    if (!user) return;
    try {
      const collRef = doc(db, 'playerCollections', user.uid);
      const collSnap = await getDoc(collRef);
      
      let fullCards: any[] = [];
      if (collSnap.exists()) {
        const collData = collSnap.data();
        const cardsData = collData.cards || [];
        
        const cardPromises = cardsData.map(async (c: any) => {
          if (c.count <= 0) return null;
          const cardDoc = await getDoc(doc(db, 'cards', c.cardId));
          if (!cardDoc.exists()) return null;
          return { ...cardDoc.data(), count: c.count, listedCount: c.listedCount || 0, id: c.cardId };
        });
        
        fullCards = (await Promise.all(cardPromises)).filter(Boolean);
        setCards(fullCards);
        
        // Fetch value indices
        const indicesPromises = fullCards.map(async (c) => {
          const indexSnap = await getDoc(doc(db, 'cardValueIndex', c.id));
          return indexSnap.exists() ? { id: c.id, ...indexSnap.data() } : null;
        });
        const indices = (await Promise.all(indicesPromises)).filter(Boolean);
        
        const indicesMap: Record<string, any> = {};
        indices.forEach(idx => {
          if (idx) indicesMap[idx.id] = idx;
        });
        setValueIndices(indicesMap);
      } else {
        setCards([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCollection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
      const matchRarity = filterRarity === 'All' || c.rarity?.toLowerCase() === filterRarity.toLowerCase();
      return matchSearch && matchRarity;
    });
  }, [cards, search, filterRarity]);

  const stats = useMemo(() => {
    let total = 0;
    const unique = cards.length;
    let value = 0;
    
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    let highest = 'Common';
    let highestIdx = 0;

    cards.forEach(c => {
      total += c.count;
      
      const v = valueIndices[c.id];
      const estValue = v?.averageSale || v?.estimatedValueLow || c.estimatedValue || 0;
      value += estValue * c.count;

      const rIdx = rarityOrder.indexOf((c.rarity || '').toLowerCase());
      if (rIdx > highestIdx) {
        highestIdx = rIdx;
        highest = c.rarity;
      }
    });

    return { total, unique, value: Math.round(value), highest };
  }, [cards, valueIndices]);

  const handleSellSubmit = async () => {
    if (!selectedCard || !sellPrice) return;
    const price = parseFloat(sellPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Invalid price');
      return;
    }
    
    const availableCount = (selectedCard.count || 0) - (selectedCard.listedCount || 0);
    if (availableCount <= 0) {
      toast.error('No available copies to list');
      return;
    }

    setIsListing(true);
    try {
      const res = await fetch('/api/market/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.uid, cardId: selectedCard.id, price })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Card listed on Market Index.');
      setSellModalOpen(false);
      setSellPrice('');
      setSelectedCard(null);
      await fetchCollection(); // refresh data
    } catch (e: any) {
      toast.error(e.message || 'Failed to list card');
    } finally {
      setIsListing(false);
    }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'mythic': return 'text-red-400';
      case 'legendary': return 'text-amber-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      case 'uncommon': return 'text-secondary';
      default: return 'text-zinc-400';
    }
  };

  const rarities = ['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

  if (loading) return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pt-10">
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
        <div className="space-y-2">
          <div className="w-48 h-8 bg-white/5 animate-pulse rounded-lg" />
          <div className="w-32 h-4 bg-white/5 animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 pt-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Library size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black font-space text-white uppercase">HYPER ARCHIVE</h1>
            <p className="text-zinc-500 font-space text-xs tracking-widest uppercase">Your owned digital card vault</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-white/5">
          <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-widest">Total Cards</p>
          <h3 className="text-2xl font-black font-space text-white mt-1">{stats.total}</h3>
        </div>
        <div className="glass-card p-4 border-white/5">
          <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-widest">Unique Cards</p>
          <h3 className="text-2xl font-black font-space text-white mt-1">{stats.unique}</h3>
        </div>
        <div className="glass-card p-4 border-white/5">
          <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-widest">Collection Value</p>
          <h3 className="text-2xl font-black font-space text-white mt-1">{stats.value} <span className="text-xs text-zinc-500">SOLG</span></h3>
        </div>
        <div className="glass-card p-4 border-white/5">
          <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-widest">Highest Rarity</p>
          <h3 className={cn("text-2xl font-black font-space mt-1", getRarityText(stats.highest))}>{stats.highest}</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-2 md:pb-0 scrollbar-none">
          {rarities.map(r => (
            <button 
              key={r}
              onClick={() => setFilterRarity(r)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap",
                filterRarity === r ? "bg-white/10 text-white border border-white/20" : "text-zinc-500 border border-transparent hover:text-zinc-300"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search collection..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-12 text-white text-sm font-space focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 glass-card border-white/5">
           <Library size={48} className="text-zinc-700" />
           <p className="text-zinc-400 font-space font-bold uppercase tracking-widest">
             {cards.length === 0 ? "No cards yet — open your first pack" : "No cards match your filters"}
           </p>
           {cards.length === 0 && (
             <button onClick={() => window.location.href = '/packs'} className="px-6 py-2 rounded-lg bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all uppercase tracking-widest">
               Visit Booster Station
             </button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredCards.map((card) => (
            <div 
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className={cn(
                "aspect-[3/4] rounded-3xl p-1 relative group cursor-pointer overflow-hidden transition-all duration-300",
                card.rarity?.toLowerCase() === 'legendary' ? "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]" : 
                card.rarity?.toLowerCase() === 'mythic' ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-white/10"
              )}
            >
               <div className="w-full h-full rounded-[1.4rem] bg-[#0d0d0d] p-3 flex flex-col">
                  <div className="w-full aspect-square rounded-xl bg-zinc-900 overflow-hidden relative mb-3">
                     {card.imageUrl && <img src={card.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                     <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[8px] font-black text-white border border-white/10">
                        x{card.count}
                     </div>
                     {card.listedCount > 0 && (
                       <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-secondary/20 text-[8px] font-black text-secondary border border-secondary/20 flex items-center gap-1">
                         <TrendingUp size={8} /> Listed
                       </div>
                     )}
                  </div>
                  
                  <h3 className="text-xs font-black font-space text-white truncate">{card.name}</h3>
                  <p className={cn("text-[8px] font-bold tracking-widest uppercase mb-3", getRarityText(card.rarity))}>{card.rarity}</p>
                  
                  <div className="mt-auto flex justify-between items-center text-[10px] font-black font-space text-white/60">
                     <div className="flex items-center gap-1">
                        <Sword size={12} className="text-zinc-600" /> {card.attack || 0}
                     </div>
                     <div className="flex items-center gap-1">
                        <Shield size={12} className="text-zinc-600" /> {card.defense || 0}
                     </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative">
            <button 
              onClick={() => { setSelectedCard(null); setSellModalOpen(false); }}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
            
            <div className="md:w-2/5 p-6 md:p-8 bg-zinc-900/50 flex flex-col items-center justify-center border-r border-white/5">
               <div className={cn(
                 "w-full aspect-[3/4] max-w-sm rounded-2xl overflow-hidden relative shadow-2xl",
                 selectedCard.rarity?.toLowerCase() === 'legendary' ? "border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]" : 
                 selectedCard.rarity?.toLowerCase() === 'mythic' ? "border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "border border-white/10"
               )}>
                 {selectedCard.imageUrl ? (
                   <img src={selectedCard.imageUrl} alt={selectedCard.name} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                     <Library size={48} className="text-zinc-700" />
                   </div>
                 )}
               </div>
               <div className="mt-6 flex justify-center gap-4 w-full">
                 <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                    <Sword size={16} className="text-zinc-500" />
                    <span className="text-white font-space font-black">{selectedCard.attack || 0}</span>
                 </div>
                 <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                    <Shield size={16} className="text-zinc-500" />
                    <span className="text-white font-space font-black">{selectedCard.defense || 0}</span>
                 </div>
               </div>
            </div>
            
            <div className="md:w-3/5 p-6 md:p-8 space-y-6">
               <div>
                 <span className={cn("text-xs font-bold tracking-widest uppercase", getRarityText(selectedCard.rarity))}>
                   {selectedCard.rarity}
                 </span>
                 <h2 className="text-3xl font-black font-space text-white uppercase mt-1 mb-2">{selectedCard.name}</h2>
                 <p className="text-zinc-400 text-sm leading-relaxed">{selectedCard.ability || "No special ability."}</p>
               </div>
               
               <div className="flex gap-6 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Owned</p>
                    <p className="text-xl font-black text-white">{selectedCard.count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Listed</p>
                    <p className="text-xl font-black text-secondary">{selectedCard.listedCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base Value</p>
                    <p className="text-xl font-black text-white">{selectedCard.estimatedValue || 0} <span className="text-[10px] text-zinc-500">SOLG</span></p>
                  </div>
               </div>

               <ValueIndexPanel index={valueIndices[selectedCard.id] || null} />

               {sellModalOpen ? (
                 <div className="glass-card p-4 space-y-4 border-secondary/20">
                   <h4 className="text-sm font-bold text-white">List on Market Index</h4>
                   <div>
                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Listing Price (SOLG)</label>
                     <input 
                       type="number" 
                       value={sellPrice}
                       onChange={e => setSellPrice(e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm font-space focus:border-secondary outline-none"
                       placeholder="e.g. 150"
                     />
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={handleSellSubmit}
                       disabled={isListing}
                       className="flex-1 bg-secondary text-black font-black font-space text-sm tracking-widest uppercase py-3 rounded-xl disabled:opacity-50"
                     >
                       {isListing ? 'Listing...' : 'Confirm Listing'}
                     </button>
                     <button 
                       onClick={() => setSellModalOpen(false)}
                       className="px-4 py-3 border border-white/10 text-white font-black font-space text-sm tracking-widest uppercase rounded-xl hover:bg-white/5"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-wrap gap-3 pt-2">
                    <button className="flex-1 bg-primary text-black font-black font-space text-sm tracking-widest uppercase py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 transition-all">
                      Add to Deck
                    </button>
                    <button 
                      onClick={() => setSellModalOpen(true)}
                      className="flex-1 bg-secondary text-black font-black font-space text-sm tracking-widest uppercase py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(20,241,149,0.3)] hover:scale-105 transition-all"
                    >
                      Sell Card
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
