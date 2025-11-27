'use client';

import { useState } from 'react';
import { Layers, Square, Circle, Droplet, Grid, Waves, Hash, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmartMask, SmartMaskType, SmartMaskParameters } from '@/types/studio';

interface SmartMasksPanelProps {
  masks: SmartMask[];
  onApplyMask: (mask: SmartMask) => void;
  onCreateMask: (mask: SmartMask) => void;
  className?: string;
}

const MASK_PRESETS: { type: SmartMaskType; name: string; icon: React.ReactNode; defaultParams: SmartMaskParameters }[] = [
  {
    type: 'corner-radius',
    name: 'Corner Radius',
    icon: <Square className="w-4 h-4" />,
    defaultParams: { cornerRadius: 64, cornerSmooth: 0.5 },
  },
  {
    type: 'border-gradient',
    name: 'Border Fade',
    icon: <Layers className="w-4 h-4" />,
    defaultParams: { borderWidth: 32, borderSoftness: 1, borderOffset: 0 },
  },
  {
    type: 'vignette',
    name: 'Vignette',
    icon: <Circle className="w-4 h-4" />,
    defaultParams: { vignetteStrength: 0.5, vignetteRadius: 0.7, vignetteSoftness: 0.3 },
  },
  {
    type: 'radial-gradient',
    name: 'Radial Gradient',
    icon: <Droplet className="w-4 h-4" />,
    defaultParams: { gradientStops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#000000' }] },
  },
  {
    type: 'linear-gradient',
    name: 'Linear Gradient',
    icon: <Layers className="w-4 h-4" />,
    defaultParams: { gradientAngle: 0, gradientStops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#000000' }] },
  },
  {
    type: 'noise-mask',
    name: 'Noise',
    icon: <Hash className="w-4 h-4" />,
    defaultParams: { noiseScale: 50, noiseOctaves: 4, noisePersistence: 0.5, noiseSeed: 12345 },
  },
  {
    type: 'pattern-mask',
    name: 'Pattern',
    icon: <Grid className="w-4 h-4" />,
    defaultParams: { patternType: 'checker', patternScale: 20, patternRotation: 0 },
  },
  {
    type: 'edge-detect',
    name: 'Edge Detect',
    icon: <Waves className="w-4 h-4" />,
    defaultParams: {},
  },
  {
    type: 'distance-field',
    name: 'Distance Field',
    icon: <Circle className="w-4 h-4" />,
    defaultParams: {},
  },
];

export function SmartMasksPanel({ masks, onApplyMask, onCreateMask, className }: SmartMasksPanelProps) {
  const [selectedMask, setSelectedMask] = useState<SmartMask | null>(null);
  const [editParams, setEditParams] = useState<SmartMaskParameters>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newMaskType, setNewMaskType] = useState<SmartMaskType>('corner-radius');
  const [newMaskName, setNewMaskName] = useState('');

  const handleSelectMask = (mask: SmartMask) => {
    setSelectedMask(mask);
    setEditParams({ ...mask.parameters });
  };

  const handleUpdateParam = (key: string, value: number | string | boolean) => {
    setEditParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    if (selectedMask) {
      onApplyMask({ ...selectedMask, parameters: editParams });
    }
  };

  const handleCreate = () => {
    const preset = MASK_PRESETS.find((p) => p.type === newMaskType);
    if (preset && newMaskName) {
      const mask: SmartMask = {
        id: `mask-${Date.now()}`,
        name: newMaskName,
        type: newMaskType,
        parameters: { ...preset.defaultParams },
      };
      onCreateMask(mask);
      setIsCreating(false);
      setNewMaskName('');
    }
  };

  const renderParamEditor = (params: SmartMaskParameters, type: SmartMaskType) => {
    switch (type) {
      case 'corner-radius':
        return (
          <>
            <ParamSlider
              label="Radius"
              value={params.cornerRadius ?? 64}
              min={0}
              max={256}
              onChange={(v) => handleUpdateParam('cornerRadius', v)}
            />
            <ParamSlider
              label="Smoothness"
              value={(params.cornerSmooth ?? 0.5) * 100}
              min={0}
              max={100}
              onChange={(v) => handleUpdateParam('cornerSmooth', v / 100)}
            />
          </>
        );
      case 'border-gradient':
        return (
          <>
            <ParamSlider
              label="Width"
              value={params.borderWidth ?? 32}
              min={1}
              max={256}
              onChange={(v) => handleUpdateParam('borderWidth', v)}
            />
            <ParamSlider
              label="Softness"
              value={(params.borderSoftness ?? 1) * 100}
              min={0}
              max={100}
              onChange={(v) => handleUpdateParam('borderSoftness', v / 100)}
            />
            <ParamSlider
              label="Offset"
              value={params.borderOffset ?? 0}
              min={-128}
              max={128}
              onChange={(v) => handleUpdateParam('borderOffset', v)}
            />
          </>
        );
      case 'vignette':
        return (
          <>
            <ParamSlider
              label="Strength"
              value={(params.vignetteStrength ?? 0.5) * 100}
              min={0}
              max={100}
              onChange={(v) => handleUpdateParam('vignetteStrength', v / 100)}
            />
            <ParamSlider
              label="Radius"
              value={(params.vignetteRadius ?? 0.7) * 100}
              min={0}
              max={100}
              onChange={(v) => handleUpdateParam('vignetteRadius', v / 100)}
            />
            <ParamSlider
              label="Softness"
              value={(params.vignetteSoftness ?? 0.3) * 100}
              min={0}
              max={100}
              onChange={(v) => handleUpdateParam('vignetteSoftness', v / 100)}
            />
          </>
        );
      case 'noise-mask':
        return (
          <>
            <ParamSlider
              label="Scale"
              value={params.noiseScale ?? 50}
              min={1}
              max={200}
              onChange={(v) => handleUpdateParam('noiseScale', v)}
            />
            <ParamSlider
              label="Octaves"
              value={params.noiseOctaves ?? 4}
              min={1}
              max={8}
              step={1}
              onChange={(v) => handleUpdateParam('noiseOctaves', Math.round(v))}
            />
            <ParamSlider
              label="Persistence"
              value={(params.noisePersistence ?? 0.5) * 100}
              min={0}
              max={100}
              onChange={(v) => handleUpdateParam('noisePersistence', v / 100)}
            />
            <ParamSlider
              label="Seed"
              value={params.noiseSeed ?? 12345}
              min={0}
              max={99999}
              step={1}
              onChange={(v) => handleUpdateParam('noiseSeed', Math.round(v))}
            />
          </>
        );
      case 'pattern-mask':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Pattern Type</label>
              <select
                value={params.patternType ?? 'checker'}
                onChange={(e) => handleUpdateParam('patternType', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="checker">Checker</option>
                <option value="stripes">Stripes</option>
                <option value="dots">Dots</option>
                <option value="grid">Grid</option>
                <option value="hexagon">Hexagon</option>
              </select>
            </div>
            <ParamSlider
              label="Scale"
              value={params.patternScale ?? 20}
              min={1}
              max={100}
              onChange={(v) => handleUpdateParam('patternScale', v)}
            />
            <ParamSlider
              label="Rotation"
              value={params.patternRotation ?? 0}
              min={0}
              max={360}
              onChange={(v) => handleUpdateParam('patternRotation', v)}
            />
          </>
        );
      case 'linear-gradient':
        return (
          <ParamSlider
            label="Angle"
            value={params.gradientAngle ?? 0}
            min={0}
            max={360}
            onChange={(v) => handleUpdateParam('gradientAngle', v)}
          />
        );
      default:
        return <div className="text-xs text-zinc-500">No adjustable parameters</div>;
    }
  };

  return (
    <div className={cn('bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800 flex flex-col', className)}>
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Smart Masks</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-zinc-700 rounded transition-colors"
        >
          <Plus className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Create new mask */}
      {isCreating && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">New Mask</span>
            <button onClick={() => setIsCreating(false)} className="p-1 hover:bg-zinc-700 rounded">
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Mask name..."
            value={newMaskName}
            onChange={(e) => setNewMaskName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          />
          <select
            value={newMaskType}
            onChange={(e) => setNewMaskType(e.target.value as SmartMaskType)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            {MASK_PRESETS.map((preset) => (
              <option key={preset.type} value={preset.type}>
                {preset.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!newMaskName}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded px-2 py-1 text-xs font-medium transition-colors"
          >
            Create
          </button>
        </div>
      )}

      {/* Preset masks */}
      <div className="p-2 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Presets</div>
        <div className="grid grid-cols-3 gap-1">
          {MASK_PRESETS.map((preset) => (
            <button
              key={preset.type}
              onClick={() =>
                handleSelectMask({
                  id: `preset-${preset.type}`,
                  name: preset.name,
                  type: preset.type,
                  parameters: preset.defaultParams,
                })
              }
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded transition-colors',
                selectedMask?.type === preset.type ? 'bg-orange-600/20 border border-orange-600/50' : 'hover:bg-zinc-800'
              )}
            >
              {preset.icon}
              <span className="text-[10px] text-zinc-400 text-center">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom masks */}
      {masks.length > 0 && (
        <div className="p-2 border-b border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">Custom Masks</div>
          <div className="space-y-1">
            {masks.map((mask) => (
              <button
                key={mask.id}
                onClick={() => handleSelectMask(mask)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded text-left transition-colors',
                  selectedMask?.id === mask.id ? 'bg-orange-600/20 border border-orange-600/50' : 'hover:bg-zinc-800'
                )}
              >
                <Layers className="w-4 h-4 text-zinc-400" />
                <span className="text-xs text-zinc-300 truncate">{mask.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Parameter editor */}
      {selectedMask && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="text-xs text-zinc-400 font-medium">{selectedMask.name}</div>
          {renderParamEditor(editParams, selectedMask.type)}

          <button
            onClick={handleApply}
            className="w-full bg-orange-600 hover:bg-orange-500 rounded px-3 py-2 text-xs font-medium transition-colors"
          >
            Apply to Layer
          </button>
        </div>
      )}

      {/* Preview canvas */}
      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Preview</div>
        <div className="aspect-square bg-zinc-800 rounded overflow-hidden">
          <MaskPreview mask={selectedMask} params={editParams} />
        </div>
      </div>
    </div>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400">{label}</label>
        <span className="text-xs text-zinc-500">{Math.round(value * 100) / 100}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
      />
    </div>
  );
}

function MaskPreview({ mask, params }: { mask: SmartMask | null; params: SmartMaskParameters }) {
  if (!mask) {
    return <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">Select a mask</div>;
  }

  // Generate simple preview based on mask type
  const generatePreviewStyle = (): React.CSSProperties => {
    switch (mask.type) {
      case 'corner-radius':
        return {
          background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
          borderRadius: `${params.cornerRadius ?? 64}px`,
        };
      case 'vignette':
        const strength = params.vignetteStrength ?? 0.5;
        const radius = params.vignetteRadius ?? 0.7;
        return {
          background: `radial-gradient(ellipse at center, #fff ${radius * 100}%, rgba(0,0,0,${strength}) 100%)`,
        };
      case 'border-gradient':
        const width = params.borderWidth ?? 32;
        return {
          background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, #fff 0%, #000 100%) border-box`,
          border: `${width}px solid transparent`,
          borderRadius: '4px',
        };
      case 'linear-gradient':
        const angle = params.gradientAngle ?? 0;
        return {
          background: `linear-gradient(${angle}deg, #fff 0%, #000 100%)`,
        };
      case 'radial-gradient':
        return {
          background: 'radial-gradient(circle at center, #fff 0%, #000 100%)',
        };
      case 'noise-mask':
        return {
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${(params.noiseScale ?? 50) / 100}' numOctaves='${params.noiseOctaves ?? 4}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        };
      case 'pattern-mask':
        const scale = params.patternScale ?? 20;
        if (params.patternType === 'checker') {
          return {
            background: `repeating-conic-gradient(#fff 0% 25%, #000 0% 50%) 50% / ${scale}px ${scale}px`,
          };
        }
        if (params.patternType === 'stripes') {
          return {
            background: `repeating-linear-gradient(${params.patternRotation ?? 0}deg, #fff 0px, #fff ${scale / 2}px, #000 ${scale / 2}px, #000 ${scale}px)`,
          };
        }
        return {
          background: `repeating-conic-gradient(#888 0% 25%, #444 0% 50%) 50% / ${scale}px ${scale}px`,
        };
      default:
        return {
          background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
        };
    }
  };

  return <div className="w-full h-full" style={generatePreviewStyle()} />;
}
