'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target, Users, Zap, Search, ArrowUp, Activity } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('xp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(data);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8 pt-10">
        <div className="h-12 w-64 bg-white/5 animate-pulse rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10 pt-10 pb-[120px]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <Trophy size={24} />
             </div>
             <div>
                <h1 className="text-4xl font-black font-space text-white uppercase italic tracking-tighter">Hall of Legends</h1>
                <p className="text-zinc-500 font-space text-xs tracking-widest uppercase">Global Combatant Rankings</p>
             </div>
          </div>
        </div>
      </header>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-4 items-end pt-10 pb-6">
         {/* Rank 2 */}
         {players[1] && <PodiumItem player={players[1]} rank={2} height="h-40" color="silver" />}
         {/* Rank 1 */}
         {players[0] && <PodiumItem player={players[0]} rank={1} height="h-56" color="gold" />}
         {/* Rank 3 */}
         {players[2] && <PodiumItem player={players[2]} rank={3} height="h-32" color="bronze" />}
      </div>

      {/* Rankings List */}
      <div className="space-y-3">
         {players.slice(3).map((player, idx) => (
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             transition={{ delay: idx * 0.05 }}
             key={player.id}
             className="glass-card p-4 flex items-center justify-between group hover:border-white/20 transition-all border-white/5"
           >
              <div className="flex items-center gap-6">
                 <span className="text-xl font-black font-space text-zinc-600 w-8">{idx + 4}</span>
                 <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden border border-white/10">
                    <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} alt="avatar" />
                 </div>
                 <div>
                    <h4 className="text-white font-black font-space uppercase text-sm">{player.displayName || 'PILOT_UNKNOWN'}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Level {Math.floor((player.xp || 0) / 250) + 1}</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-10">
                 <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Battles Won</p>
                    <p className="text-lg font-black text-white font-space">{player.battlesWon || 0}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural XP</p>
                    <p className="text-lg font-black text-primary font-space">{player.xp || 0}</p>
                 </div>
              </div>
           </motion.div>
         ))}
      </div>
    </div>
  );
}

function PodiumItem({ player, rank, height, color }: any) {
  const colors: any = {
    gold: "text-amber-400 border-amber-500/20 shadow-[0_0_30px_rgba(251,191,36,0.1)]",
    silver: "text-zinc-300 border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]",
    bronze: "text-orange-400 border-orange-500/20 shadow-[0_0_30px_rgba(251,146,60,0.05)]"
  };

  const rankIcon: any = {
    1: <Trophy className="text-amber-400" size={32} />,
    2: <Medal className="text-zinc-300" size={28} />,
    3: <Medal className="text-orange-400" size={24} />,
  };

  return (
    <div className="flex flex-col items-center gap-4">
       <div className="relative">
          <div className={cn("w-20 h-20 rounded-[2rem] bg-zinc-900 border p-1", colors[color])}>
             <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-background">
                <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} alt="avatar" />
             </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-black border border-white/10 rounded-full w-8 h-8 flex items-center justify-center font-black text-xs text-white">
             {rank}
          </div>
       </div>
       
       <div className={cn("w-full rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center p-4", height, colors[color])}>
          {rankIcon[rank]}
          <h4 className="text-xs font-black font-space text-white uppercase text-center mt-3 truncate w-full">{player.displayName || 'PILOT_REDACTED'}</h4>
          <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">{player.xp} XP</p>
       </div>
    </div>
  );
}
