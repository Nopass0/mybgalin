'use client';

/**
 * Pattern Canvas Component
 *
 * Renders procedural patterns with multiple texture maps for CS2 skins.
 * Generates Pattern, RGB Mask, Normal, Roughness, Pearlescence, AO, and Height maps.
 * Supports 3D depth effects, lighting, and advanced pattern types.
 *
 * @module components/studio/pattern-generator/pattern-canvas
 */

import { useRef, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  PatternSettings,
  MaskSettings,
  NormalMapSettings,
  RoughnessSettings,
  PearlescenceSettings,
  TextureMapType,
  COLOR_SCHEMES,
  PatternType,
  AOSettings,
  HeightSettings,
  DEFAULT_AO_SETTINGS,
  DEFAULT_HEIGHT_SETTINGS,
} from '@/types/pattern-generator';

interface PatternCanvasProps {
  patternSettings: PatternSettings;
  maskSettings: MaskSettings;
  normalSettings: NormalMapSettings;
  roughnessSettings: RoughnessSettings;
  pearlSettings: PearlescenceSettings;
  aoSettings?: AOSettings;
  heightSettings?: HeightSettings;
  activeTab: TextureMapType;
  resolution: number;
  onCanvasRef: (type: TextureMapType, canvas: HTMLCanvasElement | null) => void;
}

// ==================== SEEDED RANDOM ====================

const createSeededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s++;
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
};

// ==================== NOISE FUNCTIONS ====================

const noise2D = (x: number, y: number, seed: number): number => {
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const a = seededRandom(ix + iy * 57 + seed);
  const b = seededRandom(ix + 1 + iy * 57 + seed);
  const c = seededRandom(ix + (iy + 1) * 57 + seed);
  const d = seededRandom(ix + 1 + (iy + 1) * 57 + seed);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

const fbm = (
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
  seed: number
): number => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
};

// ==================== PATTERN CANVAS COMPONENT ====================

export const PatternCanvas = memo(function PatternCanvas({
  patternSettings,
  maskSettings,
  normalSettings,
  roughnessSettings,
  pearlSettings,
  aoSettings = DEFAULT_AO_SETTINGS,
  heightSettings = DEFAULT_HEIGHT_SETTINGS,
  activeTab,
  resolution,
  onCanvasRef,
}: PatternCanvasProps) {
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const normalCanvasRef = useRef<HTMLCanvasElement>(null);
  const roughnessCanvasRef = useRef<HTMLCanvasElement>(null);
  const pearlCanvasRef = useRef<HTMLCanvasElement>(null);
  const aoCanvasRef = useRef<HTMLCanvasElement>(null);
  const heightCanvasRef = useRef<HTMLCanvasElement>(null);

  // Register canvas refs
  useEffect(() => {
    onCanvasRef('pattern', patternCanvasRef.current);
    onCanvasRef('mask', maskCanvasRef.current);
    onCanvasRef('normal', normalCanvasRef.current);
    onCanvasRef('roughness', roughnessCanvasRef.current);
    onCanvasRef('pearlescence', pearlCanvasRef.current);
    onCanvasRef('ao', aoCanvasRef.current);
    onCanvasRef('height', heightCanvasRef.current);
  }, [onCanvasRef]);

  // Main generation function
  const generateAll = useCallback(() => {
    const patternCanvas = patternCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const normalCanvas = normalCanvasRef.current;
    const roughnessCanvas = roughnessCanvasRef.current;
    const pearlCanvas = pearlCanvasRef.current;
    const aoCanvas = aoCanvasRef.current;
    const heightCanvas = heightCanvasRef.current;

    if (!patternCanvas || !maskCanvas || !normalCanvas || !roughnessCanvas || !pearlCanvas || !aoCanvas || !heightCanvas) return;

    const ctx = patternCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const normalCtx = normalCanvas.getContext('2d');
    const roughCtx = roughnessCanvas.getContext('2d');
    const pearlCtx = pearlCanvas.getContext('2d');
    const aoCtx = aoCanvas.getContext('2d');
    const heightCtx = heightCanvas.getContext('2d');

    if (!ctx || !maskCtx || !normalCtx || !roughCtx || !pearlCtx || !aoCtx || !heightCtx) return;

    const width = resolution;
    const height = resolution;
    const colors = COLOR_SCHEMES.find((c) => c.id === patternSettings.colorScheme) || COLOR_SCHEMES[0];

    let currentSeed = patternSettings.seed;
    const random = createSeededRandom(currentSeed);

    // Clear all canvases
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Mask starts with base coat
    const baseR = Math.floor(maskSettings.baseCoat * 2.55);
    const baseG = Math.floor(maskSettings.baseCoat * 2.55);
    const baseB = Math.floor(maskSettings.baseCoat * 2.55);
    maskCtx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
    maskCtx.fillRect(0, 0, width, height);

    // Normal map base (flat normal = rgb(128, 128, 255))
    normalCtx.fillStyle = 'rgb(128, 128, 255)';
    normalCtx.fillRect(0, 0, width, height);

    // Roughness base
    const roughBase = Math.floor(roughnessSettings.base * 2.55);
    roughCtx.fillStyle = `rgb(${roughBase}, ${roughBase}, ${roughBase})`;
    roughCtx.fillRect(0, 0, width, height);

    // Pearl base
    pearlCtx.fillStyle = '#000000';
    pearlCtx.fillRect(0, 0, width, height);

    // AO base (white = no occlusion)
    aoCtx.fillStyle = '#ffffff';
    aoCtx.fillRect(0, 0, width, height);

    // Height base (mid-gray = 0 height)
    const heightBase = Math.floor(heightSettings.scale * 1.275);
    heightCtx.fillStyle = `rgb(${heightBase}, ${heightBase}, ${heightBase})`;
    heightCtx.fillRect(0, 0, width, height);

    // All contexts array for batch operations
    const allCtx = [ctx, maskCtx, normalCtx, roughCtx, pearlCtx, aoCtx, heightCtx];

    // Apply rotation if needed
    if (patternSettings.rotation !== 0) {
      const angle = (patternSettings.rotation * Math.PI) / 180;
      allCtx.forEach((c) => {
        c.save();
        c.translate(width / 2, height / 2);
        c.rotate(angle);
        c.translate(-width / 2, -height / 2);
      });
    }

    ctx.shadowColor = colors.primary;
    ctx.shadowBlur = patternSettings.glowIntensity;

    // Set line styles
    const cornerStyle = patternSettings.cornerStyle;
    ctx.lineCap = cornerStyle === 'round' ? 'round' : cornerStyle === 'square' ? 'square' : 'butt';
    ctx.lineJoin = cornerStyle === 'round' ? 'round' : cornerStyle === 'square' ? 'miter' : 'bevel';

    [maskCtx, normalCtx, roughCtx, pearlCtx, aoCtx, heightCtx].forEach((c) => {
      c.lineCap = ctx.lineCap;
      c.lineJoin = ctx.lineJoin;
    });

    // Set stroke pattern
    const setStroke = (context: CanvasRenderingContext2D) => {
      switch (patternSettings.strokeStyle) {
        case 'dashed':
          context.setLineDash([10, 5]);
          break;
        case 'dotted':
          context.setLineDash([2, 4]);
          break;
        case 'dashdot':
          context.setLineDash([10, 3, 2, 3]);
          break;
        default:
          context.setLineDash([]);
      }
    };

    // Helper for seamless drawing
    const wrap = (val: number, max: number) => ((val % max) + max) % max;

    const drawSeamless = (drawFunc: () => void) => {
      if (patternSettings.seamless) {
        const offsets = [
          [0, 0],
          [-width, 0],
          [width, 0],
          [0, -height],
          [0, height],
          [-width, -height],
          [width, -height],
          [-width, height],
          [width, height],
        ];
        offsets.forEach(([ox, oy]) => {
          allCtx.forEach((c) => {
            c.save();
            c.translate(ox, oy);
          });
          drawFunc();
          allCtx.forEach((c) => c.restore());
        });
      } else {
        drawFunc();
      }
    };

    // Get RGB mask color
    const getMaskColor = (intensity: number = 1) => {
      const r = Math.floor(maskSettings.redIntensity * 2.55 * intensity);
      const g = Math.floor(maskSettings.greenIntensity * 2.55 * intensity);
      const b = Math.floor(maskSettings.blueIntensity * 2.55 * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const getPearlColor = (intensity: number = 1) => {
      const v = Math.floor(pearlSettings.intensity * 2.55 * intensity);
      return `rgb(${v}, ${v}, ${v})`;
    };

    const getRoughColor = (intensity: number = 1) => {
      const base = roughnessSettings.base * 2.55;
      const variation = roughnessSettings.variation * 2.55 * intensity * (random() - 0.5) * 2;
      const v = Math.max(0, Math.min(255, Math.floor(base + variation)));
      return `rgb(${v}, ${v}, ${v})`;
    };

    const getNormalColor = (nx: number, ny: number) => {
      const strength = normalSettings.strength / 50;
      const r = Math.floor((nx * strength + 1) * 127.5);
      const g = Math.floor((ny * strength + 1) * 127.5);
      return `rgb(${r}, ${g}, 255)`;
    };

    const getAOColor = (intensity: number = 1) => {
      const v = Math.floor(255 * (1 - (aoSettings.strength / 100) * (1 - intensity)));
      return `rgb(${v}, ${v}, ${v})`;
    };

    const getHeightColor = (heightVal: number = 0.5) => {
      const scale = heightSettings.scale / 100;
      const v = Math.floor(heightVal * 255 * scale);
      return `rgb(${v}, ${v}, ${v})`;
    };

    // 3D depth calculations
    const getDepthOffset = (depth: number) => {
      const intensity = patternSettings.depthIntensity / 100;
      const perspective = patternSettings.depthPerspective / 100;
      return {
        x: Math.cos((patternSettings.shadowAngle * Math.PI) / 180) * depth * intensity * patternSettings.shadowDistance,
        y: Math.sin((patternSettings.shadowAngle * Math.PI) / 180) * depth * intensity * patternSettings.shadowDistance,
      };
    };

    const getLightDirection = () => {
      const angle = (patternSettings.lightAngle * Math.PI) / 180;
      const elevation = (patternSettings.lightElevation * Math.PI) / 180;
      return {
        x: Math.cos(angle) * Math.cos(elevation),
        y: Math.sin(angle) * Math.cos(elevation),
        z: Math.sin(elevation),
      };
    };

    // Pattern settings
    const actualDensity = patternSettings.density;
    const actualSize = patternSettings.elementSize;
    const actualSpacing = patternSettings.elementSpacing;
    const lineWidth = patternSettings.lineWidth;
    const complexity = patternSettings.complexity;
    const connectionDensity = patternSettings.connectionDensity;
    const fillAmount = patternSettings.fillAmount;

    // ==================== PATTERN FUNCTIONS ====================

    const drawCircuit = () => {
      const spacing = Math.max(15, Math.floor(150 - actualDensity * 0.8 + actualSpacing * 0.3));
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      setStroke(ctx);
      setStroke(maskCtx);

      interface Node {
        x: number;
        y: number;
        col: number;
        row: number;
        type: number;
        size: number;
      }

      const nodes: Node[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (random() > 0.2) {
            nodes.push({
              x: i * spacing + (random() - 0.5) * spacing * 0.2,
              y: j * spacing + (random() - 0.5) * spacing * 0.2,
              col: i,
              row: j,
              type: Math.floor(random() * 5),
              size: 3 + random() * actualSize * 0.15,
            });
          }
        }
      }

      // Draw connections
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = lineWidth * 0.8;
      maskCtx.strokeStyle = getMaskColor(0.6);
      maskCtx.lineWidth = lineWidth * 2;
      normalCtx.strokeStyle = getNormalColor(0.5, 0);
      normalCtx.lineWidth = lineWidth * 2;
      roughCtx.strokeStyle = getRoughColor(0.7);
      roughCtx.lineWidth = lineWidth * 2;
      pearlCtx.strokeStyle = getPearlColor(0.5);
      pearlCtx.lineWidth = lineWidth * 2;

      nodes.forEach((node) => {
        nodes.forEach((other) => {
          if (other === node) return;
          const dist = Math.hypot(other.x - node.x, other.y - node.y);
          if (dist < spacing * 1.8 && dist > spacing * 0.5 && random() > (100 - connectionDensity) / 100) {
            const drawConnection = () => {
              [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
                c.beginPath();
                c.moveTo(node.x, node.y);

                if (random() > 0.5 && complexity > 30) {
                  if (random() > 0.5) {
                    c.lineTo(other.x, node.y);
                    c.lineTo(other.x, other.y);
                  } else {
                    c.lineTo(node.x, other.y);
                    c.lineTo(other.x, other.y);
                  }
                } else {
                  c.lineTo(other.x, other.y);
                }
                c.stroke();
              });
            };
            drawSeamless(drawConnection);
          }
        });
      });

      // Draw nodes
      nodes.forEach((node) => {
        const drawNode = () => {
          ctx.fillStyle = colors.primary;
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = lineWidth;
          maskCtx.fillStyle = getMaskColor(1);
          maskCtx.strokeStyle = getMaskColor(1);
          maskCtx.lineWidth = lineWidth;
          normalCtx.fillStyle = getNormalColor(1, 0.5);
          roughCtx.fillStyle = getRoughColor(1);
          pearlCtx.fillStyle = getPearlColor(1);

          const size = node.size;

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.beginPath();
            switch (node.type) {
              case 0: // Circle
                c.arc(node.x, node.y, size, 0, Math.PI * 2);
                c.fill();
                break;
              case 1: // Square
                c.rect(node.x - size, node.y - size, size * 2, size * 2);
                c.fill();
                break;
              case 2: // Ring
                c.arc(node.x, node.y, size * 1.2, 0, Math.PI * 2);
                c.stroke();
                c.beginPath();
                c.arc(node.x, node.y, size * 0.5, 0, Math.PI * 2);
                c.fill();
                break;
              case 3: // Triangle
                c.moveTo(node.x, node.y - size);
                c.lineTo(node.x + size, node.y + size * 0.7);
                c.lineTo(node.x - size, node.y + size * 0.7);
                c.closePath();
                c.fill();
                break;
              case 4: // Diamond
                c.moveTo(node.x, node.y - size);
                c.lineTo(node.x + size, node.y);
                c.lineTo(node.x, node.y + size);
                c.lineTo(node.x - size, node.y);
                c.closePath();
                c.fill();
                break;
            }
          });
        };
        drawSeamless(drawNode);
      });
    };

    const drawHexGrid = () => {
      const hexSize = Math.max(10, Math.floor(80 - actualDensity * 0.4 + actualSize * 0.3));
      const hexWidth = hexSize * Math.sqrt(3);
      const hexHeight = hexSize * 2;
      const cols = Math.ceil(width / hexWidth) + 2;
      const rows = Math.ceil(height / (hexHeight * 0.75)) + 2;

      setStroke(ctx);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = lineWidth;
      maskCtx.strokeStyle = getMaskColor(1);
      maskCtx.lineWidth = lineWidth * 1.5;
      normalCtx.strokeStyle = getNormalColor(0.7, 0);
      normalCtx.lineWidth = lineWidth * 2;
      roughCtx.strokeStyle = getRoughColor(0.8);
      roughCtx.lineWidth = lineWidth * 2;
      pearlCtx.strokeStyle = getPearlColor(0.8);
      pearlCtx.lineWidth = lineWidth * 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * hexWidth + (row % 2 ? hexWidth / 2 : 0);
          const y = row * hexHeight * 0.75;

          const drawHex = () => {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c, idx) => {
              c.beginPath();
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const px = x + hexSize * Math.cos(angle);
                const py = y + hexSize * Math.sin(angle);
                if (i === 0) c.moveTo(px, py);
                else c.lineTo(px, py);
              }
              c.closePath();
              c.stroke();

              // Fill some hexes
              if (random() > (100 - fillAmount) / 100) {
                if (idx === 0) c.fillStyle = colors.secondary + '60';
                else if (idx === 1) c.fillStyle = getMaskColor(0.8);
                else if (idx === 2) c.fillStyle = getNormalColor(1, 0.3);
                else if (idx === 3) c.fillStyle = getRoughColor(1.2);
                else c.fillStyle = getPearlColor(1);
                c.fill();
              }
            });

            // Inner details
            if (random() > 0.5 && complexity > 30) {
              const innerSize = hexSize * (0.3 + random() * 0.3);
              [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
                c.beginPath();
                c.arc(x, y, innerSize, 0, Math.PI * 2);
                c.stroke();
              });
            }
          };
          drawSeamless(drawHex);
        }
      }
    };

    const drawTriangles = () => {
      const triSize = Math.max(15, Math.floor(100 - actualDensity * 0.5 + actualSize * 0.4));
      const triHeight = (triSize * Math.sqrt(3)) / 2;
      const cols = Math.ceil(width / triSize) + 2;
      const rows = Math.ceil(height / triHeight) + 2;

      setStroke(ctx);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = lineWidth;
      maskCtx.strokeStyle = getMaskColor(1);
      maskCtx.lineWidth = lineWidth * 1.5;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * triSize + (row % 2 ? triSize / 2 : 0);
          const y = row * triHeight;
          const inverted = (col + row) % 2 === 1;

          const drawTri = () => {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c, idx) => {
              if (idx === 0) {
                c.strokeStyle = colors.primary;
                c.fillStyle = colors.secondary + '40';
              } else if (idx === 1) {
                c.strokeStyle = getMaskColor(1);
                c.fillStyle = getMaskColor(0.7);
              } else if (idx === 2) {
                c.strokeStyle = getNormalColor(1, 0);
                c.fillStyle = getNormalColor(0.5, 0);
              } else if (idx === 3) {
                c.strokeStyle = getRoughColor(1);
                c.fillStyle = getRoughColor(0.8);
              } else {
                c.strokeStyle = getPearlColor(1);
                c.fillStyle = getPearlColor(0.7);
              }
              c.lineWidth = lineWidth;

              c.beginPath();
              if (inverted) {
                c.moveTo(x, y + triHeight);
                c.lineTo(x + triSize / 2, y);
                c.lineTo(x + triSize, y + triHeight);
              } else {
                c.moveTo(x, y);
                c.lineTo(x + triSize, y);
                c.lineTo(x + triSize / 2, y + triHeight);
              }
              c.closePath();
              c.stroke();

              if (random() > (100 - fillAmount) / 100) {
                c.fill();
              }
            });
          };
          drawSeamless(drawTri);
        }
      }
    };

    const drawGrid = () => {
      const gridSize = Math.max(10, Math.floor(80 - actualDensity * 0.4 + actualSpacing * 0.3));
      const cols = Math.ceil(width / gridSize) + 1;
      const rows = Math.ceil(height / gridSize) + 1;

      setStroke(ctx);

      // Grid lines
      ctx.strokeStyle = colors.secondary + '60';
      ctx.lineWidth = 1;
      maskCtx.strokeStyle = getMaskColor(0.3);
      maskCtx.lineWidth = 1;

      for (let i = 0; i <= cols; i++) {
        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          c.moveTo(i * gridSize, 0);
          c.lineTo(i * gridSize, height);
          c.stroke();
        });
      }
      for (let j = 0; j <= rows; j++) {
        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          c.moveTo(0, j * gridSize);
          c.lineTo(width, j * gridSize);
          c.stroke();
        });
      }

      // Highlighted cells
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (random() > (100 - fillAmount) / 100) {
            const x = i * gridSize;
            const y = j * gridSize;
            const padding = 2;

            ctx.fillStyle = colors.primary + '40';
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = lineWidth;
            maskCtx.fillStyle = getMaskColor(1);
            maskCtx.strokeStyle = getMaskColor(1);
            normalCtx.fillStyle = getNormalColor(1, 0.5);
            roughCtx.fillStyle = getRoughColor(1);
            pearlCtx.fillStyle = getPearlColor(1);

            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.fillRect(x + padding, y + padding, gridSize - padding * 2, gridSize - padding * 2);
            });
            ctx.strokeRect(x + padding, y + padding, gridSize - padding * 2, gridSize - padding * 2);
          }
        }
      }
    };

    const drawDots = () => {
      const dotSpacing = Math.max(8, Math.floor(60 - actualDensity * 0.3 + actualSpacing * 0.2));
      const cols = Math.ceil(width / dotSpacing) + 1;
      const rows = Math.ceil(height / dotSpacing) + 1;
      const maxSize = actualSize * 0.1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * dotSpacing + dotSpacing / 2;
          const y = j * dotSpacing + dotSpacing / 2;
          const size = 1 + random() * maxSize;
          const intensity = 0.5 + random() * 0.5;

          const drawDot = () => {
            ctx.fillStyle = random() > 0.7 ? colors.accent : colors.primary;
            maskCtx.fillStyle = getMaskColor(intensity);
            normalCtx.fillStyle = getNormalColor(intensity, intensity * 0.3);
            roughCtx.fillStyle = getRoughColor(intensity);
            pearlCtx.fillStyle = getPearlColor(intensity);

            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.beginPath();
              c.arc(x, y, size, 0, Math.PI * 2);
              c.fill();
            });

            // Ring around some dots
            if (random() > 0.85 && complexity > 40) {
              ctx.strokeStyle = colors.primary;
              ctx.lineWidth = lineWidth * 0.5;
              maskCtx.strokeStyle = getMaskColor(0.7);

              [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
                c.beginPath();
                c.arc(x, y, size + 3, 0, Math.PI * 2);
                c.stroke();
              });
            }
          };
          drawSeamless(drawDot);
        }
      }
    };

    const drawWaves = () => {
      const waveCount = Math.floor(5 + actualDensity * 0.15);
      const waveSpacing = height / waveCount;

      setStroke(ctx);
      ctx.lineWidth = lineWidth;
      maskCtx.lineWidth = lineWidth * 2;
      normalCtx.lineWidth = lineWidth * 3;
      roughCtx.lineWidth = lineWidth * 2;
      pearlCtx.lineWidth = lineWidth * 2;

      for (let w = 0; w < waveCount; w++) {
        const baseY = w * waveSpacing + waveSpacing / 2;
        const amplitude = 10 + random() * actualSize * 0.5;
        const frequency = 1 + random() * 4;
        const phase = random() * Math.PI * 2;

        ctx.strokeStyle = w % 2 === 0 ? colors.primary : colors.secondary;
        maskCtx.strokeStyle = getMaskColor(0.7 + (w % 2) * 0.3);
        normalCtx.strokeStyle = getNormalColor(0.5 + w * 0.1, 0);
        roughCtx.strokeStyle = getRoughColor(0.8);
        pearlCtx.strokeStyle = getPearlColor(0.8);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          for (let x = 0; x <= width; x += 2) {
            const y = baseY + Math.sin((x / width) * Math.PI * 2 * frequency + phase) * amplitude;
            if (x === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.stroke();
        });
      }
    };

    const drawGlitch = () => {
      const blockCount = Math.floor(20 + actualDensity * 0.5);

      for (let i = 0; i < blockCount; i++) {
        const x = Math.floor(random() * (width / 16)) * 16;
        const y = Math.floor(random() * (height / 8)) * 8;
        const w = 16 + Math.floor(random() * 15) * 16;
        const h = 4 + Math.floor(random() * 4) * 4;
        const intensity = 0.5 + random() * 0.5;

        ctx.fillStyle = [colors.primary, colors.secondary, colors.accent][Math.floor(random() * 3)] + 'cc';
        maskCtx.fillStyle = getMaskColor(intensity);
        normalCtx.fillStyle = getNormalColor(intensity, 0);
        roughCtx.fillStyle = getRoughColor(intensity);
        pearlCtx.fillStyle = getPearlColor(intensity);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.fillRect(x, y, w, h);
        });

        // Offset duplicate
        if (random() > 0.6) {
          ctx.fillStyle = colors.primary + '40';
          ctx.fillRect(x + 2, y + 1, w, h);
        }
      }

      // Scanline glitches
      for (let i = 0; i < 30; i++) {
        const y = Math.floor(random() * height);
        const alpha = Math.floor(random() * 60);
        ctx.fillStyle = colors.primary + alpha.toString(16).padStart(2, '0');
        ctx.fillRect(0, y, width, 1 + Math.floor(random() * 2));
      }
    };

    const drawDigiCamo = () => {
      const blockSize = Math.max(4, Math.floor(24 - actualDensity * 0.12 + actualSize * 0.1));
      const cols = Math.ceil(width / blockSize);
      const rows = Math.ceil(height / blockSize);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const colorIdx = Math.floor(random() * 4);
          const intensity = 0.3 + colorIdx * 0.2;

          const camoColors = [colors.background, colors.secondary + 'aa', colors.primary + '70', colors.accent + '50'];
          ctx.fillStyle = camoColors[colorIdx];
          maskCtx.fillStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(intensity * 0.5, 0);
          roughCtx.fillStyle = getRoughColor(intensity);
          pearlCtx.fillStyle = getPearlColor(intensity * 0.7);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
          });
        }
      }
    };

    const drawNoise = () => {
      const blockSize = Math.max(2, Math.floor(10 - actualDensity * 0.05 + actualSize * 0.05));
      const cols = Math.ceil(width / blockSize);
      const rows = Math.ceil(height / blockSize);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const intensity = random();
          const alpha = Math.floor(intensity * 200);

          ctx.fillStyle = colors.primary + alpha.toString(16).padStart(2, '0');
          maskCtx.fillStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(intensity * 0.5, 0);
          roughCtx.fillStyle = getRoughColor(intensity);
          pearlCtx.fillStyle = getPearlColor(intensity * 0.5);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
          });
        }
      }
    };

    const drawVoronoi = () => {
      const pointCount = Math.floor(20 + actualDensity * 0.5);
      const points: { x: number; y: number; color: number }[] = [];

      for (let i = 0; i < pointCount; i++) {
        points.push({
          x: random() * width,
          y: random() * height,
          color: Math.floor(random() * 3),
        });
      }

      const cellSize = 4;
      for (let x = 0; x < width; x += cellSize) {
        for (let y = 0; y < height; y += cellSize) {
          let minDist = Infinity;
          let closest = points[0];

          points.forEach((p) => {
            const dist = Math.hypot(p.x - x, p.y - y);
            if (dist < minDist) {
              minDist = dist;
              closest = p;
            }
          });

          const intensity = Math.min(1, minDist / 100);
          const colorOptions = [colors.primary, colors.secondary, colors.accent];
          ctx.fillStyle = colorOptions[closest.color] + Math.floor((1 - intensity) * 150).toString(16).padStart(2, '0');
          maskCtx.fillStyle = getMaskColor(1 - intensity * 0.7);
          normalCtx.fillStyle = getNormalColor(1 - intensity, 0);
          roughCtx.fillStyle = getRoughColor(1 - intensity * 0.5);
          pearlCtx.fillStyle = getPearlColor(1 - intensity * 0.5);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.fillRect(x, y, cellSize, cellSize);
          });
        }
      }

      // Draw cell centers
      ctx.fillStyle = colors.accent;
      maskCtx.fillStyle = getMaskColor(1);
      points.forEach((p) => {
        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          c.arc(p.x, p.y, 3, 0, Math.PI * 2);
          c.fill();
        });
      });
    };

    const drawFlowField = () => {
      const lineCount = Math.floor(50 + actualDensity * 1);
      const steps = 30 + Math.floor(complexity * 0.5);
      const stepSize = 5;
      const noiseScale = 0.005 + ((100 - complexity) * 0.0001);

      setStroke(ctx);
      ctx.lineWidth = lineWidth * 0.7;
      maskCtx.lineWidth = lineWidth;

      for (let i = 0; i < lineCount; i++) {
        let x = random() * width;
        let y = random() * height;
        const intensity = 0.5 + random() * 0.5;

        ctx.strokeStyle = [colors.primary, colors.secondary, colors.accent][Math.floor(random() * 3)] + 'aa';
        maskCtx.strokeStyle = getMaskColor(intensity);
        normalCtx.strokeStyle = getNormalColor(intensity, 0);
        roughCtx.strokeStyle = getRoughColor(intensity);
        pearlCtx.strokeStyle = getPearlColor(intensity);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          c.moveTo(x, y);
        });

        for (let s = 0; s < steps; s++) {
          const angle = Math.sin(x * noiseScale) * Math.cos(y * noiseScale) * Math.PI * 4;
          x += Math.cos(angle) * stepSize;
          y += Math.sin(angle) * stepSize;

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.lineTo(wrap(x, width), wrap(y, height));
          });
        }

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.stroke();
        });
      }
    };

    const drawSpiral = () => {
      const spiralCount = Math.floor(2 + actualDensity * 0.03);

      setStroke(ctx);
      ctx.lineWidth = lineWidth;
      maskCtx.lineWidth = lineWidth * 2;

      for (let s = 0; s < spiralCount; s++) {
        const cx = random() * width;
        const cy = random() * height;
        const maxRadius = 50 + random() * 150;
        const turns = 2 + random() * 4;
        const direction = random() > 0.5 ? 1 : -1;

        ctx.strokeStyle = s % 2 === 0 ? colors.primary : colors.secondary;
        maskCtx.strokeStyle = getMaskColor(0.8);
        normalCtx.strokeStyle = getNormalColor(0.7, 0);
        roughCtx.strokeStyle = getRoughColor(0.8);
        pearlCtx.strokeStyle = getPearlColor(0.8);

        const drawSpiralPath = () => {
          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.beginPath();
            for (let a = 0; a < Math.PI * 2 * turns; a += 0.05) {
              const r = (a / (Math.PI * 2 * turns)) * maxRadius;
              const px = cx + r * Math.cos(a * direction);
              const py = cy + r * Math.sin(a * direction);
              if (a === 0) c.moveTo(px, py);
              else c.lineTo(px, py);
            }
            c.stroke();
          });
        };
        drawSeamless(drawSpiralPath);
      }
    };

    const drawStars = () => {
      const starCount = Math.floor(15 + actualDensity * 0.4);

      for (let i = 0; i < starCount; i++) {
        const x = random() * width;
        const y = random() * height;
        const outerR = 10 + random() * actualSize * 0.8;
        const innerR = outerR * (0.3 + random() * 0.2);
        const points = 4 + Math.floor(random() * 4);
        const intensity = 0.6 + random() * 0.4;

        ctx.fillStyle = random() > 0.7 ? colors.accent : colors.primary;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = lineWidth;
        maskCtx.fillStyle = getMaskColor(intensity);
        maskCtx.strokeStyle = getMaskColor(intensity);
        normalCtx.fillStyle = getNormalColor(intensity, 0.3);
        roughCtx.fillStyle = getRoughColor(intensity);
        pearlCtx.fillStyle = getPearlColor(intensity);

        const drawStar = () => {
          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.beginPath();
            for (let p = 0; p < points * 2; p++) {
              const radius = p % 2 === 0 ? outerR : innerR;
              const angle = (Math.PI / points) * p - Math.PI / 2;
              const px = x + radius * Math.cos(angle);
              const py = y + radius * Math.sin(angle);
              if (p === 0) c.moveTo(px, py);
              else c.lineTo(px, py);
            }
            c.closePath();
            if (random() > (100 - fillAmount) / 100) c.fill();
            else c.stroke();
          });
        };
        drawSeamless(drawStar);
      }
    };

    const drawCircles = () => {
      const circleCount = Math.floor(10 + actualDensity * 0.3);

      setStroke(ctx);
      ctx.lineWidth = lineWidth;
      maskCtx.lineWidth = lineWidth * 1.5;

      for (let i = 0; i < circleCount; i++) {
        const x = random() * width;
        const y = random() * height;
        const radius = 20 + random() * actualSize * 2;
        const rings = Math.floor(1 + random() * (complexity * 0.05));
        const intensity = 0.5 + random() * 0.5;

        for (let r = 0; r < rings; r++) {
          const ringRadius = radius - r * ((radius / rings) * 0.8);

          ctx.strokeStyle = r % 2 === 0 ? colors.primary : colors.secondary;
          maskCtx.strokeStyle = getMaskColor(intensity * (1 - r * 0.2));
          normalCtx.strokeStyle = getNormalColor(intensity, 0);
          roughCtx.strokeStyle = getRoughColor(intensity);
          pearlCtx.strokeStyle = getPearlColor(intensity);

          const drawCircle = () => {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.beginPath();
              c.arc(x, y, ringRadius, 0, Math.PI * 2);
              c.stroke();
            });
          };
          drawSeamless(drawCircle);
        }

        // Center dot
        if (random() > 0.5) {
          ctx.fillStyle = colors.accent;
          maskCtx.fillStyle = getMaskColor(1);
          const drawCenter = () => {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.beginPath();
              c.arc(x, y, 3, 0, Math.PI * 2);
              c.fill();
            });
          };
          drawSeamless(drawCenter);
        }
      }
    };

    const drawDiamonds = () => {
      const diamondSize = Math.max(15, Math.floor(60 - actualDensity * 0.3 + actualSize * 0.3));
      const cols = Math.ceil(width / diamondSize) + 1;
      const rows = Math.ceil(height / diamondSize) + 1;

      setStroke(ctx);
      ctx.lineWidth = lineWidth;
      maskCtx.lineWidth = lineWidth * 1.5;

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const x = col * diamondSize + (row % 2 ? diamondSize / 2 : 0);
          const y = row * diamondSize * 0.5;
          const size = diamondSize * 0.45;
          const intensity = 0.5 + random() * 0.5;

          ctx.strokeStyle = random() > 0.7 ? colors.accent : colors.primary;
          ctx.fillStyle = colors.secondary + '30';
          maskCtx.strokeStyle = getMaskColor(intensity);
          maskCtx.fillStyle = getMaskColor(intensity * 0.7);
          normalCtx.strokeStyle = getNormalColor(intensity, 0);
          normalCtx.fillStyle = getNormalColor(intensity * 0.5, 0);
          roughCtx.strokeStyle = getRoughColor(intensity);
          roughCtx.fillStyle = getRoughColor(intensity * 0.7);
          pearlCtx.strokeStyle = getPearlColor(intensity);
          pearlCtx.fillStyle = getPearlColor(intensity * 0.7);

          const drawDiamond = () => {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.beginPath();
              c.moveTo(x, y - size);
              c.lineTo(x + size, y);
              c.lineTo(x, y + size);
              c.lineTo(x - size, y);
              c.closePath();
              if (random() > (100 - fillAmount) / 100) c.fill();
              c.stroke();
            });
          };
          drawSeamless(drawDiamond);
        }
      }
    };

    const drawLabyrinth = () => {
      const cellSize = Math.max(12, Math.floor(50 - actualDensity * 0.25 + actualSpacing * 0.2));
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);

      setStroke(ctx);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = lineWidth;
      maskCtx.strokeStyle = getMaskColor(1);
      maskCtx.lineWidth = lineWidth * 2;
      normalCtx.strokeStyle = getNormalColor(1, 0);
      normalCtx.lineWidth = lineWidth * 2;
      roughCtx.strokeStyle = getRoughColor(1);
      roughCtx.lineWidth = lineWidth * 2;
      pearlCtx.strokeStyle = getPearlColor(1);
      pearlCtx.lineWidth = lineWidth * 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * cellSize;
          const y = j * cellSize;
          const pattern = Math.floor(random() * 4);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.beginPath();
            switch (pattern) {
              case 0:
                c.moveTo(x, y + cellSize / 2);
                c.lineTo(x + cellSize, y + cellSize / 2);
                break;
              case 1:
                c.moveTo(x + cellSize / 2, y);
                c.lineTo(x + cellSize / 2, y + cellSize);
                break;
              case 2:
                c.arc(x, y, cellSize / 2, 0, Math.PI / 2);
                break;
              case 3:
                c.arc(x + cellSize, y + cellSize, cellSize / 2, Math.PI, Math.PI * 1.5);
                break;
            }
            c.stroke();
          });
        }
      }
    };

    const drawCrosshatch = () => {
      const spacing = Math.max(8, Math.floor(40 - actualDensity * 0.2 + actualSpacing * 0.15));

      setStroke(ctx);
      ctx.strokeStyle = colors.primary + '70';
      ctx.lineWidth = lineWidth * 0.7;
      maskCtx.strokeStyle = getMaskColor(0.6);
      maskCtx.lineWidth = lineWidth;
      normalCtx.strokeStyle = getNormalColor(0.5, 0);
      normalCtx.lineWidth = lineWidth;
      roughCtx.strokeStyle = getRoughColor(0.7);
      roughCtx.lineWidth = lineWidth;
      pearlCtx.strokeStyle = getPearlColor(0.6);
      pearlCtx.lineWidth = lineWidth;

      // One direction
      for (let i = -height; i < width + height; i += spacing) {
        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          c.moveTo(i, 0);
          c.lineTo(i + height, height);
          c.stroke();
        });
      }

      // Other direction
      ctx.strokeStyle = colors.secondary + '50';
      maskCtx.strokeStyle = getMaskColor(0.4);
      for (let i = -height; i < width + height; i += spacing) {
        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          c.moveTo(i, height);
          c.lineTo(i + height, 0);
          c.stroke();
        });
      }

      // Accent dots at intersections
      if (complexity > 50) {
        for (let x = 0; x < width; x += spacing * 2) {
          for (let y = 0; y < height; y += spacing * 2) {
            if (random() > 0.7) {
              ctx.fillStyle = colors.accent;
              maskCtx.fillStyle = getMaskColor(1);
              normalCtx.fillStyle = getNormalColor(1, 0.5);
              roughCtx.fillStyle = getRoughColor(1);
              pearlCtx.fillStyle = getPearlColor(1);

              [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
                c.beginPath();
                c.arc(x, y, 2 + random() * 2, 0, Math.PI * 2);
                c.fill();
              });
            }
          }
        }
      }
    };

    const drawChipset = () => {
      const chipSize = Math.max(30, Math.floor(120 - actualDensity * 0.6 + actualSize * 0.5));
      const cols = Math.ceil(width / chipSize) + 1;
      const rows = Math.ceil(height / chipSize) + 1;

      setStroke(ctx);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * chipSize + chipSize * 0.1;
          const y = j * chipSize + chipSize * 0.1;
          const w = chipSize * 0.8;
          const h = chipSize * 0.8;

          // Chip body
          ctx.fillStyle = colors.background;
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = lineWidth;
          maskCtx.fillStyle = getMaskColor(0.8);
          maskCtx.strokeStyle = getMaskColor(1);
          normalCtx.fillStyle = getNormalColor(0.7, 0.3);
          roughCtx.fillStyle = getRoughColor(0.9);
          pearlCtx.fillStyle = getPearlColor(0.8);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.fillRect(x, y, w, h);
          });
          ctx.strokeRect(x, y, w, h);
          maskCtx.strokeRect(x, y, w, h);

          // Pins
          const pinCount = Math.floor(3 + complexity * 0.05);
          const pinSpacing = w / (pinCount + 1);

          ctx.strokeStyle = colors.secondary;
          ctx.lineWidth = lineWidth * 0.7;
          maskCtx.strokeStyle = getMaskColor(0.7);

          for (let p = 1; p <= pinCount; p++) {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              // Top
              c.beginPath();
              c.moveTo(x + p * pinSpacing, y);
              c.lineTo(x + p * pinSpacing, y - 8);
              c.stroke();
              // Bottom
              c.beginPath();
              c.moveTo(x + p * pinSpacing, y + h);
              c.lineTo(x + p * pinSpacing, y + h + 8);
              c.stroke();
            });
          }

          const pinCountV = Math.floor(2 + complexity * 0.04);
          const pinSpacingV = h / (pinCountV + 1);

          for (let p = 1; p <= pinCountV; p++) {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              // Left
              c.beginPath();
              c.moveTo(x, y + p * pinSpacingV);
              c.lineTo(x - 8, y + p * pinSpacingV);
              c.stroke();
              // Right
              c.beginPath();
              c.moveTo(x + w, y + p * pinSpacingV);
              c.lineTo(x + w + 8, y + p * pinSpacingV);
              c.stroke();
            });
          }

          // Inner rectangle
          if (complexity > 30) {
            ctx.strokeStyle = colors.accent + '60';
            maskCtx.strokeStyle = getMaskColor(0.5);
            [ctx, maskCtx].forEach((c) => {
              c.strokeRect(x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.7);
            });
          }

          // Marker dot
          ctx.fillStyle = colors.accent;
          maskCtx.fillStyle = getMaskColor(1);
          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.beginPath();
            c.arc(x + 6, y + 6, 3, 0, Math.PI * 2);
            c.fill();
          });
        }
      }
    };

    const drawBarcode = () => {
      const isVertical = random() > 0.5;
      let pos = 0;
      const maxPos = isVertical ? width : height;

      while (pos < maxPos) {
        const barWidth = 2 + Math.floor(random() * 10);
        const filled = random() > 0.35;
        const intensity = 0.6 + random() * 0.4;

        if (filled) {
          ctx.fillStyle = random() > 0.8 ? colors.accent : colors.primary;
          maskCtx.fillStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(intensity, 0);
          roughCtx.fillStyle = getRoughColor(intensity);
          pearlCtx.fillStyle = getPearlColor(intensity);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            if (isVertical) {
              c.fillRect(pos, 0, barWidth, height);
            } else {
              c.fillRect(0, pos, width, barWidth);
            }
          });
        }

        pos += barWidth + 1 + Math.floor(random() * 5);
      }
    };

    const drawGeometric = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.48;
      const rings = Math.floor(4 + actualDensity * 0.08);
      const sidesBase = 3 + Math.floor(complexity * 0.06);

      setStroke(ctx);
      ctx.lineWidth = lineWidth;
      maskCtx.lineWidth = lineWidth * 1.5;

      for (let r = 0; r < rings; r++) {
        const radius = (maxRadius * (r + 1)) / rings;
        const sides = sidesBase + (r % 2);
        const rot = (r * Math.PI) / (rings * 2);

        ctx.strokeStyle = r % 2 === 0 ? colors.primary : colors.secondary;
        maskCtx.strokeStyle = getMaskColor(0.6 + r * 0.05);
        normalCtx.strokeStyle = getNormalColor(0.5 + r * 0.1, 0);
        roughCtx.strokeStyle = getRoughColor(0.7 + r * 0.05);
        pearlCtx.strokeStyle = getPearlColor(0.7 + r * 0.05);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          for (let i = 0; i <= sides; i++) {
            const angle = ((Math.PI * 2) / sides) * i + rot;
            const px = centerX + radius * Math.cos(angle);
            const py = centerY + radius * Math.sin(angle);
            if (i === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.stroke();
        });

        // Radial lines
        if (complexity > 40) {
          ctx.strokeStyle = colors.accent + '50';
          maskCtx.strokeStyle = getMaskColor(0.4);
          for (let i = 0; i < sides; i++) {
            const angle = ((Math.PI * 2) / sides) * i + rot;
            const innerR = r > 0 ? (maxRadius * r) / rings : 0;
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.beginPath();
              c.moveTo(centerX + innerR * Math.cos(angle), centerY + innerR * Math.sin(angle));
              c.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
              c.stroke();
            });
          }
        }
      }
    };

    const drawDataStream = () => {
      const streamCount = Math.floor(10 + actualDensity * 0.15);
      const streamSpacing = width / streamCount;

      setStroke(ctx);

      for (let s = 0; s < streamCount; s++) {
        const isVertical = s % 2 === 0;
        const pos = s * streamSpacing + streamSpacing / 2;
        const intensity = 0.5 + random() * 0.5;

        // Dashed line
        ctx.strokeStyle = random() > 0.5 ? colors.primary : colors.accent;
        ctx.lineWidth = lineWidth;
        maskCtx.strokeStyle = getMaskColor(intensity * 0.6);
        maskCtx.lineWidth = lineWidth * 1.5;

        const dashLen = 5 + random() * 15;
        const gapLen = 10 + random() * 20;
        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.setLineDash([dashLen, gapLen]);
          c.beginPath();
          if (isVertical) {
            c.moveTo(pos, 0);
            c.lineTo(pos, height);
          } else {
            c.moveTo(0, pos);
            c.lineTo(width, pos);
          }
          c.stroke();
          c.setLineDash([]);
        });

        // Data blocks
        const blockCount = Math.floor(5 + random() * 10);
        const blockDim = isVertical ? height : width;
        const blockSpacing = blockDim / blockCount;

        for (let b = 0; b < blockCount; b++) {
          const bPos = b * blockSpacing + random() * blockSpacing * 0.6;
          const bSize = 4 + random() * 12;
          const bIntensity = 0.6 + random() * 0.4;

          ctx.fillStyle = colors.primary;
          maskCtx.fillStyle = getMaskColor(bIntensity);
          normalCtx.fillStyle = getNormalColor(bIntensity, 0);
          roughCtx.fillStyle = getRoughColor(bIntensity);
          pearlCtx.fillStyle = getPearlColor(bIntensity);

          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            if (isVertical) {
              c.fillRect(pos - bSize / 2, bPos, bSize, bSize * 0.4);
            } else {
              c.fillRect(bPos, pos - bSize / 2, bSize * 0.4, bSize);
            }
          });
        }
      }
    };

    const drawPlaid = () => {
      const stripeWidth = Math.max(8, Math.floor(40 - actualDensity * 0.2 + actualSize * 0.2));
      const stripeSpacing = stripeWidth * 2;

      // Horizontal stripes
      for (let y = 0; y < height; y += stripeSpacing) {
        const intensity = 0.5 + (y / height) * 0.3;
        ctx.fillStyle = colors.primary + '60';
        maskCtx.fillStyle = getMaskColor(intensity);
        normalCtx.fillStyle = getNormalColor(0.5, 0);
        roughCtx.fillStyle = getRoughColor(intensity);
        pearlCtx.fillStyle = getPearlColor(intensity);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.fillRect(0, y, width, stripeWidth);
        });
      }

      // Vertical stripes
      for (let x = 0; x < width; x += stripeSpacing) {
        const intensity = 0.5 + (x / width) * 0.3;
        ctx.fillStyle = colors.secondary + '60';
        maskCtx.fillStyle = getMaskColor(intensity);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.fillRect(x, 0, stripeWidth, height);
        });
      }

      // Intersection highlights
      ctx.fillStyle = colors.accent + '40';
      maskCtx.fillStyle = getMaskColor(1);
      for (let x = 0; x < width; x += stripeSpacing) {
        for (let y = 0; y < height; y += stripeSpacing) {
          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.fillRect(x, y, stripeWidth, stripeWidth);
          });
        }
      }
    };

    const drawZigzag = () => {
      const zigCount = Math.floor(8 + actualDensity * 0.1);
      const zigSpacing = height / zigCount;
      const amplitude = 20 + actualSize * 0.5;
      const frequency = 5 + complexity * 0.1;

      setStroke(ctx);
      ctx.lineWidth = lineWidth;
      maskCtx.lineWidth = lineWidth * 2;

      for (let z = 0; z < zigCount; z++) {
        const baseY = z * zigSpacing + zigSpacing / 2;
        const intensity = 0.5 + (z / zigCount) * 0.5;

        ctx.strokeStyle = z % 2 === 0 ? colors.primary : colors.secondary;
        maskCtx.strokeStyle = getMaskColor(intensity);
        normalCtx.strokeStyle = getNormalColor(intensity, 0);
        roughCtx.strokeStyle = getRoughColor(intensity);
        pearlCtx.strokeStyle = getPearlColor(intensity);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.beginPath();
          for (let x = 0; x <= width; x += width / frequency / 2) {
            const zigIdx = Math.floor(x / (width / frequency));
            const y = baseY + (zigIdx % 2 === 0 ? -amplitude : amplitude);
            if (x === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.stroke();
        });
      }
    };

    const drawMosaic = () => {
      const tileCount = Math.floor(30 + actualDensity * 0.8);

      for (let i = 0; i < tileCount; i++) {
        const x = random() * width;
        const y = random() * height;
        const w = 20 + random() * actualSize * 1.5;
        const h = 20 + random() * actualSize * 1.5;
        const intensity = 0.4 + random() * 0.6;
        const rot = random() * Math.PI * 0.25 - Math.PI * 0.125;

        ctx.fillStyle = [colors.primary, colors.secondary, colors.accent][Math.floor(random() * 3)] + 'aa';
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = lineWidth * 0.5;
        maskCtx.fillStyle = getMaskColor(intensity);
        maskCtx.strokeStyle = getMaskColor(intensity);
        normalCtx.fillStyle = getNormalColor(intensity, 0.3);
        roughCtx.fillStyle = getRoughColor(intensity);
        pearlCtx.fillStyle = getPearlColor(intensity);

        const drawTile = () => {
          [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
            c.save();
            c.translate(x, y);
            c.rotate(rot);
            c.fillRect(-w / 2, -h / 2, w, h);
            c.restore();
          });
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.restore();
        };
        drawSeamless(drawTile);
      }
    };

    const drawHoneycomb = () => {
      drawHexGrid();
    };

    const drawScales = () => {
      const scaleSize = Math.max(10, Math.floor(40 - actualDensity * 0.2 + actualSize * 0.2));
      const cols = Math.ceil(width / scaleSize) + 2;
      const rows = Math.ceil(height / (scaleSize * 0.7)) + 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * scaleSize + (row % 2 ? scaleSize / 2 : 0);
          const y = row * scaleSize * 0.7;
          const intensity = 0.5 + random() * 0.5;

          ctx.fillStyle = colors.primary + '80';
          ctx.strokeStyle = colors.secondary;
          ctx.lineWidth = lineWidth * 0.5;
          maskCtx.fillStyle = getMaskColor(intensity);
          maskCtx.strokeStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(0.5, 0.5);
          roughCtx.fillStyle = getRoughColor(intensity);
          pearlCtx.fillStyle = getPearlColor(intensity);

          const drawScale = () => {
            [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
              c.beginPath();
              c.arc(x, y, scaleSize * 0.6, 0, Math.PI);
              c.fill();
              c.stroke();
            });
          };
          drawSeamless(drawScale);
        }
      }
    };

    const drawScanlines = () => {
      const lineSpacing = Math.max(2, Math.floor(8 - actualDensity * 0.04));

      for (let y = 0; y < height; y += lineSpacing) {
        const intensity = 0.3 + (y % (lineSpacing * 2) === 0 ? 0.4 : 0);

        ctx.fillStyle = colors.primary + Math.floor(intensity * 100).toString(16).padStart(2, '0');
        maskCtx.fillStyle = getMaskColor(intensity);
        normalCtx.fillStyle = getNormalColor(0, 0);
        roughCtx.fillStyle = getRoughColor(intensity * 0.5);
        pearlCtx.fillStyle = getPearlColor(intensity * 0.3);

        [ctx, maskCtx, normalCtx, roughCtx, pearlCtx].forEach((c) => {
          c.fillRect(0, y, width, 1);
        });
      }
    };

    const drawHalftone = () => {
      const dotSpacing = Math.max(4, Math.floor(16 - actualDensity * 0.08));
      const cols = Math.ceil(width / dotSpacing);
      const rows = Math.ceil(height / dotSpacing);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * dotSpacing + dotSpacing / 2;
          const y = j * dotSpacing + dotSpacing / 2;

          // Size varies based on position (gradient effect)
          const gradientFactor = (i + j) / (cols + rows);
          const size = dotSpacing * 0.4 * (0.2 + gradientFactor * 0.8);
          const intensity = 0.3 + gradientFactor * 0.7;

          ctx.fillStyle = colors.primary;
          maskCtx.fillStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(intensity, 0);
          roughCtx.fillStyle = getRoughColor(intensity);
          pearlCtx.fillStyle = getPearlColor(intensity);
          aoCtx.fillStyle = getAOColor(intensity);
          heightCtx.fillStyle = getHeightColor(intensity);

          allCtx.forEach((c) => {
            c.beginPath();
            c.arc(x, y, size, 0, Math.PI * 2);
            c.fill();
          });
        }
      }
    };

    // ==================== 3D PATTERN FUNCTIONS ====================

    const drawCubes3D = () => {
      const cubeSize = Math.max(20, Math.floor(80 - actualDensity * 0.4 + actualSize * 0.4));
      const cols = Math.ceil(width / (cubeSize * 1.5)) + 2;
      const rows = Math.ceil(height / cubeSize) + 2;
      const depthIntensity = patternSettings.depthIntensity / 100;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cubeSize * 1.5 + (row % 2 ? cubeSize * 0.75 : 0);
          const y = row * cubeSize;
          const cubeHeight = cubeSize * (0.5 + random() * 0.5) * depthIntensity;
          const intensity = 0.4 + random() * 0.6;

          const drawCube = () => {
            // Top face (brightest)
            const topColor = colors.primary;
            const leftColor = colors.secondary;
            const rightColor = colors.accent || colors.secondary;

            // Top face
            ctx.fillStyle = topColor;
            maskCtx.fillStyle = getMaskColor(intensity);
            normalCtx.fillStyle = getNormalColor(0, -1);
            roughCtx.fillStyle = getRoughColor(intensity);
            pearlCtx.fillStyle = getPearlColor(intensity);
            aoCtx.fillStyle = getAOColor(intensity);
            heightCtx.fillStyle = getHeightColor(0.8 + cubeHeight / cubeSize * 0.2);

            allCtx.forEach((c) => {
              c.beginPath();
              c.moveTo(x, y - cubeHeight);
              c.lineTo(x + cubeSize * 0.5, y - cubeHeight + cubeSize * 0.25);
              c.lineTo(x, y - cubeHeight + cubeSize * 0.5);
              c.lineTo(x - cubeSize * 0.5, y - cubeHeight + cubeSize * 0.25);
              c.closePath();
              c.fill();
            });

            // Left face (medium)
            ctx.fillStyle = leftColor;
            normalCtx.fillStyle = getNormalColor(-0.7, 0.4);
            heightCtx.fillStyle = getHeightColor(0.5);
            aoCtx.fillStyle = getAOColor(intensity * 0.7);

            allCtx.forEach((c) => {
              c.beginPath();
              c.moveTo(x - cubeSize * 0.5, y - cubeHeight + cubeSize * 0.25);
              c.lineTo(x, y - cubeHeight + cubeSize * 0.5);
              c.lineTo(x, y + cubeSize * 0.5 - cubeHeight + cubeHeight);
              c.lineTo(x - cubeSize * 0.5, y + cubeSize * 0.25);
              c.closePath();
              c.fill();
            });

            // Right face (darkest)
            ctx.fillStyle = rightColor;
            normalCtx.fillStyle = getNormalColor(0.7, 0.4);
            heightCtx.fillStyle = getHeightColor(0.3);
            aoCtx.fillStyle = getAOColor(intensity * 0.5);

            allCtx.forEach((c) => {
              c.beginPath();
              c.moveTo(x + cubeSize * 0.5, y - cubeHeight + cubeSize * 0.25);
              c.lineTo(x, y - cubeHeight + cubeSize * 0.5);
              c.lineTo(x, y + cubeSize * 0.5);
              c.lineTo(x + cubeSize * 0.5, y + cubeSize * 0.25);
              c.closePath();
              c.fill();
            });

            // Edge highlights
            ctx.strokeStyle = colors.primary + '80';
            ctx.lineWidth = lineWidth * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y - cubeHeight);
            ctx.lineTo(x, y - cubeHeight + cubeSize * 0.5);
            ctx.stroke();
          };
          drawSeamless(drawCube);
        }
      }
    };

    const drawPyramids3D = () => {
      const pyramidSize = Math.max(25, Math.floor(100 - actualDensity * 0.5 + actualSize * 0.5));
      const cols = Math.ceil(width / pyramidSize) + 1;
      const rows = Math.ceil(height / pyramidSize) + 1;
      const pyramidHeight = pyramidSize * (patternSettings.depthIntensity / 100);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * pyramidSize + (row % 2 ? pyramidSize / 2 : 0);
          const y = row * pyramidSize;
          const intensity = 0.5 + random() * 0.5;
          const h = pyramidHeight * (0.5 + random() * 0.5);

          const drawPyramid = () => {
            // Calculate center
            const cx = x + pyramidSize / 2;
            const cy = y + pyramidSize / 2;

            // Four faces with different lighting
            const faces = [
              { points: [[cx, cy - h], [cx - pyramidSize/2, cy + pyramidSize/2], [cx, cy]], normal: { x: -0.5, y: -0.5 }, bright: 1 },
              { points: [[cx, cy - h], [cx, cy], [cx + pyramidSize/2, cy + pyramidSize/2]], normal: { x: 0.5, y: -0.5 }, bright: 0.8 },
              { points: [[cx, cy - h], [cx + pyramidSize/2, cy - pyramidSize/2], [cx, cy]], normal: { x: 0.5, y: 0.5 }, bright: 0.6 },
              { points: [[cx, cy - h], [cx, cy], [cx - pyramidSize/2, cy - pyramidSize/2]], normal: { x: -0.5, y: 0.5 }, bright: 0.4 },
            ];

            faces.forEach((face, idx) => {
              ctx.fillStyle = idx % 2 === 0 ? colors.primary : colors.secondary;
              maskCtx.fillStyle = getMaskColor(intensity * face.bright);
              normalCtx.fillStyle = getNormalColor(face.normal.x, face.normal.y);
              roughCtx.fillStyle = getRoughColor(intensity);
              pearlCtx.fillStyle = getPearlColor(intensity * face.bright);
              aoCtx.fillStyle = getAOColor(intensity * face.bright);
              heightCtx.fillStyle = getHeightColor(face.bright);

              allCtx.forEach((c) => {
                c.beginPath();
                c.moveTo(face.points[0][0], face.points[0][1]);
                c.lineTo(face.points[1][0], face.points[1][1]);
                c.lineTo(face.points[2][0], face.points[2][1]);
                c.closePath();
                c.fill();
              });
            });
          };
          drawSeamless(drawPyramid);
        }
      }
    };

    const drawSpheres3D = () => {
      const sphereCount = Math.floor(10 + actualDensity * 0.3);
      const maxRadius = actualSize * 1.5;

      for (let i = 0; i < sphereCount; i++) {
        const x = random() * width;
        const y = random() * height;
        const radius = 15 + random() * maxRadius;
        const intensity = 0.5 + random() * 0.5;

        const drawSphere = () => {
          // Create radial gradient for 3D effect
          const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
          );
          gradient.addColorStop(0, colors.primary);
          gradient.addColorStop(0.5, colors.secondary);
          gradient.addColorStop(1, colors.background);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();

          // Mask - radial intensity
          const maskGradient = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
          maskGradient.addColorStop(0, getMaskColor(intensity));
          maskGradient.addColorStop(1, getMaskColor(intensity * 0.3));
          maskCtx.fillStyle = maskGradient;
          maskCtx.beginPath();
          maskCtx.arc(x, y, radius, 0, Math.PI * 2);
          maskCtx.fill();

          // Normal map for sphere
          const normalGradient = normalCtx.createRadialGradient(
            x - radius * 0.2, y - radius * 0.2, 0,
            x, y, radius
          );
          normalGradient.addColorStop(0, 'rgb(180, 180, 255)');
          normalGradient.addColorStop(0.5, 'rgb(128, 128, 255)');
          normalGradient.addColorStop(1, 'rgb(80, 80, 255)');
          normalCtx.fillStyle = normalGradient;
          normalCtx.beginPath();
          normalCtx.arc(x, y, radius, 0, Math.PI * 2);
          normalCtx.fill();

          // Height - spherical
          const heightGradient = heightCtx.createRadialGradient(x, y, 0, x, y, radius);
          heightGradient.addColorStop(0, getHeightColor(1));
          heightGradient.addColorStop(1, getHeightColor(0.2));
          heightCtx.fillStyle = heightGradient;
          heightCtx.beginPath();
          heightCtx.arc(x, y, radius, 0, Math.PI * 2);
          heightCtx.fill();

          // AO at edges
          const aoGradient = aoCtx.createRadialGradient(x, y, radius * 0.7, x, y, radius);
          aoGradient.addColorStop(0, '#ffffff');
          aoGradient.addColorStop(1, getAOColor(0.4));
          aoCtx.fillStyle = aoGradient;
          aoCtx.beginPath();
          aoCtx.arc(x, y, radius, 0, Math.PI * 2);
          aoCtx.fill();

          // Pearl and roughness
          roughCtx.fillStyle = getRoughColor(intensity);
          roughCtx.beginPath();
          roughCtx.arc(x, y, radius, 0, Math.PI * 2);
          roughCtx.fill();

          pearlCtx.fillStyle = getPearlColor(intensity);
          pearlCtx.beginPath();
          pearlCtx.arc(x, y, radius, 0, Math.PI * 2);
          pearlCtx.fill();

          // Specular highlight
          if (patternSettings.specularIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${patternSettings.specularIntensity / 200})`;
            ctx.beginPath();
            ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        };
        drawSeamless(drawSphere);
      }
    };

    const drawCylinders3D = () => {
      const cylinderCount = Math.floor(8 + actualDensity * 0.2);

      for (let i = 0; i < cylinderCount; i++) {
        const x = random() * width;
        const y = random() * height;
        const cylWidth = 20 + random() * actualSize;
        const cylHeight = 40 + random() * actualSize * 2;
        const isVertical = random() > 0.5;
        const intensity = 0.5 + random() * 0.5;

        const drawCylinder = () => {
          if (isVertical) {
            // Vertical cylinder
            const gradient = ctx.createLinearGradient(x - cylWidth/2, y, x + cylWidth/2, y);
            gradient.addColorStop(0, colors.secondary);
            gradient.addColorStop(0.3, colors.primary);
            gradient.addColorStop(0.7, colors.primary);
            gradient.addColorStop(1, colors.secondary);

            ctx.fillStyle = gradient;
            ctx.fillRect(x - cylWidth/2, y - cylHeight/2, cylWidth, cylHeight);

            // Top ellipse
            ctx.fillStyle = colors.primary;
            ctx.beginPath();
            ctx.ellipse(x, y - cylHeight/2, cylWidth/2, cylWidth/4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Masks
            const maskGrad = maskCtx.createLinearGradient(x - cylWidth/2, y, x + cylWidth/2, y);
            maskGrad.addColorStop(0, getMaskColor(intensity * 0.5));
            maskGrad.addColorStop(0.5, getMaskColor(intensity));
            maskGrad.addColorStop(1, getMaskColor(intensity * 0.5));
            maskCtx.fillStyle = maskGrad;
            maskCtx.fillRect(x - cylWidth/2, y - cylHeight/2, cylWidth, cylHeight);

            normalCtx.fillStyle = getNormalColor(-0.5, 0);
            normalCtx.fillRect(x - cylWidth/2, y - cylHeight/2, cylWidth/2, cylHeight);
            normalCtx.fillStyle = getNormalColor(0.5, 0);
            normalCtx.fillRect(x, y - cylHeight/2, cylWidth/2, cylHeight);

            heightCtx.fillStyle = getHeightColor(0.7);
            heightCtx.fillRect(x - cylWidth/2, y - cylHeight/2, cylWidth, cylHeight);

            aoCtx.fillStyle = getAOColor(0.6);
            aoCtx.fillRect(x - cylWidth/2, y - cylHeight/2, cylWidth, cylHeight);

          } else {
            // Horizontal cylinder
            const gradient = ctx.createLinearGradient(x, y - cylWidth/2, x, y + cylWidth/2);
            gradient.addColorStop(0, colors.secondary);
            gradient.addColorStop(0.3, colors.primary);
            gradient.addColorStop(0.7, colors.primary);
            gradient.addColorStop(1, colors.secondary);

            ctx.fillStyle = gradient;
            ctx.fillRect(x - cylHeight/2, y - cylWidth/2, cylHeight, cylWidth);

            maskCtx.fillStyle = getMaskColor(intensity);
            maskCtx.fillRect(x - cylHeight/2, y - cylWidth/2, cylHeight, cylWidth);

            normalCtx.fillStyle = getNormalColor(0, -0.5);
            normalCtx.fillRect(x - cylHeight/2, y - cylWidth/2, cylHeight, cylWidth/2);
            normalCtx.fillStyle = getNormalColor(0, 0.5);
            normalCtx.fillRect(x - cylHeight/2, y, cylHeight, cylWidth/2);

            heightCtx.fillStyle = getHeightColor(0.7);
            heightCtx.fillRect(x - cylHeight/2, y - cylWidth/2, cylHeight, cylWidth);
          }

          roughCtx.fillStyle = getRoughColor(intensity);
          roughCtx.fillRect(x - cylWidth, y - cylHeight/2, cylWidth * 2, cylHeight);
          pearlCtx.fillStyle = getPearlColor(intensity);
          pearlCtx.fillRect(x - cylWidth, y - cylHeight/2, cylWidth * 2, cylHeight);
        };
        drawSeamless(drawCylinder);
      }
    };

    const drawTerrain3D = () => {
      const gridSize = Math.max(8, Math.floor(30 - actualDensity * 0.15));
      const cols = Math.ceil(width / gridSize) + 1;
      const rows = Math.ceil(height / gridSize) + 1;
      const heightScale = patternSettings.depthIntensity / 100;
      const noiseScale = 0.01 + complexity * 0.0005;

      // Generate height map
      const heights: number[][] = [];
      for (let j = 0; j <= rows; j++) {
        heights[j] = [];
        for (let i = 0; i <= cols; i++) {
          const nx = i * noiseScale;
          const ny = j * noiseScale;
          heights[j][i] = fbm(nx, ny, 4, 0.5, 2, patternSettings.seed) * heightScale;
        }
      }

      // Draw terrain quads
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * gridSize;
          const y = j * gridSize;
          const h00 = heights[j][i];
          const h10 = heights[j][i + 1] || h00;
          const h01 = heights[j + 1]?.[i] || h00;
          const h11 = heights[j + 1]?.[i + 1] || h00;

          const avgHeight = (h00 + h10 + h01 + h11) / 4;
          const slopeX = (h10 - h00 + h11 - h01) / 2;
          const slopeY = (h01 - h00 + h11 - h10) / 2;
          const intensity = 0.3 + avgHeight * 0.7;

          // Color based on height
          const heightColor = avgHeight > 0.7 ? colors.accent :
                             avgHeight > 0.4 ? colors.primary :
                             colors.secondary;

          ctx.fillStyle = heightColor;
          maskCtx.fillStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(slopeX * 2, slopeY * 2);
          roughCtx.fillStyle = getRoughColor(1 - avgHeight * 0.5);
          pearlCtx.fillStyle = getPearlColor(intensity * 0.5);
          aoCtx.fillStyle = getAOColor(0.5 + avgHeight * 0.5);
          heightCtx.fillStyle = getHeightColor(avgHeight);

          allCtx.forEach((c) => {
            c.fillRect(x, y, gridSize, gridSize);
          });
        }
      }
    };

    const drawParallax = () => {
      const layerCount = patternSettings.depthLayers || 3;
      const layerOffset = patternSettings.layerOffset || 10;

      for (let layer = layerCount - 1; layer >= 0; layer--) {
        const layerIntensity = 1 - layer / layerCount;
        const offset = layer * layerOffset;
        const alpha = layerIntensity * 0.8;

        // Draw shapes at this layer
        const shapeCount = Math.floor(10 + actualDensity * 0.2);
        for (let i = 0; i < shapeCount; i++) {
          const x = random() * width + offset;
          const y = random() * height + offset;
          const size = (10 + random() * actualSize) * (1 - layer * 0.2);
          const shapeType = Math.floor(random() * 3);

          ctx.fillStyle = layer === 0 ? colors.primary : colors.secondary + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          maskCtx.fillStyle = getMaskColor(layerIntensity);
          normalCtx.fillStyle = getNormalColor(0, -layerIntensity);
          heightCtx.fillStyle = getHeightColor(layerIntensity);
          aoCtx.fillStyle = getAOColor(layerIntensity);

          const drawShape = () => {
            allCtx.forEach((c) => {
              c.beginPath();
              switch (shapeType) {
                case 0:
                  c.arc(x, y, size, 0, Math.PI * 2);
                  break;
                case 1:
                  c.rect(x - size, y - size, size * 2, size * 2);
                  break;
                case 2:
                  c.moveTo(x, y - size);
                  c.lineTo(x + size, y + size);
                  c.lineTo(x - size, y + size);
                  c.closePath();
                  break;
              }
              c.fill();
            });
          };
          drawSeamless(drawShape);
        }
      }
    };

    const drawEmboss = () => {
      // First draw base pattern
      drawCircuit();

      // Then apply emboss effect
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const embossStrength = patternSettings.depthIntensity / 50;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const idxL = (y * width + x - 1) * 4;
          const idxT = ((y - 1) * width + x) * 4;

          const diff = (data[idx] - data[idxL] + data[idx] - data[idxT]) * embossStrength;
          const newVal = Math.max(0, Math.min(255, 128 + diff));

          // Only modify for emboss effect visualization
          heightCtx.fillStyle = `rgb(${newVal}, ${newVal}, ${newVal})`;
          heightCtx.fillRect(x, y, 1, 1);
        }
      }
    };

    const drawExtruded = () => {
      const shapeCount = Math.floor(15 + actualDensity * 0.3);
      const extrudeDepth = patternSettings.extrudeDepth || 20;

      for (let i = 0; i < shapeCount; i++) {
        const x = random() * width;
        const y = random() * height;
        const size = 20 + random() * actualSize;
        const depth = extrudeDepth * (0.5 + random() * 0.5);
        const sides = 4 + Math.floor(random() * 4);
        const intensity = 0.5 + random() * 0.5;

        const drawExtrudedShape = () => {
          // Draw extrusion sides
          for (let s = 0; s < sides; s++) {
            const angle1 = (s / sides) * Math.PI * 2;
            const angle2 = ((s + 1) / sides) * Math.PI * 2;
            const x1 = x + Math.cos(angle1) * size;
            const y1 = y + Math.sin(angle1) * size;
            const x2 = x + Math.cos(angle2) * size;
            const y2 = y + Math.sin(angle2) * size;

            const sideBrightness = 0.3 + Math.abs(Math.cos(angle1 + Math.PI / 4)) * 0.7;

            ctx.fillStyle = colors.secondary;
            ctx.globalAlpha = sideBrightness;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2 + depth * 0.5, y2 + depth * 0.5);
            ctx.lineTo(x1 + depth * 0.5, y1 + depth * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;

            maskCtx.fillStyle = getMaskColor(intensity * sideBrightness);
            maskCtx.beginPath();
            maskCtx.moveTo(x1, y1);
            maskCtx.lineTo(x2, y2);
            maskCtx.lineTo(x2 + depth * 0.5, y2 + depth * 0.5);
            maskCtx.lineTo(x1 + depth * 0.5, y1 + depth * 0.5);
            maskCtx.closePath();
            maskCtx.fill();
          }

          // Draw top face
          ctx.fillStyle = colors.primary;
          maskCtx.fillStyle = getMaskColor(intensity);
          normalCtx.fillStyle = getNormalColor(0, -1);
          heightCtx.fillStyle = getHeightColor(0.8);
          aoCtx.fillStyle = getAOColor(1);

          allCtx.forEach((c) => {
            c.beginPath();
            for (let s = 0; s <= sides; s++) {
              const angle = (s / sides) * Math.PI * 2;
              const px = x + Math.cos(angle) * size;
              const py = y + Math.sin(angle) * size;
              if (s === 0) c.moveTo(px, py);
              else c.lineTo(px, py);
            }
            c.closePath();
            c.fill();
          });
        };
        drawSeamless(drawExtrudedShape);
      }
    };

    const drawIsometric = () => {
      const gridSize = Math.max(20, Math.floor(60 - actualDensity * 0.3));
      const isoAngle = Math.PI / 6;
      const cols = Math.ceil(width / gridSize) + 2;
      const rows = Math.ceil(height / gridSize) + 2;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const isoX = (i - j) * gridSize * Math.cos(isoAngle);
          const isoY = (i + j) * gridSize * Math.sin(isoAngle);
          const x = width / 2 + isoX;
          const y = isoY;

          if (random() > 0.3) {
            const height3d = gridSize * (0.5 + random() * 1.5);
            const intensity = 0.4 + random() * 0.6;

            // Draw isometric cube
            const drawIsoCube = () => {
              // Top
              ctx.fillStyle = colors.primary;
              maskCtx.fillStyle = getMaskColor(intensity);
              normalCtx.fillStyle = getNormalColor(0, -1);
              heightCtx.fillStyle = getHeightColor(0.9);

              allCtx.forEach((c) => {
                c.beginPath();
                c.moveTo(x, y - height3d);
                c.lineTo(x + gridSize * 0.5, y - height3d + gridSize * 0.25);
                c.lineTo(x, y - height3d + gridSize * 0.5);
                c.lineTo(x - gridSize * 0.5, y - height3d + gridSize * 0.25);
                c.closePath();
                c.fill();
              });

              // Left
              ctx.fillStyle = colors.secondary;
              normalCtx.fillStyle = getNormalColor(-0.7, 0.3);
              heightCtx.fillStyle = getHeightColor(0.5);
              aoCtx.fillStyle = getAOColor(0.6);

              allCtx.forEach((c) => {
                c.beginPath();
                c.moveTo(x - gridSize * 0.5, y - height3d + gridSize * 0.25);
                c.lineTo(x, y - height3d + gridSize * 0.5);
                c.lineTo(x, y + gridSize * 0.5);
                c.lineTo(x - gridSize * 0.5, y + gridSize * 0.25);
                c.closePath();
                c.fill();
              });

              // Right
              ctx.fillStyle = colors.accent || colors.secondary;
              normalCtx.fillStyle = getNormalColor(0.7, 0.3);
              heightCtx.fillStyle = getHeightColor(0.3);
              aoCtx.fillStyle = getAOColor(0.4);

              allCtx.forEach((c) => {
                c.beginPath();
                c.moveTo(x + gridSize * 0.5, y - height3d + gridSize * 0.25);
                c.lineTo(x, y - height3d + gridSize * 0.5);
                c.lineTo(x, y + gridSize * 0.5);
                c.lineTo(x + gridSize * 0.5, y + gridSize * 0.25);
                c.closePath();
                c.fill();
              });
            };
            drawSeamless(drawIsoCube);
          }
        }
      }
    };

    const drawWireframe3D = () => {
      const gridSize = Math.max(15, Math.floor(50 - actualDensity * 0.25));
      const cols = Math.ceil(width / gridSize) + 1;
      const rows = Math.ceil(height / gridSize) + 1;
      const waveHeight = patternSettings.depthIntensity;
      const noiseScale = 0.02 + complexity * 0.0003;

      setStroke(ctx);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = lineWidth;
      maskCtx.strokeStyle = getMaskColor(0.8);
      maskCtx.lineWidth = lineWidth * 1.5;

      // Horizontal lines
      for (let j = 0; j < rows; j++) {
        const y = j * gridSize;

        allCtx.forEach((c) => {
          c.beginPath();
        });

        for (let i = 0; i <= cols; i++) {
          const x = i * gridSize;
          const heightVal = fbm(x * noiseScale, y * noiseScale, 3, 0.5, 2, patternSettings.seed);
          const yOffset = heightVal * waveHeight;

          if (i === 0) {
            allCtx.forEach((c) => c.moveTo(x, y + yOffset));
          } else {
            allCtx.forEach((c) => c.lineTo(x, y + yOffset));
          }
        }

        allCtx.forEach((c) => c.stroke());
      }

      // Vertical lines
      for (let i = 0; i < cols; i++) {
        const x = i * gridSize;

        allCtx.forEach((c) => {
          c.beginPath();
        });

        for (let j = 0; j <= rows; j++) {
          const y = j * gridSize;
          const heightVal = fbm(x * noiseScale, y * noiseScale, 3, 0.5, 2, patternSettings.seed);
          const yOffset = heightVal * waveHeight;

          if (j === 0) {
            allCtx.forEach((c) => c.moveTo(x, y + yOffset));
          } else {
            allCtx.forEach((c) => c.lineTo(x, y + yOffset));
          }
        }

        allCtx.forEach((c) => c.stroke());
      }

      // Fill height map based on wireframe
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const heightVal = fbm(x * noiseScale, y * noiseScale, 3, 0.5, 2, patternSettings.seed);
          heightCtx.fillStyle = getHeightColor(heightVal);
          heightCtx.fillRect(x, y, 2, 2);
        }
      }
    };

    const drawMetaballs = () => {
      const ballCount = Math.floor(5 + actualDensity * 0.1);
      const balls: { x: number; y: number; r: number }[] = [];

      for (let i = 0; i < ballCount; i++) {
        balls.push({
          x: random() * width,
          y: random() * height,
          r: 30 + random() * actualSize * 2,
        });
      }

      const cellSize = 4;
      const threshold = 1;

      for (let py = 0; py < height; py += cellSize) {
        for (let px = 0; px < width; px += cellSize) {
          let sum = 0;
          balls.forEach((ball) => {
            const dx = px - ball.x;
            const dy = py - ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            sum += (ball.r * ball.r) / (dist * dist + 1);
          });

          if (sum > threshold) {
            const intensity = Math.min(1, sum / (threshold * 2));

            ctx.fillStyle = intensity > 0.8 ? colors.primary : colors.secondary;
            maskCtx.fillStyle = getMaskColor(intensity);
            normalCtx.fillStyle = getNormalColor(0, -intensity);
            roughCtx.fillStyle = getRoughColor(intensity);
            pearlCtx.fillStyle = getPearlColor(intensity);
            aoCtx.fillStyle = getAOColor(intensity);
            heightCtx.fillStyle = getHeightColor(intensity);

            allCtx.forEach((c) => {
              c.fillRect(px, py, cellSize, cellSize);
            });
          }
        }
      }
    };

    const drawDelaunay = () => {
      const pointCount = Math.floor(20 + actualDensity * 0.4);
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < pointCount; i++) {
        points.push({
          x: random() * width,
          y: random() * height,
        });
      }

      // Simple triangulation (not true Delaunay, but visually similar)
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const nearest: { p: typeof p1; dist: number }[] = [];

        for (let j = 0; j < points.length; j++) {
          if (i !== j) {
            const p2 = points[j];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            nearest.push({ p: p2, dist });
          }
        }

        nearest.sort((a, b) => a.dist - b.dist);
        const connections = nearest.slice(0, 3);

        // Draw triangles to nearest points
        for (let k = 0; k < connections.length - 1; k++) {
          const p2 = connections[k].p;
          const p3 = connections[k + 1].p;
          const intensity = 0.4 + random() * 0.6;

          ctx.fillStyle = [colors.primary, colors.secondary, colors.accent][k % 3] + '80';
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = lineWidth;
          maskCtx.fillStyle = getMaskColor(intensity);
          maskCtx.strokeStyle = getMaskColor(1);

          const drawTri = () => {
            allCtx.forEach((c, idx) => {
              c.beginPath();
              c.moveTo(p1.x, p1.y);
              c.lineTo(p2.x, p2.y);
              c.lineTo(p3.x, p3.y);
              c.closePath();
              if (random() > 0.5) c.fill();
              c.stroke();
            });
          };
          drawSeamless(drawTri);
        }
      }

      // Draw points
      ctx.fillStyle = colors.accent;
      maskCtx.fillStyle = getMaskColor(1);
      heightCtx.fillStyle = getHeightColor(1);
      points.forEach((p) => {
        allCtx.forEach((c) => {
          c.beginPath();
          c.arc(p.x, p.y, 3, 0, Math.PI * 2);
          c.fill();
        });
      });
    };

    const drawCoral = () => {
      const branchCount = Math.floor(5 + actualDensity * 0.1);

      const drawBranch = (x: number, y: number, angle: number, length: number, depth: number) => {
        if (depth <= 0 || length < 5) return;

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        const intensity = 0.3 + depth * 0.15;
        const branchWidth = depth * lineWidth * 0.5;

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = branchWidth;
        maskCtx.strokeStyle = getMaskColor(intensity);
        maskCtx.lineWidth = branchWidth;
        normalCtx.strokeStyle = getNormalColor(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5);
        normalCtx.lineWidth = branchWidth;
        heightCtx.strokeStyle = getHeightColor(intensity);
        heightCtx.lineWidth = branchWidth;

        allCtx.forEach((c) => {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(endX, endY);
          c.stroke();
        });

        // Branches
        const branchAngle = 0.3 + random() * 0.4;
        const branchLen = length * (0.6 + random() * 0.3);

        if (random() > 0.3) {
          drawBranch(endX, endY, angle - branchAngle, branchLen, depth - 1);
        }
        if (random() > 0.3) {
          drawBranch(endX, endY, angle + branchAngle, branchLen, depth - 1);
        }
        if (random() > 0.7) {
          drawBranch(endX, endY, angle, branchLen * 0.8, depth - 1);
        }
      };

      for (let i = 0; i < branchCount; i++) {
        const startX = random() * width;
        const startY = height * 0.9 + random() * height * 0.1;
        const startAngle = -Math.PI / 2 + (random() - 0.5) * 0.5;
        const startLength = 30 + random() * 50;
        const maxDepth = 4 + Math.floor(complexity * 0.05);

        drawBranch(startX, startY, startAngle, startLength, maxDepth);
      }
    };

    const drawLightning = () => {
      const boltCount = Math.floor(3 + actualDensity * 0.05);

      const drawBolt = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
        if (depth <= 0 || length < 10) return;

        const segments = 3 + Math.floor(random() * 3);
        const segmentLen = length / segments;

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = width;
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = width * 3;
        maskCtx.strokeStyle = getMaskColor(1);
        maskCtx.lineWidth = width;
        heightCtx.strokeStyle = getHeightColor(0.9);
        heightCtx.lineWidth = width;

        let currentX = x;
        let currentY = y;

        for (let s = 0; s < segments; s++) {
          const deviation = (random() - 0.5) * 0.8;
          const newAngle = angle + deviation;
          const nextX = currentX + Math.cos(newAngle) * segmentLen;
          const nextY = currentY + Math.sin(newAngle) * segmentLen;

          allCtx.forEach((c) => {
            c.beginPath();
            c.moveTo(currentX, currentY);
            c.lineTo(nextX, nextY);
            c.stroke();
          });

          // Branch
          if (random() > 0.6 && depth > 1) {
            const branchAngle = newAngle + (random() > 0.5 ? 1 : -1) * (0.3 + random() * 0.5);
            drawBolt(currentX, currentY, branchAngle, length * 0.5, width * 0.6, depth - 1);
          }

          currentX = nextX;
          currentY = nextY;
        }

        ctx.shadowBlur = patternSettings.glowIntensity;
      };

      for (let i = 0; i < boltCount; i++) {
        const startX = random() * width;
        const startY = 0;
        const angle = Math.PI / 2 + (random() - 0.5) * 0.5;
        const length = height * (0.5 + random() * 0.5);
        const boltWidth = 2 + random() * 3;
        const maxDepth = 3 + Math.floor(random() * 2);

        drawBolt(startX, startY, angle, length, boltWidth, maxDepth);
      }
    };

    const drawCracks = () => {
      const crackCount = Math.floor(10 + actualDensity * 0.2);

      for (let c = 0; c < crackCount; c++) {
        let x = random() * width;
        let y = random() * height;
        const mainAngle = random() * Math.PI * 2;
        const length = 50 + random() * 150;
        const segments = Math.floor(length / 10);
        const intensity = 0.5 + random() * 0.5;

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = lineWidth;
        maskCtx.strokeStyle = getMaskColor(intensity);
        normalCtx.strokeStyle = getNormalColor(0, 1);
        heightCtx.strokeStyle = getHeightColor(0);
        aoCtx.strokeStyle = getAOColor(0.3);

        for (let s = 0; s < segments; s++) {
          const angle = mainAngle + (random() - 0.5) * 0.6;
          const segLen = 5 + random() * 15;
          const nextX = x + Math.cos(angle) * segLen;
          const nextY = y + Math.sin(angle) * segLen;

          allCtx.forEach((ctx2) => {
            ctx2.beginPath();
            ctx2.moveTo(x, y);
            ctx2.lineTo(nextX, nextY);
            ctx2.stroke();
          });

          // Branch cracks
          if (random() > 0.7) {
            const branchAngle = angle + (random() > 0.5 ? 1 : -1) * (0.3 + random() * 0.8);
            const branchLen = segLen * (0.3 + random() * 0.5);
            const branchX = nextX + Math.cos(branchAngle) * branchLen;
            const branchY = nextY + Math.sin(branchAngle) * branchLen;

            ctx.lineWidth = lineWidth * 0.5;
            allCtx.forEach((ctx2) => {
              ctx2.beginPath();
              ctx2.moveTo(nextX, nextY);
              ctx2.lineTo(branchX, branchY);
              ctx2.stroke();
            });
            ctx.lineWidth = lineWidth;
          }

          x = nextX;
          y = nextY;
        }
      }
    };

    const drawNebula = () => {
      const cloudCount = Math.floor(5 + actualDensity * 0.1);

      for (let c = 0; c < cloudCount; c++) {
        const cx = random() * width;
        const cy = random() * height;
        const size = 100 + random() * 200;
        const intensity = 0.3 + random() * 0.5;

        // Multiple overlapping gradients for nebula effect
        for (let layer = 0; layer < 3; layer++) {
          const offsetX = (random() - 0.5) * size * 0.5;
          const offsetY = (random() - 0.5) * size * 0.5;
          const layerSize = size * (0.5 + random() * 0.5);

          const gradient = ctx.createRadialGradient(
            cx + offsetX, cy + offsetY, 0,
            cx + offsetX, cy + offsetY, layerSize
          );

          const layerColor = [colors.primary, colors.secondary, colors.accent][layer % 3];
          gradient.addColorStop(0, layerColor + '60');
          gradient.addColorStop(0.5, layerColor + '30');
          gradient.addColorStop(1, 'transparent');

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }

        // Stars in nebula
        const starCount = Math.floor(20 + random() * 30);
        for (let s = 0; s < starCount; s++) {
          const sx = cx + (random() - 0.5) * size;
          const sy = cy + (random() - 0.5) * size;
          const starSize = 1 + random() * 2;

          ctx.fillStyle = colors.accent;
          maskCtx.fillStyle = getMaskColor(intensity);
          heightCtx.fillStyle = getHeightColor(0.8);
          pearlCtx.fillStyle = getPearlColor(1);

          allCtx.forEach((ctx2) => {
            ctx2.beginPath();
            ctx2.arc(sx, sy, starSize, 0, Math.PI * 2);
            ctx2.fill();
          });
        }
      }
    };

    const drawGalaxy = () => {
      const cx = width / 2;
      const cy = height / 2;
      const armCount = 2 + Math.floor(random() * 3);
      const maxRadius = Math.min(width, height) * 0.45;
      const starCount = Math.floor(200 + actualDensity * 3);

      for (let i = 0; i < starCount; i++) {
        const armIndex = Math.floor(random() * armCount);
        const baseAngle = (armIndex / armCount) * Math.PI * 2;
        const radius = random() * maxRadius;
        const spiralOffset = radius * 0.02;
        const angle = baseAngle + spiralOffset + (random() - 0.5) * 0.5;

        const x = cx + Math.cos(angle) * radius + (random() - 0.5) * 30;
        const y = cy + Math.sin(angle) * radius + (random() - 0.5) * 30;
        const starSize = 0.5 + random() * 2;
        const intensity = 1 - (radius / maxRadius) * 0.7;

        ctx.fillStyle = radius < maxRadius * 0.2 ? colors.accent : colors.primary;
        maskCtx.fillStyle = getMaskColor(intensity);
        pearlCtx.fillStyle = getPearlColor(intensity);
        heightCtx.fillStyle = getHeightColor(intensity * 0.5);

        const drawStar = () => {
          [ctx, maskCtx, pearlCtx, heightCtx].forEach((c) => {
            c.beginPath();
            c.arc(x, y, starSize, 0, Math.PI * 2);
            c.fill();
          });
        };
        drawStar();
      }

      // Central glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.3);
      gradient.addColorStop(0, colors.accent + '80');
      gradient.addColorStop(0.5, colors.primary + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    // ==================== EXECUTE PATTERN ====================

    switch (patternSettings.style) {
      // Geometric patterns
      case 'circuit':
        drawCircuit();
        break;
      case 'hexgrid':
        drawHexGrid();
        break;
      case 'triangles':
        drawTriangles();
        break;
      case 'grid':
        drawGrid();
        break;
      case 'dots':
        drawDots();
        break;
      case 'diamonds':
        drawDiamonds();
        break;
      case 'circles':
        drawCircles();
        break;
      case 'stars':
        drawStars();
        break;
      case 'honeycomb':
        drawHoneycomb();
        break;
      case 'mandala':
        drawGeometric();
        break;
      case 'penrose':
        drawDelaunay();
        break;
      case 'truchet':
        drawLabyrinth();
        break;

      // Tech patterns
      case 'chipset':
        drawChipset();
        break;
      case 'datastream':
        drawDataStream();
        break;
      case 'barcode':
        drawBarcode();
        break;
      case 'glitch':
        drawGlitch();
        break;
      case 'scanlines':
        drawScanlines();
        break;
      case 'neural':
        drawCircuit();
        break;
      case 'dna':
        drawSpiral();
        break;
      case 'carbon':
        drawCrosshatch();
        break;
      case 'motherboard':
        drawChipset();
        break;
      case 'processor':
        drawChipset();
        break;
      case 'nanotech':
        drawDots();
        break;
      case 'quantum':
        drawMetaballs();
        break;
      case 'hologram':
        drawGlitch();
        break;
      case 'radar':
        drawCircles();
        break;
      case 'oscilloscope':
        drawWaves();
        break;
      case 'frequency':
        drawWaves();
        break;
      case 'waveform':
        drawWaves();
        break;

      // Organic patterns
      case 'waves':
        drawWaves();
        break;
      case 'spiral':
        drawSpiral();
        break;
      case 'flowfield':
        drawFlowField();
        break;
      case 'organic':
        drawFlowField();
        break;
      case 'scales':
        drawScales();
        break;
      case 'marble':
        drawNoise();
        break;
      case 'wood':
        drawNoise();
        break;
      case 'topographic':
        drawWireframe3D();
        break;
      case 'crystal':
        drawVoronoi();
        break;
      case 'coral':
        drawCoral();
        break;
      case 'veins':
        drawCoral();
        break;
      case 'roots':
        drawCoral();
        break;
      case 'lightning':
        drawLightning();
        break;
      case 'cracks':
        drawCracks();
        break;
      case 'erosion':
        drawTerrain3D();
        break;
      case 'terrazzo':
        drawMosaic();
        break;
      case 'agate':
        drawCircles();
        break;
      case 'geode':
        drawVoronoi();
        break;

      // Noise patterns
      case 'noise':
        drawNoise();
        break;
      case 'voronoi':
        drawVoronoi();
        break;
      case 'plasma':
        drawNoise();
        break;
      case 'fractal':
        drawTerrain3D();
        break;
      case 'grunge':
        drawNoise();
        break;
      case 'reaction':
        drawMetaballs();
        break;
      case 'cellular':
        drawVoronoi();
        break;
      case 'caustics':
        drawVoronoi();
        break;
      case 'nebula':
        drawNebula();
        break;
      case 'galaxy':
        drawGalaxy();
        break;

      // Camo patterns
      case 'digicamo':
        drawDigiCamo();
        break;
      case 'camo':
        drawDigiCamo();
        break;
      case 'splatter':
        drawMosaic();
        break;
      case 'sediment':
        drawTerrain3D();
        break;

      // Artistic patterns
      case 'labyrinth':
        drawLabyrinth();
        break;
      case 'crosshatch':
        drawCrosshatch();
        break;
      case 'celtic':
        drawLabyrinth();
        break;
      case 'mosaic':
        drawMosaic();
        break;
      case 'plaid':
        drawPlaid();
        break;
      case 'zigzag':
        drawZigzag();
        break;
      case 'halftone':
        drawHalftone();
        break;
      case 'geometric':
        drawGeometric();
        break;
      case 'tech':
        drawCircuit();
        break;
      case 'guilloche':
        drawSpiral();
        break;
      case 'moire':
        drawCircles();
        break;
      case 'interference':
        drawWaves();
        break;
      case 'stippling':
        drawDots();
        break;
      case 'engraving':
        drawCrosshatch();
        break;
      case 'lsystem':
        drawCoral();
        break;

      // 3D patterns
      case 'cubes3d':
        drawCubes3D();
        break;
      case 'pyramids3d':
        drawPyramids3D();
        break;
      case 'spheres3d':
        drawSpheres3D();
        break;
      case 'cylinders3d':
        drawCylinders3D();
        break;
      case 'terrain3d':
        drawTerrain3D();
        break;
      case 'parallax':
        drawParallax();
        break;
      case 'emboss':
        drawEmboss();
        break;
      case 'extruded':
        drawExtruded();
        break;
      case 'isometric':
        drawIsometric();
        break;
      case 'wireframe3d':
        drawWireframe3D();
        break;
      case 'displacement':
        drawTerrain3D();
        break;
      case 'heightfield':
        drawTerrain3D();
        break;
      case 'layered3d':
        drawParallax();
        break;
      case 'shadowbox':
        drawExtruded();
        break;
      case 'hatching3d':
        drawCrosshatch();
        break;

      // Advanced patterns
      case 'metaballs':
        drawMetaballs();
        break;
      case 'subdivision':
        drawDelaunay();
        break;
      case 'delaunay':
        drawDelaunay();
        break;

      default:
        drawCircuit();
    }

    // Restore rotation
    if (patternSettings.rotation !== 0) {
      allCtx.forEach((c) => c.restore());
    }

    // ==================== POST-PROCESSING ====================

    // Scanlines on pattern only
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    // Noise on pattern
    if (patternSettings.noiseAmount > 0) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (random() - 0.5) * patternSettings.noiseAmount;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Vignette on pattern
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, colors.background + '80');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Generate proper normal map from height
    const normalImageData = normalCtx.getImageData(0, 0, width, height);
    const normalData = normalImageData.data;
    const strength = normalSettings.strength / 50;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxL = (y * width + x - 1) * 4;
        const idxR = (y * width + x + 1) * 4;
        const idxU = ((y - 1) * width + x) * 4;
        const idxD = ((y + 1) * width + x) * 4;

        const heightL = normalData[idxL] / 255;
        const heightR = normalData[idxR] / 255;
        const heightU = normalData[idxU] / 255;
        const heightD = normalData[idxD] / 255;

        const dx = (heightL - heightR) * strength;
        const dy = (heightU - heightD) * strength;

        normalData[idx] = Math.floor((dx + 1) * 127.5);
        normalData[idx + 1] = Math.floor((dy + 1) * 127.5);
        normalData[idx + 2] = 255;
      }
    }
    normalCtx.putImageData(normalImageData, 0, 0);

    // Invert masks if needed
    if (maskSettings.invertMask) {
      const maskImageData = maskCtx.getImageData(0, 0, width, height);
      const maskData = maskImageData.data;
      for (let i = 0; i < maskData.length; i += 4) {
        maskData[i] = 255 - maskData[i];
        maskData[i + 1] = 255 - maskData[i + 1];
        maskData[i + 2] = 255 - maskData[i + 2];
      }
      maskCtx.putImageData(maskImageData, 0, 0);
    }

    if (roughnessSettings.invertRoughness) {
      const roughImageData = roughCtx.getImageData(0, 0, width, height);
      const roughData = roughImageData.data;
      for (let i = 0; i < roughData.length; i += 4) {
        roughData[i] = 255 - roughData[i];
        roughData[i + 1] = 255 - roughData[i + 1];
        roughData[i + 2] = 255 - roughData[i + 2];
      }
      roughCtx.putImageData(roughImageData, 0, 0);
    }

    if (normalSettings.invertHeight) {
      const nImageData = normalCtx.getImageData(0, 0, width, height);
      const nData = nImageData.data;
      for (let i = 0; i < nData.length; i += 4) {
        nData[i] = 255 - nData[i];
        nData[i + 1] = 255 - nData[i + 1];
      }
      normalCtx.putImageData(nImageData, 0, 0);
    }
  }, [patternSettings, maskSettings, normalSettings, roughnessSettings, pearlSettings, aoSettings, heightSettings, resolution]);

  // Generate on settings change
  useEffect(() => {
    generateAll();
  }, [generateAll]);

  // Get canvas ref based on tab
  const getCanvasRef = (tabId: TextureMapType) => {
    switch (tabId) {
      case 'pattern':
        return patternCanvasRef;
      case 'mask':
        return maskCanvasRef;
      case 'normal':
        return normalCanvasRef;
      case 'roughness':
        return roughnessCanvasRef;
      case 'pearlescence':
        return pearlCanvasRef;
      case 'ao':
        return aoCanvasRef;
      case 'height':
        return heightCanvasRef;
      default:
        return patternCanvasRef;
    }
  };

  return (
    <div className="relative">
      {/* All canvases (hidden except active) */}
      {TEXTURE_TABS.map((tab) => (
        <canvas
          key={tab.id}
          ref={getCanvasRef(tab.id)}
          width={resolution}
          height={resolution}
          className={cn(
            'max-w-full h-auto rounded-lg border border-zinc-800',
            activeTab === tab.id ? 'block' : 'hidden'
          )}
          style={{ maxHeight: '70vh' }}
        />
      ))}
    </div>
  );
});

const TEXTURE_TABS: { id: TextureMapType; label: string }[] = [
  { id: 'pattern', label: 'Pattern' },
  { id: 'mask', label: 'Mask' },
  { id: 'normal', label: 'Normal' },
  { id: 'roughness', label: 'Roughness' },
  { id: 'pearlescence', label: 'Pearl' },
  { id: 'ao', label: 'AO' },
  { id: 'height', label: 'Height' },
];
