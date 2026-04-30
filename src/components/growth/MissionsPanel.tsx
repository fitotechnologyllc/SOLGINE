'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/components/providers/AuthProvider';
import { Target, Zap, Package, Trophy, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export function MissionsPanel() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch active missions
    const qMissions = query(collection(db, 'missions'));
    const unsubMissions = onSnapshot(qMissions, (snap) => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch user progress
    const qProgress = query(collection(db, 'missionProgress'), where('userId', '==', user.uid));
    const unsubProgress = onSnapshot(qProgress, (snap) => {
      const progMap: Record<string, any> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        progMap[data.missionId] = { id: d.id, ...data };
      });
      setProgress(progMap);
      setLoading(false);
    });

    return () => {
      unsubMissions();
      unsubProgress();
    };
  }, [user]);

  const handleClaim = async (missionId: string) => {
    const loadingToast = toast.loading('Claiming reward...');
    try {
      const res = await fetch('/api/growth/claim-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId, userId: user?.uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Reward claimed!', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  if (loading) return <div className="h-48 bg-white/5 animate-pulse rounded-3xl" />;

  return (
    <div className="glass-card p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black font-space text-white flex items-center gap-2">
          <Target size={20} className="text-primary" />
          ACTIVE_MISSIONS
        </h3>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
          Resets in 14h 22m
        </span>
      </div>

      <div className="space-y-4">
        {missions.map((mission) => {
          const prog = progress[mission.id] || { currentValue: 0, completed: false, claimed: false };
          const percentage = Math.min((prog.currentValue / mission.target) * 100, 100);

          return (
            <div 
              key={mission.id} 
              className={cn(
                "p-4 rounded-2xl border transition-all relative overflow-hidden group",
                prog.claimed ? "bg-white/5 border-white/5 grayscale opacity-60" : "bg-black/40 border-white/10 hover:border-primary/30"
              )}
            >
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    prog.completed ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-zinc-500"
                  )}>
                    {mission.type === 'open_packs' && <Package size={20} />}
                    {mission.type === 'win_battles' && <Trophy size={20} />}
                    {mission.type === 'buy_card' && <Zap size={20} />}
                    {mission.type === 'sell_card' && <Zap size={20} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black font-space text-white uppercase">{mission.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{mission.description}</p>
                  </div>
                </div>
                
                {prog.completed && !prog.claimed ? (
                   <button 
                     onClick={() => handleClaim(mission.id)}
                     className="px-4 py-2 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                   >
                     Claim Rewards
                   </button>
                ) : prog.claimed ? (
                   <CheckCircle2 size={20} className="text-primary" />
                ) : (
                   <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      {prog.currentValue} / {mission.target}
                   </div>
                )}
              </div>

              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
                 <div 
                   className={cn(
                     "h-full transition-all duration-500",
                     prog.completed ? "bg-primary shadow-[0_0_10px_rgba(153,69,255,0.5)]" : "bg-zinc-700"
                   )} 
                   style={{ width: `${percentage}%` }}
                 />
              </div>

              <div className="mt-2 flex justify-between items-center relative z-10">
                 <div className="flex items-center gap-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Reward:</p>
                    <p className="text-[10px] font-black text-primary uppercase">+{mission.reward.amount} {mission.reward.type.toUpperCase()}</p>
                 </div>
                 <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Frequency: {mission.frequency}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
