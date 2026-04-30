'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { NotificationFeed } from './NotificationFeed';
import { Search, User, Zap, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function PlayerHeader() {
  const { user } = useAuth();
  const { connected } = useWallet();

  return (
    <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-background/80 backdrop-blur-xl z-40 px-6">
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between gap-8">
        {/* Search Bar - Ready for Launch */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search projects, cards, or creators..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>

        {/* Brand - Center on Mobile */}
        <div className="md:hidden">
          <h1 className="text-xl font-black font-space text-white tracking-tighter uppercase">SOLGINE</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Wallet Status */}
          <div className="hidden sm:block">
            <WalletMultiButton className="!bg-white/5 !border !border-white/10 !rounded-xl !h-10 !text-xs !font-black !font-space !uppercase !tracking-widest hover:!bg-white/10 transition-all" />
          </div>

          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Credits Quick View */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <Zap size={14} className="text-primary fill-primary" />
            <span className="text-xs font-black font-space text-white">2,540</span>
          </div>

          <NotificationFeed />

          <Link 
            href="/profile"
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <User size={20} className="text-zinc-400" />
          </Link>
        </div>
      </div>
    </header>
  );
}
