'use client';

import { useState } from 'react';
import { 
  Cpu, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  Terminal, 
  ShieldAlert,
  Loader2,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AIInterface() {
  const [mode, setMode] = useState('builder');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages, mode }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      const assistantMessage = data.choices[0].message;
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: 'builder', label: 'Architect', icon: BrainCircuit, color: 'text-primary' },
    { id: 'player', label: 'Tactician', icon: Bot, color: 'text-secondary' },
    { id: 'developer', label: 'Dev Core', icon: Terminal, color: 'text-tertiary' },
    { id: 'admin', label: 'Auditor', icon: ShieldAlert, color: 'text-red-400' },
  ];

  return (
    <div className="h-screen flex flex-col">
      <header className="p-10 pb-0 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black font-space text-white uppercase tracking-tighter flex items-center gap-4">
            <Cpu className="text-primary animate-pulse" size={40} />
            SOLGINE AI
          </h1>
          <p className="text-zinc-500 font-space font-bold tracking-[0.3em] uppercase text-xs mt-2">Neural Engine Interface</p>
        </div>
        
        <div className="flex gap-2 glass p-1 rounded-2xl">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-space font-bold text-xs uppercase tracking-widest",
                  mode === m.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon size={16} className={m.color} />
                {m.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary neon-glow-purple">
               <Sparkles size={40} />
            </div>
            <div>
              <h2 className="text-xl font-black font-space text-white uppercase">Ready to Initialize</h2>
              <p className="text-zinc-500 text-sm mt-2 font-medium">
                The {modes.find(m => m.id === mode)?.label} sub-routine is active. 
                Ask for economy advice, card balance, or technical implementation details.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[80%]",
            msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "p-6 rounded-[1.5rem] font-medium leading-relaxed",
              msg.role === 'user' 
                ? "bg-primary-gradient text-white shadow-lg" 
                : "glass border-white/10 text-zinc-300"
            )}>
              {msg.content}
            </div>
            <span className="text-[8px] font-black font-space text-zinc-600 uppercase tracking-widest mt-2 px-2">
              {msg.role === 'user' ? 'Input Channel' : 'Neural Echo'}
            </span>
          </div>
        ))}
        
        {loading && (
          <div className="flex items-center gap-3 text-zinc-500 animate-pulse px-6">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-bold font-space uppercase tracking-widest">Processing...</span>
          </div>
        )}
      </div>

      <div className="p-10 pt-0">
        <div className="max-w-4xl mx-auto relative">
          <input 
            type="text" 
            placeholder="Transmit command to SOLGINE AI..."
            className="w-full bg-black/60 border border-white/10 rounded-[2rem] p-6 pl-8 pr-16 text-white font-space focus:border-primary outline-none transition-all shadow-2xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all shadow-lg"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
