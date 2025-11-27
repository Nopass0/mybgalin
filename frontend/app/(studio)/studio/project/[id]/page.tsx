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
import { StudioToolbar } from '@/components/studio/toolbar';
import { StudioLayersPanel } from '@/components/studio/layers-panel';
import { StudioColorPicker } from '@/components/studio/color-picker';
import { StudioBrushSettings } from '@/components/studio/brush-settings';
import { StudioCanvas } from '@/components/studio/canvas';
import { StudioMapTabs } from '@/components/studio/map-tabs';
import { TextToolPanel } from '@/components/studio/text-tool-panel';
import { SmartMasksPanel } from '@/components/studio/smart-masks-panel';
import { EnvironmentPanel } from '@/components/studio/environment-panel';
import { GeneratorsPanel } from '@/components/studio/generators-panel';
import { NodeEditor } from '@/components/studio/node-editor';
import { LenticularEditor } from '@/components/studio/lenticular-editor';
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
    undo,
    redo,
    history,
    historyIndex,
    pushHistory,
  } = useStudioEditor();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [activeMapTab, setActiveMapTab] = useState<'color' | 'normal' | 'metalness' | 'roughness'>('color');

  // Panel states
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('default');
  const [showNodeEditor, setShowNodeEditor] = useState(false);

  // Smart features state
  const [smartMasks, setSmartMasks] = useState<SmartMask[]>(DEFAULT_SMART_MASKS);
  const [smartMaterials, setSmartMaterials] = useState<SmartMaterial[]>([]);
  const [environmentSettings, setEnvironmentSettings] = useState<EnvironmentSettings>(DEFAULT_ENVIRONMENT);
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
      }
      setIsLoading(false);
    } else if (!authLoading && !isAuthenticated) {
      router.push('/studio');
    }
  }, [authLoading, isAuthenticated, projects, projectId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // + = Zoom In
      if (e.key === '=' || e.key === '+') {
        setZoom(zoom * 1.2);
      }
      // - = Zoom Out
      if (e.key === '-') {
        setZoom(zoom / 1.2);
      }
      // 0 = Reset Zoom
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, undo, redo]);

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    // TODO: Implement save via API
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleExport = async () => {
    // TODO: Implement export
  };

  // Handle applying mask to active layer
  const handleApplyMask = useCallback((mask: SmartMask) => {
    // TODO: Apply smart mask to active layer
    console.log('Applying mask:', mask);
  }, []);

  // Handle creating new mask
  const handleCreateMask = useCallback((mask: SmartMask) => {
    setSmartMasks((prev) => [...prev, mask]);
  }, []);

  // Handle applying generator to layer
  const handleApplyGeneratorToLayer = useCallback((imageData: ImageData) => {
    // TODO: Apply generated texture to active layer
    console.log('Applying generator:', imageData);
  }, []);

  // Handle creating layer from generator
  const handleCreateLayerFromGenerator = useCallback((imageData: ImageData, name: string) => {
    addLayer('raster', name);
    // TODO: Set layer image data
    pushHistory(`Generate ${name}`);
  }, [addLayer, pushHistory]);

  // Capture current canvas as frame
  const captureCanvasFrame = useCallback((): string => {
    // TODO: Capture from actual canvas
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }, []);

  // Handle selecting lenticular frame
  const handleSelectLenticularFrame = useCallback((frame: LenticularFrame) => {
    // Load frame's layers into editor
    setLayers(frame.layers);
  }, [setLayers]);

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
              disabled={isSaving}
              className="text-white/60 hover:text-white"
            >
              {isSaving ? (
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

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden bg-[#1a1a1c]">
              <StudioCanvas
                zoom={zoom}
                showGrid={showGrid}
                activeMapTab={activeMapTab}
              />
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
                    onClick={() => setShowNodeEditor(!showNodeEditor)}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      showNodeEditor ? 'bg-orange-500/20 text-orange-400' : 'text-white/40 hover:bg-white/5'
                    )}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Node Editor</TooltipContent>
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
          {showNodeEditor && (
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
                  material={smartMaterials[0] || {
                    id: 'new',
                    name: 'New Material',
                    category: 'custom',
                    nodes: [],
                    connections: [],
                    outputNodeId: '',
                  }}
                  onChange={(material) => {
                    // Update or add material
                    setSmartMaterials((prev) => {
                      const idx = prev.findIndex((m) => m.id === material.id);
                      if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = material;
                        return next;
                      }
                      return [...prev, material];
                    });
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
