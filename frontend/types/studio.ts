/**
 * CS2 Skin Studio Type Definitions
 *
 * Comprehensive TypeScript types for the CS2 Skin Studio application.
 * Includes interfaces for layers, materials, masks, tools, and project data.
 *
 * @module types/studio
 */

// ==================== USER & PROJECT ====================

/**
 * Steam user profile information
 * Retrieved via Steam OpenID authentication
 */
export interface SteamUser {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

/**
 * Studio project containing sticker artwork and metadata
 * Projects are persisted to the backend and can be shared
 */
export interface StudioProject {
  id: string;
  name: string;
  type: 'sticker';
  stickerType: StickerType;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  data?: ProjectData;
}

/**
 * CS2 sticker finish types
 * Determines the visual effect applied to the sticker
 */
export type StickerType =
  | 'paper'
  | 'glitter'
  | 'holo'
  | 'foil'
  | 'gold'
  | 'lenticular'
  | 'champion';

/**
 * Complete project data structure
 * Contains all canvas state, layers, brushes, materials, and settings
 */
export interface ProjectData {
  width: number;
  height: number;
  layers: Layer[];
  brushes: CustomBrush[];
  materials: SmartMaterial[];
  smartMasks: SmartMask[];
  environment: EnvironmentSettings;
  lenticularFrames?: LenticularFrame[];
  activeLayerId: string | null;
  activeTool: ToolType;
  primaryColor: string;
  secondaryColor: string;
}

// ==================== LAYER SYSTEM ====================

/**
 * Layer structure for the canvas
 * Supports raster, vector, text, shape, and group layers
 * with masks, effects, and transformations
 */
export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  imageData?: string;
  mask?: LayerMask;
  smartMask?: SmartMaskInstance;
  children?: string[]; // Child layer IDs for groups
  parentId?: string; // Parent group layer ID
  isExpanded?: boolean;
  transform?: Transform;
  // Text layer specific
  textContent?: TextLayerContent;
  // Shape layer specific
  shapeContent?: ShapeLayerContent;
  // Vector layer specific
  vectorContent?: VectorLayerContent;
  // Smart fill
  smartFill?: SmartMaterialInstance;
  // Layer effects (drop shadow, glow, etc.)
  effects?: LayerEffect[];
  // Merge marker for layers that need to be composited
  needsMerge?: boolean;
  mergeSourceIds?: string[];
}

/** Available layer types in the editor */
export type LayerType =
  | 'raster'
  | 'vector'
  | 'text'
  | 'shape'
  | 'group'
  | 'adjustment'
  | 'smart-object'
  | 'normal'
  | 'metalness'
  | 'roughness'
  | 'ao';

/** 2D transformation properties for layers and objects */
export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
}

/** Layer mask for non-destructive masking */
export interface LayerMask {
  enabled: boolean;
  linked: boolean;
  imageData?: string;
  inverted?: boolean;
}

/** Photoshop-compatible blend modes for layer compositing */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'dissolve'
  | 'linear-burn'
  | 'linear-dodge'
  | 'vivid-light'
  | 'linear-light'
  | 'pin-light'
  | 'hard-mix';

// ==================== TEXT SYSTEM ====================

/**
 * Text layer content and styling
 * Supports fonts, colors, stroke, shadow, gradients, and warping
 */
export interface TextLayerContent {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  color: string;
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  gradient?: Gradient;
  warp?: TextWarp;
}

/** Text warp/distortion settings for creative text effects */
export interface TextWarp {
  type: 'none' | 'arc' | 'arch' | 'bulge' | 'flag' | 'wave' | 'fish' | 'rise' | 'fisheye' | 'inflate' | 'squeeze' | 'twist';
  bend: number;
  horizontalDistortion: number;
  verticalDistortion: number;
}

/** Google Fonts API font metadata */
export interface GoogleFont {
  family: string;
  variants: string[];
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
}

// ==================== SHAPE SYSTEM ====================

/**
 * Shape layer content with fill, stroke, and geometry
 * Supports rectangles, ellipses, polygons, stars, and custom paths
 */
export interface ShapeLayerContent {
  type: ShapeType;
  fill?: string | Gradient | SmartMaterialInstance;
  stroke?: {
    color: string;
    width: number;
    dashArray?: number[];
  };
  cornerRadius?: number;
  points?: { x: number; y: number }[];
  // Star/Polygon specific
  innerRadius?: number;
  outerRadius?: number;
  sides?: number;
}

/** Available shape primitives and custom path types */
export type ShapeType = 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line' | 'path' | 'custom';

// ==================== VECTOR PATH SYSTEM ====================

/** Bezier curve point with control handles for vector paths */
export interface VectorPoint {
  x: number;
  y: number;
  // Control points for bezier curves (relative to point)
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
  // Corner type affects handle behavior
  cornerType?: 'smooth' | 'corner' | 'symmetric';
}

/** Vector path with points, fill, and stroke styling */
export interface VectorPath {
  id: string;
  points: VectorPoint[];
  closed: boolean;
  fill?: string;
  stroke?: {
    color: string;
    width: number;
    dashArray?: number[];
    cap?: 'butt' | 'round' | 'square';
    join?: 'miter' | 'round' | 'bevel';
  };
}

/** Vector layer containing multiple editable paths */
export interface VectorLayerContent {
  paths: VectorPath[];
  activePath?: string;
  selectedPoints?: { pathId: string; pointIndex: number }[];
}

// ==================== SMART MATERIALS (Node-Based) ====================

/**
 * Node-based procedural material definition
 * Materials are built from connected nodes that generate textures
 */
export interface SmartMaterial {
  id: string;
  name: string;
  category: string;
  nodes: MaterialNode[];
  connections: NodeConnection[];
  outputNodeId: string;
  thumbnail?: string;
}

/** Instance of a smart material applied to a layer with custom parameters */
export interface SmartMaterialInstance {
  materialId: string;
  parameters: Record<string, number | string | boolean>;
}

/** Node in the material graph with inputs, outputs, and parameters */
export interface MaterialNode {
  id: string;
  type: MaterialNodeType;
  position: { x: number; y: number };
  inputs: NodePort[];
  outputs: NodePort[];
  parameters: NodeParameter[];
}

/**
 * Available node types for the material graph
 * Includes input, math, color, pattern, noise, filter, transform, CS2, and output nodes
 */
export type MaterialNodeType =
  // Input nodes
  | 'color-input'
  | 'texture-input'
  | 'gradient-input'
  | 'noise-input'
  | 'uv-input'
  | 'position-input'
  | 'normal-input'
  | 'time-input'
  | 'value-input'
  // Lighting nodes
  | 'light-direction'
  | 'light-color'
  | 'ambient-light'
  | 'fresnel'
  | 'reflection'
  | 'specular'
  | 'diffuse'
  | 'shadow'
  | 'ao-input'
  // Math nodes
  | 'math-add'
  | 'math-subtract'
  | 'math-multiply'
  | 'math-divide'
  | 'math-power'
  | 'math-abs'
  | 'math-sin'
  | 'math-cos'
  | 'math-lerp'
  | 'math-clamp'
  | 'math-remap'
  | 'math-sqrt'
  | 'math-min'
  | 'math-max'
  | 'math-floor'
  | 'math-ceil'
  | 'math-round'
  | 'math-frac'
  | 'math-mod'
  | 'math-step'
  | 'math-smoothstep'
  | 'math-tan'
  | 'math-asin'
  | 'math-acos'
  | 'math-atan'
  | 'math-atan2'
  | 'math-dot'
  | 'math-cross'
  | 'math-normalize'
  | 'math-length'
  | 'math-distance'
  // Color nodes
  | 'color-mix'
  | 'color-overlay'
  | 'color-screen'
  | 'color-multiply'
  | 'color-add'
  | 'color-subtract'
  | 'color-hue-shift'
  | 'color-saturation'
  | 'color-brightness'
  | 'color-contrast'
  | 'color-gamma'
  | 'color-levels'
  | 'color-curves'
  | 'color-invert'
  | 'color-grayscale'
  | 'color-sepia'
  | 'color-threshold'
  | 'color-posterize'
  | 'color-split'
  | 'color-combine'
  | 'color-hsv-split'
  | 'color-hsv-combine'
  | 'color-gradient-map'
  | 'color-channel-mask'
  | 'color-difference'
  | 'color-exclusion'
  // Pattern nodes
  | 'pattern-checker'
  | 'pattern-stripes'
  | 'pattern-dots'
  | 'pattern-grid'
  | 'pattern-hexagon'
  | 'pattern-voronoi'
  | 'pattern-brick'
  | 'pattern-tile'
  | 'pattern-wave'
  | 'pattern-zigzag'
  | 'pattern-circle'
  | 'pattern-spiral'
  | 'pattern-weave'
  // Noise nodes
  | 'noise-perlin'
  | 'noise-simplex'
  | 'noise-worley'
  | 'noise-fbm'
  | 'noise-turbulence'
  | 'noise-ridged'
  | 'noise-billow'
  | 'noise-voronoi'
  | 'noise-gradient'
  | 'noise-value'
  | 'noise-white'
  | 'noise-blue'
  // Filter nodes
  | 'filter-blur'
  | 'filter-sharpen'
  | 'filter-edge'
  | 'filter-emboss'
  | 'filter-dilate'
  | 'filter-erode'
  | 'filter-median'
  | 'filter-warp'
  | 'filter-distort'
  | 'filter-pixelate'
  | 'filter-mosaic'
  | 'filter-chromatic'
  | 'filter-vignette'
  | 'filter-brightness'
  | 'filter-contrast'
  | 'filter-normal-map'
  | 'filter-ao-bake'
  | 'filter-curvature'
  | 'filter-position'
  | 'filter-noise-warp'
  // Transform nodes
  | 'transform-scale'
  | 'transform-rotate'
  | 'transform-translate'
  | 'transform-tile'
  | 'transform-uv-transform'
  | 'transform-radial'
  | 'transform-twist'
  | 'transform-spherize'
  | 'transform-mirror'
  | 'transform-kaleidoscope'
  // CS2-specific nodes
  | 'cs2-wear'
  | 'cs2-scratches'
  | 'cs2-dirt'
  | 'cs2-edge-wear'
  | 'cs2-fingerprints'
  | 'cs2-grunge'
  | 'cs2-rust'
  | 'cs2-paint-chip'
  | 'cs2-holographic'
  | 'cs2-glitter'
  | 'cs2-foil'
  | 'cs2-pearlescent'
  // Output nodes
  | 'output-color'
  | 'output-normal'
  | 'output-metalness'
  | 'output-roughness'
  | 'output-ao'
  | 'output-emission'
  | 'output-height'
  | 'output-opacity'
  | 'output-combined';

/** Input/output port on a material node for connections */
export interface NodePort {
  id: string;
  name: string;
  type: 'color' | 'float' | 'vector2' | 'vector3' | 'texture';
  value?: unknown;
}

/** Configurable parameter for a material node */
export interface NodeParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'color' | 'enum' | 'texture';
  value: unknown;
  min?: number;
  max?: number;
  options?: string[];
}

/** Connection between two node ports in the material graph */
export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

// ==================== SMART MASKS ====================

/**
 * Procedural mask definition with configurable parameters
 * Smart masks generate dynamic alpha masks based on algorithms
 */
export interface SmartMask {
  id: string;
  name: string;
  type: SmartMaskType;
  parameters: SmartMaskParameters;
  thumbnail?: string;
}

/** Instance of a smart mask applied to a layer with custom parameters */
export interface SmartMaskInstance {
  maskId: string;
  parameters: Record<string, number | string | boolean>;
}

/** Available smart mask types */
export type SmartMaskType =
  | 'corner-radius'
  | 'border-gradient'
  | 'vignette'
  | 'radial-gradient'
  | 'linear-gradient'
  | 'noise-mask'
  | 'pattern-mask'
  | 'edge-detect'
  | 'distance-field'
  | 'custom-node';

/** Configurable parameters for different smart mask types */
export interface SmartMaskParameters {
  // Corner radius mask
  cornerRadius?: number;
  cornerSmooth?: number;
  // Border gradient mask
  borderWidth?: number;
  borderSoftness?: number;
  borderOffset?: number;
  // Vignette
  vignetteStrength?: number;
  vignetteRadius?: number;
  vignetteSoftness?: number;
  // Gradient masks
  gradientAngle?: number;
  gradientStops?: GradientStop[];
  // Noise mask
  noiseScale?: number;
  noiseOctaves?: number;
  noisePersistence?: number;
  noiseSeed?: number;
  // Pattern mask
  patternType?: string;
  patternScale?: number;
  patternRotation?: number;
  // Custom node mask
  nodeGraphId?: string;
}

// ==================== ENVIRONMENT LIGHTING ====================

/**
 * Environment lighting settings for 3D preview rendering
 * Controls ambient light, reflections, shadows, and background
 */
export interface EnvironmentSettings {
  preset: EnvironmentPreset;
  customHdri?: string;
  rotation: number;
  intensity: number;
  backgroundColor: string;
  showReflections: boolean;
  shadowIntensity: number;
  ambientOcclusion: boolean;
  aoStrength: number;
}

/** Built-in environment lighting presets */
export type EnvironmentPreset =
  | 'studio-soft'
  | 'studio-hard'
  | 'outdoor-sunny'
  | 'outdoor-cloudy'
  | 'sunset'
  | 'night'
  | 'neon'
  | 'dramatic'
  | 'product-shot'
  | 'custom';

/** Individual light source for scene illumination */
export interface LightSource {
  id: string;
  type: 'point' | 'directional' | 'spot' | 'area';
  color: string;
  intensity: number;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  castShadow: boolean;
  shadowSoftness?: number;
}

// ==================== LENTICULAR STICKER ====================

/** Single frame in a lenticular animation sequence */
export interface LenticularFrame {
  id: string;
  index: number;
  imageData: string;
  layers: Layer[];
  thumbnail?: string;
}

/** Settings for lenticular sticker animation behavior */
export interface LenticularSettings {
  frameCount: number;
  animationType: LenticularAnimationType;
  transitionType: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loopMode: 'loop' | 'ping-pong' | 'once';
  fps: number;
}

/** Animation types for lenticular stickers */
export type LenticularAnimationType =
  | 'flip'
  | 'morph'
  | 'zoom'
  | '3d-depth'
  | 'animation'
  | 'custom';

// ==================== GENERATORS ====================

/** Procedural texture generator configuration */
export interface Generator {
  id: string;
  name: string;
  type: GeneratorType;
  parameters: GeneratorParameters;
}

/** Available procedural generator types */
export type GeneratorType =
  | 'noise'
  | 'pattern'
  | 'gradient'
  | 'plasma'
  | 'clouds'
  | 'marble'
  | 'wood'
  | 'metal'
  | 'fabric'
  | 'leather'
  | 'concrete'
  | 'rust'
  | 'scratches'
  | 'dirt'
  | 'grunge';

/** Parameters for procedural texture generation */
export interface GeneratorParameters {
  seed?: number;
  scale?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  colors?: string[];
  contrast?: number;
  brightness?: number;
  rotation?: number;
  tiling?: boolean;
  [key: string]: unknown;
}

// ==================== TOOLS ====================

/** Available drawing and editing tools in the studio */
export type ToolType =
  | 'brush'
  | 'eraser'
  | 'selection-rect'
  | 'selection-lasso'
  | 'selection-magic'
  | 'selection-object'
  | 'fill'
  | 'gradient'
  | 'vector-pen'
  | 'vector-shape'
  | 'text'
  | 'eyedropper'
  | 'move'
  | 'transform'
  | 'zoom'
  | 'hand'
  | 'clone'
  | 'heal'
  | 'smudge'
  | 'blur'
  | 'sharpen'
  | 'dodge'
  | 'burn'
  | 'sponge'
  | 'warp'
  | 'perspective';

// ==================== BRUSH ====================

/**
 * Custom brush with full dynamics support
 * Includes pressure sensitivity, texture, and shape dynamics
 */
export interface CustomBrush {
  id: string;
  name: string;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  angle: number;
  roundness: number;
  scatterX: number;
  scatterY: number;
  pressureSize: boolean;
  pressureOpacity: boolean;
  pressureFlow: boolean;
  tiltAngle: boolean;
  texture?: string;
  shape?: BrushShape;
  // Advanced
  dualBrush?: boolean;
  colorDynamics?: ColorDynamics;
  transferDynamics?: TransferDynamics;
  shapeDynamics?: ShapeDynamics;
}

/** Available brush tip shapes */
export type BrushShape = 'round' | 'square' | 'custom';

/** Color variation settings for brush strokes */
export interface ColorDynamics {
  foregroundBackgroundJitter: number;
  hueJitter: number;
  saturationJitter: number;
  brightnessJitter: number;
}

/** Opacity and flow variation settings for brush strokes */
export interface TransferDynamics {
  opacityJitter: number;
  flowJitter: number;
}

/** Size and shape variation settings for brush strokes */
export interface ShapeDynamics {
  sizeJitter: number;
  angleJitter: number;
  roundnessJitter: number;
}

/** Complete brush stroke with all points and brush settings */
export interface BrushStroke {
  points: StrokePoint[];
  brush: CustomBrush;
  color: string;
}

/** Single point in a brush stroke with pressure and tilt data */
export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
}

// ==================== GRADIENTS ====================

/** Single color stop in a gradient */
export interface GradientStop {
  offset: number;
  color: string;
}

/** Gradient definition with type, stops, and transformation */
export interface Gradient {
  id?: string;
  name?: string;
  type: 'linear' | 'radial' | 'angle' | 'diamond' | 'reflected';
  stops: GradientStop[];
  angle?: number;
  scale?: number;
  reverse?: boolean;
}

// ==================== SELECTION ====================

/** Active selection with path and bounds */
export interface Selection {
  type: 'rect' | 'ellipse' | 'lasso' | 'magic' | 'object';
  path?: Path2D;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  feather?: number;
  antiAlias?: boolean;
}

// ==================== EFFECTS ====================

/** Layer effect (shadow, glow, bevel, etc.) with blend options */
export interface LayerEffect {
  id: string;
  type: LayerEffectType;
  enabled: boolean;
  blendMode: BlendMode;
  opacity: number;
  parameters: Record<string, unknown>;
}

/** Available layer effect types */
export type LayerEffectType =
  | 'drop-shadow'
  | 'inner-shadow'
  | 'outer-glow'
  | 'inner-glow'
  | 'bevel-emboss'
  | 'satin'
  | 'color-overlay'
  | 'gradient-overlay'
  | 'pattern-overlay'
  | 'stroke';

// ==================== ADJUSTMENTS ====================

/** Adjustment layer with color/tone correction parameters */
export interface AdjustmentLayer {
  type: AdjustmentType;
  parameters: Record<string, unknown>;
}

/** Available adjustment layer types */
export type AdjustmentType =
  | 'brightness-contrast'
  | 'levels'
  | 'curves'
  | 'exposure'
  | 'vibrance'
  | 'hue-saturation'
  | 'color-balance'
  | 'black-white'
  | 'photo-filter'
  | 'channel-mixer'
  | 'color-lookup'
  | 'invert'
  | 'posterize'
  | 'threshold'
  | 'gradient-map'
  | 'selective-color';

// ==================== NORMAL MAP ====================

/** Settings for generating normal maps from images */
export interface NormalMapSettings {
  strength: number;
  blurRadius: number;
  invert: boolean;
  detailScale: number;
  method: 'sobel' | 'prewitt' | 'scharr';
}

// ==================== EXPORT ====================

/** Export settings for saving project assets in various formats */
export interface ExportSettings {
  format: 'png' | 'tga' | 'vtf' | 'psd' | 'tiff';
  includeNormalMap: boolean;
  includeMetalness: boolean;
  includeRoughness: boolean;
  includeAO: boolean;
  generateMipmaps: boolean;
  compression?: 'none' | 'dxt1' | 'dxt5' | 'bc7';
  colorSpace: 'srgb' | 'linear';
}

// ==================== HISTORY ====================

/** Snapshot of editor state for undo/redo functionality */
export interface HistoryState {
  layers: Layer[];
  timestamp: number;
  description: string;
  thumbnail?: string;
}

// ==================== API ====================

/** Request payload for creating a new project */
export interface CreateProjectRequest {
  name: string;
  type: 'sticker';
  stickerType: StickerType;
}

/** Request payload for saving project data */
export interface SaveProjectRequest {
  id: string;
  data: ProjectData;
  thumbnail?: string;
}

// ==================== CANVAS OBJECTS ====================

/** Selectable and transformable object on the canvas */
export interface CanvasObject {
  id: string;
  layerId: string;
  type: 'image' | 'text' | 'shape' | 'group';
  transform: Transform;
  selectable: boolean;
  evented: boolean;
}

// ==================== PRESETS ====================

/** Pre-configured material with thumbnail for quick selection */
export interface MaterialPreset {
  id: string;
  name: string;
  category: string;
  material: SmartMaterial;
  thumbnail: string;
}

/** Pre-configured mask with thumbnail for quick selection */
export interface MaskPreset {
  id: string;
  name: string;
  category: string;
  mask: SmartMask;
  thumbnail: string;
}

/** Pre-configured brush with thumbnail for quick selection */
export interface BrushPreset {
  id: string;
  name: string;
  category: string;
  brush: CustomBrush;
  thumbnail: string;
}

/** Pre-configured gradient for quick selection */
export interface GradientPreset {
  id: string;
  name: string;
  category: string;
  gradient: Gradient;
}

// ==================== DEFAULTS ====================

/** Default environment lighting settings */
export const DEFAULT_ENVIRONMENT: EnvironmentSettings = {
  preset: 'studio-soft',
  rotation: 0,
  intensity: 1,
  backgroundColor: '#1a1a1c',
  showReflections: true,
  shadowIntensity: 0.5,
  ambientOcclusion: true,
  aoStrength: 0.3,
};

/** Built-in smart mask presets */
export const DEFAULT_SMART_MASKS: SmartMask[] = [
  {
    id: 'corner-soft',
    name: 'Soft Corners',
    type: 'corner-radius',
    parameters: { cornerRadius: 64, cornerSmooth: 0.5 },
  },
  {
    id: 'border-fade',
    name: 'Border Fade',
    type: 'border-gradient',
    parameters: { borderWidth: 32, borderSoftness: 1, borderOffset: 0 },
  },
  {
    id: 'vignette-soft',
    name: 'Vignette',
    type: 'vignette',
    parameters: { vignetteStrength: 0.5, vignetteRadius: 0.7, vignetteSoftness: 0.3 },
  },
  {
    id: 'noise-grunge',
    name: 'Noise Grunge',
    type: 'noise-mask',
    parameters: { noiseScale: 50, noiseOctaves: 4, noisePersistence: 0.5 },
  },
];
