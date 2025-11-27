'use client';

import { StudioAuthProvider } from "@/components/studio/auth-provider";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioAuthProvider>
      <div className="min-h-screen bg-[#0a0a0b]">
        {children}
      </div>
    </StudioAuthProvider>
  );
}
