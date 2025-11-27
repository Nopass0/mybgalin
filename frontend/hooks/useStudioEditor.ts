import { create } from 'zustand';
import type {
  Layer,
  LayerType,
  BlendMode,
  ToolType,
  CustomBrush,
  StudioProject,
  HistoryState,
  Gradient,
} from '@/types/studio';

// Simple UUID generator since we may not have uuid package
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface EditorState {
  // Project
  project: StudioProject | null;
  setProject: (project: StudioProject | null) => void;

  // Canvas
  zoom: number;
  panX: number;
  panY: number;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  setLayers: (layers: Layer[]) => void;
  setActiveLayer: (id: string | null) => void;
  addLayer: (type?: LayerType, name?: string) => Layer;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;
  addLayerMask: (id: string) => void;
  removeLayerMask: (id: string) => void;

  // Tools
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  swapColors: () => void;

  // Brush
  currentBrush: CustomBrush;
  brushes: CustomBrush[];
  setCurrentBrush: (brush: CustomBrush) => void;
  updateBrush: (updates: Partial<CustomBrush>) => void;
  saveBrush: (brush: CustomBrush) => void;
  deleteBrush: (id: string) => void;
  importBrush: (file: File) => Promise<void>;

  // Gradient
  currentGradient: Gradient;
  setCurrentGradient: (gradient: Gradient) => void;

  // Selection
  hasSelection: boolean;
  selectionPath: Path2D | null;
  setSelection: (path: Path2D | null) => void;
  clearSelection: () => void;

  // History (Undo/Redo)
  history: HistoryState[];
  historyIndex: number;
  pushHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Drawing state
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;

  // Pointer state for tablet
  pointerPressure: number;
  pointerTiltX: number;
  pointerTiltY: number;
  updatePointerState: (pressure: number, tiltX: number, tiltY: number) => void;

  // Normal map mode
  normalMapMode: boolean;
  setNormalMapMode: (enabled: boolean) => void;
  normalMapStrength: number;
  setNormalMapStrength: (strength: number) => void;

  // Canvas dimensions (computed from project)
  canvasWidth: number;
  canvasHeight: number;
}

const defaultBrush: CustomBrush = {
  id: 'default',
  name: 'Round Brush',
  size: 20,
  hardness: 100,
  opacity: 100,
  flow: 100,
  spacing: 5,
  angle: 0,
  roundness: 100,
  scatterX: 0,
  scatterY: 0,
  pressureSize: true,
  pressureOpacity: false,
  pressureFlow: true,
  tiltAngle: false,
  shape: 'round',
};

const defaultSoftBrush: CustomBrush = {
  id: 'soft',
  name: 'Soft Brush',
  size: 50,
  hardness: 0,
  opacity: 100,
  flow: 50,
  spacing: 5,
  angle: 0,
  roundness: 100,
  scatterX: 0,
  scatterY: 0,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: true,
  tiltAngle: false,
  shape: 'round',
};

const defaultGradient: Gradient = {
  type: 'linear',
  stops: [
    { offset: 0, color: '#000000' },
    { offset: 1, color: '#ffffff' },
  ],
  angle: 0,
};

export const useStudioEditor = create<EditorState>((set, get) => ({
  // Project
  project: null,
  setProject: (project) => set({ project }),

  // Canvas
  zoom: 1,
  panX: 0,
  panY: 0,
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(32, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),

  // Layers
  layers: [],
  activeLayerId: null,
  setLayers: (layers) => set({ layers }),
  setActiveLayer: (id) => set({ activeLayerId: id }),

  addLayer: (type = 'raster', name) => {
    const id = generateId();
    const { layers } = get();
    const newLayer: Layer = {
      id,
      name: name || `Layer ${layers.length + 1}`,
      type,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
    };

    set({
      layers: [newLayer, ...layers],
      activeLayerId: id,
    });

    return newLayer;
  },

  removeLayer: (id) => {
    const { layers, activeLayerId } = get();
    const newLayers = layers.filter((l) => l.id !== id);

    set({
      layers: newLayers,
      activeLayerId: activeLayerId === id
        ? (newLayers[0]?.id || null)
        : activeLayerId,
    });
  },

  duplicateLayer: (id) => {
    const { layers } = get();
    const layerIndex = layers.findIndex((l) => l.id === id);
    if (layerIndex === -1) return;

    const original = layers[layerIndex];
    const duplicate: Layer = {
      ...original,
      id: generateId(),
      name: `${original.name} copy`,
    };

    const newLayers = [...layers];
    newLayers.splice(layerIndex, 0, duplicate);

    set({
      layers: newLayers,
      activeLayerId: duplicate.id,
    });
  },

  moveLayer: (id, direction) => {
    const { layers } = get();
    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    const newLayers = [...layers];
    [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];

    set({ layers: newLayers });
  },

  updateLayer: (id, updates) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    });
  },

  toggleLayerVisibility: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    });
  },

  toggleLayerLock: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l
      ),
    });
  },

  setLayerOpacity: (id, opacity) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, opacity: Math.max(0, Math.min(100, opacity)) } : l
      ),
    });
  },

  setLayerBlendMode: (id, blendMode) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, blendMode } : l
      ),
    });
  },

  addLayerMask: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id
          ? { ...l, mask: { enabled: true, linked: true } }
          : l
      ),
    });
  },

  removeLayerMask: (id) => {
    const { layers } = get();
    set({
      layers: layers.map((l) =>
        l.id === id ? { ...l, mask: undefined } : l
      ),
    });
  },

  // Tools
  activeTool: 'brush',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Colors
  primaryColor: '#ffffff',
  secondaryColor: '#000000',
  setPrimaryColor: (color) => set({ primaryColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () => {
    const { primaryColor, secondaryColor } = get();
    set({ primaryColor: secondaryColor, secondaryColor: primaryColor });
  },

  // Brush
  currentBrush: defaultBrush,
  brushes: [defaultBrush, defaultSoftBrush],
  setCurrentBrush: (brush) => set({ currentBrush: brush }),
  updateBrush: (updates) => {
    const { currentBrush } = get();
    set({ currentBrush: { ...currentBrush, ...updates } });
  },
  saveBrush: (brush) => {
    const { brushes } = get();
    const existing = brushes.findIndex((b) => b.id === brush.id);
    if (existing !== -1) {
      const newBrushes = [...brushes];
      newBrushes[existing] = brush;
      set({ brushes: newBrushes });
    } else {
      set({ brushes: [...brushes, { ...brush, id: generateId() }] });
    }
  },
  deleteBrush: (id) => {
    const { brushes, currentBrush } = get();
    if (brushes.length <= 1) return;
    const newBrushes = brushes.filter((b) => b.id !== id);
    set({
      brushes: newBrushes,
      currentBrush: currentBrush.id === id ? newBrushes[0] : currentBrush,
    });
  },
  importBrush: async (file) => {
    // ABR file parsing for Photoshop brushes
    // This is a simplified implementation - full ABR parsing is complex
    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);

    // Check for ABR magic number
    const magic = dataView.getUint16(0, false);
    if (magic !== 0x3842) {
      throw new Error('Invalid ABR file');
    }

    // For now, create a basic brush from the file name
    const { brushes } = get();
    const newBrush: CustomBrush = {
      id: generateId(),
      name: file.name.replace('.abr', ''),
      size: 30,
      hardness: 80,
      opacity: 100,
      flow: 100,
      spacing: 10,
      angle: 0,
      roundness: 100,
      scatterX: 0,
      scatterY: 0,
      pressureSize: true,
      pressureOpacity: true,
      pressureFlow: true,
      tiltAngle: false,
      shape: 'custom',
    };

    set({ brushes: [...brushes, newBrush] });
  },

  // Gradient
  currentGradient: defaultGradient,
  setCurrentGradient: (gradient) => set({ currentGradient: gradient }),

  // Selection
  hasSelection: false,
  selectionPath: null,
  setSelection: (path) => set({ selectionPath: path, hasSelection: !!path }),
  clearSelection: () => set({ selectionPath: null, hasSelection: false }),

  // History
  history: [],
  historyIndex: -1,
  pushHistory: (description) => {
    const { layers, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      layers: JSON.parse(JSON.stringify(layers)),
      timestamp: Date.now(),
      description,
    });

    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    set({
      layers: JSON.parse(JSON.stringify(history[newIndex].layers)),
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    set({
      layers: JSON.parse(JSON.stringify(history[newIndex].layers)),
      historyIndex: newIndex,
    });
  },

  get canUndo() {
    return get().historyIndex > 0;
  },

  get canRedo() {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // Drawing state
  isDrawing: false,
  setIsDrawing: (isDrawing) => set({ isDrawing }),

  // Pointer state
  pointerPressure: 1,
  pointerTiltX: 0,
  pointerTiltY: 0,
  updatePointerState: (pressure, tiltX, tiltY) =>
    set({ pointerPressure: pressure, pointerTiltX: tiltX, pointerTiltY: tiltY }),

  // Normal map mode
  normalMapMode: false,
  setNormalMapMode: (normalMapMode) => set({ normalMapMode }),
  normalMapStrength: 1,
  setNormalMapStrength: (normalMapStrength) => set({ normalMapStrength }),

  // Canvas dimensions (computed from project)
  get canvasWidth() {
    const project = get().project;
    return project?.data?.width || 1024;
  },
  get canvasHeight() {
    const project = get().project;
    return project?.data?.height || 1024;
  },
}));
