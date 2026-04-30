'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/components/providers/AuthProvider";
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ShieldCheck, 
  XCircle, 
  ArrowLeft, 
  Layers, 
  Package, 
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ProjectReviewDetail() {
  const { user } = useAuth();
  const router = useRouter();
  const { projectId } = useParams();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const fetchApp = async () => {
      const docSnap = await getDoc(doc(db, 'projectApplications', projectId as string));
      if (docSnap.exists()) {
        setApp(docSnap.data());
      }
      setLoading(false);
    };

    fetchApp();
  }, [user, projectId]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !notes) {
      return toast.error("Please provide a reason for rejection.");
    }

    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/projects/${action}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          projectId, 
          notes: action === 'approve' ? notes : undefined,
          reason: action === 'reject' ? notes : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Project ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      router.push('/admin/projects/review');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-secondary font-space font-bold animate-pulse">PREVIEWING_PROJECT...</div>;
  if (!app) return <div>Application not found.</div>;

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to Queue
      </button>

      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <h1 className="text-5xl font-black font-space text-white uppercase tracking-tighter">{app.projectName}</h1>
             <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
                Pending Review
             </div>
          </div>
          <p className="text-zinc-500 font-space text-sm max-w-2xl leading-relaxed">{app.description}</p>
        </div>

        <div className="flex gap-4">
           <button 
            disabled={submitting}
            onClick={() => handleAction('reject')}
            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-red-500 font-black font-space text-xs tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
           >
              <XCircle size={18} /> Reject
           </button>
           <button 
            disabled={submitting}
            onClick={() => handleAction('approve')}
            className="px-8 py-4 rounded-2xl bg-secondary text-black font-black font-space text-xs tracking-widest uppercase shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:scale-105 transition-all flex items-center gap-2"
           >
              <ShieldCheck size={18} /> Approve Project
           </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-10">
        <div className="col-span-2 space-y-10">
           {/* Card Preview Section */}
           <section className="space-y-6">
              <h2 className="text-xl font-black font-space text-white uppercase tracking-wider flex items-center gap-3">
                 <Layers size={20} className="text-primary" /> Sample Cards
              </h2>
              <div className="grid grid-cols-4 gap-4">
                 {app.sampleCards?.map((card: any, i: number) => (
                    <div key={i} className="glass-card p-4 border-white/5 bg-white/[0.02]">
                       <div className="aspect-[3/4] bg-zinc-900 rounded-lg mb-3 flex items-center justify-center text-zinc-800">
                          <Layers size={32} />
                       </div>
                       <p className="text-[10px] font-black text-white uppercase truncate">{card.name}</p>
                       <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{card.rarity}</p>
                    </div>
                 ))}
              </div>
           </section>

           {/* Pack Preview Section */}
           <section className="space-y-6">
              <h2 className="text-xl font-black font-space text-white uppercase tracking-wider flex items-center gap-3">
                 <Package size={20} className="text-secondary" /> Economy Structure
              </h2>
              <div className="grid grid-cols-2 gap-4">
                 {app.packSummary?.map((pack: any, i: number) => (
                    <div key={i} className="glass-card p-6 border-white/5 flex justify-between items-center">
                       <div>
                          <p className="text-xs font-black text-white uppercase">{pack.name}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{pack.price} SOLG</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest mb-1">Rarity Odds</p>
                          <div className="flex gap-2">
                             {Object.entries(pack.odds).map(([rarity, val]: any) => (
                                <div key={rarity} className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-white/5">
                                   {rarity[0]}:{val}%
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
           <section className="glass-card p-8 border-white/5 space-y-6">
              <h3 className="text-xs font-black font-space text-white uppercase tracking-widest border-b border-white/5 pb-4">Internal Review</h3>
              
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Review Notes / Rejection Reason</label>
                 <textarea 
                  rows={6}
                  placeholder="Explain why this project is being approved or rejected..."
                  className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-space text-xs focus:outline-none focus:border-secondary transition-all resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                 />
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 space-y-2">
                 <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Compliance Check</span>
                 </div>
                 <p className="text-[10px] text-zinc-500 uppercase leading-relaxed">
                    Verify that artwork does not violate copyright and economy parameters are sustainable.
                 </p>
              </div>
           </section>

           <section className="glass-card p-8 border-white/5 space-y-4">
              <h3 className="text-xs font-black font-space text-white uppercase tracking-widest">Project Metadata</h3>
              <div className="space-y-3">
                 <MetaItem label="Category" value={app.category} />
                 <MetaItem label="Audience" value={app.targetAudience} />
                 <MetaItem label="Website" value={app.website || 'N/A'} isLink />
                 <MetaItem label="Twitter" value={app.twitter || 'N/A'} isLink />
              </div>
           </section>
        </aside>
      </div>
    </div>
  );
}

function MetaItem({ label, value, isLink }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.02]">
       <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</span>
       <span className={cn(
         "text-xs font-bold font-space",
         isLink && value !== 'N/A' ? "text-primary underline cursor-pointer" : "text-white"
       )}>{value}</span>
    </div>
  );
}
