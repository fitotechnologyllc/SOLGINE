'use client';

import { useAuth } from "@/components/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { User, Shield, Zap, Wallet, LogOut, Settings, Bell, ExternalLink, BarChart2, ShoppingCart } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCurrentLevelProgress } from "@/lib/rewards";
import { Trophy, Swords, Activity, Target } from "lucide-react";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { connected, publicKey } = useWallet();
  const [userData, setUserData] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setPlayerStats(data.stats || {});
        }
      });
    }
  }, [user]);

  const progress = userData ? getCurrentLevelProgress(userData.xp || 0) : null;

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto space-y-10 pt-10">
       <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 animate-pulse" />
          <div className="w-48 h-8 bg-white/5 animate-pulse rounded-lg" />
          <div className="w-32 h-4 bg-white/5 animate-pulse rounded-lg" />
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
       </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10 pt-10">
      <header className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
           <div className="w-24 h-24 rounded-[2.5rem] bg-primary-gradient p-1 neon-glow-purple group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[2.3rem] bg-background overflow-hidden">
                 <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
           </div>
           <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-black border-4 border-background">
              <Zap size={14} fill="currentColor" />
           </div>
        </div>
        
        <div>
           <h1 className="text-3xl font-black font-space text-white">{user.displayName || 'PILOT_REDACTED'}</h1>
           <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">{user.uid.substring(0, 12)}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Account Info */}
         <div className="glass-card p-8 space-y-6">
            <h3 className="text-lg font-black font-space text-white flex items-center gap-2">
               <User size={18} className="text-primary" />
               ACCOUNT DATA
            </h3>
            
            <div className="space-y-4">
               <InfoRow label="Email Address" value={user.email || 'No email set'} />
               <InfoRow label="Member Since" value={new Date(user.createdAt?.seconds * 1000).toLocaleDateString()} />
               <InfoRow label="Protocol Role" value={user.role.toUpperCase()} />
            </div>

            <div className="pt-6 border-t border-white/5">
               <button 
                 onClick={() => signOut(auth)}
                 className="w-full py-4 rounded-xl border border-red-500/20 text-red-500 font-black font-space text-sm hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
               >
                 <LogOut size={16} />
                 TERMINATE SESSION
               </button>
            </div>
         </div>

         {/* Wallet Info */}
         <div className="glass-card p-8 space-y-6 border-secondary/10">
            <h3 className="text-lg font-black font-space text-white flex items-center gap-2">
               <Wallet size={18} className="text-secondary" />
               SOLANA CORE
            </h3>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connection Status</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                    connected ? "bg-secondary/10 text-secondary" : "bg-red-400/10 text-red-400"
                  )}>
                    {connected ? 'Active' : 'Offline'}
                  </span>
               </div>
               
               {connected && publicKey ? (
                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Public Key</p>
                    <div className="flex items-center gap-2 text-white font-mono text-xs break-all bg-white/5 p-2 rounded-lg">
                       {publicKey.toString()}
                    </div>
                 </div>
               ) : (
                 <p className="text-xs text-zinc-500 leading-relaxed italic">
                   Connect your Solana wallet to enable on-chain asset verification and marketplace operations.
                 </p>
               )}
            </div>

            <div className="flex justify-center wallet-btn-container-profile">
               <WalletMultiButton />
            </div>
         </div>
      </div>

      {/* Battle Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-8 space-y-8 overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <Swords size={120} />
           </div>

           <div className="flex justify-between items-center relative z-10">
              <h3 className="text-xl font-black font-space text-white flex items-center gap-2">
                 <Activity size={20} className="text-primary" />
                 COMBAT_RECORD
              </h3>
              {progress && (
                <div className="px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black font-space uppercase tracking-widest">
                   Level {progress.level}
                </div>
              )}
           </div>

           <div className="grid grid-cols-2 gap-6 relative z-10">
              <StatBox icon={Swords} label="Battles Played" value={userData?.battlesPlayed || 0} />
              <StatBox icon={Trophy} label="Battles Won" value={userData?.battlesWon || 0} color="text-secondary" />
              <StatBox icon={Target} label="Win Rate" value={userData?.battlesPlayed ? `${Math.round((userData.battlesWon / userData.battlesPlayed) * 100)}%` : '0%'} color="text-blue-400" />
              <StatBox icon={Zap} label="Win Streak" value={userData?.winStreak || 0} color="text-amber-400" />
           </div>

           {progress && (
             <div className="space-y-3 pt-4 border-t border-white/5 relative z-10">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                   <span className="text-zinc-500">Experience Points</span>
                   <span className="text-white">{progress.currentXp} / {progress.neededXp} XP</span>
                </div>
                <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                   <div 
                     className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(153,69,255,0.4)]" 
                     style={{ width: `${progress.percentage}%` }}
                   />
                </div>
             </div>
           )}
        </div>

        {/* 5. PLAYER ECONOMY SIGNALS */}
        <div className="glass-card p-8 space-y-8 overflow-hidden relative border-secondary/10">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <BarChart2 size={120} className="text-secondary" />
           </div>

           <div className="flex justify-between items-center relative z-10">
              <h3 className="text-xl font-black font-space text-white flex items-center gap-2">
                 <ShoppingCart size={20} className="text-secondary" />
                 TRADING_INDEX
              </h3>
              <div className="px-4 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs font-black font-space uppercase tracking-widest">
                 Market Performance
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6 relative z-10">
              <StatBox icon={ShoppingCart} label="Total Trades" value={playerStats?.totalTrades || 0} />
              <StatBox 
                icon={Zap} 
                label="Profit / Loss" 
                value={(playerStats?.totalRevenue || 0) - (playerStats?.totalSpend || 0)} 
                color={(playerStats?.totalRevenue || 0) >= (playerStats?.totalSpend || 0) ? "text-secondary" : "text-red-400"} 
              />
              <StatBox 
                icon={Target} 
                label="Avg Buy Price" 
                value={playerStats?.totalTrades ? Math.round((playerStats.totalSpend || 0) / playerStats.totalTrades) : 0} 
                color="text-zinc-400" 
              />
              <StatBox 
                icon={Target} 
                label="Avg Sell Price" 
                value={playerStats?.totalTrades ? Math.round((playerStats.totalRevenue || 0) / playerStats.totalTrades) : 0} 
                color="text-zinc-400" 
              />
           </div>

           <div className="pt-4 border-t border-white/5 relative z-10">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                       <BarChart2 size={18} />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Market Efficiency</p>
                       <p className="text-xs text-white font-black font-space mt-1 uppercase">Top 12% of Traders</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-sm font-black text-secondary font-space">+18.4%</p>
                    <p className="text-[8px] text-zinc-500 uppercase font-black">Monthly ROI</p>
                 </div>
              </div>
           </div>
        </div>
      </div>


      {/* INVITE & EARN SECTION */}
      <div className="glass-card p-10 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
         <div className="relative z-10 space-y-8">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-primary font-black font-space text-[10px] uppercase tracking-[0.3em] mb-2">Growth Engine</p>
                  <h3 className="text-3xl font-black font-space text-white uppercase tracking-tighter">INVITE_&_EARN</h3>
                  <p className="text-zinc-500 text-sm mt-2 max-w-md">Recruit new pilots to the SOLGINE protocol. You earn 2 Starter Packs for every referral, and they get 1 free pack to start their journey.</p>
               </div>
               <div className="bg-primary/20 p-4 rounded-2xl border border-primary/30">
                  <Trophy className="text-primary" size={32} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Your Referral Link</p>
                  <div className="flex gap-2">
                     <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs truncate flex items-center">
                        {typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${userData?.referralCode || user.uid.substring(0, 8)}` : '...'}
                     </div>
                     <button 
                       onClick={() => {
                         const link = `${window.location.origin}/signup?ref=${userData?.referralCode || user.uid.substring(0, 8)}`;
                         navigator.clipboard.writeText(link);
                         toast.success('Link copied to clipboard!');
                       }}
                       className="p-3 rounded-xl bg-white text-black hover:bg-primary transition-colors"
                     >
                        <ExternalLink size={20} />
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                     <p className="text-2xl font-black font-space text-white">{userData?.referralCount || 0}</p>
                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Total Referrals</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                     <p className="text-2xl font-black font-space text-secondary">{userData?.referralRewardsEarned || 0}</p>
                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Packs Earned</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="glass-card p-8">
         <h3 className="text-lg font-black font-space text-white mb-6 uppercase tracking-wider">Interface Settings</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SettingBtn icon={Bell} label="Alerts" />
            <SettingBtn icon={Shield} label="Security" />
            <SettingBtn icon={Settings} label="Engine" />
            <SettingBtn icon={ExternalLink} label="Docs" />
         </div>
      </div>

      <style jsx global>{`
        .wallet-btn-container-profile .wallet-adapter-button {
          width: 100% !important;
          height: 52px !important;
          background: #14f195 !important;
          color: #000 !important;
          border-radius: 12px !important;
          font-family: var(--font-space-grotesk) !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          justify-content: center !important;
        }
      `}</style>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color = "text-white" }: any) {
  return (
    <div className="space-y-1">
       <div className="flex items-center gap-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
          <Icon size={12} />
          {label}
       </div>
       <div className={cn("text-2xl font-black font-space", color)}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center text-sm">
       <span className="text-zinc-500 font-medium">{label}</span>
       <span className="text-white font-bold font-space">{value}</span>
    </div>
  );
}

function SettingBtn({ icon: Icon, label }: any) {
  return (
    <button className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all group">
       <Icon size={24} className="text-zinc-500 group-hover:text-primary transition-colors" />
       <span className="text-[10px] font-black font-space text-zinc-500 group-hover:text-white uppercase tracking-widest">{label}</span>
    </button>
  );
}
