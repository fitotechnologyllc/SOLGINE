'use client';

import { useState, useEffect } from 'react';
import { Bell, Package, Sparkles, ShoppingCart, Target, Users, X, Check } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { markAsRead } from '@/lib/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function NotificationFeed() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(docs);
      setUnreadCount(docs.filter((n: any) => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pack_opened': return <Package size={16} className="text-blue-400" />;
      case 'rare_pull': return <Sparkles size={16} className="text-amber-400" />;
      case 'item_sold': return <ShoppingCart size={16} className="text-green-400" />;
      case 'item_bought': return <ShoppingCart size={16} className="text-primary" />;
      case 'mission_completed': return <Target size={16} className="text-secondary" />;
      case 'referral_reward': return <Users size={16} className="text-purple-400" />;
      default: return <Bell size={16} className="text-zinc-400" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
      >
        <Bell size={20} className={cn("transition-colors", unreadCount > 0 ? "text-primary" : "text-zinc-400 group-hover:text-white")} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 max-h-[480px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xs font-black font-space text-white uppercase tracking-widest">Notifications</h3>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        if (n.link) setIsOpen(false);
                      }}
                      className={cn(
                        "p-4 border-b border-white/5 flex gap-4 transition-colors relative cursor-pointer",
                        !n.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white/5"
                      )}
                    >
                      {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      <div className="mt-1 flex-shrink-0">{getIcon(n.type)}</div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-tight leading-tight">{n.title}</p>
                        <p className="text-[10px] text-zinc-500 leading-snug">{n.message}</p>
                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                          {n.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center space-y-3">
                    <Bell size={32} className="text-zinc-800 mx-auto" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Grid is silent</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-white/5 text-center bg-white/[0.01]">
                   <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
                     Mark all as read
                   </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
