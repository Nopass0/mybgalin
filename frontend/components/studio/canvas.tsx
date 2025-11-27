'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import type { Transform, Layer, BlendMode, LayerEffect } from '@/types/studio';

// Map BlendMode to valid Canvas 2D GlobalCompositeOperation
function blendModeToCompositeOp(blendMode: BlendMode): GlobalCompositeOperation {
  const validModes: Record<string, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity',
  };
  return validModes[blendMode] || 'source-over';
}

interface StudioCanvasProps {
  zoom: number;
  showGrid: boolean;
  activeMapTab: 'color' | 'normal' | 'metalness' | 'roughness';
}

const CANVAS_SIZE = 1024;

// Handle types for transform
type HandleType = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'rotate' | 't' | 'r' | 'b' | 'l';

interface TransformState {
  active: boolean;
  handle: HandleType | null;
  startX: number;
  startY: number;
  startTransform: Transform | null;
}

export function StudioCanvas({ zoom, showGrid, activeMapTab }: StudioCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const {
    layers,
    activeLayerId,
    activeTool,
    primaryColor,
    secondaryColor,
    currentBrush,
    isDrawing,
    setIsDrawing,
    updatePointerState,
    pushHistory,
    updateLayer,
    addLayer,
    setPan,
    setZoom,
  } = useStudioEditor();

  const [pan, setPanLocal] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [brushPreview, setBrushPreview] = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Transform state for draggable objects
  const [transformState, setTransformState] = useState<TransformState>({
    active: false,
    handle: null,
    startX: 0,
    startY: 0,
    startTransform: null,
  });
  const [hoveredHandle, setHoveredHandle] = useState<HandleType | null>(null);

  // Gradient tool state
  const [gradientStart, setGradientStart] = useState<{ x: number; y: number } | null>(null);
  const [gradientEnd, setGradientEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingGradient, setIsDrawingGradient] = useState(false);

  // Initialize offscreen canvas
  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas');
    offscreenCanvasRef.current.width = CANVAS_SIZE;
    offscreenCanvasRef.current.height = CANVAS_SIZE;
  }, []);

  // Handle clipboard paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Check if we have image data in clipboard
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
              // Scale image to fit canvas while preserving aspect ratio
              const canvas = document.createElement('canvas');
              canvas.width = CANVAS_SIZE;
              canvas.height = CANVAS_SIZE;
              const ctx = canvas.getContext('2d')!;

              // Calculate scaling to fit while preserving aspect ratio
              const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              const offsetX = (CANVAS_SIZE - scaledWidth) / 2;
              const offsetY = (CANVAS_SIZE - scaledHeight) / 2;

              // Clear with transparent background
              ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

              const scaledDataUrl = canvas.toDataURL('image/png');

              // Create new layer with pasted image
              const newLayer = addLayer('raster', 'Pasted Image');
              if (newLayer) {
                updateLayer(newLayer.id, {
                  imageData: scaledDataUrl,
                  transform: {
                    x: offsetX,
                    y: offsetY,
                    width: scaledWidth,
                    height: scaledHeight,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    skewX: 0,
                    skewY: 0,
                  }
                });
                pushHistory('Paste image');
              }
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          break; // Only process first image
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addLayer, updateLayer, pushHistory]);

  // Get or create layer canvas
  const getLayerCanvas = useCallback((layerId: string): HTMLCanvasElement => {
    let canvas = layerCanvasesRef.current.get(layerId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      layerCanvasesRef.current.set(layerId, canvas);
    }
    return canvas;
  }, []);

  // Apply layer effects to a canvas and return result canvas
  const applyLayerEffects = useCallback((
    sourceCanvas: HTMLCanvasElement,
    effects: LayerEffect[]
  ): HTMLCanvasElement => {
    if (!effects || effects.length === 0) return sourceCanvas;

    const enabledEffects = effects.filter(e => e.enabled);
    if (enabledEffects.length === 0) return sourceCanvas;

    // Create result canvas
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = CANVAS_SIZE;
    resultCanvas.height = CANVAS_SIZE;
    const resultCtx = resultCanvas.getContext('2d')!;

    // Process effects
    for (const effect of enabledEffects) {
      switch (effect.type) {
        case 'drop-shadow':
          applyDropShadow(resultCtx, sourceCanvas, effect);
          break;
        case 'outer-glow':
          applyOuterGlow(resultCtx, sourceCanvas, effect);
          break;
      }
    }

    // Draw original layer on top
    resultCtx.drawImage(sourceCanvas, 0, 0);

    // Apply effects that go on top
    for (const effect of enabledEffects) {
      switch (effect.type) {
        case 'inner-shadow':
          applyInnerShadow(resultCtx, sourceCanvas, effect);
          break;
        case 'inner-glow':
          applyInnerGlow(resultCtx, sourceCanvas, effect);
          break;
        case 'color-overlay':
          applyColorOverlay(resultCtx, sourceCanvas, effect);
          break;
        case 'stroke':
          applyStroke(resultCtx, sourceCanvas, effect);
          break;
      }
    }

    return resultCanvas;
  }, []);

  // Drop shadow effect
  const applyDropShadow = (
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    effect: LayerEffect
  ) => {
    const params = effect.parameters;
    const color = (params.color as string) || '#000000';
    const angle = (params.angle as number) || 135;
    const distance = (params.distance as number) || 10;
    const size = (params.size as number) || 10;
    const spread = (params.spread as number) || 0;

    // Calculate offset from angle
    const radians = (angle * Math.PI) / 180;
    const offsetX = Math.cos(radians) * distance;
    const offsetY = Math.sin(radians) * distance;

    ctx.save();
    ctx.globalAlpha = effect.opacity / 100;
    ctx.globalCompositeOperation = blendModeToCompositeOp(effect.blendMode);

    // Apply shadow
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;

    // If spread, expand the shadow
    if (spread > 0) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = CANVAS_SIZE;
      tempCanvas.height = CANVAS_SIZE;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.filter = `blur(${spread}px)`;
      tempCtx.drawImage(source, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      ctx.drawImage(source, 0, 0);
    }

    // Clear the actual image area so only shadow remains
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(source, 0, 0);

    ctx.restore();
  };

  // Outer glow effect
  const applyOuterGlow = (
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    effect: LayerEffect
  ) => {
    const params = effect.parameters;
    const color = (params.color as string) || '#ffff00';
    const size = (params.size as number) || 20;
    const spread = (params.spread as number) || 0;

    ctx.save();
    ctx.globalAlpha = effect.opacity / 100;
    ctx.globalCompositeOperation = blendModeToCompositeOp(effect.blendMode);

    // Create glow by drawing multiple blurred copies
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Extract alpha from source and colorize
    tempCtx.drawImage(source, 0, 0);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Apply blur for glow
    ctx.filter = `blur(${size}px)`;

    // Draw multiple times for spread effect
    const iterations = Math.max(1, Math.ceil(spread / 2) + 1);
    for (let i = 0; i < iterations; i++) {
      ctx.drawImage(tempCanvas, 0, 0);
    }

    ctx.filter = 'none';
    ctx.restore();
  };

  // Inner shadow effect
  const applyInnerShadow = (
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    effect: LayerEffect
  ) => {
    const params = effect.parameters;
    const color = (params.color as string) || '#000000';
    const angle = (params.angle as number) || 135;
    const distance = (params.distance as number) || 5;
    const size = (params.size as number) || 5;

    const radians = (angle * Math.PI) / 180;
    const offsetX = Math.cos(radians) * distance;
    const offsetY = Math.sin(radians) * distance;

    ctx.save();
    ctx.globalAlpha = effect.opacity / 100;
    ctx.globalCompositeOperation = blendModeToCompositeOp(effect.blendMode);

    // Create inner shadow by inverting the layer and using it as shadow
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Draw inverted mask (everything except the layer content)
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    tempCtx.globalCompositeOperation = 'destination-out';
    tempCtx.drawImage(source, 0, 0);

    // Apply shadow
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.shadowColor = color;
    tempCtx.shadowBlur = size;
    tempCtx.shadowOffsetX = -offsetX;
    tempCtx.shadowOffsetY = -offsetY;
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Mask to original layer
    ctx.globalCompositeOperation = 'source-atop';
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(source, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  };

  // Inner glow effect
  const applyInnerGlow = (
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    effect: LayerEffect
  ) => {
    const params = effect.parameters;
    const color = (params.color as string) || '#ffffff';
    const size = (params.size as number) || 10;

    ctx.save();
    ctx.globalAlpha = effect.opacity / 100;
    ctx.globalCompositeOperation = blendModeToCompositeOp(effect.blendMode);

    // Create glow from edges inward
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Get edge by subtracting eroded version
    tempCtx.drawImage(source, 0, 0);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Blur for glow
    tempCtx.filter = `blur(${size}px)`;
    const temp2 = document.createElement('canvas');
    temp2.width = CANVAS_SIZE;
    temp2.height = CANVAS_SIZE;
    const temp2Ctx = temp2.getContext('2d')!;
    temp2Ctx.filter = `blur(${size}px)`;
    temp2Ctx.drawImage(tempCanvas, 0, 0);

    // Mask to original layer
    temp2Ctx.filter = 'none';
    temp2Ctx.globalCompositeOperation = 'destination-in';
    temp2Ctx.drawImage(source, 0, 0);

    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(temp2, 0, 0);
    ctx.restore();
  };

  // Color overlay effect
  const applyColorOverlay = (
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    effect: LayerEffect
  ) => {
    const params = effect.parameters;
    const color = (params.color as string) || '#ff0000';

    ctx.save();
    ctx.globalAlpha = effect.opacity / 100;
    ctx.globalCompositeOperation = blendModeToCompositeOp(effect.blendMode);

    // Create color-filled version of the layer
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.drawImage(source, 0, 0);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  };

  // Stroke effect
  const applyStroke = (
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    effect: LayerEffect
  ) => {
    const params = effect.parameters;
    const color = (params.color as string) || '#000000';
    const size = (params.size as number) || 3;
    const position = (params.position as string) || 'outside'; // outside, inside, center

    ctx.save();
    ctx.globalAlpha = effect.opacity / 100;
    ctx.globalCompositeOperation = blendModeToCompositeOp(effect.blendMode);

    // Create stroke by dilating and subtracting
    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = CANVAS_SIZE;
    strokeCanvas.height = CANVAS_SIZE;
    const strokeCtx = strokeCanvas.getContext('2d')!;

    // Draw expanded version by drawing multiple offset copies
    strokeCtx.fillStyle = color;
    const steps = Math.ceil(size);
    for (let dx = -steps; dx <= steps; dx++) {
      for (let dy = -steps; dy <= steps; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= size) {
          strokeCtx.drawImage(source, dx, dy);
        }
      }
    }

    // Colorize
    strokeCtx.globalCompositeOperation = 'source-in';
    strokeCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (position === 'outside') {
      // Remove original area for outside stroke
      strokeCtx.globalCompositeOperation = 'destination-out';
      strokeCtx.drawImage(source, 0, 0);
      ctx.drawImage(strokeCanvas, 0, 0);
    } else if (position === 'inside') {
      // Mask to original for inside stroke
      strokeCtx.globalCompositeOperation = 'destination-in';
      strokeCtx.drawImage(source, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.drawImage(strokeCanvas, 0, 0);
    } else {
      // Center stroke - draw both
      ctx.drawImage(strokeCanvas, 0, 0);
    }

    ctx.restore();
  };

  // Composite all layers to main canvas
  const compositeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkered background
    const checkSize = 8;
    for (let y = 0; y < canvas.height; y += checkSize) {
      for (let x = 0; x < canvas.width; x += checkSize) {
        const isLight = ((x / checkSize) + (y / checkSize)) % 2 === 0;
        ctx.fillStyle = isLight ? '#3a3a3c' : '#2d2d2f';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Draw layers from bottom to top (reverse order since layers[0] is top)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;

      let layerCanvas = layerCanvasesRef.current.get(layer.id);
      if (!layerCanvas) continue;

      // Apply layer effects if any
      if (layer.effects && layer.effects.length > 0) {
        layerCanvas = applyLayerEffects(layerCanvas, layer.effects);
      }

      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = blendModeToCompositeOp(layer.blendMode);

      // Apply mask if exists
      if (layer.mask?.enabled && layer.mask.imageData) {
        // Create temporary canvas for masked result
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CANVAS_SIZE;
        tempCanvas.height = CANVAS_SIZE;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(layerCanvas, 0, 0);
          tempCtx.globalCompositeOperation = 'destination-in';
          // Draw mask
          const maskImg = new Image();
          maskImg.src = layer.mask.imageData;
          tempCtx.drawImage(maskImg, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      } else {
        ctx.drawImage(layerCanvas, 0, 0);
      }

      ctx.restore();
    }

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw transform handles for active layer (in move/transform mode)
    if ((activeTool === 'move' || activeTool === 'transform') && activeLayerId) {
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer) {
        const transform = activeLayer.transform || {
          x: 0, y: 0,
          width: CANVAS_SIZE, height: CANVAS_SIZE,
          rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
        };

        drawTransformHandles(ctx, transform);
      }
    }
  }, [layers, showGrid, activeTool, activeLayerId, applyLayerEffects]);

  // Draw transform handles around the layer
  const drawTransformHandles = useCallback((ctx: CanvasRenderingContext2D, transform: Transform) => {
    const { x, y, width, height, rotation } = transform;
    const handleSize = 8;
    const handleOffset = handleSize / 2;

    ctx.save();

    // Translate to center and rotate
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    // Draw bounding box
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);

    // Draw handles
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;

    const handles: { type: HandleType; hx: number; hy: number }[] = [
      { type: 'tl', hx: x, hy: y },
      { type: 'tr', hx: x + width, hy: y },
      { type: 'bl', hx: x, hy: y + height },
      { type: 'br', hx: x + width, hy: y + height },
      { type: 't', hx: x + width / 2, hy: y },
      { type: 'b', hx: x + width / 2, hy: y + height },
      { type: 'l', hx: x, hy: y + height / 2 },
      { type: 'r', hx: x + width, hy: y + height / 2 },
    ];

    handles.forEach(({ type, hx, hy }) => {
      ctx.beginPath();
      ctx.rect(hx - handleOffset, hy - handleOffset, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();

      // Highlight hovered handle
      if (hoveredHandle === type) {
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
      }
    });

    // Draw rotation handle (above top center)
    const rotateHandleY = y - 30;
    ctx.beginPath();
    ctx.arc(x + width / 2, rotateHandleY, handleSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = hoveredHandle === 'rotate' ? '#f97316' : '#ffffff';
    ctx.fill();
    ctx.stroke();

    // Line connecting to rotation handle
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, rotateHandleY + handleSize / 2);
    ctx.stroke();

    ctx.restore();
  }, [hoveredHandle]);

  // Get default transform for a layer
  const getLayerTransform = useCallback((layer: Layer): Transform => {
    return layer.transform || {
      x: 0,
      y: 0,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
    };
  }, []);

  // Check if point is on a handle
  const getHandleAtPoint = useCallback((px: number, py: number, transform: Transform): HandleType | null => {
    const { x, y, width, height } = transform;
    const handleSize = 12; // Slightly larger hit area

    const handles: { type: HandleType; hx: number; hy: number }[] = [
      { type: 'tl', hx: x, hy: y },
      { type: 'tr', hx: x + width, hy: y },
      { type: 'bl', hx: x, hy: y + height },
      { type: 'br', hx: x + width, hy: y + height },
      { type: 't', hx: x + width / 2, hy: y },
      { type: 'b', hx: x + width / 2, hy: y + height },
      { type: 'l', hx: x, hy: y + height / 2 },
      { type: 'r', hx: x + width, hy: y + height / 2 },
      { type: 'rotate', hx: x + width / 2, hy: y - 30 },
    ];

    for (const { type, hx, hy } of handles) {
      if (Math.abs(px - hx) <= handleSize && Math.abs(py - hy) <= handleSize) {
        return type;
      }
    }

    // Check if inside bounding box for move
    if (px >= x && px <= x + width && py >= y && py <= y + height) {
      return 'move';
    }

    return null;
  }, []);

  // Render on layer changes
  useEffect(() => {
    compositeCanvas();
  }, [layers, compositeCanvas]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2 + pan.x;
    const centerY = rect.height / 2 + pan.y;

    const x = (clientX - rect.left - centerX) / zoom + CANVAS_SIZE / 2;
    const y = (clientY - rect.top - centerY) / zoom + CANVAS_SIZE / 2;

    return { x, y };
  }, [zoom, pan]);

  // Draw brush stroke
  const drawStroke = useCallback((
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    pressure: number
  ) => {
    const brush = currentBrush;
    const color = activeTool === 'eraser' ? 'rgba(0,0,0,0)' : primaryColor;

    // Calculate actual size based on pressure
    const size = brush.pressureSize
      ? brush.size * pressure
      : brush.size;

    // Calculate opacity based on pressure
    const opacity = brush.pressureOpacity
      ? (brush.opacity / 100) * pressure
      : brush.opacity / 100;

    // Calculate flow
    const flow = brush.pressureFlow
      ? (brush.flow / 100) * pressure
      : brush.flow / 100;

    ctx.save();

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.globalAlpha = opacity * flow;

    // Draw interpolated points
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const spacing = Math.max(1, (brush.spacing / 100) * size);
    const steps = Math.ceil(distance / spacing);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      // Apply scatter
      const scatterX = (Math.random() - 0.5) * 2 * brush.scatterX;
      const scatterY = (Math.random() - 0.5) * 2 * brush.scatterY;
      const px = x + scatterX;
      const py = y + scatterY;

      // Draw brush tip
      ctx.beginPath();

      if (brush.hardness >= 99) {
        // Hard edge brush
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        // Soft edge brush with gradient
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, size / 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(brush.hardness / 100, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.arc(px, py, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    ctx.restore();
  }, [currentBrush, primaryColor, activeTool]);

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Handle hand tool or space+click panning
    if (activeTool === 'hand' || e.buttons === 4) {
      setIsPanning(true);
      setLastPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle move/transform tool
    if ((activeTool === 'move' || activeTool === 'transform') && activeLayerId) {
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer && !activeLayer.locked) {
        const transform = getLayerTransform(activeLayer);
        const handle = getHandleAtPoint(x, y, transform);

        if (handle) {
          setTransformState({
            active: true,
            handle,
            startX: x,
            startY: y,
            startTransform: { ...transform },
          });
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // Handle eyedropper
    if (activeTool === 'eyedropper') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
          const hex = '#' + [pixel[0], pixel[1], pixel[2]]
            .map((c) => c.toString(16).padStart(2, '0'))
            .join('');
          useStudioEditor.getState().setPrimaryColor(hex);
        }
      }
      return;
    }

    // Handle brush/eraser
    if (activeTool === 'brush' || activeTool === 'eraser') {
      if (!activeLayerId) return;

      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) return;

      setIsDrawing(true);
      setLastPoint({ x, y });

      // Get or create layer canvas
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        // Draw initial point
        updatePointerState(e.pressure || 0.5, e.tiltX || 0, e.tiltY || 0);
        drawStroke(ctx, x, y, x, y, e.pressure || 0.5);
        compositeCanvas();
      }

      // Capture pointer for smooth drawing
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    // Handle fill tool
    if (activeTool === 'fill') {
      if (!activeLayerId) return;
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        floodFill(ctx, Math.floor(x), Math.floor(y), primaryColor);
        compositeCanvas();
        pushHistory('Fill');
      }
    }

    // Handle gradient tool
    if (activeTool === 'gradient') {
      if (!activeLayerId) return;
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) return;

      setIsDrawingGradient(true);
      setGradientStart({ x, y });
      setGradientEnd({ x, y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [
    screenToCanvas,
    activeTool,
    activeLayerId,
    layers,
    getLayerCanvas,
    drawStroke,
    compositeCanvas,
    pushHistory,
    primaryColor,
    getLayerTransform,
    getHandleAtPoint,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Update brush preview position
    if (activeTool === 'brush' || activeTool === 'eraser') {
      setBrushPreview({ x: e.clientX, y: e.clientY });
    }

    // Handle transform hover highlight
    if ((activeTool === 'move' || activeTool === 'transform') && activeLayerId && !transformState.active) {
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer) {
        const transform = getLayerTransform(activeLayer);
        const handle = getHandleAtPoint(x, y, transform);
        setHoveredHandle(handle);
      }
    }

    // Handle active transform dragging
    if (transformState.active && transformState.startTransform && activeLayerId) {
      const dx = x - transformState.startX;
      const dy = y - transformState.startY;
      const st = transformState.startTransform;

      let newTransform: Transform = { ...st };

      switch (transformState.handle) {
        case 'move':
          newTransform.x = st.x + dx;
          newTransform.y = st.y + dy;
          break;
        case 'tl':
          newTransform.x = st.x + dx;
          newTransform.y = st.y + dy;
          newTransform.width = st.width - dx;
          newTransform.height = st.height - dy;
          break;
        case 'tr':
          newTransform.y = st.y + dy;
          newTransform.width = st.width + dx;
          newTransform.height = st.height - dy;
          break;
        case 'bl':
          newTransform.x = st.x + dx;
          newTransform.width = st.width - dx;
          newTransform.height = st.height + dy;
          break;
        case 'br':
          newTransform.width = st.width + dx;
          newTransform.height = st.height + dy;
          break;
        case 't':
          newTransform.y = st.y + dy;
          newTransform.height = st.height - dy;
          break;
        case 'b':
          newTransform.height = st.height + dy;
          break;
        case 'l':
          newTransform.x = st.x + dx;
          newTransform.width = st.width - dx;
          break;
        case 'r':
          newTransform.width = st.width + dx;
          break;
        case 'rotate':
          // Calculate rotation angle from center
          const cx = st.x + st.width / 2;
          const cy = st.y + st.height / 2;
          const startAngle = Math.atan2(transformState.startY - cy, transformState.startX - cx);
          const currentAngle = Math.atan2(y - cy, x - cx);
          const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
          newTransform.rotation = st.rotation + angleDiff;
          break;
      }

      // Ensure minimum size
      newTransform.width = Math.max(10, newTransform.width);
      newTransform.height = Math.max(10, newTransform.height);

      updateLayer(activeLayerId, { transform: newTransform });
      compositeCanvas();
      return;
    }

    // Handle panning
    if (isPanning && lastPoint) {
      const dx = e.clientX - lastPoint.x;
      const dy = e.clientY - lastPoint.y;
      setPanLocal((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle drawing
    if (isDrawing && lastPoint && activeLayerId) {
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        updatePointerState(e.pressure || 0.5, e.tiltX || 0, e.tiltY || 0);
        drawStroke(ctx, lastPoint.x, lastPoint.y, x, y, e.pressure || 0.5);
        compositeCanvas();
      }
      setLastPoint({ x, y });
    }

    // Update gradient end point while dragging
    if (isDrawingGradient && gradientStart) {
      setGradientEnd({ x, y });
    }
  }, [
    screenToCanvas,
    activeTool,
    isPanning,
    isDrawing,
    lastPoint,
    activeLayerId,
    getLayerCanvas,
    drawStroke,
    compositeCanvas,
    updatePointerState,
    layers,
    transformState,
    getLayerTransform,
    getHandleAtPoint,
    updateLayer,
    isDrawingGradient,
    gradientStart,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Handle transform finish
    if (transformState.active) {
      setTransformState({
        active: false,
        handle: null,
        startX: 0,
        startY: 0,
        startTransform: null,
      });
      setHoveredHandle(null);
      pushHistory('Transform');
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      pushHistory('Brush stroke');

      // Save layer canvas data
      if (activeLayerId) {
        const layerCanvas = layerCanvasesRef.current.get(activeLayerId);
        if (layerCanvas) {
          const imageData = layerCanvas.toDataURL();
          updateLayer(activeLayerId, { imageData });
        }
      }
    }

    // Apply gradient when done dragging
    if (isDrawingGradient && gradientStart && gradientEnd && activeLayerId) {
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        // Create gradient based on start and end points
        const gradient = ctx.createLinearGradient(
          gradientStart.x,
          gradientStart.y,
          gradientEnd.x,
          gradientEnd.y
        );
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);

        // Fill the layer with the gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        compositeCanvas();

        // Save layer data
        const imageData = layerCanvas.toDataURL();
        updateLayer(activeLayerId, { imageData });

        pushHistory('Gradient');
      }

      setIsDrawingGradient(false);
      setGradientStart(null);
      setGradientEnd(null);
    }

    setIsPanning(false);
    setLastPoint(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [isDrawing, pushHistory, activeLayerId, updateLayer, transformState, isDrawingGradient, gradientStart, gradientEnd, primaryColor, secondaryColor, getLayerCanvas, compositeCanvas]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    } else {
      // Pan with wheel
      setPanLocal((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [zoom, setZoom]);

  // Handle pointer leave for brush preview
  const handlePointerLeave = useCallback(() => {
    setBrushPreview(null);
  }, []);

  // Handle drag and drop for image import
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the container (not entering a child)
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Process each image file
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Scale image to fit canvas while preserving aspect ratio
          const canvas = document.createElement('canvas');
          canvas.width = CANVAS_SIZE;
          canvas.height = CANVAS_SIZE;
          const ctx = canvas.getContext('2d')!;

          // Calculate scaling to fit while preserving aspect ratio
          const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = (CANVAS_SIZE - scaledWidth) / 2;
          const offsetY = (CANVAS_SIZE - scaledHeight) / 2;

          // Clear with transparent background
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

          const scaledDataUrl = canvas.toDataURL('image/png');

          // Create new layer with image
          const layerName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          const newLayer = addLayer('raster', layerName);
          if (newLayer) {
            // Update the layer with image data
            updateLayer(newLayer.id, {
              imageData: scaledDataUrl,
              transform: {
                x: offsetX,
                y: offsetY,
                width: scaledWidth,
                height: scaledHeight,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                skewX: 0,
                skewY: 0,
              }
            });
            pushHistory(`Import ${layerName}`);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }, [addLayer, updateLayer, pushHistory]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        touchAction: 'none',
        cursor: getCursorForTool(activeTool, hoveredHandle),
      }}
    >
      {/* Canvas centered with zoom and pan */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="shadow-2xl shadow-black/50"
          style={{
            imageRendering: zoom > 2 ? 'pixelated' : 'auto',
          }}
        />
      </div>

      {/* Brush cursor preview */}
      {brushPreview && (activeTool === 'brush' || activeTool === 'eraser') && (
        <div
          className="pointer-events-none fixed rounded-full border border-white/50 mix-blend-difference"
          style={{
            left: brushPreview.x,
            top: brushPreview.y,
            width: currentBrush.size * zoom,
            height: currentBrush.size * zoom,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Gradient preview line */}
      {isDrawingGradient && gradientStart && gradientEnd && (
        <svg
          className="absolute inset-0 pointer-events-none z-40"
          width="100%"
          height="100%"
        >
          <defs>
            <linearGradient
              id="gradient-preview"
              x1={gradientStart.x / CANVAS_SIZE * 100 + '%'}
              y1={gradientStart.y / CANVAS_SIZE * 100 + '%'}
              x2={gradientEnd.x / CANVAS_SIZE * 100 + '%'}
              y2={gradientEnd.y / CANVAS_SIZE * 100 + '%'}
            >
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>
          </defs>
          {/* Preview line */}
          <line
            x1={`calc(50% + ${(gradientStart.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
            y1={`calc(50% + ${(gradientStart.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
            x2={`calc(50% + ${(gradientEnd.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
            y2={`calc(50% + ${(gradientEnd.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="4"
          />
          {/* Start point */}
          <circle
            cx={`calc(50% + ${(gradientStart.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
            cy={`calc(50% + ${(gradientStart.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
            r="6"
            fill={primaryColor}
            stroke="white"
            strokeWidth="2"
          />
          {/* End point */}
          <circle
            cx={`calc(50% + ${(gradientEnd.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
            cy={`calc(50% + ${(gradientEnd.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
            r="6"
            fill={secondaryColor}
            stroke="white"
            strokeWidth="2"
          />
        </svg>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/50 rounded text-[10px] text-white/60">
        {Math.round(zoom * 100)}%
      </div>

      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-orange-500/20 border-2 border-dashed border-orange-500 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-black/70 px-6 py-4 rounded-lg text-center">
            <div className="text-orange-400 text-lg font-medium mb-1">Drop Image Here</div>
            <div className="text-white/60 text-sm">Image will be added as new layer</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Flood fill algorithm
function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string
) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Convert fill color to RGBA
  const fillRGBA = hexToRGBA(fillColor);

  // Get the color at the start position
  const startPos = (startY * width + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  // If same color, no need to fill
  if (
    startR === fillRGBA.r &&
    startG === fillRGBA.g &&
    startB === fillRGBA.b &&
    startA === fillRGBA.a
  ) {
    return;
  }

  const tolerance = 32;
  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pos = (y * width + x) * 4;
    const r = data[pos];
    const g = data[pos + 1];
    const b = data[pos + 2];
    const a = data[pos + 3];

    // Check if color matches within tolerance
    if (
      Math.abs(r - startR) <= tolerance &&
      Math.abs(g - startG) <= tolerance &&
      Math.abs(b - startB) <= tolerance &&
      Math.abs(a - startA) <= tolerance
    ) {
      data[pos] = fillRGBA.r;
      data[pos + 1] = fillRGBA.g;
      data[pos + 2] = fillRGBA.b;
      data[pos + 3] = fillRGBA.a;

      visited.add(key);

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function hexToRGBA(hex: string): { r: number; g: number; b: number; a: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };
}

function getCursorForTool(tool: string, hoveredHandle?: HandleType | null): string {
  // Transform handle cursors
  if ((tool === 'move' || tool === 'transform') && hoveredHandle) {
    switch (hoveredHandle) {
      case 'move':
        return 'move';
      case 'tl':
      case 'br':
        return 'nwse-resize';
      case 'tr':
      case 'bl':
        return 'nesw-resize';
      case 't':
      case 'b':
        return 'ns-resize';
      case 'l':
      case 'r':
        return 'ew-resize';
      case 'rotate':
        return 'grab';
    }
  }

  switch (tool) {
    case 'move':
    case 'transform':
      return 'default';
    case 'hand':
      return 'grab';
    case 'eyedropper':
      return 'crosshair';
    case 'zoom':
      return 'zoom-in';
    case 'brush':
    case 'eraser':
      return 'none';
    default:
      return 'crosshair';
  }
}
