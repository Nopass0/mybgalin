/**
 * Admin Authentication Hook
 *
 * Manages admin authentication using Telegram OTP verification.
 * Used for the admin panel access control.
 *
 * @module hooks/useAuth
 */

import { create } from 'zustand';
import api from '@/lib/axios';
import type { ApiResponse, RequestOtpRequest, RequestOtpResponse, VerifyOtpRequest, VerifyOtpResponse } from '@/lib/types';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  requestOtp: (data?: RequestOtpRequest) => Promise<void>;
  verifyOtp: (code: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: () => {
    const token = localStorage.getItem('auth_token');
    set({ token, isAuthenticated: !!token });
  },

  requestOtp: async (data?: RequestOtpRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<RequestOtpResponse>>('/auth/request-otp', data || {});
      if (response.data.success) {
        set({ isLoading: false });
      } else {
        throw new Error(response.data.error || 'Failed to request OTP');
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to request OTP'
      });
      throw error;
    }
  },

  verifyOtp: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<ApiResponse<VerifyOtpResponse>>('/auth/verify-otp', { code });
      if (response.data.success && response.data.data?.token) {
        const token = response.data.data.token;
        localStorage.setItem('auth_token', token);
        set({ token, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        set({ isLoading: false, error: response.data.data?.message || 'Invalid OTP' });
        return false;
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to verify OTP'
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ token: null, isAuthenticated: false });
  },
}));
