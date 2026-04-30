'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, Circle, Rocket, Layout, Sparkles, Package, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function CreatorOnboarding() {
  const { user } = useAuth();
  const [steps, setSteps] = useState([
    { id: 'project', title: 'Initialize Project', description: 'Set up your TCG namespace and branding.', icon: Rocket, completed: false, link: '/studio/settings' },
    { id: 'card', title: 'Forge First Card', description: 'Create your first asset with AI or manual design.', icon: Sparkles, completed: false, link: '/studio/cards' },
    { id: 'pack', title: 'Deploy Booster Pack', description: 'Configure your first pack and pricing model.', icon: Package, completed: false, link: '/studio/packs' },
    { id: 'launch', title: 'Global Sync', description: 'Publish your ecosystem to the SOLGINE grid.', icon: ShieldCheck, completed: false, link: '/studio/dashboard' },
  ]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const checkProgress = async () => {
      try {
        // Check projects
        const projectQ = query(collection(db, 'projects'), where('ownerUid', '==', user.uid));
        const projectSnap = await getDocs(projectQ);
        const hasProject = !projectSnap.empty;

        // Check cards
        const cardQ = query(collection(db, 'cards'), where('ownerUid', '==', user.uid));
        const cardSnap = await getDocs(cardQ);
        const hasCards = !cardSnap.empty;

        // Check packs
        const packQ = query(collection(db, 'boosterPacks'), where('ownerUid', '==', user.uid));
        const packSnap = await getDocs(packQ);
        const hasPacks = !packSnap.empty;

        setSteps(prev => prev.map(s => {
          if (s.id === 'project') return { ...s, completed: hasProject };
          if (s.id === 'card') return { ...s, completed: hasCards };
          if (s.id === 'pack') return { ...s, completed: hasPacks };
          if (s.id === 'launch') return { ...s, completed: hasProject && hasCards && hasPacks };
          return s;
        }));
      } catch (e) {
        console.error("Error checking onboarding progress:", e);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, [user]);

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-12">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
          <Rocket size={12} />
          Creator Launchpad
        </div>
        <h1 className="text-5xl font-black font-space text-white uppercase tracking-tighter">STUDIO_INIT</h1>
        <p className="text-zinc-500 max-w-xl">Welcome to the forge. Complete the following sequence to launch your own TCG ecosystem on the SOLGINE grid.</p>
      </header>

      {/* Progress Bar */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-xs font-black font-space text-zinc-400 uppercase tracking-widest">Synchronization Progress</span>
          <span className="text-2xl font-black font-space text-white">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className="h-full bg-primary shadow-[0_0_20px_rgba(168,85,247,0.5)]"
          />
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 gap-4">
        {steps.map((step, i) => (
          <motion.div 
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "group p-6 rounded-[2rem] border transition-all duration-500 flex items-center justify-between",
              step.completed 
                ? "bg-primary/5 border-primary/20" 
                : "bg-white/[0.02] border-white/5 hover:border-white/20"
            )}
          >
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                step.completed ? "bg-primary text-black" : "bg-white/5 text-zinc-500 group-hover:bg-white/10"
              )}>
                <step.icon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black font-space text-white uppercase tracking-tight">{step.title}</h3>
                <p className="text-sm text-zinc-500 mt-1">{step.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {step.completed ? (
                <div className="flex items-center gap-2 text-primary font-black font-space text-xs uppercase tracking-widest">
                  <CheckCircle2 size={20} />
                  Complete
                </div>
              ) : (
                <button 
                  onClick={() => router.push(step.link)}
                  className="px-6 py-3 rounded-xl bg-white text-black font-black font-space text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
                >
                  Configure <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Reward Card */}
      {progressPercent === 100 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto text-primary border-4 border-primary shadow-[0_0_40px_rgba(168,85,247,0.4)] animate-bounce">
            <Zap size={40} className="fill-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black font-space text-white uppercase tracking-tighter">ALL SYSTEMS GO</h2>
            <p className="text-zinc-300 max-w-sm mx-auto">Your ecosystem is fully synced. You've earned the <strong>Genesis Founder</strong> badge and 5,000 Launch Credits.</p>
          </div>
          <button 
            onClick={() => router.push('/studio/dashboard')}
            className="px-10 py-4 rounded-2xl bg-white text-black font-black font-space text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
          >
            ENTER THE GRID
          </button>
        </motion.div>
      )}
    </div>
  );
}
