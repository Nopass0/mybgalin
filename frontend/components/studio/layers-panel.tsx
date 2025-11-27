'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { Layer, BlendMode, LayerType } from '@/types/studio';
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
import { cn } from '@/lib/utils';

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
  } = useStudioEditor();

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Get canvas dimensions with defaults
  const width = canvasWidth || 1024;
  const height = canvasHeight || 1024;

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

    // Create the group with the layer as a child
    const group: Layer = {
      id: groupId,
      name: `Group ${layers.filter(l => l.type === 'group').length + 1}`,
      type: 'group',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      children: [layer],
      isExpanded: true,
    };

    // Replace the layer with the group
    const newLayers = layers.map(l => l.id === layerId ? group : l);
    setLayers(newLayers);
    setActiveLayer(groupId);
    setExpandedLayers(prev => new Set([...prev, groupId]));
  }, [layers, setLayers, setActiveLayer]);

  // Add layer to group
  const addToGroup = useCallback((layerId: string, groupId: string) => {
    const layer = layers.find(l => l.id === layerId);
    const group = layers.find(l => l.id === groupId);

    if (!layer || !group || group.type !== 'group') return;

    // Remove layer from top level
    const newLayers = layers.filter(l => l.id !== layerId);

    // Add to group's children
    const updatedLayers = newLayers.map(l => {
      if (l.id === groupId) {
        return {
          ...l,
          children: [...(l.children || []), layer],
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

    const layer = group.children.find(c => c.id === layerId);
    if (!layer) return;

    // Remove from group's children
    const updatedLayers = layers.map(l => {
      if (l.id === groupId) {
        return {
          ...l,
          children: l.children?.filter(c => c.id !== layerId),
        };
      }
      return l;
    });

    // Add back to top level after the group
    const groupIndex = updatedLayers.findIndex(l => l.id === groupId);
    updatedLayers.splice(groupIndex + 1, 0, layer);

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
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer select-none group',
                        activeLayerId === layer.id
                          ? 'bg-orange-500/20'
                          : 'hover:bg-white/5'
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
                          />
                        ) : layer.type === 'group' ? (
                          <FolderClosed className="w-3 h-3 text-white/30" />
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
                          {layer.type === 'raster' && (
                            <>
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
                        {layer.children.map((child) => (
                          <div
                            key={child.id}
                            onClick={() => setActiveLayer(child.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer select-none group',
                              activeLayerId === child.id
                                ? 'bg-orange-500/20'
                                : 'hover:bg-white/5'
                            )}
                          >
                            {/* Visibility */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Need to implement child visibility toggle
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
                        ))}
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
    </div>
  );
}
