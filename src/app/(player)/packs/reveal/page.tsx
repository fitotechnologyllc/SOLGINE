'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Card {
  id: string;
  name: string;
  rarity: string;
  attack: number;
  defense: number;
  ability: string;
  imageUrl: string;
  estimatedValue: number;
}

export default function PackRevealPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [stage, setStage] = useState<'initial' | 'vibrating' | 'flash' | 'revealing' | 'summary'>('initial');
  const [revealedCount, setRevealedCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const data = typeof window !== 'undefined' ? sessionStorage.getItem('solgine_pack_reveal') : null;
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCards(JSON.parse(data));
    } else {
      router.push('/packs');
    }
  }, [router]);

  const handlePackClick = () => {
    if (stage !== 'initial') return;
    setStage('vibrating');
    
    // Vibrate duration
    setTimeout(() => {
      setStage('flash');
      setTimeout(() => {
        setStage('revealing');
      }, 800); // flash duration
    }, 1500); // vibrate duration
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'shadow-[0_0_60px_rgba(239,68,68,1)] border-red-500 from-red-500/40 to-black';
      case 'legendary': return 'shadow-[0_0_50px_rgba(251,191,36,0.8)] border-amber-400 from-amber-400/30 to-black';
      case 'epic': return 'shadow-[0_0_40px_rgba(168,85,247,0.6)] border-purple-500 from-purple-500/30 to-black';
      case 'rare': return 'shadow-[0_0_30px_rgba(59,130,246,0.5)] border-blue-500 from-blue-500/30 to-black';
      case 'uncommon': return 'shadow-[0_0_20px_rgba(20,241,149,0.4)] border-secondary from-secondary/30 to-black';
      default: return 'shadow-[0_0_15px_rgba(255,255,255,0.2)] border-white/20 from-white/10 to-black';
    }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return 'text-red-400 font-black drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]';
      case 'legendary': return 'text-amber-400 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]';
      case 'epic': return 'text-purple-400 font-bold';
      case 'rare': return 'text-blue-400 font-bold';
      case 'uncommon': return 'text-secondary font-bold';
      default: return 'text-zinc-400';
    }
  };

  const handleRevealNext = () => {
    if (revealedCount >= cards.length) {
      setStage('summary');
      return;
    }

    const nextCard = cards[revealedCount];
    const isHighRarity = ['epic', 'legendary', 'mythic'].includes(nextCard.rarity);

    if (isHighRarity) {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setRevealedCount(prev => prev + 1);
      }, 800);
    } else {
      setRevealedCount(prev => prev + 1);
    }
  };

  const revealAll = () => {
    setRevealedCount(cards.length);
    setTimeout(() => {
      setStage('summary');
    }, 1000);
  };

  if (cards.length === 0) return null; // loading or redirecting

  return (
    <div className="fixed inset-0 z-50 bg-[#020202] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        {stage === 'vibrating' && (
          <div className="absolute w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] animate-ping"></div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {(stage === 'initial' || stage === 'vibrating') && (
          <motion.div
            key="pack"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              ...(stage === 'initial' ? { y: [0, -15, 0] } : {})
            }}
            exit={{ scale: 1.5, opacity: 0, filter: 'brightness(2) blur(10px)' }}
            transition={{ 
              duration: stage === 'initial' ? 3 : 0.5,
              repeat: stage === 'initial' ? Infinity : 0,
              ease: "easeInOut"
            }}
            onClick={handlePackClick}
            className="relative cursor-pointer group z-10"
          >
            <motion.div
              animate={stage === 'vibrating' ? { x: [-5, 5, -5, 5, 0], y: [-2, 2, -2, 2, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.1 }}
              className="relative"
            >
              <div className="w-64 h-80 rounded-3xl bg-gradient-to-br from-zinc-800 to-black border-4 border-primary/50 shadow-[0_0_50px_rgba(168,85,247,0.5)] flex items-center justify-center overflow-hidden group-hover:shadow-[0_0_80px_rgba(168,85,247,0.8)] transition-all">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent opacity-50"></div>
                <Package size={80} className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10" />
                
                {stage === 'vibrating' && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse z-20"></div>
                )}
              </div>
              <div className="absolute -bottom-12 left-0 right-0 text-center">
                <p className="text-zinc-400 font-space font-bold tracking-widest uppercase text-sm animate-pulse">
                  {stage === 'initial' ? 'Tap to Open' : 'Decrypting...'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {stage === 'flash' && (
          <motion.div
            key="flash"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 2 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="w-full h-full bg-gradient-to-tr from-primary to-white opacity-50"></div>
          </motion.div>
        )}

        {stage === 'revealing' && (
          <motion.div
            key="revealing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-[1200px] flex flex-col items-center justify-center min-h-screen p-6 z-10"
          >
            <div className="flex-1 flex items-center justify-center w-full">
              <div className="relative w-full max-w-4xl h-[60vh] flex items-center justify-center">
                {cards.map((card, i) => {
                  const isRevealed = i < revealedCount;
                  const isCurrent = i === revealedCount;
                  const isUpcoming = i > revealedCount;
                  
                  // Stack positioning: Current is in center. Upcoming are stacked behind. Revealed are shifted or hidden.
                  // Let's actually display them in a responsive row if there are few, or let them fan out.
                  // A fan or grid is better so they can all be seen. Let's do a flex wrap centered grid.
                  
                  return (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 100, rotateY: 0 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: isCurrent && isShaking ? [1, 1.05, 0.95, 1.05, 1] : 1,
                        rotateX: isCurrent && isShaking ? [-5, 5, -5, 5, 0] : 0
                      }}
                      transition={{ 
                        duration: 0.5,
                        delay: i * 0.1,
                        scale: { duration: 0.4 },
                        rotateX: { duration: 0.4 }
                      }}
                      className={cn(
                        "absolute w-64 aspect-[3/4] cursor-pointer perspective-1000 transition-all duration-500",
                        // Fan out positioning logic based on index
                        isUpcoming || isCurrent ? `z-${50 - i}` : `z-10`,
                      )}
                      style={{
                        // Spread them out across the screen
                        transform: `translateX(${(i - (cards.length - 1) / 2) * 120}px) translateY(${isCurrent ? -20 : 0}px) rotate(${(i - (cards.length - 1) / 2) * 5}deg)`,
                      }}
                      onClick={() => {
                        if (isCurrent) handleRevealNext();
                      }}
                    >
                      <motion.div 
                        className="w-full h-full relative preserve-3d transition-transform duration-[800ms] ease-out shadow-2xl"
                        animate={{ rotateY: isRevealed ? 180 : 0 }}
                      >
                        {/* Card Back */}
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-zinc-800 to-black border-2 border-white/20 rounded-2xl flex flex-col items-center justify-center group hover:border-primary/50 transition-colors">
                          <Layers size={48} className="text-white/20 mb-4 group-hover:text-primary/50 transition-colors" />
                          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                          {isCurrent && (
                            <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-xl -z-10 animate-pulse"></div>
                          )}
                        </div>

                        {/* Card Front */}
                        <div className={cn(
                          "absolute inset-0 backface-hidden rounded-2xl p-5 flex flex-col bg-gradient-to-br border-2",
                          "[transform:rotateY(180deg)]",
                          getRarityGlow(card.rarity)
                        )}>
                           <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.15] mix-blend-overlay pointer-events-none"></div>
                           
                           {/* Card image/art area */}
                           <div className="flex-1 bg-black/60 rounded-xl border border-white/10 flex items-center justify-center mb-4 overflow-hidden relative shadow-inner">
                              {card.imageUrl ? (
                                <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                              ) : (
                                <Sparkles size={48} className={cn(getRarityText(card.rarity), "drop-shadow-lg")} />
                              )}
                              
                              {/* Rarity specific effects */}
                              {card.rarity === 'mythic' && (
                                <div className="absolute inset-0 bg-gradient-to-t from-red-500/30 to-transparent mix-blend-overlay animate-pulse"></div>
                              )}
                           </div>

                           <div className="space-y-1 relative z-10">
                             <h4 className="text-lg font-black font-space text-white leading-tight truncate drop-shadow-md">{card.name}</h4>
                             <div className="flex justify-between items-center">
                               <span className={cn("text-xs tracking-widest uppercase", getRarityText(card.rarity))}>
                                 {card.rarity}
                               </span>
                               {card.estimatedValue > 0 && (
                                 <span className="text-xs font-mono text-zinc-300 bg-black/50 px-2 py-0.5 rounded border border-white/10">
                                   {card.estimatedValue} SOLG
                                 </span>
                               )}
                             </div>
                           </div>

                           {/* Stats if available */}
                           {(card.attack > 0 || card.defense > 0) && (
                             <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[10px] font-bold uppercase tracking-wider relative z-10">
                               <div className="bg-red-500/10 border border-red-500/20 text-red-400 py-1.5 rounded">
                                 ATK {card.attack}
                               </div>
                               <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 py-1.5 rounded">
                                 DEF {card.defense}
                               </div>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-zinc-500 font-space text-sm tracking-widest uppercase">
                {revealedCount < cards.length ? `Tap card to reveal (${revealedCount}/${cards.length})` : 'All cards revealed'}
              </p>
              
              {revealedCount < cards.length ? (
                <button 
                  onClick={revealAll}
                  className="px-6 py-2 rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5 font-space text-xs tracking-widest uppercase transition-all"
                >
                  Skip & Reveal All
                </button>
              ) : (
                <button 
                  onClick={() => setStage('summary')}
                  className="px-8 py-3 rounded-xl bg-primary text-black font-black font-space text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                >
                  Continue <ChevronRight size={18} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[800px] flex flex-col items-center justify-center min-h-screen p-6 z-10"
          >
            <h2 className="text-4xl md:text-5xl font-black font-space text-white mb-2 tracking-[0.2em] uppercase text-center drop-shadow-lg">
              YOU PULLED
            </h2>
            <p className="text-zinc-400 font-space tracking-widest uppercase text-sm mb-12">Pack Decryption Complete</p>

            <div className="w-full bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl mb-8">
              <div className="p-6 md:p-8 space-y-4">
                {cards.map((card, idx) => {
                  const isRare = ['rare', 'epic', 'legendary', 'mythic'].includes(card.rarity);
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-colors",
                        isRare ? "bg-primary/5 border-primary/20" : "bg-black/40 border-white/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center border",
                          isRare ? getRarityGlow(card.rarity) : "bg-zinc-900 border-zinc-800"
                        )}>
                          {card.imageUrl ? (
                            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Sparkles size={20} className={getRarityText(card.rarity)} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-bold font-space">{card.name}</h4>
                          <p className={cn("text-xs font-bold uppercase tracking-wider mt-0.5", getRarityText(card.rarity))}>
                            {card.rarity}
                          </p>
                        </div>
                      </div>
                      
                      {card.estimatedValue > 0 && (
                        <div className="text-right">
                          <span className="text-sm font-mono text-white">{card.estimatedValue}</span>
                          <span className="text-xs text-zinc-500 font-bold ml-1">SOLG</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 w-full">
              <button 
                onClick={() => router.push('/packs')}
                className="flex-1 md:flex-none px-8 py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold font-space text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Open Another
              </button>
              <button 
                onClick={() => router.push('/collection')}
                className="flex-1 md:flex-none px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black font-space text-sm tracking-widest uppercase shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                View Collection <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
