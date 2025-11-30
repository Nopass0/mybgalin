/**
 * Console Hook
 *
 * Manages server console operations for the admin panel.
 * Handles command execution, system info, and logs.
 *
 * @module hooks/useConsole
 */

import { create } from 'zustand';
import api from '@/lib/axios';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exit_code: number | null;
  execution_time_ms: number;
  success: boolean;
  timed_out: boolean;
}

export interface MemoryInfo {
  total_mb: number;
  used_mb: number;
  free_mb: number;
  usage_percent: number;
}

export interface DiskInfo {
  total_gb: number;
  used_gb: number;
  free_gb: number;
  usage_percent: number;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptime_seconds: number;
  load_average: [number, number, number];
  memory: MemoryInfo;
  disk: DiskInfo;
  cpu_count: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_mb: number;
  status: string;
}

export interface ServerLogs {
  logs: string[];
  total_lines: number;
}

export interface HistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: Date;
}

interface ConsoleState {
  systemInfo: SystemInfo | null;
  processes: ProcessInfo[];
  logs: ServerLogs | null;
  services: string[];
  commandHistory: HistoryEntry[];
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;

  fetchSystemInfo: () => Promise<void>;
  fetchProcesses: () => Promise<void>;
  fetchLogs: (lines?: number, service?: string) => Promise<void>;
  fetchServices: () => Promise<void>;
  executeCommand: (command: string, timeout?: number) => Promise<CommandResult | null>;
  clearHistory: () => void;
  clearError: () => void;
}

export const useConsole = create<ConsoleState>((set, get) => ({
  systemInfo: null,
  processes: [],
  logs: null,
  services: [],
  commandHistory: [],
  isLoading: false,
  isExecuting: false,
  error: null,

  fetchSystemInfo: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<SystemInfo>('/console/system');
      set({ systemInfo: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch system info'
      });
    }
  },

  fetchProcesses: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<ProcessInfo[]>('/console/processes');
      set({ processes: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch processes'
      });
    }
  },

  fetchLogs: async (lines?: number, service?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (lines) params.append('lines', lines.toString());
      if (service) params.append('service', service);
      const url = `/console/logs${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get<ServerLogs>(url);
      set({ logs: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch logs'
      });
    }
  },

  fetchServices: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<string[]>('/console/services');
      set({ services: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch services'
      });
    }
  },

  executeCommand: async (command: string, timeout?: number) => {
    set({ isExecuting: true, error: null });
    try {
      const response = await api.post<CommandResult>('/console/execute', {
        command,
        timeout_secs: timeout,
      });
      const result = response.data;

      set((state) => ({
        commandHistory: [
          ...state.commandHistory,
          { command, result, timestamp: new Date() }
        ],
        isExecuting: false
      }));

      return result;
    } catch (error: any) {
      set({
        isExecuting: false,
        error: error.response?.data?.error || error.message || 'Command execution failed'
      });
      return null;
    }
  },

  clearHistory: () => set({ commandHistory: [] }),
  clearError: () => set({ error: null }),
}));
