/**
 * Color Adjustments Panel Component
 *
 * Non-destructive color correction tools for the CS2 Skin Studio.
 * Applies real-time adjustments to selected layers.
 *
 * Features:
 * - Brightness and contrast controls
 * - Hue, saturation, and lightness (HSL)
 * - Color balance (shadows, midtones, highlights)
 * - Vibrance and temperature adjustments
 * - Reset and apply functionality
 *
 * @module components/studio/color-adjustments-panel
 */

'use client';

import { useState, useCallback } from 'react';
import { SlidersHorizontal, Sun, Contrast, Droplet, Palette, Sparkles, Undo2, Check } from 'lucide-react';
import type { Layer } from '@/types/studio';

interface ColorAdjustmentsPanelProps {
  layer: Layer;
  onApplyAdjustment: (layerId: string, adjustedImageData: string) => void;
  onClose: () => void;
}

interface AdjustmentValues {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  tint: number;
  vibrance: number;
  exposure: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
}

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
};

export function ColorAdjustmentsPanel({ layer, onApplyAdjustment, onClose }: ColorAdjustmentsPanelProps) {
  const [adjustments, setAdjustments] = useState<AdjustmentValues>({ ...DEFAULT_ADJUSTMENTS });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'hsl' | 'tone'>('basic');

  const updateAdjustment = useCallback((key: keyof AdjustmentValues, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetAdjustments = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setPreviewUrl(null);
  }, []);

  const applyAdjustments = useCallback(() => {
    if (!layer.imageData) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply adjustments pixel by pixel
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply exposure
        if (adjustments.exposure !== 0) {
          const exposure = Math.pow(2, adjustments.exposure / 100);
          r *= exposure;
          g *= exposure;
          b *= exposure;
        }

        // Apply brightness
        if (adjustments.brightness !== 0) {
          const brightness = adjustments.brightness * 2.55;
          r += brightness;
          g += brightness;
          b += brightness;
        }

        // Apply contrast
        if (adjustments.contrast !== 0) {
          const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b = factor * (b - 128) + 128;
        }

        // Apply highlights/shadows
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (adjustments.highlights !== 0 && luminance > 128) {
          const factor = 1 + (adjustments.highlights / 100) * ((luminance - 128) / 127);
          r *= factor;
          g *= factor;
          b *= factor;
        }
        if (adjustments.shadows !== 0 && luminance <= 128) {
          const factor = 1 + (adjustments.shadows / 100) * ((128 - luminance) / 128);
          r *= factor;
          g *= factor;
          b *= factor;
        }

        // Apply whites/blacks
        if (adjustments.whites !== 0) {
          const white = adjustments.whites / 100;
          r += (255 - r) * white * 0.3;
          g += (255 - g) * white * 0.3;
          b += (255 - b) * white * 0.3;
        }
        if (adjustments.blacks !== 0) {
          const black = adjustments.blacks / 100;
          r += r * black * 0.3;
          g += g * black * 0.3;
          b += b * black * 0.3;
        }

        // Apply temperature (warm/cool shift)
        if (adjustments.temperature !== 0) {
          const temp = adjustments.temperature / 100;
          r += temp * 30;
          b -= temp * 30;
        }

        // Apply tint (green/magenta shift)
        if (adjustments.tint !== 0) {
          const tint = adjustments.tint / 100;
          g += tint * 20;
        }

        // Convert to HSL for saturation/hue/vibrance adjustments
        let [h, s, l] = rgbToHsl(r, g, b);

        // Apply hue rotation
        if (adjustments.hue !== 0) {
          h = (h + adjustments.hue / 360 + 1) % 1;
        }

        // Apply saturation
        if (adjustments.saturation !== 0) {
          s = Math.max(0, Math.min(1, s * (1 + adjustments.saturation / 100)));
        }

        // Apply vibrance (smart saturation - affects less saturated colors more)
        if (adjustments.vibrance !== 0) {
          const maxSat = 1 - s;
          const vibranceAmount = adjustments.vibrance / 100;
          s = Math.max(0, Math.min(1, s + maxSat * vibranceAmount * 0.5));
        }

        // Convert back to RGB
        [r, g, b] = hslToRgb(h, s, l);

        // Clamp values
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      }

      ctx.putImageData(imageData, 0, 0);
      const adjustedDataUrl = canvas.toDataURL('image/png');
      onApplyAdjustment(layer.id, adjustedDataUrl);
      onClose();
    };
    img.src = layer.imageData;
  }, [layer, adjustments, onApplyAdjustment, onClose]);

  // Preview adjustments in real-time
  const generatePreview = useCallback(() => {
    if (!layer.imageData) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Use smaller size for preview performance
      const scale = Math.min(1, 256 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Apply same adjustments as applyAdjustments but simplified for preview
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Simplified adjustments for preview
        if (adjustments.exposure !== 0) {
          const exposure = Math.pow(2, adjustments.exposure / 100);
          r *= exposure;
          g *= exposure;
          b *= exposure;
        }
        if (adjustments.brightness !== 0) {
          const brightness = adjustments.brightness * 2.55;
          r += brightness;
          g += brightness;
          b += brightness;
        }
        if (adjustments.contrast !== 0) {
          const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
          r = factor * (r - 128) + 128;
          g = factor * (g - 128) + 128;
          b = factor * (b - 128) + 128;
        }
        if (adjustments.temperature !== 0) {
          const temp = adjustments.temperature / 100;
          r += temp * 30;
          b -= temp * 30;
        }

        let [h, s, l] = rgbToHsl(r, g, b);
        if (adjustments.hue !== 0) h = (h + adjustments.hue / 360 + 1) % 1;
        if (adjustments.saturation !== 0) s = Math.max(0, Math.min(1, s * (1 + adjustments.saturation / 100)));
        [r, g, b] = hslToRgb(h, s, l);

        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
      }

      ctx.putImageData(imageData, 0, 0);
      setPreviewUrl(canvas.toDataURL('image/png'));
    };
    img.src = layer.imageData;
  }, [layer.imageData, adjustments]);

  // Update preview when adjustments change
  const handleSliderChange = useCallback((key: keyof AdjustmentValues, value: number) => {
    updateAdjustment(key, value);
    // Debounce preview generation
    setTimeout(generatePreview, 100);
  }, [updateAdjustment, generatePreview]);

  const SliderControl = ({ label, icon: Icon, valueKey, min = -100, max = 100, step = 1 }: {
    label: string;
    icon: React.ElementType;
    valueKey: keyof AdjustmentValues;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-white/70">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <span className="text-white/50 w-8 text-right">{adjustments[valueKey]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={adjustments[valueKey]}
        onChange={(e) => handleSliderChange(valueKey, parseInt(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-orange-400"
      />
    </div>
  );

  return (
    <div className="bg-[#1a1a1c] border border-white/10 rounded-lg p-3 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-white">Color Adjustments</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={resetAdjustments}
            className="p-1.5 hover:bg-white/10 rounded text-white/60 hover:text-white"
            title="Reset"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="mb-3 flex justify-center">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-24 rounded border border-white/10"
          />
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 mb-3 p-0.5 bg-white/5 rounded">
        {(['basic', 'hsl', 'tone'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 px-2 text-xs rounded transition-colors ${
              activeTab === tab
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab === 'basic' ? 'Basic' : tab === 'hsl' ? 'HSL' : 'Tone'}
          </button>
        ))}
      </div>

      {/* Adjustment sliders */}
      <div className="space-y-3">
        {activeTab === 'basic' && (
          <>
            <SliderControl label="Exposure" icon={Sun} valueKey="exposure" />
            <SliderControl label="Brightness" icon={Sun} valueKey="brightness" />
            <SliderControl label="Contrast" icon={Contrast} valueKey="contrast" />
            <SliderControl label="Temperature" icon={Droplet} valueKey="temperature" />
            <SliderControl label="Tint" icon={Palette} valueKey="tint" />
          </>
        )}

        {activeTab === 'hsl' && (
          <>
            <SliderControl label="Hue" icon={Palette} valueKey="hue" min={-180} max={180} />
            <SliderControl label="Saturation" icon={Droplet} valueKey="saturation" />
            <SliderControl label="Vibrance" icon={Sparkles} valueKey="vibrance" />
          </>
        )}

        {activeTab === 'tone' && (
          <>
            <SliderControl label="Highlights" icon={Sun} valueKey="highlights" />
            <SliderControl label="Shadows" icon={Contrast} valueKey="shadows" />
            <SliderControl label="Whites" icon={Sun} valueKey="whites" />
            <SliderControl label="Blacks" icon={Contrast} valueKey="blacks" />
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onClose}
          className="flex-1 py-1.5 px-3 text-xs bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={applyAdjustments}
          className="flex-1 py-1.5 px-3 text-xs bg-orange-500 hover:bg-orange-400 rounded text-white flex items-center justify-center gap-1 transition-colors"
        >
          <Check className="w-3 h-3" />
          Apply
        </button>
      </div>
    </div>
  );
}

// Color conversion helpers
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r * 255, g * 255, b * 255];
}
