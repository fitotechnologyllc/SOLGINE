'use client';

import { useAuth } from "@/components/providers/AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { Package, Trophy, Swords, ShoppingCart, Zap, Sparkles, Activity, CreditCard, ChevronRight, ArrowRight, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, where, orderBy, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getCurrentLevelProgress } from "@/lib/rewards";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SolgineCard } from "@/components/cards/SolgineCard";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { connected } = useWallet();
  const router = useRouter();

  const [cardsOwned, setCardsOwned] = useState(0);
  const [collectionLoaded, setCollectionLoaded] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

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

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setCollectionLoaded(true);
      }
    };
    
    const fetchActivities = async () => {
      try {
        const battleQ = query(
          collection(db, 'battles'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const battleSnap = await getDocs(battleQ);
        const battleData = battleSnap.docs.map(doc => ({
          id: doc.id,
          type: 'battle',
          ...doc.data()
        }));

        const txQ = query(
          collection(db, 'transactions'),
          where('buyerUid', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const txSnap = await getDocs(txQ);
        const txData = txSnap.docs.map(doc => ({
          id: doc.id,
          type: 'purchase',
          ...doc.data()
        }));

        const combined = [...battleData, ...txData].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ).slice(0, 5);

        setActivities(combined);
      } catch (e) {
        console.error("Error fetching activities:", e);
      }
    };
    
    fetchStats();
    fetchActivities();
  }, [user]);

  const claimDaily = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/rewards/claim-daily', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Daily Reward Claimed! +25 XP and Starter Pack Credit.");
      // Refresh user data
      const userRef = doc(db, 'users', user!.uid);
      const userSnap = await getDoc(userRef);
      setUserData(userSnap.data());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClaiming(false);
    }
  };

  const progress = getCurrentLevelProgress(userData?.xp || 0);

  if (authLoading) return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-[120px] min-h-screen space-y-10">
      <div className="h-48 w-full bg-white/5 animate-pulse rounded-[2.5rem]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white/5 animate-pulse rounded-xl" />)}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <div key={i} className="h-56 bg-white/5 animate-pulse rounded-[20px]" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-6 pb-[120px] min-h-screen space-y-8">
      
      {/* Hero Experience Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0a0a0a] min-h-[260px] flex items-center group shadow-2xl"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-secondary/10 blur-[100px] rounded-full animate-glow" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        </div>

        <div className="relative z-10 p-8 md:p-12 w-full flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
              >
                <Sparkles size={12} />
                Season 1: Genesis
              </motion.div>
              <h1 className="text-4xl md:text-6xl font-black font-space text-white leading-[0.9] tracking-tighter">
                {cardsOwned === 0 ? "START YOUR" : "BUILD."}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  {cardsOwned === 0 ? "COLLECTION." : "BATTLE."}
                </span><br />
                {cardsOwned === 0 ? "TODAY." : "COLLECT."}
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/packs')}
                className="px-8 py-4 bg-white text-black font-black font-space rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
              >
                OPEN YOUR FIRST PACK
                <Package size={20} />
              </motion.button>
              
              <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                 <div className="text-right">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Rank</p>
                    <p className="text-sm font-black font-space text-white uppercase tracking-tighter">Level {progress.level}</p>
                 </div>
                 <div className="w-px h-8 bg-white/10" />
                 <div className="text-left">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Progress</p>
                    <p className="text-sm font-black font-space text-white uppercase tracking-tighter">{progress.percentage}%</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Side Visuals (Floating Cards or Elements) */}
          <div className="relative hidden lg:block w-[300px] h-[200px]">
             <motion.div 
               animate={{ y: [0, -15, 0], rotate: [5, 2, 5] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-0 right-0 w-36 h-48 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 shadow-2xl flex items-center justify-center rotate-6"
             >
                <Zap size={48} className="text-primary/20" />
             </motion.div>
             <motion.div 
               animate={{ y: [0, 15, 0], rotate: [-5, -8, -5] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-4 right-16 w-36 h-48 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 shadow-2xl flex items-center justify-center -rotate-6 z-20"
             >
                <Swords size={48} className="text-secondary/20" />
             </motion.div>
             <div className="absolute inset-0 bg-primary/20 blur-[60px] -z-10" />
          </div>
        </div>
      </motion.div>

      {/* Stats Quick Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Cards Owned" value={cardsOwned} color="purple" delay={0.1} />
        <StatCard icon={Package} label="Pack Credits" value={(userData?.starterCredits || 0) + (userData?.standardCredits || 0) + (userData?.premiumCredits || 0)} color="blue" delay={0.2} />
        <StatCard icon={Activity} label="Battles Played" value={userData?.battlesPlayed || 0} color="teal" delay={0.3} />
        <StatCard icon={Trophy} label="Win Rate" value={userData?.battlesPlayed ? `${Math.round(((userData?.battlesWon || 0) / userData.battlesPlayed) * 100)}%` : '0%'} color="amber" delay={0.4} />
      </div>

      {/* Main Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard 
          title="OPEN PACKS"
          text="Reveal new cards and expand your legendary collection."
          btnText="VISIT PACKS"
          icon={Package}
          onClick={() => router.push('/packs')}
          color="purple"
          image="/images/booster-pack.png"
        />
        <ActionCard 
          title="BATTLE ARENA"
          text="Climb the ranks and earn Neural Resonance."
          btnText="ENTER ARENA"
          icon={Swords}
          onClick={() => router.push('/play')}
          color="teal"
          image="/images/arena-bg.png"
        />
        <ActionCard 
          title="MARKETPLACE"
          text="Trade unique assets with the player community."
          btnText="TRADE NOW"
          icon={ShoppingCart}
          onClick={() => router.push('/market')}
          color="blue"
          image="/images/cyber-knight.png"
        />
      </div>

      {/* Featured Drops / Trending Section */}
      <div className="space-y-6 pt-4">
         <div className="flex items-center justify-between">
            <h2 className="text-xl font-black font-space text-white uppercase tracking-wider flex items-center gap-3">
              <Sparkles size={20} className="text-primary animate-pulse" />
              Featured Drops
            </h2>
            <button className="text-[10px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center gap-2 group">
              View All <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </button>
         </div>

         <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            <SolgineCard 
              cardId="001"
              name="NEURAL KNIGHT"
              type="Warrior / Mech"
              rarity="Legendary"
              finish="Animated Holo"
              artworkUrl="/images/cyber-knight.png"
              stats={{ atk: 85, def: 60, spd: 45, util: 30 }}
              description="A relic from the first digital wars, still pulsing with ancient resonance."
            />
            <SolgineCard 
              cardId="002"
              name="VOID DRAGON"
              type="Beast / Cosmic"
              rarity="Mythic"
              finish="Mythic Aura"
              artworkUrl="/images/void-dragon.png"
              stats={{ atk: 95, def: 80, spd: 70, util: 90 }}
              description="The void doesn't just consume; it remembers everything it has ever eaten."
            />
            <SolgineCard 
              cardId="003"
              name="GLITCH MAGE"
              type="Spellcaster / Rogue"
              rarity="Rare"
              finish="Glitch"
              artworkUrl="/images/glitch-mage.png"
              stats={{ atk: 40, def: 30, spd: 90, util: 85 }}
              description="Her spells are errors in the simulation that she has learned to replicate."
            />
            <SolgineCard 
              cardId="004"
              name="CYBER SENTINEL"
              type="Guardian / Wall"
              rarity="Epic"
              finish="Prismatic"
              artworkUrl="/images/cyber-knight.png"
              stats={{ atk: 30, def: 95, spd: 20, util: 50 }}
              description="Unmovable, unyielding, and completely detached from the physical world."
            />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Recent Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black font-space text-white uppercase tracking-wider flex items-center gap-3">
            <Activity size={20} className="text-zinc-400" />
            Your Journey
          </h2>
          
          <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={activity.id} 
                  className="relative group"
                >
                   <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0a0a0a] border-2 border-primary group-hover:scale-125 transition-transform shadow-[0_0_8px_#9945ff]" />
                   <div className="glass-morphism p-5 flex items-center justify-between border-white/5 hover:border-white/20 transition-all rounded-2xl group hover:shadow-xl">
                      <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
                            activity.type === 'battle' ? (activity.status === 'won' ? "bg-secondary/10 border-secondary/20 text-secondary" : "bg-red-500/10 border-red-500/20 text-red-400") : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          )}>
                            {activity.type === 'battle' ? <Swords size={22} /> : <ShoppingCart size={22} />}
                          </div>
                          <div>
                            <p className="text-sm font-black font-space text-white uppercase tracking-tight">
                                {activity.type === 'battle' ? `Battle ${activity.status.toUpperCase()}` : 'MARKET_PURCHASE'}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                {activity.type === 'battle' ? `+${activity.xpEarned} XP GAINED • AGAINST AI_BOT_01` : `${activity.price} CREDITS • ITEM_DELIVERED`}
                            </p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <ChevronRight size={16} className="text-zinc-700 ml-auto mt-1 group-hover:text-white transition-colors" />
                      </div>
                   </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-morphism rounded-[2rem] p-12 text-center space-y-6 border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto relative">
                   <Activity size={32} className="text-zinc-700" />
                   <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-lg font-black font-space text-white uppercase">Your journey begins here</h3>
                   <p className="text-zinc-500 text-xs max-w-[280px] mx-auto font-medium">No recorded movements in the grid yet. Initialize your collection to start building your legacy.</p>
                </div>
                <button 
                  onClick={() => router.push('/packs')}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  INITIALIZE PROTOCOL
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Neural Store & Progression */}
        <div className="space-y-8">
           <div className="space-y-6">
              <h2 className="text-xl font-black font-space text-white uppercase tracking-wider flex items-center gap-3">
                <Zap size={20} className="text-primary" />
                Neural Store
              </h2>
              <div className="glass-morphism p-6 border-primary/10 bg-primary/5 rounded-[2rem] space-y-4">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-4">Neural Credits: <span className="text-white">{(userData?.credits || 0)}</span></p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <StoreItem icon={Package} label="Starter Pack" cost="FREE" onClick={claimDaily} disabled={claiming} color="zinc" />
                    <StoreItem icon={Sparkles} label="Standard Pack" cost="500 CR" onClick={() => toast.success("Opening checkout...")} color="blue" />
                    <StoreItem icon={Zap} label="Premium Pack" cost="1,500 CR" onClick={() => toast.success("Accessing secure portal...")} color="purple" />
                    <StoreItem icon={Trophy} label="Elite Pack" cost="5,000 CR" onClick={() => toast.error("Higher Resonance Required")} color="amber" />
                  </div>
              </div>
           </div>

           {/* Progression Card */}
           <div className="glass-morphism p-8 border-amber-500/10 bg-amber-500/5 relative overflow-hidden group rounded-[2rem]">
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                       <Trophy size={28} />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-white uppercase tracking-widest">Collector Rank</h3>
                       <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mt-0.5">Tier 1: Novice</p>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                       <span className="text-zinc-500">XP Progress</span>
                       <span className="text-white">{progress.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progress.percentage}%` }}
                         className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                       />
                    </div>
                 </div>

                 <button 
                   onClick={claimDaily}
                   disabled={claiming}
                   className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black font-space text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_15px_30px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                 >
                    {claiming ? "SYNCING..." : "CLAIM DAILY RESUPPLY"}
                 </button>
              </div>
              <Star className="absolute -bottom-10 -right-10 text-amber-500/5 group-hover:scale-110 transition-transform group-hover:rotate-12 duration-1000" size={160} />
           </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, delay }: any) {
  const colors: any = {
    purple: "text-primary group-hover:bg-primary/20",
    teal: "text-secondary group-hover:bg-secondary/20",
    blue: "text-blue-400 group-hover:bg-blue-400/20",
    amber: "text-amber-400 group-hover:bg-amber-400/20",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="glass-morphism p-6 rounded-[2rem] border-white/5 hover:border-white/10 transition-all group shadow-lg"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={cn("p-3 rounded-xl bg-white/5 transition-all group-hover:scale-110", colors[color])}>
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-black tracking-[0.15em] uppercase text-zinc-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black font-space text-white drop-shadow-2xl">{value}</span>
      </div>
    </motion.div>
  );
}

function ActionCard({ title, text, btnText, icon: Icon, onClick, color, image }: any) {
  const glows: any = {
    purple: "shadow-primary/5 hover:shadow-primary/20 hover:border-primary/30",
    teal: "shadow-secondary/5 hover:shadow-secondary/20 hover:border-secondary/30",
    blue: "shadow-blue-500/5 hover:shadow-blue-500/20 hover:border-blue-500/30",
  };

  const accents: any = {
    purple: "text-primary",
    teal: "text-secondary",
    blue: "text-blue-400",
  };

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className={cn(
        "relative glass-morphism p-8 rounded-[2.5rem] flex flex-col justify-between h-[340px] group transition-all duration-500 cursor-pointer shadow-2xl overflow-hidden", 
        glows[color]
      )} 
      onClick={onClick}
    >
      {/* Background Image/Overlay */}
      <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
         <img src={image} alt={title} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl group-hover:scale-110 transition-transform duration-500">
          <Icon size={28} className="text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-black font-space text-white mb-2 tracking-tighter uppercase">{title}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-[200px]">{text}</p>
        </div>
      </div>

      <div className="relative z-10">
        <button className="flex items-center gap-2 text-[11px] font-black font-space text-white uppercase tracking-[0.2em] group/btn">
          {btnText}
          <div className={cn("p-2 rounded-lg bg-white/5 group-hover/btn:bg-white/10 transition-colors", accents[color])}>
            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Rarity/Glow Accent */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity", 
        color === 'purple' ? "bg-primary" : color === 'teal' ? "bg-secondary" : "bg-blue-500"
      )} />
    </motion.div>
  );
}

function FeaturedCard({ name, rarity, price, image }: any) {
  const rarityGlows: any = {
    Legendary: "shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-500/20",
    Epic: "shadow-[0_0_20px_rgba(153,69,255,0.2)] border-primary/20",
    Rare: "shadow-[0_0_20px_rgba(20,241,149,0.2)] border-secondary/20",
    Common: "border-white/5"
  };

  const rarityText: any = {
    Legendary: "text-amber-500",
    Epic: "text-primary",
    Rare: "text-secondary",
    Common: "text-zinc-500"
  };

  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      className={cn(
        "min-w-[220px] w-[220px] aspect-[3/4.5] bg-[#0d0d0d] rounded-[2rem] border p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-500",
        rarityGlows[rarity]
      )}
    >
      {/* Card Visual */}
      <div className="absolute inset-0 z-0">
        <img src={image} alt={name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 scale-110 group-hover:scale-100 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
      </div>

      {/* Rarity Badge */}
      <div className="relative z-10 flex justify-between items-start">
         <div className={cn("px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase tracking-widest", rarityText[rarity])}>
            {rarity}
         </div>
         <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <Star size={12} className={rarityText[rarity]} fill="currentColor" />
         </div>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
        <h4 className="text-sm font-black font-space text-white leading-tight uppercase">{name}</h4>
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-black font-space text-zinc-400">{price}</span>
           <button className="p-2 rounded-xl bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ShoppingCart size={14} />
           </button>
        </div>
      </div>

      {/* Hover Particles Simulation (Subtle) */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-1000">
         <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" />
         <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full animate-ping [animation-delay:0.5s]" />
      </div>
    </motion.div>
  );
}

function StoreItem({ icon: Icon, label, cost, onClick, disabled, color }: any) {
  const colors: any = {
    zinc: "text-zinc-400 bg-white/5",
    blue: "text-blue-400 bg-blue-400/5 border-blue-500/10",
    purple: "text-primary bg-primary/5 border-primary/10",
    amber: "text-amber-400 bg-amber-500/5 border-amber-500/10",
  };

  return (
    <motion.button 
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all group glass-morphism",
        colors[color]
      )}
    >
       <div className="flex items-center gap-4">
          <Icon size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-black font-space uppercase tracking-[0.15em]">{label}</span>
       </div>
       <span className="text-[10px] font-black font-space opacity-60 group-hover:opacity-100 transition-opacity bg-black/40 px-3 py-1 rounded-full">{cost}</span>
    </motion.button>
  );
}
