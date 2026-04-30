'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/providers/AuthProvider';
import { useProject } from '@/components/providers/ProjectProvider';
import { ChevronDown, Plus, LayoutGrid, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function ProjectSelector() {
  const { user } = useAuth();
  const { activeProject, setProjectId } = useProject();
  const [projects, setProjects] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchMyProjects = async () => {
      // Fetch core project + projects owned by user
      const q = query(collection(db, 'projects'), where('ownerUid', '==', user.uid));
      const qCore = query(collection(db, 'projects'), where('projectId', '==', 'solgine-core'));
      
      const [snap, snapCore] = await Promise.all([getDocs(q), getDocs(qCore)]);
      
      const allProjects = [
        ...snapCore.docs.map(d => ({ id: d.id, ...d.data() })),
        ...snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.id !== 'solgine-core')
      ];
      
      setProjects(allProjects);
    };
    fetchMyProjects();
  }, [user]);

  return (
    <div className="relative mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
            {activeProject?.name?.[0] || 'S'}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Project</p>
            <p className="text-xs font-bold text-white uppercase truncate max-w-[120px]">{activeProject?.name || 'SOLGINE Core'}</p>
          </div>
        </div>
        <ChevronDown size={14} className={cn("text-zinc-500 group-hover:text-white transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 w-full mt-2 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
             {projects.map((p) => (
               <button
                 key={p.id}
                 onClick={() => {
                   setProjectId(p.id);
                   setIsOpen(false);
                 }}
                 className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
               >
                 <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black text-zinc-400 group-hover:text-primary">
                       {p.name[0]}
                    </div>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase tracking-tight">{p.name}</span>
                 </div>
                 {activeProject?.projectId === p.id && <Check size={14} className="text-primary" />}
               </button>
             ))}
             
             <div className="h-px bg-white/5 my-2" />
             
             <Link 
               href="/studio/create-project"
               onClick={() => setIsOpen(false)}
               className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors group text-primary"
             >
                <Plus size={14} />
                <span className="text-xs font-black uppercase tracking-widest">Launch Project</span>
             </Link>
          </div>
        </>
      )}
    </div>
  );
}
