'use client';

import { Cpu } from "lucide-react";

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary-gradient flex items-center justify-center neon-glow-purple animate-pulse">
          <Cpu className="text-white" size={32} />
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-20"></div>
      </div>
      <p className="mt-6 font-space font-bold text-primary tracking-[0.3em] uppercase text-xs animate-pulse">
        Initializing Engine...
      </p>
    </div>
  );
};
