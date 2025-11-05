import { create } from 'zustand';
import api from '@/lib/axios';
import type {
  ApiResponse,
  SearchStatus,
  VacancyWithResponse,
  JobStats,
  UpdateSearchSettingsRequest,
  JobSearchSettings,
} from '@/lib/types';

interface JobsState {
  searchStatus: SearchStatus | null;
  vacancies: VacancyWithResponse[];
  stats: JobStats | null;
  isLoading: boolean;
  error: string | null;

  fetchSearchStatus: () => Promise<void>;
  fetchVacancies: () => Promise<void>;
  fetchVacanciesByStatus: (status: string) => Promise<void>;
  fetchVacancyDetails: (id: number) => Promise<VacancyWithResponse | null>;
  fetchStats: () => Promise<void>;

  startSearch: () => Promise<void>;
  stopSearch: () => Promise<void>;
  updateSettings: (data: UpdateSearchSettingsRequest) => Promise<void>;
  ignoreVacancy: (id: number) => Promise<void>;

  getHHAuthUrl: () => Promise<string>;
}

export const useJobs = create<JobsState>((set, get) => ({
  searchStatus: null,
  vacancies: [],
  stats: null,
  isLoading: false,
  error: null,

  fetchSearchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<SearchStatus>>('/jobs/search/status');
      if (response.data.success && response.data.data) {
        set({ searchStatus: response.data.data, isLoading: false });
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message
      });
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

  getHHAuthUrl: async () => {
    try {
      const response = await api.get<string>('/jobs/auth/hh');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
}));
