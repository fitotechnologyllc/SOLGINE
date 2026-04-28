'use client';

import { useAuth } from "@/components/providers/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'projectOwner' || user.role === 'admin') {
        router.push('/studio/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) return <LoadingScreen />;

  if (!user) return <AuthGate />;

  return <LoadingScreen />;
}
