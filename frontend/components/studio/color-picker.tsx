'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { Input } from '@/components/ui/input';

// Convert HSV to RGB
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: [r, g, b] = [v, t, p]; break;
    case 1: [r, g, b] = [q, v, p]; break;
    case 2: [r, g, b] = [p, v, t]; break;
    case 3: [r, g, b] = [p, q, v]; break;
    case 4: [r, g, b] = [t, p, v]; break;
    case 5: [r, g, b] = [v, p, q]; break;
    default: [r, g, b] = [0, 0, 0];
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Convert RGB to HSV
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h, s, v];
}

// Convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function StudioColorPicker() {
  const { primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor, swapColors } = useStudioEditor();

  const [activeColor, setActiveColor] = useState<'primary' | 'secondary'>('primary');
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(1);
  const [value, setValue] = useState(1);
  const [hexInput, setHexInput] = useState(primaryColor);

  const pickerRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isHueDragging = useRef(false);

  const currentColor = activeColor === 'primary' ? primaryColor : secondaryColor;
  const setCurrentColor = activeColor === 'primary' ? setPrimaryColor : setSecondaryColor;

  // Initialize HSV from current color
  useEffect(() => {
    const [r, g, b] = hexToRgb(currentColor);
    const [h, s, v] = rgbToHsv(r, g, b);
    setHue(h);
    setSaturation(s);
    setValue(v);
    setHexInput(currentColor);
  }, [currentColor, activeColor]);

  const updateColor = useCallback((s: number, v: number) => {
    const [r, g, b] = hsvToRgb(hue, s, v);
    const hex = rgbToHex(r, g, b);
    setCurrentColor(hex);
    setHexInput(hex);
    setSaturation(s);
    setValue(v);
  }, [hue, setCurrentColor]);

  const updateHue = useCallback((h: number) => {
    setHue(h);
    const [r, g, b] = hsvToRgb(h, saturation, value);
    const hex = rgbToHex(r, g, b);
    setCurrentColor(hex);
    setHexInput(hex);
  }, [saturation, value, setCurrentColor]);

  const handlePickerMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    handlePickerMove(e);
  };

  const handlePickerMove = (e: MouseEvent | React.MouseEvent) => {
    if (!pickerRef.current) return;
    const rect = pickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    updateColor(x, 1 - y);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    isHueDragging.current = true;
    handleHueMove(e);
  };

  const handleHueMove = (e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateHue(x);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) handlePickerMove(e);
      if (isHueDragging.current) handleHueMove(e);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isHueDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [hue, saturation, value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex);

    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setCurrentColor(hex);
    }
  };

  const [r, g, b] = hexToRgb(currentColor);

  return (
    <div className="px-3 py-3 border-b border-white/10">
      {/* Color Swatches */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <button
            onClick={() => setActiveColor('primary')}
            className={`w-8 h-8 rounded shadow-lg border-2 ${
              activeColor === 'primary' ? 'border-orange-400' : 'border-white/20'
            }`}
            style={{ backgroundColor: primaryColor }}
          />
          <button
            onClick={() => setActiveColor('secondary')}
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded shadow border-2 ${
              activeColor === 'secondary' ? 'border-orange-400' : 'border-white/20'
            }`}
            style={{ backgroundColor: secondaryColor }}
          />
        </div>
        <button
          onClick={swapColors}
          className="p-1.5 hover:bg-white/5 rounded transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-white/40" />
        </button>
        <span className="text-xs text-white/40 flex-1 truncate">
          {activeColor === 'primary' ? 'Foreground' : 'Background'}
        </span>
      </div>

      {/* Saturation/Value Picker */}
      <div
        ref={pickerRef}
        className="relative w-full h-32 rounded-lg cursor-crosshair mb-2 overflow-hidden"
        onMouseDown={handlePickerMouseDown}
        style={{
          background: `linear-gradient(to right, #fff, hsl(${hue * 360}, 100%, 50%))`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent, #000)',
          }}
        />
        <div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${saturation * 100}%`,
            top: `${(1 - value) * 100}%`,
            backgroundColor: currentColor,
          }}
        />
      </div>

      {/* Hue Slider */}
      <div
        ref={hueRef}
        className="relative w-full h-3 rounded cursor-pointer mb-3"
        onMouseDown={handleHueMouseDown}
        style={{
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
      >
        <div
          className="absolute w-3 h-5 -translate-x-1/2 -translate-y-1 rounded border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${hue * 100}%`,
            backgroundColor: `hsl(${hue * 360}, 100%, 50%)`,
          }}
        />
      </div>

      {/* Hex Input */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            value={hexInput}
            onChange={handleHexChange}
            className="h-7 text-xs bg-white/5 border-white/10 text-white font-mono"
            placeholder="#FFFFFF"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <span>R:{r}</span>
          <span>G:{g}</span>
          <span>B:{b}</span>
        </div>
      </div>
    </div>
  );
}
