'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Layers,
  Image,
  Type,
  FolderClosed,
  FolderOpen,
  Sliders,
  CircleDot,
  Sparkles,
  MoreHorizontal,
  Link,
  Unlink,
  FileText,
  Pentagon,
  Merge,
  Grid2x2,
  Wand2,
  Loader2,
  Upload,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { Layer, BlendMode, LayerType, MaterialNode, NodeConnection } from '@/types/studio';
import {
  compositeLayers,
  canvasToDataUrl,
  rasterizeText,
  rasterizeShape,
  generateNormalMap,
  convertToGrayscale,
} from '@/lib/canvasUtils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LayerEffectsPanel } from './layer-effects-panel';
import { ColorAdjustmentsPanel } from './color-adjustments-panel';
import { cn } from '@/lib/utils';

// ==================== MATERIAL EVALUATION HELPERS ====================

// Convert hex color string to RGB object (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0.5, g: 0.5, b: 0.5 };
}

// Simple Perlin-like noise for material evaluation
function perlinNoise(x: number, y: number, seed: number): number {
  const hash = (n: number) => {
    const s = Math.sin(n + seed) * 43758.5453;
    return s - Math.floor(s);
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hash(ix + iy * 57);
  const b = hash(ix + 1 + iy * 57);
  const c = hash(ix + (iy + 1) * 57);
  const d = hash(ix + 1 + (iy + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// Voronoi noise for material evaluation
function voronoiNoise(x: number, y: number, seed: number): number {
  const hash = (ix: number, iy: number) => {
    const n = ix + iy * 57 + seed;
    return {
      x: Math.sin(n) * 43758.5453 % 1,
      y: Math.sin(n * 1.3) * 43758.5453 % 1,
    };
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  let minDist = 2;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const point = hash(ix + i, iy + j);
      const dx = i + point.x - fx;
      const dy = j + point.y - fy;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }
  }
  return Math.min(1, minDist);
}

// Evaluate a material node graph at a given UV coordinate
function evaluateMaterialAtUV(
  nodes: MaterialNode[],
  connections: NodeConnection[],
  outputNodeId: string,
  uv: { x: number; y: number }
): { r: number; g: number; b: number } {
  const visited = new Set<string>();

  const evaluateNode = (nodeId: string): { r: number; g: number; b: number } => {
    if (visited.has(nodeId)) return { r: 0.5, g: 0.5, b: 0.5 };
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { r: 0.5, g: 0.5, b: 0.5 };

    const getInputValue = (portId: string): unknown => {
      const conn = connections.find(c => c.toNodeId === nodeId && c.toPortId === portId);
      if (conn) return evaluateNode(conn.fromNodeId);
      const param = node.parameters.find(p => p.id === portId);
      return param?.value;
    };

    switch (node.type) {
      case 'color-input': {
        const colorStr = node.parameters.find(p => p.id === 'color')?.value as string || '#808080';
        return hexToRgb(colorStr);
      }
      case 'gradient-input': {
        const color1 = node.parameters.find(p => p.id === 'color1')?.value as string || '#000000';
        const color2 = node.parameters.find(p => p.id === 'color2')?.value as string || '#ffffff';
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const t = uv.x;
        return { r: c1.r + (c2.r - c1.r) * t, g: c1.g + (c2.g - c1.g) * t, b: c1.b + (c2.b - c1.b) * t };
      }
      case 'noise-perlin':
      case 'noise-simplex': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const value = perlinNoise(uv.x * scale, uv.y * scale, seed);
        return { r: value, g: value, b: value };
      }
      case 'noise-fbm':
      case 'noise-turbulence': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const octaves = Number(node.parameters.find(p => p.id === 'octaves')?.value || 4);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        let value = 0, amplitude = 1, frequency = scale, maxValue = 0;
        for (let i = 0; i < octaves; i++) {
          value += amplitude * perlinNoise(uv.x * frequency, uv.y * frequency, seed + i);
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        value = value / maxValue;
        if (node.type === 'noise-turbulence') value = Math.abs(value);
        return { r: value, g: value, b: value };
      }
      case 'noise-voronoi':
      case 'noise-worley': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const value = voronoiNoise(uv.x * scale, uv.y * scale, seed);
        return { r: value, g: value, b: value };
      }
      case 'pattern-checker': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 8);
        const value = (Math.floor(uv.x * scale) + Math.floor(uv.y * scale)) % 2;
        return { r: value, g: value, b: value };
      }
      case 'output-color': {
        const input = getInputValue('color') as { r: number; g: number; b: number };
        return input || { r: 0.5, g: 0.5, b: 0.5 };
      }
      case 'output-roughness':
      case 'output-metalness':
      case 'output-ao':
      case 'output-height':
      case 'output-opacity': {
        const input = getInputValue('value') as { r: number; g: number; b: number } | number;
        if (input) {
          if (typeof input === 'number') return { r: input, g: input, b: input };
          return input;
        }
        return { r: 0.5, g: 0.5, b: 0.5 };
      }
      case 'output-normal': {
        const normal = getInputValue('normal') as { r: number; g: number; b: number };
        return normal || { r: 0.5, g: 0.5, b: 1 };
      }
      case 'output-combined':
      case 'output-emission': {
        const color = getInputValue('color') as { r: number; g: number; b: number };
        return color || { r: 0.5, g: 0.5, b: 0.5 };
      }
      default:
        return { r: 0.5, g: 0.5, b: 0.5 };
    }
  };

  let outputNode = nodes.find(n => n.id === outputNodeId);
  if (!outputNode) outputNode = nodes.find(n => n.type.startsWith('output-'));
  if (!outputNode) outputNode = nodes[0];
  return outputNode ? evaluateNode(outputNode.id) : { r: 0.5, g: 0.5, b: 0.5 };
}

// Generate a texture from material node graph
function generateMaterialTexture(
  nodes: MaterialNode[],
  connections: NodeConnection[],
  outputNodeId: string,
  size: number
): ImageData {
  const imageData = new ImageData(size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const uv = { x: x / size, y: y / size };
      const color = evaluateMaterialAtUV(nodes, connections, outputNodeId, uv);
      data[i] = Math.round(Math.max(0, Math.min(1, color.r)) * 255);
      data[i + 1] = Math.round(Math.max(0, Math.min(1, color.g)) * 255);
      data[i + 2] = Math.round(Math.max(0, Math.min(1, color.b)) * 255);
      data[i + 3] = 255;
    }
  }
  return imageData;
}

const blendModes: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

const layerTypeIcons: Record<LayerType, React.ReactNode> = {
  raster: <Image className="w-3.5 h-3.5" />,
  vector: <Pentagon className="w-3.5 h-3.5" />,
  text: <Type className="w-3.5 h-3.5" />,
  shape: <Pentagon className="w-3.5 h-3.5" />,
  group: <FolderClosed className="w-3.5 h-3.5" />,
  adjustment: <Sliders className="w-3.5 h-3.5" />,
  'smart-object': <FileText className="w-3.5 h-3.5" />,
  normal: <CircleDot className="w-3.5 h-3.5" />,
  metalness: <Sparkles className="w-3.5 h-3.5" />,
  roughness: <CircleDot className="w-3.5 h-3.5" />,
  ao: <CircleDot className="w-3.5 h-3.5" />,
};

export function StudioLayersPanel() {
  const {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayer,
    selectedLayerIds,
    toggleLayerSelection,
    groupSelectedLayers,
    mergeSelectedLayers,
    ungroupLayer,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    setLayerBlendMode,
    addLayerMask,
    removeLayerMask,
    updateLayer,
    canvasWidth,
    canvasHeight,
    pushHistory,
  } = useStudioEditor();

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showColorAdjustments, setShowColorAdjustments] = useState(false);
  const [layerContextMenu, setLayerContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Handle keyboard shortcuts for layer operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+G - Group selected layers
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        if (selectedLayerIds.length >= 2) {
          e.preventDefault();
          groupSelectedLayers();
          pushHistory?.('Group layers');
        }
      }
      // Ctrl+Shift+G - Ungroup
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        const selectedLayer = layers.find((l) => l.id === activeLayerId);
        if (selectedLayer?.type === 'group') {
          e.preventDefault();
          ungroupLayer(activeLayerId!);
          pushHistory?.('Ungroup layers');
        }
      }
      // Ctrl+E - Merge selected layers
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        if (selectedLayerIds.length >= 2) {
          e.preventDefault();
          mergeSelectedLayers();
          pushHistory?.('Merge layers');
        }
      }
      // Ctrl+A - Select all layers
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only if focus is on the layers panel
        const target = e.target as HTMLElement;
        if (target.closest('[data-layers-panel]')) {
          e.preventDefault();
          const allIds = layers.map((l) => l.id);
          setActiveLayer(layers[0]?.id || null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerIds, activeLayerId, layers, groupSelectedLayers, mergeSelectedLayers, ungroupLayer, pushHistory, setActiveLayer]);

  // Handle layer click with multi-select support
  const handleLayerClick = useCallback((layerId: string, e: React.MouseEvent) => {
    toggleLayerSelection(layerId, e.ctrlKey || e.metaKey, e.shiftKey);
  }, [toggleLayerSelection]);

  // Handle layer context menu
  const handleLayerContextMenu = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    // Select the layer if not already selected
    if (!selectedLayerIds.includes(layerId)) {
      toggleLayerSelection(layerId, false, false);
    }
    setLayerContextMenu({ x: e.clientX, y: e.clientY, layerId });
  }, [selectedLayerIds, toggleLayerSelection]);

  // Get canvas dimensions with defaults
  const width = canvasWidth || 1024;
  const height = canvasHeight || 1024;

  // Hidden file input ref for image import
  const fileInputRef = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type');
          return;
        }

        setIsProcessing(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            const img = new window.Image();
            img.onload = () => {
              // Scale image to fit canvas while preserving aspect ratio
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d')!;

              // Calculate scaling to fit while preserving aspect ratio
              const scale = Math.min(width / img.width, height / img.height);
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              const offsetX = (width - scaledWidth) / 2;
              const offsetY = (height - scaledHeight) / 2;

              // Clear with transparent background
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

              const scaledDataUrl = canvas.toDataURL('image/png');

              // Create new layer with image
              const layerName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
              const newLayer = addLayer('raster', layerName);
              if (newLayer) {
                setLayers(layers.map(l => l.id === newLayer.id ? {
                  ...l,
                  imageData: scaledDataUrl,
                  transform: {
                    x: offsetX,
                    y: offsetY,
                    width: scaledWidth,
                    height: scaledHeight,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    skewX: 0,
                    skewY: 0,
                  }
                } : l));
              }
              setIsProcessing(false);
            };
            img.onerror = () => {
              console.error('Failed to load image');
              setIsProcessing(false);
            };
            img.src = dataUrl;
          };
          reader.onerror = () => {
            console.error('Failed to read file');
            setIsProcessing(false);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error('Import failed:', err);
          setIsProcessing(false);
        }

        // Reset input
        (e.target as HTMLInputElement).value = '';
      };
    }
  }, [width, height, addLayer, setLayers, layers]);

  const handleImportClick = useCallback(() => {
    // Create and trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    fileInputRef(input);
    input.click();
  }, [fileInputRef]);

  const handleReorder = (newOrder: Layer[]) => {
    setLayers(newOrder);
  };

  const toggleExpand = (id: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Create a new group from selected layer
  const createGroupFromLayer = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    // Generate a unique ID for the group
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the group with the layer ID as a child
    const group: Layer = {
      id: groupId,
      name: `Group ${layers.filter(l => l.type === 'group').length + 1}`,
      type: 'group',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      children: [layer.id],
      isExpanded: true,
    };

    // Update layer to have parent reference and insert group before it
    const layerWithParent = { ...layer, parentId: groupId };
    const layerIndex = layers.findIndex(l => l.id === layerId);
    const newLayers = [...layers];
    newLayers.splice(layerIndex, 1, group, layerWithParent);
    setLayers(newLayers);
    setActiveLayer(groupId);
    setExpandedLayers(prev => new Set([...prev, groupId]));
  }, [layers, setLayers, setActiveLayer]);

  // Add layer to group
  const addToGroup = useCallback((layerId: string, groupId: string) => {
    const layer = layers.find(l => l.id === layerId);
    const group = layers.find(l => l.id === groupId);

    if (!layer || !group || group.type !== 'group') return;

    // Update group's children to include the layer ID
    // Update layer's parentId to reference the group
    const updatedLayers = layers.map(l => {
      if (l.id === groupId) {
        return {
          ...l,
          children: [...(l.children || []), layerId],
        };
      }
      if (l.id === layerId) {
        return {
          ...l,
          parentId: groupId,
        };
      }
      return l;
    });

    setLayers(updatedLayers);
  }, [layers, setLayers]);

  // Remove layer from group
  const removeFromGroup = useCallback((layerId: string, groupId: string) => {
    const group = layers.find(l => l.id === groupId);
    if (!group || !group.children) return;

    // Check if layer ID is in group's children
    if (!group.children.includes(layerId)) return;

    // Update group's children to remove the layer ID
    // Update layer's parentId to undefined
    const updatedLayers = layers.map(l => {
      if (l.id === groupId) {
        return {
          ...l,
          children: l.children?.filter(id => id !== layerId),
        };
      }
      if (l.id === layerId) {
        return {
          ...l,
          parentId: undefined,
        };
      }
      return l;
    });

    setLayers(updatedLayers);
  }, [layers, setLayers]);

  // Toggle mask linked state
  const toggleMaskLinked = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer?.mask) return;

    updateLayer(layerId, {
      mask: {
        ...layer.mask,
        linked: !layer.mask.linked,
      },
    });
  }, [layers, updateLayer]);

  // Toggle mask inverted
  const toggleMaskInverted = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer?.mask) return;

    updateLayer(layerId, {
      mask: {
        ...layer.mask,
        inverted: !layer.mask.inverted,
      },
    });
  }, [layers, updateLayer]);

  // Merge layer down (merge with layer below)
  const mergeLayerDown = useCallback(async (layerId: string) => {
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1 || layerIndex >= layers.length - 1) return;
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const currentLayer = layers[layerIndex];
      const belowLayer = layers[layerIndex + 1];

      // Composite the two layers together
      const canvas = await compositeLayers([currentLayer, belowLayer], width, height);
      const mergedImageData = canvasToDataUrl(canvas);

      // Create merged layer
      const mergedLayer: Layer = {
        id: `merged-${Date.now()}`,
        name: `${currentLayer.name} + ${belowLayer.name}`,
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        imageData: mergedImageData,
      };

      // Remove both layers and add merged
      const newLayers = layers.filter((_, i) => i !== layerIndex && i !== layerIndex + 1);
      newLayers.splice(layerIndex, 0, mergedLayer);

      setLayers(newLayers);
      setActiveLayer(mergedLayer.id);
    } catch (error) {
      console.error('Failed to merge layers:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [layers, setLayers, setActiveLayer, width, height, isProcessing]);

  // Merge all visible layers
  const mergeVisibleLayers = useCallback(async () => {
    const visibleLayers = layers.filter(l => l.visible);
    if (visibleLayers.length < 2) return;
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Composite all visible layers
      const canvas = await compositeLayers(visibleLayers, width, height);
      const mergedImageData = canvasToDataUrl(canvas);

      // Create merged layer
      const mergedLayer: Layer = {
        id: `merged-${Date.now()}`,
        name: 'Merged Visible',
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        imageData: mergedImageData,
      };

      // Keep hidden layers, add merged layer at top
      const hiddenLayers = layers.filter(l => !l.visible);
      const newLayers = [mergedLayer, ...hiddenLayers];

      setLayers(newLayers);
      setActiveLayer(mergedLayer.id);
    } catch (error) {
      console.error('Failed to merge visible layers:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [layers, setLayers, setActiveLayer, width, height, isProcessing]);

  // Flatten all layers
  const flattenLayers = useCallback(async () => {
    if (layers.length < 2) return;
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Composite all layers with white background
      const canvas = await compositeLayers(layers, width, height, '#ffffff');
      const flattenedImageData = canvasToDataUrl(canvas);

      const flattenedLayer: Layer = {
        id: `flattened-${Date.now()}`,
        name: 'Flattened',
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        imageData: flattenedImageData,
      };

      setLayers([flattenedLayer]);
      setActiveLayer(flattenedLayer.id);
    } catch (error) {
      console.error('Failed to flatten layers:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [layers, setLayers, setActiveLayer, width, height, isProcessing]);

  // Rasterize layer (convert vector/text/shape to raster)
  const rasterizeLayer = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'raster') return;
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      let imageData: string | undefined;

      // Render based on layer type
      if (layer.type === 'text' && layer.textContent) {
        imageData = await rasterizeText(layer.textContent, width, height);
      } else if (layer.type === 'shape' && layer.shapeContent) {
        imageData = rasterizeShape(layer.shapeContent, width, height);
      } else if (layer.imageData) {
        // Already has image data, just use it
        imageData = layer.imageData;
      }

      // Convert to raster layer
      updateLayer(layerId, {
        type: 'raster',
        name: `${layer.name} (Rasterized)`,
        imageData,
        // Clear non-raster content
        textContent: undefined,
        shapeContent: undefined,
      });
    } catch (error) {
      console.error('Failed to rasterize layer:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [layers, updateLayer, width, height, isProcessing]);

  // Generate normal map from layer
  const handleGenerateNormalMap = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.imageData) return;
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Generate normal map from the layer's image
      const normalMapImageData = await generateNormalMap(layer.imageData, {
        strength: 2,
        blurRadius: 1,
        invert: false,
        detailScale: 1,
        method: 'sobel',
      });

      const normalMapLayer: Layer = {
        id: `normal-${Date.now()}`,
        name: `${layer.name} Normal`,
        type: 'normal',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        imageData: normalMapImageData,
      };

      // Insert after the source layer
      const layerIndex = layers.findIndex(l => l.id === layerId);
      const newLayers = [...layers];
      newLayers.splice(layerIndex, 0, normalMapLayer);

      setLayers(newLayers);
      setActiveLayer(normalMapLayer.id);
    } catch (error) {
      console.error('Failed to generate normal map:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [layers, setLayers, setActiveLayer, isProcessing]);

  // Handle color adjustment apply
  const handleApplyColorAdjustment = useCallback((layerId: string, adjustedImageData: string) => {
    updateLayer(layerId, { imageData: adjustedImageData });
    setShowColorAdjustments(false);
  }, [updateLayer]);

  // Convert to grayscale (for roughness/metalness)
  const handleConvertToGrayscale = useCallback(async (layerId: string, mapType: 'roughness' | 'metalness') => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.imageData) return;
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Convert to grayscale
      const grayscaleImageData = await convertToGrayscale(
        layer.imageData,
        false, // don't invert
        1,     // contrast
        0      // brightness
      );

      const newLayer: Layer = {
        id: `${mapType}-${Date.now()}`,
        name: `${layer.name} ${mapType.charAt(0).toUpperCase() + mapType.slice(1)}`,
        type: mapType,
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'normal',
        imageData: grayscaleImageData,
      };

      const layerIndex = layers.findIndex(l => l.id === layerId);
      const newLayers = [...layers];
      newLayers.splice(layerIndex, 0, newLayer);

      setLayers(newLayers);
      setActiveLayer(newLayer.id);
    } catch (error) {
      console.error('Failed to convert to grayscale:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [layers, setLayers, setActiveLayer, isProcessing]);

  return (
    <div className="flex-1 flex flex-col min-h-0 border-t border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Layers</span>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="w-3.5 h-3.5 text-white/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1a1c] border-white/10">
              <DropdownMenuItem
                onClick={handleImportClick}
                className="text-white hover:bg-white/10"
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Image...
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => addLayer('raster')}
                className="text-white hover:bg-white/10"
              >
                <Image className="w-4 h-4 mr-2" />
                Raster Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addLayer('text', 'Text')}
                className="text-white hover:bg-white/10"
              >
                <Type className="w-4 h-4 mr-2" />
                Text Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addLayer('shape', 'Shape')}
                className="text-white hover:bg-white/10"
              >
                <Pentagon className="w-4 h-4 mr-2" />
                Shape Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addLayer('group', 'Group')}
                className="text-white hover:bg-white/10"
              >
                <FolderClosed className="w-4 h-4 mr-2" />
                New Group
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => addLayer('normal', 'Normal Map')}
                className="text-white hover:bg-white/10"
              >
                <CircleDot className="w-4 h-4 mr-2" />
                Normal Map Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addLayer('metalness', 'Metalness')}
                className="text-white hover:bg-white/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Metalness Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addLayer('roughness', 'Roughness')}
                className="text-white hover:bg-white/10"
              >
                <CircleDot className="w-4 h-4 mr-2" />
                Roughness Layer
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={mergeVisibleLayers}
                className="text-white hover:bg-white/10"
                disabled={layers.filter(l => l.visible).length < 2}
              >
                <Merge className="w-4 h-4 mr-2" />
                Merge Visible
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={flattenLayers}
                className="text-white hover:bg-white/10"
                disabled={layers.length < 2}
              >
                <Layers className="w-4 h-4 mr-2" />
                Flatten Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Blend Mode & Opacity (for active layer) */}
      {activeLayer && (
        <div className="px-3 py-2 border-b border-white/10 space-y-2">
          <Select
            value={activeLayer.blendMode}
            onValueChange={(v) => setLayerBlendMode(activeLayer.id, v as BlendMode)}
          >
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1c] border-white/10">
              {blendModes.map((mode) => (
                <SelectItem
                  key={mode.value}
                  value={mode.value}
                  className="text-white text-xs hover:bg-white/10"
                >
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-12">Opacity</span>
            <Slider
              value={[activeLayer.opacity]}
              onValueChange={([v]) => setLayerOpacity(activeLayer.id, v)}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] text-white/60 w-8 text-right">
              {activeLayer.opacity}%
            </span>
          </div>
        </div>
      )}

      {/* Layer Effects */}
      {activeLayer && (
        <LayerEffectsPanel
          layer={activeLayer}
          onUpdateLayer={(updates) => updateLayer(activeLayer.id, updates)}
        />
      )}

      {/* Color Adjustments Panel (Modal) */}
      {showColorAdjustments && activeLayer && activeLayer.imageData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ColorAdjustmentsPanel
            layer={activeLayer}
            onApplyAdjustment={handleApplyColorAdjustment}
            onClose={() => setShowColorAdjustments(false)}
          />
        </div>
      )}

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Layers className="w-8 h-8 text-white/20 mb-2" />
            <span className="text-xs text-white/40">No layers yet</span>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={layers}
            onReorder={handleReorder}
            className="p-1"
          >
            <AnimatePresence>
              {layers.map((layer) => (
                <Reorder.Item
                  key={layer.id}
                  value={layer}
                  className="relative"
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Layer Item */}
                    <div
                      onClick={() => setActiveLayer(layer.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.types.includes('application/material')) {
                          setDragOverLayerId(layer.id);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverLayerId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverLayerId(null);
                        const materialData = e.dataTransfer.getData('application/material');
                        if (materialData) {
                          try {
                            const material = JSON.parse(materialData);
                            // Generate material texture and apply to this layer
                            const CANVAS_SIZE = 1024;
                            const canvas = document.createElement('canvas');
                            canvas.width = CANVAS_SIZE;
                            canvas.height = CANVAS_SIZE;
                            const ctx = canvas.getContext('2d')!;

                            // Check if material has nodes and connections for proper evaluation
                            if (material.nodes && material.nodes.length > 0) {
                              // Generate texture from material node graph
                              const textureData = generateMaterialTexture(
                                material.nodes,
                                material.connections || [],
                                material.outputNodeId || '',
                                CANVAS_SIZE
                              );
                              ctx.putImageData(textureData, 0, 0);
                            } else {
                              // Fallback: simple gradient if no nodes defined
                              const gradient = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                              gradient.addColorStop(0, '#ff6600');
                              gradient.addColorStop(0.5, '#ff9933');
                              gradient.addColorStop(1, '#ffcc00');
                              ctx.fillStyle = gradient;
                              ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                            }

                            const imageDataUrl = canvas.toDataURL('image/png');
                            updateLayer(layer.id, { imageData: imageDataUrl });
                            pushHistory?.(`Apply material ${material.name} to ${layer.name}`);
                          } catch (err) {
                            console.error('Failed to apply material:', err);
                          }
                        }
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer select-none group transition-all',
                        activeLayerId === layer.id
                          ? 'bg-orange-500/20'
                          : 'hover:bg-white/5',
                        dragOverLayerId === layer.id && 'ring-2 ring-orange-500 bg-orange-500/10'
                      )}
                    >
                      {/* Expand/Collapse for groups */}
                      {layer.type === 'group' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(layer.id);
                          }}
                          className="p-0.5 hover:bg-white/10 rounded"
                        >
                          <ChevronRight
                            className={cn(
                              'w-3 h-3 text-white/40 transition-transform',
                              expandedLayers.has(layer.id) && 'rotate-90'
                            )}
                          />
                        </button>
                      ) : (
                        <div className="w-4" />
                      )}

                      {/* Visibility Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(layer.id);
                        }}
                        className="p-0.5 hover:bg-white/10 rounded"
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5 text-white/60" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-white/30" />
                        )}
                      </button>

                      {/* Layer Type Icon */}
                      <span className="text-white/40">
                        {layer.type === 'group' && expandedLayers.has(layer.id)
                          ? <FolderOpen className="w-3.5 h-3.5" />
                          : layerTypeIcons[layer.type]}
                      </span>

                      {/* Thumbnail */}
                      <div
                        className={cn(
                          'w-7 h-7 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden',
                          !layer.visible && 'opacity-40'
                        )}
                      >
                        {layer.imageData ? (
                          <img
                            src={layer.imageData}
                            alt={layer.name}
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'auto' }}
                          />
                        ) : layer.type === 'group' ? (
                          layer.isExpanded ? (
                            <FolderOpen className="w-3 h-3 text-white/30" />
                          ) : (
                            <FolderClosed className="w-3 h-3 text-white/30" />
                          )
                        ) : layer.type === 'text' ? (
                          <Type className="w-3 h-3 text-white/30" />
                        ) : layer.type === 'shape' ? (
                          <Pentagon className="w-3 h-3 text-white/30" />
                        ) : layer.type === 'adjustment' ? (
                          <Sliders className="w-3 h-3 text-white/30" />
                        ) : layer.smartFill ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-50" />
                        ) : (
                          <span className="text-white/20 text-[7px]">Empty</span>
                        )}
                      </div>

                      {/* Layer Name */}
                      <span
                        className={cn(
                          'flex-1 text-xs truncate',
                          layer.visible ? 'text-white/80' : 'text-white/40'
                        )}
                      >
                        {layer.name}
                      </span>

                      {/* Lock Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerLock(layer.id);
                        }}
                        className={cn(
                          'p-0.5 hover:bg-white/10 rounded',
                          layer.locked ? 'text-orange-400' : 'text-white/30'
                        )}
                      >
                        {layer.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </button>

                      {/* Mask Indicator with link toggle */}
                      {layer.mask && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMaskLinked(layer.id);
                            }}
                            className="p-0.5 hover:bg-white/10 rounded"
                            title={layer.mask.linked ? 'Unlink mask' : 'Link mask'}
                          >
                            {layer.mask.linked ? (
                              <Link className="w-2.5 h-2.5 text-white/40" />
                            ) : (
                              <Unlink className="w-2.5 h-2.5 text-white/30" />
                            )}
                          </button>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-sm border',
                              layer.mask.inverted
                                ? 'bg-black border-white/50'
                                : 'bg-white/80 border-white/30'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMaskInverted(layer.id);
                            }}
                            title="Toggle mask invert"
                          />
                        </div>
                      )}

                      {/* More Options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a1c] border-white/10">
                          <DropdownMenuItem
                            onClick={() => duplicateLayer(layer.id)}
                            className="text-white hover:bg-white/10 text-xs"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {layer.type !== 'group' && (
                            <DropdownMenuItem
                              onClick={() => createGroupFromLayer(layer.id)}
                              className="text-white hover:bg-white/10 text-xs"
                            >
                              <FolderClosed className="w-3 h-3 mr-2" />
                              Create Group
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          {!layer.mask ? (
                            <DropdownMenuItem
                              onClick={() => addLayerMask(layer.id)}
                              className="text-white hover:bg-white/10 text-xs"
                            >
                              Add Mask
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() => toggleMaskInverted(layer.id)}
                                className="text-white hover:bg-white/10 text-xs"
                              >
                                {layer.mask.inverted ? 'Uninvert Mask' : 'Invert Mask'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => removeLayerMask(layer.id)}
                                className="text-white hover:bg-white/10 text-xs"
                              >
                                Remove Mask
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          {/* Merge options */}
                          <DropdownMenuItem
                            onClick={() => mergeLayerDown(layer.id)}
                            className="text-white hover:bg-white/10 text-xs"
                            disabled={layers.indexOf(layer) >= layers.length - 1}
                          >
                            <Merge className="w-3 h-3 mr-2" />
                            Merge Down
                          </DropdownMenuItem>
                          {/* Rasterize option for non-raster layers */}
                          {(layer.type === 'text' || layer.type === 'shape' || layer.type === 'vector') && (
                            <DropdownMenuItem
                              onClick={() => rasterizeLayer(layer.id)}
                              className="text-white hover:bg-white/10 text-xs"
                            >
                              <Grid2x2 className="w-3 h-3 mr-2" />
                              Rasterize Layer
                            </DropdownMenuItem>
                          )}
                          {/* Generate maps options */}
                          {layer.type === 'raster' && layer.imageData && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveLayer(layer.id);
                                  setShowColorAdjustments(true);
                                }}
                                className="text-white hover:bg-white/10 text-xs"
                              >
                                <Sliders className="w-3 h-3 mr-2" />
                                Color Adjustments...
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleGenerateNormalMap(layer.id)}
                                className="text-white hover:bg-white/10 text-xs"
                              >
                                <Wand2 className="w-3 h-3 mr-2" />
                                Generate Normal Map
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleConvertToGrayscale(layer.id, 'roughness')}
                                className="text-white hover:bg-white/10 text-xs"
                              >
                                <CircleDot className="w-3 h-3 mr-2" />
                                To Roughness Map
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleConvertToGrayscale(layer.id, 'metalness')}
                                className="text-white hover:bg-white/10 text-xs"
                              >
                                <Sparkles className="w-3 h-3 mr-2" />
                                To Metalness Map
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => moveLayer(layer.id, 'up')}
                            className="text-white hover:bg-white/10 text-xs"
                          >
                            <ChevronUp className="w-3 h-3 mr-2" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => moveLayer(layer.id, 'down')}
                            className="text-white hover:bg-white/10 text-xs"
                          >
                            <ChevronDown className="w-3 h-3 mr-2" />
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => removeLayer(layer.id)}
                            className="text-red-400 hover:bg-red-500/10 text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Children layers (for groups) */}
                    {layer.type === 'group' && expandedLayers.has(layer.id) && layer.children && (
                      <div className="ml-4 pl-2 border-l border-white/10">
                        {layer.children.map((childId) => {
                          const child = layers.find(l => l.id === childId);
                          if (!child) return null;
                          return (
                            <div
                              key={child.id}
                              onClick={(e) => handleLayerClick(child.id, e)}
                              onContextMenu={(e) => handleLayerContextMenu(e, child.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer select-none group',
                                activeLayerId === child.id
                                  ? 'bg-orange-500/20'
                                  : selectedLayerIds.includes(child.id)
                                    ? 'bg-orange-500/10'
                                    : 'hover:bg-white/5'
                              )}
                            >
                              {/* Visibility */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLayerVisibility(child.id);
                                }}
                                className="p-0.5 hover:bg-white/10 rounded"
                              >
                                {child.visible ? (
                                  <Eye className="w-3 h-3 text-white/60" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-white/30" />
                                )}
                              </button>

                              {/* Type Icon */}
                              <span className="text-white/40">
                                {layerTypeIcons[child.type]}
                              </span>

                              {/* Thumbnail */}
                              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {child.imageData ? (
                                  <img src={child.imageData} alt={child.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white/20 text-[6px]">-</span>
                                )}
                              </div>

                              {/* Name */}
                              <span className="flex-1 text-[11px] truncate text-white/70">
                                {child.name}
                              </span>

                              {/* Remove from group */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromGroup(child.id, layer.id);
                                }}
                                className="p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100"
                                title="Remove from group"
                              >
                                <ChevronUp className="w-3 h-3 text-white/40" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-center gap-1 px-2 py-2 border-t border-white/10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => addLayer('raster')}
            >
              <Plus className="w-3.5 h-3.5 text-white/60" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Layer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => activeLayerId && duplicateLayer(activeLayerId)}
              disabled={!activeLayerId}
            >
              <Copy className="w-3.5 h-3.5 text-white/60" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate Layer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => activeLayerId && removeLayer(activeLayerId)}
              disabled={!activeLayerId || layers.length <= 1}
            >
              <Trash2 className="w-3.5 h-3.5 text-white/60" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Layer</TooltipContent>
        </Tooltip>
      </div>

      {/* Layer context menu */}
      {layerContextMenu && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-48"
          style={{ left: layerContextMenu.x, top: layerContextMenu.y }}
          onClick={() => setLayerContextMenu(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => {
              const layer = layers.find(l => l.id === layerContextMenu.layerId);
              if (layer) {
                duplicateLayer(layerContextMenu.layerId);
              }
            }}
          >
            <Copy className="w-4 h-4" />
            Duplicate Layer
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => {
              const layer = layers.find(l => l.id === layerContextMenu.layerId);
              if (layer) {
                updateLayer(layerContextMenu.layerId, { locked: !layer.locked });
              }
            }}
          >
            {layers.find(l => l.id === layerContextMenu.layerId)?.locked ? (
              <>
                <Unlock className="w-4 h-4" />
                Unlock Layer
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Lock Layer
              </>
            )}
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => {
              const layer = layers.find(l => l.id === layerContextMenu.layerId);
              if (layer) {
                updateLayer(layerContextMenu.layerId, { visible: !layer.visible });
              }
            }}
          >
            {layers.find(l => l.id === layerContextMenu.layerId)?.visible !== false ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Layer
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Layer
              </>
            )}
          </button>
          <div className="h-px bg-zinc-700 my-1" />
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => moveLayer(layerContextMenu.layerId, 'up')}
          >
            <ChevronUp className="w-4 h-4" />
            Move Up
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => moveLayer(layerContextMenu.layerId, 'down')}
          >
            <ChevronDown className="w-4 h-4" />
            Move Down
          </button>
          <div className="h-px bg-zinc-700 my-1" />
          {selectedLayerIds.length > 1 && (
            <>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                onClick={groupSelectedLayers}
              >
                <FolderClosed className="w-4 h-4" />
                Group Selected (Ctrl+G)
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                onClick={mergeSelectedLayers}
              >
                <Merge className="w-4 h-4" />
                Merge Selected (Ctrl+E)
              </button>
              <div className="h-px bg-zinc-700 my-1" />
            </>
          )}
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            onClick={() => {
              if (layers.length > 1) {
                removeLayer(layerContextMenu.layerId);
              }
            }}
            disabled={layers.length <= 1}
          >
            <Trash2 className="w-4 h-4" />
            Delete Layer
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {layerContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setLayerContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setLayerContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
