'use client';

import { useState } from 'react';
import { 
  Plus, 
  Upload, 
  Layers, 
  Shield, 
  Zap, 
  Sword, 
  Save,
  Cpu,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function CardCreator() {
  const [cardData, setCardData] = useState({
    name: 'CORE SENTINEL',
    description: 'A guardian of the digital frontier.',
    rarity: 'Common',
    type: 'Unit',
    atk: 10,
    def: 10,
    abilityName: 'PROTOCOL ALPHA',
    abilityDesc: 'Deals 5 damage to adjacent enemies.',
    image: null as string | null
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCardData({ ...cardData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleAISuggest = async () => {
    setIsGenerating(true);
    // Simulate AI generation from OpenRouter
    setTimeout(() => {
      setCardData({
        ...cardData,
        name: 'VORTEX REAPER',
        abilityName: 'GRAVITY WELL',
        abilityDesc: 'Pull all enemies to the front line and stun them for 1 turn.',
        atk: 15,
        def: 8
      });
      setIsGenerating(false);
      toast.success('AI Suggestion Applied!');
    }, 1500);
  };

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black font-space text-white uppercase tracking-tighter">Card Engine</h1>
          <p className="text-primary font-space font-bold tracking-[0.3em] uppercase text-xs">Forging digital entities</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl glass text-zinc-400 font-bold font-space hover:text-white transition-all">
            <RefreshCcw size={18} />
            RESET
          </button>
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-gradient text-white font-bold font-space shadow-lg hover:scale-105 transition-all">
            <Save size={18} />
            COMMIT TO CHAIN
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Editor Form */}
        <section className="space-y-8">
          <div className="glass-card p-8 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Base Identity</label>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Card Name"
                  className="bg-black/40 border border-white/10 rounded-xl p-4 text-white font-space focus:border-primary outline-none transition-all"
                  value={cardData.name}
                  onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                />
                <select 
                  className="bg-black/40 border border-white/10 rounded-xl p-4 text-white font-space focus:border-primary outline-none transition-all"
                  value={cardData.rarity}
                  onChange={(e) => setCardData({ ...cardData, rarity: e.target.value })}
                >
                  <option>Common</option>
                  <option>Rare</option>
                  <option>Epic</option>
                  <option>Legendary</option>
                </select>
              </div>
              <textarea 
                placeholder="Core Description"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-space h-24 focus:border-primary outline-none transition-all resize-none"
                value={cardData.description}
                onChange={(e) => setCardData({ ...cardData, description: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Combat Stats</label>
                <button 
                  onClick={handleAISuggest}
                  disabled={isGenerating}
                  className="text-primary text-[10px] font-black font-space uppercase tracking-widest flex items-center gap-2 hover:underline disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  AI Rebalance
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Sword className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="number" 
                    placeholder="ATK"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-space focus:border-primary outline-none transition-all"
                    value={cardData.atk}
                    onChange={(e) => setCardData({ ...cardData, atk: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="number" 
                    placeholder="DEF"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white font-space focus:border-primary outline-none transition-all"
                    value={cardData.def}
                    onChange={(e) => setCardData({ ...cardData, def: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Unique Ability</label>
              <input 
                type="text" 
                placeholder="Ability Name"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-space focus:border-primary outline-none transition-all"
                value={cardData.abilityName}
                onChange={(e) => setCardData({ ...cardData, abilityName: e.target.value })}
              />
              <textarea 
                placeholder="Ability Mechanics"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-space h-20 focus:border-primary outline-none transition-all resize-none text-sm"
                value={cardData.abilityDesc}
                onChange={(e) => setCardData({ ...cardData, abilityDesc: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black font-space text-zinc-500 uppercase tracking-widest">Visual Asset</label>
              <div 
                className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer relative"
                onClick={() => document.getElementById('card-upload')?.click()}
              >
                <Upload size={32} className="text-zinc-500" />
                <p className="text-sm text-zinc-400 font-medium">Upload Card Artwork</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">PNG, JPG up to 10MB</p>
                <input id="card-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
              </div>
            </div>
          </div>
        </section>

        {/* Real-time Preview */}
        <section className="flex flex-col items-center justify-start sticky top-10">
          <div className="flex flex-col items-center gap-4 mb-6">
             <h3 className="text-zinc-500 font-space font-bold tracking-[0.2em] uppercase text-[10px]">Holographic Preview</h3>
             <div className="w-12 h-1 bg-primary/20 rounded-full"></div>
          </div>

          <div className={cn(
            "w-[340px] h-[480px] rounded-[2.5rem] p-1 relative overflow-hidden transition-all duration-500",
            cardData.rarity === 'Common' && "bg-zinc-600",
            cardData.rarity === 'Rare' && "bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.3)]",
            cardData.rarity === 'Epic' && "bg-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.3)]",
            cardData.rarity === 'Legendary' && "bg-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)]"
          )}>
            <div className="w-full h-full rounded-[2.4rem] bg-[#0d0d0d] relative overflow-hidden flex flex-col p-6">
              {/* Card Header */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black font-space text-white/40 tracking-widest">NO. 001</span>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Zap size={14} className="text-primary" />
                </div>
              </div>

              {/* Card Image */}
              <div className="w-full h-48 rounded-2xl bg-zinc-900 border border-white/5 relative overflow-hidden">
                {cardData.image ? (
                  <img src={cardData.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                    <Layers size={48} className="text-white" />
                    <span className="text-[8px] font-black mt-2 uppercase tracking-tighter">Awaiting Signal</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent"></div>
              </div>

              {/* Card Details */}
              <div className="mt-4 flex-1 flex flex-col">
                <h2 className="text-2xl font-black font-space text-white leading-none mb-1">{cardData.name}</h2>
                <p className="text-[8px] font-bold text-primary tracking-[0.2em] uppercase mb-4">{cardData.rarity}</p>
                
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[8px] font-black text-primary tracking-widest uppercase mb-1">{cardData.abilityName}</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                      {cardData.abilityDesc}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Sword size={16} className="text-zinc-600" />
                    <span className="text-xl font-black font-space text-white">{cardData.atk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-zinc-600" />
                    <span className="text-xl font-black font-space text-white">{cardData.def}</span>
                  </div>
                </div>
              </div>

              {/* Holographic Overlays */}
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.05)_0%,_transparent_50%)] pointer-events-none"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
