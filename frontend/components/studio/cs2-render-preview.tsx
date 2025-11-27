'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  RotateCcw,
  Sun,
  Moon,
  Sparkles,
  Eye,
  Download,
  RefreshCw,
  Image,
  Layers,
  Settings,
  Camera,
  Maximize2,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// CS2 Environment presets
const CS2_ENVIRONMENTS = [
  { id: 'dust2', name: 'Dust II', lightColor: '#ffe4b5', ambientColor: '#4a3728', intensity: 1.2 },
  { id: 'mirage', name: 'Mirage', lightColor: '#fff5e6', ambientColor: '#3d3535', intensity: 1.0 },
  { id: 'inferno', name: 'Inferno', lightColor: '#ffdfba', ambientColor: '#4a3a30', intensity: 1.1 },
  { id: 'nuke', name: 'Nuke', lightColor: '#e6f0ff', ambientColor: '#2a3040', intensity: 0.9 },
  { id: 'overpass', name: 'Overpass', lightColor: '#f5f5dc', ambientColor: '#354030', intensity: 1.0 },
  { id: 'ancient', name: 'Ancient', lightColor: '#f0e6d3', ambientColor: '#3a3530', intensity: 1.1 },
  { id: 'anubis', name: 'Anubis', lightColor: '#ffd9a0', ambientColor: '#3d2e20', intensity: 1.3 },
  { id: 'vertigo', name: 'Vertigo', lightColor: '#e0e8ff', ambientColor: '#252535', intensity: 0.85 },
  { id: 'studio', name: 'Studio Light', lightColor: '#ffffff', ambientColor: '#1a1a20', intensity: 1.0 },
  { id: 'night', name: 'Night Mode', lightColor: '#aaccff', ambientColor: '#0a0a15', intensity: 0.6 },
  { id: 'golden', name: 'Golden Hour', lightColor: '#ffb347', ambientColor: '#2d1f10', intensity: 1.4 },
  { id: 'neon', name: 'Neon Club', lightColor: '#ff00ff', ambientColor: '#000820', intensity: 0.8 },
];

// Sticker shapes
const STICKER_SHAPES = [
  { id: 'square', name: 'Square' },
  { id: 'circle', name: 'Circle' },
  { id: 'hexagon', name: 'Hexagon' },
  { id: 'diamond', name: 'Diamond' },
  { id: 'shield', name: 'Shield' },
];

interface CS2RenderPreviewProps {
  className?: string;
}

export function CS2RenderPreview({ className }: CS2RenderPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const { layers } = useStudioEditor();

  // Environment settings
  const [environment, setEnvironment] = useState('dust2');
  const [lightAngle, setLightAngle] = useState(45);
  const [lightHeight, setLightHeight] = useState(30);
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [ambientIntensity, setAmbientIntensity] = useState(0.3);

  // View settings
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  // Sticker settings
  const [stickerShape, setStickerShape] = useState('square');
  const [showReflections, setShowReflections] = useState(true);
  const [showShadow, setShowShadow] = useState(true);
  const [wearAmount, setWearAmount] = useState(0);

  // Get layer data
  const colorLayer = layers.find(l => l.type === 'raster' || l.type === 'normal');
  const normalLayer = layers.find(l => l.type === 'normal');
  const metalnessLayer = layers.find(l => l.type === 'metalness');
  const roughnessLayer = layers.find(l => l.type === 'roughness');

  // Load image from data URL
  const loadImage = useCallback((dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = dataUrl;
    });
  }, []);

  // Render the preview
  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const size = Math.min(width, height) * 0.8 * zoom;
    const centerX = width / 2;
    const centerY = height / 2;

    // Get current environment
    const env = CS2_ENVIRONMENTS.find(e => e.id === environment) || CS2_ENVIRONMENTS[0];

    // Clear canvas with ambient background
    ctx.fillStyle = env.ambientColor;
    ctx.fillRect(0, 0, width, height);

    // Draw gradient background
    const bgGradient = ctx.createRadialGradient(
      centerX, centerY * 0.7, 0,
      centerX, centerY * 0.7, width * 0.8
    );
    bgGradient.addColorStop(0, env.ambientColor);
    bgGradient.addColorStop(0.5, adjustColor(env.ambientColor, -20));
    bgGradient.addColorStop(1, adjustColor(env.ambientColor, -40));
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Load textures
    const textures: {
      color?: HTMLImageElement;
      normal?: HTMLImageElement;
      metalness?: HTMLImageElement;
      roughness?: HTMLImageElement;
    } = {};

    if (colorLayer?.imageData) {
      textures.color = await loadImage(colorLayer.imageData);
    }
    if (normalLayer?.imageData) {
      textures.normal = await loadImage(normalLayer.imageData);
    }
    if (metalnessLayer?.imageData) {
      textures.metalness = await loadImage(metalnessLayer.imageData);
    }
    if (roughnessLayer?.imageData) {
      textures.roughness = await loadImage(roughnessLayer.imageData);
    }

    // Draw shadow
    if (showShadow) {
      ctx.save();
      ctx.translate(centerX + 10, centerY + size * 0.45);
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.45, size * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.filter = 'blur(15px)';
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
    }

    // Apply 3D rotation transform
    ctx.save();
    ctx.translate(centerX, centerY);

    // Simulate 3D perspective with scale
    const rotX = (rotation.x * Math.PI) / 180;
    const rotY = (rotation.y * Math.PI) / 180;
    const scaleX = Math.cos(rotY);
    const scaleY = Math.cos(rotX);
    ctx.scale(scaleX, scaleY);

    // Create sticker shape clip path
    ctx.beginPath();
    const halfSize = size / 2;

    switch (stickerShape) {
      case 'circle':
        ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 2;
          const x = Math.cos(angle) * halfSize;
          const y = Math.sin(angle) * halfSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(0, -halfSize);
        ctx.lineTo(halfSize, 0);
        ctx.lineTo(0, halfSize);
        ctx.lineTo(-halfSize, 0);
        ctx.closePath();
        break;
      case 'shield':
        ctx.moveTo(-halfSize * 0.8, -halfSize);
        ctx.lineTo(halfSize * 0.8, -halfSize);
        ctx.quadraticCurveTo(halfSize, -halfSize, halfSize, -halfSize * 0.8);
        ctx.lineTo(halfSize, halfSize * 0.3);
        ctx.quadraticCurveTo(halfSize * 0.5, halfSize, 0, halfSize);
        ctx.quadraticCurveTo(-halfSize * 0.5, halfSize, -halfSize, halfSize * 0.3);
        ctx.lineTo(-halfSize, -halfSize * 0.8);
        ctx.quadraticCurveTo(-halfSize, -halfSize, -halfSize * 0.8, -halfSize);
        ctx.closePath();
        break;
      default: // square
        ctx.rect(-halfSize, -halfSize, size, size);
    }
    ctx.clip();

    // Draw base color texture
    if (textures.color) {
      ctx.drawImage(textures.color, -halfSize, -halfSize, size, size);
    } else {
      ctx.fillStyle = '#808080';
      ctx.fillRect(-halfSize, -halfSize, size, size);
    }

    // Apply PBR lighting
    applyPBRLighting(
      ctx,
      textures,
      size,
      lightAngle,
      lightHeight,
      env.lightColor,
      lightIntensity * env.intensity,
      ambientIntensity,
      showReflections
    );

    // Apply wear if enabled
    if (wearAmount > 0) {
      applyWearEffect(ctx, size, wearAmount);
    }

    // Draw sticker border/edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Draw holographic effect for holo stickers
    if (colorLayer?.smartFill?.materialId?.includes('holo')) {
      drawHolographicOverlay(ctx, centerX, centerY, size, rotation.y);
    }
  }, [
    layers, colorLayer, normalLayer, metalnessLayer, roughnessLayer,
    environment, lightAngle, lightHeight, lightIntensity, ambientIntensity,
    rotation, zoom, stickerShape, showReflections, showShadow, wearAmount,
    loadImage
  ]);

  // Animation loop
  useEffect(() => {
    if (isAnimating) {
      const animate = () => {
        setRotation(prev => ({
          x: prev.x,
          y: (prev.y + animationSpeed) % 360,
        }));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animationSpeed]);

  // Re-render when settings change
  useEffect(() => {
    render();
  }, [render]);

  // Mouse handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;

    setRotation(prev => ({
      x: Math.max(-60, Math.min(60, prev.x - dy * 0.5)),
      y: prev.y + dx * 0.5,
    }));

    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Export render
  const exportRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'cs2_sticker_preview.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-[#0a0a0c]', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-[#121214]">
        <Eye className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-white">CS2 Sticker Preview</span>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => setIsAnimating(!isAnimating)}
        >
          {isAnimating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => setRotation({ x: 0, y: 0 })}
        >
          <RotateCcw className="w-3 h-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={exportRender}
        >
          <Download className="w-3 h-3" />
        </Button>
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Rotation indicator */}
        <div className="absolute bottom-2 left-2 text-[10px] text-white/40 bg-black/40 px-2 py-1 rounded">
          Rotation: {rotation.x.toFixed(0)}° / {rotation.y.toFixed(0)}°
        </div>
      </div>

      {/* Settings panel */}
      <div className="p-3 border-t border-white/10 bg-[#121214] space-y-3">
        {/* Environment */}
        <div className="space-y-1">
          <label className="text-xs text-white/60 flex items-center gap-1">
            <Sun className="w-3 h-3" />
            Environment
          </label>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CS2_ENVIRONMENTS.map((env) => (
                <SelectItem key={env.id} value={env.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: env.lightColor }}
                    />
                    {env.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Light controls */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-white/40">Light Angle</label>
            <Slider
              value={[lightAngle]}
              onValueChange={([v]) => setLightAngle(v)}
              min={0}
              max={360}
              step={1}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-white/40">Light Height</label>
            <Slider
              value={[lightHeight]}
              onValueChange={([v]) => setLightHeight(v)}
              min={0}
              max={90}
              step={1}
            />
          </div>
        </div>

        {/* Shape and effects */}
        <div className="flex gap-2">
          <Select value={stickerShape} onValueChange={setStickerShape}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 flex-1">
              <SelectValue placeholder="Shape" />
            </SelectTrigger>
            <SelectContent>
              {STICKER_SHAPES.map((shape) => (
                <SelectItem key={shape.id} value={shape.id} className="text-xs">
                  {shape.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showReflections ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setShowReflections(!showReflections)}
          >
            <Sparkles className="w-3 h-3" />
          </Button>

          <Button
            variant={showShadow ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setShowShadow(!showShadow)}
          >
            <Moon className="w-3 h-3" />
          </Button>
        </div>

        {/* Wear slider */}
        <div className="space-y-1">
          <label className="text-[10px] text-white/40">Wear Amount (Factory New → Battle-Scarred)</label>
          <Slider
            value={[wearAmount]}
            onValueChange={([v]) => setWearAmount(v)}
            min={0}
            max={1}
            step={0.01}
          />
        </div>
      </div>
    </div>
  );
}

// Helper functions

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function applyPBRLighting(
  ctx: CanvasRenderingContext2D,
  textures: { normal?: HTMLImageElement; metalness?: HTMLImageElement; roughness?: HTMLImageElement },
  size: number,
  lightAngle: number,
  lightHeight: number,
  lightColor: string,
  lightIntensity: number,
  ambientIntensity: number,
  showReflections: boolean
) {
  const halfSize = size / 2;

  // Calculate light direction
  const lightRad = (lightAngle * Math.PI) / 180;
  const lightElevation = (lightHeight * Math.PI) / 180;
  const lightDir = {
    x: Math.cos(lightRad) * Math.cos(lightElevation),
    y: Math.sin(lightRad) * Math.cos(lightElevation),
    z: Math.sin(lightElevation),
  };

  // Apply diffuse lighting gradient
  const gradient = ctx.createLinearGradient(
    -halfSize + lightDir.x * size,
    -halfSize + lightDir.y * size,
    halfSize - lightDir.x * size,
    halfSize - lightDir.y * size
  );

  gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * lightIntensity})`);
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${0.2 * lightIntensity})`);

  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = gradient;
  ctx.fillRect(-halfSize, -halfSize, size, size);

  // Add specular highlight if reflections enabled
  if (showReflections) {
    const specX = lightDir.x * halfSize * 0.5;
    const specY = lightDir.y * halfSize * 0.5;
    const specGradient = ctx.createRadialGradient(
      specX, specY, 0,
      specX, specY, size * 0.4
    );
    specGradient.addColorStop(0, `rgba(255, 255, 255, ${0.6 * lightIntensity})`);
    specGradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.2 * lightIntensity})`);
    specGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = specGradient;
    ctx.fillRect(-halfSize, -halfSize, size, size);
  }

  ctx.globalCompositeOperation = 'source-over';

  // Apply subtle edge highlight
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * lightIntensity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function applyWearEffect(
  ctx: CanvasRenderingContext2D,
  size: number,
  wearAmount: number
) {
  const halfSize = size / 2;

  // Add scratches and wear
  ctx.globalCompositeOperation = 'overlay';

  // Random scratches
  const scratchCount = Math.floor(wearAmount * 50);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;

  for (let i = 0; i < scratchCount; i++) {
    const x1 = (Math.random() - 0.5) * size;
    const y1 = (Math.random() - 0.5) * size;
    const angle = Math.random() * Math.PI * 2;
    const length = 5 + Math.random() * 20;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(
      x1 + Math.cos(angle) * length,
      y1 + Math.sin(angle) * length
    );
    ctx.stroke();
  }

  // Edge wear
  if (wearAmount > 0.3) {
    const edgeGradient = ctx.createRadialGradient(0, 0, halfSize * 0.7, 0, 0, halfSize);
    edgeGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edgeGradient.addColorStop(1, `rgba(0, 0, 0, ${wearAmount * 0.4})`);
    ctx.fillStyle = edgeGradient;
    ctx.fillRect(-halfSize, -halfSize, size, size);
  }

  ctx.globalCompositeOperation = 'source-over';
}

function drawHolographicOverlay(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const halfSize = size / 2;
  const hue = (rotation * 2) % 360;

  // Rainbow gradient based on rotation
  const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
  gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.2)`);
  gradient.addColorStop(0.5, `hsla(${(hue + 120) % 360}, 100%, 50%, 0.2)`);
  gradient.addColorStop(1, `hsla(${(hue + 240) % 360}, 100%, 50%, 0.2)`);

  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = gradient;
  ctx.fillRect(-halfSize, -halfSize, size, size);

  ctx.restore();
}
