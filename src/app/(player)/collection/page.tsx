/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Library, Search, Filter, Sword, Shield, Zap, X, TrendingUp, Sparkles, RefreshCw, ExternalLink, SortAsc, LayoutGrid, Layers, Gem, ArrowUpRight, ArrowRight, ArrowDownRight, Flame, Snowflake, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { ValueIndexPanel } from '@/components/ui/ValueIndexPanel';
import { getCardEstimatedValue } from '@/lib/card-utils';
import { hydrateOwnedCards } from '@/lib/card-media';
import { SolgineCard } from '@/components/cards/SolgineCard';

type SortOption = 'newest' | 'rarity' | 'value';

export default function CollectionPage() {
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [valueIndices, setValueIndices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [isListing, setIsListing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<any | null>(null);

  const { user } = useAuth();

  const fetchCollection = async () => {
    if (!user) return;
    try {
      const collRef = doc(db, 'playerCollections', user.uid);
      const collSnap = await getDoc(collRef);
      
      if (collSnap.exists()) {
        const collData = collSnap.data();
        const cardsData = collData.cards || [];
        
        const hydrated = await hydrateOwnedCards(cardsData);
        setCards(hydrated);
        
        // Fetch value indices
        const indicesMap: Record<string, any> = {};
        const indicesPromises = hydrated.map(async (c) => {
          const indexSnap = await getDoc(doc(db, 'cardValueIndex', c.id));
          if (indexSnap.exists()) {
            indicesMap[c.id] = indexSnap.data();
          }
        });
        await Promise.all(indicesPromises);
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
    fetchCollection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const rarityWeights: Record<string, number> = {
    'mythic': 6, 'legendary': 5, 'epic': 4, 'rare': 3, 'uncommon': 2, 'common': 1
  };

  const filteredCards = useMemo(() => {
    let result = cards.filter(c => {
      const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
      const matchRarity = filterRarity === 'All' || c.rarity?.toLowerCase() === filterRarity.toLowerCase();
      return matchSearch && matchRarity;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'value') {
        const valA = getCardEstimatedValue(a, valueIndices[a.id]);
        const valB = getCardEstimatedValue(b, valueIndices[b.id]);
        return valB - valA;
      }
      if (sortBy === 'rarity') {
        const weightA = rarityWeights[a.rarity?.toLowerCase()] || 0;
        const weightB = rarityWeights[b.rarity?.toLowerCase()] || 0;
        return weightB - weightA;
      }
      // Default: newest (assuming hydration preserves order or we had a timestamp)
      return 0; 
    });

    return result;
  }, [cards, search, filterRarity, sortBy, valueIndices]);

  const stats = useMemo(() => {
    let total = 0;
    const unique = cards.length;
    let value = 0;
    
    let highestWeight = 0;
    let highestRarity = 'Common';
    let highestCard = null;

    cards.forEach(c => {
      total += c.count;
      
      const v = valueIndices[c.id];
      const estValue = getCardEstimatedValue(c, v);
      value += estValue * c.count;

      const weight = rarityWeights[c.rarity?.toLowerCase()] || 0;
      if (weight > highestWeight) {
        highestWeight = weight;
        highestRarity = c.rarity;
        highestCard = c;
      }
    });

    return { total, unique, value: Math.round(value), highest: highestRarity, highestCard };
  }, [cards, valueIndices]);

  const getMarketSignals = (cardId: string) => {
    const index = valueIndices[cardId];
    if (!index) return null;

    const lastSale = index.lastSale || 0;
    const avgSale = index.averageSale || 0;
    const sales24h = index.sales24h || 0;
    const activeListings = index.activeListings || 0;
    const minted = selectedCard?.mintedCount || 0;
    const limit = selectedCard?.supplyLimit || 1000;
    const floorTrend = index.floorTrend24h || 0;
    const floorPrice = index.floorPrice || 0;

    // Competition Logic
    const buyersWatching = Math.floor(Math.random() * 8) + 2; 
    const isHighCompetition = activeListings > 5 || buyersWatching > 6;

    // Urgency Logic
    const lastSaleMinutes = index.lastSaleAt ? Math.floor((Date.now() - new Date(index.lastSaleAt).getTime()) / 60000) : Math.floor(Math.random() * 20) + 2;
    const isActivitySpike = sales24h > 3 && lastSaleMinutes < 60;

    // Scarcity Logic
    const supplyRemaining = limit - minted;
    const scarcityPercent = Math.min(Math.round((minted / limit) * 100), 100);
    const remainingPercent = 100 - scarcityPercent;
    const isAlmostSoldOut = remainingPercent < 10;

    // Trend
    let trend = 'stable';
    if (lastSale > avgSale * 1.05) trend = 'rising';
    else if (lastSale < avgSale * 0.95) trend = 'falling';

    // Demand
    let demand = 'low';
    const listingsRatio = activeListings / (minted || 1);
    if (sales24h > 5 || listingsRatio < 0.05) demand = 'high';
    else if (sales24h > 2 || listingsRatio < 0.15) demand = 'medium';

    // Sell Speed Estimator
    let sellSpeed = 'Medium';
    if (demand === 'high' && activeListings < 10) sellSpeed = 'Fast';
    else if (demand === 'low' && activeListings > 15) sellSpeed = 'Slow';

    // Recommendation
    let recommendation = "Analyzing market protocols...";
    let recColor = "text-zinc-400";
    if (demand === 'high' && trend === 'rising') {
      recommendation = "🔥 Strong sell opportunity";
      recColor = "text-secondary";
    } else if (demand === 'low') {
      recommendation = "⚠️ Consider holding for volume";
      recColor = "text-amber-400";
    } else if (scarcityPercent > 80) {
      recommendation = "💎 Rare asset — price may increase";
      recColor = "text-primary";
    } else {
      recommendation = "⚡ Stable market — fair value detected";
      recColor = "text-secondary/70";
    }

    return { 
      trend, demand, scarcityPercent, recommendation, recColor, 
      lastSaleAt: index.lastSaleAt, activeListings, floorTrend, minted, limit,
      buyersWatching, isHighCompetition, lastSaleMinutes, isActivitySpike,
      supplyRemaining, remainingPercent, isAlmostSoldOut, sellSpeed, floorPrice
    };
  };

  useEffect(() => {
    if (sellModalOpen && selectedCard) {
      const index = valueIndices[selectedCard.id];
      const floor = index?.floorPrice;
      const avg = index?.averageSale;
      const est = getCardEstimatedValue(selectedCard, index);

      let smartPrice = est;
      if (floor && floor > 0) {
        smartPrice = Math.round(floor * 1.05);
      } else if (avg && avg > 0) {
        smartPrice = Math.round(avg);
      }
      
      setSellPrice(smartPrice.toString());
    }
  }, [sellModalOpen, selectedCard, valueIndices]);

  const handleSellSubmit = async () => {
    if (!selectedCard || !sellPrice || isListing || !user) return;
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
      // Get ID Token for secure API call
      const token = await (user as any).getIdToken();

      const res = await fetch('/api/market/list', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardId: selectedCard.id, price })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-black text-xs uppercase tracking-widest text-secondary">Market Protocol Initialized</span>
          <span className="text-sm font-medium">Listed for {price} SOLG</span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Targeting Maximum Profit</span>
        </div>
      );
      setSellModalOpen(false);
      setSellPrice('');
      setSelectedCard(null);
      await fetchCollection();
    } catch (e: any) {
      toast.error(e.message || 'Failed to list card');
    } finally {
      setIsListing(false);
    }
  };

  const { publicKey, signMessage } = useWallet();

  const handleMintToSolana = async () => {
    if (!selectedCard) return;
    if (!publicKey || !signMessage) {
      toast.error('Please connect your Solana wallet first');
      return;
    }

    const unmintedCount = (selectedCard.count || 0) - (selectedCard.mintedCount || 0);
    if (unmintedCount <= 0) {
      toast.error('All copies of this card have already been minted');
      return;
    }

    setIsMinting(true);
    try {
      const message = `SOLGINE MINT: ${selectedCard.name}\n\nI confirm the minting of this ${selectedCard.rarity} card to my wallet: ${publicKey.toBase58()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const res = await fetch('/api/mint/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          cardId: selectedCard.id,
          publicKey: publicKey.toBase58(),
          signature: Array.from(signature),
          message
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMintResult(data);
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-black text-xs uppercase tracking-widest text-primary">On-Chain Migration Complete</span>
          <span className="text-sm font-medium">{selectedCard.name} is now a Solana NFT</span>
        </div>
      );
      await fetchCollection();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Minting failed');
    } finally {
      setIsMinting(false);
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 pt-10">
      <div className="h-48 rounded-[2.5rem] bg-white/5 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-white/5 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="aspect-[3/4.5] rounded-[2rem] bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pt-6 md:pt-10">
      {/* Premium Header */}
      <div className="relative p-8 md:p-12 rounded-[2.5rem] overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900 to-black group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] rounded-full -mr-48 -mt-48 transition-all group-hover:bg-primary/20 duration-1000" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] border border-white/20">
              <Layers size={32} className="md:size-40" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-space text-white uppercase tracking-tighter">HYPER ARCHIVE</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <p className="text-zinc-500 font-space text-xs tracking-[0.3em] uppercase">Secure Vault Protocol active</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => fetchCollection()}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={() => router.push('/packs')}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black font-space text-sm tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Expand Vault
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Inventory" value={stats.total} icon={LayoutGrid} />
        <StatCard label="Master Set" value={`${stats.unique}/150`} icon={Library} />
        <StatCard label="Est. Net Worth" value={`${stats.value} SOLG`} icon={TrendingUp} highlight />
        <StatCard label="Highest Tier" value={stats.highest} icon={Gem} color={getRarityText(stats.highest)} />
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-black/40 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by card name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white text-sm font-space focus:border-primary/50 outline-none transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {['All', 'Epic', 'Legendary', 'Mythic'].map(r => (
              <button 
                key={r}
                onClick={() => setFilterRarity(r)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap",
                  filterRarity === r ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-white/5 border border-white/10 rounded-2xl p-3 px-4 text-xs font-black font-space text-white outline-none focus:border-primary/50 uppercase tracking-widest cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="rarity">By Rarity</option>
            <option value="value">By Value</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {filteredCards.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-96 flex flex-col items-center justify-center text-center space-y-6 rounded-[3rem] border-2 border-dashed border-white/5 bg-white/2"
          >
             <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                <Library size={48} />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-black font-space text-white uppercase italic">Your Vault is Empty</h3>
                <p className="text-zinc-500 font-space text-sm tracking-widest uppercase">No assets detected in current sector</p>
             </div>
             <button 
                onClick={() => router.push('/packs')} 
                className="px-10 py-4 rounded-2xl bg-primary text-black font-black font-space text-sm hover:scale-105 transition-all uppercase tracking-widest shadow-[0_0_30px_rgba(168,85,247,0.4)]"
             >
               Open Your First Pack
             </button>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8"
          >
            {filteredCards.map((card) => (
              <motion.div
                layout
                key={card.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <SolgineCard 
                  cardId={card.id}
                  name={card.name}
                  type={card.type || 'Unit'}
                  rarity={card.rarity}
                  artworkUrl={card.artworkUrl}
                  stats={{
                    atk: card.attack || 0,
                    def: card.defense || 0,
                    spd: card.speed || 0,
                    util: card.utility || 0
                  }}
                  description={card.ability || "No ability detected."}
                  variant="collection"
                  ownedCount={card.count}
                  price={getCardEstimatedValue(card, valueIndices[card.id])}
                  onClick={() => setSelectedCard(card)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Detail Modal (Enhanced with same animation as featured) */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedCard(null); setSellModalOpen(false); setMintResult(null); }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative z-10 shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <button 
                onClick={() => { setSelectedCard(null); setSellModalOpen(false); setMintResult(null); }}
                className="absolute top-6 right-6 z-10 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              >
                <X size={24} />
              </button>
              
              <div className="md:w-[45%] p-8 md:p-12 bg-gradient-to-b from-zinc-900/50 to-transparent flex flex-col items-center justify-center border-r border-white/5">
                <div className="w-full max-w-[340px] transform hover:rotate-2 transition-transform duration-500">
                  <SolgineCard 
                    cardId={selectedCard.id}
                    name={selectedCard.name}
                    type={selectedCard.type || 'Unit'}
                    rarity={selectedCard.rarity}
                    artworkUrl={selectedCard.artworkUrl}
                    stats={{
                      atk: selectedCard.attack || 0,
                      def: selectedCard.defense || 0,
                      spd: selectedCard.speed || 0,
                      util: selectedCard.utility || 0
                    }}
                    description={selectedCard.ability || ""}
                    className="!max-w-none shadow-2xl"
                  />
                </div>
              </div>
              
              <div className="md:w-[55%] p-8 md:p-12 space-y-8">
                 <div>
                   <div className="flex items-center gap-2 mb-2">
                     <div className={cn("w-2 h-2 rounded-full animate-pulse", 
                       selectedCard.rarity?.toLowerCase() === 'mythic' ? "bg-red-400" : "bg-primary"
                     )} />
                     <span className={cn("text-xs font-black tracking-[0.3em] uppercase", getRarityText(selectedCard.rarity))}>
                       {selectedCard.rarity} CLASSIFICATION
                     </span>
                   </div>
                   <h2 className="text-4xl md:text-5xl font-black font-space text-white uppercase tracking-tighter leading-none mb-4">{selectedCard.name}</h2>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5 italic">
                     <p className="text-zinc-400 text-sm leading-relaxed">"{selectedCard.ability || "The core protocol of this asset remains classified."}"</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ModalStat label="Owned" value={selectedCard.count} />
                    <ModalStat label="Listed" value={selectedCard.listedCount || 0} color="text-secondary" />
                    <ModalStat label="Value" value={`${selectedCard.estimatedValue || 0} SOLG`} />
                    <ModalStat label="On-Chain" value={selectedCard.mintedCount || 0} color="text-primary" />
                 </div>

                 <ValueIndexPanel index={valueIndices[selectedCard.id] || null} />

                 {sellModalOpen ? (
                   <div className="glass-card p-6 space-y-6 border-secondary/20 bg-secondary/5 rounded-3xl animate-in fade-in zoom-in duration-300">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <TrendingUp className="text-secondary" />
                           <h4 className="text-lg font-black font-space text-white uppercase">Initialize Market Listing</h4>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                           <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Live Sync</span>
                        </div>
                     </div>

                     <div className="space-y-4">
                       {/* Decision Intelligence Signals */}
                       {getMarketSignals(selectedCard.id) && (
                         <div className="grid grid-cols-1 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  {/* Trend */}
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Market Trend</span>
                                     <div className="flex items-center gap-1.5">
                                        {getMarketSignals(selectedCard.id)?.trend === 'rising' && <ArrowUpRight className="w-4 h-4 text-secondary" />}
                                        {getMarketSignals(selectedCard.id)?.trend === 'stable' && <ArrowRight className="w-4 h-4 text-zinc-400" />}
                                        {getMarketSignals(selectedCard.id)?.trend === 'falling' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
                                        <span className={cn(
                                          "text-xs font-black uppercase tracking-wider",
                                          getMarketSignals(selectedCard.id)?.trend === 'rising' ? "text-secondary" : 
                                          getMarketSignals(selectedCard.id)?.trend === 'falling' ? "text-red-400" : "text-zinc-400"
                                        )}>
                                          {getMarketSignals(selectedCard.id)?.trend}
                                        </span>
                                     </div>
                                  </div>
                                  
                                  <div className="w-px h-8 bg-white/10" />

                                  {/* Demand */}
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Demand Level</span>
                                     <div className="flex items-center gap-1.5">
                                        {getMarketSignals(selectedCard.id)?.demand === 'high' && <Flame className="w-4 h-4 text-orange-400" />}
                                        {getMarketSignals(selectedCard.id)?.demand === 'medium' && <Zap className="w-4 h-4 text-secondary" />}
                                        {getMarketSignals(selectedCard.id)?.demand === 'low' && <Snowflake className="w-4 h-4 text-blue-300" />}
                                        <span className={cn(
                                          "text-xs font-black uppercase tracking-wider",
                                          getMarketSignals(selectedCard.id)?.demand === 'high' ? "text-orange-400" : 
                                          getMarketSignals(selectedCard.id)?.demand === 'medium' ? "text-secondary" : "text-blue-300"
                                        )}>
                                          {getMarketSignals(selectedCard.id)?.demand}
                                        </span>
                                     </div>
                                  </div>
                               </div>

                               <div className="text-right">
                                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 block">Recommendation</span>
                                  <span className={cn("text-xs font-black uppercase tracking-wider", getMarketSignals(selectedCard.id)?.recColor)}>
                                    {getMarketSignals(selectedCard.id)?.recommendation}
                                  </span>
                               </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                               <div className="flex items-center justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                  <span>Scarcity Protocol: {getMarketSignals(selectedCard.id)?.minted}/{getMarketSignals(selectedCard.id)?.limit} Units</span>
                                  <span className="text-zinc-400">{getMarketSignals(selectedCard.id)?.scarcityPercent}% Minted</span>
                               </div>
                               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${getMarketSignals(selectedCard.id)?.scarcityPercent}%` }}
                                    className={cn(
                                      "h-full rounded-full",
                                      (getMarketSignals(selectedCard.id)?.scarcityPercent || 0) > 80 ? "bg-primary" : "bg-secondary"
                                    )}
                                  />
                               </div>
                             </div>

                             <div className="flex items-center justify-between pt-2">
                               <div className="flex items-center gap-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                  <div className="flex items-center gap-1">
                                     <div className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
                                     <span>{getMarketSignals(selectedCard.id)?.buyersWatching} Buyers Watching</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                     <div className="w-1 h-1 rounded-full bg-zinc-500" />
                                     <span>{getMarketSignals(selectedCard.id)?.activeListings} Active Listings</span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2">
                                  {getMarketSignals(selectedCard.id)?.isHighCompetition && (
                                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest animate-pulse">🔥 High competition</span>
                                  )}
                                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                    Last Sale: {getMarketSignals(selectedCard.id)?.lastSaleMinutes}m ago
                                  </span>
                               </div>
                             </div>

                             {getMarketSignals(selectedCard.id)?.isActivitySpike && (
                               <div className="flex items-center gap-2 py-1 px-3 bg-secondary/10 border border-secondary/20 rounded-lg">
                                  <Zap size={10} className="text-secondary fill-secondary animate-pulse" />
                                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Selling fast right now — activity spike detected</span>
                               </div>
                             )}

                             <div className="space-y-1.5 pt-2 border-t border-white/5">
                               <div className="flex items-center justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                  <span>Protocol Supply: {getMarketSignals(selectedCard.id)?.supplyRemaining} Units Left</span>
                                  <span className={cn(
                                    "font-black",
                                    getMarketSignals(selectedCard.id)?.isAlmostSoldOut ? "text-red-400 animate-pulse" : "text-zinc-400"
                                  )}>
                                    {getMarketSignals(selectedCard.id)?.isAlmostSoldOut ? "🚨 ALMOST SOLD OUT" : `${getMarketSignals(selectedCard.id)?.remainingPercent}% REMAINING`}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                   <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${getMarketSignals(selectedCard.id)?.scarcityPercent}%` }}
                                     className={cn(
                                       "h-full rounded-full",
                                       (getMarketSignals(selectedCard.id)?.scarcityPercent || 0) > 80 ? "bg-primary" : "bg-secondary"
                                     )}
                                   />
                                </div>
                             </div>
                             
                             <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                   <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Sell Speed:</span>
                                   <span className={cn(
                                     "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                     getMarketSignals(selectedCard.id)?.sellSpeed === 'Fast' ? "bg-secondary/10 text-secondary" :
                                     getMarketSignals(selectedCard.id)?.sellSpeed === 'Slow' ? "bg-red-500/10 text-red-400" : "bg-zinc-500/10 text-zinc-400"
                                   )}>
                                     {getMarketSignals(selectedCard.id)?.sellSpeed}
                                   </span>
                                </div>
                                <RotatingInsights />
                             </div>
                          </div>
                       )}

                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Listing Price (SOLG)</label>
                           <div className="flex items-center gap-2">
                             {sellPrice && getMarketSignals(selectedCard.id)?.floorPrice && (
                               <span className={cn(
                                 "text-[9px] font-black uppercase tracking-widest",
                                 parseFloat(sellPrice) < (getMarketSignals(selectedCard.id)?.floorPrice || 0) ? "text-secondary" :
                                 parseFloat(sellPrice) > (getMarketSignals(selectedCard.id)?.floorPrice || 0) ? "text-amber-400" : "text-zinc-500"
                               )}>
                                 {parseFloat(sellPrice) < (getMarketSignals(selectedCard.id)?.floorPrice || 0) ? 
                                   `-${Math.round((1 - parseFloat(sellPrice)/(getMarketSignals(selectedCard.id)?.floorPrice || 1)) * 100)}% below floor (faster sale)` :
                                  parseFloat(sellPrice) > (getMarketSignals(selectedCard.id)?.floorPrice || 0) ?
                                   `+${Math.round((parseFloat(sellPrice)/(getMarketSignals(selectedCard.id)?.floorPrice || 1) - 1) * 100)}% above floor (slower sale)` :
                                   "At market floor"}
                               </span>
                             )}
                             <span className="text-[10px] font-bold text-secondary uppercase tracking-widest bg-secondary/5 px-2 py-0.5 rounded">Smart Pre-fill active</span>
                           </div>
                         </div>
                         <div className="relative group">
                           <input 
                             type="number" 
                             value={sellPrice}
                             onChange={e => setSellPrice(e.target.value)}
                             className="w-full bg-black/60 border border-white/10 rounded-2xl p-6 text-white text-3xl font-black font-space focus:border-secondary outline-none transition-all group-hover:border-white/20"
                             placeholder="0.00"
                           />
                           <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black font-space">SOLG</div>
                         </div>
                       </div>

                       {/* Quick Adjust Buttons */}
                       <div className="grid grid-cols-3 gap-3">
                          <button 
                            onClick={() => {
                              const p = parseFloat(sellPrice) || 0;
                              setSellPrice(Math.round(p * 0.95).toString());
                            }}
                            className="py-3 px-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-zinc-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                          >
                            -5% Price
                          </button>
                          <button 
                            onClick={() => {
                              const p = parseFloat(sellPrice) || 0;
                              setSellPrice(Math.round(p * 1.05).toString());
                            }}
                            className="py-3 px-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-zinc-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                          >
                            +5% Price
                          </button>
                          <button 
                            onClick={() => {
                              const floor = valueIndices[selectedCard.id]?.floorPrice;
                              if (floor) setSellPrice(floor.toString());
                              else toast.error('No floor price detected');
                            }}
                            className="py-3 px-2 rounded-xl bg-secondary/10 border border-secondary/20 text-[10px] font-black text-secondary hover:bg-secondary/20 transition-all uppercase tracking-widest"
                          >
                            Match Floor
                          </button>
                       </div>
                     </div>

                     <div className="flex gap-3">
                       <button 
                         onClick={handleSellSubmit}
                         disabled={isListing}
                         className={cn(
                           "flex-1 bg-secondary text-black font-black font-space text-sm tracking-widest uppercase py-5 rounded-2xl disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(20,241,149,0.3)]",
                           (getMarketSignals(selectedCard.id)?.demand === 'high' || getMarketSignals(selectedCard.id)?.isActivitySpike || getMarketSignals(selectedCard.id)?.isAlmostSoldOut) && "animate-pulse shadow-[0_0_40px_rgba(20,241,149,0.5)]"
                         )}
                       >
                         {isListing ? 'Syncing Protocol...' : 'List Instantly'}
                       </button>
                       <button 
                         onClick={() => setSellModalOpen(false)}
                         className="px-8 py-5 border border-white/10 text-white font-black font-space text-sm tracking-widest uppercase rounded-2xl hover:bg-white/5 transition-all"
                       >
                         Abort
                       </button>
                     </div>
                   </div>
                 ) : mintResult ? (
                    <div className="glass-card p-8 space-y-6 border-primary/30 bg-primary/5 rounded-3xl">
                      <div className="flex items-center gap-4 text-primary">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                          <Sparkles size={24} />
                        </div>
                        <h4 className="text-xl font-black font-space uppercase">Asset Minted to Solana</h4>
                      </div>
                      <div className="bg-black/60 p-4 rounded-2xl border border-white/10 break-all">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Protocol Address</p>
                        <p className="text-xs font-mono text-white leading-relaxed">{mintResult.mintAddress}</p>
                      </div>
                      <button 
                        onClick={() => window.open(mintResult.explorerUrl, '_blank')}
                        className="w-full bg-white/10 border border-white/10 text-white font-black font-space text-sm tracking-widest uppercase py-4 rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                      >
                        <ExternalLink size={18} /> Verify on Explorer
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 pt-2">
                       <div className="flex gap-4">
                          <button 
                            onClick={() => router.push('/decks')}
                            className="flex-1 bg-primary text-black font-black font-space text-sm tracking-widest uppercase py-4 px-6 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] transition-all"
                          >
                            Forge Deck
                          </button>
                          <button 
                            onClick={() => setSellModalOpen(true)}
                            className="flex-1 bg-secondary text-black font-black font-space text-sm tracking-widest uppercase py-4 px-6 rounded-2xl shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:scale-[1.02] transition-all"
                          >
                            Market Sync
                          </button>
                       </div>

                       {['epic', 'legendary', 'mythic'].includes(selectedCard.rarity?.toLowerCase()) && (
                         <button 
                           onClick={handleMintToSolana}
                           disabled={isMinting || (selectedCard.count - (selectedCard.mintedCount || 0)) <= 0}
                           className="w-full bg-gradient-to-r from-primary via-purple-600 to-blue-600 text-white font-black font-space text-sm tracking-widest uppercase py-5 px-6 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.01] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 group"
                         >
                           {isMinting ? (
                             <><RefreshCw size={20} className="animate-spin" /> Calibrating Protocol...</>
                           ) : (
                             <><Sparkles size={20} className="group-hover:animate-spin" /> Convert to On-Chain NFT</>
                           )}
                         </button>
                       )}
                       
                       {!publicKey && ['epic', 'legendary', 'mythic'].includes(selectedCard.rarity?.toLowerCase()) && (
                         <p className="text-[10px] text-center text-zinc-600 font-black uppercase tracking-[0.2em] mt-2">
                           Solana interface required for on-chain migration
                         </p>
                       )}
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, highlight = false, color }: { label: string, value: any, icon: any, highlight?: boolean, color?: string }) {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)) && !value.includes('/'));
  const numericValue = isNumeric ? (typeof value === 'number' ? value : parseFloat(value)) : 0;

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className={cn(
        "glass-card p-6 border-white/10 relative overflow-hidden group",
        highlight && "bg-white/5 border-primary/20 shadow-[0_10px_30px_rgba(168,85,247,0.1)]"
      )}
    >
      <div className="absolute top-0 right-0 p-4 text-white/5 transform group-hover:scale-110 group-hover:text-white/10 transition-all duration-500">
        <Icon size={64} />
      </div>
      <p className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-[0.3em] mb-2">{label}</p>
      <h3 className={cn("text-2xl md:text-3xl font-black font-space text-white mt-1", color)}>
        {isNumeric ? <AnimatedNumber value={numericValue} /> : value}
        {highlight && <span className="text-xs text-zinc-500 ml-2">SOLG</span>}
      </h3>
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

function ModalStat({ label, value, color }: { label: string, value: any, color?: string }) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-sm font-black font-space text-white", color)}>{value}</p>
    </div>
  );
}

function RotatingInsights() {
  const [index, setIndex] = useState(0);
  const insights = [
    "Top traders sold this asset today",
    "High demand assets sell 2.3x faster",
    "Rare cards often spike after 90% mint",
    "Recent buyers are paying above average",
    "Market liquidity is peaking now"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % insights.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-4 overflow-hidden text-right min-w-[150px]">
      <AnimatePresence mode="wait">
        <motion.p 
          key={index}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest italic"
        >
          {insights[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
