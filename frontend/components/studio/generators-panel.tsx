/**
 * Generators Panel Component
 *
 * Procedural texture generation tools for the CS2 Skin Studio.
 * Creates textures algorithmically from parameters.
 *
 * Features:
 * - Noise generators (Perlin, Simplex, Voronoi)
 * - Pattern generators (stripes, checker, hexagon)
 * - Randomization controls with seed values
 * - Real-time preview with adjustable parameters
 * - Export to layer functionality
 *
 * @module components/studio/generators-panel
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Shuffle, Download, Layers, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Generator, GeneratorType, GeneratorParameters } from '@/types/studio';

interface GeneratorsPanelProps {
  onApplyToLayer: (imageData: ImageData) => void;
  onCreateLayer: (imageData: ImageData, name: string) => void;
  className?: string;
}

interface GeneratorPreset {
  type: GeneratorType;
  name: string;
  description: string;
  icon: string;
  defaultParams: GeneratorParameters;
}

const GENERATORS: GeneratorPreset[] = [
  {
    type: 'noise',
    name: 'Perlin Noise',
    description: 'Smooth continuous noise',
    icon: '🌫️',
    defaultParams: { scale: 50, octaves: 4, persistence: 0.5, lacunarity: 2, seed: 12345 },
  },
  {
    type: 'plasma',
    name: 'Plasma',
    description: 'Colorful plasma effect',
    icon: '🌈',
    defaultParams: { scale: 30, colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'], seed: 12345 },
  },
  {
    type: 'clouds',
    name: 'Clouds',
    description: 'Soft cloud texture',
    icon: '☁️',
    defaultParams: { scale: 80, octaves: 6, persistence: 0.6, contrast: 1, brightness: 0 },
  },
  {
    type: 'marble',
    name: 'Marble',
    description: 'Natural marble veins',
    icon: '🪨',
    defaultParams: { scale: 40, octaves: 5, turbulence: 5, colors: ['#ffffff', '#888888', '#333333'] },
  },
  {
    type: 'wood',
    name: 'Wood Grain',
    description: 'Natural wood pattern',
    icon: '🪵',
    defaultParams: { scale: 20, rings: 10, turbulence: 0.3, colors: ['#8b4513', '#654321', '#3d2817'] },
  },
  {
    type: 'metal',
    name: 'Brushed Metal',
    description: 'Metallic surface',
    icon: '🔩',
    defaultParams: { scale: 100, direction: 0, strength: 0.3, colors: ['#c0c0c0', '#a0a0a0'] },
  },
  {
    type: 'fabric',
    name: 'Fabric Weave',
    description: 'Woven fabric texture',
    icon: '🧵',
    defaultParams: { scale: 10, weaveType: 'plain', colors: ['#4a4a4a', '#3a3a3a'] },
  },
  {
    type: 'leather',
    name: 'Leather',
    description: 'Natural leather grain',
    icon: '👜',
    defaultParams: { scale: 30, bumpiness: 0.5, colors: ['#8b4513', '#654321'] },
  },
  {
    type: 'concrete',
    name: 'Concrete',
    description: 'Rough concrete surface',
    icon: '🧱',
    defaultParams: { scale: 60, roughness: 0.7, colors: ['#808080', '#707070', '#606060'] },
  },
  {
    type: 'rust',
    name: 'Rust',
    description: 'Oxidized metal rust',
    icon: '🟤',
    defaultParams: { scale: 40, density: 0.5, colors: ['#8b4513', '#a0522d', '#cd853f'] },
  },
  {
    type: 'scratches',
    name: 'Scratches',
    description: 'Surface scratches',
    icon: '📝',
    defaultParams: { density: 50, length: 100, angle: 45, randomness: 0.5 },
  },
  {
    type: 'dirt',
    name: 'Dirt',
    description: 'Dirt and grime',
    icon: '🟫',
    defaultParams: { scale: 50, density: 0.4, colors: ['#3d2817', '#2d1810', '#1d0800'] },
  },
  {
    type: 'grunge',
    name: 'Grunge',
    description: 'Worn grunge overlay',
    icon: '🎸',
    defaultParams: { scale: 40, intensity: 0.5, seed: 12345 },
  },
  {
    type: 'gradient',
    name: 'Gradient',
    description: 'Color gradient',
    icon: '🎨',
    defaultParams: { angle: 0, colors: ['#000000', '#ffffff'] },
  },
  {
    type: 'pattern',
    name: 'Pattern',
    description: 'Geometric pattern',
    icon: '🔷',
    defaultParams: { patternType: 'checker', scale: 20, colors: ['#ffffff', '#000000'] },
  },
];

export function GeneratorsPanel({ onApplyToLayer, onCreateLayer, className }: GeneratorsPanelProps) {
  // Select first generator by default
  const [selectedGenerator, setSelectedGenerator] = useState<GeneratorPreset | null>(GENERATORS[0]);
  const [params, setParams] = useState<GeneratorParameters>(GENERATORS[0].defaultParams);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewSize] = useState(256);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTexture = useCallback(() => {
    if (!selectedGenerator || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGenerating(true);

    // Clear canvas first with checkerboard background
    const checkSize = 8;
    for (let y = 0; y < previewSize; y += checkSize) {
      for (let x = 0; x < previewSize; x += checkSize) {
        const isLight = ((x / checkSize) + (y / checkSize)) % 2 === 0;
        ctx.fillStyle = isLight ? '#3a3a3c' : '#2d2d2f';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    const imageData = ctx.createImageData(previewSize, previewSize);
    const data = imageData.data;

    const seed = Number(params.seed ?? 12345);
    const scale = Number(params.scale ?? 50);

    // Seeded random function
    const seededRandom = (s: number) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    // Simple noise function
    const noise2D = (x: number, y: number, s: number) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;

      const a = seededRandom(ix + iy * 57 + s);
      const b = seededRandom(ix + 1 + iy * 57 + s);
      const c = seededRandom(ix + (iy + 1) * 57 + s);
      const d = seededRandom(ix + 1 + (iy + 1) * 57 + s);

      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);

      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };

    // Fractal noise
    const fbm = (x: number, y: number, octaves: number, persistence: number, lacunarity: number, s: number) => {
      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;

      for (let i = 0; i < octaves; i++) {
        value += amplitude * noise2D(x * frequency, y * frequency, s + i * 100);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      return value / maxValue;
    };

    // Parse color to RGB
    const parseColor = (color: string): [number, number, number] => {
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
        ];
      }
      return [128, 128, 128];
    };

    // Lerp colors
    const lerpColor = (c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] => {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * t),
        Math.round(c1[1] + (c2[1] - c1[1]) * t),
        Math.round(c1[2] + (c2[2] - c1[2]) * t),
      ];
    };

    for (let y = 0; y < previewSize; y++) {
      for (let x = 0; x < previewSize; x++) {
        const i = (y * previewSize + x) * 4;
        let r = 128, g = 128, b = 128;

        const nx = x / scale;
        const ny = y / scale;

        switch (selectedGenerator.type) {
          case 'noise':
          case 'clouds': {
            const octaves = Number(params.octaves ?? 4);
            const persistence = Number(params.persistence ?? 0.5);
            const lacunarity = Number(params.lacunarity ?? 2);
            const value = fbm(nx, ny, octaves, persistence, lacunarity, seed);
            const contrast = Number(params.contrast ?? 1);
            const brightness = Number(params.brightness ?? 0);
            const adjusted = Math.max(0, Math.min(1, (value - 0.5) * contrast + 0.5 + brightness));
            r = g = b = Math.round(adjusted * 255);
            break;
          }

          case 'plasma': {
            const colors = (params.colors as string[]) ?? ['#ff0000', '#00ff00', '#0000ff'];
            const v1 = Math.sin(nx * 0.1 + seed);
            const v2 = Math.sin(ny * 0.1 + seed * 1.5);
            const v3 = Math.sin((nx + ny) * 0.1 + seed * 2);
            const v4 = Math.sin(Math.sqrt(nx * nx + ny * ny) * 0.1);
            const value = (v1 + v2 + v3 + v4 + 4) / 8;
            const colorIndex = value * (colors.length - 1);
            const ci = Math.floor(colorIndex);
            const cf = colorIndex - ci;
            const c1 = parseColor(colors[ci]);
            const c2 = parseColor(colors[Math.min(ci + 1, colors.length - 1)]);
            [r, g, b] = lerpColor(c1, c2, cf);
            break;
          }

          case 'marble': {
            const octaves = Number(params.octaves ?? 5);
            const turbulence = Number(params.turbulence ?? 5);
            const noise = fbm(nx, ny, octaves, 0.5, 2, seed);
            const value = Math.sin(nx * 0.1 + turbulence * noise);
            const normalized = (value + 1) / 2;
            const colors = (params.colors as string[]) ?? ['#ffffff', '#888888'];
            const colorIndex = normalized * (colors.length - 1);
            const ci = Math.floor(colorIndex);
            const cf = colorIndex - ci;
            const c1 = parseColor(colors[ci]);
            const c2 = parseColor(colors[Math.min(ci + 1, colors.length - 1)]);
            [r, g, b] = lerpColor(c1, c2, cf);
            break;
          }

          case 'wood': {
            const rings = Number(params.rings ?? 10);
            const turbulence = Number(params.turbulence ?? 0.3);
            const noise = fbm(nx * 0.5, ny * 0.5, 3, 0.5, 2, seed);
            const dist = Math.sqrt((nx - previewSize / scale / 2) ** 2 + (ny - previewSize / scale / 2) ** 2);
            const value = Math.sin((dist + noise * turbulence) * rings) * 0.5 + 0.5;
            const colors = (params.colors as string[]) ?? ['#8b4513', '#654321'];
            const colorIndex = value * (colors.length - 1);
            const ci = Math.floor(colorIndex);
            const cf = colorIndex - ci;
            const c1 = parseColor(colors[ci]);
            const c2 = parseColor(colors[Math.min(ci + 1, colors.length - 1)]);
            [r, g, b] = lerpColor(c1, c2, cf);
            break;
          }

          case 'metal': {
            const direction = Number(params.direction ?? 0) * Math.PI / 180;
            const strength = Number(params.strength ?? 0.3);
            const projected = x * Math.cos(direction) + y * Math.sin(direction);
            const noise = fbm(projected / 10, seededRandom(projected + seed), 2, 0.5, 2, seed);
            const value = 0.7 + noise * strength;
            const colors = (params.colors as string[]) ?? ['#c0c0c0', '#a0a0a0'];
            const c1 = parseColor(colors[0]);
            const c2 = parseColor(colors[1]);
            [r, g, b] = lerpColor(c1, c2, value);
            break;
          }

          case 'fabric': {
            const weaveScale = Number(params.scale ?? 10);
            const wx = Math.floor(x / weaveScale) % 2;
            const wy = Math.floor(y / weaveScale) % 2;
            const value = (wx + wy) % 2;
            const noise = fbm(nx * 2, ny * 2, 2, 0.5, 2, seed) * 0.1;
            const colors = (params.colors as string[]) ?? ['#4a4a4a', '#3a3a3a'];
            const c = parseColor(colors[value]);
            r = Math.round(c[0] * (1 + noise));
            g = Math.round(c[1] * (1 + noise));
            b = Math.round(c[2] * (1 + noise));
            break;
          }

          case 'concrete':
          case 'leather': {
            const roughness = Number(params.roughness ?? params.bumpiness ?? 0.5);
            const noise1 = fbm(nx, ny, 4, 0.5, 2, seed);
            const noise2 = fbm(nx * 3, ny * 3, 2, 0.3, 2, seed + 100);
            const value = noise1 * 0.7 + noise2 * 0.3 * roughness;
            const colors = (params.colors as string[]) ?? ['#808080', '#606060'];
            const c1 = parseColor(colors[0]);
            const c2 = parseColor(colors[colors.length - 1]);
            [r, g, b] = lerpColor(c1, c2, value);
            break;
          }

          case 'rust':
          case 'dirt':
          case 'grunge': {
            const density = Number(params.density ?? params.intensity ?? 0.5);
            const noise1 = fbm(nx, ny, 5, 0.6, 2, seed);
            const noise2 = fbm(nx * 2, ny * 2, 3, 0.4, 2, seed + 50);
            const value = noise1 * noise2;
            const threshold = 1 - density;
            if (value > threshold) {
              const colors = (params.colors as string[]) ?? ['#8b4513', '#a0522d'];
              const normalized = (value - threshold) / (1 - threshold);
              const colorIndex = normalized * (colors.length - 1);
              const ci = Math.floor(colorIndex);
              const cf = colorIndex - ci;
              const c1 = parseColor(colors[ci]);
              const c2 = parseColor(colors[Math.min(ci + 1, colors.length - 1)]);
              [r, g, b] = lerpColor(c1, c2, cf);
            } else {
              r = g = b = 0; // Transparent
              data[i + 3] = 0;
              continue;
            }
            break;
          }

          case 'scratches': {
            const density = Number(params.density ?? 50);
            const length = Number(params.length ?? 100);
            const angle = Number(params.angle ?? 45) * Math.PI / 180;
            const randomness = Number(params.randomness ?? 0.5);

            r = g = b = 0;
            data[i + 3] = 0;

            for (let s = 0; s < density; s++) {
              const sx = seededRandom(s + seed) * previewSize;
              const sy = seededRandom(s + seed + 1000) * previewSize;
              const sAngle = angle + (seededRandom(s + seed + 2000) - 0.5) * randomness * Math.PI;
              const sLength = length * (0.5 + seededRandom(s + seed + 3000) * 0.5);

              const dx = Math.cos(sAngle);
              const dy = Math.sin(sAngle);

              const px = x - sx;
              const py = y - sy;
              const proj = px * dx + py * dy;
              const dist = Math.abs(px * dy - py * dx);

              if (proj >= 0 && proj <= sLength && dist < 1.5) {
                const alpha = Math.max(0, 1 - dist / 1.5);
                r = g = b = 255;
                data[i + 3] = Math.round(alpha * 255);
              }
            }
            continue;
          }

          case 'gradient': {
            const angle = Number(params.angle ?? 0) * Math.PI / 180;
            const colors = (params.colors as string[]) ?? ['#000000', '#ffffff'];
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const proj = (x * dx + y * dy) / previewSize;
            const value = (proj + 1) / 2;
            const colorIndex = value * (colors.length - 1);
            const ci = Math.floor(colorIndex);
            const cf = colorIndex - ci;
            const c1 = parseColor(colors[Math.max(0, ci)]);
            const c2 = parseColor(colors[Math.min(ci + 1, colors.length - 1)]);
            [r, g, b] = lerpColor(c1, c2, cf);
            break;
          }

          case 'pattern': {
            const patternType = String(params.patternType ?? 'checker');
            const patternScale = Number(params.scale ?? 20);
            const colors = (params.colors as string[]) ?? ['#ffffff', '#000000'];

            if (patternType === 'checker') {
              const cx = Math.floor(x / patternScale) % 2;
              const cy = Math.floor(y / patternScale) % 2;
              const c = parseColor(colors[(cx + cy) % 2]);
              [r, g, b] = c;
            } else if (patternType === 'stripes') {
              const v = Math.floor(x / patternScale) % 2;
              const c = parseColor(colors[v]);
              [r, g, b] = c;
            } else if (patternType === 'dots') {
              const cx = (x % patternScale) - patternScale / 2;
              const cy = (y % patternScale) - patternScale / 2;
              const dist = Math.sqrt(cx * cx + cy * cy);
              const c = parseColor(colors[dist < patternScale / 3 ? 0 : 1]);
              [r, g, b] = c;
            }
            break;
          }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = data[i + 3] ?? 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setIsGenerating(false);
  }, [selectedGenerator, params, previewSize]);

  // Generate texture whenever generator or params change
  useEffect(() => {
    generateTexture();
  }, [generateTexture]);

  // Initial generation on mount (with slight delay to ensure canvas is ready)
  useEffect(() => {
    const timer = setTimeout(() => {
      generateTexture();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleRandomize = () => {
    setParams((prev) => ({ ...prev, seed: Math.floor(Math.random() * 99999) }));
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, previewSize, previewSize);
    onApplyToLayer(imageData);
  };

  const handleCreateLayer = () => {
    if (!canvasRef.current || !selectedGenerator) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, previewSize, previewSize);
    onCreateLayer(imageData, selectedGenerator.name);
  };

  const updateParam = (key: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={cn('bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800 flex flex-col', className)}>
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-200">Generators</h3>
      </div>

      {/* Generator list */}
      <div className="p-2 border-b border-zinc-800 max-h-64 overflow-auto">
        <div className="grid grid-cols-3 gap-1">
          {GENERATORS.map((gen) => (
            <button
              key={gen.type}
              onClick={() => {
                setSelectedGenerator(gen);
                setParams({ ...gen.defaultParams });
              }}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded transition-colors',
                selectedGenerator?.type === gen.type
                  ? 'bg-orange-600/20 border border-orange-600/50'
                  : 'hover:bg-zinc-800'
              )}
              title={gen.description}
            >
              <span className="text-lg">{gen.icon}</span>
              <span className="text-[10px] text-zinc-400 text-center truncate w-full">{gen.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      {selectedGenerator && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium">{selectedGenerator.name}</span>
            <button
              onClick={handleRandomize}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Randomize seed"
            >
              <Shuffle className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Dynamic parameters based on generator type */}
          {params.scale !== undefined && (
            <ParamSlider
              label="Scale"
              value={params.scale as number}
              min={1}
              max={200}
              onChange={(v) => updateParam('scale', v)}
            />
          )}
          {params.octaves !== undefined && (
            <ParamSlider
              label="Octaves"
              value={params.octaves as number}
              min={1}
              max={8}
              step={1}
              onChange={(v) => updateParam('octaves', Math.round(v))}
            />
          )}
          {params.persistence !== undefined && (
            <ParamSlider
              label="Persistence"
              value={(params.persistence as number) * 100}
              min={0}
              max={100}
              onChange={(v) => updateParam('persistence', v / 100)}
            />
          )}
          {params.lacunarity !== undefined && (
            <ParamSlider
              label="Lacunarity"
              value={params.lacunarity as number}
              min={1}
              max={4}
              step={0.1}
              onChange={(v) => updateParam('lacunarity', v)}
            />
          )}
          {params.contrast !== undefined && (
            <ParamSlider
              label="Contrast"
              value={params.contrast as number}
              min={0}
              max={3}
              step={0.1}
              onChange={(v) => updateParam('contrast', v)}
            />
          )}
          {params.brightness !== undefined && (
            <ParamSlider
              label="Brightness"
              value={(params.brightness as number) * 100}
              min={-100}
              max={100}
              onChange={(v) => updateParam('brightness', v / 100)}
            />
          )}
          {params.turbulence !== undefined && (
            <ParamSlider
              label="Turbulence"
              value={(params.turbulence as number) * 100}
              min={0}
              max={100}
              onChange={(v) => updateParam('turbulence', v / 100)}
            />
          )}
          {params.density !== undefined && (
            <ParamSlider
              label="Density"
              value={(params.density as number) * 100}
              min={0}
              max={100}
              onChange={(v) => updateParam('density', v / 100)}
            />
          )}
          {params.intensity !== undefined && (
            <ParamSlider
              label="Intensity"
              value={(params.intensity as number) * 100}
              min={0}
              max={100}
              onChange={(v) => updateParam('intensity', v / 100)}
            />
          )}
          {params.angle !== undefined && (
            <ParamSlider
              label="Angle"
              value={params.angle as number}
              min={0}
              max={360}
              onChange={(v) => updateParam('angle', v)}
            />
          )}
          {params.seed !== undefined && (
            <ParamSlider
              label="Seed"
              value={params.seed as number}
              min={0}
              max={99999}
              step={1}
              onChange={(v) => updateParam('seed', Math.round(v))}
            />
          )}

          {/* Color picker for colors array */}
          {params.colors && Array.isArray(params.colors) && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Colors</label>
              <div className="flex flex-wrap gap-1">
                {(params.colors as string[]).map((color, i) => (
                  <input
                    key={i}
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...(params.colors as string[])];
                      newColors[i] = e.target.value;
                      updateParam('colors', newColors);
                    }}
                    className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pattern type selector */}
          {params.patternType !== undefined && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Pattern Type</label>
              <select
                value={params.patternType as string}
                onChange={(e) => updateParam('patternType', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="checker">Checker</option>
                <option value="stripes">Stripes</option>
                <option value="dots">Dots</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Preview canvas */}
      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 mb-2">Preview</div>
        <div className="aspect-square bg-zinc-800 rounded overflow-hidden relative">
          <canvas
            ref={canvasRef}
            width={previewSize}
            height={previewSize}
            className="w-full h-full"
          />
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {selectedGenerator && (
        <div className="p-3 border-t border-zinc-800 space-y-2">
          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 rounded px-3 py-2 text-xs font-medium transition-colors"
          >
            <Palette className="w-3 h-3" />
            Apply to Layer
          </button>
          <button
            onClick={handleCreateLayer}
            className="w-full flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 rounded px-3 py-2 text-xs font-medium transition-colors"
          >
            <Layers className="w-3 h-3" />
            Create New Layer
          </button>
        </div>
      )}
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
