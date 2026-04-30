'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useProject } from '@/components/providers/ProjectProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { BarChart3, TrendingUp, Users, DollarSign, Package, ShoppingCart, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudioAnalyticsPage() {
  const { user } = useAuth();
  const { projectId, activeProject } = useProject();
  const [stats, setStats] = useState<any>(null);
  const [topCards, setTopCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      
      // 1. Fetch Project Stats
      const statsSnap = await getDoc(doc(db, 'projectStats', projectId));
      if (statsSnap.exists()) setStats(statsSnap.data());

      // 2. Fetch Top Cards (by value or sales)
      const qCards = query(
        collection(db, 'cardValueIndex'),
        where('projectId', '==', projectId),
        orderBy('totalSales', 'desc'),
        limit(5)
      );
      const cardsSnap = await getDocs(qCards);
      setTopCards(cardsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setLoading(false);
    };

    fetchAnalytics();
  }, [projectId]);

  if (loading) return (
    <div className="p-10 space-y-10 animate-pulse">
       <div className="h-20 w-1/3 bg-white/5 rounded-2xl" />
       <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
       </div>
       <div className="h-96 bg-white/5 rounded-3xl" />
    </div>
  );

  return (
    <div className="p-10 space-y-10">
      <header>
        <p className="text-primary font-space font-bold tracking-[0.3em] uppercase text-xs mb-2">Network Intelligence</p>
        <h1 className="text-4xl font-black font-space text-white uppercase tracking-tighter">PROJECT_ANALYTICS</h1>
        <p className="text-zinc-500 text-xs font-space uppercase tracking-widest mt-2">{activeProject?.name} Ecosystem Performance</p>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <MetricCard 
           label="Total Revenue" 
           value={`${stats?.totalRevenue || 0} SOLG`} 
           icon={DollarSign} 
           trend="+12.4%" 
           positive 
         />
         <MetricCard 
           label="Active Users" 
           value={stats?.activeUsers || 0} 
           icon={Users} 
           trend="+5.2%" 
           positive 
         />
         <MetricCard 
           label="Pack Sales" 
           value={stats?.packSalesCount || 0} 
           icon={Package} 
           trend="+8.1%" 
           positive 
         />
         <MetricCard 
           label="Market Volume" 
           value={`${stats?.marketVolume || 0} SOLG`} 
           icon={ShoppingCart} 
           trend="-2.4%" 
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Main Chart Area (Placeholder for actual chart lib) */}
         <div className="lg:col-span-2 glass-card p-8 min-h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black font-space text-white uppercase tracking-tight">Revenue_Growth</h3>
               <div className="flex gap-2">
                  {['7D', '30D', 'ALL'].map(t => (
                    <button key={t} className="px-3 py-1 rounded-lg bg-white/5 text-[10px] font-black text-zinc-500 hover:text-white transition-colors border border-white/5">{t}</button>
                  ))}
               </div>
            </div>
            
            <div className="flex-1 flex items-end gap-2 px-2">
               {[40, 60, 45, 80, 55, 90, 75, 100, 85, 110, 95, 130].map((h, i) => (
                 <div 
                   key={i} 
                   className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-lg group relative"
                   style={{ height: `${h}%` }}
                 >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black px-2 py-1 rounded text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                       {Math.round(h * 1.5)}K
                    </div>
                 </div>
               ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest px-2">
               <span>Apr 01</span>
               <span>Apr 15</span>
               <span>Apr 30</span>
            </div>
         </div>

         {/* Top Cards List */}
         <div className="glass-card p-8 space-y-6">
            <h3 className="text-xl font-black font-space text-white uppercase tracking-tight">TOP_PERFORMERS</h3>
            
            <div className="space-y-4">
               {topCards.map((card, i) => (
                 <div key={card.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-zinc-500">
                          {i + 1}
                       </div>
                       <div>
                          <p className="text-xs font-black text-white uppercase truncate max-w-[120px]">{card.cardName}</p>
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{card.rarity}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-primary">{card.totalSales || 0} Sales</p>
                       <p className="text-[9px] font-bold text-secondary uppercase">Floor: {card.floorPrice || 0}</p>
                    </div>
                 </div>
               ))}
               
               {topCards.length === 0 && (
                 <div className="text-center py-10">
                    <Layers size={32} className="mx-auto text-zinc-800 mb-2" />
                    <p className="text-xs text-zinc-600 font-bold uppercase">No data available yet</p>
                 </div>
               )}
            </div>

            <button className="w-full py-4 rounded-xl border border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
               View Full Catalog
            </button>
         </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, trend, positive }: any) {
  return (
    <div className="glass-card p-6 space-y-4 relative overflow-hidden group">
       <div className="flex justify-between items-start relative z-10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 group-hover:text-primary transition-colors">
             <Icon size={20} />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full",
            positive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
          )}>
             {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
             {trend}
          </div>
       </div>
       <div className="relative z-10">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black font-space text-white mt-1 uppercase">{value}</p>
       </div>
       <div className="absolute -bottom-4 -right-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
          <Icon size={120} />
       </div>
    </div>
  );
}
