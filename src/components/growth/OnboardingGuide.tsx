'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronRight, X, Sparkles, Package, Swords, ShoppingCart, Layout, Trophy, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Step {
  id: string;
  title: string;
  content: string;
  targetId?: string; // ID of the element to highlight
  icon: any;
  action?: () => void;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'WELCOME TO SOLGINE',
    content: 'The first multi-tenant TCG platform on Solana. Let\'s get you synced with the grid.',
    icon: Sparkles
  },
  {
    id: 'battle',
    title: 'COMBAT ARENA',
    content: 'Test your strength against others or AI to earn XP and rewards.',
    targetId: 'nav-play',
    icon: Swords
  },
  {
    id: 'collection',
    title: 'YOUR VAULT',
    content: 'Manage your cards, build decks, and view your asset value here.',
    targetId: 'nav-cards',
    icon: Layout
  },
  {
    id: 'market',
    title: 'MARKETPLACE',
    content: 'Buy, sell, and trade cards with the community in real-time.',
    targetId: 'nav-market',
    icon: ShoppingCart
  },
  {
    id: 'leaderboard',
    title: 'GLOBAL RANKS',
    content: 'See where you stand against the top players and traders.',
    targetId: 'nav-ranks',
    icon: Trophy
  },
  {
    id: 'profile',
    title: 'PLAYER PROFILE',
    content: 'Customize your identity and invite friends to earn rewards.',
    targetId: 'nav-profile',
    icon: User
  }
];

export function OnboardingGuide() {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && !userSnap.data().hasCompletedOnboarding) {
        setIsVisible(true);
      }
    };

    checkOnboarding();
  }, [user]);

  useEffect(() => {
    if (!isVisible) return;

    const targetId = STEPS[activeStep].targetId;
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
    } else {
      setHighlightRect(null);
    }
  }, [activeStep, isVisible]);

  const handleNext = async () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    setIsVisible(false);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { hasCompletedOnboarding: true });
    } catch (e) {
      console.error("Error completing onboarding:", e);
    }
  };

  if (!isVisible) return null;

  const currentStep = STEPS[activeStep];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={() => setIsVisible(false)}
      />

      {/* Highlight Hole */}
      <AnimatePresence>
        {highlightRect && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bg-white/10 border-2 border-primary rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.5)] z-[101]"
          />
        )}
      </AnimatePresence>

      {/* Tooltip Card */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] p-8 pointer-events-auto shadow-2xl relative overflow-hidden"
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <motion.div 
              className="h-full bg-primary"
              animate={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Icon size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black font-space text-white tracking-widest uppercase">{currentStep.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{currentStep.content}</p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Step {activeStep + 1} of {STEPS.length}
              </p>
              
              <button 
                onClick={handleNext}
                className="px-6 py-3 bg-primary text-black font-black font-space text-xs tracking-widest uppercase rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                {activeStep === STEPS.length - 1 ? 'Get Started' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
