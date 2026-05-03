/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, doc, getDoc, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShoppingCart, Search, Filter, Zap, LayoutGrid, List as ListIcon, Info, X, Sword, Shield, Library, Lock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useProject } from '@/components/providers/ProjectProvider';
import { toast } from 'react-hot-toast';
import { ValueIndexPanel } from '@/components/ui/ValueIndexPanel';
import { getCardImage } from '@/lib/card-utils';

export default function MarketPage() {
  const { projectId } = useProject();
  const [view, setView] = useState('grid');
  const [listings, setListings] = useState<any[]>([]);
  const [valueIndices, setValueIndices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [cardDetails, setCardDetails] = useState<Record<string, any>>({});
  const [isBuying, setIsBuying] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    // 1. Listen to Listings for this project
    const q = query(
      collection(db, 'marketListings'), 
      where('projectId', '==', projectId),
      where('status', '==', 'active')
    );
    
    const unsubListings = onSnapshot(q, async (snapshot) => {
      const activeListings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      setListings(activeListings);

      // Fetch indices and card details for active listings
      const indicesMap: Record<string, any> = {};
      const detailsMap: Record<string, any> = {};
      const uniqueCardIds = Array.from(new Set(activeListings.map(l => l.cardId)));
      
      await Promise.all(uniqueCardIds.map(async (cid) => {
        const [indexSnap, cardSnap] = await Promise.all([
          getDoc(doc(db, 'cardValueIndex', cid)),
          getDoc(doc(db, 'cards', cid))
        ]);
        
        if (indexSnap.exists()) indicesMap[cid] = indexSnap.data();
        if (cardSnap.exists()) detailsMap[cid] = cardSnap.data();
      }));

      setValueIndices(indicesMap);
      setCardDetails(detailsMap);
      setLoading(false);
    });

    // 2. Listen to System Status
    const unsubStatus = onSnapshot(doc(db, 'systemStatus', 'global'), (snap) => {
      if (snap.exists()) setStatus(snap.data());
    });

    return () => {
      unsubListings();
      unsubStatus();
    };
  }, []);

  const filteredListings = useMemo(() => {
    const result = listings.filter(l => {
      const matchSearch = l.cardName?.toLowerCase().includes(search.toLowerCase());
      const matchRarity = filterRarity === 'All' || l.rarity?.toLowerCase() === filterRarity.toLowerCase();
      return matchSearch && matchRarity;
    });

    result.sort((a, b) => {
      if (sortBy === 'Lowest Price') return a.price - b.price;
      if (sortBy === 'Highest Price') return b.price - a.price;
      if (sortBy === 'Highest Rarity') {
        const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
        return rarityOrder.indexOf(a.rarity?.toLowerCase()) - rarityOrder.indexOf(b.rarity?.toLowerCase());
      }
      // default Newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [listings, search, filterRarity, sortBy]);

  const handleBuy = async () => {
    if (!user) {
      toast.error('You must be logged in to buy.');
      return;
    }
    if (!selectedListing) return;
    
    setIsBuying(true);
    try {
      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: user.uid, listingId: selectedListing.id })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Card added to your collection.');
      setSelectedListing(null);
    } catch (e: any) {
      toast.error(e.message || 'Purchase failed');
    } finally {
      setIsBuying(false);
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
  const sorts = ['Newest', 'Lowest Price', 'Highest Price', 'Highest Rarity'];

  const stats = useMemo(() => {
    let volume = 0;
    let minPrice = Infinity;
    listings.forEach(l => {
      volume += l.price;
      if (l.price < minPrice) minPrice = l.price;
    });
    return {
      totalVolume: volume,
      floorPrice: minPrice === Infinity ? 0 : minPrice,
      active: listings.length
    };
  }, [listings]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pt-10 pb-[100px]">
      {status?.tradingPaused && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                 <Lock size={20} />
              </div>
              <div>
                 <p className="text-sm font-black text-white uppercase font-space">Market Trading Paused</p>
                 <p className="text-xs text-zinc-400">{status.reason || 'The marketplace is currently offline for calibration. Please check back soon.'}</p>
              </div>
           </div>
           <div className="hidden md:block px-4 py-1 rounded-full border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest">
              Emergency Protocol Active
           </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-[0_0_15px_rgba(20,241,149,0.2)]">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black font-space text-white uppercase tracking-tight">MARKET INDEX</h1>
            <p className="text-zinc-500 font-space text-xs tracking-widest uppercase">Trade peer-to-peer assets</p>
          </div>
        </div>
      </div>

      {/* Market Tickers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="glass-card p-4 flex items-center justify-between border-white/5 relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
            <div className="relative z-10">
               <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-[0.2em]">Total Market Cap</p>
               <h3 className="text-2xl font-black font-space text-white mt-1">{stats.totalVolume}</h3>
            </div>
            <span className="relative z-10 text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider bg-secondary/10 text-secondary">
              SOLG
            </span>
         </div>
         <div className="glass-card p-4 flex items-center justify-between border-white/5 relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
            <div className="relative z-10">
               <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-[0.2em]">Lowest Floor</p>
               <h3 className="text-2xl font-black font-space text-white mt-1">{stats.floorPrice}</h3>
            </div>
            <span className="relative z-10 text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider bg-white/10 text-zinc-300">
              SOLG
            </span>
         </div>
         <div className="glass-card p-4 flex items-center justify-between border-white/5 relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
            <div className="relative z-10">
               <p className="text-[10px] font-bold font-space text-zinc-500 uppercase tracking-[0.2em]">Active Listings</p>
               <h3 className="text-2xl font-black font-space text-white mt-1">{loading ? "..." : stats.active}</h3>
            </div>
            <span className="relative z-10 text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider bg-secondary/10 text-secondary">
              LIVE
            </span>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
         <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search listings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-12 text-white text-sm font-space focus:border-secondary focus:ring-1 focus:ring-secondary/50 outline-none transition-all"
              />
            </div>

            <div className="flex overflow-x-auto gap-2 scrollbar-none w-full md:w-auto">
              {rarities.map(r => (
                <button 
                  key={r}
                  onClick={() => setFilterRarity(r)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all whitespace-nowrap",
                    filterRarity === r ? "bg-secondary text-black border border-secondary" : "text-zinc-500 border border-white/10 hover:text-white"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
         </div>

         <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
           <select 
             value={sortBy}
             onChange={e => setSortBy(e.target.value)}
             className="bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-space font-bold uppercase outline-none"
           >
             {sorts.map(s => <option key={s} value={s}>Sort: {s}</option>)}
           </select>

           <div className="flex glass p-1 rounded-xl">
              <button 
                onClick={() => setView('grid')}
                className={cn("p-2 rounded-lg transition-all", view === 'grid' ? "bg-white/10 text-white" : "text-zinc-600")}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setView('list')}
                className={cn("p-2 rounded-lg transition-all", view === 'list' ? "bg-white/10 text-white" : "text-zinc-600")}
              >
                <ListIcon size={18} />
              </button>
           </div>
         </div>
      </div>

      {loading ? (
        <div className={cn("grid gap-6", view === 'grid' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-1")}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="aspect-[3/4] md:aspect-square rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center text-center space-y-4 glass-card border-white/5">
           <Info size={48} className="text-zinc-700" />
           <p className="text-zinc-400 font-space font-bold uppercase tracking-widest text-lg">No active listings</p>
           <p className="text-zinc-600 text-sm max-w-md">There are no assets matching your criteria currently listed for sale.</p>
        </div>
      ) : (
        <div className={cn("grid gap-6", view === 'grid' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          {filteredListings.map((item) => (
            <div 
              key={item.id}
              onClick={() => setSelectedListing(item)}
              className={cn(
                "glass-card group cursor-pointer hover:border-secondary/40 transition-all duration-300 flex overflow-hidden",
                view === 'grid' ? "flex-col p-4 gap-4" : "flex-row items-center p-3 gap-6"
              )}
            >
               <div className={cn(
                 "rounded-xl bg-[#0a0a0a] border border-white/5 overflow-hidden relative group-hover:border-secondary/20 transition-colors",
                 view === 'grid' ? "aspect-square w-full" : "w-24 h-24 shrink-0"
               )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                    <img 
                      src={getCardImage(item)} 
                      alt={item.cardName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/card-fallback.png';
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                  
                  {view === 'grid' && (
                    <div className="absolute bottom-3 left-3 right-3">
                       <p className="text-[11px] font-black font-space text-white truncate leading-tight">{item.cardName}</p>
                       <div className="flex justify-between items-center mt-1">
                         <p className={cn("text-[9px] font-black tracking-widest uppercase", getRarityText(item.rarity))}>
                           {item.rarity}
                         </p>
                         <span className="text-[9px] text-zinc-500 truncate max-w-[60px]">@{item.sellerDisplayName}</span>
                       </div>
                    </div>
                  )}
               </div>
               
               <div className={cn(
                 "flex flex-1",
                 view === 'grid' ? "justify-between items-center" : "flex-row items-center justify-between"
               )}>
                  {view === 'list' && (
                    <div className="flex flex-col gap-1 mr-4">
                       <p className="text-[14px] font-black font-space text-white">{item.cardName}</p>
                       <p className={cn("text-[10px] font-black tracking-widest uppercase", getRarityText(item.rarity))}>
                         {item.rarity}
                       </p>
                       <span className="text-[10px] text-zinc-500">Seller: {item.sellerDisplayName}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5">
                     <Zap size={14} className="text-secondary fill-secondary" />
                     <span className="text-xl font-black font-space text-white">{item.price} <span className="text-[10px] text-zinc-500 ml-0.5">SOLG</span></span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative">
            <button 
              onClick={() => setSelectedListing(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
            
            <div className="md:w-2/5 p-6 md:p-8 bg-zinc-900/50 flex flex-col items-center justify-center border-r border-white/5">
               <div className={cn(
                 "w-full aspect-[3/4] max-w-sm rounded-2xl overflow-hidden relative shadow-2xl",
                 selectedListing.rarity?.toLowerCase() === 'legendary' ? "border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]" : 
                 selectedListing.rarity?.toLowerCase() === 'mythic' ? "border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]" : "border border-white/10"
               )}>
                  <img 
                    src={getCardImage(selectedListing)} 
                    alt={selectedListing.cardName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/card-fallback.png';
                    }}
                  />
               </div>
               
               {cardDetails[selectedListing.cardId] && (
                 <div className="mt-6 flex justify-center gap-4 w-full">
                   <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                      <Sword size={16} className="text-zinc-500" />
                      <span className="text-white font-space font-black">{cardDetails[selectedListing.cardId].attack || 0}</span>
                   </div>
                   <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                      <Shield size={16} className="text-zinc-500" />
                      <span className="text-white font-space font-black">{cardDetails[selectedListing.cardId].defense || 0}</span>
                   </div>
                 </div>
               )}
            </div>
            
            <div className="md:w-3/5 p-6 md:p-8 space-y-6">
               <div>
                 <span className={cn("text-xs font-bold tracking-widest uppercase", getRarityText(selectedListing.rarity))}>
                   {selectedListing.rarity}
                 </span>
                 <h2 className="text-3xl font-black font-space text-white uppercase mt-1 mb-2">{selectedListing.cardName}</h2>
                 <p className="text-zinc-400 text-sm leading-relaxed">
                   {cardDetails[selectedListing.cardId]?.ability || "No special ability."}
                 </p>
                 <p className="text-xs font-space text-zinc-500 mt-2">Listed by @{selectedListing.sellerDisplayName}</p>
               </div>

               <div className="glass-card p-6 border-secondary/20 flex flex-col items-center justify-center gap-2 bg-secondary/5">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Listing Price</p>
                  <div className="flex items-center gap-2">
                     <Zap size={24} className="text-secondary fill-secondary" />
                     <span className="text-4xl font-black font-space text-white">{selectedListing.price}</span>
                     <span className="text-sm font-bold text-zinc-400 mt-2">SOLG</span>
                  </div>
               </div>
               
               <ValueIndexPanel index={valueIndices[selectedListing.cardId] || null} />

               <div className="pt-2">
                 {user?.uid === selectedListing.sellerUid ? (
                   <button 
                     disabled
                     className="w-full bg-white/5 text-zinc-500 font-black font-space text-sm tracking-widest uppercase py-4 rounded-xl cursor-not-allowed border border-white/5"
                   >
                     You own this listing
                   </button>
                 ) : (
                   <button 
                     onClick={handleBuy}
                     disabled={isBuying}
                     className="w-full bg-secondary text-black font-black font-space text-sm tracking-widest uppercase py-4 rounded-xl shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                   >
                     {isBuying ? 'Processing...' : 'Buy Now'}
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
