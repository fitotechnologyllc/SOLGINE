'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, redirect } from 'next/navigation';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      toast.success('Payment Successful!');
      setTimeout(() => {
        redirect('/dashboard');
      }, 3000);
    }
  }, [sessionId]);

  return (
    <div className="glass-card p-12 text-center space-y-6 max-w-md w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-6 neon-glow-teal">
           <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-black font-space text-white uppercase tracking-widest">Transaction Verified</h1>
        <p className="text-zinc-500 font-medium mt-4">
          Your engine credits are being allocated. Redirecting to your dashboard...
        </p>
        <div className="mt-8 flex items-center gap-3 text-primary animate-pulse">
           <Loader2 size={16} className="animate-spin" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Synching with network</span>
        </div>
      </div>
      <Sparkles className="absolute top-4 right-4 text-primary/20" size={32} />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <Suspense fallback={<Loader2 className="animate-spin text-primary" size={32} />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
