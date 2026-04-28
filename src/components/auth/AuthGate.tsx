'use client';

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Cpu, Mail, Lock, Globe, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const AuthGate = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { connected, publicKey } = useWallet();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back to SOLGINE!');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Google login success!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-purple-500/30">
      {/* Background gradients & Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        {/* Core background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/15 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Specific Glow behind Hero text */}
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[130px] rounded-full mix-blend-screen" />
        
        {/* Specific Glow behind Login Card */}
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[50%] bg-blue-500/10 blur-[140px] rounded-full mix-blend-screen" />
        
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/60 backdrop-blur-2xl transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all duration-300">
              <Cpu className="text-white w-5 h-5" />
            </div>
            <span className="font-space font-bold text-xl tracking-tighter group-hover:text-purple-300 transition-colors duration-300">SOLGINE</span>
          </div>

          {/* Links */}
          <div className="hidden lg:flex items-center gap-10 text-[15px] font-medium text-zinc-400">
            <a href="#" className="text-white relative after:absolute after:bottom-[-24px] after:left-0 after:w-full after:h-[2px] after:bg-purple-500 after:rounded-t-full transition-colors">Home</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Games</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Marketplace</a>
            <a href="#" className="hover:text-white transition-colors duration-200">Studio</a>
            <a href="#" className="hover:text-white transition-colors duration-200 flex items-center gap-1">
              AI <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">Docs</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button onClick={() => setIsRegistering(false)} className="hidden sm:block px-5 py-2.5 rounded-[10px] border border-white/10 hover:border-white/20 hover:bg-white/5 font-medium text-[15px] transition-all duration-300">
              Log In
            </button>
            <button onClick={() => setIsRegistering(true)} className="px-5 py-2.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-semibold text-[15px] shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-[1.02] transition-all duration-300">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-8 pt-[120px] pb-20 min-h-screen flex items-center">
        {/* GRID LAYOUT */}
        <div className="w-full grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col max-w-[600px] mx-auto lg:mx-0 text-center lg:text-left">
            <div className="flex flex-col gap-6 lg:gap-8">
              <div className="flex flex-col gap-4">
                <h1 className="font-space text-[48px] md:text-[64px] leading-[1.05] font-black tracking-tight drop-shadow-2xl">
                  BUILD. PLAY. OWN.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400">
                    THE FUTURE OF CARD GAMES.
                  </span>
                </h1>
                <div className="flex flex-col gap-3 mt-2">
                  <h2 className="text-[22px] md:text-[26px] font-medium text-zinc-200 tracking-tight">
                    The Solana Engine for Digital Game Economies
                  </h2>
                  <p className="text-[16px] md:text-[18px] text-zinc-400 leading-relaxed mx-auto lg:mx-0 max-w-[520px]">
                    Collect, trade, play, and build your own card game universe on Solana. Powered by Fito Technology, LLC.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                <button onClick={() => setIsRegistering(true)} className="px-8 h-[52px] rounded-[10px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold text-[16px] shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:scale-[1.02] transition-all duration-300">
                  Enter the Engine
                </button>
                <button className="px-8 h-[52px] rounded-[10px] border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] font-medium text-[16px] transition-all duration-300 text-white">
                  Watch Demo
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 md:gap-12 pt-12 border-t border-white/5 mt-4">
                {[
                  { label: 'Cards Created', value: '2.4M+' },
                  { label: 'Active Players', value: '145K' },
                  { label: 'Trades', value: '8.9M' },
                  { label: 'Volume', value: '$12M+' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <span className="font-space text-[32px] font-black text-white drop-shadow-md">{stat.value}</span>
                    <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-500/80">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (LOGIN CARD) */}
          <div className="w-full max-w-[420px] mx-auto lg:ml-auto group/card">
            <div className="bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-[20px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_40px_rgba(168,85,247,0.15)] transition-all duration-500 relative overflow-hidden">
              {/* Subtle inner top highlight */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

              <div className="mb-8 text-center">
                <h3 className="font-space text-[28px] font-bold text-white mb-2 tracking-tight drop-shadow-sm">
                  {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h3>
                <p className="text-[15px] text-zinc-400">
                  {isRegistering ? 'Start building your legacy today.' : 'Enter your details to access your dashboard.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="flex flex-col gap-5">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[20px] h-[20px] text-zinc-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                  <input 
                    type="email" 
                    placeholder="Email address"
                    className="w-full h-[52px] bg-[#141414] border border-white/5 rounded-[12px] pl-[44px] pr-[16px] text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 focus:bg-[#1a1a1a] transition-all duration-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[20px] h-[20px] text-zinc-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password"
                    className="w-full h-[52px] bg-[#141414] border border-white/5 rounded-[12px] pl-[44px] pr-[44px] text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 focus:bg-[#1a1a1a] transition-all duration-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-[20px] h-[20px]" /> : <Eye className="w-[20px] h-[20px]" />}
                  </button>
                </div>

                {!isRegistering && (
                  <div className="flex items-center justify-between text-[14px] mt-1 mb-1">
                    <label className="flex items-center gap-2 cursor-pointer group/check">
                      <input type="checkbox" className="w-4 h-4 rounded-[4px] border-[#333333] bg-[#141414] text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0 transition-colors" />
                      <span className="text-zinc-400 group-hover/check:text-zinc-300 transition-colors duration-200">Remember me</span>
                    </label>
                    <a href="#" className="text-purple-400 hover:text-purple-300 hover:underline transition-all duration-200">
                      Forgot password?
                    </a>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full h-[52px] rounded-[12px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-[16px] shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_25px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                  {isRegistering ? 'Create Account' : 'Log In'}
                </button>
              </form>

              <div className="flex items-center gap-4 my-7">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">or continue with</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-3 h-[52px] rounded-[12px] border border-white/5 bg-[#141414] hover:bg-[#1f1f1f] hover:border-white/10 text-white font-medium text-[15px] transition-all duration-300"
                >
                  <Globe className="w-[18px] h-[18px] text-zinc-400" />
                  Google
                </button>

                <div className="wallet-btn-container w-full group/wallet">
                  <WalletMultiButton className="!w-full !h-[52px] !bg-[#141414] hover:!bg-[#1f1f1f] !border !border-white/5 hover:!border-white/10 !rounded-[12px] !font-sans !font-medium !text-[15px] !justify-center !transition-all !duration-300" />
                </div>
              </div>

              <p className="mt-8 text-center text-[14px] text-zinc-400">
                {isRegistering ? 'Already have an account?' : 'New to SOLGINE?'} 
                <button 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="ml-2 text-white font-semibold hover:text-purple-400 hover:underline underline-offset-4 transition-all duration-200"
                >
                  {isRegistering ? 'Log In' : 'Create an account'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
