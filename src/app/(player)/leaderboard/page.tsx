'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Trophy, Medal, Crown, Zap, TrendingUp, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const [tab, setTab] = useState('players'); // 'players' | 'traders' | 'creators'
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q;
      
      if (tab === 'players') {
        q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
      } else if (tab === 'traders') {
        // Mocking trader ranking by totalRevenue in stats
        q = query(collection(db, 'users'), orderBy('stats.totalRevenue', 'desc'), limit(50));
      } else {
        q = query(collection(db, 'projects'), orderBy('stats.totalRevenue', 'desc'), limit(50));
      }

      const snap = await getDocs(q);
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

    fetchData();
  }, [tab]);

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <p className="text-primary font-black font-space text-xs uppercase tracking-[0.5em]">Global Hall of Fame</p>
        <h1 className="text-6xl font-black font-space text-white uppercase tracking-tighter">PROTOCOL_LEADERS</h1>
        <div className="flex justify-center gap-4 mt-8">
           <TabBtn active={tab === 'players'} onClick={() => setTab('players')} icon={Users} label="Top Pilots" />
           <TabBtn active={tab === 'traders'} onClick={() => setTab('traders')} icon={Zap} label="Top Traders" />
           <TabBtn active={tab === 'creators'} onClick={() => setTab('creators')} icon={Crown} label="Top Creators" />
        </div>
      </header>

      {/* Top 3 Podium */}
      {!loading && data.length >= 3 && (
        <div className="grid grid-cols-3 gap-6 items-end max-w-4xl mx-auto py-10">
           {/* 2nd Place */}
           <div className="space-y-4 text-center pb-8">
              <div className="relative mx-auto w-24 h-24">
                 <div className="w-full h-full rounded-[2rem] bg-zinc-800 border-4 border-zinc-500 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data[1].id}`} alt="2nd" />
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-zinc-500 flex items-center justify-center text-black font-black text-xs border-4 border-[#0a0a0a]">2</div>
              </div>
              <div>
                 <p className="text-white font-black font-space uppercase truncate px-2">{data[1].displayName || data[1].name || 'REDACTED'}</p>
                 <p className="text-primary font-bold font-mono text-[10px]">{tab === 'players' ? `${data[1].xp} XP` : `${data[1].stats?.totalRevenue || 0} SOLG`}</p>
              </div>
           </div>

           {/* 1st Place */}
           <div className="space-y-6 text-center">
              <div className="relative mx-auto w-32 h-32">
                 <div className="w-full h-full rounded-[2.5rem] bg-primary-gradient p-1 neon-glow-purple">
                    <div className="w-full h-full rounded-[2.3rem] bg-zinc-900 overflow-hidden border-4 border-primary">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data[0].id}`} alt="1st" />
                    </div>
                 </div>
                 <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Crown size={32} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                 </div>
                 <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black font-black text-lg border-4 border-[#0a0a0a]">1</div>
              </div>
              <div>
                 <p className="text-2xl font-black font-space text-white uppercase truncate px-2">{data[0].displayName || data[0].name || 'REDACTED'}</p>
                 <p className="text-secondary font-black font-space text-xs tracking-widest">{tab === 'players' ? `${data[0].xp} XP` : `${data[0].stats?.totalRevenue || 0} SOLG`}</p>
              </div>
           </div>

           {/* 3rd Place */}
           <div className="space-y-4 text-center pb-4">
              <div className="relative mx-auto w-20 h-20">
                 <div className="w-full h-full rounded-[1.5rem] bg-zinc-800 border-4 border-amber-800 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data[2].id}`} alt="3rd" />
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-800 flex items-center justify-center text-black font-black text-xs border-4 border-[#0a0a0a]">3</div>
              </div>
              <div>
                 <p className="text-white font-black font-space uppercase truncate px-2">{data[2].displayName || data[2].name || 'REDACTED'}</p>
                 <p className="text-primary font-bold font-mono text-[10px]">{tab === 'players' ? `${data[2].xp} XP` : `${data[2].stats?.totalRevenue || 0} SOLG`}</p>
              </div>
           </div>
        </div>
      )}

      {/* Main List */}
      <div className="glass-card overflow-hidden">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rank</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entity</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">{tab === 'players' ? 'XP Status' : 'Revenue'}</th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Trend</th>
               </tr>
            </thead>
            <tbody>
               {loading ? (
                 [1,2,3,4,5].map(i => (
                   <tr key={i} className="border-b border-white/5 animate-pulse">
                      <td colSpan={4} className="h-20 bg-white/[0.02]" />
                   </tr>
                 ))
               ) : (
                 data.map((item, i) => (
                   <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                         <span className="text-lg font-black font-space text-zinc-500 group-hover:text-white transition-colors">#{i + 1}</span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`} alt="Avatar" />
                            </div>
                            <div>
                               <p className="text-sm font-black font-space text-white uppercase">{item.displayName || item.name || 'REDACTED'}</p>
                               <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tight">{item.role || 'ACTIVE_PILOT'}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                            <Zap size={14} className="text-primary" />
                            <span className="text-sm font-black font-space text-white">{tab === 'players' ? item.xp : (item.stats?.totalRevenue || 0).toLocaleString()}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="inline-flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
                            <TrendingUp size={12} />
                            +4.2%
                         </div>
                      </td>
                   </tr>
                 ))
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all uppercase tracking-widest text-[10px] font-black font-space",
        active 
          ? "bg-white text-black border-white shadow-xl shadow-white/5" 
          : "bg-white/5 text-zinc-500 border-white/5 hover:border-white/20 hover:text-white"
      )}
    >
       <Icon size={16} />
       {label}
    </button>
  );
}
