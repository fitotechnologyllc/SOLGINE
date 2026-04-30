'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Shield, Zap, ShoppingCart, Package, AlertTriangle, TrendingUp, DollarSign, Activity, Lock, Unlock, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function AdminEconomyPage() {
  const [treasury, setTreasury] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to Treasury
    const unsubTreasury = onSnapshot(doc(db, 'treasury', 'main'), (snap) => {
      if (snap.exists()) setTreasury(snap.data());
    });

    // 2. Listen to System Status
    const unsubStatus = onSnapshot(doc(db, 'systemStatus', 'global'), (snap) => {
      if (snap.exists()) setSystemStatus(snap.data());
    });

    // 3. Fetch recent flags
    const q = query(collection(db, 'marketFlags'), orderBy('timestamp', 'desc'), limit(10));
    const unsubFlags = onSnapshot(q, (snap) => {
      setFlags(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubTreasury();
      unsubStatus();
      unsubFlags();
    };
  }, []);

  const toggleSwitch = async (field: string, currentVal: boolean) => {
    try {
      const ref = doc(db, 'systemStatus', 'global');
      await updateDoc(ref, { [field]: !currentVal, updatedAt: new Date() });
      toast.success(`${field} updated successfully`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="p-10 text-white font-space">Accessing Economy Core...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
             <Shield size={24} />
          </div>
          <div>
             <h1 className="text-3xl font-black font-space text-white uppercase tracking-tighter">ECONOMY_CONTROL_V1</h1>
             <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mt-1">Authorized Access Only • System Hardened</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">System Health</p>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-sm font-black text-white uppercase font-space">Stable</span>
              </div>
           </div>
        </div>
      </header>

      {/* 1. TREASURY OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <AdminStatCard 
           icon={DollarSign} 
           label="Treasury Balance" 
           value={`${Math.round(treasury?.totalBalance || 0)} SOLG`} 
           color="text-secondary"
         />
         <AdminStatCard 
           icon={Zap} 
           label="Fees Collected" 
           value={`${Math.round(treasury?.feesCollected || 0)} SOLG`} 
           color="text-primary"
         />
         <AdminStatCard 
           icon={Activity} 
           label="Total Volume" 
           value="12.4K SOLG" 
           color="text-blue-400"
         />
      </div>

      {/* 2. KILL SWITCHES (CRITICAL) */}
      <div className="glass-card p-8 space-y-6 border-red-500/10">
         <h3 className="text-lg font-black font-space text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            EMERGENCY_KILL_SWITCHES
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusToggle 
              label="Marketplace Trading" 
              status={!systemStatus?.tradingPaused} 
              onToggle={() => toggleSwitch('tradingPaused', !!systemStatus?.tradingPaused)}
              activeText="ACTIVE"
              pausedText="PAUSED"
            />
            <StatusToggle 
              label="Pack Opening" 
              status={!!systemStatus?.packsEnabled} 
              onToggle={() => toggleSwitch('packsEnabled', !!systemStatus?.packsEnabled)}
              activeText="ENABLED"
              pausedText="DISABLED"
            />
            <StatusToggle 
              label="Asset Minting" 
              status={!!systemStatus?.mintingEnabled} 
              onToggle={() => toggleSwitch('mintingEnabled', !!systemStatus?.mintingEnabled)}
              activeText="ENABLED"
              pausedText="DISABLED"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* 3. SUSPICIOUS ACTIVITY LOG */}
         <div className="glass-card p-8 space-y-6">
            <h3 className="text-lg font-black font-space text-white flex items-center gap-2 uppercase tracking-tight">
               <AlertTriangle size={18} className="text-amber-500" />
               Security Flags
            </h3>
            
            <div className="space-y-4">
               {flags.length === 0 ? (
                 <p className="text-zinc-500 text-sm italic">No security flags detected in the last 24h.</p>
               ) : (
                 flags.map((flag) => (
                   <div key={flag.id} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                         <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase">
                               {flag.flags[0]}
                            </span>
                            <span className="text-white font-mono text-[10px]">{flag.id.substring(0, 8)}</span>
                         </div>
                         <span className="text-[9px] text-zinc-500">{new Date(flag.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <div className="text-[10px] text-zinc-400">
                            <span className="text-white">{flag.buyerId.substring(0, 6)}</span> bought from <span className="text-white">{flag.sellerId.substring(0, 6)}</span>
                         </div>
                         <div className="text-xs font-black text-white">{flag.price} SOLG</div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         {/* 4. PERFORMANCE METRICS */}
         <div className="glass-card p-8 space-y-6">
            <h3 className="text-lg font-black font-space text-white flex items-center gap-2 uppercase tracking-tight">
               <BarChart2 size={18} className="text-primary" />
               Economy Health
            </h3>
            
            <div className="space-y-6">
               <HealthMeter label="Market Liquidity" value={88} color="bg-secondary" />
               <HealthMeter label="Treasury Solvency" value={95} color="bg-blue-500" />
               <HealthMeter label="Asset Velocity" value={42} color="bg-primary" />
            </div>

            <div className="pt-6 border-t border-white/5">
               <button className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black font-space text-xs tracking-widest uppercase hover:bg-white/10 transition-all">
                  Generate Full Report
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

function AdminStatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="glass-card p-6 space-y-2 border-white/5">
       <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <Icon size={14} className={color} />
          {label}
       </div>
       <div className={cn("text-3xl font-black font-space", color)}>{value}</div>
    </div>
  );
}

function StatusToggle({ label, status, onToggle, activeText, pausedText }: any) {
  return (
    <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-4">
       <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
          <div className="flex items-center gap-2">
             {status ? <Unlock size={14} className="text-secondary" /> : <Lock size={14} className="text-red-500" />}
             <span className={cn("text-sm font-black font-space uppercase", status ? "text-secondary" : "text-red-500")}>
                {status ? activeText : pausedText}
             </span>
          </div>
       </div>
       <button 
         onClick={onToggle}
         className={cn(
           "w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
           status ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-secondary/10 text-secondary hover:bg-secondary/20"
         )}
       >
         {status ? "DEACTIVATE" : "ACTIVATE"}
       </button>
    </div>
  );
}

function HealthMeter({ label, value, color }: any) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-zinc-500">{label}</span>
          <span className="text-white">{value}%</span>
       </div>
       <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
          <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
       </div>
    </div>
  );
}
