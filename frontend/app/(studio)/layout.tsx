'use client';

import { useEffect } from 'react';
import { StudioAuthProvider } from "@/components/studio/auth-provider";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Disable default browser context menu globally in studio
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <StudioAuthProvider>
      <div className="min-h-screen bg-[#0a0a0b]">
        {children}
      </div>
    </StudioAuthProvider>
  );
}
