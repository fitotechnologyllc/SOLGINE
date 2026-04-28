import { BottomNav } from "@/components/navigation/BottomNav";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-32 bg-background">
      {children}
      <BottomNav />
    </div>
  );
}
