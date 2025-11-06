'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout, initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated and not on login page
    if (!isLoading && !isAuthenticated && pathname !== '/admin') {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show login page content if on /admin route
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  // Show protected content with logout button
  if (isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
        {children}
      </div>
    );
  }

  // Redirecting to login...
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
