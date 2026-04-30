'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  ClipboardList, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  User as UserIcon,
  Calendar,
  Layers,
  Package
} from "lucide-react";
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminProjectReviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      if (!loading) router.push('/');
      return;
    }

    const q = query(collection(db, 'projectApplications'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading, router]);

  if (loading) return <div className="h-screen flex items-center justify-center text-secondary font-space font-bold animate-pulse">LOADING_APPLICATIONS...</div>;

  return (
    <div className="p-10 space-y-10">
      <header>
        <div className="flex items-center gap-3 text-secondary mb-2">
          <ClipboardList size={20} />
          <p className="font-space font-bold tracking-[0.3em] uppercase text-xs">Admin Panel</p>
        </div>
        <h1 className="text-4xl font-black font-space text-white uppercase">Project Review Queue</h1>
      </header>

      <div className="glass-card border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">Creator</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Assets</th>
              <th className="px-6 py-4">Submitted</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {applications.map(app => (
              <tr key={app.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-600">
                         <Layers size={20} />
                      </div>
                      <div>
                         <p className="text-sm font-black text-white font-space uppercase">{app.projectName}</p>
                         <p className="text-[10px] text-zinc-500 font-mono">{app.projectId}</p>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-6">
                   <div className="flex items-center gap-2">
                      <UserIcon size={14} className="text-zinc-600" />
                      <p className="text-xs text-zinc-300 font-medium">{app.ownerUid.slice(0, 8)}...</p>
                   </div>
                </td>
                <td className="px-6 py-6">
                   <StatusBadge status={app.status} />
                </td>
                <td className="px-6 py-6">
                   <div className="flex gap-3 text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
                      <span className="flex items-center gap-1"><Layers size={10} /> {app.cardCount}</span>
                      <span className="flex items-center gap-1"><Package size={10} /> {app.packCount}</span>
                   </div>
                </td>
                <td className="px-6 py-6 text-xs text-zinc-500 font-space">
                   {app.submittedAt?.toDate().toLocaleDateString()}
                </td>
                <td className="px-6 py-6 text-right">
                   <button 
                    onClick={() => router.push(`/admin/projects/review/${app.projectId}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-black transition-all"
                   >
                      Review <ChevronRight size={14} />
                   </button>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center space-y-4">
                   <CheckCircle2 size={40} className="mx-auto text-zinc-800" />
                   <p className="text-zinc-500 font-space uppercase tracking-widest text-xs">Review queue is empty. All projects processed.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    approved: "bg-secondary/10 text-secondary border-secondary/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className={cn(
      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block",
      styles[status] || styles.pending
    )}>
      {status}
    </div>
  );
}
