'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Layers, 
  PackageSearch, 
  Settings, 
  BarChart3, 
  Cpu,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { ProjectSelector } from './ProjectSelector';

const studioItems = [
  { href: '/studio/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio/cards', label: 'Cards', icon: Layers },
  { href: '/studio/packs', label: 'Packs', icon: PackageSearch },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/studio/ai', label: 'AI Builder', icon: Cpu },
  { href: '/studio/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen glass border-r border-white/10 flex flex-col p-6 sticky top-0">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center neon-glow-purple">
          <Cpu className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-black font-space text-white leading-none">SOLGINE</h1>
          <p className="text-[10px] text-primary font-space font-bold tracking-[0.2em] uppercase">Studio</p>
        </div>
      </div>

      <ProjectSelector />

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {studioItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary border-l-4 border-primary" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
              )}
            >
              <Icon size={20} />
              <span className="font-space font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-white/5">
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={20} />
          <span className="font-space font-medium">Exit Studio</span>
        </button>
      </div>
    </aside>
  );
};
