'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Droplets,
  Sun,
  Moon,
  Circle,
  Palette,
  Blend,
  PenTool,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Layer, LayerEffect, LayerEffectType, BlendMode } from '@/types/studio';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface LayerEffectsPanelProps {
  layer: Layer;
  onUpdateLayer: (updates: Partial<Layer>) => void;
  className?: string;
}

const EFFECT_TYPES: { type: LayerEffectType; name: string; icon: React.ReactNode }[] = [
  { type: 'drop-shadow', name: 'Drop Shadow', icon: <Droplets className="w-4 h-4" /> },
  { type: 'inner-shadow', name: 'Inner Shadow', icon: <Moon className="w-4 h-4" /> },
  { type: 'outer-glow', name: 'Outer Glow', icon: <Sun className="w-4 h-4" /> },
  { type: 'inner-glow', name: 'Inner Glow', icon: <Circle className="w-4 h-4" /> },
  { type: 'color-overlay', name: 'Color Overlay', icon: <Palette className="w-4 h-4" /> },
  { type: 'stroke', name: 'Stroke', icon: <PenTool className="w-4 h-4" /> },
];

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'hard-light', label: 'Hard Light' },
];

const DEFAULT_EFFECT_PARAMS: Record<LayerEffectType, Record<string, unknown>> = {
  'drop-shadow': {
    color: '#000000',
    opacity: 75,
    angle: 135,
    distance: 10,
    spread: 0,
    size: 10,
  },
  'inner-shadow': {
    color: '#000000',
    opacity: 75,
    angle: 135,
    distance: 5,
    choke: 0,
    size: 5,
  },
  'outer-glow': {
    color: '#ffff00',
    opacity: 75,
    spread: 0,
    size: 20,
  },
  'inner-glow': {
    color: '#ffffff',
    opacity: 75,
    choke: 0,
    size: 10,
    source: 'edge', // 'edge' or 'center'
  },
  'bevel-emboss': {
    style: 'outer',
    technique: 'smooth',
    depth: 100,
    direction: 'up',
    size: 5,
    soften: 0,
    angle: 135,
    altitude: 30,
    highlightMode: 'screen',
    highlightOpacity: 75,
    shadowMode: 'multiply',
    shadowOpacity: 75,
  },
  'satin': {
    color: '#000000',
    opacity: 50,
    angle: 19,
    distance: 11,
    size: 14,
    invert: false,
  },
  'color-overlay': {
    color: '#ff0000',
    opacity: 100,
  },
  'gradient-overlay': {
    opacity: 100,
    angle: 90,
    scale: 100,
    reverse: false,
  },
  'pattern-overlay': {
    opacity: 100,
    scale: 100,
  },
  'stroke': {
    color: '#000000',
    size: 3,
    position: 'outside', // 'inside', 'center', 'outside'
    opacity: 100,
  },
};

export function LayerEffectsPanel({ layer, onUpdateLayer, className }: LayerEffectsPanelProps) {
  const [expandedEffects, setExpandedEffects] = useState<Set<string>>(new Set());

  const effects = layer.effects || [];

  const toggleEffectExpanded = useCallback((effectId: string) => {
    setExpandedEffects(prev => {
      const next = new Set(prev);
      if (next.has(effectId)) {
        next.delete(effectId);
      } else {
        next.add(effectId);
      }
      return next;
    });
  }, []);

  const addEffect = useCallback((type: LayerEffectType) => {
    const newEffect: LayerEffect = {
      id: `effect-${Date.now()}`,
      type,
      enabled: true,
      blendMode: 'normal',
      opacity: 100,
      parameters: { ...DEFAULT_EFFECT_PARAMS[type] },
    };

    onUpdateLayer({
      effects: [...effects, newEffect],
    });

    // Auto-expand new effect
    setExpandedEffects(prev => new Set(prev).add(newEffect.id));
  }, [effects, onUpdateLayer]);

  const removeEffect = useCallback((effectId: string) => {
    onUpdateLayer({
      effects: effects.filter(e => e.id !== effectId),
    });
  }, [effects, onUpdateLayer]);

  const toggleEffectEnabled = useCallback((effectId: string) => {
    onUpdateLayer({
      effects: effects.map(e =>
        e.id === effectId ? { ...e, enabled: !e.enabled } : e
      ),
    });
  }, [effects, onUpdateLayer]);

  const updateEffectParam = useCallback((effectId: string, param: string, value: unknown) => {
    onUpdateLayer({
      effects: effects.map(e =>
        e.id === effectId
          ? { ...e, parameters: { ...e.parameters, [param]: value } }
          : e
      ),
    });
  }, [effects, onUpdateLayer]);

  const updateEffectBlendMode = useCallback((effectId: string, blendMode: BlendMode) => {
    onUpdateLayer({
      effects: effects.map(e =>
        e.id === effectId ? { ...e, blendMode } : e
      ),
    });
  }, [effects, onUpdateLayer]);

  const updateEffectOpacity = useCallback((effectId: string, opacity: number) => {
    onUpdateLayer({
      effects: effects.map(e =>
        e.id === effectId ? { ...e, opacity } : e
      ),
    });
  }, [effects, onUpdateLayer]);

  const getEffectIcon = (type: LayerEffectType) => {
    return EFFECT_TYPES.find(e => e.type === type)?.icon || <Blend className="w-4 h-4" />;
  };

  const getEffectName = (type: LayerEffectType) => {
    return EFFECT_TYPES.find(e => e.type === type)?.name || type;
  };

  return (
    <div className={cn('bg-zinc-900/95 border-t border-zinc-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-400">Layer Effects</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1c] border-zinc-700">
            {EFFECT_TYPES.map((effect) => (
              <DropdownMenuItem
                key={effect.type}
                onClick={() => addEffect(effect.type)}
                className="text-zinc-200 hover:bg-zinc-800"
              >
                {effect.icon}
                <span className="ml-2">{effect.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Effects List */}
      <div className="max-h-60 overflow-y-auto">
        {effects.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-500 text-center">
            No effects applied. Click + to add.
          </div>
        ) : (
          <AnimatePresence>
            {effects.map((effect) => (
              <motion.div
                key={effect.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-zinc-800 last:border-b-0"
              >
                {/* Effect Header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer"
                  onClick={() => toggleEffectExpanded(effect.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEffectEnabled(effect.id);
                    }}
                    className={cn(
                      'p-0.5 rounded transition-colors',
                      effect.enabled ? 'text-orange-400' : 'text-zinc-600'
                    )}
                  >
                    {effect.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <span className={cn(
                    'flex-1 text-xs',
                    effect.enabled ? 'text-zinc-200' : 'text-zinc-500'
                  )}>
                    {getEffectIcon(effect.type)}
                    <span className="ml-2">{getEffectName(effect.type)}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEffect(effect.id);
                    }}
                    className="p-0.5 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedEffects.has(effect.id) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </div>

                {/* Effect Parameters */}
                <AnimatePresence>
                  {expandedEffects.has(effect.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-3 pb-3 space-y-2"
                    >
                      {/* Common controls */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-zinc-500">Blend Mode</label>
                        </div>
                        <Select
                          value={effect.blendMode}
                          onValueChange={(v) => updateEffectBlendMode(effect.id, v as BlendMode)}
                        >
                          <SelectTrigger className="h-6 text-[10px] bg-zinc-800 border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {BLEND_MODES.map(mode => (
                              <SelectItem key={mode.value} value={mode.value} className="text-xs">
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Effect-specific parameters */}
                      {renderEffectParams(effect, updateEffectParam)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function renderEffectParams(
  effect: LayerEffect,
  updateParam: (effectId: string, param: string, value: unknown) => void
) {
  const params = effect.parameters;
  const id = effect.id;

  switch (effect.type) {
    case 'drop-shadow':
    case 'inner-shadow':
      return (
        <>
          <ColorParam label="Color" value={params.color as string} onChange={(v) => updateParam(id, 'color', v)} />
          <SliderParam label="Opacity" value={params.opacity as number} min={0} max={100} onChange={(v) => updateParam(id, 'opacity', v)} />
          <SliderParam label="Angle" value={params.angle as number} min={0} max={360} onChange={(v) => updateParam(id, 'angle', v)} />
          <SliderParam label="Distance" value={params.distance as number} min={0} max={100} onChange={(v) => updateParam(id, 'distance', v)} />
          <SliderParam label="Size" value={params.size as number} min={0} max={100} onChange={(v) => updateParam(id, 'size', v)} />
        </>
      );

    case 'outer-glow':
    case 'inner-glow':
      return (
        <>
          <ColorParam label="Color" value={params.color as string} onChange={(v) => updateParam(id, 'color', v)} />
          <SliderParam label="Opacity" value={params.opacity as number} min={0} max={100} onChange={(v) => updateParam(id, 'opacity', v)} />
          <SliderParam label="Size" value={params.size as number} min={0} max={100} onChange={(v) => updateParam(id, 'size', v)} />
        </>
      );

    case 'color-overlay':
      return (
        <>
          <ColorParam label="Color" value={params.color as string} onChange={(v) => updateParam(id, 'color', v)} />
          <SliderParam label="Opacity" value={params.opacity as number} min={0} max={100} onChange={(v) => updateParam(id, 'opacity', v)} />
        </>
      );

    case 'stroke':
      return (
        <>
          <ColorParam label="Color" value={params.color as string} onChange={(v) => updateParam(id, 'color', v)} />
          <SliderParam label="Size" value={params.size as number} min={1} max={50} onChange={(v) => updateParam(id, 'size', v)} />
          <SliderParam label="Opacity" value={params.opacity as number} min={0} max={100} onChange={(v) => updateParam(id, 'opacity', v)} />
        </>
      );

    default:
      return null;
  }
}

function SliderParam({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-zinc-500">{label}</label>
        <span className="text-[10px] text-zinc-400">{Math.round(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(v[0])}
        className="h-1"
      />
    </div>
  );
}

function ColorParam({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-zinc-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-[10px] font-mono text-zinc-300"
        />
      </div>
    </div>
  );
}
