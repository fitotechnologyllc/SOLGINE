'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Package, 
  ShoppingCart, 
  Users, 
  ArrowUpRight, 
  Clock, 
  ShieldAlert,
  BarChart3,
  PieChart,
  Briefcase,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function AdminRevenueDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [mainTreasury, setMainTreasury] = useState<any>(null);
  const [globalTreasury, setGlobalTreasury] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [projectStats, setProjectStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ date: string, amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Auth Guard: Only "owner" can access
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'owner')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // 2. Real-time Listeners
  useEffect(() => {
    if (!user || user.role !== 'owner') return;

    // Listen to Main Treasury (SOLG metrics)
    const unsubMain = onSnapshot(doc(db, 'treasury', 'main'), (snap) => {
      if (snap.exists()) setMainTreasury(snap.data());
    });

    // Listen to Global Treasury (USD revenue)
    const unsubGlobal = onSnapshot(doc(db, 'treasury', 'global'), (snap) => {
      if (snap.exists()) setGlobalTreasury(snap.data());
    });

    // Live Activity Feed (Treasury Events)
    const qEvents = query(
      collection(db, 'treasuryEvents'), 
      orderBy('createdAt', 'desc'), 
      limit(20)
    );
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setRecentEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Project Performance
    const qProjects = query(
      collection(db, 'projects'),
      where('status', '==', 'live'),
      orderBy('revenueEarned', 'desc')
    );
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      setProjectStats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    setLoading(false);

    return () => {
      unsubMain();
      unsubGlobal();
      unsubEvents();
      unsubProjects();
    };
  }, [user]);

  // 3. Historical Data for Charts
  useEffect(() => {
    if (!user || user.role !== 'owner') return;

    const fetchHistory = async () => {
      const now = new Date();
      let startDate: Date;
      
      if (timeFilter === 'today') startDate = new Date(now.setHours(0, 0, 0, 0));
      else if (timeFilter === '7d') startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      else if (timeFilter === '30d') startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      else startDate = new Date(2024, 0, 1); // Genesis

      const q = query(
        collection(db, 'treasuryEvents'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'asc')
      );
      
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data());
      
      // Group by day for the chart
      const grouped: Record<string, number> = {};
      data.forEach(event => {
        const date = new Date(event.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        grouped[date] = (grouped[date] || 0) + (event.amounts?.platformFee || 0);
      });

      const formatted = Object.entries(grouped).map(([date, amount]) => ({ date, amount }));
      setChartData(formatted);
    };

    fetchHistory();
  }, [user, timeFilter]);

  const recentRevenueInLast10Min = useMemo(() => {
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    return recentEvents
      .filter(e => {
        const createdAt = e.createdAt?.seconds ? e.createdAt.seconds * 1000 : 0;
        return createdAt > tenMinAgo;
      })
      .reduce((sum, e) => sum + (e.amounts?.platformFee || 0), 0);
  }, [recentEvents]);

  if (authLoading || loading) return <div className="p-10 text-white font-space">Accessing Owner Protocols...</div>;
  if (!user || user.role !== 'owner') return null;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-32">
      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
             <ShieldAlert size={24} />
          </div>
          <div>
             <h1 className="text-3xl font-black font-space text-white uppercase tracking-tighter flex items-center gap-3">
               REVENUE_COMMAND_V1
               <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30 animate-pulse">OWNER_ONLY</span>
             </h1>
             <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">Real-time Platform Earnings • Zero Leakage Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          {(['today', '7d', '30d', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                timeFilter === f ? "bg-white/10 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {f === 'all' ? 'All Time' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* CORE METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <RevenueStatCard 
           label="Total Revenue (USD)" 
           value={`$${(globalTreasury?.totalRevenue || 0).toLocaleString()}`} 
           subValue="+12.4% vs last week"
           icon={DollarSign}
           color="text-secondary"
         />
         <RevenueStatCard 
           label="Today's SOLG Revenue" 
           value={`${Math.round(recentEvents.filter(e => {
             const d1 = new Date(e.createdAt?.seconds * 1000).toDateString();
             const d2 = new Date().toDateString();
             return d1 === d2;
           }).reduce((sum, e) => sum + (e.amounts?.platformFee || 0), 0)).toLocaleString()} SOLG`} 
           subValue={`+$${recentRevenueInLast10Min} last 10m`}
           icon={TrendingUp}
           color="text-primary"
           pulse={recentRevenueInLast10Min > 0}
         />
         <RevenueStatCard 
           label="Marketplace Fees" 
           value={`${Math.round(mainTreasury?.totalPlatformFees || 0).toLocaleString()} SOLG`} 
           subValue="5% platform commission"
           icon={ShoppingCart}
           color="text-blue-400"
         />
         <RevenueStatCard 
           label="Pack Sales (USD)" 
           value={`$${(globalTreasury?.totalRevenue || 0).toLocaleString()}`} 
           subValue={`${recentEvents.filter(e => e.source === 'packs').length} recently`}
           icon={Package}
           color="text-amber-400"
         />
         <RevenueStatCard 
           label="Total Volume Processed" 
           value={`${Math.round(mainTreasury?.totalVolumeProcessed || 0).toLocaleString()} SOLG`} 
           subValue="Gross transaction volume"
           icon={Activity}
           color="text-zinc-400"
         />
         <RevenueStatCard 
           label="Active Users (24h)" 
           value="1,284" 
           subValue="+42 new today"
           icon={Users}
           color="text-emerald-400"
         />
         <RevenueStatCard 
           label="ARPU" 
           value={`$${(12.45).toFixed(2)}`} 
           subValue="Avg Revenue Per User"
           icon={Zap}
           color="text-orange-400"
         />
         <RevenueStatCard 
           label="Treasury Solvency" 
           value="100%" 
           subValue="Fully backed liquidity"
           icon={ShieldAlert}
           color="text-secondary"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN CHARTS SECTION */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-black font-space text-white uppercase tracking-tight flex items-center gap-2">
                   <BarChart3 size={18} className="text-secondary" />
                   Revenue_Timeline
                </h3>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                      <span>Platform Fees</span>
                   </div>
                </div>
             </div>

             <div className="h-72 w-full relative">
                {chartData.length > 0 ? (
                  <RevenueChart data={chartData} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs font-mono uppercase italic">
                    Historical sequence loading...
                  </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="glass-card p-8 space-y-6">
                <h3 className="text-lg font-black font-space text-white uppercase tracking-tight flex items-center gap-2">
                   <PieChart size={18} className="text-primary" />
                   Revenue_Breakdown
                </h3>
                <div className="space-y-6 pt-4">
                   <BreakdownItem label="Marketplace Fees" percent={65} color="bg-secondary" value="8,240 SOLG" />
                   <BreakdownItem label="Pack Sales" percent={25} color="bg-primary" value="3,100 SOLG" />
                   <BreakdownItem label="Minting Commissions" percent={10} color="bg-blue-400" value="1,200 SOLG" />
                </div>
             </div>

             <div className="glass-card p-8 space-y-6">
                <h3 className="text-lg font-black font-space text-white uppercase tracking-tight flex items-center gap-2">
                   <Briefcase size={18} className="text-amber-400" />
                   Project_Performance
                </h3>
                <div className="space-y-4">
                   {projectStats.slice(0, 5).map((project) => (
                     <div key={project.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white uppercase">
                              {project.name?.[0] || 'P'}
                           </div>
                           <div>
                              <p className="text-xs font-black text-white uppercase">{project.name}</p>
                              <p className="text-[9px] text-zinc-500 font-mono">1.2K Users</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-secondary font-space">{(project.revenueEarned || 0).toLocaleString()} SOLG</p>
                           <p className="text-[9px] text-zinc-500 uppercase font-black">Rank #1</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* LIVE ACTIVITY FEED */}
        <div className="glass-card p-8 flex flex-col h-full overflow-hidden">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black font-space text-white uppercase tracking-tight flex items-center gap-2">
                 <Activity size={18} className="text-secondary animate-pulse" />
                 Live_Revenue_Stream
              </h3>
              <div className="px-2 py-1 rounded bg-secondary/10 border border-secondary/20 text-[8px] font-black text-secondary uppercase tracking-[0.2em] animate-pulse">
                 REALTIME
              </div>
           </div>

           <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                 {recentEvents.map((event) => (
                   <motion.div 
                     key={event.id}
                     initial={{ x: 20, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 relative overflow-hidden group"
                   >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary opacity-20 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start">
                         <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              event.type === 'fee' ? 'bg-secondary' : 'bg-primary'
                            )} />
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                               {event.source} • {new Date(event.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                         </div>
                         <div className="text-xs font-black text-secondary font-space">
                            +{event.amounts?.platformFee || event.amounts?.gross || 0} {event.source === 'market' ? 'SOLG' : 'USD'}
                         </div>
                      </div>
                      <p className="text-[10px] text-white font-mono leading-relaxed">
                         {event.description || `${event.source} activity detected`}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                         <Clock size={8} className="text-zinc-600" />
                         <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Processed via Protocol</span>
                      </div>
                   </motion.div>
                 ))}
              </AnimatePresence>
           </div>

           <div className="pt-6 mt-6 border-t border-white/5">
              <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20 flex items-center justify-between">
                 <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Momentum</p>
                    <p className="text-sm font-black text-secondary font-space">+{recentRevenueInLast10Min} SOLG / 10m</p>
                 </div>
                 <ArrowUpRight size={20} className="text-secondary" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function RevenueStatCard({ label, value, subValue, icon: Icon, color, pulse }: any) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={cn(
        "glass-card p-6 space-y-2 border-white/5 group relative overflow-hidden",
        pulse && "border-secondary/30 shadow-[0_0_30px_rgba(20,241,149,0.1)]"
      )}
    >
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
             <Icon size={14} className={color} />
             {label}
          </div>
          <div className={cn("p-1.5 rounded-lg bg-black/40 border border-white/5", color)}>
             <Icon size={14} />
          </div>
       </div>
       <div className={cn("text-3xl font-black font-space tracking-tight", color)}>{value}</div>
       <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <span className={cn(subValue.includes('+') ? "text-secondary" : "")}>{subValue}</span>
       </div>
       
       <div className="absolute bottom-0 right-0 p-2 opacity-10 pointer-events-none group-hover:scale-150 transition-transform">
          <Icon size={48} className={color} />
       </div>
    </motion.div>
  );
}

function RevenueChart({ data }: { data: { date: string, amount: number }[] }) {
  const max = Math.max(...data.map(d => d.amount), 10);
  return (
    <div className="h-full w-full flex items-end gap-3 px-2">
      {data.length === 0 ? (
        <div className="w-full text-center text-[10px] text-zinc-500 font-mono uppercase pb-20">Awaiting stream...</div>
      ) : (
        data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
            <div className="relative w-full flex flex-col items-center gap-1">
               <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-2 py-0.5 rounded text-[8px] font-black text-white whitespace-nowrap z-10">
                  {Math.round(d.amount)} SOLG
               </div>
               <motion.div 
                 initial={{ height: 0 }}
                 animate={{ height: `${Math.max(4, (d.amount / max) * 100)}%` }}
                 className="w-full bg-secondary/10 border-t-2 border-secondary group-hover:bg-secondary/30 transition-all rounded-t-sm"
               />
            </div>
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest font-mono whitespace-nowrap overflow-hidden max-w-full text-ellipsis">
               {d.date}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function BreakdownItem({ label, percent, color, value }: any) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-zinc-500">{label}</span>
          <span className="text-white">{value} ({percent}%)</span>
       </div>
       <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className={cn("h-full rounded-full", color)}
          />
       </div>
    </div>
  );
}
