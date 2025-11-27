'use client';

import { useState } from 'react';
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
  Layers,
  Image,
  Type,
  FolderClosed,
  Sliders,
  CircleDot,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { Layer, BlendMode, LayerType } from '@/types/studio';
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
  vector: <Type className="w-3.5 h-3.5" />,
  group: <FolderClosed className="w-3.5 h-3.5" />,
  adjustment: <Sliders className="w-3.5 h-3.5" />,
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
  } = useStudioEditor();

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());

  const activeLayer = layers.find((l) => l.id === activeLayerId);

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
                onClick={() => addLayer('vector')}
                className="text-white hover:bg-white/10"
              >
                <Type className="w-4 h-4 mr-2" />
                Vector Layer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addLayer('group')}
                className="text-white hover:bg-white/10"
              >
                <FolderClosed className="w-4 h-4 mr-2" />
                Group
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
                    onClick={() => setActiveLayer(layer.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none ${
                      activeLayerId === layer.id
                        ? 'bg-orange-500/20'
                        : 'hover:bg-white/5'
                    }`}
                  >
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
                      {layerTypeIcons[layer.type]}
                    </span>

                    {/* Thumbnail */}
                    <div
                      className={`w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden ${
                        !layer.visible ? 'opacity-40' : ''
                      }`}
                    >
                      {layer.imageData ? (
                        <img
                          src={layer.imageData}
                          alt={layer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white/20 text-[8px]">Empty</span>
                      )}
                    </div>

                    {/* Layer Name */}
                    <span
                      className={`flex-1 text-xs truncate ${
                        layer.visible ? 'text-white/80' : 'text-white/40'
                      }`}
                    >
                      {layer.name}
                    </span>

                    {/* Lock Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerLock(layer.id);
                      }}
                      className={`p-0.5 hover:bg-white/10 rounded ${
                        layer.locked ? 'text-orange-400' : 'text-white/30'
                      }`}
                    >
                      {layer.locked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>

                    {/* Mask Indicator */}
                    {layer.mask && (
                      <div className="w-4 h-4 rounded-sm bg-white/20 border border-white/30" />
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
                        {!layer.mask ? (
                          <DropdownMenuItem
                            onClick={() => addLayerMask(layer.id)}
                            className="text-white hover:bg-white/10 text-xs"
                          >
                            Add Mask
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => removeLayerMask(layer.id)}
                            className="text-white hover:bg-white/10 text-xs"
                          >
                            Remove Mask
                          </DropdownMenuItem>
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
