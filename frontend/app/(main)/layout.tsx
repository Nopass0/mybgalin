'use client';

import { SidebarNav } from "@/components/sidebar-nav";
import { StudioRedirectHandler } from "@/components/studio-redirect-handler";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <StudioRedirectHandler />
      <div className="relative flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 md:pl-64">
          <div className="container mx-auto p-6 pt-20 md:pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
