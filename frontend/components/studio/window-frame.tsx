/**
 * Window Frame Component
 *
 * Custom window frame for the Tauri desktop application.
 * Provides native-like window controls for the CS2 Skin Studio.
 *
 * Features:
 * - Custom title bar with app branding
 * - Window control buttons (minimize, maximize, close)
 * - Draggable title bar region
 * - Tauri API integration for window management
 * - Fallback for web browser environment
 *
 * @module components/studio/window-frame
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

// Check if running in Tauri - only check at runtime
const checkIsTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

// Type-safe accessor for Tauri global API
const getTauriInternals = () => {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).__TAURI_INTERNALS__ || null;
};

interface WindowFrameProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function WindowFrame({ children, title = 'CS2 Skin Studio', className }: WindowFrameProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const tauriAvailable = checkIsTauri();
    setIsTauri(tauriAvailable);
  }, []);

  const invokeCommand = async (command: string) => {
    const internals = getTauriInternals();
    if (!internals?.invoke) return null;
    try {
      return await internals.invoke(command);
    } catch (e) {
      console.error(`Failed to invoke ${command}:`, e);
      return null;
    }
  };

  const handleMinimize = async () => {
    if (!isTauri) return;
    await invokeCommand('minimize_window');
  };

  const handleMaximize = async () => {
    if (!isTauri) return;
    await invokeCommand('maximize_window');
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    if (!isTauri) return;
    await invokeCommand('close_window');
  };

  const handleToggleFullscreen = async () => {
    if (!isTauri) return;
    await invokeCommand('toggle_fullscreen');
    setIsFullscreen(!isFullscreen);
  };

  // Don't render custom frame if not in Tauri
  if (!isTauri) {
    return <>{children}</>;
  }

  return (
    <div className={cn('flex flex-col h-screen bg-zinc-950', className)}>
      {/* Custom Title Bar */}
      <div
        className="flex items-center justify-between h-8 bg-zinc-900 border-b border-zinc-800 select-none"
        data-tauri-drag-region
      >
        {/* App Icon and Title */}
        <div className="flex items-center gap-2 px-3" data-tauri-drag-region>
          <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-500 to-red-600" />
          <span className="text-xs font-medium text-zinc-300" data-tauri-drag-region>
            {title}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center">
          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center justify-center w-10 h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Minimize */}
          <button
            onClick={handleMinimize}
            className="flex items-center justify-center w-10 h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={handleMaximize}
            className="flex items-center justify-center w-10 h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <div className="w-3 h-3 border border-current relative">
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t border-r border-current" />
              </div>
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-10 h-8 text-zinc-400 hover:text-white hover:bg-red-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Tauri API wrapper for frontend use
export const TauriAPI = {
  get isAvailable() {
    return checkIsTauri();
  },

  async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
    const internals = getTauriInternals();
    if (!internals?.invoke) return null;
    try {
      return await internals.invoke(command, args);
    } catch (e) {
      console.error(`Failed to invoke ${command}:`, e);
      return null;
    }
  },

  async readFile(path: string): Promise<Uint8Array | null> {
    const result = await this.invoke<number[]>('read_file', { path });
    return result ? new Uint8Array(result) : null;
  },

  async writeFile(path: string, contents: Uint8Array): Promise<boolean> {
    const result = await this.invoke('write_file', { path, contents: Array.from(contents) });
    return result !== null;
  },

  async listDirectory(path: string): Promise<unknown[] | null> {
    return this.invoke('list_directory', { path });
  },

  async saveProject(id: string, name: string, data: string, thumbnail?: string): Promise<unknown> {
    return this.invoke('save_project', { id, name, data, thumbnail });
  },

  async loadProject(id: string): Promise<string | null> {
    return this.invoke('load_project', { id });
  },

  async listProjects(): Promise<unknown[] | null> {
    return this.invoke('list_projects');
  },

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.invoke('delete_project', { id });
    return result !== null;
  },

  async exportImage(path: string, data: string, format: string): Promise<boolean> {
    const result = await this.invoke('export_image', { path, data, format });
    return result !== null;
  },

  async getSteamAuthUrl(): Promise<string | null> {
    return this.invoke('get_steam_auth_url');
  },

  async getUserInfo(): Promise<unknown | null> {
    const result = await this.invoke<string | null>('get_user_info');
    return result ? JSON.parse(result) : null;
  },

  async isAuthenticated(): Promise<boolean> {
    return (await this.invoke<boolean>('is_authenticated')) ?? false;
  },

  async logout(): Promise<boolean> {
    const result = await this.invoke('logout');
    return result !== null;
  },

  async getSettings(): Promise<unknown | null> {
    return this.invoke('get_settings');
  },

  async saveSettings(settings: unknown): Promise<boolean> {
    const result = await this.invoke('save_settings', { settings });
    return result !== null;
  },

  async getSystemInfo(): Promise<unknown | null> {
    return this.invoke('get_system_info');
  },

  async checkGpuSupport(): Promise<boolean> {
    return (await this.invoke<boolean>('check_gpu_support')) ?? false;
  },
};

export default WindowFrame;
