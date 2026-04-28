'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Package, Zap, Sparkles, ChevronRight, RefreshCw, Layers, AlertCircle } from 'lucide-react';
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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;
    
    // Initial offline check
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setError("Connection is slow — loading local preview packs.");
      setPacks(FALLBACK_PACKS);
      setLoading(false);
    }

    const q = query(collection(db, 'boosterPacks'));
    
    console.log("Setting up Firestore onSnapshot listener for packs...");
    
    const unsubscribe = onSnapshot(q, 
      (snap) => {
        if (!isMounted) return;
        
        console.log(`Firestore connected. Received ${snap.docs.length} packs.`);
        
        // Auto-recover if previously erroring
        setError(null);
        
        if (snap.empty) {
          console.log("Firestore packs empty. Showing fallbacks and seeding dev db.");
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
        console.error("Firestore Listener Error:", e);
        if (!isMounted) return;
        
        setError("Connection is slow — loading local preview packs.");
        setPacks(FALLBACK_PACKS);
        setLoading(false);
      }
    );

    // Also monitor standard browser online/offline events for immediate UI feedback
    const handleOnline = () => {
      console.log("Network restored.");
      setError(null);
    };
    
    const handleOffline = () => {
      console.log("Network disconnected.");
      setError("Connection is slow — loading local preview packs.");
      setPacks(FALLBACK_PACKS);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      isMounted = false;
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

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
        body: JSON.stringify({ userId: user.uid, packId })
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
      
      if (process.env.NODE_ENV === 'development' && (!navigator.onLine || error.message.includes('fetch'))) {
         toast.error('Preview mode — cards may not sync until Firestore reconnects.', { duration: 5000 });
         // Create local fallback cards for preview
         const fallbackCards = [
           { id: 'c_pulse_reaper', name: 'Pulse Reaper', rarity: 'common', attack: 10, defense: 5, estimatedValue: 2 },
           { id: 'c_iron_phalanx', name: 'Iron Phalanx', rarity: 'common', attack: 5, defense: 12, estimatedValue: 2 },
           { id: 'c_nova_guardian', name: 'Nova Guardian', rarity: 'rare', attack: 25, defense: 20, estimatedValue: 20 }
         ];
         sessionStorage.setItem('solgine_pack_reveal', JSON.stringify(fallbackCards));
         router.push('/packs/reveal');
      } else {
         // Temporarily show API error message in UI for debugging
         toast.error(`Error: ${error.message}`, { duration: 8000 });
         setOpening(false);
      }
    }
  };

  const formatOdds = (odds: any) => {
    if (!odds) return 'Unknown drop rates';
    return Object.entries(odds)
      .filter(([_, chance]) => (chance as number) > 0)
      .map(([rarity, chance]) => `${rarity.charAt(0).toUpperCase() + rarity.slice(1)}: ${chance}%`)
      .join(' • ');
  };

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

        {error && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {mounted && !connected && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-[#111111]/80 backdrop-blur-md border border-white/5 shadow-lg">
          <div className="flex items-center gap-3 text-zinc-400">
            <Zap size={20} className="text-secondary" />
            <p className="text-sm font-medium">
              <strong className="text-white">Wallet optional</strong> — connect only when you&apos;re ready to mint or trade on-chain.
            </p>
          </div>
          <div className="wallet-packs-btn">
            <WalletMultiButton className="!bg-white/5 hover:!bg-white/10 !text-white !h-10 !rounded-xl !text-xs !font-bold !font-space !uppercase !tracking-widest !border !border-white/10 transition-all" />
          </div>
        </div>
      )}

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
          {packs.map((pack) => (
            <div key={pack.id} className="bg-[#0a0a0a]/80 backdrop-blur-xl p-8 rounded-[24px] flex flex-col gap-6 relative overflow-hidden group border border-white/5 hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] transition-all duration-300">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h3 className="text-2xl font-black font-space text-white drop-shadow-md">{pack.name}</h3>
                  <p className="text-zinc-400 text-sm font-medium mt-1">{pack.cardsPerPack} Digital Assets</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-black font-space tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  LIVE
                </div>
              </div>

              <div className="space-y-2 relative z-10 flex-1">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Drop Rates</p>
                 <p className="text-[11px] font-mono text-zinc-400 leading-relaxed bg-[#111] p-3 rounded-xl border border-white/5">
                   {formatOdds(pack.rarityOdds)}
                 </p>
              </div>

              <div className="flex items-center gap-2 mt-auto relative z-10">
                 <Zap size={18} className="text-secondary fill-secondary" />
                 <span className="text-3xl font-black font-space text-white">{pack.price}</span>
                 <span className="text-zinc-500 text-xs font-bold font-space ml-1 uppercase">SOLG</span>
              </div>

              <button 
                onClick={() => handleOpenPack(pack.id)}
                disabled={opening}
                className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black font-space text-sm tracking-widest uppercase shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_4px_25px_rgba(168,85,247,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10 disabled:opacity-50 disabled:grayscale"
              >
                OPEN PACK
              </button>

              <Package size={160} className="absolute -bottom-10 -right-10 text-white/5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 z-0" />
            </div>
          ))}
        </div>
      )}

      {/* REVEAL OVERLAY MOVED TO /packs/reveal */}

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
