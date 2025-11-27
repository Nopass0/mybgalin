'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import type { Transform, Layer, BlendMode, LayerEffect } from '@/types/studio';
import { BrushContextMenu, TextContextMenu, FilterContextMenu, ContextMenu, ContextMenuItem } from './context-menu';

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
  activeMapTab: 'color' | 'normal' | 'metalness' | 'roughness' | 'render';
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

  // Clone stamp state
  const [cloneSource, setCloneSource] = useState<{ x: number; y: number } | null>(null);
  const [cloneOffset, setCloneOffset] = useState<{ x: number; y: number } | null>(null);
  const cloneSourceLayerRef = useRef<string | null>(null);

  // Selection state
  const [selection, setSelection] = useState<{
    type: 'rect' | 'ellipse' | 'lasso' | 'magic';
    bounds?: { x: number; y: number; width: number; height: number };
    path?: { x: number; y: number }[];
    maskData?: ImageData;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const selectionAnimationRef = useRef<number>(0);

  // Rulers and guides state
  const [showRulers, setShowRulers] = useState(false);
  const [guides, setGuides] = useState<Array<{
    id: string;
    type: 'horizontal' | 'vertical' | 'line';
    position?: number;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
  }>>([]);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [isCreatingGuide, setIsCreatingGuide] = useState(false);
  const [guideStartPoint, setGuideStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Alt key for panning
  const [altHeld, setAltHeld] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    type: 'brush' | 'text' | 'filter' | 'canvas' | null;
    x: number;
    y: number;
  } | null>(null);

  // Shift constraint for straight lines
  const [shiftHeld, setShiftHeld] = useState(false);
  const [strokeStartPoint, setStrokeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [constrainedAxis, setConstrainedAxis] = useState<'x' | 'y' | null>(null);

  // Warp tool state
  const [warpMode, setWarpMode] = useState<'push' | 'twirl' | 'pinch' | 'bloat' | 'reconstruct'>('push');
  const [isWarping, setIsWarping] = useState(false);
  const warpImageBackupRef = useRef<ImageData | null>(null);

  // Perspective guides state
  const [perspectiveGuides, setPerspectiveGuides] = useState<Array<{
    id: string;
    vanishingPoint: { x: number; y: number };
    lines: number;
    angle: number;
    spread: number;
  }>>([]);

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

  // Handle keyboard events for rulers (Ctrl), shift constraint, and alt for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setShowRulers(true);
      }
      if (e.key === 'Shift') {
        setShiftHeld(true);
      }
      if (e.key === 'Alt') {
        setAltHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setShowRulers(false);
        setIsCreatingGuide(false);
        setGuideStartPoint(null);
      }
      if (e.key === 'Shift') {
        setShiftHeld(false);
        setConstrainedAxis(null);
      }
      if (e.key === 'Alt') {
        setAltHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  // Initialize layer canvases from imageData and render text/shape layers
  useEffect(() => {
    const initializeLayerCanvases = async () => {
      for (const layer of layers) {
        const layerCanvas = getLayerCanvas(layer.id);
        const ctx = layerCanvas.getContext('2d');
        if (!ctx) continue;

        // For raster layers, load from imageData if available
        if (layer.imageData && layer.type === 'raster') {
          const img = new window.Image();
          img.src = layer.imageData;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
              ctx.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = () => resolve();
          });
        }
        // For text layers, render text content
        else if (layer.type === 'text' && layer.textContent) {
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          const { text, fontFamily, fontSize, fontWeight, fontStyle, textAlign, color, stroke, shadow } = layer.textContent;

          // Wait for font to load
          try {
            await document.fonts.load(`${fontWeight} ${fontSize}px "${fontFamily}"`);
          } catch (e) {
            console.warn('Font loading failed, using fallback:', e);
          }

          ctx.save();
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
          ctx.textAlign = textAlign as CanvasTextAlign;
          ctx.textBaseline = 'middle';

          // Apply shadow
          if (shadow) {
            ctx.shadowColor = shadow.color;
            ctx.shadowBlur = shadow.blur;
            ctx.shadowOffsetX = shadow.offsetX;
            ctx.shadowOffsetY = shadow.offsetY;
          }

          // Apply transform if available
          const x = layer.transform?.x ?? CANVAS_SIZE / 2;
          const y = layer.transform?.y ?? CANVAS_SIZE / 2;

          // Draw stroke if available
          if (stroke) {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width * 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(text, x, y);
          }

          // Fill text
          ctx.fillStyle = color || '#ffffff';
          ctx.fillText(text, x, y);

          ctx.restore();
        }
      }
      compositeCanvas();
    };

    initializeLayerCanvases();
  }, [layers, getLayerCanvas, compositeCanvas]);

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

  // Apply blur effect at a point
  const applyBlurAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    strength: number
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);
    const sx = Math.max(0, Math.floor(x - halfSize));
    const sy = Math.max(0, Math.floor(y - halfSize));
    const sw = Math.min(size, CANVAS_SIZE - sx);
    const sh = Math.min(size, CANVAS_SIZE - sy);

    if (sw <= 0 || sh <= 0) return;

    // Get the region to blur
    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    // Simple box blur
    const blurRadius = Math.ceil(strength * 3);
    const tempData = new Uint8ClampedArray(data);

    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        // Check if within circular brush
        const dx = px - halfSize;
        const dy = py - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        let r = 0, g = 0, b = 0, a = 0, count = 0;

        // Average surrounding pixels
        for (let by = -blurRadius; by <= blurRadius; by++) {
          for (let bx = -blurRadius; bx <= blurRadius; bx++) {
            const nx = px + bx;
            const ny = py + by;
            if (nx >= 0 && nx < sw && ny >= 0 && ny < sh) {
              const idx = (ny * sw + nx) * 4;
              r += tempData[idx];
              g += tempData[idx + 1];
              b += tempData[idx + 2];
              a += tempData[idx + 3];
              count++;
            }
          }
        }

        if (count > 0) {
          const idx = (py * sw + px) * 4;
          // Blend based on distance from center (falloff)
          const falloff = 1 - (dist / radius);
          const blend = falloff * strength;
          data[idx] = Math.round(data[idx] * (1 - blend) + (r / count) * blend);
          data[idx + 1] = Math.round(data[idx + 1] * (1 - blend) + (g / count) * blend);
          data[idx + 2] = Math.round(data[idx + 2] * (1 - blend) + (b / count) * blend);
          data[idx + 3] = Math.round(data[idx + 3] * (1 - blend) + (a / count) * blend);
        }
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }, []);

  // Apply sharpen effect at a point
  const applySharpenAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    strength: number
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);
    const sx = Math.max(0, Math.floor(x - halfSize));
    const sy = Math.max(0, Math.floor(y - halfSize));
    const sw = Math.min(size, CANVAS_SIZE - sx);
    const sh = Math.min(size, CANVAS_SIZE - sy);

    if (sw <= 0 || sh <= 0) return;

    // Get the region to sharpen
    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);

    // Unsharp mask kernel
    const amount = strength * 2;

    for (let py = 1; py < sh - 1; py++) {
      for (let px = 1; px < sw - 1; px++) {
        // Check if within circular brush
        const dx = px - halfSize;
        const dy = py - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const idx = (py * sw + px) * 4;

        // Get center and surrounding pixels for sharpening
        const centerR = tempData[idx];
        const centerG = tempData[idx + 1];
        const centerB = tempData[idx + 2];

        // Average of neighbors
        let avgR = 0, avgG = 0, avgB = 0;
        const neighbors = [
          [-1, -1], [0, -1], [1, -1],
          [-1, 0], [1, 0],
          [-1, 1], [0, 1], [1, 1]
        ];

        for (const [ox, oy] of neighbors) {
          const nidx = ((py + oy) * sw + (px + ox)) * 4;
          avgR += tempData[nidx];
          avgG += tempData[nidx + 1];
          avgB += tempData[nidx + 2];
        }
        avgR /= 8;
        avgG /= 8;
        avgB /= 8;

        // Apply unsharp mask with falloff
        const falloff = 1 - (dist / radius);
        const blend = falloff * amount;

        data[idx] = Math.max(0, Math.min(255, centerR + (centerR - avgR) * blend));
        data[idx + 1] = Math.max(0, Math.min(255, centerG + (centerG - avgG) * blend));
        data[idx + 2] = Math.max(0, Math.min(255, centerB + (centerB - avgB) * blend));
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }, []);

  // Apply smudge effect
  const applySmudgeAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
    strength: number,
    smudgeColorRef: React.MutableRefObject<{ r: number; g: number; b: number; a: number } | null>
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);

    // Get color at start point if not already captured
    if (!smudgeColorRef.current) {
      const sx = Math.floor(x1);
      const sy = Math.floor(y1);
      if (sx >= 0 && sx < CANVAS_SIZE && sy >= 0 && sy < CANVAS_SIZE) {
        const pixel = ctx.getImageData(sx, sy, 1, 1).data;
        smudgeColorRef.current = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
      }
    }

    if (!smudgeColorRef.current) return;

    // Draw smudged color at current position
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const steps = Math.ceil(distance / 2);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 1 : i / steps;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;

      const sx = Math.max(0, Math.floor(cx - halfSize));
      const sy = Math.max(0, Math.floor(cy - halfSize));
      const sw = Math.min(size, CANVAS_SIZE - sx);
      const sh = Math.min(size, CANVAS_SIZE - sy);

      if (sw <= 0 || sh <= 0) continue;

      const imageData = ctx.getImageData(sx, sy, sw, sh);
      const data = imageData.data;

      for (let py = 0; py < sh; py++) {
        for (let px = 0; px < sw; px++) {
          const dx = px - halfSize;
          const dy = py - halfSize;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          const idx = (py * sw + px) * 4;
          const falloff = 1 - (dist / radius);
          const blend = falloff * strength * 0.3;

          // Blend smudge color with existing
          data[idx] = Math.round(data[idx] * (1 - blend) + smudgeColorRef.current!.r * blend);
          data[idx + 1] = Math.round(data[idx + 1] * (1 - blend) + smudgeColorRef.current!.g * blend);
          data[idx + 2] = Math.round(data[idx + 2] * (1 - blend) + smudgeColorRef.current!.b * blend);

          // Pick up new color as we move
          smudgeColorRef.current!.r = data[idx];
          smudgeColorRef.current!.g = data[idx + 1];
          smudgeColorRef.current!.b = data[idx + 2];
        }
      }

      ctx.putImageData(imageData, sx, sy);
    }
  }, []);

  // Smudge color reference
  const smudgeColorRef = useRef<{ r: number; g: number; b: number; a: number } | null>(null);

  // Apply dodge (lighten) effect at a point
  const applyDodgeAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    strength: number
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);
    const sx = Math.max(0, Math.floor(x - halfSize));
    const sy = Math.max(0, Math.floor(y - halfSize));
    const sw = Math.min(size, CANVAS_SIZE - sx);
    const sh = Math.min(size, CANVAS_SIZE - sy);

    if (sw <= 0 || sh <= 0) return;

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const dx = px - halfSize;
        const dy = py - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const idx = (py * sw + px) * 4;
        const falloff = 1 - (dist / radius);
        const amount = falloff * strength * 0.2;

        // Lighten the pixel (dodge)
        data[idx] = Math.min(255, data[idx] + (255 - data[idx]) * amount);
        data[idx + 1] = Math.min(255, data[idx + 1] + (255 - data[idx + 1]) * amount);
        data[idx + 2] = Math.min(255, data[idx + 2] + (255 - data[idx + 2]) * amount);
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }, []);

  // Apply burn (darken) effect at a point
  const applyBurnAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    strength: number
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);
    const sx = Math.max(0, Math.floor(x - halfSize));
    const sy = Math.max(0, Math.floor(y - halfSize));
    const sw = Math.min(size, CANVAS_SIZE - sx);
    const sh = Math.min(size, CANVAS_SIZE - sy);

    if (sw <= 0 || sh <= 0) return;

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const dx = px - halfSize;
        const dy = py - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const idx = (py * sw + px) * 4;
        const falloff = 1 - (dist / radius);
        const amount = falloff * strength * 0.2;

        // Darken the pixel (burn)
        data[idx] = Math.max(0, data[idx] * (1 - amount));
        data[idx + 1] = Math.max(0, data[idx + 1] * (1 - amount));
        data[idx + 2] = Math.max(0, data[idx + 2] * (1 - amount));
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }, []);

  // Apply sponge (saturation adjust) effect at a point
  const applySpongeAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    strength: number,
    saturate: boolean // true = saturate, false = desaturate
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);
    const sx = Math.max(0, Math.floor(x - halfSize));
    const sy = Math.max(0, Math.floor(y - halfSize));
    const sw = Math.min(size, CANVAS_SIZE - sx);
    const sh = Math.min(size, CANVAS_SIZE - sy);

    if (sw <= 0 || sh <= 0) return;

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;

    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const dx = px - halfSize;
        const dy = py - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const idx = (py * sw + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Calculate luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const falloff = 1 - (dist / radius);
        const amount = falloff * strength * 0.15;

        if (saturate) {
          // Increase saturation by moving away from luminance
          data[idx] = Math.min(255, r + (r - lum) * amount);
          data[idx + 1] = Math.min(255, g + (g - lum) * amount);
          data[idx + 2] = Math.min(255, b + (b - lum) * amount);
        } else {
          // Decrease saturation by moving toward luminance
          data[idx] = r + (lum - r) * amount;
          data[idx + 1] = g + (lum - g) * amount;
          data[idx + 2] = b + (lum - b) * amount;
        }
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }, []);

  // Apply clone stamp at a point
  const applyCloneAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    targetX: number,
    targetY: number,
    sourceX: number,
    sourceY: number,
    radius: number,
    opacity: number
  ) => {
    const size = Math.ceil(radius * 2);
    const halfSize = Math.floor(size / 2);

    // Get source region
    const srcX = Math.max(0, Math.floor(sourceX - halfSize));
    const srcY = Math.max(0, Math.floor(sourceY - halfSize));
    const srcW = Math.min(size, CANVAS_SIZE - srcX);
    const srcH = Math.min(size, CANVAS_SIZE - srcY);

    if (srcW <= 0 || srcH <= 0) return;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return;

    const sourceData = sourceCtx.getImageData(srcX, srcY, srcW, srcH);

    // Get target region
    const tgtX = Math.max(0, Math.floor(targetX - halfSize));
    const tgtY = Math.max(0, Math.floor(targetY - halfSize));
    const tgtW = Math.min(size, CANVAS_SIZE - tgtX);
    const tgtH = Math.min(size, CANVAS_SIZE - tgtY);

    if (tgtW <= 0 || tgtH <= 0) return;

    const targetData = ctx.getImageData(tgtX, tgtY, tgtW, tgtH);

    // Blend source into target within circular brush
    for (let py = 0; py < Math.min(srcH, tgtH); py++) {
      for (let px = 0; px < Math.min(srcW, tgtW); px++) {
        const dx = px - halfSize;
        const dy = py - halfSize;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const srcIdx = (py * srcW + px) * 4;
        const tgtIdx = (py * tgtW + px) * 4;

        // Soft falloff at edges
        const falloff = 1 - (dist / radius);
        const blend = falloff * opacity;

        // Blend source with target
        targetData.data[tgtIdx] = Math.round(targetData.data[tgtIdx] * (1 - blend) + sourceData.data[srcIdx] * blend);
        targetData.data[tgtIdx + 1] = Math.round(targetData.data[tgtIdx + 1] * (1 - blend) + sourceData.data[srcIdx + 1] * blend);
        targetData.data[tgtIdx + 2] = Math.round(targetData.data[tgtIdx + 2] * (1 - blend) + sourceData.data[srcIdx + 2] * blend);
        targetData.data[tgtIdx + 3] = Math.round(targetData.data[tgtIdx + 3] * (1 - blend) + sourceData.data[srcIdx + 3] * blend);
      }
    }

    ctx.putImageData(targetData, tgtX, tgtY);
  }, []);

  // Apply warp/deformation effect at a point (liquify style)
  const applyWarpAtPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    radius: number,
    strength: number,
    mode: 'push' | 'twirl' | 'pinch' | 'bloat' | 'reconstruct'
  ) => {
    const size = Math.ceil(radius * 2) + 4;
    const halfSize = Math.floor(size / 2);
    const sx = Math.max(0, Math.floor(x - halfSize));
    const sy = Math.max(0, Math.floor(y - halfSize));
    const sw = Math.min(size, CANVAS_SIZE - sx);
    const sh = Math.min(size, CANVAS_SIZE - sy);

    if (sw <= 0 || sh <= 0) return;

    // Get the current image data
    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const origData = new Uint8ClampedArray(imageData.data);
    const data = imageData.data;

    // Clear the region first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }

    // Sample from original and place in new positions
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const localX = px - (x - sx);
        const localY = py - (y - sy);
        const dist = Math.sqrt(localX * localX + localY * localY);

        if (dist > radius || dist === 0) {
          // Copy unchanged pixels
          const idx = (py * sw + px) * 4;
          data[idx] = origData[idx];
          data[idx + 1] = origData[idx + 1];
          data[idx + 2] = origData[idx + 2];
          data[idx + 3] = origData[idx + 3];
          continue;
        }

        // Calculate falloff (stronger in center)
        const falloff = Math.pow(1 - (dist / radius), 2);
        const amount = falloff * strength;

        let srcX = px;
        let srcY = py;

        switch (mode) {
          case 'push':
            // Push pixels in the direction of mouse movement
            srcX = px + deltaX * amount;
            srcY = py + deltaY * amount;
            break;
          case 'twirl':
            // Rotate pixels around center point
            const angle = amount * Math.PI * 0.5 * (deltaX > 0 ? 1 : -1);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            srcX = localX * cos - localY * sin + (x - sx);
            srcY = localX * sin + localY * cos + (y - sy);
            break;
          case 'pinch':
            // Pull pixels toward center
            srcX = px + localX * amount * 0.3;
            srcY = py + localY * amount * 0.3;
            break;
          case 'bloat':
            // Push pixels away from center
            srcX = px - localX * amount * 0.3;
            srcY = py - localY * amount * 0.3;
            break;
          case 'reconstruct':
            // Restore from backup
            if (warpImageBackupRef.current) {
              const backupSx = Math.max(0, Math.floor(x - halfSize));
              const backupSy = Math.max(0, Math.floor(y - halfSize));
              const backupIdx = ((py + backupSy) * CANVAS_SIZE + (px + backupSx)) * 4;
              const idx = (py * sw + px) * 4;

              const backupData = warpImageBackupRef.current.data;
              if (backupIdx >= 0 && backupIdx + 3 < backupData.length) {
                data[idx] = Math.round(origData[idx] * (1 - amount) + backupData[backupIdx] * amount);
                data[idx + 1] = Math.round(origData[idx + 1] * (1 - amount) + backupData[backupIdx + 1] * amount);
                data[idx + 2] = Math.round(origData[idx + 2] * (1 - amount) + backupData[backupIdx + 2] * amount);
                data[idx + 3] = Math.round(origData[idx + 3] * (1 - amount) + backupData[backupIdx + 3] * amount);
              }
            }
            continue;
        }

        // Sample from source with bilinear interpolation
        const srcXi = Math.floor(srcX);
        const srcYi = Math.floor(srcY);
        const fx = srcX - srcXi;
        const fy = srcY - srcYi;

        if (srcXi >= 0 && srcXi < sw - 1 && srcYi >= 0 && srcYi < sh - 1) {
          const idx00 = (srcYi * sw + srcXi) * 4;
          const idx10 = (srcYi * sw + srcXi + 1) * 4;
          const idx01 = ((srcYi + 1) * sw + srcXi) * 4;
          const idx11 = ((srcYi + 1) * sw + srcXi + 1) * 4;
          const dstIdx = (py * sw + px) * 4;

          for (let c = 0; c < 4; c++) {
            const v00 = origData[idx00 + c];
            const v10 = origData[idx10 + c];
            const v01 = origData[idx01 + c];
            const v11 = origData[idx11 + c];
            const v = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
            data[dstIdx + c] = Math.round(v);
          }
        } else if (srcXi >= 0 && srcXi < sw && srcYi >= 0 && srcYi < sh) {
          // Simple nearest neighbor for edge cases
          const srcIdx = (srcYi * sw + srcXi) * 4;
          const dstIdx = (py * sw + px) * 4;
          data[dstIdx] = origData[srcIdx];
          data[dstIdx + 1] = origData[srcIdx + 1];
          data[dstIdx + 2] = origData[srcIdx + 2];
          data[dstIdx + 3] = origData[srcIdx + 3];
        }
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }, []);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // Determine context menu type based on active tool
    let menuType: 'brush' | 'text' | 'filter' | 'canvas' | null = null;

    if (activeTool === 'brush' || activeTool === 'eraser') {
      menuType = 'brush';
    } else if (activeTool === 'text') {
      menuType = 'text';
    } else if (['blur', 'sharpen', 'smudge', 'dodge', 'burn', 'sponge', 'warp'].includes(activeTool)) {
      menuType = 'filter';
    } else {
      menuType = 'canvas';
    }

    setContextMenu({
      type: menuType,
      x: e.clientX,
      y: e.clientY,
    });
  }, [activeTool]);

  // Pointer event handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Close context menu on any click
    if (contextMenu) {
      setContextMenu(null);
    }

    // Set stroke start point for shift constraint
    if (activeTool === 'brush' || activeTool === 'eraser') {
      setStrokeStartPoint({ x, y });
      setConstrainedAxis(null);
    }

    // Handle guide creation with Ctrl+Shift+click
    if (showRulers && e.ctrlKey && e.shiftKey) {
      if (!guideStartPoint) {
        setGuideStartPoint({ x, y });
        setIsCreatingGuide(true);
      } else {
        // Create a line guide through both points (extends to canvas edges)
        const newGuide = {
          id: `guide-${Date.now()}`,
          type: 'line' as const,
          start: { ...guideStartPoint },
          end: { x, y },
        };
        setGuides(prev => [...prev, newGuide]);
        setGuideStartPoint(null);
        setIsCreatingGuide(false);
      }
      return;
    }

    // Handle hand tool, space+click, or Alt+drag panning
    if (activeTool === 'hand' || e.buttons === 4 || (e.altKey && !e.ctrlKey && !e.shiftKey)) {
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
        // If there's a selection, fill only within the selection
        if (selection) {
          ctx.save();
          ctx.beginPath();

          if (selection.type === 'rect' && selection.bounds) {
            ctx.rect(selection.bounds.x, selection.bounds.y, selection.bounds.width, selection.bounds.height);
          } else if (selection.type === 'ellipse' && selection.bounds) {
            const { x: ex, y: ey, width: ew, height: eh } = selection.bounds;
            ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2);
          } else if (selection.type === 'lasso' && selection.path && selection.path.length > 2) {
            ctx.moveTo(selection.path[0].x, selection.path[0].y);
            for (let i = 1; i < selection.path.length; i++) {
              ctx.lineTo(selection.path[i].x, selection.path[i].y);
            }
            ctx.closePath();
          } else if (selection.type === 'magic' && selection.maskData) {
            // For magic wand, use the mask as clipping
            // Fill with mask data
            ctx.fillStyle = primaryColor;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = CANVAS_SIZE;
            tempCanvas.height = CANVAS_SIZE;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCtx.putImageData(selection.maskData, 0, 0);
              // Use the mask as composite
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
              ctx.globalCompositeOperation = 'destination-in';
              ctx.drawImage(tempCanvas, 0, 0);
              ctx.globalCompositeOperation = 'source-over';
            }
            ctx.restore();
            compositeCanvas();
            pushHistory('Fill selection');
            return;
          }

          ctx.clip();
          ctx.fillStyle = primaryColor;
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.restore();
          compositeCanvas();
          pushHistory('Fill selection');
        } else {
          // No selection - use flood fill
          floodFill(ctx, Math.floor(x), Math.floor(y), primaryColor);
          compositeCanvas();
          pushHistory('Fill');
        }
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

    // Handle blur/sharpen/smudge/dodge/burn/sponge tools
    if (activeTool === 'blur' || activeTool === 'sharpen' || activeTool === 'smudge' ||
        activeTool === 'dodge' || activeTool === 'burn' || activeTool === 'sponge') {
      if (!activeLayerId) return;

      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) return;

      setIsDrawing(true);
      setLastPoint({ x, y });

      // Reset smudge color on new stroke
      if (activeTool === 'smudge') {
        smudgeColorRef.current = null;
      }

      // Get layer canvas and apply initial effect
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        const radius = currentBrush.size / 2;
        const strength = currentBrush.opacity / 100;

        if (activeTool === 'blur') {
          applyBlurAtPoint(ctx, x, y, radius, strength);
        } else if (activeTool === 'sharpen') {
          applySharpenAtPoint(ctx, x, y, radius, strength);
        } else if (activeTool === 'smudge') {
          // Get initial color for smudge
          const px = Math.floor(x);
          const py = Math.floor(y);
          if (px >= 0 && px < CANVAS_SIZE && py >= 0 && py < CANVAS_SIZE) {
            const pixel = ctx.getImageData(px, py, 1, 1).data;
            smudgeColorRef.current = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
          }
        } else if (activeTool === 'dodge') {
          applyDodgeAtPoint(ctx, x, y, radius, strength);
        } else if (activeTool === 'burn') {
          applyBurnAtPoint(ctx, x, y, radius, strength);
        } else if (activeTool === 'sponge') {
          // Default to desaturate, shift key for saturate
          applySpongeAtPoint(ctx, x, y, radius, strength, e.shiftKey);
        }
        compositeCanvas();
      }

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    // Handle clone stamp tool
    if (activeTool === 'clone') {
      if (!activeLayerId) return;

      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) return;

      // Alt+click to set clone source
      if (e.altKey) {
        setCloneSource({ x, y });
        setCloneOffset(null);
        cloneSourceLayerRef.current = activeLayerId;
        return;
      }

      // Normal click to clone from source
      if (!cloneSource) {
        console.warn('Clone source not set. Alt+click to set source point.');
        return;
      }

      // Calculate offset on first click if not set
      if (!cloneOffset) {
        setCloneOffset({
          x: cloneSource.x - x,
          y: cloneSource.y - y,
        });
      }

      setIsDrawing(true);
      setLastPoint({ x, y });

      // Apply initial clone
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      const sourceCanvas = cloneSourceLayerRef.current
        ? layerCanvasesRef.current.get(cloneSourceLayerRef.current)
        : layerCanvas;

      if (ctx && sourceCanvas) {
        const offset = cloneOffset || { x: cloneSource.x - x, y: cloneSource.y - y };
        const sourceX = x + offset.x;
        const sourceY = y + offset.y;
        const radius = currentBrush.size / 2;
        const opacity = currentBrush.opacity / 100;

        applyCloneAtPoint(ctx, sourceCanvas, x, y, sourceX, sourceY, radius, opacity);
        compositeCanvas();
      }

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    // Handle selection tools
    if (activeTool === 'selection-rect' || activeTool === 'selection-lasso' || activeTool === 'selection-magic') {
      // Clear selection if clicking without shift
      if (!e.shiftKey) {
        setSelection(null);
      }

      if (activeTool === 'selection-magic') {
        // Magic wand - select similar colors
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const maskData = magicWandSelect(ctx, Math.floor(x), Math.floor(y), 32);
            if (maskData) {
              setSelection({
                type: 'magic',
                maskData,
                bounds: getMaskBounds(maskData),
              });
            }
          }
        }
      } else if (activeTool === 'selection-lasso') {
        // Start lasso selection
        setIsSelecting(true);
        setLassoPoints([{ x, y }]);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // Start rect/ellipse selection
        setIsSelecting(true);
        setSelectionStart({ x, y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }

    // Handle warp tool
    if (activeTool === 'warp') {
      if (!activeLayerId) return;

      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || activeLayer.locked) return;

      // Create backup of layer for reconstruct mode
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        warpImageBackupRef.current = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }

      setIsWarping(true);
      setLastPoint({ x, y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }

    // Handle perspective tool (place vanishing point)
    if (activeTool === 'perspective') {
      // Add a new perspective vanishing point
      const newGuide = {
        id: `perspective-${Date.now()}`,
        vanishingPoint: { x, y },
        lines: 8,
        angle: 0,
        spread: 360,
      };
      setPerspectiveGuides(prev => [...prev, newGuide]);
      compositeCanvas();
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
    currentBrush.size,
    currentBrush.opacity,
    applyBlurAtPoint,
    applySharpenAtPoint,
    applyDodgeAtPoint,
    applyBurnAtPoint,
    applySpongeAtPoint,
    cloneSource,
    cloneOffset,
    applyCloneAtPoint,
    contextMenu,
    showRulers,
    guideStartPoint,
    warpMode,
  ]);

  // Magic wand selection algorithm
  const magicWandSelect = useCallback((
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    tolerance: number
  ): ImageData | null => {
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const data = imageData.data;
    const width = CANVAS_SIZE;
    const height = CANVAS_SIZE;

    // Create mask
    const maskData = ctx.createImageData(width, height);
    const mask = maskData.data;

    // Get starting color
    const startPos = (startY * width + startX) * 4;
    if (startPos < 0 || startPos >= data.length - 3) return null;

    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [px, py] = stack.pop()!;
      const key = `${px},${py}`;

      if (visited.has(key)) continue;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const pos = (py * width + px) * 4;
      const r = data[pos];
      const g = data[pos + 1];
      const b = data[pos + 2];
      const a = data[pos + 3];

      // Check if color matches within tolerance
      const diff = Math.sqrt(
        Math.pow(r - startR, 2) +
        Math.pow(g - startG, 2) +
        Math.pow(b - startB, 2) +
        Math.pow(a - startA, 2)
      );

      if (diff <= tolerance * 2) {
        // Mark as selected (white in mask)
        mask[pos] = 255;
        mask[pos + 1] = 255;
        mask[pos + 2] = 255;
        mask[pos + 3] = 255;

        visited.add(key);

        stack.push([px + 1, py]);
        stack.push([px - 1, py]);
        stack.push([px, py + 1]);
        stack.push([px, py - 1]);
      }
    }

    return maskData;
  }, []);

  // Get bounds from mask data
  const getMaskBounds = useCallback((maskData: ImageData): { x: number; y: number; width: number; height: number } => {
    const mask = maskData.data;
    const width = maskData.width;
    const height = maskData.height;

    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = (y * width + x) * 4;
        if (mask[pos + 3] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    let { x, y } = screenToCanvas(e.clientX, e.clientY);

    // Track mouse position for rulers
    setMouseCanvasPos({ x, y });

    // Apply shift constraint for straight lines when drawing
    if (shiftHeld && isDrawing && strokeStartPoint) {
      const dx = Math.abs(x - strokeStartPoint.x);
      const dy = Math.abs(y - strokeStartPoint.y);

      // Determine axis on first significant movement
      if (!constrainedAxis && (dx > 5 || dy > 5)) {
        setConstrainedAxis(dx > dy ? 'x' : 'y');
      }

      // Apply constraint
      if (constrainedAxis === 'x') {
        y = strokeStartPoint.y;
      } else if (constrainedAxis === 'y') {
        x = strokeStartPoint.x;
      }
    }

    // Update brush preview position
    if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'blur' || activeTool === 'sharpen' ||
        activeTool === 'smudge' || activeTool === 'dodge' || activeTool === 'burn' || activeTool === 'sponge' ||
        activeTool === 'clone' || activeTool === 'warp') {
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
        // Handle blur/sharpen/smudge/dodge/burn/sponge tools
        if (activeTool === 'blur' || activeTool === 'sharpen' || activeTool === 'smudge' ||
            activeTool === 'dodge' || activeTool === 'burn' || activeTool === 'sponge') {
          const radius = currentBrush.size / 2;
          const strength = (currentBrush.opacity / 100) * (e.pressure || 0.5);

          // Interpolate along the stroke
          const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
          const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));

          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lastPoint.x + (x - lastPoint.x) * t;
            const py = lastPoint.y + (y - lastPoint.y) * t;

            if (activeTool === 'blur') {
              applyBlurAtPoint(ctx, px, py, radius, strength);
            } else if (activeTool === 'sharpen') {
              applySharpenAtPoint(ctx, px, py, radius, strength);
            } else if (activeTool === 'smudge') {
              applySmudgeAtPoint(ctx, lastPoint.x, lastPoint.y, px, py, radius, strength, smudgeColorRef);
            } else if (activeTool === 'dodge') {
              applyDodgeAtPoint(ctx, px, py, radius, strength);
            } else if (activeTool === 'burn') {
              applyBurnAtPoint(ctx, px, py, radius, strength);
            } else if (activeTool === 'sponge') {
              applySpongeAtPoint(ctx, px, py, radius, strength, e.shiftKey);
            }
          }
          compositeCanvas();
        } else if (activeTool === 'clone' && cloneSource && cloneOffset) {
          // Handle clone stamp tool
          const radius = currentBrush.size / 2;
          const opacity = (currentBrush.opacity / 100) * (e.pressure || 0.5);
          const sourceCanvas = cloneSourceLayerRef.current
            ? layerCanvasesRef.current.get(cloneSourceLayerRef.current)
            : layerCanvas;

          if (sourceCanvas) {
            // Interpolate along the stroke
            const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
            const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));

            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const px = lastPoint.x + (x - lastPoint.x) * t;
              const py = lastPoint.y + (y - lastPoint.y) * t;
              const sourceX = px + cloneOffset.x;
              const sourceY = py + cloneOffset.y;

              applyCloneAtPoint(ctx, sourceCanvas, px, py, sourceX, sourceY, radius, opacity);
            }
            compositeCanvas();
          }
        } else {
          // Normal brush/eraser
          updatePointerState(e.pressure || 0.5, e.tiltX || 0, e.tiltY || 0);
          drawStroke(ctx, lastPoint.x, lastPoint.y, x, y, e.pressure || 0.5);
          compositeCanvas();
        }
      }
      setLastPoint({ x, y });
    }

    // Update gradient end point while dragging
    if (isDrawingGradient && gradientStart) {
      setGradientEnd({ x, y });
    }

    // Update selection while dragging
    if (isSelecting) {
      if (activeTool === 'selection-lasso') {
        // Add point to lasso path
        setLassoPoints(prev => [...prev, { x, y }]);
      } else if (activeTool === 'selection-rect' && selectionStart) {
        // Update rect selection bounds
        const bounds = {
          x: Math.min(selectionStart.x, x),
          y: Math.min(selectionStart.y, y),
          width: Math.abs(x - selectionStart.x),
          height: Math.abs(y - selectionStart.y),
        };
        setSelection({
          type: 'rect',
          bounds,
        });
      }
    }

    // Handle warp tool
    if (isWarping && lastPoint && activeLayerId) {
      const layerCanvas = getLayerCanvas(activeLayerId);
      const ctx = layerCanvas.getContext('2d');
      if (ctx) {
        const deltaX = (x - lastPoint.x) * 0.5;
        const deltaY = (y - lastPoint.y) * 0.5;
        const radius = currentBrush.size;
        const strength = (currentBrush.opacity / 100) * (e.pressure || 0.5);

        applyWarpAtPoint(ctx, x, y, deltaX, deltaY, radius, strength, warpMode);
        compositeCanvas();
      }
      setLastPoint({ x, y });
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
    currentBrush.size,
    currentBrush.opacity,
    applyBlurAtPoint,
    applySharpenAtPoint,
    applySmudgeAtPoint,
    applyDodgeAtPoint,
    applyBurnAtPoint,
    applySpongeAtPoint,
    cloneSource,
    cloneOffset,
    applyCloneAtPoint,
    isSelecting,
    selectionStart,
    shiftHeld,
    strokeStartPoint,
    constrainedAxis,
    isWarping,
    warpMode,
    applyWarpAtPoint,
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

      // Reset stroke start point and constraint
      setStrokeStartPoint(null);
      setConstrainedAxis(null);

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

    // Finish selection
    if (isSelecting) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);

      if (activeTool === 'selection-lasso' && lassoPoints.length > 2) {
        // Complete lasso selection - close the path
        setSelection({
          type: 'lasso',
          path: [...lassoPoints, lassoPoints[0]], // Close the path
          bounds: getLassoBounds(lassoPoints),
        });
      } else if (activeTool === 'selection-rect' && selectionStart) {
        // Finalize rect selection
        const bounds = {
          x: Math.min(selectionStart.x, x),
          y: Math.min(selectionStart.y, y),
          width: Math.abs(x - selectionStart.x),
          height: Math.abs(y - selectionStart.y),
        };
        // Only create selection if it has non-zero area
        if (bounds.width > 1 && bounds.height > 1) {
          setSelection({
            type: 'rect',
            bounds,
          });
        }
      }

      setIsSelecting(false);
      setSelectionStart(null);
      setLassoPoints([]);
    }

    // Finish warp
    if (isWarping) {
      setIsWarping(false);
      warpImageBackupRef.current = null;
      pushHistory('Warp');

      // Save layer canvas data
      if (activeLayerId) {
        const layerCanvas = layerCanvasesRef.current.get(activeLayerId);
        if (layerCanvas) {
          const imageData = layerCanvas.toDataURL();
          updateLayer(activeLayerId, { imageData });
        }
      }
    }

    setIsPanning(false);
    setLastPoint(null);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [isDrawing, pushHistory, activeLayerId, updateLayer, transformState, isDrawingGradient, gradientStart, gradientEnd, primaryColor, secondaryColor, getLayerCanvas, compositeCanvas, isSelecting, activeTool, lassoPoints, selectionStart, screenToCanvas, isWarping]);

  // Get bounds from lasso points
  const getLassoBounds = useCallback((points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } => {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    let minX = points[0].x, minY = points[0].y;
    let maxX = points[0].x, maxY = points[0].y;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, []);

  // Handle wheel zoom and pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Alt + scroll = zoom
    if (e.altKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.max(0.1, Math.min(10, zoom * delta)));
    }
    // Ctrl/Cmd + scroll = zoom (original behavior)
    else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(Math.max(0.1, Math.min(10, zoom * delta)));
    }
    // Shift + scroll = horizontal pan
    else if (e.shiftKey) {
      e.preventDefault();
      setPanLocal((prev) => ({
        x: prev.x - e.deltaY, // Use deltaY for horizontal scroll when shift is held
        y: prev.y,
      }));
    }
    // Regular scroll = pan
    else {
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

  // Clear all guides
  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

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
      onContextMenu={handleContextMenu}
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
      {brushPreview && (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'blur' || activeTool === 'sharpen' ||
                        activeTool === 'smudge' || activeTool === 'dodge' || activeTool === 'burn' || activeTool === 'sponge' ||
                        activeTool === 'clone') && (
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

      {/* Clone source indicator */}
      {activeTool === 'clone' && cloneSource && (
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: `calc(50% + ${(cloneSource.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`,
            top: `calc(50% + ${(cloneSource.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Crosshair for clone source */}
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-cyan-400">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}

      {/* Selection overlay */}
      {(selection || (isSelecting && (selectionStart || lassoPoints.length > 0))) && (
        <svg
          className="absolute inset-0 pointer-events-none z-40"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="marching-ants" patternUnits="userSpaceOnUse" width="16" height="16">
              <rect width="16" height="16" fill="none" />
              <path d="M0 0 L8 0 L8 8 L0 8 Z M8 8 L16 8 L16 16 L8 16 Z" fill="white" />
            </pattern>
            <mask id="selection-mask">
              <rect width="100%" height="100%" fill="black" fillOpacity="0.3" />
              {/* Cut out the selection area */}
              {selection?.type === 'rect' && selection.bounds && (
                <rect
                  x={`calc(50% + ${(selection.bounds.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                  y={`calc(50% + ${(selection.bounds.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                  width={selection.bounds.width * zoom}
                  height={selection.bounds.height * zoom}
                  fill="white"
                />
              )}
              {selection?.type === 'lasso' && selection.path && (
                <polygon
                  points={selection.path.map(p =>
                    `calc(50% + ${(p.x - CANVAS_SIZE / 2) * zoom + pan.x}px),calc(50% + ${(p.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`
                  ).join(' ')}
                  fill="white"
                />
              )}
            </mask>
          </defs>

          {/* Darkened area outside selection */}
          {selection && !isSelecting && (
            <rect width="100%" height="100%" fill="black" fillOpacity="0.3" mask="url(#selection-mask)" />
          )}

          {/* Selection border - rect */}
          {((selection?.type === 'rect' && selection.bounds) || (isSelecting && selectionStart && activeTool === 'selection-rect')) && (
            <>
              {/* Get current selection bounds */}
              {(() => {
                const bounds = selection?.bounds || (selectionStart && {
                  x: Math.min(selectionStart.x, selectionStart.x),
                  y: Math.min(selectionStart.y, selectionStart.y),
                  width: 0,
                  height: 0,
                });
                if (!bounds) return null;
                const screenX = `calc(50% + ${(bounds.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`;
                const screenY = `calc(50% + ${(bounds.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`;
                return (
                  <rect
                    x={screenX}
                    y={screenY}
                    width={bounds.width * zoom}
                    height={bounds.height * zoom}
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="animate-[dash_0.5s_linear_infinite]"
                  />
                );
              })()}
            </>
          )}

          {/* Selection border - lasso */}
          {(selection?.type === 'lasso' && selection.path) || (isSelecting && lassoPoints.length > 1 && activeTool === 'selection-lasso') ? (
            <polyline
              points={(selection?.path || lassoPoints).map(p =>
                `${window.innerWidth / 2 + (p.x - CANVAS_SIZE / 2) * zoom + pan.x},${window.innerHeight / 2 + (p.y - CANVAS_SIZE / 2) * zoom + pan.y}`
              ).join(' ')}
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="animate-[dash_0.5s_linear_infinite]"
            />
          ) : null}

          {/* Selection border - magic wand (show bounds) */}
          {selection?.type === 'magic' && selection.bounds && (
            <rect
              x={`calc(50% + ${(selection.bounds.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
              y={`calc(50% + ${(selection.bounds.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
              width={selection.bounds.width * zoom}
              height={selection.bounds.height * zoom}
              fill="none"
              stroke="cyan"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="animate-[dash_0.5s_linear_infinite]"
            />
          )}
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

      {/* Rulers (shown when Ctrl is held) */}
      {showRulers && containerRef.current && (
        <>
          {/* Top ruler */}
          <div className="absolute top-0 left-[30px] right-0 h-[30px] bg-[#2d2d2f] border-b border-[#3a3a3c] z-50 flex items-end overflow-hidden">
            {(() => {
              const containerWidth = containerRef.current?.offsetWidth || 800;
              const canvasStartX = containerWidth / 2 + pan.x - (CANVAS_SIZE * zoom) / 2;
              const markers = [];

              // Generate ruler markers from 0 to CANVAS_SIZE
              for (let pos = 0; pos <= CANVAS_SIZE; pos += 50) {
                const screenX = canvasStartX + pos * zoom;
                if (screenX >= -50 && screenX <= containerWidth + 50) {
                  markers.push(
                    <div
                      key={`h-${pos}`}
                      className="absolute bottom-0 flex flex-col items-center"
                      style={{ left: screenX }}
                    >
                      <span className="text-[8px] text-white/50 mb-0.5">{pos}</span>
                      <div className="w-px h-2 bg-white/30" />
                    </div>
                  );
                  // Add minor ticks
                  for (let minor = 10; minor < 50; minor += 10) {
                    const minorX = screenX + minor * zoom;
                    if (minorX >= 0 && minorX <= containerWidth) {
                      markers.push(
                        <div
                          key={`h-${pos}-${minor}`}
                          className="absolute bottom-0 w-px h-1 bg-white/20"
                          style={{ left: minorX }}
                        />
                      );
                    }
                  }
                }
              }
              return markers;
            })()}
            {/* Cursor position indicator */}
            {mouseCanvasPos && (
              <div
                className="absolute bottom-0 w-px h-full bg-cyan-400/50"
                style={{ left: (containerRef.current?.offsetWidth || 800) / 2 + pan.x - (CANVAS_SIZE * zoom) / 2 + mouseCanvasPos.x * zoom }}
              />
            )}
          </div>

          {/* Left ruler */}
          <div className="absolute top-[30px] left-0 bottom-0 w-[30px] bg-[#2d2d2f] border-r border-[#3a3a3c] z-50 flex flex-col items-end overflow-hidden">
            {(() => {
              const containerHeight = containerRef.current?.offsetHeight || 600;
              const canvasStartY = containerHeight / 2 + pan.y - (CANVAS_SIZE * zoom) / 2;
              const markers = [];

              // Generate ruler markers from 0 to CANVAS_SIZE
              for (let pos = 0; pos <= CANVAS_SIZE; pos += 50) {
                const screenY = canvasStartY + pos * zoom;
                if (screenY >= -50 && screenY <= containerHeight + 50) {
                  markers.push(
                    <div
                      key={`v-${pos}`}
                      className="absolute right-0 flex items-center"
                      style={{ top: screenY }}
                    >
                      <span className="text-[8px] text-white/50 mr-0.5 transform -rotate-90 origin-center whitespace-nowrap">{pos}</span>
                      <div className="h-px w-2 bg-white/30" />
                    </div>
                  );
                  // Add minor ticks
                  for (let minor = 10; minor < 50; minor += 10) {
                    const minorY = screenY + minor * zoom;
                    if (minorY >= 0 && minorY <= containerHeight) {
                      markers.push(
                        <div
                          key={`v-${pos}-${minor}`}
                          className="absolute right-0 h-px w-1 bg-white/20"
                          style={{ top: minorY }}
                        />
                      );
                    }
                  }
                }
              }
              return markers;
            })()}
            {/* Cursor position indicator */}
            {mouseCanvasPos && (
              <div
                className="absolute right-0 h-px w-full bg-cyan-400/50"
                style={{ top: (containerRef.current?.offsetHeight || 600) / 2 + pan.y - (CANVAS_SIZE * zoom) / 2 + mouseCanvasPos.y * zoom }}
              />
            )}
          </div>

          {/* Crosshair at cursor */}
          {mouseCanvasPos && (
            <>
              <div
                className="absolute pointer-events-none z-40 bg-cyan-400/30"
                style={{
                  left: 0,
                  right: 0,
                  top: `calc(50% + ${(mouseCanvasPos.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`,
                  height: 1,
                }}
              />
              <div
                className="absolute pointer-events-none z-40 bg-cyan-400/30"
                style={{
                  top: 0,
                  bottom: 0,
                  left: `calc(50% + ${(mouseCanvasPos.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`,
                  width: 1,
                }}
              />
            </>
          )}

          {/* Guide creation indicator */}
          {guideStartPoint && (
            <div
              className="absolute w-3 h-3 rounded-full bg-cyan-400 border-2 border-white pointer-events-none z-50"
              style={{
                left: `calc(50% + ${(guideStartPoint.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`,
                top: `calc(50% + ${(guideStartPoint.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          {/* Info tooltip */}
          <div className="absolute top-[40px] left-[40px] bg-black/80 px-2 py-1 rounded text-xs text-white/80 z-50">
            {mouseCanvasPos ? `X: ${Math.round(mouseCanvasPos.x)}, Y: ${Math.round(mouseCanvasPos.y)}` : ''}
            {guideStartPoint && ' | Ctrl+Shift+Click to place guide'}
          </div>

          {/* Clear guides button */}
          {guides.length > 0 && (
            <button
              onClick={clearGuides}
              className="absolute top-[40px] right-[20px] bg-red-500/80 hover:bg-red-500 px-2 py-1 rounded text-xs text-white z-50"
            >
              Clear Guides ({guides.length})
            </button>
          )}
        </>
      )}

      {/* Clear perspective guides button */}
      {perspectiveGuides.length > 0 && (
        <button
          onClick={() => setPerspectiveGuides([])}
          className="absolute top-[40px] right-[160px] bg-purple-500/80 hover:bg-purple-500 px-2 py-1 rounded text-xs text-white z-50"
        >
          Clear Perspective ({perspectiveGuides.length})
        </button>
      )}

      {/* Guides overlay */}
      {guides.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none z-30" width="100%" height="100%">
          {guides.map((guide) => {
            if (guide.type === 'horizontal' && guide.position !== undefined) {
              return (
                <line
                  key={guide.id}
                  x1="0"
                  y1={`calc(50% + ${(guide.position - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                  x2="100%"
                  y2={`calc(50% + ${(guide.position - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                  stroke="cyan"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
              );
            } else if (guide.type === 'vertical' && guide.position !== undefined) {
              return (
                <line
                  key={guide.id}
                  x1={`calc(50% + ${(guide.position - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                  y1="0"
                  x2={`calc(50% + ${(guide.position - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                  y2="100%"
                  stroke="cyan"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
              );
            } else if (guide.type === 'line' && guide.start && guide.end) {
              // Extend the line beyond the two points to the canvas edges
              const dx = guide.end.x - guide.start.x;
              const dy = guide.end.y - guide.start.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len === 0) return null;

              // Extend line to reach far beyond canvas
              const extendFactor = 3000 / len;
              const extStart = {
                x: guide.start.x - dx * extendFactor,
                y: guide.start.y - dy * extendFactor,
              };
              const extEnd = {
                x: guide.end.x + dx * extendFactor,
                y: guide.end.y + dy * extendFactor,
              };

              return (
                <g key={guide.id}>
                  <line
                    x1={`calc(50% + ${(extStart.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                    y1={`calc(50% + ${(extStart.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                    x2={`calc(50% + ${(extEnd.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                    y2={`calc(50% + ${(extEnd.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                    stroke="cyan"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  {/* Markers for the two defining points */}
                  <circle
                    cx={`calc(50% + ${(guide.start.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                    cy={`calc(50% + ${(guide.start.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                    r="4"
                    fill="cyan"
                    opacity="0.8"
                  />
                  <circle
                    cx={`calc(50% + ${(guide.end.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`}
                    cy={`calc(50% + ${(guide.end.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`}
                    r="4"
                    fill="cyan"
                    opacity="0.8"
                  />
                </g>
              );
            }
            return null;
          })}
        </svg>
      )}

      {/* Perspective guides overlay */}
      {perspectiveGuides.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none z-30" width="100%" height="100%">
          {perspectiveGuides.map((pg) => {
            const centerX = `calc(50% + ${(pg.vanishingPoint.x - CANVAS_SIZE / 2) * zoom + pan.x}px)`;
            const centerY = `calc(50% + ${(pg.vanishingPoint.y - CANVAS_SIZE / 2) * zoom + pan.y}px)`;
            const lines = [];
            const lineLength = 3000; // Long enough to go beyond canvas

            for (let i = 0; i < pg.lines; i++) {
              const angle = (pg.spread / pg.lines) * i + pg.angle - pg.spread / 2;
              const radAngle = (angle * Math.PI) / 180;
              const endX = pg.vanishingPoint.x + Math.cos(radAngle) * lineLength;
              const endY = pg.vanishingPoint.y + Math.sin(radAngle) * lineLength;
              const endXCalc = `calc(50% + ${(endX - CANVAS_SIZE / 2) * zoom + pan.x}px)`;
              const endYCalc = `calc(50% + ${(endY - CANVAS_SIZE / 2) * zoom + pan.y}px)`;

              lines.push(
                <line
                  key={`${pg.id}-line-${i}`}
                  x1={centerX}
                  y1={centerY}
                  x2={endXCalc}
                  y2={endYCalc}
                  stroke="magenta"
                  strokeWidth="1"
                  strokeDasharray="6 3"
                  opacity="0.6"
                />
              );
            }

            return (
              <g key={pg.id}>
                {lines}
                {/* Vanishing point marker */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="6"
                  fill="magenta"
                  opacity="0.8"
                />
                <circle
                  cx={centerX}
                  cy={centerY}
                  r="2"
                  fill="white"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Context menus */}
      {contextMenu?.type === 'brush' && (
        <BrushContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          brushSize={currentBrush.size}
          brushOpacity={currentBrush.opacity}
          brushHardness={currentBrush.hardness}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onBrushSizeChange={(size) => useStudioEditor.getState().setCurrentBrush({ ...currentBrush, size })}
          onBrushOpacityChange={(opacity) => useStudioEditor.getState().setCurrentBrush({ ...currentBrush, opacity })}
          onBrushHardnessChange={(hardness) => useStudioEditor.getState().setCurrentBrush({ ...currentBrush, hardness })}
          onPrimaryColorChange={(color) => useStudioEditor.getState().setPrimaryColor(color)}
          onSecondaryColorChange={(color) => useStudioEditor.getState().setSecondaryColor(color)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {contextMenu?.type === 'filter' && (
        <FilterContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          strength={currentBrush.opacity}
          brushSize={currentBrush.size}
          onStrengthChange={(opacity) => useStudioEditor.getState().setCurrentBrush({ ...currentBrush, opacity })}
          onBrushSizeChange={(size) => useStudioEditor.getState().setCurrentBrush({ ...currentBrush, size })}
          onClose={() => setContextMenu(null)}
          toolName={activeTool}
        />
      )}

      {contextMenu?.type === 'canvas' && (
        <ContextMenu
          items={[
            { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', onClick: () => {
              setSelection({ type: 'rect', bounds: { x: 0, y: 0, width: CANVAS_SIZE, height: CANVAS_SIZE } });
            }},
            { id: 'deselect', label: 'Deselect', shortcut: 'Ctrl+D', onClick: () => setSelection(null) },
            { id: 'sep1', label: '', separator: true },
            { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
            { id: 'sep2', label: '', separator: true },
            { id: 'fill', label: 'Fill with Primary Color', onClick: () => {
              if (activeLayerId) {
                const layerCanvas = layerCanvasesRef.current.get(activeLayerId);
                if (layerCanvas) {
                  const ctx = layerCanvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = primaryColor;
                    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    compositeCanvas();
                    updateLayer(activeLayerId, { imageData: layerCanvas.toDataURL() });
                    pushHistory('Fill');
                  }
                }
              }
            }},
            { id: 'clear', label: 'Clear Layer', onClick: () => {
              if (activeLayerId) {
                const layerCanvas = layerCanvasesRef.current.get(activeLayerId);
                if (layerCanvas) {
                  const ctx = layerCanvas.getContext('2d');
                  if (ctx) {
                    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    compositeCanvas();
                    updateLayer(activeLayerId, { imageData: layerCanvas.toDataURL() });
                    pushHistory('Clear');
                  }
                }
              }
            }},
            { id: 'sep3', label: '', separator: true },
            { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => setZoom(zoom * 1.25) },
            { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => setZoom(zoom * 0.8) },
            { id: 'zoom-fit', label: 'Fit to Screen', onClick: () => { setZoom(0.5); setPanLocal({ x: 0, y: 0 }); } },
            { id: 'zoom-100', label: 'Actual Size (100%)', onClick: () => setZoom(1) },
          ]}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
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
    case 'selection-rect':
    case 'selection-lasso':
    case 'selection-magic':
      return 'crosshair';
    case 'brush':
    case 'eraser':
    case 'blur':
    case 'sharpen':
    case 'smudge':
    case 'dodge':
    case 'burn':
    case 'sponge':
    case 'clone':
      return 'none';
    default:
      return 'crosshair';
  }
}
