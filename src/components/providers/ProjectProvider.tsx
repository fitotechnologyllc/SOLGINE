'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from '@/lib/projects';

interface ProjectContextType {
  activeProject: Project | null;
  projectId: string;
  setProjectId: (id: string) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Default to 'solgine-core'
  const [projectId, setProjectIdState] = useState<string>(searchParams.get('projectId') || 'solgine-core');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const pId = searchParams.get('projectId') || 'solgine-core';
    setProjectIdState(pId);
  }, [searchParams]);

  useEffect(() => {
    if (!projectId) return;

    setIsLoading(true);
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        setActiveProject({ id: snap.id, ...snap.data() } as any);
      } else {
        // If it doesn't exist, fallback to core
        if (projectId !== 'solgine-core') {
          setProjectId('solgine-core');
        }
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [projectId]);

  const setProjectId = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('projectId', id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <ProjectContext.Provider value={{ activeProject, projectId, setProjectId, isLoading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
