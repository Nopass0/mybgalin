/**
 * Shape Tool Panel Component
 *
 * Provides controls for creating vector shape layers in the CS2 Skin Studio.
 * Supports various shape types: rectangle, ellipse, polygon, star, line, path, and custom.
 *
 * Features:
 * - Real-time shape preview
 * - Fill and stroke customization
 * - Corner radius for rectangles
 * - Configurable sides for polygons
 * - Inner radius for stars
 * - Custom polygon editor for freeform shapes
 *
 * @module components/studio/shape-tool-panel
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  Pentagon,
  Hexagon,
  Sparkles,
  MousePointer,
  Plus,
  Trash2,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ShapeType } from '@/types/studio';

interface ShapeSettings {
  type: ShapeType;
  fillEnabled: boolean;
  fillColor: string;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeDash: 'solid' | 'dashed' | 'dotted';
  cornerRadius: number;
  sides: number;
  innerRadius: number;
  rotation: number;
}

const defaultShapeSettings: ShapeSettings = {
  type: 'rectangle',
  fillEnabled: true,
  fillColor: '#ffffff',
  strokeEnabled: true,
  strokeColor: '#000000',
  strokeWidth: 2,
  strokeDash: 'solid',
  cornerRadius: 0,
  sides: 5,
  innerRadius: 50,
  rotation: 0,
};

const shapeIcons: Record<ShapeType, React.ReactNode> = {
  rectangle: <Square className="w-4 h-4" />,
  ellipse: <Circle className="w-4 h-4" />,
  polygon: <Pentagon className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  line: <Minus className="w-4 h-4" />,
  path: <MousePointer className="w-4 h-4" />,
  custom: <Sparkles className="w-4 h-4" />,
};

const shapeLabels: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  polygon: 'Polygon',
  star: 'Star',
  line: 'Line',
  path: 'Path',
  custom: 'Custom',
};

interface ShapeToolPanelProps {
  className?: string;
}

/**
 * Real-time shape preview component
 */
function ShapePreview({ settings }: { settings: ShapeSettings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 120;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Draw background
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(0, 0, size, size);

    // Draw checker pattern for transparency
    const checkerSize = 8;
    ctx.fillStyle = '#2a2a2c';
    for (let x = 0; x < size; x += checkerSize * 2) {
      for (let y = 0; y < size; y += checkerSize * 2) {
        ctx.fillRect(x, y, checkerSize, checkerSize);
        ctx.fillRect(x + checkerSize, y + checkerSize, checkerSize, checkerSize);
      }
    }

    // Center and draw shape
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((settings.rotation * Math.PI) / 180);

    const shapeSize = 40;

    // Set stroke style
    if (settings.strokeEnabled) {
      ctx.strokeStyle = settings.strokeColor;
      ctx.lineWidth = settings.strokeWidth;
      if (settings.strokeDash === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else if (settings.strokeDash === 'dotted') {
        ctx.setLineDash([2, 2]);
      } else {
        ctx.setLineDash([]);
      }
    }

    // Set fill style
    if (settings.fillEnabled) {
      ctx.fillStyle = settings.fillColor;
    }

    ctx.beginPath();

    switch (settings.type) {
      case 'rectangle':
        const r = settings.cornerRadius;
        const x = -shapeSize;
        const y = -shapeSize / 1.5;
        const w = shapeSize * 2;
        const h = shapeSize * 1.33;
        if (r > 0) {
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        } else {
          ctx.rect(-shapeSize, -shapeSize / 1.5, shapeSize * 2, shapeSize * 1.33);
        }
        break;

      case 'ellipse':
        ctx.ellipse(0, 0, shapeSize, shapeSize * 0.7, 0, 0, Math.PI * 2);
        break;

      case 'polygon':
        const sides = Math.max(3, settings.sides);
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(angle) * shapeSize;
          const py = Math.sin(angle) * shapeSize;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        break;

      case 'star':
        const starPoints = Math.max(3, settings.sides);
        const outerR = shapeSize;
        const innerR = (shapeSize * settings.innerRadius) / 100;
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
          const radius = i % 2 === 0 ? outerR : innerR;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        break;

      case 'line':
        ctx.moveTo(-shapeSize, 0);
        ctx.lineTo(shapeSize, 0);
        break;

      case 'path':
        // Bezier curve example
        ctx.moveTo(-shapeSize, shapeSize * 0.5);
        ctx.bezierCurveTo(-shapeSize * 0.5, -shapeSize, shapeSize * 0.5, -shapeSize, shapeSize, shapeSize * 0.5);
        break;

      case 'custom':
        // Heart shape
        ctx.moveTo(0, -shapeSize * 0.3);
        ctx.bezierCurveTo(-shapeSize * 0.8, -shapeSize, -shapeSize * 0.8, 0, 0, shapeSize * 0.8);
        ctx.bezierCurveTo(shapeSize * 0.8, 0, shapeSize * 0.8, -shapeSize, 0, -shapeSize * 0.3);
        break;
    }

    if (settings.fillEnabled && settings.type !== 'line') {
      ctx.fill();
    }
    if (settings.strokeEnabled) {
      ctx.stroke();
    }

    ctx.restore();
  }, [settings]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 120, height: 120 }}
      className="rounded-lg border border-white/10"
    />
  );
}

/**
 * Polygon point editor - allows interactive editing of polygon vertices
 */
function PolygonEditor({
  points,
  onChange,
  width = 200,
  height = 200,
}: {
  points: { x: number; y: number }[];
  onChange: (points: { x: number; y: number }[]) => void;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Check if clicking on existing point
    const pointIndex = points.findIndex((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 0.05;
    });

    if (pointIndex !== -1) {
      setDragIndex(pointIndex);
    } else {
      // Add new point
      const newPoints = [...points, { x, y }];
      onChange(newPoints);
      setDragIndex(newPoints.length - 1);
    }
  }, [points, onChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    if (dragIndex !== null) {
      const newPoints = [...points];
      newPoints[dragIndex] = { x, y };
      onChange(newPoints);
    } else {
      // Check hover
      const pointIndex = points.findIndex((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 0.05;
      });
      setHoveredIndex(pointIndex !== -1 ? pointIndex : null);
    }
  }, [points, dragIndex, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Check if double-clicking on existing point to delete
    const pointIndex = points.findIndex((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 0.05;
    });

    if (pointIndex !== -1 && points.length > 3) {
      const newPoints = points.filter((_, i) => i !== pointIndex);
      onChange(newPoints);
    }
  }, [points, onChange]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
      ctx.stroke();
    }

    // Draw polygon
    if (points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      points.forEach((p, i) => {
        const px = p.x * width;
        const py = p.y * height;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.fill();
      ctx.stroke();

      // Draw points
      points.forEach((p, i) => {
        const px = p.x * width;
        const py = p.y * height;

        ctx.beginPath();
        ctx.arc(px, py, i === hoveredIndex ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = i === dragIndex ? '#f97316' : i === hoveredIndex ? '#fb923c' : '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }, [points, width, height, dragIndex, hoveredIndex]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">Polygon Editor</span>
        <span className="text-[10px] text-white/40">
          Click to add, double-click to remove
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width, height, cursor: hoveredIndex !== null ? 'pointer' : 'crosshair' }}
        className="rounded-lg border border-white/10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([
            { x: 0.5, y: 0.15 },
            { x: 0.85, y: 0.5 },
            { x: 0.5, y: 0.85 },
            { x: 0.15, y: 0.5 },
          ])}
          className="text-xs h-7"
        >
          Reset
        </Button>
        <span className="text-xs text-white/40">{points.length} points</span>
      </div>
    </div>
  );
}

export function ShapeToolPanel({ className }: ShapeToolPanelProps) {
  const { primaryColor, secondaryColor, activeTool, addLayer, updateLayer, pushHistory } = useStudioEditor();
  const [settings, setSettings] = useState<ShapeSettings>({
    ...defaultShapeSettings,
    fillColor: primaryColor,
    strokeColor: secondaryColor,
  });
  const [customPoints, setCustomPoints] = useState<{ x: number; y: number }[]>([
    { x: 0.5, y: 0.15 },
    { x: 0.85, y: 0.5 },
    { x: 0.5, y: 0.85 },
    { x: 0.15, y: 0.5 },
  ]);

  // Update colors from editor
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      fillColor: primaryColor,
      strokeColor: secondaryColor,
    }));
  }, [primaryColor, secondaryColor]);

  const updateSetting = <K extends keyof ShapeSettings>(key: K, value: ShapeSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const shapeTypes: ShapeType[] = ['rectangle', 'ellipse', 'polygon', 'star', 'line', 'path', 'custom'];

  // Only show when vector-shape tool is active
  if (activeTool !== 'vector-shape') {
    return null;
  }

  return (
    <div className={cn('p-3 border-b border-white/10 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-white/80">Shape Tool</h3>
      </div>

      {/* Shape Preview */}
      <div className="flex justify-center">
        <ShapePreview settings={settings} />
      </div>

      {/* Shape Type Selector */}
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Shape Type</Label>
        <div className="grid grid-cols-4 gap-1">
          {shapeTypes.map((type) => (
            <button
              key={type}
              onClick={() => updateSetting('type', type)}
              className={cn(
                'p-2 rounded-lg flex flex-col items-center gap-1 transition-colors',
                settings.type === type
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              {shapeIcons[type]}
              <span className="text-[10px]">{shapeLabels[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fill Settings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-white/60">Fill</Label>
          <button
            onClick={() => updateSetting('fillEnabled', !settings.fillEnabled)}
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              settings.fillEnabled ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/40'
            )}
          >
            {settings.fillEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {settings.fillEnabled && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.fillColor}
              onChange={(e) => updateSetting('fillColor', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <Input
              value={settings.fillColor}
              onChange={(e) => updateSetting('fillColor', e.target.value)}
              className="flex-1 h-8 text-xs"
            />
          </div>
        )}
      </div>

      {/* Stroke Settings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-white/60">Stroke</Label>
          <button
            onClick={() => updateSetting('strokeEnabled', !settings.strokeEnabled)}
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              settings.strokeEnabled ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/40'
            )}
          >
            {settings.strokeEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {settings.strokeEnabled && (
          <>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.strokeColor}
                onChange={(e) => updateSetting('strokeColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={settings.strokeColor}
                onChange={(e) => updateSetting('strokeColor', e.target.value)}
                className="flex-1 h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Width</span>
                <span className="text-[10px] text-white/60">{settings.strokeWidth}px</span>
              </div>
              <Slider
                value={[settings.strokeWidth]}
                onValueChange={([v]) => updateSetting('strokeWidth', v)}
                min={1}
                max={20}
                step={1}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">Style</span>
              <Select
                value={settings.strokeDash}
                onValueChange={(v) => updateSetting('strokeDash', v as 'solid' | 'dashed' | 'dotted')}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Shape-specific settings */}
      {settings.type === 'rectangle' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Corner Radius</Label>
            <span className="text-[10px] text-white/60">{settings.cornerRadius}px</span>
          </div>
          <Slider
            value={[settings.cornerRadius]}
            onValueChange={([v]) => updateSetting('cornerRadius', v)}
            min={0}
            max={50}
            step={1}
          />
        </div>
      )}

      {(settings.type === 'polygon' || settings.type === 'star') && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Sides</Label>
            <span className="text-[10px] text-white/60">{settings.sides}</span>
          </div>
          <Slider
            value={[settings.sides]}
            onValueChange={([v]) => updateSetting('sides', v)}
            min={3}
            max={12}
            step={1}
          />
        </div>
      )}

      {settings.type === 'star' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Inner Radius</Label>
            <span className="text-[10px] text-white/60">{settings.innerRadius}%</span>
          </div>
          <Slider
            value={[settings.innerRadius]}
            onValueChange={([v]) => updateSetting('innerRadius', v)}
            min={10}
            max={90}
            step={1}
          />
        </div>
      )}

      {/* Rotation */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-white/60">Rotation</Label>
          <span className="text-[10px] text-white/60">{settings.rotation}°</span>
        </div>
        <Slider
          value={[settings.rotation]}
          onValueChange={([v]) => updateSetting('rotation', v)}
          min={0}
          max={360}
          step={1}
        />
      </div>

      {/* Custom Polygon Editor */}
      {settings.type === 'custom' && (
        <PolygonEditor
          points={customPoints}
          onChange={setCustomPoints}
        />
      )}

      {/* Create Shape Button */}
      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        onClick={() => {
          const layer = addLayer('shape', `${shapeLabels[settings.type]} Layer`);

          // Apply shape settings to the new layer
          const dashArray = settings.strokeDash === 'dashed' ? [8, 4]
            : settings.strokeDash === 'dotted' ? [2, 2]
            : undefined;

          updateLayer(layer.id, {
            shapeContent: {
              type: settings.type,
              fill: settings.fillEnabled ? settings.fillColor : undefined,
              stroke: settings.strokeEnabled ? {
                color: settings.strokeColor,
                width: settings.strokeWidth,
                dashArray,
              } : undefined,
              cornerRadius: settings.cornerRadius,
              sides: settings.sides,
              innerRadius: settings.type === 'star' ? settings.innerRadius : undefined,
              points: settings.type === 'custom' ? customPoints : undefined,
            },
          });

          pushHistory('Create shape');
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Shape Layer
      </Button>
    </div>
  );
}
