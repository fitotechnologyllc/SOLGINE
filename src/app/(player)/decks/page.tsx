/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, getDoc, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  Hammer, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Filter, 
  Sword, 
  Shield, 
  Zap, 
  Sparkles,
  Save,
  Library,
  ArrowRight,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Card {
  id: string;
  name: string;
  rarity: string;
  type: string;
  attack: number;
  defense: number;
  ability: string;
  imageUrl: string;
  count?: number;
}

interface Deck {
  deckId: string;
  name: string;
  cards: string[];
  totalCards: number;
  primaryRarity: string;
  powerScore: number;
  isActive: boolean;
  createdAt: string;
}

const RARITY_BONUS: Record<string, number> = {
  common: 1,
  uncommon: 3,
  rare: 6,
  epic: 10,
  legendary: 20,
  mythic: 40
};

function DeckForgeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editDeckId = searchParams.get('edit');

  const [decks, setDecks] = useState<Deck[]>([]);
  const [ownedCards, setOwnedCards] = useState<Card[]>([]);
  const [isBuilding, setIsBuilding] = useState(!!editDeckId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Builder State
  const [deckName, setDeckName] = useState('New Deck');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState('All');

  useEffect(() => {
    if (!user) return;

    // Fetch Decks
    const q = query(collection(db, 'decks'), where('userId', '==', user.uid));
    const unsubDecks = onSnapshot(q, (snap) => {
      setDecks(snap.docs.map(doc => ({ ...doc.data() } as Deck)));
      setLoading(false);
    });

    // Fetch Collection
    const fetchCollection = async () => {
      try {
        const collRef = doc(db, 'playerCollections', user.uid);
        const collSnap = await getDoc(collRef);
        
        if (collSnap.exists()) {
          const cardsData = collSnap.data().cards || [];
          const cardPromises = cardsData.map(async (c: any) => {
            const cardDoc = await getDoc(doc(db, 'cards', c.cardId));
            return cardDoc.exists() ? { id: c.cardId, ...cardDoc.data(), count: c.count } as Card : null;
          });
          const fullCards = (await Promise.all(cardPromises)).filter(Boolean) as Card[];
          setOwnedCards(fullCards);
        }
      } catch (e) {
        console.error("Error fetching collection:", e);
      }
    };

    fetchCollection();

    return () => unsubDecks();
  }, [user]);

  useEffect(() => {
    if (editDeckId && decks.length > 0) {
      const deck = decks.find(d => d.deckId === editDeckId);
      if (deck) {
        setDeckName(deck.name);
        setSelectedCards(deck.cards);
        setIsBuilding(true);
      }
    }
  }, [editDeckId, decks]);

  const powerScore = useMemo(() => {
    let score = 0;
    selectedCards.forEach(id => {
      const card = ownedCards.find(c => c.id === id);
      if (card) {
        score += (card.attack || 0) + (card.defense || 0) + (RARITY_BONUS[card.rarity.toLowerCase()] || 0);
      }
    });
    return score;
  }, [selectedCards, ownedCards]);

  const rarityMix = useMemo(() => {
    const mix: Record<string, number> = {};
    selectedCards.forEach(id => {
      const card = ownedCards.find(c => c.id === id);
      if (card) {
        const r = card.rarity.toLowerCase();
        mix[r] = (mix[r] || 0) + 1;
      }
    });
    return mix;
  }, [selectedCards, ownedCards]);

  const filteredOwned = useMemo(() => {
    return ownedCards.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchRarity = filterRarity === 'All' || c.rarity.toLowerCase() === filterRarity.toLowerCase();
      return matchSearch && matchRarity;
    });
  }, [ownedCards, search, filterRarity]);

  const addCard = (cardId: string) => {
    if (selectedCards.length >= 10) {
      toast.error("Deck limit reached (10 cards)");
      return;
    }
    const card = ownedCards.find(c => c.id === cardId);
    if (!card) return;

    const currentCount = selectedCards.filter(id => id === cardId).length;
    if (currentCount >= (card.count || 0)) {
      toast.error(`You only own ${card.count} copies of this card.`);
      return;
    }

    setSelectedCards([...selectedCards, cardId]);
  };

  const removeCard = (index: number) => {
    const newCards = [...selectedCards];
    newCards.splice(index, 1);
    setSelectedCards(newCards);
  };

  const handleSave = async (activate = false) => {
    if (selectedCards.length !== 10) {
      toast.error("Deck must have exactly 10 cards.");
      return;
    }

    const hasCreature = selectedCards.some(id => {
      const card = ownedCards.find(c => c.id === id);
      return card?.type === 'character' || card?.type === 'creature' || card?.type === 'hero' || !card?.type;
    });

    if (!hasCreature) {
      toast.error("Deck must have at least one character/hero card.");
      return;
    }

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/decks/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deckId: editDeckId,
          name: deckName,
          cards: selectedCards,
          isActive: activate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editDeckId ? "Deck updated!" : "Deck forged!");
      setIsBuilding(false);
      router.push('/decks');
    } catch (e: any) {
      toast.error(e.message || "Failed to save deck");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (deckId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/decks/activate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deckId })
      });

      if (!res.ok) throw new Error("Failed to activate deck");
      toast.success("Deck activated for battle!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm("Are you sure you want to dismantle this deck?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/decks/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deckId })
      });

      if (!res.ok) throw new Error("Failed to delete deck");
      toast.success("Deck dismantled.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'mythic': return 'text-red-400';
      case 'legendary': return 'text-amber-400';
      case 'epic': return 'text-purple-400';
      case 'rare': return 'text-blue-400';
      case 'uncommon': return 'text-secondary';
      default: return 'text-zinc-500';
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Zap className="animate-pulse text-primary" size={48} /></div>;

  if (!isBuilding) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-10 pt-10 pb-[120px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Hammer size={28} />
             </div>
             <div>
                <h1 className="text-3xl font-black font-space text-white uppercase tracking-tighter">DECK ARCHIVE</h1>
                <p className="text-zinc-500 font-space text-xs tracking-widest uppercase">Manage your battle configurations</p>
             </div>
          </div>
          
          <button 
            onClick={() => {
              setIsBuilding(true);
              setDeckName('New Deck');
              setSelectedCards([]);
              router.push('/decks');
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-black font-space text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all"
          >
            <Plus size={18} /> Forge New Deck
          </button>
        </div>

        {decks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-6 glass-card border-white/5">
            <Hammer size={48} className="text-zinc-700" />
            <div className="space-y-2">
               <h3 className="text-xl font-black font-space text-white uppercase tracking-widest">No Decks Found</h3>
               <p className="text-zinc-500 text-sm max-w-xs">Forge your first 10-card deck to enter the Battle Arena.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {decks.sort((a,b) => (a.isActive ? -1 : 1)).map(deck => (
               <div key={deck.deckId} className={cn(
                 "glass-card p-6 border-white/5 relative overflow-hidden group transition-all",
                 deck.isActive ? "border-secondary/30 bg-secondary/5" : "hover:border-white/20"
               )}>
                  {deck.isActive && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/20 text-secondary text-[9px] font-black tracking-widest uppercase">
                       <CheckCircle2 size={12} /> Active
                    </div>
                  )}
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-black font-space text-white truncate">{deck.name}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Power Score: <span className="text-white">{deck.powerScore}</span></p>
                  </div>

                  <div className="flex -space-x-3 mb-8">
                     {deck.cards.slice(0, 5).map((id, i) => {
                       const card = ownedCards.find(c => c.id === id);
                       return (
                         <div key={i} className="w-12 h-16 rounded-lg bg-zinc-800 border-2 border-background overflow-hidden relative shadow-lg">
                            {card?.imageUrl && <img src={card.imageUrl} className="w-full h-full object-cover" />}
                         </div>
                       );
                     })}
                     {deck.cards.length > 5 && (
                       <div className="w-12 h-16 rounded-lg bg-zinc-900 border-2 border-background flex items-center justify-center text-[10px] font-black text-zinc-500 shadow-lg">
                          +{deck.cards.length - 5}
                       </div>
                     )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-white/5">
                     {!deck.isActive && (
                        <button 
                          onClick={() => handleActivate(deck.deckId)}
                          className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] tracking-widest uppercase transition-all"
                        >
                          Activate
                        </button>
                     )}
                     <button 
                       onClick={() => router.push(`/decks?edit=${deck.deckId}`)}
                       className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-[10px] tracking-widest uppercase transition-all"
                     >
                       Edit
                     </button>
                     <button 
                       onClick={() => handleDelete(deck.deckId)}
                       className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>
               </div>
             ))}
          </div>
        )}

        <div className="flex justify-center">
           <button 
             onClick={() => router.push('/play')}
             className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-space font-bold uppercase tracking-widest text-xs"
           >
              Back to Arena <ChevronRight size={16} />
           </button>
        </div>
      </div>
    );
  }

  // BUILDING STATE
  return (
    <div className="h-screen flex flex-col bg-[#020202] overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
           <button onClick={() => setIsBuilding(false)} className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white">
              <ChevronLeft size={24} />
           </button>
           <div>
              <div className="flex items-center gap-2">
                 <Hammer size={18} className="text-primary" />
                 <h1 className="text-xl font-black font-space text-white uppercase tracking-tight">DECK FORGE</h1>
              </div>
              <input 
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                className="bg-transparent border-none p-0 text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] focus:ring-0 w-48"
                placeholder="DECK_NAME_REQUIRED"
              />
           </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="hidden md:flex flex-col items-end mr-4">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Power Score</p>
              <p className="text-xl font-black font-space text-white">{powerScore}</p>
           </div>
           <button 
             onClick={() => handleSave(false)}
             disabled={saving}
             className="px-6 py-2.5 rounded-xl border border-white/10 text-white font-black font-space text-xs tracking-widest uppercase hover:bg-white/5 disabled:opacity-50"
           >
              Save Draft
           </button>
           <button 
             onClick={() => handleSave(true)}
             disabled={saving || selectedCards.length !== 10}
             className="px-6 py-2.5 rounded-xl bg-secondary text-black font-black font-space text-xs tracking-widest uppercase shadow-[0_0_20px_rgba(20,241,149,0.4)] hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:grayscale"
           >
              Forge & Activate
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Collection Selection */}
        <div className="flex-1 flex flex-col border-r border-white/5 overflow-hidden">
           <div className="p-4 space-y-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                      placeholder="Search archive..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white font-space outline-none focus:border-primary transition-all"
                    />
                 </div>
                 <select 
                   value={filterRarity}
                   onChange={e => setFilterRarity(e.target.value)}
                   className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest outline-none"
                 >
                    {['All', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                 </select>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {ownedCards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                   <Package size={48} className="text-zinc-800" />
                   <p className="text-zinc-500 font-space font-bold uppercase tracking-widest text-xs">You need cards before building a deck. Open a pack first.</p>
                   <button onClick={() => router.push('/packs')} className="px-6 py-2 rounded-xl bg-primary/10 text-primary font-black font-space text-xs tracking-widest uppercase border border-primary/20">Go to Booster Station</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {filteredOwned.map(card => {
                     const inDeck = selectedCards.filter(id => id === card.id).length;
                     const available = (card.count || 0) - inDeck;
                     
                     return (
                       <div 
                         key={card.id}
                         onClick={() => available > 0 && addCard(card.id)}
                         className={cn(
                           "aspect-[3/4] rounded-2xl p-2 relative group cursor-pointer transition-all border",
                           available > 0 ? "bg-white/5 border-white/5 hover:border-primary/40" : "bg-black/40 border-transparent opacity-40 grayscale"
                         )}
                       >
                          <div className="w-full aspect-square rounded-xl bg-zinc-900 mb-2 overflow-hidden relative">
                             {card.imageUrl && <img src={card.imageUrl} className="w-full h-full object-cover" />}
                             <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/60 text-[8px] font-black text-white border border-white/10">
                                x{available}
                             </div>
                          </div>
                          <h4 className="text-[10px] font-black font-space text-white truncate">{card.name}</h4>
                          <p className={cn("text-[8px] font-bold tracking-widest uppercase", getRarityColor(card.rarity))}>{card.rarity}</p>
                          
                          <div className="mt-auto pt-2 flex justify-between items-center opacity-40 text-[9px] font-bold">
                             <div className="flex items-center gap-1"><Sword size={10} /> {card.attack}</div>
                             <div className="flex items-center gap-1"><Shield size={10} /> {card.defense}</div>
                          </div>
                       </div>
                     );
                   })}
                </div>
              )}
           </div>
        </div>

        {/* Right: Current Deck */}
        <div className="w-full md:w-80 lg:w-96 bg-[#0a0a0a] flex flex-col shrink-0">
           <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                 <div className={cn(
                   "px-2.5 py-1 rounded-lg text-[10px] font-black font-space tracking-widest uppercase",
                   selectedCards.length === 10 ? "bg-secondary/10 text-secondary" : "bg-white/5 text-zinc-500"
                 )}>
                    {selectedCards.length}/10 Cards
                 </div>
              </div>
              <button 
                onClick={() => setSelectedCards([])}
                className="text-[10px] font-bold text-zinc-600 hover:text-red-400 uppercase tracking-widest transition-colors"
              >
                 Clear All
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <AnimatePresence initial={false}>
                {selectedCards.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-20">
                     <Library size={32} />
                     <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Add cards from your archive</p>
                  </div>
                ) : (
                  selectedCards.map((id, index) => {
                    const card = ownedCards.find(c => c.id === id);
                    return (
                      <motion.div 
                        key={`${id}-${index}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-white/20 transition-all"
                      >
                         <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 shrink-0 overflow-hidden">
                            {card?.imageUrl && <img src={card.imageUrl} className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-black font-space text-white truncate">{card?.name}</h4>
                            <p className={cn("text-[8px] font-bold uppercase tracking-widest", getRarityColor(card?.rarity || ''))}>{card?.rarity}</p>
                         </div>
                         <button 
                           onClick={() => removeCard(index)}
                           className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                         >
                            <Trash2 size={14} />
                         </button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
           </div>

           {/* Deck Insights */}
           <div className="p-4 bg-black border-t border-white/10 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Rarity Power</p>
                    <div className="flex justify-center gap-1">
                       {Object.entries(rarityMix).map(([r, count]) => (
                         <div key={r} className={cn("w-1.5 h-1.5 rounded-full", getRarityColor(r).replace('text-', 'bg-'))} />
                       ))}
                    </div>
                 </div>
                 <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Combat Rating</p>
                    <p className="text-xs font-black font-space text-white">{powerScore}</p>
                 </div>
              </div>

              {selectedCards.length < 10 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500/80">
                   <AlertCircle size={14} className="shrink-0" />
                   <p className="text-[9px] font-bold uppercase tracking-widest">Incomplete: Add {10 - selectedCards.length} more cards</p>
                </div>
              )}
           </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default function DeckForgePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Zap className="animate-pulse text-primary" size={48} /></div>}>
      <DeckForgeContent />
    </Suspense>
  );
}
