'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Play, Library, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/packs', label: 'Packs', icon: Package },
  { href: '/play', label: 'Play', icon: Play },
  { href: '/collection', label: 'Collection', icon: Library },
  { href: '/market', label: 'Market', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg h-20 glass rounded-[2.5rem] flex items-center justify-around px-4 z-50 border border-white/10 shadow-2xl">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300",
              isActive ? "text-primary scale-110" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <div className={cn(
              "p-2 rounded-2xl transition-all",
              isActive && "bg-primary/10 neon-glow-purple"
            )}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-space font-bold uppercase tracking-widest">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
