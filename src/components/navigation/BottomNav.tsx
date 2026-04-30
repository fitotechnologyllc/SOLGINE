'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Gamepad2, Library, ShoppingCart, User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/play', label: 'Play', icon: Gamepad2 },
  { href: '/collection', label: 'Cards', icon: Library },
  { href: '/market', label: 'Market', icon: ShoppingCart },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg h-20 glass-morphism rounded-[2.5rem] flex items-center justify-around px-2 z-50 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            id={`nav-${item.label.toLowerCase()}`}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative px-3 py-2 rounded-2xl group",
              isActive ? "text-primary scale-105" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300",
              isActive ? "bg-primary/10 neon-glow-purple scale-110" : "group-hover:bg-white/5"
            )}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[9px] font-space font-black uppercase tracking-[0.15em] transition-all duration-300",
              isActive ? "opacity-100 translate-y-0" : "opacity-60 group-hover:opacity-100"
            )}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_#9945ff]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
