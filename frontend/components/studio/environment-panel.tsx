/**
 * Environment Panel Component
 *
 * Controls lighting and environment settings for the 3D preview.
 * Affects how materials appear under different lighting conditions.
 *
 * Features:
 * - Lighting presets (studio, outdoor, night, sunset)
 * - Light direction and intensity controls
 * - Ambient and specular light settings
 * - Environment rotation
 * - HDR environment maps
 *
 * @module components/studio/environment-panel
 */

'use client';

import { useState } from 'react';
import { Sun, Moon, Cloud, Sunset, Sparkles, Lightbulb, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnvironmentSettings, EnvironmentPreset } from '@/types/studio';
import { DEFAULT_ENVIRONMENT } from '@/types/studio';

interface EnvironmentPanelProps {
  settings: EnvironmentSettings;
  onChange: (settings: EnvironmentSettings) => void;
  className?: string;
}

const PRESETS: { id: EnvironmentPreset; name: string; icon: React.ReactNode; description: string }[] = [
  { id: 'studio-soft', name: 'Studio Soft', icon: <Lightbulb className="w-4 h-4" />, description: 'Soft diffused lighting' },
  { id: 'studio-hard', name: 'Studio Hard', icon: <Sun className="w-4 h-4" />, description: 'Hard directional light' },
  { id: 'outdoor-sunny', name: 'Outdoor Sunny', icon: <Sun className="w-4 h-4" />, description: 'Bright outdoor sun' },
  { id: 'outdoor-cloudy', name: 'Outdoor Cloudy', icon: <Cloud className="w-4 h-4" />, description: 'Overcast sky' },
  { id: 'sunset', name: 'Sunset', icon: <Sunset className="w-4 h-4" />, description: 'Warm golden hour' },
  { id: 'night', name: 'Night', icon: <Moon className="w-4 h-4" />, description: 'Dark ambient' },
  { id: 'neon', name: 'Neon', icon: <Sparkles className="w-4 h-4" />, description: 'Colorful neon lights' },
  { id: 'dramatic', name: 'Dramatic', icon: <Sun className="w-4 h-4" />, description: 'High contrast' },
  { id: 'product-shot', name: 'Product', icon: <Lightbulb className="w-4 h-4" />, description: 'Clean product lighting' },
];

const PRESET_VALUES: Record<EnvironmentPreset, Partial<EnvironmentSettings>> = {
  'studio-soft': {
    intensity: 1,
    rotation: 0,
    backgroundColor: '#1a1a1c',
    showReflections: true,
    shadowIntensity: 0.3,
    ambientOcclusion: true,
    aoStrength: 0.2,
  },
  'studio-hard': {
    intensity: 1.5,
    rotation: 45,
    backgroundColor: '#0f0f10',
    showReflections: true,
    shadowIntensity: 0.8,
    ambientOcclusion: true,
    aoStrength: 0.4,
  },
  'outdoor-sunny': {
    intensity: 2,
    rotation: 120,
    backgroundColor: '#87ceeb',
    showReflections: true,
    shadowIntensity: 0.9,
    ambientOcclusion: false,
    aoStrength: 0,
  },
  'outdoor-cloudy': {
    intensity: 0.8,
    rotation: 0,
    backgroundColor: '#a0aab8',
    showReflections: false,
    shadowIntensity: 0.2,
    ambientOcclusion: true,
    aoStrength: 0.15,
  },
  'sunset': {
    intensity: 1.2,
    rotation: 270,
    backgroundColor: '#ff6b35',
    showReflections: true,
    shadowIntensity: 0.6,
    ambientOcclusion: true,
    aoStrength: 0.25,
  },
  'night': {
    intensity: 0.3,
    rotation: 180,
    backgroundColor: '#0a0a12',
    showReflections: true,
    shadowIntensity: 0.1,
    ambientOcclusion: true,
    aoStrength: 0.5,
  },
  'neon': {
    intensity: 0.8,
    rotation: 0,
    backgroundColor: '#1a0a2e',
    showReflections: true,
    shadowIntensity: 0.4,
    ambientOcclusion: false,
    aoStrength: 0,
  },
  'dramatic': {
    intensity: 2,
    rotation: 90,
    backgroundColor: '#000000',
    showReflections: true,
    shadowIntensity: 1,
    ambientOcclusion: true,
    aoStrength: 0.6,
  },
  'product-shot': {
    intensity: 1.2,
    rotation: 30,
    backgroundColor: '#f5f5f5',
    showReflections: true,
    shadowIntensity: 0.4,
    ambientOcclusion: true,
    aoStrength: 0.2,
  },
  'custom': {},
};

export function EnvironmentPanel({ settings, onChange, className }: EnvironmentPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetSelect = (preset: EnvironmentPreset) => {
    const presetValues = PRESET_VALUES[preset];
    onChange({
      ...settings,
      ...presetValues,
      preset,
    });
  };

  const handleReset = () => {
    onChange(DEFAULT_ENVIRONMENT);
  };

  const updateSetting = <K extends keyof EnvironmentSettings>(key: K, value: EnvironmentSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
      preset: 'custom',
    });
  };

  return (
    <div className={cn('bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800 flex flex-col', className)}>
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Environment</h3>
        <button
          onClick={handleReset}
          className="p-1 hover:bg-zinc-700 rounded transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Presets */}
      <div className="p-2 border-b border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Lighting Presets</div>
        <div className="grid grid-cols-3 gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded transition-colors',
                settings.preset === preset.id
                  ? 'bg-orange-600/20 border border-orange-600/50'
                  : 'hover:bg-zinc-800'
              )}
              title={preset.description}
            >
              {preset.icon}
              <span className="text-[10px] text-zinc-400 text-center truncate w-full">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main controls */}
      <div className="p-3 space-y-4 flex-1 overflow-auto">
        {/* Intensity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Intensity</label>
            <span className="text-xs text-zinc-500">{Math.round(settings.intensity * 100)}%</span>
          </div>
          <input
            type="range"
            value={settings.intensity * 100}
            min={0}
            max={300}
            onChange={(e) => updateSetting('intensity', parseFloat(e.target.value) / 100)}
            className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Rotation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Rotation</label>
            <span className="text-xs text-zinc-500">{Math.round(settings.rotation)}°</span>
          </div>
          <input
            type="range"
            value={settings.rotation}
            min={0}
            max={360}
            onChange={(e) => updateSetting('rotation', parseFloat(e.target.value))}
            className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Background Color */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => updateSetting('backgroundColor', e.target.value)}
              className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={settings.backgroundColor}
              onChange={(e) => updateSetting('backgroundColor', e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
            />
          </div>
        </div>

        {/* Shadow Intensity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Shadow Intensity</label>
            <span className="text-xs text-zinc-500">{Math.round(settings.shadowIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            value={settings.shadowIntensity * 100}
            min={0}
            max={100}
            onChange={(e) => updateSetting('shadowIntensity', parseFloat(e.target.value) / 100)}
            className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-zinc-400">Reflections</span>
            <button
              onClick={() => updateSetting('showReflections', !settings.showReflections)}
              className={cn(
                'p-1 rounded transition-colors',
                settings.showReflections ? 'bg-orange-600 text-white' : 'bg-zinc-700 text-zinc-400'
              )}
            >
              {settings.showReflections ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-zinc-400">Ambient Occlusion</span>
            <button
              onClick={() => updateSetting('ambientOcclusion', !settings.ambientOcclusion)}
              className={cn(
                'p-1 rounded transition-colors',
                settings.ambientOcclusion ? 'bg-orange-600 text-white' : 'bg-zinc-700 text-zinc-400'
              )}
            >
              {settings.ambientOcclusion ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </label>
        </div>

        {/* AO Strength */}
        {settings.ambientOcclusion && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400">AO Strength</label>
              <span className="text-xs text-zinc-500">{Math.round(settings.aoStrength * 100)}%</span>
            </div>
            <input
              type="range"
              value={settings.aoStrength * 100}
              min={0}
              max={100}
              onChange={(e) => updateSetting('aoStrength', parseFloat(e.target.value) / 100)}
              className="w-full h-1 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        )}

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2 transition-colors"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            {/* HDRI upload */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Custom HDRI</label>
              <input
                type="file"
                accept=".hdr,.exr,.png,.jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      updateSetting('customHdri', reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600"
              />
            </div>

            {settings.customHdri && (
              <button
                onClick={() => updateSetting('customHdri', undefined)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove custom HDRI
              </button>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Preview</div>
        <div
          className="aspect-video rounded overflow-hidden relative"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          <EnvironmentPreview settings={settings} />
        </div>
      </div>
    </div>
  );
}

function EnvironmentPreview({ settings }: { settings: EnvironmentSettings }) {
  // Simple 3D-like preview sphere
  const lightAngle = (settings.rotation * Math.PI) / 180;
  const lightX = Math.cos(lightAngle) * 50 + 50;
  const lightY = Math.sin(lightAngle) * 50 + 50;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="sphere-grad" cx={`${lightX}%`} cy={`${lightY}%`} r="60%">
          <stop
            offset="0%"
            stopColor={`rgba(255,255,255,${settings.intensity * 0.8})`}
          />
          <stop offset="50%" stopColor="#888" />
          <stop
            offset="100%"
            stopColor={`rgba(0,0,0,${settings.shadowIntensity})`}
          />
        </radialGradient>
        {settings.showReflections && (
          <radialGradient id="reflection" cx="30%" cy="30%" r="40%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        )}
        {settings.ambientOcclusion && (
          <filter id="ao-filter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="out" />
          </filter>
        )}
      </defs>

      {/* Shadow */}
      {settings.shadowIntensity > 0 && (
        <ellipse
          cx="50"
          cy="85"
          rx={25 + settings.shadowIntensity * 10}
          ry={5 + settings.shadowIntensity * 3}
          fill={`rgba(0,0,0,${settings.shadowIntensity * 0.5})`}
          filter="url(#ao-filter)"
        />
      )}

      {/* Sphere */}
      <circle cx="50" cy="50" r="30" fill="url(#sphere-grad)" />

      {/* Reflection highlight */}
      {settings.showReflections && (
        <circle cx="42" cy="42" r="10" fill="url(#reflection)" />
      )}
    </svg>
  );
}
