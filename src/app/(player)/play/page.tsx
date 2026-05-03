'use client';

import { useState, useEffect } from 'react';
import { Swords, Zap, Users, Trophy, Loader2, Sparkles, ShieldCheck, Hammer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function PlayPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searching, setSearching] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [activeDeck, setActiveDeck] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'decks'), 
      where('userId', '==', user.uid),
      where('isActive', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveDeck(snap.docs[0].data());
      } else {
        setActiveDeck(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const startMatchmaking = () => {
    setSearching(true);
    // Simulate finding a match
    setTimeout(() => {
      setSearching(false);
      setMatchFound(true);
    }, 4000);
  };

  const startPracticeMatch = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/battle/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/play/battle/${data.matchId}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-12 pt-10">
      <AnimatePresence mode="wait">
        {!searching && !matchFound && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-2xl w-full space-y-12"
          >
            <div className="space-y-4">
              <div className="w-24 h-24 rounded-[2rem] bg-primary-gradient flex items-center justify-center mx-auto neon-glow-purple">
                 <Swords size={48} className="text-white" />
              </div>
              <h1 className="text-5xl font-black font-space text-white tracking-tighter uppercase">Battle Arena</h1>
              <p className="text-zinc-500 font-space font-bold tracking-[0.3em] uppercase text-xs">Enter the neural combat simulation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <GameModeCard 
                 title="PRACTICE (AI)" 
                 desc="Test your deck strategies against advanced neural combatants."
                 icon={Users}
                 color="teal"
                 onClick={startPracticeMatch}
               />
               <GameModeCard 
                 title="DECK FORGE" 
                 desc="Configure your 10-card battle lineup for optimal power."
                 icon={Hammer}
                 color="purple"
                 onClick={() => router.push('/decks')}
               />
            </div>

            <ActiveDeckStatus />
          </motion.div>
        )}

        {searching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <div className="relative">
               <div className="w-40 h-40 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-primary animate-spin border-t-transparent shadow-[0_0_40px_rgba(153,69,255,0.4)]"></div>
               </div>
               <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={40} />
            </div>
            
            <div className="space-y-2">
               <h2 className="text-3xl font-black font-space text-white uppercase tracking-widest">Searching...</h2>
               <p className="text-zinc-500 font-mono text-sm">LOCATING OPTIMAL OPPONENT IN REGION_US_EAST</p>
            </div>

            <button 
              onClick={() => setSearching(false)}
              className="text-red-500 font-black font-space text-xs uppercase tracking-widest hover:underline"
            >
              Abort Mission
            </button>
          </motion.div>
        )}

        {matchFound && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-12 w-full max-w-4xl"
          >
            <h2 className="text-4xl font-black font-space text-white tracking-[0.5em] uppercase italic">Match Found</h2>
            
            <div className="flex items-center justify-around w-full">
               <MatchPlayer name="YOU" rank="GOLD II" avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=you" />
               <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center italic font-black text-2xl text-zinc-500">VS</div>
                  <div className="h-24 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
               </div>
               <MatchPlayer name="X_CYBER_99" rank="PLATINUM I" avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=enemy" enemy />
            </div>

            <button className="px-12 py-5 rounded-2xl bg-secondary text-black font-black font-space text-xl shadow-[0_0_50px_rgba(20,241,149,0.3)] hover:scale-105 transition-all">
               INITIALIZE COMBAT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GameModeCard({ title, desc, icon: Icon, color, onClick }: any) {
  const colors: any = {
    purple: "border-primary/20 hover:border-primary/60 group",
    teal: "border-secondary/20 hover:border-secondary/60 group",
  };

  return (
    <div 
      onClick={onClick}
      className={cn("glass-card p-8 cursor-pointer text-left transition-all", colors[color])}
    >
       <div className="flex items-start justify-between mb-6">
          <div className={cn("p-4 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors", color === 'purple' ? 'text-primary' : 'text-secondary')}>
             <Icon size={32} />
          </div>
          <Sparkles size={16} className="text-zinc-700 group-hover:text-white transition-colors" />
       </div>
       <h3 className="text-xl font-black font-space text-white mb-2">{title}</h3>
       <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function MatchPlayer({ name, rank, avatar, enemy }: any) {
  return (
    <div className="flex flex-col items-center gap-6">
       <div className={cn(
         "w-32 h-32 rounded-[3rem] p-1",
         enemy ? "bg-red-500 neon-glow-teal" : "bg-primary neon-glow-purple"
       )}>
          <div className="w-full h-full rounded-[2.8rem] bg-background overflow-hidden border-4 border-background">
             <img src={avatar} className="w-full h-full object-cover" />
          </div>
       </div>
       <div className="space-y-1 text-center">
          <p className="text-[10px] font-bold text-zinc-500 tracking-[0.3em] uppercase mb-1">Combatant</p>
          <h4 className="text-2xl font-black font-space text-white">{name}</h4>
          <div className="flex items-center gap-2 justify-center">
             <ShieldCheck size={14} className="text-primary" />
             <span className="text-xs font-bold font-space text-zinc-400">{rank}</span>
          </div>
       </div>
    </div>
  );
}

function ActiveDeckStatus() {
  const { user } = useAuth();
  const [activeDeck, setActiveDeck] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'decks'), 
      where('userId', '==', user.uid),
      where('isActive', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveDeck(snap.docs[0].data());
      } else {
        setActiveDeck(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-8">
       {activeDeck ? (
         <div className="glass-card p-4 flex items-center justify-between border-secondary/20 bg-secondary/5">
            <div className="flex items-center gap-4 text-left">
               <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                  <CheckCircle2 size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Deck</p>
                  <h4 className="text-sm font-black font-space text-white uppercase">{activeDeck.name}</h4>
               </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Power Score</p>
               <p className="text-lg font-black font-space text-secondary">{activeDeck.powerScore}</p>
            </div>
         </div>
       ) : (
         <div className="glass-card p-4 flex items-center justify-between border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-4 text-left">
               <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <AlertCircle size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No Active Deck</p>
                  <h4 className="text-sm font-black font-space text-white uppercase">Combat Restricted</h4>
               </div>
            </div>
            <button 
              onClick={() => window.location.href = '/decks'}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-black font-space text-[10px] uppercase tracking-widest"
            >
               Forge Deck
            </button>
         </div>
       )}
    </div>
  );
}

