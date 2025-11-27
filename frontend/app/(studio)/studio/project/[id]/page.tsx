'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Loader2,
  Type,
  Sparkles,
  Layers,
  Sun,
  GitBranch,
  Film,
  Palette,
  Brush,
  X,
} from 'lucide-react';
import { useStudioAuth } from '@/hooks/useStudioAuth';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { useHotkeys, useSpaceBarPan } from '@/hooks/useHotkeys';
import { useAutoSave, useLocalBackup } from '@/hooks/useAutoSave';
import { StudioToolbar } from '@/components/studio/toolbar';
import { StudioLayersPanel } from '@/components/studio/layers-panel';
import { StudioColorPicker } from '@/components/studio/color-picker';
import { StudioBrushSettings } from '@/components/studio/brush-settings';
import { ShapeToolPanel } from '@/components/studio/shape-tool-panel';
import { StudioCanvas } from '@/components/studio/canvas';
import { StudioMapTabs } from '@/components/studio/map-tabs';
import { TextToolPanel } from '@/components/studio/text-tool-panel';
import { SmartMasksPanel } from '@/components/studio/smart-masks-panel';
import { EnvironmentPanel } from '@/components/studio/environment-panel';
import { GeneratorsPanel } from '@/components/studio/generators-panel';
import { NodeEditor } from '@/components/studio/node-editor';
import { MaterialsPanel } from '@/components/studio/materials-panel';
import { LenticularEditor } from '@/components/studio/lenticular-editor';
import { ExportDialog } from '@/components/studio/export-dialog';
import { MaterialMapPanel } from '@/components/studio/material-map-panel';
import { CS2RenderPreview } from '@/components/studio/cs2-render-preview';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DEFAULT_ENVIRONMENT, DEFAULT_SMART_MASKS } from '@/types/studio';
import type { SmartMask, SmartMaterial, EnvironmentSettings, LenticularFrame, LenticularSettings, Layer } from '@/types/studio';
import { cn } from '@/lib/utils';

type RightPanelTab = 'default' | 'text' | 'masks' | 'generators' | 'environment' | 'materials' | 'lenticular';

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { isAuthenticated, isLoading: authLoading, projects } = useStudioAuth();
  const {
    project,
    setProject,
    zoom,
    setZoom,
    layers,
    setLayers,
    addLayer,
    activeLayerId,
    undo,
    redo,
    history,
    historyIndex,
    pushHistory,
    // Smart materials from store (for auto-save)
    smartMaterials,
    setSmartMaterials,
    activeMaterialId,
    setActiveMaterialId,
    addMaterial,
    updateMaterial,
    deleteMaterial: deleteMaterialStore,
    duplicateMaterial: duplicateMaterialStore,
    // Smart masks from store
    smartMasks,
    setSmartMasks,
    // Environment from store
    environmentSettings,
    setEnvironmentSettings,
  } = useStudioEditor();

  // Initialize hotkeys for Photoshop-like shortcuts
  useHotkeys();

  // Space bar for temporary hand tool
  const isSpacePanning = useSpaceBarPan();

  // Auto-save functionality
  const {
    lastSaved,
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    saveError,
    save: autoSave
  } = useAutoSave(projectId);

  // Local backup
  const { loadFromLocal, clearLocal } = useLocalBackup(projectId);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [activeMapTab, setActiveMapTab] = useState<'color' | 'normal' | 'metalness' | 'roughness' | 'render'>('color');

  // Panel states
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('default');
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Lenticular state (local - not yet in store)
  const [lenticularFrames, setLenticularFrames] = useState<LenticularFrame[]>([]);
  const [lenticularSettings, setLenticularSettings] = useState<LenticularSettings>({
    frameCount: 8,
    animationType: 'flip',
    transitionType: 'ease',
    loopMode: 'loop',
    fps: 12,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load project
  useEffect(() => {
    if (!authLoading && isAuthenticated && projects.length > 0) {
      const foundProject = projects.find((p) => p.id === projectId);
      if (foundProject) {
        setProject(foundProject);

        // Initialize layers if empty
        if (!foundProject.data?.layers || foundProject.data.layers.length === 0) {
          const bgLayer = addLayer('raster', 'Background');
          pushHistory('Initial state');
        } else {
          setLayers(foundProject.data.layers);
        }

        // Load materials from project data
        if (foundProject.data?.materials) {
          setSmartMaterials(foundProject.data.materials);
        }

        // Load smart masks from project data
        if (foundProject.data?.smartMasks) {
          setSmartMasks(foundProject.data.smartMasks);
        }

        // Load environment settings from project data
        if (foundProject.data?.environment) {
          setEnvironmentSettings(foundProject.data.environment);
        }
      }
      setIsLoading(false);
    } else if (!authLoading && !isAuthenticated) {
      router.push('/studio');
    }
  }, [authLoading, isAuthenticated, projects, projectId, setSmartMaterials, setSmartMasks, setEnvironmentSettings]);

  // Manual save handler
  const handleSave = useCallback(async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await autoSave();
    } finally {
      setIsSaving(false);
    }
  }, [project, autoSave]);

  const handleExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  // Ctrl+S save / Ctrl+E export shortcuts (separate from useHotkeys to access handlers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleExport]);

  // Handle applying mask to active layer
  const handleApplyMask = useCallback((mask: SmartMask) => {
    if (!activeLayerId) {
      console.warn('No active layer to apply mask');
      return;
    }

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    // Generate mask image data based on mask type
    const maskCanvas = document.createElement('canvas');
    const width = project?.data?.width || 1024;
    const height = project?.data?.height || 1024;
    maskCanvas.width = width;
    maskCanvas.height = height;
    const ctx = maskCanvas.getContext('2d')!;

    // Create mask based on type
    switch (mask.type) {
      case 'corner-radius': {
        const radius = mask.parameters.cornerRadius || 50;
        const smooth = mask.parameters.cornerSmooth || 0;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, radius + smooth);
        ctx.fill();
        break;
      }
      case 'vignette': {
        const strength = mask.parameters.vignetteStrength || 0.5;
        const vigRadius = mask.parameters.vignetteRadius || 0.7;
        const softness = mask.parameters.vignetteSoftness || 0.3;
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.sqrt(cx * cx + cy * cy);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * vigRadius);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1 - softness, `rgba(255,255,255,${1 - strength})`);
        gradient.addColorStop(1, 'black');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
      }
      case 'border-gradient': {
        const borderWidth = mask.parameters.borderWidth || 50;
        const borderSoftness = mask.parameters.borderSoftness || 20;
        ctx.fillStyle = 'white';
        ctx.fillRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2);
        // Feather edges
        if (borderSoftness > 0) {
          ctx.filter = `blur(${borderSoftness}px)`;
          ctx.drawImage(maskCanvas, 0, 0);
          ctx.filter = 'none';
        }
        break;
      }
      case 'linear-gradient': {
        const angle = (mask.parameters.gradientAngle || 0) * Math.PI / 180;
        const x1 = width / 2 - Math.cos(angle) * width;
        const y1 = height / 2 - Math.sin(angle) * height;
        const x2 = width / 2 + Math.cos(angle) * width;
        const y2 = height / 2 + Math.sin(angle) * height;
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'white');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
      }
      case 'radial-gradient': {
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) / 2;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, 'black');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
      }
      default:
        // Default white mask (no masking)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
    }

    const maskImageData = maskCanvas.toDataURL('image/png');

    // Update layer with mask
    const updatedLayer = {
      ...activeLayer,
      mask: {
        enabled: true,
        linked: true,
        imageData: maskImageData,
        inverted: false,
      },
      smartMask: {
        maskId: mask.id,
        parameters: mask.parameters as Record<string, number | string | boolean>,
      },
    };

    setLayers(layers.map(l => l.id === activeLayerId ? updatedLayer : l));
    pushHistory(`Apply mask: ${mask.name}`);
  }, [activeLayerId, layers, project, setLayers, pushHistory]);

  // Handle creating new mask
  const handleCreateMask = useCallback((mask: SmartMask) => {
    setSmartMasks([...smartMasks, mask]);
  }, [smartMasks, setSmartMasks]);

  // Handle applying generator to layer
  const handleApplyGeneratorToLayer = useCallback((imageData: ImageData) => {
    if (!activeLayerId) {
      console.warn('No active layer to apply generator');
      return;
    }

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    // Convert ImageData to canvas and then to data URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Scale to layer size if needed
    const width = project?.data?.width || 1024;
    const height = project?.data?.height || 1024;

    if (imageData.width !== width || imageData.height !== height) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = width;
      scaledCanvas.height = height;
      const scaledCtx = scaledCanvas.getContext('2d')!;
      scaledCtx.drawImage(tempCanvas, 0, 0, width, height);
      const dataUrl = scaledCanvas.toDataURL('image/png');
      setLayers(layers.map(l => l.id === activeLayerId ? { ...l, imageData: dataUrl } : l));
    } else {
      const dataUrl = tempCanvas.toDataURL('image/png');
      setLayers(layers.map(l => l.id === activeLayerId ? { ...l, imageData: dataUrl } : l));
    }

    pushHistory('Apply generator');
  }, [activeLayerId, layers, project, setLayers, pushHistory]);

  // Handle creating layer from generator
  const handleCreateLayerFromGenerator = useCallback((imageData: ImageData, name: string) => {
    // Convert ImageData to data URL
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Scale to project size if needed
    const width = project?.data?.width || 1024;
    const height = project?.data?.height || 1024;

    let dataUrl: string;
    if (imageData.width !== width || imageData.height !== height) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = width;
      scaledCanvas.height = height;
      const scaledCtx = scaledCanvas.getContext('2d')!;
      scaledCtx.drawImage(tempCanvas, 0, 0, width, height);
      dataUrl = scaledCanvas.toDataURL('image/png');
    } else {
      dataUrl = tempCanvas.toDataURL('image/png');
    }

    // Create new layer with generated content
    const newLayer = addLayer('raster', name);
    if (newLayer) {
      setLayers(layers.map(l => l.id === newLayer.id ? { ...l, imageData: dataUrl } : l));
    }
    pushHistory(`Generate ${name}`);
  }, [addLayer, pushHistory, project, layers, setLayers]);

  // Capture current canvas as frame
  const captureCanvasFrame = useCallback((): string => {
    // Try to capture from main canvas element
    const mainCanvas = document.querySelector<HTMLCanvasElement>('#main-canvas, canvas');
    if (mainCanvas) {
      try {
        return mainCanvas.toDataURL('image/png');
      } catch {
        console.warn('Failed to capture canvas directly');
      }
    }

    // Fallback: composite all visible layers manually
    const width = project?.data?.width || 1024;
    const height = project?.data?.height || 1024;
    const visibleLayers = layers.filter(l => l.visible);

    if (visibleLayers.length === 0) {
      // Return transparent canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas.toDataURL('image/png');
    }

    // Create composite canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw layers in order (bottom to top)
    for (let i = visibleLayers.length - 1; i >= 0; i--) {
      const layer = visibleLayers[i];
      if (layer.imageData) {
        const img = new window.Image();
        img.src = layer.imageData;
        if (img.complete) {
          ctx.globalAlpha = layer.opacity / 100;
          ctx.drawImage(img, 0, 0);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }, [layers, project]);

  // Handle selecting lenticular frame
  const handleSelectLenticularFrame = useCallback((frame: LenticularFrame) => {
    // Load frame's layers into editor
    setLayers(frame.layers);
  }, [setLayers]);

  // Material handlers - using store functions for auto-save
  const handleCreateMaterial = useCallback(() => {
    addMaterial();
  }, [addMaterial]);

  const handleDuplicateMaterial = useCallback((id: string) => {
    duplicateMaterialStore(id);
  }, [duplicateMaterialStore]);

  const handleDeleteMaterial = useCallback((id: string) => {
    deleteMaterialStore(id);
  }, [deleteMaterialStore]);

  const handleUpdateMaterial = useCallback((material: SmartMaterial) => {
    updateMaterial(material);
  }, [updateMaterial]);

  const handleOpenMaterialEditor = useCallback((id: string) => {
    setActiveMaterialId(id);
    setShowNodeEditor(true);
  }, [setActiveMaterialId]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <span className="text-white/60">Loading project...</span>
        </motion.div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Project not found</h2>
          <Button onClick={() => router.push('/studio')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-[#0a0a0b] overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-12 border-b border-white/10 bg-[#121214] flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/studio')}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Back to Projects</TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-white/10" />

            <span className="text-sm text-white font-medium truncate max-w-[200px]">
              {project.name}
            </span>
            <span className="text-xs text-white/40 px-2 py-0.5 bg-white/5 rounded capitalize">
              {project.stickerType}
            </span>

            {/* Auto-save status indicator */}
            <div className="flex items-center gap-1.5 ml-2">
              {isAutoSaving ? (
                <span className="flex items-center gap-1 text-xs text-orange-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : saveError ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-red-400 cursor-help">
                      Save failed
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-red-400">{saveError}</TooltipContent>
                </Tooltip>
              ) : hasUnsavedChanges ? (
                <span className="text-xs text-yellow-400/60">Unsaved changes</span>
              ) : lastSaved ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-green-400/60">Saved</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
                >
                  <Undo2 className="w-4 h-4 text-white/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
                >
                  <Redo2 className="w-4 h-4 text-white/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Zoom Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setZoom(zoom / 1.2)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-4 h-4 text-white/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (-)</TooltipContent>
            </Tooltip>

            <span className="text-xs text-white/60 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setZoom(zoom * 1.2)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-white/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (+)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setZoom(1)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-white/60" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Fit to View (Ctrl+0)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded-lg transition-colors ${
                    showGrid ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-white/5 text-white/60'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Save/Export */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isAutoSaving}
              className="text-white/60 hover:text-white"
            >
              {(isSaving || isAutoSaving) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Save</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExport}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Download className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Export</span>
            </Button>
          </div>
        </header>

        {/* Main Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <StudioToolbar />

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Map Type Tabs */}
            <StudioMapTabs
              activeTab={activeMapTab}
              onChange={setActiveMapTab}
            />

            {/* Canvas or Render Preview */}
            <div className="flex-1 relative overflow-hidden bg-[#1a1a1c]">
              {activeMapTab === 'render' ? (
                <CS2RenderPreview className="w-full h-full" />
              ) : (
                <div className="flex h-full">
                  <div className="flex-1 relative">
                    <StudioCanvas
                      zoom={zoom}
                      showGrid={showGrid}
                      activeMapTab={activeMapTab}
                    />
                  </div>
                  {/* Material Map Panel for metalness/normal/roughness tabs */}
                  {(activeMapTab === 'metalness' || activeMapTab === 'roughness' || activeMapTab === 'normal') && (
                    <MaterialMapPanel
                      mapType={activeMapTab}
                      className="w-64 shrink-0"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-72 border-l border-white/10 bg-[#121214] flex flex-col overflow-hidden">
            {/* Panel Tabs */}
            <div className="flex items-center border-b border-white/10 px-1 py-1 gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelTab('default')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rightPanelTab === 'default' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <Brush className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Brush & Colors</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelTab('text')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rightPanelTab === 'text' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Text Tool</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelTab('generators')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rightPanelTab === 'generators' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Generators</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelTab('masks')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rightPanelTab === 'masks' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Smart Masks</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelTab('environment')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rightPanelTab === 'environment' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Environment</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelTab('materials')}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rightPanelTab === 'materials' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Materials & Node Editor</TooltipContent>
              </Tooltip>

              {project?.stickerType === 'lenticular' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setRightPanelTab('lenticular')}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        rightPanelTab === 'lenticular' ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                      )}
                    >
                      <Film className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Lenticular Editor</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {rightPanelTab === 'default' && (
                <>
                  <StudioColorPicker />
                  <StudioBrushSettings />
                  <ShapeToolPanel />
                  <StudioLayersPanel />
                </>
              )}

              {rightPanelTab === 'text' && (
                <>
                  <TextToolPanel className="flex-1" />
                  <StudioLayersPanel />
                </>
              )}

              {rightPanelTab === 'generators' && (
                <GeneratorsPanel
                  onApplyToLayer={handleApplyGeneratorToLayer}
                  onCreateLayer={handleCreateLayerFromGenerator}
                  className="flex-1"
                />
              )}

              {rightPanelTab === 'masks' && (
                <SmartMasksPanel
                  masks={smartMasks}
                  onApplyMask={handleApplyMask}
                  onCreateMask={handleCreateMask}
                  className="flex-1"
                />
              )}

              {rightPanelTab === 'environment' && (
                <EnvironmentPanel
                  settings={environmentSettings}
                  onChange={setEnvironmentSettings}
                  className="flex-1"
                />
              )}

              {rightPanelTab === 'materials' && (
                <MaterialsPanel
                  materials={smartMaterials}
                  activeMaterialId={activeMaterialId}
                  onSelectMaterial={setActiveMaterialId}
                  onCreateMaterial={handleCreateMaterial}
                  onDuplicateMaterial={handleDuplicateMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                  onUpdateMaterial={handleUpdateMaterial}
                  onOpenFullEditor={handleOpenMaterialEditor}
                  className="flex-1"
                />
              )}

              {rightPanelTab === 'lenticular' && project?.stickerType === 'lenticular' && (
                <LenticularEditor
                  frames={lenticularFrames}
                  settings={lenticularSettings}
                  currentLayers={layers}
                  onFramesChange={setLenticularFrames}
                  onSettingsChange={setLenticularSettings}
                  onSelectFrame={handleSelectLenticularFrame}
                  onCaptureFrame={captureCanvasFrame}
                  className="flex-1"
                />
              )}
            </div>
          </div>

          {/* Node Editor Overlay */}
          {showNodeEditor && activeMaterialId && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
              <div className="relative w-full h-full max-w-6xl bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => setShowNodeEditor(false)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <NodeEditor
                  material={smartMaterials.find(m => m.id === activeMaterialId) || {
                    id: activeMaterialId,
                    name: 'New Material',
                    category: 'custom',
                    nodes: [],
                    connections: [],
                    outputNodeId: '',
                  }}
                  onChange={(material) => {
                    handleUpdateMaterial(material);
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Export Dialog */}
          <ExportDialog
            isOpen={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            projectName={project.name}
            layers={layers}
            canvasWidth={project.data?.width || 1024}
            canvasHeight={project.data?.height || 1024}
            stickerType={project.stickerType}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
