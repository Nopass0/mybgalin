'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function StudioRedirectHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if already on studio or admin pages
    if (pathname?.startsWith('/studio') || pathname?.startsWith('/admin')) {
      return;
    }

    // Check for redirect flags
    const alwaysStudio = localStorage.getItem('always_studio');
    const studioRedirect = localStorage.getItem('studio_redirect');

    if (alwaysStudio === 'true' || studioRedirect === 'true') {
      // If one-time redirect, clear the flag
      if (studioRedirect === 'true') {
        localStorage.removeItem('studio_redirect');
      }

      // Redirect to studio
      router.push('/studio');
    }
  }, [pathname, router]);

  return null;
}
