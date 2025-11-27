'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useStudioEditor } from './useStudioEditor';
import { useStudioAuth } from './useStudioAuth';

/**
 * Auto-save interval in milliseconds (30 seconds)
 */
const AUTO_SAVE_INTERVAL = 30000;

/**
 * Debounce delay for changes before triggering auto-save (2 seconds)
 */
const DEBOUNCE_DELAY = 2000;

/**
 * Custom hook for auto-saving project state
 * Saves project data to backend periodically and on changes
 */
export function useAutoSave(projectId: string | null) {
  const {
    project,
    layers,
    zoom,
    panX,
    panY,
    smartMaterials,
    smartMasks,
    environmentSettings,
  } = useStudioEditor();
  const { updateProject } = useStudioAuth();

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refs for tracking changes
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Generate serialized project data for comparison
   */
  const serializeProjectData = useCallback(() => {
    return JSON.stringify({
      layers,
      zoom,
      panX,
      panY,
      smartMaterials,
      smartMasks,
      environmentSettings,
    });
  }, [layers, zoom, panX, panY, smartMaterials, smartMasks, environmentSettings]);

  /**
   * Save project to backend
   */
  const saveProject = useCallback(async () => {
    if (!projectId || !project || isSaving) return;

    const currentData = serializeProjectData();

    // Skip if no changes
    if (currentData === lastSavedDataRef.current) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Generate thumbnail from canvas
      const thumbnailCanvas = document.querySelector<HTMLCanvasElement>('#main-canvas');
      let thumbnail: string | undefined;

      if (thumbnailCanvas) {
        // Create smaller thumbnail
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 256;
        thumbCanvas.height = 256;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(thumbnailCanvas, 0, 0, 256, 256);
          thumbnail = thumbCanvas.toDataURL('image/png', 0.8);
        }
      }

      // Update project with current state
      const updatedProject = {
        ...project,
        data: {
          ...project.data,
          layers,
          materials: smartMaterials,
          smartMasks,
          environment: environmentSettings,
          width: project.data?.width || 1024,
          height: project.data?.height || 1024,
          editorState: {
            zoom,
            panX,
            panY,
          },
        },
        thumbnail,
        updatedAt: new Date().toISOString(),
      };

      await updateProject(updatedProject as typeof project);

      lastSavedDataRef.current = currentData;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      console.log('[AutoSave] Project saved successfully');
    } catch (error) {
      console.error('[AutoSave] Failed to save project:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, project, isSaving, serializeProjectData, layers, zoom, panX, panY, smartMaterials, smartMasks, environmentSettings, updateProject]);

  /**
   * Schedule a debounced save
   */
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setHasUnsavedChanges(true);

    saveTimeoutRef.current = setTimeout(() => {
      saveProject();
    }, DEBOUNCE_DELAY);
  }, [saveProject]);

  /**
   * Manual save trigger
   */
  const manualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveProject();
  }, [saveProject]);

  // Watch for changes and schedule save
  useEffect(() => {
    if (!projectId) return;

    const currentData = serializeProjectData();
    if (currentData !== lastSavedDataRef.current) {
      scheduleSave();
    }
  }, [layers, zoom, panX, panY, smartMaterials, smartMasks, environmentSettings, projectId, serializeProjectData, scheduleSave]);

  // Set up periodic auto-save
  useEffect(() => {
    if (!projectId) return;

    intervalRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        saveProject();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [projectId, hasUnsavedChanges, saveProject]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        // Attempt to save
        saveProject();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    saveError,
    save: manualSave,
  };
}

/**
 * Hook for saving to localStorage as backup
 */
export function useLocalBackup(projectId: string | null) {
  const { layers, zoom, panX, panY } = useStudioEditor();

  const saveToLocal = useCallback(() => {
    if (!projectId) return;

    const backupData = {
      layers,
      editorState: { zoom, panX, panY },
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(`studio_backup_${projectId}`, JSON.stringify(backupData));
    } catch (error) {
      console.warn('[LocalBackup] Failed to save:', error);
    }
  }, [projectId, layers, zoom, panX, panY]);

  const loadFromLocal = useCallback(() => {
    if (!projectId) return null;

    try {
      const data = localStorage.getItem(`studio_backup_${projectId}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('[LocalBackup] Failed to load:', error);
    }

    return null;
  }, [projectId]);

  const clearLocal = useCallback(() => {
    if (!projectId) return;
    localStorage.removeItem(`studio_backup_${projectId}`);
  }, [projectId]);

  // Auto-backup every 10 seconds
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(saveToLocal, 10000);
    return () => clearInterval(interval);
  }, [projectId, saveToLocal]);

  return {
    saveToLocal,
    loadFromLocal,
    clearLocal,
  };
}
