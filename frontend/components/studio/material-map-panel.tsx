'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  CircleDot,
  Paintbrush,
  Layers,
  Sliders,
  RefreshCw,
  Download,
  Upload,
  Wand2,
  Sun,
  Moon,
  Mountain,
  Droplets,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { cn } from '@/lib/utils';

interface MaterialMapPanelProps {
  mapType: 'metalness' | 'roughness' | 'normal';
  className?: string;
}

// Metalness presets
const METALNESS_PRESETS = [
  { id: 'chrome', name: 'Chrome', value: 1.0, roughness: 0.1, color: '#c0c0c0' },
  { id: 'gold', name: 'Gold', value: 1.0, roughness: 0.3, color: '#ffd700' },
  { id: 'copper', name: 'Copper', value: 1.0, roughness: 0.4, color: '#b87333' },
  { id: 'aluminum', name: 'Aluminum', value: 0.9, roughness: 0.3, color: '#a8a9ad' },
  { id: 'iron', name: 'Iron', value: 0.8, roughness: 0.5, color: '#434b4d' },
  { id: 'bronze', name: 'Bronze', value: 0.85, roughness: 0.4, color: '#cd7f32' },
  { id: 'silver', name: 'Silver', value: 0.95, roughness: 0.2, color: '#c0c0c0' },
  { id: 'plastic', name: 'Plastic', value: 0.0, roughness: 0.4, color: '#333333' },
  { id: 'rubber', name: 'Rubber', value: 0.0, roughness: 0.9, color: '#1a1a1a' },
  { id: 'glass', name: 'Glass', value: 0.0, roughness: 0.05, color: '#ffffff' },
];

// Normal map generation modes
const NORMAL_MODES = [
  { id: 'height', name: 'From Height', icon: Mountain, description: 'Generate from grayscale height map' },
  { id: 'sobel', name: 'Sobel Filter', icon: Layers, description: 'Edge detection based normals' },
  { id: 'emboss', name: 'Emboss Effect', icon: Sun, description: 'Directional emboss normals' },
  { id: 'detail', name: 'Detail Extract', icon: Zap, description: 'Extract fine surface details' },
];

export function MaterialMapPanel({ mapType, className }: MaterialMapPanelProps) {
  const { layers, activeLayerId, updateLayer, pushHistory, addLayer } = useStudioEditor();

  // Metalness settings
  const [metalnessValue, setMetalnessValue] = useState(0.5);
  const [roughnessValue, setRoughnessValue] = useState(0.5);
  const [brushMetalness, setBrushMetalness] = useState(1.0);

  // Normal map settings
  const [normalStrength, setNormalStrength] = useState(1.0);
  const [normalBlur, setNormalBlur] = useState(0);
  const [normalMode, setNormalMode] = useState<'height' | 'sobel' | 'emboss' | 'detail'>('height');
  const [invertNormals, setInvertNormals] = useState(false);

  // Generate metalness map from color layer
  const generateMetalnessFromColor = useCallback(() => {
    if (!activeLayerId) return;

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer?.imageData) return;

    // Create canvas to process image
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 1024, 1024);
      const imageData = ctx.getImageData(0, 0, 1024, 1024);
      const data = imageData.data;

      // Convert to grayscale metalness based on brightness and saturation
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Bright, desaturated areas are more metallic
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;

        // Higher luminance + lower saturation = more metallic
        let metalness = (luminance / 255) * (1 - saturation * 0.5) * metalnessValue;
        metalness = Math.max(0, Math.min(1, metalness));

        const value = Math.round(metalness * 255);
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }

      ctx.putImageData(imageData, 0, 0);

      const imageDataUrl = canvas.toDataURL();

      // Update the special metalness layer (for material maps)
      const metalnessLayer = layers.find(l => l.type === 'metalness');
      if (metalnessLayer) {
        updateLayer(metalnessLayer.id, { imageData: imageDataUrl });
      }

      // Also create a visible raster layer on the canvas
      const newLayer = addLayer('raster', 'Metalness Map');
      if (newLayer) {
        updateLayer(newLayer.id, { imageData: imageDataUrl });
      }

      pushHistory('Generate metalness map');
    };
    img.src = activeLayer.imageData;
  }, [activeLayerId, layers, metalnessValue, updateLayer, pushHistory, addLayer]);

  // Generate normal map from color layer
  const generateNormalFromColor = useCallback(() => {
    if (!activeLayerId) return;

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer?.imageData) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 1024, 1024);
      const imageData = ctx.getImageData(0, 0, 1024, 1024);
      const data = imageData.data;
      const width = 1024;
      const height = 1024;

      // Convert to grayscale height first
      const heightMap = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        heightMap[i] = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
      }

      // Apply blur if requested
      if (normalBlur > 0) {
        const blurRadius = Math.ceil(normalBlur);
        const blurred = new Float32Array(heightMap.length);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sum = 0;
            let count = 0;

            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                const nx = Math.max(0, Math.min(width - 1, x + dx));
                const ny = Math.max(0, Math.min(height - 1, y + dy));
                sum += heightMap[ny * width + nx];
                count++;
              }
            }

            blurred[y * width + x] = sum / count;
          }
        }

        heightMap.set(blurred);
      }

      // Generate normal map using Sobel operator
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          // Sobel kernels
          const tl = heightMap[(y - 1) * width + (x - 1)];
          const t = heightMap[(y - 1) * width + x];
          const tr = heightMap[(y - 1) * width + (x + 1)];
          const l = heightMap[y * width + (x - 1)];
          const r = heightMap[y * width + (x + 1)];
          const bl = heightMap[(y + 1) * width + (x - 1)];
          const b = heightMap[(y + 1) * width + x];
          const br = heightMap[(y + 1) * width + (x + 1)];

          // Calculate gradients
          let dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
          let dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

          // Apply strength
          dx *= normalStrength;
          dy *= normalStrength;

          // Invert if requested
          if (invertNormals) {
            dx = -dx;
            dy = -dy;
          }

          // Normalize and convert to color
          const length = Math.sqrt(dx * dx + dy * dy + 1);
          const nx = (dx / length + 1) * 0.5;
          const ny = (dy / length + 1) * 0.5;
          const nz = (1 / length + 1) * 0.5;

          data[idx] = Math.round(nx * 255);
          data[idx + 1] = Math.round(ny * 255);
          data[idx + 2] = Math.round(nz * 255);
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const imageDataUrl = canvas.toDataURL();

      // Update the special normal layer (for material maps)
      const normalLayer = layers.find(l => l.type === 'normal');
      if (normalLayer) {
        updateLayer(normalLayer.id, { imageData: imageDataUrl });
      }

      // Also create a visible raster layer on the canvas
      const newLayer = addLayer('raster', 'Normal Map');
      if (newLayer) {
        updateLayer(newLayer.id, { imageData: imageDataUrl });
      }

      pushHistory('Generate normal map');
    };
    img.src = activeLayer.imageData;
  }, [activeLayerId, layers, normalStrength, normalBlur, invertNormals, updateLayer, pushHistory, addLayer]);

  // Fill with preset
  const applyMetalnessPreset = useCallback((preset: typeof METALNESS_PRESETS[0]) => {
    const metalnessLayer = layers.find(l => l.type === 'metalness');
    if (!metalnessLayer) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const value = Math.round(preset.value * 255);
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(0, 0, 1024, 1024);

    updateLayer(metalnessLayer.id, { imageData: canvas.toDataURL() });
    setMetalnessValue(preset.value);
    setRoughnessValue(preset.roughness);
    pushHistory(`Apply ${preset.name} preset`);
  }, [layers, updateLayer, pushHistory]);

  // Fill layer with flat normal (0.5, 0.5, 1.0 = flat surface)
  const fillFlatNormal = useCallback(() => {
    const normalLayer = layers.find(l => l.type === 'normal');
    if (!normalLayer) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#8080ff'; // Neutral normal (pointing up)
    ctx.fillRect(0, 0, 1024, 1024);

    updateLayer(normalLayer.id, { imageData: canvas.toDataURL() });
    pushHistory('Fill flat normal');
  }, [layers, updateLayer, pushHistory]);

  if (mapType === 'metalness' || mapType === 'roughness') {
    return (
      <div className={cn('bg-[#121214] border-l border-white/10 overflow-auto', className)}>
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-medium text-white">
              {mapType === 'metalness' ? 'Metalness Editor' : 'Roughness Editor'}
            </h3>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {/* Brush Settings */}
          <div className="space-y-2">
            <label className="text-xs text-white/60 flex items-center gap-1">
              <Paintbrush className="w-3 h-3" />
              Brush Value
            </label>
            <Slider
              value={[brushMetalness]}
              onValueChange={([v]) => setBrushMetalness(v)}
              min={0}
              max={1}
              step={0.01}
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>{mapType === 'metalness' ? 'Non-Metal' : 'Smooth'}</span>
              <span>{(brushMetalness * 100).toFixed(0)}%</span>
              <span>{mapType === 'metalness' ? 'Metal' : 'Rough'}</span>
            </div>
          </div>

          {/* Generation */}
          <div className="space-y-2">
            <label className="text-xs text-white/60 flex items-center gap-1">
              <Wand2 className="w-3 h-3" />
              Auto Generate
            </label>
            <div className="space-y-2">
              <Slider
                value={[metalnessValue]}
                onValueChange={([v]) => setMetalnessValue(v)}
                min={0}
                max={1}
                step={0.01}
              />
              <div className="text-[10px] text-white/40 text-center">
                Intensity: {(metalnessValue * 100).toFixed(0)}%
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={generateMetalnessFromColor}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Generate from Color
              </Button>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-xs text-white/60 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Material Presets
            </label>
            <div className="grid grid-cols-2 gap-1">
              {METALNESS_PRESETS.map((preset) => (
                <motion.button
                  key={preset.id}
                  onClick={() => applyMetalnessPreset(preset)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-4 h-4 rounded-sm border border-white/20"
                    style={{
                      background: `linear-gradient(135deg, ${preset.color} 0%, ${preset.color}88 50%, ${preset.color}44 100%)`,
                    }}
                  />
                  <span>{preset.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Quick Fill */}
          <div className="space-y-2">
            <label className="text-xs text-white/60">Quick Fill</label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => {
                  const layer = layers.find(l => l.type === mapType);
                  if (!layer) return;
                  const canvas = document.createElement('canvas');
                  canvas.width = 1024;
                  canvas.height = 1024;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, 1024, 1024);
                  updateLayer(layer.id, { imageData: canvas.toDataURL() });
                  pushHistory(`Fill ${mapType} black`);
                }}
              >
                <Moon className="w-3 h-3 mr-1" />
                0%
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => {
                  const layer = layers.find(l => l.type === mapType);
                  if (!layer) return;
                  const canvas = document.createElement('canvas');
                  canvas.width = 1024;
                  canvas.height = 1024;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.fillStyle = '#808080';
                  ctx.fillRect(0, 0, 1024, 1024);
                  updateLayer(layer.id, { imageData: canvas.toDataURL() });
                  pushHistory(`Fill ${mapType} 50%`);
                }}
              >
                <Sliders className="w-3 h-3 mr-1" />
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => {
                  const layer = layers.find(l => l.type === mapType);
                  if (!layer) return;
                  const canvas = document.createElement('canvas');
                  canvas.width = 1024;
                  canvas.height = 1024;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, 1024, 1024);
                  updateLayer(layer.id, { imageData: canvas.toDataURL() });
                  pushHistory(`Fill ${mapType} white`);
                }}
              >
                <Sun className="w-3 h-3 mr-1" />
                100%
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal map editor
  return (
    <div className={cn('bg-[#121214] border-l border-white/10 overflow-auto', className)}>
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-[#8080ff]" />
          <h3 className="text-sm font-medium text-white">Normal Map Editor</h3>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Normal Strength */}
        <div className="space-y-2">
          <label className="text-xs text-white/60 flex items-center gap-1">
            <Mountain className="w-3 h-3" />
            Normal Strength
          </label>
          <Slider
            value={[normalStrength]}
            onValueChange={([v]) => setNormalStrength(v)}
            min={0.1}
            max={5}
            step={0.1}
          />
          <div className="text-[10px] text-white/40 text-center">
            {normalStrength.toFixed(1)}x
          </div>
        </div>

        {/* Blur */}
        <div className="space-y-2">
          <label className="text-xs text-white/60 flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            Smooth/Blur
          </label>
          <Slider
            value={[normalBlur]}
            onValueChange={([v]) => setNormalBlur(v)}
            min={0}
            max={10}
            step={1}
          />
          <div className="text-[10px] text-white/40 text-center">
            Radius: {normalBlur}px
          </div>
        </div>

        {/* Invert */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/60">Invert Normals</label>
          <Button
            variant={invertNormals ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setInvertNormals(!invertNormals)}
          >
            {invertNormals ? 'Inverted' : 'Normal'}
          </Button>
        </div>

        {/* Generation Modes */}
        <div className="space-y-2">
          <label className="text-xs text-white/60 flex items-center gap-1">
            <Wand2 className="w-3 h-3" />
            Generation Method
          </label>
          <div className="space-y-1">
            {NORMAL_MODES.map((mode) => (
              <motion.button
                key={mode.id}
                onClick={() => setNormalMode(mode.id as typeof normalMode)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors',
                  normalMode === mode.id
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
                whileTap={{ scale: 0.98 }}
              >
                <mode.icon className="w-4 h-4" />
                <div>
                  <div className="text-xs font-medium">{mode.name}</div>
                  <div className="text-[10px] text-white/40">{mode.description}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={generateNormalFromColor}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Normal Map
        </Button>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="text-xs text-white/60">Quick Actions</label>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={fillFlatNormal}
            >
              Flat Normal
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => {
                const normalLayer = layers.find(l => l.type === 'normal');
                if (normalLayer?.imageData) {
                  const link = document.createElement('a');
                  link.download = 'normal_map.png';
                  link.href = normalLayer.imageData;
                  link.click();
                }
              }}
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
