'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Upload,
  Circle,
  Square,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import { CustomBrush } from '@/types/studio';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Real-time brush stroke preview component
 * Renders a sample stroke based on current brush settings
 */
function BrushStrokePreview({ brush, color }: { brush: CustomBrush; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Draw brush stroke preview on canvas
   */
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    // Draw checkered background
    const checkSize = 4;
    for (let y = 0; y < height; y += checkSize) {
      for (let x = 0; x < width; x += checkSize) {
        const isLight = ((x / checkSize) + (y / checkSize)) % 2 === 0;
        ctx.fillStyle = isLight ? '#2a2a2c' : '#222224';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Calculate brush size relative to preview (max 50% of height)
    const maxSize = height * 0.5;
    const brushSize = Math.min(brush.size, maxSize);
    const steps = 30;

    // Draw S-curve stroke with pressure simulation
    ctx.save();

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      // S-curve path
      const x = width * 0.1 + (width * 0.8) * t;
      const y = height * 0.5 + Math.sin(t * Math.PI * 2) * (height * 0.25);

      // Simulate pressure (0 to 1 to 0 curve)
      const pressure = Math.sin(t * Math.PI);

      // Calculate brush properties with pressure
      const size = brush.pressureSize
        ? brushSize * (0.3 + pressure * 0.7)
        : brushSize;
      const opacity = brush.pressureOpacity
        ? (brush.opacity / 100) * (0.3 + pressure * 0.7)
        : brush.opacity / 100;
      const flow = brush.pressureFlow
        ? (brush.flow / 100) * (0.3 + pressure * 0.7)
        : brush.flow / 100;

      // Apply scatter if enabled
      const scatterX = brush.scatterX > 0 ? (Math.random() - 0.5) * brush.scatterX * 0.5 : 0;
      const scatterY = brush.scatterY > 0 ? (Math.random() - 0.5) * brush.scatterY * 0.5 : 0;

      // Draw brush dab
      ctx.globalAlpha = opacity * flow;

      // Create radial gradient for soft brush
      const gradient = ctx.createRadialGradient(
        x + scatterX, y + scatterY, 0,
        x + scatterX, y + scatterY, size / 2
      );

      // Parse color
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      // Hardness affects gradient falloff
      const hardnessRatio = brush.hardness / 100;
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
      gradient.addColorStop(hardnessRatio, `rgba(${r}, ${g}, ${b}, 1)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = gradient;

      // Draw ellipse for roundness
      ctx.beginPath();
      ctx.save();
      ctx.translate(x + scatterX, y + scatterY);
      ctx.rotate((brush.angle * Math.PI) / 180);
      ctx.scale(1, brush.roundness / 100);
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();
    }

    ctx.restore();
  }, [brush, color]);

  // Redraw on brush or color change
  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className="w-full h-[60px] rounded-lg border border-white/10"
    />
  );
}

export function StudioBrushSettings() {
  const {
    activeTool,
    currentBrush,
    brushes,
    primaryColor,
    setCurrentBrush,
    updateBrush,
    saveBrush,
    deleteBrush,
    importBrush,
  } = useStudioEditor();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveBrushOpen, setSaveBrushOpen] = useState(false);
  const [newBrushName, setNewBrushName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show brush settings for brush and eraser tools
  const showSettings = activeTool === 'brush' || activeTool === 'eraser';

  const handleImportBrush = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importBrush(file);
      } catch (error) {
        console.error('Failed to import brush:', error);
      }
    }
  };

  const handleSaveBrush = () => {
    if (newBrushName.trim()) {
      saveBrush({ ...currentBrush, name: newBrushName, id: '' });
      setSaveBrushOpen(false);
      setNewBrushName('');
    }
  };

  if (!showSettings) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 border-b border-white/10 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Brush</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 py-3 space-y-4 border-b border-white/10">
          {/* Real-time Stroke Preview */}
          <BrushStrokePreview brush={currentBrush} color={primaryColor} />

          {/* Current Brush Preview */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBrushPicker(!showBrushPicker)}
              className="flex-1 flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div
                className="w-6 h-6 rounded-full bg-white"
                style={{
                  filter: `blur(${((100 - currentBrush.hardness) / 100) * 2}px)`,
                  transform: `scale(${currentBrush.roundness / 100}, 1) rotate(${currentBrush.angle}deg)`,
                }}
              />
              <span className="text-xs text-white/80 truncate">
                {currentBrush.name}
              </span>
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSaveBrushOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 text-white/60" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save Current Brush</TooltipContent>
            </Tooltip>
          </div>

          {/* Brush Picker Dropdown */}
          <AnimatePresence>
            {showBrushPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/5 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                  {brushes.map((brush) => (
                    <button
                      key={brush.id}
                      onClick={() => {
                        setCurrentBrush(brush);
                        setShowBrushPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${
                        currentBrush.id === brush.id
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'hover:bg-white/5 text-white/60'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white"
                        style={{
                          filter: `blur(${((100 - brush.hardness) / 100) * 1}px)`,
                        }}
                      />
                      <span className="text-xs truncate flex-1 text-left">
                        {brush.name}
                      </span>
                      {brush.id !== 'default' && brush.id !== 'soft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBrush(brush.id);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      )}
                    </button>
                  ))}

                  {/* Import Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-white/5 text-white/40"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-xs">Import Photoshop Brush (.abr)</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".abr"
                    onChange={handleImportBrush}
                    className="hidden"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Size */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40">Size</span>
              <span className="text-[10px] text-white/60">{currentBrush.size}px</span>
            </div>
            <Slider
              value={[currentBrush.size]}
              onValueChange={([v]) => updateBrush({ size: v })}
              max={500}
              min={1}
              step={1}
            />
          </div>

          {/* Hardness */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40">Hardness</span>
              <span className="text-[10px] text-white/60">{currentBrush.hardness}%</span>
            </div>
            <Slider
              value={[currentBrush.hardness]}
              onValueChange={([v]) => updateBrush({ hardness: v })}
              max={100}
              min={0}
              step={1}
            />
          </div>

          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40">Opacity</span>
              <span className="text-[10px] text-white/60">{currentBrush.opacity}%</span>
            </div>
            <Slider
              value={[currentBrush.opacity]}
              onValueChange={([v]) => updateBrush({ opacity: v })}
              max={100}
              min={1}
              step={1}
            />
          </div>

          {/* Flow */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40">Flow</span>
              <span className="text-[10px] text-white/60">{currentBrush.flow}%</span>
            </div>
            <Slider
              value={[currentBrush.flow]}
              onValueChange={([v]) => updateBrush({ flow: v })}
              max={100}
              min={1}
              step={1}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/60"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced Settings
          </button>

          {/* Advanced Settings */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Spacing */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Spacing</span>
                    <span className="text-[10px] text-white/60">{currentBrush.spacing}%</span>
                  </div>
                  <Slider
                    value={[currentBrush.spacing]}
                    onValueChange={([v]) => updateBrush({ spacing: v })}
                    max={100}
                    min={1}
                    step={1}
                  />
                </div>

                {/* Angle */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Angle</span>
                    <span className="text-[10px] text-white/60">{currentBrush.angle}°</span>
                  </div>
                  <Slider
                    value={[currentBrush.angle]}
                    onValueChange={([v]) => updateBrush({ angle: v })}
                    max={180}
                    min={-180}
                    step={1}
                  />
                </div>

                {/* Roundness */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Roundness</span>
                    <span className="text-[10px] text-white/60">{currentBrush.roundness}%</span>
                  </div>
                  <Slider
                    value={[currentBrush.roundness]}
                    onValueChange={([v]) => updateBrush({ roundness: v })}
                    max={100}
                    min={1}
                    step={1}
                  />
                </div>

                {/* Scatter */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40">Scatter X</span>
                    <Slider
                      value={[currentBrush.scatterX]}
                      onValueChange={([v]) => updateBrush({ scatterX: v })}
                      max={100}
                      min={0}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40">Scatter Y</span>
                    <Slider
                      value={[currentBrush.scatterY]}
                      onValueChange={([v]) => updateBrush({ scatterY: v })}
                      max={100}
                      min={0}
                      step={1}
                    />
                  </div>
                </div>

                {/* Pressure Settings */}
                <div className="space-y-2">
                  <span className="text-[10px] text-white/40">Pen Pressure Controls</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/60">Size</span>
                    <Switch
                      checked={currentBrush.pressureSize}
                      onCheckedChange={(v) => updateBrush({ pressureSize: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/60">Opacity</span>
                    <Switch
                      checked={currentBrush.pressureOpacity}
                      onCheckedChange={(v) => updateBrush({ pressureOpacity: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/60">Flow</span>
                    <Switch
                      checked={currentBrush.pressureFlow}
                      onCheckedChange={(v) => updateBrush({ pressureFlow: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/60">Tilt → Angle</span>
                    <Switch
                      checked={currentBrush.tiltAngle}
                      onCheckedChange={(v) => updateBrush({ tiltAngle: v })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CollapsibleContent>

      {/* Save Brush Dialog */}
      <Dialog open={saveBrushOpen} onOpenChange={setSaveBrushOpen}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Save Brush Preset</DialogTitle>
          </DialogHeader>
          <Input
            value={newBrushName}
            onChange={(e) => setNewBrushName(e.target.value)}
            placeholder="Brush name..."
            className="bg-white/5 border-white/10 text-white"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSaveBrushOpen(false)}
              className="text-white/60"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBrush}
              disabled={!newBrushName.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
