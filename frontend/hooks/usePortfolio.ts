import { create } from 'zustand';
import api from '@/lib/axios';
import type {
  ApiResponse,
  FullPortfolio,
  PortfolioAbout,
  PortfolioExperience,
  PortfolioSkill,
  PortfolioContact,
  PortfolioCase,
  CreateAboutRequest,
  UpdateAboutRequest,
  CreateExperienceRequest,
  UpdateExperienceRequest,
  CreateSkillRequest,
  UpdateSkillRequest,
  CreateContactRequest,
  UpdateContactRequest,
  CreateCaseRequest,
} from '@/lib/types';

interface PortfolioState {
  portfolio: FullPortfolio | null;
  isLoading: boolean;
  error: string | null;

  fetchPortfolio: () => Promise<void>;

  // About
  createAbout: (data: CreateAboutRequest) => Promise<void>;
  updateAbout: (id: number, data: UpdateAboutRequest) => Promise<void>;
  deleteAbout: () => Promise<void>;

  // Experience
  createExperience: (data: CreateExperienceRequest) => Promise<void>;
  updateExperience: (id: number, data: UpdateExperienceRequest) => Promise<void>;
  deleteExperience: (id: number) => Promise<void>;

  // Skills
  createSkill: (data: CreateSkillRequest) => Promise<void>;
  updateSkill: (id: number, data: UpdateSkillRequest) => Promise<void>;
  deleteSkill: (id: number) => Promise<void>;

  // Contacts
  createContact: (data: CreateContactRequest) => Promise<void>;
  updateContact: (id: number, data: UpdateContactRequest) => Promise<void>;
  deleteContact: (id: number) => Promise<void>;

  // Cases
  createCase: (data: CreateCaseRequest) => Promise<void>;
  deleteCase: (id: number) => Promise<void>;
}

export const usePortfolio = create<PortfolioState>((set, get) => ({
  portfolio: null,
  isLoading: false,
  error: null,

  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ApiResponse<FullPortfolio>>('/portfolio');
      if (response.data.success && response.data.data) {
        set({ portfolio: response.data.data, isLoading: false });
      } else {
        throw new Error(response.data.error || 'Failed to fetch portfolio');
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch portfolio'
      });
    }
  },

  // About
  createAbout: async (data: CreateAboutRequest) => {
    try {
      const response = await api.post<ApiResponse<PortfolioAbout>>('/portfolio/about', data);
      if (response.data.success) {
        await get().fetchPortfolio();
      }
    } catch (error: any) {
      throw error;
    }
  },

  updateAbout: async (id: number, data: UpdateAboutRequest) => {
    try {
      const response = await api.put<ApiResponse<PortfolioAbout>>(`/portfolio/about/${id}`, data);
      if (response.data.success) {
        await get().fetchPortfolio();
      }
    } catch (error: any) {
      throw error;
    }
  },

  deleteAbout: async () => {
    try {
      await api.delete('/portfolio/about');
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  // Experience
  createExperience: async (data: CreateExperienceRequest) => {
    try {
      await api.post('/portfolio/experience', data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  updateExperience: async (id: number, data: UpdateExperienceRequest) => {
    try {
      await api.put(`/portfolio/experience/${id}`, data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  deleteExperience: async (id: number) => {
    try {
      await api.delete(`/portfolio/experience/${id}`);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  // Skills
  createSkill: async (data: CreateSkillRequest) => {
    try {
      await api.post('/portfolio/skills', data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  updateSkill: async (id: number, data: UpdateSkillRequest) => {
    try {
      await api.put(`/portfolio/skills/${id}`, data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  deleteSkill: async (id: number) => {
    try {
      await api.delete(`/portfolio/skills/${id}`);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  // Contacts
  createContact: async (data: CreateContactRequest) => {
    try {
      await api.post('/portfolio/contacts', data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  updateContact: async (id: number, data: UpdateContactRequest) => {
    try {
      await api.put(`/portfolio/contacts/${id}`, data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  deleteContact: async (id: number) => {
    try {
      await api.delete(`/portfolio/contacts/${id}`);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  // Cases
  createCase: async (data: CreateCaseRequest) => {
    try {
      await api.post('/portfolio/cases', data);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },

  deleteCase: async (id: number) => {
    try {
      await api.delete(`/portfolio/cases/${id}`);
      await get().fetchPortfolio();
    } catch (error: any) {
      throw error;
    }
  },
}));
