'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Package, Zap, Sparkles, ChevronRight, RefreshCw, Layers, AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const FALLBACK_PACKS = [
  { id: 'pack_starter', name: 'Starter Pack', description: 'Begin your journey.', price: 10, cardsPerPack: 3, status: 'active', rarityOdds: { common: 65, uncommon: 20, rare: 10, epic: 4, legendary: 0.9, mythic: 0.1 } },
  { id: 'pack_standard', name: 'Standard Pack', description: 'A solid addition.', price: 50, cardsPerPack: 5, status: 'active', rarityOdds: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 0.9, mythic: 0.1 } },
  { id: 'pack_premium', name: 'Premium Pack', description: 'High-end assets.', price: 250, cardsPerPack: 7, status: 'active', rarityOdds: { common: 20, uncommon: 30, rare: 30, epic: 15, legendary: 4, mythic: 1 } },
  { id: 'pack_elite', name: 'Elite Pack', description: 'For the veterans.', price: 1000, cardsPerPack: 10, status: 'active', rarityOdds: { common: 0, uncommon: 10, rare: 40, epic: 30, legendary: 15, mythic: 5 } },
];

export default function PacksPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { user } = useAuth();
  const { connected } = useWallet();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;
    
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setError("Connection is slow — loading local preview packs.");
      setPacks(FALLBACK_PACKS);
      setLoading(false);
    }

    const q = query(collection(db, 'boosterPacks'));
    
    const unsubscribe = onSnapshot(q, 
      (snap) => {
        if (!isMounted) return;
        setError(null);
        if (snap.empty) {
          setPacks(FALLBACK_PACKS);
          if (process.env.NODE_ENV === 'development') {
            fetch('/api/packs/seed', { method: 'POST' }).catch(console.error);
          }
        } else {
          setPacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      },
      (e) => {
        if (!isMounted) return;
        setError("Connection is slow — loading local preview packs.");
        setPacks(FALLBACK_PACKS);
        setLoading(false);
      }
    );

    let userUnsub = () => {};
    let statsUnsub = () => {};

    if (user) {
      userUnsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (isMounted && docSnap.exists()) setUserData(docSnap.data());
      });
      statsUnsub = onSnapshot(doc(db, 'playerStats', user.uid), (docSnap) => {
        if (isMounted && docSnap.exists()) setPlayerStats(docSnap.data());
      });
    }

    return () => {
      isMounted = false;
      unsubscribe();
      userUnsub();
      statsUnsub();
    };
  }, [user]);

  const handleOpenPack = async (packId: string) => {
    if (!user || !auth.currentUser) {
      toast.error('Please log in to open packs.');
      return;
    }
    setOpening(true);
    
    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch('/api/packs/open', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.uid, packId, useCredit: true })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error(`Server returned a non-JSON response. Status: ${res.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to open pack.');
      }
      
      sessionStorage.setItem('solgine_pack_reveal', JSON.stringify(data.cards));
      router.push('/packs/reveal');

    } catch (error: any) {
      console.warn("API Failed:", error);
      toast.error(error.message || 'Purchase failed');
      setOpening(false);
    }
  };

  const formatOdds = (odds: any) => {
    if (!odds) return 'Unknown drop rates';
    return Object.entries(odds)
      .filter(([_, chance]) => (chance as number) > 0)
      .map(([rarity, chance]) => `${rarity.charAt(0).toUpperCase() + rarity.slice(1)}: ${chance}%`)
      .join(' • ');
  };

  const today = new Date().toISOString().split('T')[0];
  const dailyOpens = playerStats?.lastPackOpenDate === today ? (playerStats?.dailyPackOpens || 0) : 0;
  const priceMultiplier = dailyOpens >= 10 ? 1.25 : (dailyOpens >= 5 ? 1.1 : 1.0);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8 pt-10 pb-[120px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black font-space text-white uppercase tracking-tight">BOOSTER STATION</h1>
            <p className="text-zinc-500 font-space text-xs md:text-sm tracking-[0.2em] uppercase mt-1">Acquire and decrypt new digital assets</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              <div className="text-right">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Openings</p>
                 <p className="text-sm font-black text-white">{dailyOpens} / 20</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white/5 flex items-center justify-center relative">
                 <svg className="w-full h-full -rotate-90">
                    <circle 
                      cx="20" cy="20" r="18" 
                      fill="none" stroke="currentColor" strokeWidth="2" 
                      className="text-white/5"
                    />
                    <circle 
                      cx="20" cy="20" r="18" 
                      fill="none" stroke="currentColor" strokeWidth="2" 
                      strokeDasharray={113}
                      strokeDashoffset={113 - (113 * Math.min(dailyOpens, 20) / 20)}
                      className="text-secondary transition-all duration-500"
                    />
                 </svg>
                 <Package size={12} className="absolute text-secondary" />
              </div>
           </div>
           {priceMultiplier > 1 && (
             <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase bg-orange-400/10 px-2 py-1 rounded-lg border border-orange-400/20">
                <AlertCircle size={10} />
                Multiplier active: x{priceMultiplier}
             </div>
           )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[380px] rounded-[24px] bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md rounded-3xl text-center p-8">
          <Package size={48} className="text-zinc-600 mb-4" />
          <h2 className="text-xl font-black font-space text-white uppercase tracking-widest mb-2">No Packs Available</h2>
          <p className="text-zinc-400 text-sm">The Booster Station is currently empty. Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => {
            const creditKey = pack.id.replace('pack_', '') + 'Credits';
            const credits = userData?.[creditKey] || 0;
            const currentPrice = pack.dynamicPrice || pack.price;
            const finalPrice = Math.round(currentPrice * priceMultiplier);
            const isRising = pack.priceTrend === 'rising';
            const isFalling = pack.priceTrend === 'falling';
            
            return (
              <div key={pack.id} className="bg-[#0a0a0a]/80 backdrop-blur-xl p-8 rounded-[24px] flex flex-col gap-6 relative overflow-hidden group border border-white/5 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] transition-all duration-300">
                {pack.dynamicPrice && (
                  <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-xl">
                      {isRising ? <TrendingUp size={12} className="text-red-400" /> : isFalling ? <TrendingDown size={12} className="text-secondary" /> : <RefreshCw size={12} className="text-zinc-500" />}
                      <span className="text-[9px] font-black font-space text-white uppercase tracking-widest">Market Adjusted</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start relative z-10">
                  <div className="max-w-[70%]">
                    <h3 className="text-2xl font-black font-space text-white drop-shadow-md leading-tight">{pack.name}</h3>
                    <p className="text-zinc-400 text-sm font-medium mt-1">{pack.cardsPerPack} Digital Assets</p>
                  </div>
                  {credits > 0 && (
                    <div className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] uppercase font-black font-space tracking-widest shadow-[0_0_10px_rgba(20,241,149,0.2)]">
                      {credits} CREDITS
                    </div>
                  )}
                </div>

                <div className="space-y-2 relative z-10 flex-1">
                   <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Drop Rates</p>
                      <Info size={12} className="text-zinc-700 cursor-help" />
                   </div>
                   <p className="text-[11px] font-mono text-zinc-400 leading-relaxed bg-[#111] p-3 rounded-xl border border-white/5">
                     {formatOdds(pack.rarityOdds)}
                   </p>
                </div>

                <div className="flex flex-col gap-1 mt-auto relative z-10">
                   <div className="flex items-center gap-2">
                      <Zap size={18} className="text-secondary fill-secondary" />
                      <span className={cn(
                        "text-3xl font-black font-space",
                        priceMultiplier > 1 ? "text-orange-400" : "text-white"
                      )}>
                        {finalPrice}
                      </span>
                      <span className="text-zinc-500 text-xs font-bold font-space ml-1 uppercase">SOLG</span>
                   </div>
                   {priceMultiplier > 1 && (
                     <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                       Base: {currentPrice} SOLG + Demand Surge
                     </p>
                   )}
                </div>

                <button 
                  onClick={() => handleOpenPack(pack.id)}
                  disabled={opening}
                  className={cn(
                    "w-full py-4 mt-2 rounded-xl text-black font-black font-space text-sm tracking-widest uppercase shadow-lg transition-all relative z-10 disabled:opacity-50 disabled:grayscale",
                    credits > 0 
                      ? "bg-secondary hover:shadow-[0_0_20px_#14F195]" 
                      : "bg-white hover:bg-zinc-200"
                  )}
                >
                  {opening ? "PROCESSING..." : (credits > 0 ? "USE PACK CREDIT" : "OPEN WITH SOLG")}
                </button>

                <Package size={160} className="absolute -bottom-10 -right-10 text-white/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 z-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

