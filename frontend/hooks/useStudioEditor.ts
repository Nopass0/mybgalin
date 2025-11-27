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
  SmartMaterial,
  SmartMask,
  EnvironmentSettings,
} from '@/types/studio';
import { DEFAULT_ENVIRONMENT, DEFAULT_SMART_MASKS } from '@/types/studio';

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
  selectedLayerIds: string[];
  setLayers: (layers: Layer[]) => void;
  setActiveLayer: (id: string | null) => void;
  setSelectedLayers: (ids: string[]) => void;
  toggleLayerSelection: (id: string, multiSelect: boolean, rangeSelect: boolean) => void;
  selectAllLayers: () => void;
  clearLayerSelection: () => void;
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
  groupSelectedLayers: () => void;
  mergeSelectedLayers: () => void;
  ungroupLayer: (id: string) => void;

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

  // Smart Materials
  smartMaterials: SmartMaterial[];
  activeMaterialId: string | null;
  setSmartMaterials: (materials: SmartMaterial[]) => void;
  addMaterial: () => SmartMaterial;
  updateMaterial: (material: SmartMaterial) => void;
  deleteMaterial: (id: string) => void;
  duplicateMaterial: (id: string) => void;
  setActiveMaterialId: (id: string | null) => void;

  // Smart Masks
  smartMasks: SmartMask[];
  setSmartMasks: (masks: SmartMask[]) => void;

  // Environment
  environmentSettings: EnvironmentSettings;
  setEnvironmentSettings: (settings: EnvironmentSettings) => void;
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

// Additional brush presets for CS2 skin creation
const inkBrush: CustomBrush = {
  id: 'ink',
  name: 'Ink',
  size: 8,
  hardness: 100,
  opacity: 100,
  flow: 100,
  spacing: 3,
  angle: 0,
  roundness: 100,
  scatterX: 0,
  scatterY: 0,
  pressureSize: true,
  pressureOpacity: false,
  pressureFlow: false,
  tiltAngle: false,
  shape: 'round',
};

const sprayBrush: CustomBrush = {
  id: 'spray',
  name: 'Spray',
  size: 80,
  hardness: 20,
  opacity: 15,
  flow: 30,
  spacing: 2,
  angle: 0,
  roundness: 100,
  scatterX: 40,
  scatterY: 40,
  pressureSize: false,
  pressureOpacity: true,
  pressureFlow: true,
  tiltAngle: false,
  shape: 'round',
};

const chalkBrush: CustomBrush = {
  id: 'chalk',
  name: 'Chalk',
  size: 30,
  hardness: 85,
  opacity: 80,
  flow: 60,
  spacing: 8,
  angle: 45,
  roundness: 60,
  scatterX: 5,
  scatterY: 5,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: true,
  tiltAngle: true,
  shape: 'round',
};

const markerBrush: CustomBrush = {
  id: 'marker',
  name: 'Marker',
  size: 25,
  hardness: 95,
  opacity: 90,
  flow: 100,
  spacing: 5,
  angle: 0,
  roundness: 50,
  scatterX: 0,
  scatterY: 0,
  pressureSize: false,
  pressureOpacity: false,
  pressureFlow: false,
  tiltAngle: true,
  shape: 'round',
};

const grungeBrush: CustomBrush = {
  id: 'grunge',
  name: 'Grunge',
  size: 60,
  hardness: 70,
  opacity: 60,
  flow: 40,
  spacing: 15,
  angle: 0,
  roundness: 80,
  scatterX: 20,
  scatterY: 20,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: true,
  tiltAngle: false,
  shape: 'round',
};

const airbrushPreset: CustomBrush = {
  id: 'airbrush',
  name: 'Airbrush',
  size: 100,
  hardness: 0,
  opacity: 20,
  flow: 15,
  spacing: 3,
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

const pencilBrush: CustomBrush = {
  id: 'pencil',
  name: 'Pencil',
  size: 3,
  hardness: 100,
  opacity: 100,
  flow: 100,
  spacing: 5,
  angle: 0,
  roundness: 100,
  scatterX: 1,
  scatterY: 1,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: false,
  tiltAngle: false,
  shape: 'round',
};

const splatterBrush: CustomBrush = {
  id: 'splatter',
  name: 'Splatter',
  size: 40,
  hardness: 100,
  opacity: 80,
  flow: 100,
  spacing: 50,
  angle: 0,
  roundness: 100,
  scatterX: 60,
  scatterY: 60,
  pressureSize: true,
  pressureOpacity: false,
  pressureFlow: false,
  tiltAngle: false,
  shape: 'round',
};

const wearBrush: CustomBrush = {
  id: 'wear',
  name: 'Wear & Tear',
  size: 50,
  hardness: 40,
  opacity: 30,
  flow: 20,
  spacing: 25,
  angle: 0,
  roundness: 70,
  scatterX: 30,
  scatterY: 30,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: true,
  tiltAngle: false,
  shape: 'round',
};

const scratchBrush: CustomBrush = {
  id: 'scratch',
  name: 'Scratches',
  size: 2,
  hardness: 100,
  opacity: 60,
  flow: 100,
  spacing: 3,
  angle: 45,
  roundness: 10,
  scatterX: 2,
  scatterY: 2,
  pressureSize: true,
  pressureOpacity: true,
  pressureFlow: false,
  tiltAngle: true,
  shape: 'round',
};

const defaultBrushes: CustomBrush[] = [
  defaultBrush,
  defaultSoftBrush,
  inkBrush,
  pencilBrush,
  markerBrush,
  airbrushPreset,
  sprayBrush,
  chalkBrush,
  grungeBrush,
  splatterBrush,
  wearBrush,
  scratchBrush,
];

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
  selectedLayerIds: [],
  setLayers: (layers) => set({ layers }),
  setActiveLayer: (id) => set({ activeLayerId: id, selectedLayerIds: id ? [id] : [] }),
  setSelectedLayers: (ids) => set({ selectedLayerIds: ids }),

  toggleLayerSelection: (id, multiSelect, rangeSelect) => {
    const { layers, selectedLayerIds, activeLayerId } = get();

    if (rangeSelect && activeLayerId) {
      // Shift+click: select range from active to clicked layer
      const activeIndex = layers.findIndex((l) => l.id === activeLayerId);
      const clickedIndex = layers.findIndex((l) => l.id === id);

      if (activeIndex !== -1 && clickedIndex !== -1) {
        const start = Math.min(activeIndex, clickedIndex);
        const end = Math.max(activeIndex, clickedIndex);
        const rangeIds = layers.slice(start, end + 1).map((l) => l.id);
        set({ selectedLayerIds: rangeIds });
      }
    } else if (multiSelect) {
      // Ctrl+click: toggle individual selection
      if (selectedLayerIds.includes(id)) {
        const newSelection = selectedLayerIds.filter((i) => i !== id);
        set({
          selectedLayerIds: newSelection,
          activeLayerId: newSelection.length > 0 ? newSelection[0] : null,
        });
      } else {
        set({
          selectedLayerIds: [...selectedLayerIds, id],
          activeLayerId: id,
        });
      }
    } else {
      // Normal click: single selection
      set({ selectedLayerIds: [id], activeLayerId: id });
    }
  },

  selectAllLayers: () => {
    const { layers } = get();
    set({
      selectedLayerIds: layers.map((l) => l.id),
      activeLayerId: layers[0]?.id || null,
    });
  },

  clearLayerSelection: () => set({ selectedLayerIds: [], activeLayerId: null }),

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

  groupSelectedLayers: () => {
    const { layers, selectedLayerIds } = get();

    if (selectedLayerIds.length < 2) return;

    // Get the selected layers in their original order
    const selectedLayers = layers.filter((l) => selectedLayerIds.includes(l.id));
    const firstSelectedIndex = layers.findIndex((l) => selectedLayerIds.includes(l.id));

    // Create a group layer
    const groupId = generateId();
    const groupLayer: Layer = {
      id: groupId,
      name: `Group ${layers.filter((l) => l.type === 'group').length + 1}`,
      type: 'group',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      children: selectedLayers.map((l) => l.id),
    };

    // Update layers: remove selected, insert group with children at the position of the first selected
    const newLayers = layers.filter((l) => !selectedLayerIds.includes(l.id));
    newLayers.splice(firstSelectedIndex, 0, groupLayer, ...selectedLayers.map((l) => ({
      ...l,
      parentId: groupId,
    })));

    set({
      layers: newLayers,
      activeLayerId: groupId,
      selectedLayerIds: [groupId],
    });
  },

  mergeSelectedLayers: () => {
    const { layers, selectedLayerIds } = get();

    if (selectedLayerIds.length < 2) return;

    // Get visible selected layers from top to bottom
    const selectedLayers = layers
      .filter((l) => selectedLayerIds.includes(l.id) && l.visible)
      .reverse(); // Reverse to draw bottom layer first

    if (selectedLayers.length < 2) return;

    // Create merged layer at the position of the topmost selected layer
    const firstSelectedIndex = layers.findIndex((l) => selectedLayerIds.includes(l.id));
    const mergedId = generateId();
    const mergedLayer: Layer = {
      id: mergedId,
      name: 'Merged Layer',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      // Image data will need to be composited by the canvas component
      needsMerge: true,
      mergeSourceIds: selectedLayers.map((l) => l.id),
    };

    // Remove selected layers and insert merged layer
    const newLayers = layers.filter((l) => !selectedLayerIds.includes(l.id));
    newLayers.splice(firstSelectedIndex, 0, mergedLayer);

    set({
      layers: newLayers,
      activeLayerId: mergedId,
      selectedLayerIds: [mergedId],
    });
  },

  ungroupLayer: (id) => {
    const { layers } = get();
    const groupLayer = layers.find((l) => l.id === id);

    if (!groupLayer || groupLayer.type !== 'group' || !groupLayer.children) return;

    const groupIndex = layers.findIndex((l) => l.id === id);

    // Get child layers and remove parent reference
    const childLayers = layers
      .filter((l) => groupLayer.children?.includes(l.id))
      .map((l) => ({ ...l, parentId: undefined }));

    // Remove the group and its children, then insert children at group position
    const newLayers = layers.filter((l) => l.id !== id && !groupLayer.children?.includes(l.id));
    newLayers.splice(groupIndex, 0, ...childLayers);

    set({
      layers: newLayers,
      selectedLayerIds: childLayers.map((l) => l.id),
      activeLayerId: childLayers[0]?.id || null,
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
  brushes: defaultBrushes,
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

  // Smart Materials
  smartMaterials: [],
  activeMaterialId: null,
  setSmartMaterials: (smartMaterials) => set({ smartMaterials }),
  addMaterial: () => {
    const { smartMaterials } = get();
    const newMaterial: SmartMaterial = {
      id: generateId(),
      name: `Material ${smartMaterials.length + 1}`,
      category: 'custom',
      nodes: [],
      connections: [],
      outputNodeId: '',
    };
    set({ smartMaterials: [...smartMaterials, newMaterial], activeMaterialId: newMaterial.id });
    return newMaterial;
  },
  updateMaterial: (material) => {
    const { smartMaterials } = get();
    set({
      smartMaterials: smartMaterials.map((m) =>
        m.id === material.id ? material : m
      ),
    });
  },
  deleteMaterial: (id) => {
    const { smartMaterials, activeMaterialId } = get();
    set({
      smartMaterials: smartMaterials.filter((m) => m.id !== id),
      activeMaterialId: activeMaterialId === id ? null : activeMaterialId,
    });
  },
  duplicateMaterial: (id) => {
    const { smartMaterials } = get();
    const material = smartMaterials.find((m) => m.id === id);
    if (!material) return;

    const duplicate: SmartMaterial = {
      ...material,
      id: generateId(),
      name: `${material.name} copy`,
      nodes: JSON.parse(JSON.stringify(material.nodes)),
      connections: JSON.parse(JSON.stringify(material.connections)),
    };

    set({
      smartMaterials: [...smartMaterials, duplicate],
      activeMaterialId: duplicate.id,
    });
  },
  setActiveMaterialId: (activeMaterialId) => set({ activeMaterialId }),

  // Smart Masks
  smartMasks: DEFAULT_SMART_MASKS,
  setSmartMasks: (smartMasks) => set({ smartMasks }),

  // Environment
  environmentSettings: DEFAULT_ENVIRONMENT,
  setEnvironmentSettings: (environmentSettings) => set({ environmentSettings }),
}));
