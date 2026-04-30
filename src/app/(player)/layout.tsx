import { BottomNav } from "@/components/navigation/BottomNav";
import { PlayerHeader } from "@/components/navigation/PlayerHeader";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pt-20 pb-32 bg-background">
      <PlayerHeader />
      {children}
      <BottomNav />
    </div>
  );
}
