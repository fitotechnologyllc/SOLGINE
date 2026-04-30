'use client';

import { useState } from 'react';
import { Rocket, Shield, AlertCircle, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface LaunchApplicationFormProps {
  projectId: string;
  projectName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LaunchApplicationForm({ projectId, projectName, onSuccess, onCancel }: LaunchApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    description: '',
    category: 'Fantasy',
    targetAudience: 'Everyone',
    website: '',
    twitter: '',
    artworkOwnership: false,
    termsAccepted: false
  });

  const handleSubmit = async () => {
    if (!formData.artworkOwnership || !formData.termsAccepted) {
      return toast.error("You must confirm ownership and terms.");
    }

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/projects/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          applicationData: {
            projectName,
            ...formData
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Application submitted successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black font-space text-white uppercase tracking-tighter">LAUNCH_APPLICATION</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Project: {projectName}</p>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={cn(
                "w-8 h-1 rounded-full transition-all",
                step >= s ? "bg-primary" : "bg-white/10"
              )} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Game Description</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Tell us more about your game world and mechanics..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Category</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Fantasy">Fantasy</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Horror">Horror</option>
                    <option value="Cyberpunk">Cyberpunk</option>
                    <option value="Anime">Anime</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Target Audience</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all"
                    value={formData.targetAudience}
                    onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Casual">Casual Players</option>
                    <option value="Hardcore">Hardcore TCG Fans</option>
                    <option value="Collectors">Collectors</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Website (Optional)</label>
                <input 
                  type="url"
                  placeholder="https://..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all"
                  value={formData.website}
                  onChange={e => setFormData({...formData, website: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Twitter/X (Optional)</label>
                <input 
                  type="text"
                  placeholder="@yourproject"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-space focus:outline-none focus:border-primary/50 transition-all"
                  value={formData.twitter}
                  onChange={e => setFormData({...formData, twitter: e.target.value})}
                />
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                <Info size={18} className="text-blue-400 mt-0.5" />
                <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tight">
                  Providing social links helps our review team verify your project faster and increases trust with players.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black font-space text-white uppercase tracking-widest">Legal & Compliance</h3>
                
                <label className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input 
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black text-primary focus:ring-primary"
                    checked={formData.artworkOwnership}
                    onChange={e => setFormData({...formData, artworkOwnership: e.target.checked})}
                  />
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Artwork Ownership</p>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase leading-tight">I confirm that I own or have legal rights to use all artwork, assets, and intellectual property uploaded to this project.</p>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                  <input 
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black text-primary focus:ring-primary"
                    checked={formData.termsAccepted}
                    onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}
                  />
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">SOLGINE Creator Terms</p>
                    <p className="text-[10px] text-zinc-500 mt-1 uppercase leading-tight">I agree to follow the SOLGINE platform guidelines, including fair economy practices and community standards.</p>
                  </div>
                </label>
              </div>

              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Shield size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Pre-Launch Verification</span>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase leading-relaxed">
                  Our team will review your project within 48-72 hours. Once approved, you can go live and enable marketplace features.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex gap-4">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-6 py-4 rounded-2xl bg-white/5 text-zinc-400 font-black font-space text-xs tracking-widest uppercase hover:text-white transition-all"
            >
              Back
            </button>
          ) : (
            <button 
              onClick={onCancel}
              className="px-6 py-4 rounded-2xl bg-white/5 text-zinc-400 font-black font-space text-xs tracking-widest uppercase hover:text-white transition-all"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button 
              onClick={() => {
                if (step === 1 && !formData.description) return toast.error("Please provide a description.");
                setStep(step + 1);
              }}
              className="flex-1 py-4 rounded-2xl bg-white text-black font-black font-space text-xs tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-primary transition-all"
            >
              Next Step <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 py-4 rounded-2xl bg-primary text-black font-black font-space text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {loading ? 'SUBMITTING...' : 'SUBMIT_FOR_REVIEW'}
              <Rocket size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
