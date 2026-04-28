'use client';

import { useAuth } from "@/components/providers/AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { Package, Trophy, Swords, ShoppingCart, Zap, Sparkles, Activity, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { connected } = useWallet();
  const router = useRouter();

  const [cardsOwned, setCardsOwned] = useState(0);
  const [collectionLoaded, setCollectionLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setCollectionLoaded(true);
      return;
    }
    const fetchStats = async () => {
      try {
        const collRef = doc(db, 'playerCollections', user.uid);
        const collSnap = await getDoc(collRef);
        if (collSnap.exists()) {
          const data = collSnap.data();
          const total = data.cards?.reduce((acc: number, c: any) => acc + (c.count || 1), 0) || 0;
          setCardsOwned(total);
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setCollectionLoaded(true);
      }
    };
    fetchStats();
  }, [user]);

  if (authLoading) return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-[120px] min-h-screen space-y-10">
      <div className="h-20 max-w-sm bg-white/5 animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white/5 animate-pulse rounded-xl" />)}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-56 bg-white/5 animate-pulse rounded-[20px]" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-[120px] min-h-screen space-y-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-zinc-500 font-space text-xs font-bold tracking-[0.2em] uppercase mb-2">Welcome back</p>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black font-space text-white tracking-tight drop-shadow-md">
              {user?.displayName || user?.email?.split('@')[0] || 'PLAYER-1'}
            </h1>
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-black font-space tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              SOLGINE Genesis
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#111111]/80 backdrop-blur-md border border-white/5 px-4 py-3 rounded-xl shadow-lg">
          <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse", connected ? "bg-secondary shadow-[0_0_10px_rgba(20,241,149,0.8)]" : "bg-zinc-600")} />
          <span className="text-[11px] font-bold font-space uppercase tracking-widest text-zinc-400">
            {connected ? 'Wallet Connected' : 'Wallet Not Connected'}
          </span>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Cards Owned" value={cardsOwned} color="purple" />
        <StatCard icon={Package} label="Packs Available" value={0} color="blue" />
        <StatCard icon={Zap} label="Collection Value" value="0 SOL" color="teal" />
        <StatCard icon={Trophy} label="Battles Won" value={user?.stats?.matchesWon || 0} color="amber" />
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard 
          title="Open Packs"
          text="Reveal new cards and expand your collection."
          btnText="Go to Packs"
          icon={Package}
          onClick={() => router.push('/packs')}
          color="purple"
        />
        <ActionCard 
          title="Play Match"
          text="Practice against AI or enter the Battle Arena."
          btnText="Play Now"
          icon={Swords}
          onClick={() => router.push('/play')}
          color="teal"
        />
        <ActionCard 
          title="Marketplace"
          text="Buy, sell, and discover rare cards."
          btnText="Explore Market"
          icon={ShoppingCart}
          onClick={() => router.push('/market')}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-lg font-black font-space text-white uppercase tracking-wider flex items-center gap-2">
            <Activity size={18} className="text-zinc-400" />
            Recent Activity
          </h2>
          <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-10 text-center space-y-4 shadow-lg">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
               <Activity size={24} className="text-zinc-600" />
             </div>
             <p className="text-zinc-400 text-sm font-medium">No activity yet — open your first pack to begin.</p>
          </div>
        </div>

        {/* Featured Cards (Shows if empty) */}
        {collectionLoaded && cardsOwned === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-black font-space text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              Featured Drops
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <MiniCard name="Nova Guardian" rarity="Rare" />
              <MiniCard name="Void Walker" rarity="Epic" />
              <MiniCard name="Pulse Reaper" rarity="Common" />
              <MiniCard name="Celestial Dragon" rarity="Legendary" />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: any = {
    purple: "text-primary group-hover:bg-primary/20",
    teal: "text-secondary group-hover:bg-secondary/20",
    blue: "text-blue-400 group-hover:bg-blue-400/20",
    amber: "text-amber-400 group-hover:bg-amber-400/20",
  };

  return (
    <div className="bg-[#0a0a0a]/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2.5 rounded-xl bg-white/5 transition-colors", colors[color])}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">{label}</span>
      </div>
      <span className="text-3xl font-black font-space text-white drop-shadow-md">{value}</span>
    </div>
  );
}

function ActionCard({ title, text, btnText, icon: Icon, onClick, color }: any) {
  const bgGlows: any = {
    purple: "hover:bg-primary/5 hover:border-primary/40",
    teal: "hover:bg-secondary/5 hover:border-secondary/40",
    blue: "hover:bg-blue-500/5 hover:border-blue-500/40",
  };

  return (
    <div 
      className={cn(
        "bg-[#0a0a0a]/80 backdrop-blur-xl p-8 rounded-[20px] flex flex-col justify-between h-full group transition-all duration-300 relative overflow-hidden cursor-pointer shadow-lg border border-white/5", 
        bgGlows[color]
      )} 
      onClick={onClick}
    >
      <div className="relative z-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-center shadow-inner">
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-black font-space text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
        </div>
      </div>
      <button className="mt-8 w-full py-3.5 rounded-xl bg-[#141414] hover:bg-white/10 text-white font-bold text-sm transition-colors border border-white/5 relative z-10">
        {btnText}
      </button>
      <Icon size={140} className="absolute -bottom-10 -right-10 text-white/[0.02] group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 z-0 pointer-events-none" />
    </div>
  );
}

function MiniCard({ name, rarity }: any) {
  const rarityColors: any = {
    Legendary: "text-amber-400",
    Epic: "text-purple-400",
    Rare: "text-secondary",
    Common: "text-zinc-400"
  };

  return (
    <div className="bg-[#0a0a0a] p-3 rounded-xl border border-white/5 hover:border-white/20 transition-colors cursor-pointer aspect-[3/4] flex flex-col justify-end relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
      <div className="relative z-20">
        <h4 className="text-[11px] font-black font-space text-white leading-tight truncate">{name}</h4>
        <span className={cn("text-[9px] font-bold tracking-widest uppercase mt-0.5 block", rarityColors[rarity])}>{rarity}</span>
      </div>
    </div>
  );
}
