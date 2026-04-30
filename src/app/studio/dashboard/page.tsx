'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { 
  Users, 
  Layers, 
  PackageSearch, 
  TrendingUp, 
  Plus, 
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Rocket,
  Settings,
  ChevronRight
} from "lucide-react";
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import LaunchApplicationForm from '@/components/studio/LaunchApplicationForm';
import { useRouter } from 'next/navigation';

export default function StudioDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLaunchForm, setShowLaunchForm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'projects'), where('ownerUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGoLive = async (projectId: string) => {
    try {
      const res = await fetch('/api/projects/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if (!res.ok) throw new Error('Failed to go live');
      toast.success("Congratulations! Your project is now LIVE.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-primary font-space font-bold animate-pulse">SYNCING_PROJECTS...</div>;

  return (
    <div className="p-10 space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-primary font-space font-bold tracking-[0.3em] uppercase text-xs mb-2">Creator Hub</p>
          <h1 className="text-4xl font-black font-space text-white">Project Overview</h1>
        </div>
        <button 
          onClick={() => router.push('/studio/create-project')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-gradient text-white font-bold font-space shadow-lg hover:scale-105 transition-all"
        >
          <Plus size={20} />
          CREATE NEW PROJECT
        </button>
      </header>

      {/* Analytics Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard label="Total Trades" value="0" change="0%" icon={Users} color="purple" />
        <AnalyticsCard label="Cards Created" value="0" icon={Layers} color="teal" />
        <AnalyticsCard label="Packs Sold" value="0" icon={PackageSearch} color="blue" />
        <AnalyticsCard label="Revenue (SOLG)" value="0" icon={TrendingUp} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Projects */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-black font-space text-white uppercase tracking-wider">Your Ecosystems</h2>
          </div>
          
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="p-12 rounded-3xl border border-white/5 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                 <Rocket size={48} className="text-zinc-800" />
                 <p className="text-zinc-500 font-space uppercase tracking-widest text-xs">You haven't created any projects yet.</p>
                 <button onClick={() => router.push('/studio/create-project')} className="text-primary font-bold text-xs underline">Start Building</button>
              </div>
            ) : projects.map(project => (
              <div key={project.id} className="glass-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/10 transition-all">
                <div className="flex items-start gap-5">
                   <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 shrink-0">
                      <Layers size={32} />
                   </div>
                   <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black font-space text-white uppercase tracking-tighter">{project.name}</h3>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="text-xs text-zinc-500 font-space line-clamp-1">{project.description}</p>
                      <div className="flex gap-4 pt-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ID: <span className="text-white">{project.id}</span></p>
                        {project.verifiedBadge && (
                          <div className="flex items-center gap-1 text-secondary text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck size={12} /> Verified
                          </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {project.status === 'draft' && (
                    <button 
                      onClick={() => setShowLaunchForm(project.id)}
                      className="px-6 py-2.5 rounded-xl bg-primary text-black font-black font-space text-[10px] tracking-widest uppercase shadow-lg hover:scale-105 transition-all"
                    >
                      Submit for Launch
                    </button>
                  )}
                  {project.status === 'approved' && (
                    <button 
                      onClick={() => handleGoLive(project.id)}
                      className="px-6 py-2.5 rounded-xl bg-secondary text-black font-black font-space text-[10px] tracking-widest uppercase shadow-lg hover:scale-105 transition-all"
                    >
                      Go Live
                    </button>
                  )}
                  {project.status === 'rejected' && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 max-w-xs">
                      <p className="text-[9px] text-red-400 uppercase tracking-widest font-black flex items-center gap-1 mb-1">
                        <AlertTriangle size={10} /> Rejection Reason
                      </p>
                      <p className="text-[10px] text-zinc-400 line-clamp-2">{project.rejectionReason}</p>
                      <button onClick={() => setShowLaunchForm(project.id)} className="mt-2 text-[9px] text-white font-bold underline">RESUBMIT</button>
                    </div>
                  )}
                  <button 
                    onClick={() => router.push(`/studio/dashboard?projectId=${project.id}`)}
                    className="p-3 rounded-xl bg-white/5 text-zinc-500 hover:text-white transition-all"
                  >
                    <Settings size={18} />
                  </button>
                </div>

                {showLaunchForm === project.id && (
                  <LaunchApplicationForm 
                    projectId={project.id}
                    projectName={project.name}
                    onSuccess={() => setShowLaunchForm(null)}
                    onCancel={() => setShowLaunchForm(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* AI Insights */}
        <section className="space-y-6">
           <h2 className="text-xl font-black font-space text-white uppercase tracking-wider">AI Strategy</h2>
           <div className="glass-card p-6 border-primary/20 bg-primary/5">
             <p className="text-sm text-zinc-300 leading-relaxed font-space">
               {projects.length > 0 
                ? "Your ecosystem structure is solid. Ensure you have at least 10 unique cards across all rarities before submitting for SOLGINE review." 
                : "Welcome Creator. Start by creating a project to access the SOLGINE infrastructure tools and launch your own TCG."}
             </p>
             <button className="mt-4 flex items-center gap-2 text-primary text-[10px] font-black font-space hover:underline uppercase tracking-widest">
               OPEN AI STRATEGIST <ChevronRight size={12} />
             </button>
           </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    draft: "bg-zinc-800 text-zinc-400 border-zinc-700",
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    approved: "bg-secondary/10 text-secondary border-secondary/20",
    live: "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(20,241,149,0.2)]",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    suspended: "bg-red-900/20 text-red-600 border-red-900/30",
  };

  return (
    <div className={cn(
      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
      styles[status] || styles.draft
    )}>
      {status}
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
        {change && (
          <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
            {change} <ArrowUpRight size={10} />
          </span>
        )}
      </div>
      <h3 className="text-3xl font-black font-space text-white">{value}</h3>
      <p className="text-[10px] text-zinc-500 font-bold font-space uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}
