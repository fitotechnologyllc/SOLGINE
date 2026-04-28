'use client';

import { useAuth } from "@/components/providers/AuthProvider";
import { 
  Users, 
  Layers, 
  PackageSearch, 
  TrendingUp, 
  Plus, 
  ArrowUpRight,
  ExternalLink
} from "lucide-react";

export default function StudioDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-10 space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-primary font-space font-bold tracking-[0.3em] uppercase text-xs mb-2">Creator Hub</p>
          <h1 className="text-4xl font-black font-space text-white">Project Overview</h1>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-gradient text-white font-bold font-space shadow-lg hover:scale-105 transition-all">
          <Plus size={20} />
          CREATE NEW ASSET
        </button>
      </header>

      {/* Analytics Highlights */}
      <div className="grid grid-cols-4 gap-6">
        <AnalyticsCard label="Active Players" value="1,284" change="+12%" icon={Users} color="purple" />
        <AnalyticsCard label="Cards Created" value="48" change="+3" icon={Layers} color="teal" />
        <AnalyticsCard label="Packs Sold" value="3,490" change="+156" icon={PackageSearch} color="blue" />
        <AnalyticsCard label="Revenue (SOL)" value="82.4" change="+4.2" icon={TrendingUp} color="green" />
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Recent Projects */}
        <section className="col-span-2 space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-black font-space text-white uppercase tracking-wider">Live Projects</h2>
             <button className="text-zinc-500 text-sm hover:text-white transition-colors">View All</button>
          </div>
          
          <div className="space-y-4">
            <ProjectRow name="CYBER PUNK 2088" status="Live" assets="12 Cards" revenue="45.2 SOL" />
            <ProjectRow name="FANTASY REALMS" status="Draft" assets="24 Cards" revenue="0.0 SOL" />
          </div>
        </section>

        {/* System Health / AI Insights */}
        <section className="space-y-6">
           <h2 className="text-xl font-black font-space text-white uppercase tracking-wider">AI Insights</h2>
           <div className="glass-card p-6 border-primary/20 bg-primary/5">
             <p className="text-sm text-zinc-300 leading-relaxed">
               "Based on recent player trends, your <span className="text-primary font-bold">Rare</span> cards are selling 40% faster than average. Consider increasing the rarity of your next drop to maintain economy stability."
             </p>
             <button className="mt-4 flex items-center gap-2 text-primary text-xs font-bold font-space hover:underline">
               OPEN AI STRATEGIST <ExternalLink size={12} />
             </button>
           </div>
        </section>
      </div>
    </div>
  );
}

function AnalyticsCard({ label, value, change, icon: Icon, color }: any) {
  const colorMap: any = {
    purple: "text-primary border-primary/20 bg-primary/5",
    teal: "text-secondary border-secondary/20 bg-secondary/5",
    blue: "text-tertiary border-tertiary/20 bg-tertiary/5",
    green: "text-green-400 border-green-400/20 bg-green-400/5",
  };

  return (
    <div className={`glass-card p-6 border-b-4 ${colorMap[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-black/40">
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
          {change} <ArrowUpRight size={10} />
        </span>
      </div>
      <h3 className="text-3xl font-black font-space text-white">{value}</h3>
      <p className="text-xs text-zinc-500 font-bold font-space uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function ProjectRow({ name, status, assets, revenue }: any) {
  return (
    <div className="glass-card p-6 flex items-center justify-between group hover:border-white/20 transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
          <Layers size={24} />
        </div>
        <div>
          <h4 className="font-black font-space text-white">{name}</h4>
          <p className="text-xs text-zinc-500 font-medium">{assets} • {status}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-black font-space">{revenue}</p>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Volume</p>
      </div>
    </div>
  );
}
