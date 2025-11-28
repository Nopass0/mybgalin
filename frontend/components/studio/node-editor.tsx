'use client';

/**
 * Node Editor Component
 *
 * A visual node-based material editor for creating procedural textures
 * compatible with CS2 Workshop Tools. Supports real-time preview,
 * texture baking, and export functionality.
 *
 * @module components/studio/node-editor
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  Play,
  Save,
  Search,
  Palette,
  Layers,
  Sparkles,
  Grid3X3,
  Waves,
  Filter,
  Move,
  Circle,
  Sun,
  Moon,
  Zap,
  Box,
  Eye,
  Download,
  RefreshCw,
  Settings,
  Camera,
  Maximize2,
  PaintBucket,
} from 'lucide-react';
import { useStudioEditor } from '@/hooks/useStudioEditor';
import {
  SmartMaterial,
  MaterialNode,
  MaterialNodeType,
  NodeConnection,
  NodePort,
  NodeParameter,
} from '@/types/studio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ==================== NODE DEFINITIONS ====================

/**
 * Complete list of node categories with all available node types.
 * Each node has a type identifier, display name, and description.
 */
const NODE_CATEGORIES = [
  {
    name: 'Input',
    icon: Circle,
    description: 'Input values and textures',
    nodes: [
      { type: 'color-input', name: 'Color', description: 'Solid color input' },
      { type: 'texture-input', name: 'Texture', description: 'Image texture input' },
      { type: 'gradient-input', name: 'Gradient', description: 'Color gradient' },
      { type: 'uv-input', name: 'UV Coordinates', description: 'Texture coordinates' },
      { type: 'position-input', name: 'Position', description: 'World/object position' },
      { type: 'normal-input', name: 'Normal', description: 'Surface normal vector' },
      { type: 'time-input', name: 'Time', description: 'Animation time value' },
      { type: 'value-input', name: 'Value', description: 'Numeric constant' },
    ],
  },
  {
    name: 'Lighting',
    icon: Sun,
    description: 'Lighting and environment',
    nodes: [
      { type: 'light-direction', name: 'Light Direction', description: 'Primary light vector' },
      { type: 'light-color', name: 'Light Color', description: 'Light color and intensity' },
      { type: 'ambient-light', name: 'Ambient', description: 'Ambient light contribution' },
      { type: 'fresnel', name: 'Fresnel', description: 'View-dependent reflection' },
      { type: 'reflection', name: 'Reflection', description: 'Environment reflection' },
      { type: 'specular', name: 'Specular', description: 'Specular highlight' },
      { type: 'diffuse', name: 'Diffuse', description: 'Diffuse shading' },
      { type: 'shadow', name: 'Shadow', description: 'Shadow mapping' },
      { type: 'ao-input', name: 'Ambient Occlusion', description: 'AO input' },
    ],
  },
  {
    name: 'Noise',
    icon: Waves,
    description: 'Procedural noise generators',
    nodes: [
      { type: 'noise-perlin', name: 'Perlin Noise', description: 'Classic Perlin noise' },
      { type: 'noise-simplex', name: 'Simplex Noise', description: 'Improved simplex noise' },
      { type: 'noise-worley', name: 'Worley/Cellular', description: 'Cell/Voronoi noise' },
      { type: 'noise-fbm', name: 'FBM', description: 'Fractal Brownian Motion' },
      { type: 'noise-turbulence', name: 'Turbulence', description: 'Turbulent noise' },
      { type: 'noise-ridged', name: 'Ridged', description: 'Ridged multifractal' },
      { type: 'noise-billow', name: 'Billow', description: 'Billowy clouds noise' },
      { type: 'noise-voronoi', name: 'Voronoi', description: 'Voronoi cells' },
      { type: 'noise-gradient', name: 'Gradient Noise', description: 'Smooth gradient noise' },
      { type: 'noise-value', name: 'Value Noise', description: 'Simple value noise' },
      { type: 'noise-white', name: 'White Noise', description: 'Random white noise' },
      { type: 'noise-blue', name: 'Blue Noise', description: 'Blue noise dithering' },
    ],
  },
  {
    name: 'Pattern',
    icon: Grid3X3,
    description: 'Geometric patterns',
    nodes: [
      { type: 'pattern-checker', name: 'Checker', description: 'Checkerboard pattern' },
      { type: 'pattern-stripes', name: 'Stripes', description: 'Stripe pattern' },
      { type: 'pattern-dots', name: 'Dots', description: 'Dot grid pattern' },
      { type: 'pattern-grid', name: 'Grid', description: 'Grid lines' },
      { type: 'pattern-hexagon', name: 'Hexagon', description: 'Hexagonal tiling' },
      { type: 'pattern-brick', name: 'Brick', description: 'Brick wall pattern' },
      { type: 'pattern-tile', name: 'Tile', description: 'Square tile pattern' },
      { type: 'pattern-wave', name: 'Wave', description: 'Sine wave pattern' },
      { type: 'pattern-zigzag', name: 'Zigzag', description: 'Zigzag pattern' },
      { type: 'pattern-circle', name: 'Circles', description: 'Concentric circles' },
      { type: 'pattern-spiral', name: 'Spiral', description: 'Spiral pattern' },
      { type: 'pattern-weave', name: 'Weave', description: 'Woven fabric pattern' },
    ],
  },
  {
    name: 'Math',
    icon: Layers,
    description: 'Mathematical operations',
    nodes: [
      { type: 'math-add', name: 'Add', description: 'Add values (A + B)' },
      { type: 'math-subtract', name: 'Subtract', description: 'Subtract values (A - B)' },
      { type: 'math-multiply', name: 'Multiply', description: 'Multiply values (A × B)' },
      { type: 'math-divide', name: 'Divide', description: 'Divide values (A ÷ B)' },
      { type: 'math-power', name: 'Power', description: 'Power (A^B)' },
      { type: 'math-sqrt', name: 'Square Root', description: 'Square root √A' },
      { type: 'math-abs', name: 'Absolute', description: 'Absolute value |A|' },
      { type: 'math-floor', name: 'Floor', description: 'Round down' },
      { type: 'math-ceil', name: 'Ceiling', description: 'Round up' },
      { type: 'math-round', name: 'Round', description: 'Round to nearest' },
      { type: 'math-fract', name: 'Fraction', description: 'Fractional part' },
      { type: 'math-mod', name: 'Modulo', description: 'Remainder (A mod B)' },
      { type: 'math-min', name: 'Minimum', description: 'Minimum of A, B' },
      { type: 'math-max', name: 'Maximum', description: 'Maximum of A, B' },
      { type: 'math-lerp', name: 'Lerp', description: 'Linear interpolation' },
      { type: 'math-smoothstep', name: 'Smoothstep', description: 'Smooth interpolation' },
      { type: 'math-clamp', name: 'Clamp', description: 'Clamp between min/max' },
      { type: 'math-remap', name: 'Remap', description: 'Remap value range' },
      { type: 'math-sin', name: 'Sine', description: 'Sine function' },
      { type: 'math-cos', name: 'Cosine', description: 'Cosine function' },
      { type: 'math-tan', name: 'Tangent', description: 'Tangent function' },
      { type: 'math-atan2', name: 'Atan2', description: 'Two-argument arctangent' },
      { type: 'math-dot', name: 'Dot Product', description: 'Vector dot product' },
      { type: 'math-cross', name: 'Cross Product', description: 'Vector cross product' },
      { type: 'math-normalize', name: 'Normalize', description: 'Normalize vector' },
      { type: 'math-length', name: 'Length', description: 'Vector length' },
      { type: 'math-distance', name: 'Distance', description: 'Distance between points' },
    ],
  },
  {
    name: 'Color',
    icon: Palette,
    description: 'Color manipulation',
    nodes: [
      { type: 'color-mix', name: 'Mix', description: 'Blend two colors' },
      { type: 'color-overlay', name: 'Overlay', description: 'Overlay blend mode' },
      { type: 'color-screen', name: 'Screen', description: 'Screen blend mode' },
      { type: 'color-multiply', name: 'Multiply', description: 'Multiply blend mode' },
      { type: 'color-add', name: 'Add', description: 'Additive blend' },
      { type: 'color-hue-shift', name: 'Hue Shift', description: 'Rotate hue' },
      { type: 'color-saturation', name: 'Saturation', description: 'Adjust saturation' },
      { type: 'color-brightness', name: 'Brightness', description: 'Adjust brightness' },
      { type: 'color-contrast', name: 'Contrast', description: 'Adjust contrast' },
      { type: 'color-gamma', name: 'Gamma', description: 'Gamma correction' },
      { type: 'color-levels', name: 'Levels', description: 'Input/output levels' },
      { type: 'color-curves', name: 'Curves', description: 'Tone curves' },
      { type: 'color-invert', name: 'Invert', description: 'Invert colors' },
      { type: 'color-grayscale', name: 'Grayscale', description: 'Convert to grayscale' },
      { type: 'color-sepia', name: 'Sepia', description: 'Sepia tone' },
      { type: 'color-threshold', name: 'Threshold', description: 'Binary threshold' },
      { type: 'color-posterize', name: 'Posterize', description: 'Reduce color levels' },
      { type: 'color-split', name: 'Split RGB', description: 'Separate R, G, B channels' },
      { type: 'color-combine', name: 'Combine RGB', description: 'Merge R, G, B channels' },
      { type: 'color-hsv-split', name: 'Split HSV', description: 'Separate H, S, V' },
      { type: 'color-hsv-combine', name: 'Combine HSV', description: 'Merge H, S, V' },
      { type: 'color-gradient-map', name: 'Gradient Map', description: 'Map grayscale to gradient' },
    ],
  },
  {
    name: 'Filter',
    icon: Filter,
    description: 'Image filters and effects',
    nodes: [
      { type: 'filter-blur', name: 'Blur', description: 'Gaussian blur' },
      { type: 'filter-sharpen', name: 'Sharpen', description: 'Sharpen edges' },
      { type: 'filter-edge', name: 'Edge Detect', description: 'Sobel edge detection' },
      { type: 'filter-emboss', name: 'Emboss', description: 'Emboss effect' },
      { type: 'filter-dilate', name: 'Dilate', description: 'Expand bright areas' },
      { type: 'filter-erode', name: 'Erode', description: 'Shrink bright areas' },
      { type: 'filter-median', name: 'Median', description: 'Median filter (denoise)' },
      { type: 'filter-warp', name: 'Warp', description: 'Displacement warp' },
      { type: 'filter-distort', name: 'Distort', description: 'Barrel/pincushion' },
      { type: 'filter-pixelate', name: 'Pixelate', description: 'Pixelation effect' },
      { type: 'filter-mosaic', name: 'Mosaic', description: 'Mosaic tiles' },
      { type: 'filter-chromatic', name: 'Chromatic Aberration', description: 'Color fringing' },
      { type: 'filter-vignette', name: 'Vignette', description: 'Edge darkening' },
    ],
  },
  {
    name: 'Transform',
    icon: Move,
    description: 'Coordinate transformations',
    nodes: [
      { type: 'transform-translate', name: 'Translate', description: 'Offset UVs' },
      { type: 'transform-rotate', name: 'Rotate', description: 'Rotate UVs' },
      { type: 'transform-scale', name: 'Scale', description: 'Scale UVs' },
      { type: 'transform-tile', name: 'Tile', description: 'Repeat/tile pattern' },
      { type: 'transform-mirror', name: 'Mirror', description: 'Mirror horizontally/vertically' },
      { type: 'transform-flip', name: 'Flip', description: 'Flip UV direction' },
      { type: 'transform-polar', name: 'Polar', description: 'Cartesian to polar' },
      { type: 'transform-spherical', name: 'Spherical', description: 'Spherical projection' },
      { type: 'transform-triplanar', name: 'Triplanar', description: 'Triplanar mapping' },
      { type: 'transform-twirl', name: 'Twirl', description: 'Spiral distortion' },
    ],
  },
  {
    name: 'CS2 Materials',
    icon: Box,
    description: 'CS2-specific material nodes',
    nodes: [
      { type: 'cs2-wear', name: 'Wear Pattern', description: 'Weapon wear/damage' },
      { type: 'cs2-scratches', name: 'Scratches', description: 'Surface scratches' },
      { type: 'cs2-dirt', name: 'Dirt/Grime', description: 'Dirt accumulation' },
      { type: 'cs2-edge-wear', name: 'Edge Wear', description: 'Edge damage pattern' },
      { type: 'cs2-fingerprints', name: 'Fingerprints', description: 'Fingerprint smudges' },
      { type: 'cs2-grunge', name: 'Grunge', description: 'Grunge overlay' },
      { type: 'cs2-rust', name: 'Rust', description: 'Metal corrosion' },
      { type: 'cs2-paint-chip', name: 'Paint Chip', description: 'Chipped paint' },
      { type: 'cs2-holographic', name: 'Holographic', description: 'Holo sticker effect' },
      { type: 'cs2-glitter', name: 'Glitter', description: 'Glitter particle effect' },
      { type: 'cs2-foil', name: 'Foil', description: 'Metallic foil effect' },
      { type: 'cs2-pearlescent', name: 'Pearlescent', description: 'Pearl finish' },
    ],
  },
  {
    name: 'Output',
    icon: Sparkles,
    description: 'Final output channels',
    nodes: [
      { type: 'output-color', name: 'Color (Albedo)', description: 'Base color output' },
      { type: 'output-normal', name: 'Normal Map', description: 'Surface normals output' },
      { type: 'output-metalness', name: 'Metalness', description: 'Metal/non-metal output' },
      { type: 'output-roughness', name: 'Roughness', description: 'Surface roughness output' },
      { type: 'output-ao', name: 'Ambient Occlusion', description: 'AO map output' },
      { type: 'output-emission', name: 'Emission', description: 'Emissive color output' },
      { type: 'output-height', name: 'Height', description: 'Height/displacement map' },
      { type: 'output-opacity', name: 'Opacity', description: 'Transparency output' },
      { type: 'output-combined', name: 'Combined Preview', description: 'PBR preview' },
    ],
  },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Generates a unique identifier for nodes and connections.
 * @returns A random alphanumeric string
 */
const generateId = (): string => Math.random().toString(36).substr(2, 9);

/**
 * Creates a new node with default configuration based on its type.
 * Configures inputs, outputs, and parameters specific to each node type.
 *
 * @param type - The type of node to create
 * @param position - The initial position of the node on the canvas
 * @returns A fully configured MaterialNode object
 */
const createNode = (type: MaterialNodeType, position: { x: number; y: number }): MaterialNode => {
  const baseNode: MaterialNode = {
    id: generateId(),
    type,
    position,
    inputs: [],
    outputs: [],
    parameters: [],
  };

  // Configure node based on type
  switch (type) {
    // ===== INPUT NODES =====
    case 'color-input':
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.parameters = [
        { id: 'color', name: 'Color', type: 'color', value: '#ff6600' },
      ];
      break;

    case 'value-input':
      baseNode.outputs = [{ id: 'value', name: 'Value', type: 'float' }];
      baseNode.parameters = [
        { id: 'value', name: 'Value', type: 'float', value: 0.5, min: 0, max: 1 },
      ];
      break;

    case 'texture-input':
      baseNode.outputs = [
        { id: 'color', name: 'Color', type: 'color' },
        { id: 'alpha', name: 'Alpha', type: 'float' },
      ];
      baseNode.parameters = [
        { id: 'texture', name: 'Texture', type: 'texture', value: '' },
      ];
      break;

    case 'uv-input':
      baseNode.outputs = [
        { id: 'uv', name: 'UV', type: 'vector2' },
        { id: 'u', name: 'U', type: 'float' },
        { id: 'v', name: 'V', type: 'float' },
      ];
      break;

    case 'gradient-input':
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.inputs = [{ id: 'fac', name: 'Factor', type: 'float' }];
      baseNode.parameters = [
        { id: 'color1', name: 'Color 1', type: 'color', value: '#000000' },
        { id: 'color2', name: 'Color 2', type: 'color', value: '#ffffff' },
        { id: 'type', name: 'Type', type: 'enum', value: 'linear', options: ['linear', 'radial', 'angular', 'diamond'] },
      ];
      break;

    // ===== LIGHTING NODES =====
    case 'light-direction':
      baseNode.outputs = [{ id: 'dir', name: 'Direction', type: 'vector3' }];
      baseNode.parameters = [
        { id: 'azimuth', name: 'Azimuth', type: 'float', value: 45, min: 0, max: 360 },
        { id: 'elevation', name: 'Elevation', type: 'float', value: 45, min: 0, max: 90 },
      ];
      break;

    case 'light-color':
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.parameters = [
        { id: 'color', name: 'Color', type: 'color', value: '#ffffff' },
        { id: 'intensity', name: 'Intensity', type: 'float', value: 1, min: 0, max: 5 },
        { id: 'temperature', name: 'Temperature', type: 'float', value: 6500, min: 1000, max: 12000 },
      ];
      break;

    case 'fresnel':
      baseNode.inputs = [
        { id: 'normal', name: 'Normal', type: 'vector3' },
        { id: 'ior', name: 'IOR', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'fac', name: 'Factor', type: 'float' }];
      baseNode.parameters = [
        { id: 'ior', name: 'IOR', type: 'float', value: 1.45, min: 1, max: 3 },
      ];
      break;

    case 'specular':
      baseNode.inputs = [
        { id: 'normal', name: 'Normal', type: 'vector3' },
        { id: 'light', name: 'Light Dir', type: 'vector3' },
        { id: 'roughness', name: 'Roughness', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'spec', name: 'Specular', type: 'float' }];
      baseNode.parameters = [
        { id: 'power', name: 'Power', type: 'float', value: 32, min: 1, max: 256 },
        { id: 'intensity', name: 'Intensity', type: 'float', value: 1, min: 0, max: 2 },
      ];
      break;

    case 'diffuse':
      baseNode.inputs = [
        { id: 'normal', name: 'Normal', type: 'vector3' },
        { id: 'light', name: 'Light Dir', type: 'vector3' },
      ];
      baseNode.outputs = [{ id: 'diff', name: 'Diffuse', type: 'float' }];
      baseNode.parameters = [
        { id: 'wrap', name: 'Wrap', type: 'float', value: 0, min: -1, max: 1 },
      ];
      break;

    // ===== NOISE NODES =====
    case 'noise-perlin':
    case 'noise-simplex':
    case 'noise-value':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [
        { id: 'value', name: 'Value', type: 'float' },
        { id: 'color', name: 'Color', type: 'color' },
      ];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 10, min: 0.1, max: 100 },
        { id: 'detail', name: 'Detail', type: 'int', value: 4, min: 1, max: 16 },
        { id: 'roughness', name: 'Roughness', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'noise-worley':
    case 'noise-voronoi':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [
        { id: 'distance', name: 'Distance', type: 'float' },
        { id: 'color', name: 'Color', type: 'color' },
        { id: 'cell', name: 'Cell ID', type: 'float' },
      ];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 5, min: 0.1, max: 50 },
        { id: 'randomness', name: 'Randomness', type: 'float', value: 1, min: 0, max: 1 },
        { id: 'metric', name: 'Distance', type: 'enum', value: 'euclidean', options: ['euclidean', 'manhattan', 'chebyshev'] },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'noise-fbm':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'value', name: 'Value', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 5, min: 0.1, max: 50 },
        { id: 'octaves', name: 'Octaves', type: 'int', value: 6, min: 1, max: 16 },
        { id: 'persistence', name: 'Persistence', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'lacunarity', name: 'Lacunarity', type: 'float', value: 2, min: 1, max: 4 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'noise-turbulence':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'value', name: 'Value', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 5, min: 0.1, max: 50 },
        { id: 'octaves', name: 'Octaves', type: 'int', value: 4, min: 1, max: 16 },
        { id: 'power', name: 'Power', type: 'float', value: 1, min: 0.1, max: 5 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'noise-ridged':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'value', name: 'Value', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 5, min: 0.1, max: 50 },
        { id: 'octaves', name: 'Octaves', type: 'int', value: 4, min: 1, max: 16 },
        { id: 'sharpness', name: 'Sharpness', type: 'float', value: 2, min: 0.5, max: 10 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    // ===== PATTERN NODES =====
    case 'pattern-checker':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'fac', name: 'Factor', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 8, min: 1, max: 64 },
      ];
      break;

    case 'pattern-stripes':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'fac', name: 'Factor', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 10, min: 1, max: 100 },
        { id: 'angle', name: 'Angle', type: 'float', value: 0, min: 0, max: 360 },
        { id: 'duty', name: 'Duty Cycle', type: 'float', value: 0.5, min: 0, max: 1 },
      ];
      break;

    case 'pattern-brick':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [
        { id: 'fac', name: 'Factor', type: 'float' },
        { id: 'mortar', name: 'Mortar', type: 'float' },
      ];
      baseNode.parameters = [
        { id: 'scaleX', name: 'Scale X', type: 'float', value: 4, min: 1, max: 32 },
        { id: 'scaleY', name: 'Scale Y', type: 'float', value: 8, min: 1, max: 32 },
        { id: 'offset', name: 'Row Offset', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'mortar', name: 'Mortar Width', type: 'float', value: 0.02, min: 0, max: 0.2 },
      ];
      break;

    case 'pattern-hexagon':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [
        { id: 'fac', name: 'Factor', type: 'float' },
        { id: 'cell', name: 'Cell ID', type: 'float' },
      ];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 5, min: 1, max: 32 },
        { id: 'gap', name: 'Gap', type: 'float', value: 0.05, min: 0, max: 0.5 },
      ];
      break;

    // ===== MATH NODES =====
    case 'math-add':
    case 'math-subtract':
    case 'math-multiply':
    case 'math-divide':
    case 'math-power':
    case 'math-min':
    case 'math-max':
      baseNode.inputs = [
        { id: 'a', name: 'A', type: 'float' },
        { id: 'b', name: 'B', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'result', name: 'Result', type: 'float' }];
      baseNode.parameters = [
        { id: 'a', name: 'A', type: 'float', value: 0, min: -10, max: 10 },
        { id: 'b', name: 'B', type: 'float', value: 1, min: -10, max: 10 },
      ];
      break;

    case 'math-lerp':
      baseNode.inputs = [
        { id: 'a', name: 'A', type: 'float' },
        { id: 'b', name: 'B', type: 'float' },
        { id: 'fac', name: 'Factor', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'result', name: 'Result', type: 'float' }];
      baseNode.parameters = [
        { id: 'factor', name: 'Factor', type: 'float', value: 0.5, min: 0, max: 1 },
      ];
      break;

    case 'math-clamp':
      baseNode.inputs = [{ id: 'value', name: 'Value', type: 'float' }];
      baseNode.outputs = [{ id: 'result', name: 'Result', type: 'float' }];
      baseNode.parameters = [
        { id: 'min', name: 'Min', type: 'float', value: 0, min: -10, max: 10 },
        { id: 'max', name: 'Max', type: 'float', value: 1, min: -10, max: 10 },
      ];
      break;

    case 'math-remap':
      baseNode.inputs = [{ id: 'value', name: 'Value', type: 'float' }];
      baseNode.outputs = [{ id: 'result', name: 'Result', type: 'float' }];
      baseNode.parameters = [
        { id: 'inMin', name: 'Input Min', type: 'float', value: 0, min: -10, max: 10 },
        { id: 'inMax', name: 'Input Max', type: 'float', value: 1, min: -10, max: 10 },
        { id: 'outMin', name: 'Output Min', type: 'float', value: 0, min: -10, max: 10 },
        { id: 'outMax', name: 'Output Max', type: 'float', value: 1, min: -10, max: 10 },
      ];
      break;

    // ===== COLOR NODES =====
    case 'color-mix':
      baseNode.inputs = [
        { id: 'a', name: 'Color A', type: 'color' },
        { id: 'b', name: 'Color B', type: 'color' },
        { id: 'fac', name: 'Factor', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.parameters = [
        { id: 'factor', name: 'Factor', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'mode', name: 'Mode', type: 'enum', value: 'mix', options: ['mix', 'add', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light'] },
      ];
      break;

    case 'color-hue-shift':
      baseNode.inputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.parameters = [
        { id: 'hue', name: 'Hue Shift', type: 'float', value: 0, min: 0, max: 1 },
        { id: 'saturation', name: 'Saturation', type: 'float', value: 1, min: 0, max: 2 },
        { id: 'value', name: 'Value', type: 'float', value: 1, min: 0, max: 2 },
      ];
      break;

    case 'color-brightness':
    case 'color-contrast':
      baseNode.inputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.parameters = [
        { id: 'amount', name: 'Amount', type: 'float', value: 1, min: 0, max: 2 },
      ];
      break;

    case 'color-invert':
    case 'color-grayscale':
      baseNode.inputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      break;

    case 'color-split':
      baseNode.inputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.outputs = [
        { id: 'r', name: 'R', type: 'float' },
        { id: 'g', name: 'G', type: 'float' },
        { id: 'b', name: 'B', type: 'float' },
        { id: 'a', name: 'A', type: 'float' },
      ];
      break;

    case 'color-combine':
      baseNode.inputs = [
        { id: 'r', name: 'R', type: 'float' },
        { id: 'g', name: 'G', type: 'float' },
        { id: 'b', name: 'B', type: 'float' },
        { id: 'a', name: 'A', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      break;

    // ===== FILTER NODES =====
    case 'filter-blur':
      baseNode.inputs = [{ id: 'image', name: 'Image', type: 'color' }];
      baseNode.outputs = [{ id: 'image', name: 'Image', type: 'color' }];
      baseNode.parameters = [
        { id: 'radius', name: 'Radius', type: 'float', value: 5, min: 0, max: 50 },
        { id: 'quality', name: 'Quality', type: 'int', value: 3, min: 1, max: 10 },
      ];
      break;

    case 'filter-sharpen':
      baseNode.inputs = [{ id: 'image', name: 'Image', type: 'color' }];
      baseNode.outputs = [{ id: 'image', name: 'Image', type: 'color' }];
      baseNode.parameters = [
        { id: 'amount', name: 'Amount', type: 'float', value: 1, min: 0, max: 5 },
      ];
      break;

    case 'filter-edge':
      baseNode.inputs = [{ id: 'image', name: 'Image', type: 'color' }];
      baseNode.outputs = [
        { id: 'edges', name: 'Edges', type: 'float' },
        { id: 'normal', name: 'Normal', type: 'vector3' },
      ];
      baseNode.parameters = [
        { id: 'strength', name: 'Strength', type: 'float', value: 1, min: 0, max: 5 },
      ];
      break;

    // ===== CS2 MATERIAL NODES =====
    case 'cs2-wear':
      baseNode.inputs = [
        { id: 'uv', name: 'UV', type: 'vector2' },
        { id: 'mask', name: 'Mask', type: 'float' },
      ];
      baseNode.outputs = [
        { id: 'wear', name: 'Wear', type: 'float' },
        { id: 'color', name: 'Color', type: 'color' },
      ];
      baseNode.parameters = [
        { id: 'amount', name: 'Wear Amount', type: 'float', value: 0.3, min: 0, max: 1 },
        { id: 'roughness', name: 'Roughness', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'scale', name: 'Scale', type: 'float', value: 10, min: 1, max: 50 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'cs2-scratches':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [
        { id: 'mask', name: 'Mask', type: 'float' },
        { id: 'normal', name: 'Normal', type: 'vector3' },
      ];
      baseNode.parameters = [
        { id: 'density', name: 'Density', type: 'float', value: 50, min: 1, max: 200 },
        { id: 'length', name: 'Length', type: 'float', value: 0.3, min: 0.05, max: 1 },
        { id: 'width', name: 'Width', type: 'float', value: 0.01, min: 0.001, max: 0.1 },
        { id: 'depth', name: 'Depth', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'angle', name: 'Angle', type: 'float', value: 45, min: 0, max: 180 },
        { id: 'randomness', name: 'Randomness', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'cs2-dirt':
      baseNode.inputs = [
        { id: 'uv', name: 'UV', type: 'vector2' },
        { id: 'ao', name: 'AO', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'dirt', name: 'Dirt', type: 'float' }];
      baseNode.parameters = [
        { id: 'amount', name: 'Amount', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'scale', name: 'Scale', type: 'float', value: 20, min: 1, max: 100 },
        { id: 'contrast', name: 'Contrast', type: 'float', value: 1, min: 0, max: 3 },
        { id: 'aoBias', name: 'AO Bias', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    case 'cs2-edge-wear':
      baseNode.inputs = [
        { id: 'normal', name: 'Normal', type: 'vector3' },
        { id: 'curvature', name: 'Curvature', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'wear', name: 'Wear', type: 'float' }];
      baseNode.parameters = [
        { id: 'amount', name: 'Amount', type: 'float', value: 0.5, min: 0, max: 1 },
        { id: 'sharpness', name: 'Sharpness', type: 'float', value: 2, min: 0.5, max: 10 },
        { id: 'noise', name: 'Noise', type: 'float', value: 0.3, min: 0, max: 1 },
      ];
      break;

    case 'cs2-holographic':
      baseNode.inputs = [
        { id: 'uv', name: 'UV', type: 'vector2' },
        { id: 'viewAngle', name: 'View Angle', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'color', name: 'Color', type: 'color' }];
      baseNode.parameters = [
        { id: 'density', name: 'Density', type: 'float', value: 100, min: 10, max: 500 },
        { id: 'colorShift', name: 'Color Shift', type: 'float', value: 1, min: 0, max: 2 },
        { id: 'intensity', name: 'Intensity', type: 'float', value: 1, min: 0, max: 2 },
      ];
      break;

    case 'cs2-glitter':
      baseNode.inputs = [
        { id: 'uv', name: 'UV', type: 'vector2' },
        { id: 'viewAngle', name: 'View Angle', type: 'float' },
      ];
      baseNode.outputs = [
        { id: 'sparkle', name: 'Sparkle', type: 'float' },
        { id: 'color', name: 'Color', type: 'color' },
      ];
      baseNode.parameters = [
        { id: 'density', name: 'Density', type: 'float', value: 500, min: 50, max: 2000 },
        { id: 'size', name: 'Size', type: 'float', value: 0.02, min: 0.005, max: 0.1 },
        { id: 'brightness', name: 'Brightness', type: 'float', value: 2, min: 0, max: 5 },
        { id: 'colorVariation', name: 'Color Variation', type: 'float', value: 0.3, min: 0, max: 1 },
        { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
      ];
      break;

    // ===== OUTPUT NODES =====
    case 'output-color':
      baseNode.inputs = [{ id: 'color', name: 'Color', type: 'color' }];
      break;

    case 'output-normal':
      baseNode.inputs = [
        { id: 'normal', name: 'Normal', type: 'vector3' },
        { id: 'height', name: 'Height', type: 'float' },
      ];
      baseNode.parameters = [
        { id: 'strength', name: 'Strength', type: 'float', value: 1, min: 0, max: 2 },
        { id: 'fromHeight', name: 'From Height', type: 'bool', value: false },
      ];
      break;

    case 'output-metalness':
    case 'output-roughness':
    case 'output-ao':
    case 'output-opacity':
    case 'output-height':
      baseNode.inputs = [{ id: 'value', name: 'Value', type: 'float' }];
      break;

    case 'output-emission':
      baseNode.inputs = [
        { id: 'color', name: 'Color', type: 'color' },
        { id: 'strength', name: 'Strength', type: 'float' },
      ];
      baseNode.parameters = [
        { id: 'strength', name: 'Strength', type: 'float', value: 1, min: 0, max: 10 },
      ];
      break;

    case 'output-combined':
      baseNode.inputs = [
        { id: 'color', name: 'Color', type: 'color' },
        { id: 'normal', name: 'Normal', type: 'vector3' },
        { id: 'metalness', name: 'Metalness', type: 'float' },
        { id: 'roughness', name: 'Roughness', type: 'float' },
        { id: 'ao', name: 'AO', type: 'float' },
      ];
      break;

    // Default fallback
    default:
      baseNode.inputs = [{ id: 'in', name: 'Input', type: 'color' }];
      baseNode.outputs = [{ id: 'out', name: 'Output', type: 'color' }];
  }

  return baseNode;
};

// ==================== TEXTURE BAKING ====================

/**
 * Texture resolution options for baking
 */
const TEXTURE_RESOLUTIONS = [256, 512, 1024, 2048, 4096];

/**
 * Available texture channels for export
 */
const TEXTURE_CHANNELS = [
  { id: 'color', name: 'Color (Albedo)', suffix: '_color' },
  { id: 'normal', name: 'Normal Map', suffix: '_normal' },
  { id: 'metalness', name: 'Metalness', suffix: '_metalness' },
  { id: 'roughness', name: 'Roughness', suffix: '_roughness' },
  { id: 'ao', name: 'Ambient Occlusion', suffix: '_ao' },
  { id: 'emission', name: 'Emission', suffix: '_emission' },
  { id: 'height', name: 'Height Map', suffix: '_height' },
  { id: 'opacity', name: 'Opacity', suffix: '_opacity' },
];

// ==================== COMPONENT PROPS ====================

interface NodeEditorProps {
  /** The material being edited */
  material?: SmartMaterial;
  /** Callback when material is saved */
  onSave?: (material: SmartMaterial) => void;
  /** Callback to close the editor */
  onClose?: () => void;
  /** Callback on any material change */
  onChange?: (material: SmartMaterial) => void;
  /** Additional CSS classes */
  className?: string;
}

// ==================== MAIN COMPONENT ====================

/**
 * NodeEditor - Visual node-based material editor
 *
 * Provides a canvas for creating procedural materials using connected nodes.
 * Supports real-time preview, texture baking, and CS2 Workshop export.
 *
 * @param props - Component properties
 * @returns React component
 */
export function NodeEditor({ material, onSave, onClose, onChange, className }: NodeEditorProps) {
  // Studio editor integration
  const { activeLayerId, updateLayer, layers, addLayer, pushHistory } = useStudioEditor();
  const [isApplyingToLayer, setIsApplyingToLayer] = useState(false);

  // Canvas and interaction refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Node graph state
  const [nodes, setNodes] = useState<MaterialNode[]>(material?.nodes || []);
  const [connections, setConnections] = useState<NodeConnection[]>(material?.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; portId: string; isOutput: boolean } | null>(null);

  // View state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // UI state
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodePickerPosition, setNodePickerPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [materialName, setMaterialName] = useState(material?.name || 'New Material');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Export/Bake state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportResolution, setExportResolution] = useState(1024);
  const [exportChannels, setExportChannels] = useState<string[]>(['color', 'normal', 'roughness', 'metalness']);
  const [isExporting, setIsExporting] = useState(false);
  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d');

  // Node preview state - stores generated preview thumbnails for each node
  const [nodePreviews, setNodePreviews] = useState<Map<string, string>>(new Map());
  const previewSizeRef = useRef(64); // Preview thumbnail size

  // ==================== NODE INTERACTION HANDLERS ====================

  /**
   * Handles mouse down on a node for dragging
   * @param e - Mouse event
   * @param nodeId - ID of the clicked node
   */
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button === 0) {
      setDraggedNode(nodeId);
      setSelectedNodeId(nodeId);
      e.stopPropagation();
    }
  };

  /**
   * Handles global mouse movement for node dragging and panning
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Handle node dragging
    if (draggedNode) {
      setNodes(prev => prev.map(node => {
        if (node.id === draggedNode) {
          return {
            ...node,
            position: {
              x: node.position.x + e.movementX / zoom,
              y: node.position.y + e.movementY / zoom,
            },
          };
        }
        return node;
      }));
    }

    // Handle canvas panning
    if (isPanning) {
      setPan(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }

    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [draggedNode, zoom, isPanning]);

  /**
   * Handles mouse up to end dragging/panning
   * Note: connecting state is NOT cleared here to allow click-to-connect workflow
   */
  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setIsPanning(false);
    // Cancel connection if released outside a port
    setConnecting(null);
  }, []);

  // Add/remove global mouse listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: cancel current operation
      if (e.key === 'Escape') {
        setConnecting(null);
        setShowNodePicker(false);
        setSelectedConnectionId(null);
      }

      // Don't process delete/backspace if focused on an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      // Delete/Backspace: delete selected connection or node
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          // Delete selected connection
          setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
          setSelectedConnectionId(null);
          e.preventDefault();
        } else if (selectedNodeId) {
          // Delete selected node
          deleteSelectedNode();
        }
      }

      // Duplicate with Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        duplicateSelectedNode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId]);

  // Generate node previews when nodes or connections change
  useEffect(() => {
    const generateNodePreviews = async () => {
      const size = previewSizeRef.current;
      const newPreviews = new Map<string, string>();

      // Helper function to evaluate a node with connection support
      const evaluateWithConnections = (
        node: MaterialNode,
        uv: { x: number; y: number },
        visited: Set<string> = new Set()
      ): { r: number; g: number; b: number } => {
        // Prevent infinite loops
        if (visited.has(node.id)) {
          return { r: 0.5, g: 0.5, b: 0.5 };
        }
        visited.add(node.id);

        // Get input value from connected node or parameter
        const getInputValue = (portId: string): unknown => {
          const conn = connections.find(c => c.toNodeId === node.id && c.toPortId === portId);
          if (conn) {
            const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
            if (sourceNode) {
              return evaluateWithConnections(sourceNode, uv, visited);
            }
          }
          // Return default/parameter value
          const param = node.parameters.find(p => p.id === portId);
          return param?.value;
        };

        // Evaluate based on node type
        switch (node.type) {
          case 'color-input': {
            const colorStr = node.parameters.find(p => p.id === 'color')?.value as string || '#808080';
            return hexToRgbLocal(colorStr);
          }

          case 'gradient-input': {
            const color1 = node.parameters.find(p => p.id === 'color1')?.value as string || '#000000';
            const color2 = node.parameters.find(p => p.id === 'color2')?.value as string || '#ffffff';
            const c1 = hexToRgbLocal(color1);
            const c2 = hexToRgbLocal(color2);
            const t = uv.x;
            return {
              r: c1.r + (c2.r - c1.r) * t,
              g: c1.g + (c2.g - c1.g) * t,
              b: c1.b + (c2.b - c1.b) * t,
            };
          }

          case 'noise-perlin':
          case 'noise-simplex': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
            const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
            const value = perlinNoiseLocal(uv.x * scale, uv.y * scale, seed);
            return { r: value, g: value, b: value };
          }

          case 'noise-fbm':
          case 'noise-turbulence': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
            const octaves = Number(node.parameters.find(p => p.id === 'octaves')?.value || 4);
            const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
            let value = 0;
            let amplitude = 1;
            let frequency = scale;
            let maxValue = 0;
            for (let i = 0; i < octaves; i++) {
              value += amplitude * perlinNoiseLocal(uv.x * frequency, uv.y * frequency, seed + i);
              maxValue += amplitude;
              amplitude *= 0.5;
              frequency *= 2;
            }
            value = value / maxValue;
            if (node.type === 'noise-turbulence') value = Math.abs(value);
            return { r: value, g: value, b: value };
          }

          case 'noise-voronoi':
          case 'noise-worley': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
            const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
            const value = voronoiNoiseLocal(uv.x * scale, uv.y * scale, seed);
            return { r: value, g: value, b: value };
          }

          case 'noise-white':
          case 'noise-value': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
            const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
            const nx = Math.floor(uv.x * scale) + seed;
            const ny = Math.floor(uv.y * scale);
            const value = Math.abs(Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453) % 1;
            return { r: value, g: value, b: value };
          }

          case 'pattern-checker': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 8);
            const cx = Math.floor(uv.x * scale) % 2;
            const cy = Math.floor(uv.y * scale) % 2;
            const value = (cx + cy) % 2;
            return { r: value, g: value, b: value };
          }

          case 'pattern-stripes': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
            const angle = Number(node.parameters.find(p => p.id === 'angle')?.value || 0) * Math.PI / 180;
            const rotX = uv.x * Math.cos(angle) - uv.y * Math.sin(angle);
            const value = Math.floor(rotX * scale) % 2;
            return { r: value, g: value, b: value };
          }

          case 'pattern-dots': {
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
            const radius = Number(node.parameters.find(p => p.id === 'radius')?.value || 0.3);
            const cx = (uv.x * scale) % 1 - 0.5;
            const cy = (uv.y * scale) % 1 - 0.5;
            const dist = Math.sqrt(cx * cx + cy * cy);
            const value = dist < radius ? 1 : 0;
            return { r: value, g: value, b: value };
          }

          // Color operations - these now properly use connected inputs
          case 'color-mix': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
            // Check for connected factor input, otherwise use parameter
            const facInput = getInputValue('fac') as { r: number; g: number; b: number } | number | undefined;
            let factor: number;
            if (facInput !== undefined) {
              // Handle both number and color/grayscale values
              if (typeof facInput === 'number') {
                factor = facInput;
              } else {
                // Use grayscale value from color
                factor = (facInput.r + facInput.g + facInput.b) / 3;
              }
            } else {
              factor = Number(node.parameters.find(p => p.id === 'factor')?.value || 0.5);
            }
            return {
              r: a.r + (b.r - a.r) * factor,
              g: a.g + (b.g - a.g) * factor,
              b: a.b + (b.b - a.b) * factor,
            };
          }

          case 'color-multiply': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
            const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
            return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
          }

          case 'color-add': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            return {
              r: Math.min(1, a.r + b.r),
              g: Math.min(1, a.g + b.g),
              b: Math.min(1, a.b + b.b),
            };
          }

          case 'color-subtract': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
            const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            return {
              r: Math.max(0, a.r - b.r),
              g: Math.max(0, a.g - b.g),
              b: Math.max(0, a.b - b.b),
            };
          }

          case 'color-overlay': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
            const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
            const overlay = (base: number, blend: number) =>
              base < 0.5 ? 2 * base * blend : 1 - 2 * (1 - base) * (1 - blend);
            return {
              r: overlay(a.r, b.r),
              g: overlay(a.g, b.g),
              b: overlay(a.b, b.b),
            };
          }

          case 'color-screen': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            return {
              r: 1 - (1 - a.r) * (1 - b.r),
              g: 1 - (1 - a.g) * (1 - b.g),
              b: 1 - (1 - a.b) * (1 - b.b),
            };
          }

          case 'color-invert': {
            const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
            return { r: 1 - input.r, g: 1 - input.g, b: 1 - input.b };
          }

          case 'math-add':
          case 'math-subtract':
          case 'math-multiply':
          case 'math-divide': {
            const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
            const bInput = getInputValue('b');
            const b = typeof bInput === 'number'
              ? { r: bInput, g: bInput, b: bInput }
              : (bInput as { r: number; g: number; b: number }) || { r: 1, g: 1, b: 1 };

            switch (node.type) {
              case 'math-add': return { r: a.r + b.r, g: a.g + b.g, b: a.b + b.b };
              case 'math-subtract': return { r: a.r - b.r, g: a.g - b.g, b: a.b - b.b };
              case 'math-multiply': return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
              case 'math-divide': return {
                r: b.r !== 0 ? a.r / b.r : 0,
                g: b.g !== 0 ? a.g / b.g : 0,
                b: b.b !== 0 ? a.b / b.b : 0
              };
              default: return a;
            }
          }

          case 'filter-brightness': {
            const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
            const brightness = Number(node.parameters.find(p => p.id === 'brightness')?.value || 1);
            return {
              r: Math.min(1, Math.max(0, input.r * brightness)),
              g: Math.min(1, Math.max(0, input.g * brightness)),
              b: Math.min(1, Math.max(0, input.b * brightness)),
            };
          }

          case 'filter-contrast': {
            const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
            const contrast = Number(node.parameters.find(p => p.id === 'contrast')?.value || 1);
            const adjust = (v: number) => Math.min(1, Math.max(0, (v - 0.5) * contrast + 0.5));
            return { r: adjust(input.r), g: adjust(input.g), b: adjust(input.b) };
          }

          // Output nodes - pass through input with correct port IDs
          case 'output-color': {
            const input = getInputValue('color') as { r: number; g: number; b: number };
            return input || { r: 0.5, g: 0.5, b: 0.5 };
          }
          case 'output-normal': {
            // Normal maps use blue as default (pointing up)
            const normalInput = getInputValue('normal') as { r: number; g: number; b: number };
            if (normalInput) return normalInput;
            const heightInput = getInputValue('height') as { r: number; g: number; b: number };
            if (heightInput) return heightInput;
            return { r: 0.5, g: 0.5, b: 1 };
          }
          case 'output-roughness':
          case 'output-metalness':
          case 'output-ao':
          case 'output-height':
          case 'output-opacity': {
            const input = getInputValue('value') as { r: number; g: number; b: number } | number;
            if (typeof input === 'number') {
              return { r: input, g: input, b: input };
            }
            return input || { r: 0.5, g: 0.5, b: 0.5 };
          }
          case 'output-emission': {
            const input = getInputValue('color') as { r: number; g: number; b: number };
            return input || { r: 0, g: 0, b: 0 };
          }
          case 'output-combined': {
            const input = getInputValue('color') as { r: number; g: number; b: number };
            return input || { r: 0.5, g: 0.5, b: 0.5 };
          }

          // CS2 specific nodes
          case 'cs2-scratches': {
            const density = Number(node.parameters.find(p => p.id === 'density')?.value || 0.5);
            const value = perlinNoiseLocal(uv.x * 50, uv.y * 2, 0) * density;
            return { r: value, g: value, b: value };
          }

          case 'cs2-wear':
          case 'cs2-edge-wear': {
            const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.5);
            const noise = perlinNoiseLocal(uv.x * 20, uv.y * 20, 42);
            const value = noise * amount;
            return { r: value, g: value, b: value };
          }

          case 'cs2-dirt':
          case 'cs2-grunge': {
            const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.5);
            const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
            const value = voronoiNoiseLocal(uv.x * scale, uv.y * scale, 123) * amount;
            return { r: value, g: value, b: value };
          }

          case 'cs2-holographic': {
            const r = (Math.sin(uv.x * 100) + 1) * 0.5;
            const g = (Math.sin(uv.x * 100 + 2) + 1) * 0.5;
            const b = (Math.sin(uv.x * 100 + 4) + 1) * 0.5;
            return { r, g, b };
          }

          case 'cs2-glitter': {
            const density = Number(node.parameters.find(p => p.id === 'density')?.value || 0.5);
            const scale = 100;
            const nx = Math.floor(uv.x * scale);
            const ny = Math.floor(uv.y * scale);
            const random = Math.abs(Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453) % 1;
            const value = random > (1 - density * 0.1) ? 1 : 0;
            return { r: value, g: value, b: value };
          }

          default:
            return { r: 0.5, g: 0.5, b: 0.5 };
        }
      };

      // Local helper functions for the effect
      const hexToRgbLocal = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        } : { r: 0.5, g: 0.5, b: 0.5 };
      };

      const perlinNoiseLocal = (x: number, y: number, seed: number): number => {
        const hash = (n: number) => {
          const s = Math.sin(n + seed) * 43758.5453;
          return s - Math.floor(s);
        };
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const a = hash(ix + iy * 57);
        const b = hash(ix + 1 + iy * 57);
        const c = hash(ix + (iy + 1) * 57);
        const d = hash(ix + 1 + (iy + 1) * 57);
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
      };

      const voronoiNoiseLocal = (x: number, y: number, seed: number): number => {
        const hash = (ix: number, iy: number) => ({
          x: Math.sin(ix + iy * 57 + seed) * 43758.5453 % 1,
          y: Math.sin((ix + iy * 57 + seed) * 1.3) * 43758.5453 % 1,
        });
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        let minDist = 1;
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const cellX = ix + ox;
            const cellY = iy + oy;
            const point = hash(cellX, cellY);
            const dx = cellX + point.x - x;
            const dy = cellY + point.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            minDist = Math.min(minDist, dist);
          }
        }
        return minDist;
      };

      for (const node of nodes) {
        // Skip input nodes that just pass through values
        if (node.type === 'uv-input' || node.type === 'position-input' ||
            node.type === 'normal-input' || node.type === 'time-input' ||
            node.type === 'value-input') {
          continue;
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const imageData = ctx.createImageData(size, size);
          const data = imageData.data;

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const i = (y * size + x) * 4;
              const uv = { x: x / size, y: y / size };
              const color = evaluateWithConnections(node, uv);

              data[i] = Math.round(Math.max(0, Math.min(1, color.r)) * 255);
              data[i + 1] = Math.round(Math.max(0, Math.min(1, color.g)) * 255);
              data[i + 2] = Math.round(Math.max(0, Math.min(1, color.b)) * 255);
              data[i + 3] = 255;
            }
          }

          ctx.putImageData(imageData, 0, 0);
          newPreviews.set(node.id, canvas.toDataURL());
        } catch {
          // Skip nodes that fail to render
        }
      }

      setNodePreviews(newPreviews);
    };

    // Debounce preview generation
    const timeoutId = setTimeout(generateNodePreviews, 100);
    return () => clearTimeout(timeoutId);
  }, [nodes, connections]);

  // Simplified node evaluation for preview (doesn't follow connections for performance)
  const evaluateNodeAtUVForPreview = (
    node: MaterialNode,
    uv: { x: number; y: number }
  ): { r: number; g: number; b: number } => {
    switch (node.type) {
      case 'color-input': {
        const colorStr = node.parameters.find(p => p.id === 'color')?.value as string || '#808080';
        return hexToRgb(colorStr);
      }

      case 'gradient-input': {
        // Simple horizontal gradient
        const color1 = node.parameters.find(p => p.id === 'color1')?.value as string || '#000000';
        const color2 = node.parameters.find(p => p.id === 'color2')?.value as string || '#ffffff';
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const t = uv.x;
        return {
          r: c1.r + (c2.r - c1.r) * t,
          g: c1.g + (c2.g - c1.g) * t,
          b: c1.b + (c2.b - c1.b) * t,
        };
      }

      case 'noise-perlin':
      case 'noise-simplex': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const value = perlinNoise(uv.x * scale, uv.y * scale, seed);
        return { r: value, g: value, b: value };
      }

      case 'noise-fbm':
      case 'noise-turbulence': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const octaves = Number(node.parameters.find(p => p.id === 'octaves')?.value || 4);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
          value += amplitude * perlinNoise(uv.x * frequency, uv.y * frequency, seed + i);
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        value = value / maxValue;
        if (node.type === 'noise-turbulence') value = Math.abs(value);
        return { r: value, g: value, b: value };
      }

      case 'noise-voronoi':
      case 'noise-worley': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const value = voronoiNoise(uv.x * scale, uv.y * scale, seed);
        return { r: value, g: value, b: value };
      }

      case 'noise-white':
      case 'noise-value': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const nx = Math.floor(uv.x * scale) + seed;
        const ny = Math.floor(uv.y * scale);
        const value = Math.abs(Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453) % 1;
        return { r: value, g: value, b: value };
      }

      case 'pattern-checker': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 8);
        const cx = Math.floor(uv.x * scale) % 2;
        const cy = Math.floor(uv.y * scale) % 2;
        const value = (cx + cy) % 2;
        return { r: value, g: value, b: value };
      }

      case 'pattern-stripes': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const angle = Number(node.parameters.find(p => p.id === 'angle')?.value || 0) * Math.PI / 180;
        const rotX = uv.x * Math.cos(angle) - uv.y * Math.sin(angle);
        const value = Math.floor(rotX * scale) % 2;
        return { r: value, g: value, b: value };
      }

      case 'pattern-dots': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const radius = Number(node.parameters.find(p => p.id === 'radius')?.value || 0.3);
        const cx = (uv.x * scale) % 1 - 0.5;
        const cy = (uv.y * scale) % 1 - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const value = dist < radius ? 1 : 0;
        return { r: value, g: value, b: value };
      }

      case 'pattern-grid': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const lineWidth = Number(node.parameters.find(p => p.id === 'lineWidth')?.value || 0.1);
        const sx = (uv.x * scale) % 1;
        const sy = (uv.y * scale) % 1;
        const value = (sx < lineWidth || sy < lineWidth) ? 1 : 0;
        return { r: value, g: value, b: value };
      }

      case 'pattern-wave': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const amplitude = Number(node.parameters.find(p => p.id === 'amplitude')?.value || 0.5);
        const value = (Math.sin(uv.x * scale * Math.PI * 2) * amplitude + 1) * 0.5;
        return { r: value, g: value, b: value };
      }

      case 'pattern-circle': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const cx = uv.x - 0.5;
        const cy = uv.y - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy) * scale * 2;
        const value = (Math.sin(dist * Math.PI * 2) + 1) * 0.5;
        return { r: value, g: value, b: value };
      }

      case 'pattern-spiral': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const cx = uv.x - 0.5;
        const cy = uv.y - 0.5;
        const angle = Math.atan2(cy, cx);
        const dist = Math.sqrt(cx * cx + cy * cy);
        const value = (Math.sin((angle + dist * scale * 10)) + 1) * 0.5;
        return { r: value, g: value, b: value };
      }

      // CS2 specific nodes
      case 'cs2-scratches': {
        const density = Number(node.parameters.find(p => p.id === 'density')?.value || 0.5);
        const length = Number(node.parameters.find(p => p.id === 'length')?.value || 0.5);
        const value = perlinNoise(uv.x * 50, uv.y * 2, 0) * density;
        return { r: value, g: value, b: value };
      }

      case 'cs2-wear':
      case 'cs2-edge-wear': {
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.5);
        const noise = perlinNoise(uv.x * 20, uv.y * 20, 42);
        const value = noise * amount;
        return { r: value, g: value, b: value };
      }

      case 'cs2-dirt':
      case 'cs2-grunge': {
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.5);
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const value = voronoiNoise(uv.x * scale, uv.y * scale, 123) * amount;
        return { r: value, g: value, b: value };
      }

      case 'cs2-holographic': {
        const value = (Math.sin(uv.x * 50 + uv.y * 30) + 1) * 0.5;
        const r = (Math.sin(uv.x * 100) + 1) * 0.5;
        const g = (Math.sin(uv.x * 100 + 2) + 1) * 0.5;
        const b = (Math.sin(uv.x * 100 + 4) + 1) * 0.5;
        return { r, g, b };
      }

      case 'cs2-glitter': {
        const density = Number(node.parameters.find(p => p.id === 'density')?.value || 0.5);
        const scale = 100;
        const nx = Math.floor(uv.x * scale);
        const ny = Math.floor(uv.y * scale);
        const random = Math.abs(Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453) % 1;
        const value = random > (1 - density * 0.1) ? 1 : 0;
        return { r: value, g: value, b: value };
      }

      // Output nodes - follow input connections for preview
      case 'output-color': {
        const conn = connections.find(c => c.toNodeId === node.id && c.toPortId === 'color');
        if (conn) {
          const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
          if (sourceNode) return evaluateNodeAtUVForPreview(sourceNode, uv);
        }
        return { r: 0.5, g: 0.5, b: 0.5 };
      }
      case 'output-metalness':
      case 'output-roughness':
      case 'output-ao':
      case 'output-height':
      case 'output-opacity': {
        const conn = connections.find(c => c.toNodeId === node.id && c.toPortId === 'value');
        if (conn) {
          const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
          if (sourceNode) return evaluateNodeAtUVForPreview(sourceNode, uv);
        }
        return { r: 0.5, g: 0.5, b: 0.5 };
      }
      case 'output-normal': {
        const conn = connections.find(c => c.toNodeId === node.id && (c.toPortId === 'normal' || c.toPortId === 'height'));
        if (conn) {
          const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
          if (sourceNode) return evaluateNodeAtUVForPreview(sourceNode, uv);
        }
        return { r: 0.5, g: 0.5, b: 1 };
      }
      case 'output-emission': {
        const conn = connections.find(c => c.toNodeId === node.id && c.toPortId === 'color');
        if (conn) {
          const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
          if (sourceNode) return evaluateNodeAtUVForPreview(sourceNode, uv);
        }
        return { r: 0, g: 0, b: 0 };
      }
      case 'output-combined': {
        const conn = connections.find(c => c.toNodeId === node.id && c.toPortId === 'color');
        if (conn) {
          const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
          if (sourceNode) return evaluateNodeAtUVForPreview(sourceNode, uv);
        }
        return { r: 0.5, g: 0.5, b: 0.5 };
      }

      // Math operations - show gradient
      case 'math-add':
      case 'math-subtract':
      case 'math-multiply':
      case 'math-divide':
      case 'color-mix':
        return { r: uv.x, g: uv.y, b: 0.5 };

      default:
        return { r: 0.5, g: 0.5, b: 0.5 };
    }
  };

  /**
   * Handles clicking on a node port to create connections
   * @param nodeId - ID of the node containing the port
   * @param portId - ID of the port
   * @param isOutput - Whether this is an output port
   */
  /**
   * Handles mouse down on a port - starts connection dragging
   */
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string, isOutput: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    // Start connection from this port
    setConnecting({ nodeId, portId, isOutput });
  };

  /**
   * Handles mouse up on a port - completes connection if dragging
   */
  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, portId: string, isOutput: boolean) => {
    e.stopPropagation();
    if (connecting && connecting.isOutput !== isOutput && connecting.nodeId !== nodeId) {
      // Complete connection - output to input
      const newConnection: NodeConnection = {
        id: generateId(),
        fromNodeId: isOutput ? nodeId : connecting.nodeId,
        fromPortId: isOutput ? portId : connecting.portId,
        toNodeId: isOutput ? connecting.nodeId : nodeId,
        toPortId: isOutput ? connecting.portId : portId,
      };

      // Remove any existing connection to this input
      setConnections(prev => [
        ...prev.filter(c => !(c.toNodeId === newConnection.toNodeId && c.toPortId === newConnection.toPortId)),
        newConnection,
      ]);
    }
    setConnecting(null);
  };

  /**
   * Adds a new node to the graph
   * @param type - Type of node to add
   */
  const addNode = (type: MaterialNodeType) => {
    // Get container bounds to convert screen position to canvas position
    const rect = canvasRef.current?.getBoundingClientRect();
    const containerX = rect ? nodePickerPosition.x - rect.left : nodePickerPosition.x;
    const containerY = rect ? nodePickerPosition.y - rect.top : nodePickerPosition.y;

    const newNode = createNode(type, {
      x: (containerX - pan.x) / zoom,
      y: (containerY - pan.y) / zoom,
    });
    setNodes(prev => [...prev, newNode]);
    setShowNodePicker(false);
    setSearchQuery('');
  };

  /**
   * Deletes the currently selected node and its connections
   */
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setConnections(prev => prev.filter(c =>
      c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
    ));
    setSelectedNodeId(null);
  };

  /**
   * Duplicates the currently selected node
   */
  const duplicateSelectedNode = () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const newNode: MaterialNode = {
      ...node,
      id: generateId(),
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  /**
   * Updates a parameter value on a node
   * @param nodeId - ID of the node
   * @param paramId - ID of the parameter
   * @param value - New value
   */
  const updateNodeParameter = (nodeId: string, paramId: string, value: unknown) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          parameters: node.parameters.map(p =>
            p.id === paramId ? { ...p, value } : p
          ),
        };
      }
      return node;
    }));
  };

  /**
   * Handles right-click to show node picker
   * @param e - Mouse event
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setNodePickerPosition({ x: e.clientX, y: e.clientY });
    setShowNodePicker(true);
  };

  /**
   * Handles canvas mouse down for panning
   * @param e - Mouse event
   */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+click to pan
      setIsPanning(true);
      e.preventDefault();
    } else if (e.button === 0 && e.target === e.currentTarget) {
      // Left click on empty space deselects nodes, connections and cancels operations
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      setShowNodePicker(false);
      setConnecting(null);
    }
  };

  /**
   * Handles scroll wheel for zooming
   * @param e - Wheel event
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Zoom with mouse wheel (no modifier needed)
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  // ==================== SAVE & EXPORT ====================

  /**
   * Saves the current material
   */
  const handleSave = () => {
    const outputNode = nodes.find(n => n.type.startsWith('output-'));
    const materialData: SmartMaterial = {
      id: material?.id || generateId(),
      name: materialName,
      category: 'custom',
      nodes,
      connections,
      outputNodeId: outputNode?.id || '',
    };
    onSave?.(materialData);
    onChange?.(materialData);
  };

  /**
   * Exports textures for CS2 Workshop
   * Downloads all selected channels as PNG files in a ZIP archive
   */
  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Create a canvas for baking
      const canvas = document.createElement('canvas');
      canvas.width = exportResolution;
      canvas.height = exportResolution;
      const ctx = canvas.getContext('2d')!;

      // For each channel, evaluate the node graph and create texture
      const textures: { name: string; dataUrl: string }[] = [];

      for (const channelId of exportChannels) {
        const channel = TEXTURE_CHANNELS.find(c => c.id === channelId);
        if (!channel) continue;

        // Find output node for this channel
        const outputNode = nodes.find(n => n.type === `output-${channelId}`);
        if (!outputNode) {
          // Create blank texture if no output node
          ctx.fillStyle = channelId === 'normal' ? '#8080ff' : '#808080';
          ctx.fillRect(0, 0, exportResolution, exportResolution);
        } else {
          // Evaluate node graph for this output
          await evaluateNodeGraph(ctx, outputNode, exportResolution);
        }

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        textures.push({
          name: `${materialName.replace(/[^a-zA-Z0-9]/g, '_')}${channel.suffix}.png`,
          dataUrl,
        });
      }

      // Create ZIP file using JSZip-like approach (simple implementation)
      if (textures.length === 1) {
        // Single file - download directly
        downloadDataUrl(textures[0].dataUrl, textures[0].name);
      } else {
        // Multiple files - download as ZIP
        // For simplicity, download each file separately
        // In production, use JSZip library
        for (const texture of textures) {
          downloadDataUrl(texture.dataUrl, texture.name);
          await new Promise(r => setTimeout(r, 100)); // Small delay between downloads
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  };

  /**
   * Applies the material color output to the active layer
   * Generates the texture and applies it to the currently selected layer
   */
  const applyToActiveLayer = async () => {
    if (!activeLayerId) {
      // No active layer, create a new one
      const newLayer = addLayer('raster', materialName || 'Material');
      if (!newLayer) return;

      setIsApplyingToLayer(true);
      try {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Find color output node, or use the first output node
        const outputNode = nodes.find(n => n.type === 'output-color') ||
                          nodes.find(n => n.type.startsWith('output-'));

        if (outputNode) {
          await evaluateNodeGraph(ctx, outputNode, size);
        } else if (nodes.length > 0) {
          // No output node, evaluate the last added node
          await evaluateNodeGraph(ctx, nodes[nodes.length - 1], size);
        } else {
          // No nodes at all, fill with gray
          ctx.fillStyle = '#808080';
          ctx.fillRect(0, 0, size, size);
        }

        const imageData = canvas.toDataURL('image/png');
        updateLayer(newLayer.id, { imageData });
        pushHistory?.('Apply material');
      } finally {
        setIsApplyingToLayer(false);
      }
      return;
    }

    setIsApplyingToLayer(true);

    try {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Find color output node, or use the first output node
      const outputNode = nodes.find(n => n.type === 'output-color') ||
                        nodes.find(n => n.type.startsWith('output-'));

      if (outputNode) {
        await evaluateNodeGraph(ctx, outputNode, size);
      } else if (nodes.length > 0) {
        // No output node, evaluate the last added node
        await evaluateNodeGraph(ctx, nodes[nodes.length - 1], size);
      } else {
        // No nodes at all, fill with gray
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, size, size);
      }

      const imageData = canvas.toDataURL('image/png');
      updateLayer(activeLayerId, { imageData });
      pushHistory?.('Apply material');
    } catch (error) {
      console.error('Failed to apply material:', error);
    } finally {
      setIsApplyingToLayer(false);
    }
  };

  /**
   * Evaluates the node graph to generate a texture
   * @param ctx - Canvas 2D context
   * @param outputNode - The output node to evaluate
   * @param size - Texture resolution
   */
  const evaluateNodeGraph = async (
    ctx: CanvasRenderingContext2D,
    outputNode: MaterialNode,
    size: number
  ) => {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Simple evaluation - in production this would be more sophisticated
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const uv = { x: x / size, y: y / size };

        // Evaluate connected nodes recursively
        const color = evaluateNodeAtUV(outputNode, uv);

        data[i] = Math.round(color.r * 255);
        data[i + 1] = Math.round(color.g * 255);
        data[i + 2] = Math.round(color.b * 255);
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  /**
   * Evaluates a node at a specific UV coordinate
   * @param node - Node to evaluate
   * @param uv - UV coordinates
   * @returns Color value
   */
  const evaluateNodeAtUV = (
    node: MaterialNode,
    uv: { x: number; y: number },
    visited: Set<string> = new Set()
  ): { r: number; g: number; b: number } => {
    // Prevent infinite loops from circular connections
    if (visited.has(node.id)) {
      return { r: 0.5, g: 0.5, b: 0.5 };
    }
    visited.add(node.id);

    // Find connected input nodes
    const getInputValue = (portId: string): unknown => {
      const conn = connections.find(c => c.toNodeId === node.id && c.toPortId === portId);
      if (conn) {
        const sourceNode = nodes.find(n => n.id === conn.fromNodeId);
        if (sourceNode) {
          return evaluateNodeAtUV(sourceNode, uv, new Set(visited));
        }
      }
      // Return default/parameter value
      const param = node.parameters.find(p => p.id === portId);
      return param?.value;
    };

    // Evaluate based on node type
    switch (node.type) {
      case 'color-input': {
        const colorStr = node.parameters.find(p => p.id === 'color')?.value as string || '#808080';
        return hexToRgb(colorStr);
      }

      case 'gradient-input': {
        const color1 = node.parameters.find(p => p.id === 'color1')?.value as string || '#000000';
        const color2 = node.parameters.find(p => p.id === 'color2')?.value as string || '#ffffff';
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);
        const t = uv.x;
        return {
          r: c1.r + (c2.r - c1.r) * t,
          g: c1.g + (c2.g - c1.g) * t,
          b: c1.b + (c2.b - c1.b) * t,
        };
      }

      case 'noise-perlin':
      case 'noise-simplex': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const value = perlinNoise(uv.x * scale, uv.y * scale, seed);
        return { r: value, g: value, b: value };
      }

      case 'noise-fbm':
      case 'noise-turbulence': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const octaves = Number(node.parameters.find(p => p.id === 'octaves')?.value || 4);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
          value += amplitude * perlinNoise(uv.x * frequency, uv.y * frequency, seed + i);
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        value = value / maxValue;
        if (node.type === 'noise-turbulence') value = Math.abs(value);
        return { r: value, g: value, b: value };
      }

      case 'noise-voronoi':
      case 'noise-worley': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const value = voronoiNoise(uv.x * scale, uv.y * scale, seed);
        return { r: value, g: value, b: value };
      }

      case 'noise-white':
      case 'noise-value': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const nx = Math.floor(uv.x * scale) + seed;
        const ny = Math.floor(uv.y * scale);
        const value = Math.abs(Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453) % 1;
        return { r: value, g: value, b: value };
      }

      case 'pattern-checker': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 8);
        const cx = Math.floor(uv.x * scale) % 2;
        const cy = Math.floor(uv.y * scale) % 2;
        const value = (cx + cy) % 2;
        return { r: value, g: value, b: value };
      }

      case 'pattern-stripes': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const angle = Number(node.parameters.find(p => p.id === 'angle')?.value || 0) * Math.PI / 180;
        const rotX = uv.x * Math.cos(angle) - uv.y * Math.sin(angle);
        const value = Math.floor(rotX * scale) % 2;
        return { r: value, g: value, b: value };
      }

      case 'pattern-dots': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const radius = Number(node.parameters.find(p => p.id === 'radius')?.value || 0.3);
        const cx = (uv.x * scale) % 1 - 0.5;
        const cy = (uv.y * scale) % 1 - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const value = dist < radius ? 1 : 0;
        return { r: value, g: value, b: value };
      }

      // Color operations with connection support
      case 'color-mix': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        // Check for connected factor input, otherwise use parameter
        const facInput = getInputValue('fac') as { r: number; g: number; b: number } | number | undefined;
        let factor: number;
        if (facInput !== undefined) {
          if (typeof facInput === 'number') {
            factor = facInput;
          } else {
            factor = (facInput.r + facInput.g + facInput.b) / 3;
          }
        } else {
          factor = Number(node.parameters.find(p => p.id === 'factor')?.value || 0.5);
        }
        return {
          r: a.r + (b.r - a.r) * factor,
          g: a.g + (b.g - a.g) * factor,
          b: a.b + (b.b - a.b) * factor,
        };
      }

      case 'color-multiply': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
      }

      case 'color-add': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        return {
          r: Math.min(1, a.r + b.r),
          g: Math.min(1, a.g + b.g),
          b: Math.min(1, a.b + b.b),
        };
      }

      case 'color-subtract': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        return {
          r: Math.max(0, a.r - b.r),
          g: Math.max(0, a.g - b.g),
          b: Math.max(0, a.b - b.b),
        };
      }

      case 'color-overlay': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const overlay = (base: number, blend: number) =>
          base < 0.5 ? 2 * base * blend : 1 - 2 * (1 - base) * (1 - blend);
        return { r: overlay(a.r, b.r), g: overlay(a.g, b.g), b: overlay(a.b, b.b) };
      }

      case 'color-screen': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        return {
          r: 1 - (1 - a.r) * (1 - b.r),
          g: 1 - (1 - a.g) * (1 - b.g),
          b: 1 - (1 - a.b) * (1 - b.b),
        };
      }

      case 'color-invert': {
        const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        return { r: 1 - input.r, g: 1 - input.g, b: 1 - input.b };
      }

      case 'color-brightness': {
        const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const brightness = Number(node.parameters.find(p => p.id === 'brightness')?.value || 0);
        return {
          r: Math.max(0, Math.min(1, input.r + brightness)),
          g: Math.max(0, Math.min(1, input.g + brightness)),
          b: Math.max(0, Math.min(1, input.b + brightness)),
        };
      }

      case 'color-contrast': {
        const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const contrast = Number(node.parameters.find(p => p.id === 'contrast')?.value || 1);
        return {
          r: Math.max(0, Math.min(1, (input.r - 0.5) * contrast + 0.5)),
          g: Math.max(0, Math.min(1, (input.g - 0.5) * contrast + 0.5)),
          b: Math.max(0, Math.min(1, (input.b - 0.5) * contrast + 0.5)),
        };
      }

      case 'color-grayscale': {
        const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const gray = input.r * 0.299 + input.g * 0.587 + input.b * 0.114;
        return { r: gray, g: gray, b: gray };
      }

      case 'color-hue-shift': {
        const input = getInputValue('color') as { r: number; g: number; b: number } || getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const hueShift = Number(node.parameters.find(p => p.id === 'hue')?.value || 0);
        // Simple hue rotation - rotate RGB channels
        const angle = hueShift * 2 * Math.PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
          r: Math.max(0, Math.min(1, input.r * cos + input.g * sin)),
          g: Math.max(0, Math.min(1, input.g * cos - input.r * sin * 0.5 + input.b * sin * 0.5)),
          b: Math.max(0, Math.min(1, input.b * cos - input.g * sin)),
        };
      }

      case 'filter-brightness': {
        const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0);
        return {
          r: Math.max(0, Math.min(1, input.r + amount)),
          g: Math.max(0, Math.min(1, input.g + amount)),
          b: Math.max(0, Math.min(1, input.b + amount)),
        };
      }

      case 'filter-contrast': {
        const input = getInputValue('input') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 1);
        return {
          r: Math.max(0, Math.min(1, (input.r - 0.5) * amount + 0.5)),
          g: Math.max(0, Math.min(1, (input.g - 0.5) * amount + 0.5)),
          b: Math.max(0, Math.min(1, (input.b - 0.5) * amount + 0.5)),
        };
      }

      // Output node - follow input connection based on actual port IDs
      case 'output-color': {
        const input = getInputValue('color') as { r: number; g: number; b: number };
        if (input) return input;
        return { r: 0.5, g: 0.5, b: 0.5 };
      }
      case 'output-roughness':
      case 'output-metalness':
      case 'output-ao':
      case 'output-height':
      case 'output-opacity': {
        // These have a 'value' input port
        const input = getInputValue('value') as { r: number; g: number; b: number } | number;
        if (input) {
          if (typeof input === 'number') {
            return { r: input, g: input, b: input };
          }
          return input;
        }
        return { r: 0.5, g: 0.5, b: 0.5 };
      }
      case 'output-normal': {
        // Has 'normal' and 'height' inputs
        const normal = getInputValue('normal') as { r: number; g: number; b: number };
        const height = getInputValue('height') as { r: number; g: number; b: number };
        if (normal) return normal;
        if (height) return height;
        return { r: 0.5, g: 0.5, b: 1 }; // Default normal map blue
      }
      case 'output-emission': {
        const color = getInputValue('color') as { r: number; g: number; b: number };
        if (color) return color;
        return { r: 0, g: 0, b: 0 }; // Default no emission
      }
      case 'output-combined': {
        // Show color channel by default
        const color = getInputValue('color') as { r: number; g: number; b: number };
        if (color) return color;
        return { r: 0.5, g: 0.5, b: 0.5 };
      }

      // Value input node - outputs grayscale based on value parameter
      case 'value-input': {
        const value = Number(node.parameters.find(p => p.id === 'value')?.value || 0.5);
        return { r: value, g: value, b: value };
      }

      // UV input - outputs UV coordinates as color (R=U, G=V)
      case 'uv-input': {
        return { r: uv.x, g: uv.y, b: 0 };
      }

      // Ridged noise
      case 'noise-ridged': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const octaves = Number(node.parameters.find(p => p.id === 'octaves')?.value || 4);
        const sharpness = Number(node.parameters.find(p => p.id === 'sharpness')?.value || 2);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
          const n = perlinNoise(uv.x * frequency, uv.y * frequency, seed + i);
          // Ridge function: 1 - abs(n)
          value += amplitude * Math.pow(1 - Math.abs(n * 2 - 1), sharpness);
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        value = value / maxValue;
        return { r: value, g: value, b: value };
      }

      // Brick pattern
      case 'pattern-brick': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const ratio = Number(node.parameters.find(p => p.id === 'ratio')?.value || 2);
        const mortar = Number(node.parameters.find(p => p.id === 'mortar')?.value || 0.05);
        const row = Math.floor(uv.y * scale);
        const offsetX = (row % 2) * 0.5;
        const brickX = (uv.x * scale * ratio + offsetX) % 1;
        const brickY = (uv.y * scale) % 1;
        const isMortar = brickX < mortar || brickX > 1 - mortar || brickY < mortar || brickY > 1 - mortar;
        const value = isMortar ? 0 : 1;
        return { r: value, g: value, b: value };
      }

      // Hexagon pattern
      case 'pattern-hexagon': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 5);
        const gap = Number(node.parameters.find(p => p.id === 'gap')?.value || 0.05);
        // Hexagonal grid
        const s = scale;
        const x = uv.x * s;
        const y = uv.y * s * 1.1547; // sqrt(4/3)
        const row = Math.floor(y);
        const col = Math.floor(x - (row % 2) * 0.5);
        const cx = col + (row % 2) * 0.5 + 0.5;
        const cy = row + 0.5;
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        const dist = Math.max(dx * 0.866 + dy * 0.5, dy);
        const value = dist > 0.5 - gap ? 0 : 1;
        return { r: value, g: value, b: value };
      }

      // Math operations
      case 'math-add': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        return { r: Math.min(1, a.r + b.r), g: Math.min(1, a.g + b.g), b: Math.min(1, a.b + b.b) };
      }

      case 'math-subtract': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        return { r: Math.max(0, a.r - b.r), g: Math.max(0, a.g - b.g), b: Math.max(0, a.b - b.b) };
      }

      case 'math-multiply': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
      }

      case 'math-divide': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        return {
          r: b.r !== 0 ? a.r / b.r : 0,
          g: b.g !== 0 ? a.g / b.g : 0,
          b: b.b !== 0 ? a.b / b.b : 0,
        };
      }

      case 'math-power': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 2, g: 2, b: 2 };
        return { r: Math.pow(a.r, b.r), g: Math.pow(a.g, b.g), b: Math.pow(a.b, b.b) };
      }

      case 'math-min': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        return { r: Math.min(a.r, b.r), g: Math.min(a.g, b.g), b: Math.min(a.b, b.b) };
      }

      case 'math-max': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        return { r: Math.max(a.r, b.r), g: Math.max(a.g, b.g), b: Math.max(a.b, b.b) };
      }

      case 'math-lerp': {
        const a = getInputValue('a') as { r: number; g: number; b: number } || { r: 0, g: 0, b: 0 };
        const b = getInputValue('b') as { r: number; g: number; b: number } || { r: 1, g: 1, b: 1 };
        const factor = Number(node.parameters.find(p => p.id === 'factor')?.value || 0.5);
        return {
          r: a.r + (b.r - a.r) * factor,
          g: a.g + (b.g - a.g) * factor,
          b: a.b + (b.b - a.b) * factor,
        };
      }

      case 'math-clamp': {
        const input = getInputValue('value') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const min = Number(node.parameters.find(p => p.id === 'min')?.value || 0);
        const max = Number(node.parameters.find(p => p.id === 'max')?.value || 1);
        return {
          r: Math.max(min, Math.min(max, input.r)),
          g: Math.max(min, Math.min(max, input.g)),
          b: Math.max(min, Math.min(max, input.b)),
        };
      }

      case 'math-remap': {
        const input = getInputValue('value') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        const inMin = Number(node.parameters.find(p => p.id === 'inMin')?.value || 0);
        const inMax = Number(node.parameters.find(p => p.id === 'inMax')?.value || 1);
        const outMin = Number(node.parameters.find(p => p.id === 'outMin')?.value || 0);
        const outMax = Number(node.parameters.find(p => p.id === 'outMax')?.value || 1);
        const remap = (v: number) => outMin + (v - inMin) / (inMax - inMin) * (outMax - outMin);
        return { r: remap(input.r), g: remap(input.g), b: remap(input.b) };
      }

      // Color split - returns R channel as grayscale
      case 'color-split': {
        const input = getInputValue('color') as { r: number; g: number; b: number } || { r: 0.5, g: 0.5, b: 0.5 };
        // Return the input color - each output port would be accessed separately
        return input;
      }

      // Color combine
      case 'color-combine': {
        const r = getInputValue('r') as { r: number } | number || 0.5;
        const g = getInputValue('g') as { r: number } | number || 0.5;
        const b = getInputValue('b') as { r: number } | number || 0.5;
        return {
          r: typeof r === 'number' ? r : r.r,
          g: typeof g === 'number' ? g : g.r,
          b: typeof b === 'number' ? b : b.r,
        };
      }

      // CS2 wear effect
      case 'cs2-wear': {
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.3);
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const noise = perlinNoise(uv.x * scale, uv.y * scale, seed);
        const wear = noise < amount ? 1 : 0;
        return { r: wear, g: wear, b: wear };
      }

      // CS2 scratches
      case 'cs2-scratches': {
        const density = Number(node.parameters.find(p => p.id === 'density')?.value || 50);
        const angle = Number(node.parameters.find(p => p.id === 'angle')?.value || 45) * Math.PI / 180;
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        // Directional scratches using rotated coordinates
        const rx = uv.x * Math.cos(angle) - uv.y * Math.sin(angle);
        const ry = uv.x * Math.sin(angle) + uv.y * Math.cos(angle);
        const hash = Math.abs(Math.sin(Math.floor(rx * density) * 12.9898 + seed) * 43758.5453) % 1;
        const scratch = (ry * density) % 1 < 0.02 && hash > 0.7 ? 1 : 0;
        return { r: scratch, g: scratch, b: scratch };
      }

      // CS2 dirt
      case 'cs2-dirt': {
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.5);
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 20);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        const noise1 = perlinNoise(uv.x * scale, uv.y * scale, seed);
        const noise2 = perlinNoise(uv.x * scale * 2, uv.y * scale * 2, seed + 100);
        const dirt = (noise1 * 0.7 + noise2 * 0.3) * amount;
        return { r: dirt, g: dirt, b: dirt };
      }

      // CS2 edge wear
      case 'cs2-edge-wear': {
        const amount = Number(node.parameters.find(p => p.id === 'amount')?.value || 0.5);
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 10);
        const seed = Number(node.parameters.find(p => p.id === 'seed')?.value || 0);
        // Use voronoi for edge-like patterns
        const noise = voronoiNoise(uv.x * scale, uv.y * scale, seed);
        const edge = noise < amount ? 1 - noise / amount : 0;
        return { r: edge, g: edge, b: edge };
      }

      // CS2 holographic
      case 'cs2-holographic': {
        const scale = Number(node.parameters.find(p => p.id === 'scale')?.value || 20);
        const intensity = Number(node.parameters.find(p => p.id === 'intensity')?.value || 1);
        // Rainbow effect based on position
        const phase = (uv.x + uv.y) * scale;
        const r = (Math.sin(phase) + 1) * 0.5 * intensity;
        const g = (Math.sin(phase + 2.094) + 1) * 0.5 * intensity; // +120 degrees
        const b = (Math.sin(phase + 4.188) + 1) * 0.5 * intensity; // +240 degrees
        return { r, g, b };
      }

      // CS2 glitter
      case 'cs2-glitter': {
        const density = Number(node.parameters.find(p => p.id === 'density')?.value || 0.5);
        const scale = 100;
        const nx = Math.floor(uv.x * scale);
        const ny = Math.floor(uv.y * scale);
        const random = Math.abs(Math.sin(nx * 12.9898 + ny * 78.233) * 43758.5453) % 1;
        const glitter = random > (1 - density * 0.1) ? 1 : 0;
        return { r: glitter, g: glitter, b: glitter };
      }

      // Fresnel effect
      case 'fresnel': {
        const ior = Number(node.parameters.find(p => p.id === 'ior')?.value || 1.45);
        // Simplified fresnel - use UV.y as a stand-in for view angle
        const facing = 1 - Math.abs(uv.y * 2 - 1);
        const fresnel = Math.pow(1 - facing, 5) * (1 - ior) + ior;
        return { r: fresnel, g: fresnel, b: fresnel };
      }

      default:
        return { r: 0.5, g: 0.5, b: 0.5 };
    }
  };

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Downloads a data URL as a file
   * @param dataUrl - The data URL to download
   * @param filename - Name of the downloaded file
   */
  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Converts hex color string to RGB object
   * @param hex - Hex color string (e.g., "#ff6600")
   * @returns RGB object with values 0-1
   */
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    } : { r: 0.5, g: 0.5, b: 0.5 };
  };

  /**
   * Simple Perlin-like noise implementation
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param seed - Random seed
   * @returns Noise value 0-1
   */
  const perlinNoise = (x: number, y: number, seed: number): number => {
    const hash = (n: number) => {
      const s = Math.sin(n + seed) * 43758.5453;
      return s - Math.floor(s);
    };

    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const a = hash(ix + iy * 57);
    const b = hash(ix + 1 + iy * 57);
    const c = hash(ix + (iy + 1) * 57);
    const d = hash(ix + 1 + (iy + 1) * 57);

    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  /**
   * Simple Voronoi noise implementation
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param seed - Random seed
   * @returns Distance to nearest cell center 0-1
   */
  const voronoiNoise = (x: number, y: number, seed: number): number => {
    const hash = (ix: number, iy: number) => {
      const n = ix + iy * 57 + seed;
      return {
        x: Math.sin(n) * 43758.5453 % 1,
        y: Math.sin(n * 1.3) * 43758.5453 % 1,
      };
    };

    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let minDist = 1;

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const cellX = ix + ox;
        const cellY = iy + oy;
        const point = hash(cellX, cellY);
        const dx = cellX + point.x - x;
        const dy = cellY + point.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        minDist = Math.min(minDist, dist);
      }
    }

    return minDist;
  };

  /**
   * Gets the color for a node based on its type/category
   * @param type - Node type
   * @returns CSS color string
   */
  const getNodeColor = (type: MaterialNodeType): string => {
    if (type.startsWith('color-')) return '#e74c3c';
    if (type.startsWith('math-')) return '#3498db';
    if (type.startsWith('pattern-')) return '#9b59b6';
    if (type.startsWith('noise-')) return '#2ecc71';
    if (type.startsWith('filter-')) return '#f1c40f';
    if (type.startsWith('transform-')) return '#e67e22';
    if (type.startsWith('output-')) return '#1abc9c';
    if (type.startsWith('cs2-')) return '#ff6b6b';
    if (type.startsWith('light-') || type === 'fresnel' || type === 'specular' || type === 'diffuse') return '#f39c12';
    return '#95a5a6';
  };

  /**
   * Gets the position of a port for drawing connections
   * @param nodeId - Node ID
   * @param portId - Port ID
   * @param isOutput - Whether this is an output port
   * @returns Position coordinates
   */
  const getPortPosition = (nodeId: string, portId: string, isOutput: boolean): { x: number; y: number } => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const ports = isOutput ? node.outputs : node.inputs;
    const portIndex = ports.findIndex(p => p.id === portId);

    // Node layout heights:
    // - Header: 36px (px-3 py-2 with text)
    // - Preview thumbnail: 80px (pt-2 = 8px + h-16 = 64px + px-2 = 8px padding)
    // - Content padding top: 8px (p-2)
    // - Each port row: 24px (py-1 = 8px total + 12px circle + 4px gap)
    // - Each parameter row: ~32px average

    const headerHeight = 36;
    const hasPreview = nodePreviews.has(node.id);
    const previewHeight = hasPreview ? 80 : 0;
    const contentPaddingTop = 8;
    const portRowHeight = 24;
    const paramRowHeight = 32;

    let y = node.position.y + headerHeight + previewHeight + contentPaddingTop;

    if (isOutput) {
      // Output ports are at the bottom, after inputs and parameters
      y += node.inputs.length * portRowHeight; // All input ports
      y += node.parameters.length * paramRowHeight; // All parameters
      y += portIndex * portRowHeight; // This output port's position
      y += 6; // Center in the port row
    } else {
      // Input ports are at the top
      y += portIndex * portRowHeight;
      y += 6; // Center in the port row
    }

    return {
      x: node.position.x + (isOutput ? 220 : 0),
      y,
    };
  };

  // Get selected node for properties panel
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Filter nodes based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return NODE_CATEGORIES;

    return NODE_CATEGORIES.map(category => ({
      ...category,
      nodes: category.nodes.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter(category => category.nodes.length > 0);
  }, [searchQuery]);

  // ==================== RENDER ====================

  return (
    <div className={cn('bg-[#0a0a0b] flex flex-col relative h-full', className)}>
      {/* Top Toolbar */}
      <div className="h-12 bg-[#121214] border-b border-white/10 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
          <Input
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            className="w-48 h-8 bg-white/5 border-white/10 text-white"
            placeholder="Material name"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Add Node button */}
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              const rect = (e.target as HTMLElement).closest('div')?.parentElement?.getBoundingClientRect();
              setNodePickerPosition({
                x: rect ? rect.width / 2 : 400,
                y: rect ? rect.height / 2 : 300,
              });
              setShowNodePicker(true);
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white"
            title="Add node (or right-click on canvas)"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Node
          </Button>

          <div className="w-px h-6 bg-white/10" />

          {/* View controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-white/10" />

          {/* Action buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={duplicateSelectedNode}
            disabled={!selectedNodeId}
            title="Duplicate node"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteSelectedNode}
            disabled={!selectedNodeId}
            title="Delete node"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-white/10" />

          {/* Preview toggle */}
          <Button
            variant={previewMode === '3d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(previewMode === '2d' ? '3d' : '2d')}
            title="Toggle 3D preview"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {/* Apply to Layer button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={applyToActiveLayer}
            disabled={isApplyingToLayer || nodes.length === 0}
            title={activeLayerId ? "Apply material to active layer" : "Create new layer with material"}
            className="gap-1"
          >
            {isApplyingToLayer ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PaintBucket className="w-4 h-4" />
            )}
            <span className="text-xs">Apply</span>
          </Button>

          {/* Export button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            title="Export textures"
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          onContextMenu={handleContextMenu}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          style={{
            cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'default',
          }}
        >
          {/* Grid background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern
                id="grid"
                width={20 * zoom}
                height={20 * zoom}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid)"
              transform={`translate(${pan.x % (20 * zoom)}, ${pan.y % (20 * zoom)})`}
            />
          </svg>

          {/* Connections - clickable to select and delete */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {connections.map(conn => {
              const from = getPortPosition(conn.fromNodeId, conn.fromPortId, true);
              const to = getPortPosition(conn.toNodeId, conn.toPortId, false);
              const midX = (from.x + to.x) / 2;
              const pathD = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
              // Compensate stroke width for zoom so lines stay consistent
              const strokeW = 2 / zoom;
              const isSelected = selectedConnectionId === conn.id;

              return (
                <g key={conn.id}>
                  {/* Invisible wider path for easier clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(10 / zoom, strokeW * 5)}
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConnectionId(conn.id);
                      setSelectedNodeId(null);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      // Double-click to delete connection
                      setConnections(prev => prev.filter(c => c.id !== conn.id));
                      setSelectedConnectionId(null);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Right-click to delete connection
                      setConnections(prev => prev.filter(c => c.id !== conn.id));
                      setSelectedConnectionId(null);
                    }}
                  />
                  {/* Visible connection line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isSelected ? '#00ff00' : '#ff6600'}
                    strokeWidth={isSelected ? strokeW * 1.5 : strokeW}
                    opacity={isSelected ? 1 : 0.8}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })}

            {/* Active connection being drawn */}
            {connecting && (() => {
              const fromPos = getPortPosition(connecting.nodeId, connecting.portId, connecting.isOutput);
              // Convert screen coordinates to canvas coordinates
              const rect = canvasRef.current?.getBoundingClientRect();
              const offsetX = rect ? rect.left : 0;
              const offsetY = rect ? rect.top : 0;
              const toX = (lastMousePos.x - offsetX - pan.x) / zoom;
              const toY = (lastMousePos.y - offsetY - pan.y) / zoom;
              const midX = (fromPos.x + toX) / 2;
              const strokeW = 2 / zoom;

              return (
                <path
                  d={`M ${fromPos.x} ${fromPos.y} C ${midX} ${fromPos.y}, ${midX} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke="#ff6600"
                  strokeWidth={strokeW}
                  strokeDasharray={`${5/zoom},${5/zoom}`}
                  opacity={0.6}
                />
              );
            })()}
          </svg>

          {/* Empty state placeholder */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center p-8 bg-black/40 rounded-xl border border-white/10">
                <Grid3X3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white/60 mb-2">No Nodes Yet</h3>
                <p className="text-sm text-white/40 mb-4">
                  Click &quot;Add Node&quot; button above or<br />
                  right-click anywhere to add nodes
                </p>
                <p className="text-xs text-white/30">
                  Connect nodes by clicking on ports
                </p>
              </div>
            </div>
          )}

          {/* Nodes */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {nodes.map(node => (
              <div
                key={node.id}
                className={cn(
                  'absolute w-[220px] bg-[#1a1a1c] rounded-lg border-2 shadow-xl select-none',
                  selectedNodeId === node.id ? 'border-orange-500' : 'border-white/10'
                )}
                style={{ left: node.position.x, top: node.position.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                {/* Node header */}
                <div
                  className="px-3 py-2 rounded-t-lg text-white text-sm font-medium cursor-move"
                  style={{ backgroundColor: getNodeColor(node.type) }}
                >
                  {node.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </div>

                {/* Node preview thumbnail */}
                {nodePreviews.get(node.id) && (
                  <div className="px-2 pt-2">
                    <img
                      src={nodePreviews.get(node.id)}
                      alt="Node preview"
                      className="w-full h-16 rounded border border-white/10 object-cover bg-black"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                )}

                {/* Node content */}
                <div className="p-2">
                  {/* Input ports */}
                  {node.inputs.map((port) => (
                    <div key={port.id} className="flex items-center gap-2 py-1">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full border-2 cursor-crosshair transition-colors',
                          connecting?.nodeId === node.id && connecting?.portId === port.id
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-transparent border-white/40 hover:border-orange-400 hover:bg-orange-400/20'
                        )}
                        style={{ marginLeft: -8 }}
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, false)}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id, false)}
                      />
                      <span className="text-xs text-white/60">{port.name}</span>
                    </div>
                  ))}

                  {/* Parameters */}
                  {node.parameters.map(param => (
                    <div key={param.id} className="py-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-white/40">{param.name}</span>
                        {(param.type === 'float' || param.type === 'int') && (
                          <span className="text-[10px] text-white/60">
                            {param.type === 'float'
                              ? (param.value as number).toFixed(2)
                              : param.value as number}
                          </span>
                        )}
                      </div>

                      {param.type === 'color' && (
                        <input
                          type="color"
                          value={param.value as string}
                          onChange={(e) => updateNodeParameter(node.id, param.id, e.target.value)}
                          className="w-full h-6 rounded cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {param.type === 'float' && (
                        <Slider
                          value={[param.value as number]}
                          onValueChange={([v]) => updateNodeParameter(node.id, param.id, v)}
                          min={param.min || 0}
                          max={param.max || 1}
                          step={0.01}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {param.type === 'int' && (
                        <Slider
                          value={[param.value as number]}
                          onValueChange={([v]) => updateNodeParameter(node.id, param.id, Math.round(v))}
                          min={param.min || 0}
                          max={param.max || 10}
                          step={1}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {param.type === 'enum' && (
                        <Select
                          value={param.value as string}
                          onValueChange={(v) => updateNodeParameter(node.id, param.id, v)}
                        >
                          <SelectTrigger className="h-6 text-xs bg-white/5 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map((opt) => (
                              <SelectItem key={opt} value={opt} className="text-xs">
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {param.type === 'bool' && (
                        <Button
                          variant={param.value ? 'default' : 'ghost'}
                          size="sm"
                          className="w-full h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNodeParameter(node.id, param.id, !param.value);
                          }}
                        >
                          {param.value ? 'Enabled' : 'Disabled'}
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Output ports */}
                  {node.outputs.map((port) => (
                    <div key={port.id} className="flex items-center justify-end gap-2 py-1">
                      <span className="text-xs text-white/60">{port.name}</span>
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full border-2 cursor-crosshair transition-colors',
                          connecting?.nodeId === node.id && connecting?.portId === port.id
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-transparent border-white/40 hover:border-orange-400 hover:bg-orange-400/20'
                        )}
                        style={{ marginRight: -8 }}
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, true)}
                        onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id, true)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Zoom indicator */}
          <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-xs text-white/60">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-72 bg-[#121214] border-l border-white/10 overflow-auto">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-sm font-medium text-white">
                {selectedNode.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </h3>
              <p className="text-[10px] text-white/40 mt-1">
                Node ID: {selectedNode.id}
              </p>
            </div>

            <div className="p-3 space-y-4">
              {selectedNode.parameters.map(param => (
                <div key={param.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white/60">
                      {param.name}
                    </label>
                    {(param.type === 'float' || param.type === 'int') && (
                      <Input
                        type="number"
                        value={param.value as number}
                        onChange={(e) => updateNodeParameter(
                          selectedNode.id,
                          param.id,
                          param.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value)
                        )}
                        className="w-20 h-6 text-xs bg-white/5 border-white/10"
                        step={param.type === 'int' ? 1 : 0.01}
                      />
                    )}
                  </div>

                  {param.type === 'color' && (
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={param.value as string}
                        onChange={(e) => updateNodeParameter(selectedNode.id, param.id, e.target.value)}
                        className="w-10 h-8 rounded cursor-pointer bg-transparent"
                      />
                      <Input
                        value={param.value as string}
                        onChange={(e) => updateNodeParameter(selectedNode.id, param.id, e.target.value)}
                        className="flex-1 h-8 bg-white/5 border-white/10 text-white font-mono text-xs"
                      />
                    </div>
                  )}

                  {(param.type === 'float' || param.type === 'int') && (
                    <Slider
                      value={[param.value as number]}
                      onValueChange={([v]) => updateNodeParameter(
                        selectedNode.id,
                        param.id,
                        param.type === 'int' ? Math.round(v) : v
                      )}
                      min={param.min || 0}
                      max={param.max || 1}
                      step={param.type === 'int' ? 1 : 0.01}
                    />
                  )}

                  {param.type === 'enum' && (
                    <Select
                      value={param.value as string}
                      onValueChange={(v) => updateNodeParameter(selectedNode.id, param.id, v)}
                    >
                      <SelectTrigger className="h-8 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {param.type === 'bool' && (
                    <Button
                      variant={param.value ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => updateNodeParameter(selectedNode.id, param.id, !param.value)}
                    >
                      {param.value ? 'Enabled' : 'Disabled'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Node Picker Modal */}
      {showNodePicker && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bg-[#1a1a1c] border border-white/10 rounded-lg shadow-2xl w-80 max-h-[500px] overflow-hidden z-50"
          style={{ left: nodePickerPosition.x, top: nodePickerPosition.y }}
        >
          {/* Search */}
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="pl-8 bg-white/5 border-white/10 text-white"
                autoFocus
              />
            </div>
          </div>

          {/* Categories */}
          <ScrollArea className="h-[400px]">
            <div className="p-1">
              {filteredCategories.map(category => (
                <div key={category.name} className="mb-2">
                  <button
                    onClick={() => setActiveCategory(
                      activeCategory === category.name ? null : category.name
                    )}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-white/60 uppercase tracking-wider hover:bg-white/5 rounded"
                  >
                    <category.icon className="w-3.5 h-3.5" />
                    <span className="flex-1 text-left">{category.name}</span>
                    <span className="text-white/30">{category.nodes.length}</span>
                  </button>

                  {(searchQuery || activeCategory === category.name) && (
                    <div className="ml-2">
                      {category.nodes.map(node => (
                        <button
                          key={node.type}
                          onClick={() => addNode(node.type as MaterialNodeType)}
                          className="w-full flex flex-col px-3 py-2 rounded hover:bg-white/5 text-left"
                        >
                          <span className="text-sm text-white">{node.name}</span>
                          <span className="text-[10px] text-white/40">{node.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Close button */}
          <div className="p-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-white/60"
              onClick={() => setShowNodePicker(false)}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1a1c] border border-white/10 rounded-xl w-[480px] overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Export for CS2 Workshop</h2>
              <p className="text-sm text-white/60 mt-1">
                Bake textures and export for use with CS2 Workshop Tools
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-sm text-white/80">Texture Resolution</label>
                <div className="flex gap-2">
                  {TEXTURE_RESOLUTIONS.map(res => (
                    <Button
                      key={res}
                      variant={exportResolution === res ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExportResolution(res)}
                      className={exportResolution === res ? 'bg-orange-500' : ''}
                    >
                      {res}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Channels */}
              <div className="space-y-2">
                <label className="text-sm text-white/80">Texture Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEXTURE_CHANNELS.map(channel => (
                    <label
                      key={channel.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                        exportChannels.includes(channel.id)
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-white/10 hover:border-white/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={exportChannels.includes(channel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportChannels(prev => [...prev, channel.id]);
                          } else {
                            setExportChannels(prev => prev.filter(c => c !== channel.id));
                          }
                        }}
                        className="hidden"
                      />
                      <span className="text-sm text-white/80">{channel.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Output naming */}
              <div className="space-y-2">
                <label className="text-sm text-white/80">Output Files</label>
                <div className="bg-black/30 rounded p-3 space-y-1">
                  {exportChannels.map(channelId => {
                    const channel = TEXTURE_CHANNELS.find(c => c.id === channelId);
                    if (!channel) return null;
                    return (
                      <div key={channelId} className="text-xs text-white/60 font-mono">
                        {materialName.replace(/[^a-zA-Z0-9]/g, '_')}{channel.suffix}.png
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowExportDialog(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || exportChannels.length === 0}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export Textures
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
