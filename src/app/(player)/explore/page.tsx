'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { Search, Filter, TrendingUp, Sparkles, Trophy, ArrowRight, Grid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ExplorePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'trending' | 'new' | 'volume'>('trending');

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      let q = query(collection(db, 'projects'), where('status', '==', 'active'));
      
      if (filter === 'trending') q = query(q, orderBy('stats.activeUsers', 'desc'));
      else if (filter === 'new') q = query(q, orderBy('createdAt', 'desc'));
      else if (filter === 'volume') q = query(q, orderBy('stats.totalRevenue', 'desc'));

      const snap = await getDocs(q);
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

    fetchProjects();
  }, [filter]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-12">
      {/* Hero Search */}
      <section className="text-center space-y-6 py-12">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-primary font-black font-space text-xs uppercase tracking-[0.5em]"
        >
          Discover the Metaverse
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black font-space text-white uppercase tracking-tighter"
        >
          EXPLORE_ECOSYSTEMS
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto relative group"
        >
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={24} />
          <input 
            type="text" 
            placeholder="Search for a project, card, or collection..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border-2 border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-xl text-white focus:outline-none focus:border-primary/50 transition-all shadow-2xl"
          />
        </motion.div>
      </section>

      {/* Discovery Categories */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <FilterBtn active={filter === 'trending'} onClick={() => setFilter('trending')} icon={TrendingUp} label="Trending" />
          <FilterBtn active={filter === 'new'} onClick={() => setFilter('new')} icon={Sparkles} label="Newest" />
          <FilterBtn active={filter === 'volume'} onClick={() => setFilter('volume')} icon={Trophy} label="Top Volume" />
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <button className="p-2 text-primary bg-primary/10 rounded-lg"><Grid size={18} /></button>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><List size={18} /></button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3,4,5,6].map(i => (
            <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-[2.5rem]" />
          ))
        ) : (
          filteredProjects.map((project, i) => (
            <ProjectCard key={project.id} project={project} delay={i * 0.1} />
          ))
        )}
      </div>

      {filteredProjects.length === 0 && !loading && (
        <div className="py-20 text-center space-y-4">
           <Search size={64} className="text-zinc-800 mx-auto" />
           <p className="text-zinc-500 font-space uppercase tracking-widest">No matching sectors found</p>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-full border transition-all text-xs font-black font-space uppercase tracking-widest",
        active ? "bg-white text-black border-white shadow-xl" : "bg-white/5 text-zinc-500 border-white/10 hover:border-white/20 hover:text-white"
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function ProjectCard({ project, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -8 }}
      className="group relative h-[420px] rounded-[2.5rem] overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl"
    >
      {/* Project Banner/Logo */}
      <div className="absolute inset-0 z-0">
        <img 
          src={project.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${project.id}`} 
          alt={project.name}
          className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      <div className="relative z-10 h-full p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 shadow-2xl">
             <img src={project.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${project.id}`} alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest">
            {project.status}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-3xl font-black font-space text-white leading-tight uppercase group-hover:text-primary transition-colors">{project.name}</h3>
            <p className="text-sm text-zinc-400 line-clamp-2 mt-2">{project.description}</p>
          </div>

          <div className="flex items-center gap-6 py-4 border-t border-white/5">
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Volume</p>
                <p className="text-lg font-black font-space text-white">{(project.stats?.totalRevenue || 0).toLocaleString()} SOLG</p>
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Users</p>
                <p className="text-lg font-black font-space text-white">{(project.stats?.activeUsers || 0).toLocaleString()}</p>
             </div>
          </div>

          <Link 
            href={`/explore/${project.slug || project.id}`}
            className="w-full py-4 rounded-2xl bg-white text-black font-black font-space text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-xl"
          >
            ENTER PROJECT <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
