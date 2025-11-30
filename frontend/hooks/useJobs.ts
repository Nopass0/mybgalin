/**
 * Jobs Hook
 *
 * Manages HH.ru job search integration for the admin panel.
 * Handles job searches, application tracking, and auto-apply features.
 *
 * @module hooks/useJobs
 */

import { create } from 'zustand';
import api from '@/lib/axios';
import type {
  ApiResponse,
  SearchStatus,
  VacancyWithResponse,
  JobStats,
  UpdateSearchSettingsRequest,
  JobSearchTag,
  ChatWithMessages,
  ActivityLogEntry,
  DailyStats,
  AITagsResponse,
} from '@/lib/types';

interface JobsState {
  searchStatus: SearchStatus | null;
  vacancies: VacancyWithResponse[];
  stats: JobStats | null;
  tags: JobSearchTag[];
  chats: ChatWithMessages[];
  activity: ActivityLogEntry[];
  dailyStats: DailyStats[];
  isLoading: boolean;
  error: string | null;

  fetchSearchStatus: () => Promise<void>;
  fetchVacancies: () => Promise<void>;
  fetchVacanciesByStatus: (status: string) => Promise<void>;
  fetchVacancyDetails: (id: number) => Promise<VacancyWithResponse | null>;
  fetchStats: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchChats: () => Promise<void>;
  fetchActivity: (limit?: number) => Promise<void>;
  fetchDailyStats: (days?: number) => Promise<void>;

  startSearch: () => Promise<void>;
  stopSearch: () => Promise<void>;
  updateSettings: (data: UpdateSearchSettingsRequest) => Promise<void>;
  ignoreVacancy: (id: number) => Promise<void>;

  generateTags: () => Promise<AITagsResponse | null>;
  toggleTag: (id: number) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;

  getHHAuthUrl: () => Promise<string>;

  // Auto-refresh для real-time обновлений
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

let refreshInterval: NodeJS.Timeout | null = null;

export const useJobs = create<JobsState>((set, get) => ({
  searchStatus: null,
  vacancies: [],
  stats: null,
  tags: [],
  chats: [],
  activity: [],
  dailyStats: [],
  isLoading: false,
  error: null,

  fetchSearchStatus: async () => {
    try {
      const response = await api.get<ApiResponse<SearchStatus>>('/jobs/search/status');
      if (response.data.success && response.data.data) {
        set({ searchStatus: response.data.data });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.error || error.message });
    }
  },

  fetchVacancies: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<VacancyWithResponse[]>>('/jobs/vacancies');
      if (response.data.success && response.data.data) {
        set({ vacancies: response.data.data, isLoading: false });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message
      });
    }
  },

  fetchVacanciesByStatus: async (status: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<VacancyWithResponse[]>>(`/jobs/vacancies/status/${status}`);
      if (response.data.success && response.data.data) {
        set({ vacancies: response.data.data, isLoading: false });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message
      });
    }
  },

  fetchVacancyDetails: async (id: number) => {
    try {
      const response = await api.get<ApiResponse<VacancyWithResponse>>(`/jobs/vacancies/${id}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      return null;
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get<ApiResponse<JobStats>>('/jobs/stats');
      if (response.data.success && response.data.data) {
        set({ stats: response.data.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  },

  fetchTags: async () => {
    try {
      const response = await api.get<ApiResponse<JobSearchTag[]>>('/jobs/tags');
      if (response.data.success && response.data.data) {
        set({ tags: response.data.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch tags:', error);
    }
  },

  fetchChats: async () => {
    try {
      const response = await api.get<ApiResponse<ChatWithMessages[]>>('/jobs/chats');
      if (response.data.success && response.data.data) {
        set({ chats: response.data.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch chats:', error);
    }
  },

  fetchActivity: async (limit = 50) => {
    try {
      const response = await api.get<ApiResponse<ActivityLogEntry[]>>(`/jobs/activity?limit=${limit}`);
      if (response.data.success && response.data.data) {
        set({ activity: response.data.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch activity:', error);
    }
  },

  fetchDailyStats: async (days = 30) => {
    try {
      const response = await api.get<ApiResponse<DailyStats[]>>(`/jobs/stats/daily?days=${days}`);
      if (response.data.success && response.data.data) {
        set({ dailyStats: response.data.data });
      }
    } catch (error: any) {
      console.error('Failed to fetch daily stats:', error);
    }
  },

  startSearch: async () => {
    try {
      await api.post('/jobs/search/start');
      await get().fetchSearchStatus();
    } catch (error: any) {
      throw error;
    }
  },

  stopSearch: async () => {
    try {
      await api.post('/jobs/search/stop');
      await get().fetchSearchStatus();
    } catch (error: any) {
      throw error;
    }
  },

  updateSettings: async (data: UpdateSearchSettingsRequest) => {
    try {
      await api.put('/jobs/search/settings', data);
      await get().fetchSearchStatus();
    } catch (error: any) {
      throw error;
    }
  },

  ignoreVacancy: async (id: number) => {
    try {
      await api.post(`/jobs/vacancies/${id}/ignore`);
      await get().fetchVacancies();
    } catch (error: any) {
      throw error;
    }
  },

  generateTags: async () => {
    try {
      const response = await api.post<ApiResponse<AITagsResponse>>('/jobs/tags/generate');
      if (response.data.success && response.data.data) {
        await get().fetchTags();
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  },

  toggleTag: async (id: number) => {
    try {
      await api.post(`/jobs/tags/${id}/toggle`);
      await get().fetchTags();
    } catch (error: any) {
      throw error;
    }
  },

  deleteTag: async (id: number) => {
    try {
      await api.delete(`/jobs/tags/${id}`);
      await get().fetchTags();
    } catch (error: any) {
      throw error;
    }
  },

  getHHAuthUrl: async () => {
    try {
      const response = await api.get<ApiResponse<string>>('/jobs/auth/hh');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Failed to get auth URL');
    } catch (error: any) {
      throw error;
    }
  },

  startAutoRefresh: () => {
    if (refreshInterval) return;

    // Обновляем данные каждые 10 секунд для real-time эффекта
    refreshInterval = setInterval(async () => {
      const { fetchStats, fetchActivity, fetchSearchStatus, fetchChats } = get();
      await Promise.all([
        fetchStats(),
        fetchActivity(20),
        fetchSearchStatus(),
        fetchChats(),
      ]);
    }, 10000);
  },

  stopAutoRefresh: () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  },
}));
