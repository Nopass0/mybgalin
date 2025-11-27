import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SteamUser, StudioProject } from '@/types/studio';

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
// For redirects (need direct backend URL since window.location doesn't go through rewrites)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const useStudioAuth = create<StudioAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      projects: [],

      login: () => {
        // Redirect to Steam OpenID login - must use direct backend URL for page redirects
        const returnUrl = encodeURIComponent(window.location.origin + '/studio/auth/callback');
        window.location.href = `${BACKEND_URL}/api/studio/auth/steam?return_url=${returnUrl}`;
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
            set({ user: data.user, isAuthenticated: true, isLoading: false });
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
            // Filter out any undefined/null projects and ensure each has required fields
            const validProjects = (data.projects || []).filter(
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
        const newProject = data.project;

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

        const response = await fetch(`${API_BASE}/studio/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(project),
        });

        if (!response.ok) {
          throw new Error('Failed to update project');
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
