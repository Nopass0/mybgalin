/**
 * Database Hook
 *
 * Manages database operations for the admin panel.
 * Handles table browsing, queries, and statistics.
 *
 * @module hooks/useDatabase
 */

import { create } from 'zustand';
import api from '@/lib/axios';

export interface TableInfo {
  name: string;
  row_count: number;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  column_type: string;
  notnull: boolean;
  default_value: string | null;
  pk: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  row_count: number;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  row_count: number;
  execution_time_ms: number;
}

export interface ColumnFilter {
  column: string;
  operator: string;
  value?: string;
}

export interface TableDataRequest {
  table: string;
  page?: number;
  page_size?: number;
  sort_column?: string;
  sort_direction?: string;
  filters?: ColumnFilter[];
}

export interface TableDataResult {
  columns: ColumnInfo[];
  rows: any[][];
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DatabaseStats {
  total_tables: number;
  total_rows: number;
  database_size_bytes: number;
  tables: TableInfo[];
}

interface DatabaseState {
  tables: TableInfo[];
  currentTable: TableSchema | null;
  tableData: TableDataResult | null;
  queryResult: QueryResult | null;
  stats: DatabaseStats | null;
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;

  fetchTables: () => Promise<void>;
  fetchTableSchema: (tableName: string) => Promise<void>;
  fetchTableData: (request: TableDataRequest) => Promise<void>;
  executeQuery: (query: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  clearQueryResult: () => void;
}

export const useDatabase = create<DatabaseState>((set, get) => ({
  tables: [],
  currentTable: null,
  tableData: null,
  queryResult: null,
  stats: null,
  isLoading: false,
  isExecuting: false,
  error: null,

  fetchTables: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<TableInfo[]>('/database/tables');
      set({ tables: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch tables'
      });
    }
  },

  fetchTableSchema: async (tableName: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<TableSchema>(`/database/tables/${tableName}/schema`);
      set({ currentTable: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch table schema'
      });
    }
  },

  fetchTableData: async (request: TableDataRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<TableDataResult>('/database/tables/data', request);
      set({ tableData: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch table data'
      });
    }
  },

  executeQuery: async (query: string) => {
    set({ isExecuting: true, error: null, queryResult: null });
    try {
      const response = await api.post<QueryResult>('/database/query', { query });
      set({ queryResult: response.data, isExecuting: false });
    } catch (error: any) {
      set({
        isExecuting: false,
        error: error.response?.data?.error || error.message || 'Query execution failed'
      });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<DatabaseStats>('/database/stats');
      set({ stats: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch stats'
      });
    }
  },

  clearError: () => set({ error: null }),
  clearQueryResult: () => set({ queryResult: null }),
}));
