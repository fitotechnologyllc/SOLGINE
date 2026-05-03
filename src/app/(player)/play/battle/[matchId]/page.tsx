/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { getCurrentLevelProgress } from '@/lib/rewards';
import { 
  Zap, 
  Sword, 
  Shield, 
  Terminal, 
  Trophy, 
  Skull, 
  X, 
  ArrowRight,
  ShieldAlert,
  History,
  Activity,
  Heart,
  User,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function BattleRoomPage() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [performingAction, setPerformingAction] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId || !user) return;

    const unsub = onSnapshot(doc(db, 'matches', matchId as string), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMatch(data);
        if (data.status !== 'active') {
          // Fetch updated user data for results screen
          getDoc(doc(db, 'users', user.uid)).then(uSnap => {
            if (uSnap.exists()) setUserData(uSnap.data());
          });
        }
      } else {
        toast.error("Match not found");
        router.push('/play');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [matchId, user]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [match?.battleLog]);

  const handleAction = async (action: string, cardId?: string) => {
    if (performingAction || match?.turn !== 'player' || match?.status !== 'active') return;
    
    setPerformingAction(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/battle/action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchId, action, cardId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPerformingAction(false);
    }
  };

  const handleAbandon = async () => {
    if (!confirm("Are you sure you want to abandon the match? This will count as a defeat.")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/battle/abandon', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchId })
      });
      router.push('/play');
    } catch (e: any) {
      toast.error("Failed to abandon match");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Zap className="animate-pulse text-primary" size={48} /></div>;

  const isPlayerTurn = match?.turn === 'player';
  const isGameOver = match?.status !== 'active';

  return (
    <div className="h-screen flex flex-col bg-[#020202] text-white overflow-hidden font-space">
      {/* HUD Header */}
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
         <div className="flex items-center gap-4">
            <button onClick={handleAbandon} className="p-2 rounded-lg bg-white/5 text-zinc-500 hover:text-red-500 transition-colors">
               <X size={20} />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <div>
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Match ID</p>
               <p className="text-xs font-mono text-zinc-400">{matchId?.toString().slice(-8).toUpperCase() || 'UNKNOWN'}</p>
            </div>
         </div>

         <div className="flex items-center gap-8">
            <div className="text-right">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Status</p>
               <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", isPlayerTurn ? "bg-primary shadow-[0_0_10px_#9945FF]" : "bg-zinc-700")} />
                  <p className={cn("text-xs font-black uppercase tracking-widest", isPlayerTurn ? "text-primary" : "text-zinc-500")}>
                     {isPlayerTurn ? "YOUR TURN" : "AI PROCESSING"}
                  </p>
               </div>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Round</p>
               <p className="text-xl font-black text-white">{match?.turnNumber}</p>
            </div>
         </div>
      </header>

      {/* Battle Field */}
      <div className="flex-1 flex overflow-hidden relative">
         {/* Background Elements */}
         <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[150px] rounded-full"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30"></div>
         </div>

         {/* Main Content */}
         <div className="flex-1 flex flex-col p-8 space-y-8 relative z-10">
            {/* AI Side */}
            <div className="flex flex-col items-center space-y-4">
               <div className="flex items-center gap-6 w-full max-w-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 shadow-xl">
                     <Cpu size={32} />
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between items-end">
                        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                           AI_OVERSEER_V1
                           {match?.aiShield && <Shield size={14} className="text-secondary animate-pulse" />}
                           {match?.aiDodge && <Activity size={14} className="text-primary animate-pulse" />}
                        </h3>
                        <p className="text-xl font-black text-white">{match?.aiHp} <span className="text-zinc-500 text-xs">/ 100</span></p>
                     </div>
                     <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: '100%' }}
                          animate={{ width: `${match?.aiHp}%` }}
                          className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        />
                     </div>
                  </div>
               </div>
               {/* AI Hand Representation */}
               <div className="flex gap-2">
                  {[...Array(match?.aiHand?.length || 0)].map((_, i) => (
                    <div key={i} className="w-8 h-12 bg-zinc-800/50 border border-white/5 rounded-md backdrop-blur-sm"></div>
                  ))}
               </div>
            </div>

            {/* Battle Zone (Played Cards) */}
            <div className="flex-1 flex items-center justify-center">
               <div className="grid grid-cols-2 gap-12 w-full max-w-4xl">
                  {/* Last Player Card */}
                  <div className="flex flex-col items-center space-y-4">
                     <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Last Action</p>
                     <AnimatePresence mode="wait">
                       {match?.playedCards?.filter((c: any) => c.owner === 'player').slice(-1).map((card: any) => (
                         <motion.div 
                           key={card.id + card.turn}
                           initial={{ scale: 0.8, opacity: 0, y: 20 }}
                           animate={{ scale: 1, opacity: 1, y: 0 }}
                           className="w-40 aspect-[3/4] glass-card p-3 border-primary/40 shadow-[0_0_30px_rgba(153,69,255,0.2)]"
                         >
                            <img src={card.imageUrl} className="w-full aspect-square rounded-lg mb-2 object-cover" />
                            <h4 className="text-[10px] font-black uppercase truncate">{card.name}</h4>
                            <div className="flex justify-between mt-2">
                               <div className="flex items-center gap-1 text-[10px] text-primary"><Sword size={10} /> {card.attack}</div>
                               <div className="flex items-center gap-1 text-[10px] text-zinc-400"><Shield size={10} /> {card.defense}</div>
                            </div>
                         </motion.div>
                       ))}
                     </AnimatePresence>
                  </div>

                  {/* Last AI Card */}
                  <div className="flex flex-col items-center space-y-4">
                     <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">AI Action</p>
                     <AnimatePresence mode="wait">
                       {match?.playedCards?.filter((c: any) => c.owner === 'ai').slice(-1).map((card: any) => (
                         <motion.div 
                           key={card.id + card.turn}
                           initial={{ scale: 0.8, opacity: 0, y: -20 }}
                           animate={{ scale: 1, opacity: 1, y: 0 }}
                           className="w-40 aspect-[3/4] glass-card p-3 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                         >
                            <img src={card.imageUrl} className="w-full aspect-square rounded-lg mb-2 object-cover" />
                            <h4 className="text-[10px] font-black uppercase truncate">{card.name}</h4>
                            <div className="flex justify-between mt-2">
                               <div className="flex items-center gap-1 text-[10px] text-red-400"><Sword size={10} /> {card.attack}</div>
                               <div className="flex items-center gap-1 text-[10px] text-zinc-400"><Shield size={10} /> {card.defense}</div>
                            </div>
                         </motion.div>
                       ))}
                     </AnimatePresence>
                  </div>
               </div>
            </div>

            {/* Player Side */}
            <div className="flex flex-col items-center space-y-4">
               <div className="flex items-center gap-6 w-full max-w-2xl">
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between items-end">
                        <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                           {match?.playerDodge && <Activity size={14} className="animate-pulse" />}
                           {match?.playerShield && <Shield size={14} className="text-secondary animate-pulse" />}
                           USER_PILOT
                        </h3>
                        <p className="text-xl font-black text-white">{match?.playerHp} <span className="text-zinc-500 text-xs">/ 100</span></p>
                     </div>
                     <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: '100%' }}
                          animate={{ width: `${match?.playerHp}%` }}
                          className="h-full bg-primary shadow-[0_0_15px_rgba(153,69,255,0.5)]"
                        />
                     </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                     <User size={32} />
                  </div>
               </div>
            </div>
         </div>

         {/* Sidebar: Battle Log */}
         <div className="w-80 bg-black/40 backdrop-blur-xl border-l border-white/5 flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
               <Terminal size={16} className="text-primary" />
               <h3 className="text-xs font-black uppercase tracking-widest">Neural Link Feed</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[10px] custom-scrollbar">
               {match?.battleLog?.map((log: any, i: number) => (
                 <div key={i} className={cn(
                   "p-2 rounded-lg border-l-2",
                   log.type === 'player' ? "bg-primary/5 border-primary" : 
                   log.type === 'ai' ? "bg-red-500/5 border-red-500" : "bg-white/5 border-zinc-700"
                 )}>
                    <p className={cn(
                      "font-bold uppercase tracking-tighter mb-0.5",
                      log.type === 'player' ? "text-primary" : log.type === 'ai' ? "text-red-400" : "text-zinc-500"
                    )}>
                      {log.type === 'system' ? 'CORE' : log.type.toUpperCase()}
                    </p>
                    <p className="text-zinc-300 leading-relaxed">{log.message}</p>
                 </div>
               ))}
               <div ref={logEndRef} />
            </div>
            
            {/* End Turn Button Area */}
            <div className="p-6 border-t border-white/5 bg-black/40">
               <button 
                 onClick={() => handleAction('endTurn')}
                 disabled={!isPlayerTurn || performingAction || isGameOver}
                 className="w-full py-4 rounded-xl bg-primary text-black font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_30px_rgba(153,69,255,0.3)] disabled:opacity-50 disabled:grayscale hover:scale-105 transition-all"
               >
                  End Turn
               </button>
            </div>
         </div>
      </div>

      {/* Player Hand / Action Dock */}
      <footer className="h-48 border-t border-white/5 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 relative z-20">
         <div className="flex gap-4 max-w-6xl overflow-x-auto px-10 py-2 custom-scrollbar no-scrollbar">
            {match?.playerHand?.map((card: any) => (
              <motion.div 
                key={card.id}
                whileHover={{ y: -40, scale: 1.1 }}
                onClick={() => handleAction('attack', card.id)}
                className={cn(
                  "w-32 aspect-[3/4] glass-card p-2 shrink-0 cursor-pointer transition-all border-white/10 hover:border-primary/60",
                  (!isPlayerTurn || isGameOver) && "opacity-50 grayscale pointer-events-none"
                )}
              >
                 <div className="w-full aspect-square rounded-lg overflow-hidden mb-2">
                    <img src={card.imageUrl} className="w-full h-full object-cover" />
                 </div>
                 <h4 className="text-[9px] font-black uppercase truncate">{card.name}</h4>
                 <div className="flex justify-between mt-1 text-[8px] font-bold">
                    <span className="text-primary flex items-center gap-0.5"><Sword size={8} /> {card.attack}</span>
                    <span className="text-zinc-400 flex items-center gap-0.5"><Shield size={8} /> {card.defense}</span>
                 </div>
              </motion.div>
            ))}
            
            {match?.playerHand?.length === 0 && (
              <div className="flex items-center gap-3 text-zinc-600 italic">
                 <History size={20} />
                 <p className="text-xs uppercase tracking-widest font-bold">Neural core exhausted... end turn to draw</p>
              </div>
            )}
         </div>
      </footer>

      {/* Results Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="max-w-xl w-full glass-card p-10 text-center border-white/10 space-y-8 relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-primary/5 -z-10" />
                
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 relative">
                   {match.status === 'won' ? (
                     <Trophy size={48} className="text-secondary neon-glow-teal animate-bounce" />
                   ) : (
                     <Skull size={48} className="text-red-500 neon-glow-red" />
                   )}
                </div>

                <div className="space-y-2">
                   <h2 className={cn(
                     "text-6xl font-black font-space uppercase italic tracking-tighter",
                     match.status === 'won' ? "text-secondary" : "text-red-500 text-glow-red"
                   )}>
                      {match.status === 'won' ? "VICTORY" : "DEFEAT"}
                   </h2>
                   <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em]">Neural Link Status: TERMINATED</p>
                </div>

                {userData && (
                  <div className="space-y-6 bg-white/[0.03] p-8 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-end mb-2">
                       <p className="text-xs font-black text-white flex items-center gap-2">
                          <Activity size={14} className="text-primary" />
                          LEVEL {getCurrentLevelProgress(userData.xp).level}
                       </p>
                       <p className="text-[10px] font-bold text-zinc-500">
                          {getCurrentLevelProgress(userData.xp).currentXp} / {getCurrentLevelProgress(userData.xp).neededXp} XP
                       </p>
                    </div>
                    <div className="h-3 w-full bg-black rounded-full border border-white/5 p-0.5">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${getCurrentLevelProgress(userData.xp).percentage}%` }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                         className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_15px_rgba(153,69,255,0.4)]"
                       />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                       <div className="text-center">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">XP Earned</p>
                          <p className="text-xl font-black text-white">+{match.status === 'won' ? 100 : 25}</p>
                       </div>
                       <div className="text-center border-x border-white/5">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Win Streak</p>
                          <p className="text-xl font-black text-secondary">{userData.winStreak || 0}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Credits</p>
                          <p className="text-xl font-black text-primary">+{userData.starterCredits - (userData.lastStarterCredits || 0) || 0}</p>
                       </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <button 
                     onClick={() => router.push('/play')}
                     className="py-4 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                   >
                      Battle Again
                   </button>
                   <button 
                     onClick={() => router.push('/collection')}
                     className="py-4 rounded-xl bg-white/5 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all border border-white/5"
                   >
                      Collection
                   </button>
                   <button 
                     onClick={() => router.push('/packs')}
                     className="py-4 rounded-xl bg-secondary text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(20,241,149,0.3)]"
                   >
                      Open Packs
                   </button>
                </div>

                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest cursor-pointer hover:text-zinc-400" onClick={() => router.push('/play')}>
                   Return to hub
                </p>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
