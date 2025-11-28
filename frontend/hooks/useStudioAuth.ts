/**
 * Studio Authentication Hook
 *
 * Manages user authentication state for the CS2 Skin Studio.
 * Uses Steam OpenID for login and JWT tokens for API access.
 *
 * Features:
 * - Steam login/logout
 * - JWT token management
 * - Project CRUD operations
 * - Persistent auth state
 *
 * @module hooks/useStudioAuth
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SteamUser, StudioProject } from '@/types/studio';

/** Authentication state interface */
interface StudioAuthState {
  user: SteamUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  projects: StudioProject[];

  // Actions
  login: () => void;
  logout: () => void;
  setUser: (user: SteamUser | null) => void;
  initialize: () => void;

  // Projects
  loadProjects: () => Promise<void>;
  createProject: (name: string, type: 'sticker', stickerType: string) => Promise<StudioProject>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (project: StudioProject) => Promise<void>;
}

// For fetch requests (proxied through Next.js rewrites)
const API_BASE = '/api';

/**
 * Get the backend URL for direct redirects (not API calls)
 * Must work both on localhost and production
 */
const getBackendUrl = (): string => {
  // Server-side: use env var or localhost
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  }

  // Client-side: determine based on current hostname
  const hostname = window.location.hostname;

  // Production domains
  if (hostname === 'bgalin.ru' || hostname.endsWith('.bgalin.ru')) {
    return 'https://bgalin.ru';
  }

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }

  // Other domains: try to use same origin with port 3001
  // or fallback to env var
  return process.env.NEXT_PUBLIC_BACKEND_URL || `${window.location.protocol}//${hostname}:3001`;
};

export const useStudioAuth = create<StudioAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      projects: [],

      login: () => {
        // Redirect to Steam OpenID login - must use direct backend URL for page redirects
        const backendUrl = getBackendUrl();
        const returnUrl = encodeURIComponent(window.location.origin + '/studio/auth/callback');
        window.location.href = `${backendUrl}/api/studio/auth/steam?return_url=${returnUrl}`;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, projects: [] });
        localStorage.removeItem('studio_token');
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      initialize: async () => {
        set({ isLoading: true });

        const token = localStorage.getItem('studio_token');
        if (!token) {
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/studio/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            // Backend returns ApiResponse: { success, data: { user }, error }
            const user = data.data?.user || data.user;
            set({ user, isAuthenticated: true, isLoading: false });
            // Load projects after auth
            get().loadProjects();
          } else {
            localStorage.removeItem('studio_token');
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },

      loadProjects: async () => {
        const token = localStorage.getItem('studio_token');
        if (!token) return;

        try {
          const response = await fetch(`${API_BASE}/studio/projects`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            // Backend returns ApiResponse: { success, data: { projects }, error }
            const projectsArray = data.data?.projects || data.projects || [];
            // Filter out any undefined/null projects and ensure each has required fields
            const validProjects = projectsArray.filter(
              (p: unknown) => p && typeof p === 'object' && 'id' in p
            );
            set({ projects: validProjects });
          }
        } catch (error) {
          console.error('Failed to load projects:', error);
        }
      },

      createProject: async (name, type, stickerType) => {
        const token = localStorage.getItem('studio_token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE}/studio/projects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, type, stickerType }),
        });

        if (!response.ok) {
          throw new Error('Failed to create project');
        }

        const data = await response.json();
        // Backend returns ApiResponse: { success, data: { project }, error }
        const newProject = data.data?.project || data.project;

        if (!newProject || !newProject.id) {
          console.error('Invalid project response:', data);
          throw new Error('Failed to create project: invalid response');
        }

        set((state) => ({
          projects: [newProject, ...state.projects],
        }));

        return newProject;
      },

      deleteProject: async (id) => {
        const token = localStorage.getItem('studio_token');
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${API_BASE}/studio/projects/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete project');
        }

        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      updateProject: async (project) => {
        const token = localStorage.getItem('studio_token');
        if (!token) throw new Error('Not authenticated');

        // Backend expects { name?, thumbnail?, data? } where data is a JSON string
        const updatePayload = {
          name: project.name,
          thumbnail: project.thumbnail,
          data: typeof project.data === 'string' ? project.data : JSON.stringify(project.data),
        };

        const response = await fetch(`${API_BASE}/studio/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update project');
        }

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === project.id ? project : p
          ),
        }));
      },
    }),
    {
      name: 'studio-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
