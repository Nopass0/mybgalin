'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useStudioAuth } from '@/hooks/useStudioAuth';

function SteamAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, loadProjects } = useStudioAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL params (sent by backend after Steam auth)
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setErrorMessage(error);
          return;
        }

        if (!token) {
          setStatus('error');
          setErrorMessage('No authentication token received');
          return;
        }

        // Store token
        localStorage.setItem('studio_token', token);

        // Fetch user info
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const response = await fetch(`${API_BASE}/studio/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }

        const data = await response.json();
        setUser(data.user);
        await loadProjects();

        setStatus('success');

        // Redirect to studio after short delay
        setTimeout(() => {
          router.push('/studio');
        }, 1500);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router, setUser, loadProjects]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 p-8 text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            <h2 className="text-xl font-semibold text-white">
              Authenticating with Steam...
            </h2>
            <p className="text-white/40">Please wait while we verify your account</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <CheckCircle className="w-16 h-16 text-green-500" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white">
              Authentication Successful!
            </h2>
            <p className="text-white/40">Redirecting to CS2 Skin Studio...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <XCircle className="w-16 h-16 text-red-500" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white">
              Authentication Failed
            </h2>
            <p className="text-red-400">{errorMessage}</p>
            <button
              onClick={() => router.push('/studio')}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              Back to Studio
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function SteamAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        </div>
      }
    >
      <SteamAuthCallbackContent />
    </Suspense>
  );
}
