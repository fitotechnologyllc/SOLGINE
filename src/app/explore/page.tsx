'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Rocket, Users, Zap, Search, Globe, ChevronRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ExplorePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      const q = query(
        collection(db, 'projects'), 
        where('status', '==', 'live'),
        where('publicVisibility', '==', true),
        limit(20)
      );
      const snap = await getDocs(q);
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchProjects();
  }, []);

  const filtered = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-[1400px] mx-auto px-8 py-20 space-y-16">
        
        {/* Header */}
        <header className="space-y-6 text-center max-w-2xl mx-auto">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-[0.2em]">
              <Globe size={14} />
              Protocol Explorer
           </div>
           <h1 className="text-6xl md:text-8xl font-black font-space tracking-tighter uppercase leading-none italic">
              DISCOVER <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">ECOSYSTEMS</span>
           </h1>
           <p className="text-zinc-500 font-space uppercase text-sm tracking-widest">
              The multiversal hub for digital card economies
           </p>
        </header>

        {/* Search & Filter */}
        <div className="relative max-w-xl mx-auto group">
           <input 
             type="text" 
             placeholder="SEARCH PROJECTS, THEMES, OR CREATORS..."
             className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-sm font-space uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all pl-16"
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
           <Search size={20} className="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3].map(i => <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filtered.map((project) => (
               <Link 
                 key={project.id} 
                 href={`/dashboard?projectId=${project.id}`}
                 className="group relative glass-card p-1 overflow-hidden transition-all hover:scale-[1.02] hover:-translate-y-1"
               >
                 <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                       <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-3xl font-black font-space shadow-xl">
                          {project.name[0]}
                       </div>
                       <div className="flex flex-col items-end gap-2">
                          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(20,241,149,0.1)]">
                             LIVE
                          </div>
                          {project.verifiedBadge && (
                            <div className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                              <Zap size={10} fill="currentColor" /> Verified
                            </div>
                          )}
                       </div>
                    </div>

                    <div>
                       <h3 className="text-2xl font-black font-space text-white uppercase group-hover:text-primary transition-colors">{project.name}</h3>
                       <p className="text-zinc-500 text-xs font-space uppercase tracking-tight mt-2 line-clamp-2 leading-relaxed">
                          {project.description}
                       </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                       <div className="flex gap-4">
                          <ProjectStat icon={Users} value="1.2K" />
                          <ProjectStat icon={TrendingUp} value="840" />
                       </div>
                       <ChevronRight size={20} className="text-zinc-700 group-hover:text-white transition-colors" />
                    </div>
                 </div>

                 {/* Hover Glow */}
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
               </Link>
             ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-20 border border-white/5 border-dashed rounded-3xl">
             <Rocket size={48} className="mx-auto text-zinc-800 mb-6" />
             <h3 className="text-xl font-black font-space uppercase text-zinc-600">No projects found</h3>
             <p className="text-zinc-700 font-space uppercase text-[10px] tracking-widest mt-2">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectStat({ icon: Icon, value }: any) {
  return (
    <div className="flex items-center gap-1.5 text-zinc-400">
       <Icon size={12} />
       <span className="text-[10px] font-black font-space uppercase">{value}</span>
    </div>
  );
}
