'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Rocket, Shield, Globe, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CreateProjectPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Auth required');
    
    setLoading(true);
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ownerUid: user.uid })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Project Created Successfully!');
      router.push(`/studio?projectId=${data.projectId}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
             <Zap size={12} />
             Platform Mode Beta
          </div>
          <h1 className="text-5xl md:text-7xl font-black font-space tracking-tighter uppercase leading-none">
            START_YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">ECOSYSTEM</span>
          </h1>
          <p className="text-zinc-500 max-w-xl text-lg font-space uppercase tracking-tight">
            Launch your own digital card game infrastructure in minutes. We handle the economy, you build the game.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Project Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. CyberNexus TCG"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">URL Identifier (Slug)</label>
                <div className="relative">
                   <input 
                    required
                    type="text" 
                    placeholder="cybernexus"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-mono lowercase focus:outline-none focus:border-primary/50 transition-all pl-12"
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                   />
                   <Globe size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" />
                </div>
                <p className="text-[9px] text-zinc-600 px-1 uppercase tracking-widest">solgine.io/projects/{formData.slug || 'your-slug'}</p>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="A futuristic TCG built on Solgine..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
             </div>

             <button 
               disabled={loading}
               type="submit"
               className="group w-full py-5 rounded-2xl bg-white text-black font-black font-space uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary transition-all disabled:opacity-50"
             >
               {loading ? 'INITIALIZING...' : 'CREATE_PROJECT'}
               <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </div>

          <div className="space-y-8 bg-white/5 p-8 rounded-3xl border border-white/5 border-dashed">
             <h3 className="text-xs font-black font-space uppercase tracking-widest text-zinc-400">Included_Capabilities</h3>
             <ul className="space-y-6">
                <FeatureItem 
                  title="Isolated Economy" 
                  desc="Your own marketplace, treasury, and value index logic." 
                />
                <FeatureItem 
                  title="Card Studio" 
                  desc="Tools to create, mint, and manage card assets." 
                />
                <FeatureItem 
                  title="Booster Infrastructure" 
                  desc="Configure pack odds, pricing, and reveal animations." 
                />
                <FeatureItem 
                  title="Revenue Share" 
                  desc="Automated fee distribution to your project wallet." 
                />
             </ul>
             
             <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                <Shield size={18} className="text-primary mt-0.5" />
                <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tight">
                  By creating a project, you agree to the SOLGINE platform fee of 5% on all primary and secondary transactions.
                </p>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeatureItem({ title, desc }: any) {
  return (
    <li className="flex gap-4">
       <CheckCircle2 size={18} className="text-primary shrink-0" />
       <div>
          <h4 className="text-xs font-black font-space uppercase text-white">{title}</h4>
          <p className="text-[10px] text-zinc-500 uppercase tracking-tight mt-1">{desc}</p>
       </div>
    </li>
  );
}
