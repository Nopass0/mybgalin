/**
 * CS2 Pattern Generator Types
 *
 * Type definitions for the procedural pattern generation system
 * compatible with CS2 Workshop Tools.
 */

// ==================== PATTERN TYPES ====================

export type PatternType =
  // Geometric
  | 'circuit' | 'hexgrid' | 'triangles' | 'grid' | 'dots' | 'waves'
  | 'glitch' | 'digicamo' | 'barcode' | 'labyrinth' | 'crosshatch'
  | 'chipset' | 'geometric' | 'datastream' | 'circles' | 'stars'
  | 'spiral' | 'noise' | 'voronoi' | 'flowfield' | 'plaid' | 'diamonds'
  | 'zigzag' | 'mosaic' | 'celtic' | 'fractal' | 'organic' | 'tech'
  | 'scales' | 'honeycomb' | 'mandala' | 'topographic' | 'dna'
  | 'neural' | 'crystal' | 'plasma' | 'marble' | 'wood' | 'carbon'
  | 'camo' | 'splatter' | 'grunge' | 'halftone' | 'scanlines'
  // 3D & Complex
  | 'cubes3d' | 'pyramids3d' | 'spheres3d' | 'cylinders3d' | 'terrain3d'
  | 'parallax' | 'emboss' | 'extruded' | 'isometric' | 'wireframe3d'
  | 'displacement' | 'heightfield' | 'layered3d' | 'shadowbox'
  // Advanced Procedural
  | 'reaction' | 'cellular' | 'lsystem' | 'penrose' | 'truchet'
  | 'guilloche' | 'moire' | 'interference' | 'caustics' | 'metaballs'
  | 'subdivision' | 'delaunay' | 'stippling' | 'hatching3d' | 'engraving'
  // Organic Complex
  | 'coral' | 'veins' | 'roots' | 'lightning' | 'cracks' | 'erosion'
  | 'sediment' | 'terrazzo' | 'agate' | 'geode' | 'nebula' | 'galaxy'
  // Tech Complex
  | 'motherboard' | 'processor' | 'nanotech' | 'quantum' | 'hologram'
  | 'radar' | 'sonar' | 'oscilloscope' | 'frequency' | 'waveform';

export type NoiseType =
  | 'perlin' | 'simplex' | 'worley' | 'fbm' | 'turbulence'
  | 'ridged' | 'billow' | 'voronoi' | 'value' | 'white' | 'blue'
  | 'curl' | 'domain_warp' | 'super_simplex';

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'add'
  | 'subtract' | 'difference' | 'exclusion' | 'hardLight' | 'softLight'
  | 'colorDodge' | 'colorBurn' | 'linearLight' | 'vividLight';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot' | 'gradient' | 'textured';

export type CornerStyle = 'round' | 'square' | 'bevel' | 'chamfer' | 'organic';

export type TextureMapType = 'pattern' | 'mask' | 'normal' | 'roughness' | 'pearlescence' | 'ao' | 'height' | 'curvature' | 'thickness';

export type DepthMode = 'none' | 'emboss' | 'deboss' | 'extrude' | 'bevel' | 'parallax' | 'displacement';

export type LightingMode = 'none' | 'directional' | 'point' | 'ambient' | 'hdri';

// ==================== COLOR SCHEMES ====================

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  tertiary?: string;
  highlight?: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: 'cyan', name: 'Кибер', primary: '#00ffff', secondary: '#0088aa', background: '#0a0a12', accent: '#00ff88', tertiary: '#004466', highlight: '#80ffff' },
  { id: 'orange', name: 'Оранж', primary: '#ff6600', secondary: '#ff3300', background: '#0f0a05', accent: '#ffaa00', tertiary: '#aa4400', highlight: '#ffcc80' },
  { id: 'green', name: 'Матрица', primary: '#00ff00', secondary: '#008800', background: '#050f05', accent: '#88ff00', tertiary: '#004400', highlight: '#80ff80' },
  { id: 'purple', name: 'Неон', primary: '#aa00ff', secondary: '#6600aa', background: '#0a050f', accent: '#ff00aa', tertiary: '#440088', highlight: '#dd80ff' },
  { id: 'white', name: 'Моно', primary: '#ffffff', secondary: '#888888', background: '#080808', accent: '#cccccc', tertiary: '#444444', highlight: '#ffffff' },
  { id: 'matrix', name: 'Хакер', primary: '#00ff41', secondary: '#003300', background: '#000000', accent: '#00aa00', tertiary: '#001100', highlight: '#80ff80' },
  { id: 'gold', name: 'Золото', primary: '#ffd700', secondary: '#b8860b', background: '#0a0805', accent: '#ffec8b', tertiary: '#8b6914', highlight: '#fff8dc' },
  { id: 'red', name: 'Огонь', primary: '#ff0040', secondary: '#aa0020', background: '#0f0505', accent: '#ff4080', tertiary: '#660010', highlight: '#ff8080' },
  { id: 'blue', name: 'Океан', primary: '#0080ff', secondary: '#0040aa', background: '#050510', accent: '#40a0ff', tertiary: '#002266', highlight: '#80c0ff' },
  { id: 'pink', name: 'Розовый', primary: '#ff69b4', secondary: '#ff1493', background: '#0f050a', accent: '#ffb6c1', tertiary: '#aa0066', highlight: '#ffc0cb' },
  { id: 'teal', name: 'Бирюза', primary: '#20b2aa', secondary: '#008080', background: '#050a0a', accent: '#40e0d0', tertiary: '#004040', highlight: '#80ffff' },
  { id: 'amber', name: 'Янтарь', primary: '#ffbf00', secondary: '#ff8c00', background: '#0a0800', accent: '#ffd700', tertiary: '#aa6600', highlight: '#ffe066' },
  { id: 'military', name: 'Военный', primary: '#556b2f', secondary: '#6b8e23', background: '#1a1a0a', accent: '#9acd32', tertiary: '#3a4a1f', highlight: '#bada55' },
  { id: 'ice', name: 'Лёд', primary: '#e0ffff', secondary: '#b0e0e6', background: '#0a0f12', accent: '#87ceeb', tertiary: '#4682b4', highlight: '#f0ffff' },
  { id: 'lava', name: 'Лава', primary: '#ff4500', secondary: '#8b0000', background: '#0f0500', accent: '#ff6347', tertiary: '#cc3300', highlight: '#ffa07a' },
  { id: 'toxic', name: 'Токсик', primary: '#7fff00', secondary: '#32cd32', background: '#050a00', accent: '#adff2f', tertiary: '#228b22', highlight: '#98fb98' },
  { id: 'chrome', name: 'Хром', primary: '#c0c0c0', secondary: '#808080', background: '#1a1a1a', accent: '#e0e0e0', tertiary: '#404040', highlight: '#f5f5f5' },
  { id: 'copper', name: 'Медь', primary: '#b87333', secondary: '#8b4513', background: '#0a0605', accent: '#cd7f32', tertiary: '#6b4423', highlight: '#daa06d' },
  { id: 'emerald', name: 'Изумруд', primary: '#50c878', secondary: '#2e8b57', background: '#051a0a', accent: '#00ff7f', tertiary: '#006400', highlight: '#98fb98' },
  { id: 'sapphire', name: 'Сапфир', primary: '#0f52ba', secondary: '#082567', background: '#050510', accent: '#4169e1', tertiary: '#000080', highlight: '#6495ed' },
  { id: 'ruby', name: 'Рубин', primary: '#e0115f', secondary: '#9b111e', background: '#0f0508', accent: '#ff0040', tertiary: '#660022', highlight: '#ff6b6b' },
  { id: 'obsidian', name: 'Обсидиан', primary: '#1a1a2e', secondary: '#0f0f1a', background: '#000000', accent: '#3d3d5c', tertiary: '#16213e', highlight: '#4a4a6a' },
  { id: 'aurora', name: 'Аврора', primary: '#00ff88', secondary: '#ff00ff', background: '#0a0510', accent: '#00ffff', tertiary: '#8800ff', highlight: '#88ff88' },
  { id: 'sunset', name: 'Закат', primary: '#ff6b35', secondary: '#f7931e', background: '#1a0a05', accent: '#ff4444', tertiary: '#c41e3a', highlight: '#ffd700' },
];

// ==================== PATTERN SETTINGS ====================

export interface PatternSettings {
  // Basic
  seed: number;
  style: PatternType;
  density: number;
  elementSize: number;
  elementSpacing: number;
  lineWidth: number;
  rotation: number;

  // Style
  colorScheme: string;
  glowIntensity: number;
  noiseAmount: number;
  seamless: boolean;

  // Pattern-specific
  complexity: number;
  connectionDensity: number;
  fillAmount: number;
  strokeStyle: StrokeStyle;
  cornerStyle: CornerStyle;
  symmetry: number;

  // 3D & Depth
  depthMode: DepthMode;
  depthIntensity: number;
  depthLayers: number;
  depthPerspective: number;
  shadowIntensity: number;
  shadowAngle: number;
  shadowDistance: number;
  ambientOcclusion: number;
  bevelWidth: number;
  bevelHeight: number;
  extrudeDepth: number;

  // Lighting
  lightingMode: LightingMode;
  lightAngle: number;
  lightElevation: number;
  lightIntensity: number;
  lightColor: string;
  ambientIntensity: number;
  specularIntensity: number;
  specularPower: number;

  // Advanced
  distortion: number;
  turbulence: number;
  warpStrength: number;
  warpScale: number;
  edgeWear: number;
  edgeSharpness: number;
  innerGlow: number;
  outerGlow: number;
  chromatic: number;
  subsurface: number;

  // Layers
  layerCount: number;
  layerOffset: number;
  layerOpacity: number;
  layerBlend: BlendMode;

  // Animation (optional)
  animated: boolean;
  animationSpeed: number;
  animationPhase: number;
}

export interface MaskSettings {
  redIntensity: number;
  greenIntensity: number;
  blueIntensity: number;
  baseCoat: number;
  invertMask: boolean;
  maskBlur: number;
  maskContrast: number;
  maskGamma: number;
  channelSeparation: number;
  gradientMask: boolean;
  gradientAngle: number;
  gradientFalloff: number;
  edgeMask: number;
  noiseMask: number;
}

export interface NormalMapSettings {
  strength: number;
  bevelSize: number;
  invertHeight: boolean;
  method: 'sobel' | 'prewitt' | 'scharr' | 'roberts' | 'laplacian';
  detailLevel: number;
  blurRadius: number;
  sharpen: number;
  flipY: boolean;
  flipX: boolean;
  swizzle: 'opengl' | 'directx';
  heightSource: 'pattern' | 'mask' | 'custom';
  normalBlend: number;
  curvatureStrength: number;
}

export interface RoughnessSettings {
  base: number;
  variation: number;
  invertRoughness: boolean;
  metallic: number;
  metallicVariation: number;
  microsurface: number;
  anisotropy: number;
  anisotropyAngle: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenTint: number;
}

export interface PearlescenceSettings {
  intensity: number;
  frequency: number;
  colorShift: number;
  followPattern: boolean;
  iridescenceScale: number;
  iridescenceStrength: number;
  rainbowSpread: number;
  viewDependence: number;
  specularTint: number;
  filmThickness: number;
}

export interface AOSettings {
  strength: number;
  radius: number;
  contrast: number;
  samples: number;
  falloff: number;
  bias: number;
  selfOcclusion: boolean;
  groundPlane: boolean;
}

export interface HeightSettings {
  scale: number;
  invert: boolean;
  levels: number;
  gamma: number;
  blur: number;
  contrast: number;
  normalize: boolean;
  clampMin: number;
  clampMax: number;
}

export interface CurvatureSettings {
  strength: number;
  radius: number;
  convexColor: string;
  concaveColor: string;
  blend: number;
}

export interface ThicknessSettings {
  scale: number;
  sssRadius: number;
  sssColor: string;
  density: number;
}

// ==================== NODE SYSTEM ====================

export type NodeCategory =
  | 'input' | 'noise' | 'pattern' | 'math' | 'color'
  | 'filter' | 'transform' | 'mask' | 'output' | '3d' | 'blend';

export interface NodePort {
  id: string;
  name: string;
  type: 'float' | 'vector2' | 'vector3' | 'vector4' | 'color' | 'texture' | 'matrix';
  value?: number | number[] | string;
}

export interface NodeParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'color' | 'enum' | 'texture' | 'curve' | 'gradient';
  value: number | boolean | string | number[];
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface PatternNode {
  id: string;
  type: string;
  name: string;
  category: NodeCategory;
  position: { x: number; y: number };
  inputs: NodePort[];
  outputs: NodePort[];
  parameters: NodeParameter[];
  collapsed?: boolean;
}

export interface NodeConnection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

export interface NodeGraph {
  id: string;
  name: string;
  nodes: PatternNode[];
  connections: NodeConnection[];
  outputNode: string | null;
}

// ==================== PRESET SYSTEM ====================

export interface PatternPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  patternSettings: Partial<PatternSettings>;
  maskSettings?: Partial<MaskSettings>;
  normalSettings?: Partial<NormalMapSettings>;
  roughnessSettings?: Partial<RoughnessSettings>;
  pearlSettings?: Partial<PearlescenceSettings>;
  aoSettings?: Partial<AOSettings>;
  heightSettings?: Partial<HeightSettings>;
  thumbnail?: string;
}

// ==================== EXPORT SETTINGS ====================

export interface ExportSettings {
  resolution: 256 | 512 | 1024 | 2048 | 4096 | 8192;
  format: 'png' | 'tga' | 'vtf' | 'exr' | 'tiff';
  bitDepth: 8 | 16 | 32;
  exportPattern: boolean;
  exportMask: boolean;
  exportNormal: boolean;
  exportRoughness: boolean;
  exportPearl: boolean;
  exportAO: boolean;
  exportHeight: boolean;
  exportCurvature: boolean;
  exportThickness: boolean;
  namingConvention: 'suffix' | 'folder' | 'udim';
  compression: 'none' | 'lossless' | 'lossy';
}

// ==================== PATTERN DEFINITION ====================

export interface PatternDefinition {
  type: PatternType;
  name: string;
  icon: string;
  description: string;
  category: 'geometric' | 'tech' | 'organic' | 'noise' | 'camo' | 'artistic' | '3d' | 'advanced' | 'complex';
  defaultSettings?: Partial<PatternSettings>;
  supports3D?: boolean;
}

export const PATTERN_DEFINITIONS: PatternDefinition[] = [
  // Geometric
  { type: 'hexgrid', name: 'Гексагоны', icon: '⬡', description: 'Гексагональная сетка', category: 'geometric' },
  { type: 'triangles', name: 'Треугольники', icon: '△', description: 'Треугольная мозаика', category: 'geometric' },
  { type: 'grid', name: 'Сетка', icon: '▦', description: 'Квадратная сетка', category: 'geometric' },
  { type: 'dots', name: 'Точки', icon: '⚫', description: 'Точечный паттерн', category: 'geometric' },
  { type: 'diamonds', name: 'Ромбы', icon: '◇', description: 'Ромбовидная сетка', category: 'geometric' },
  { type: 'circles', name: 'Круги', icon: '◎', description: 'Концентрические круги', category: 'geometric' },
  { type: 'stars', name: 'Звёзды', icon: '★', description: 'Звёздный паттерн', category: 'geometric' },
  { type: 'honeycomb', name: 'Соты', icon: '⬢', description: 'Сотовая структура', category: 'geometric' },
  { type: 'mandala', name: 'Мандала', icon: '✿', description: 'Радиальная симметрия', category: 'geometric' },
  { type: 'penrose', name: 'Пенроуз', icon: '⬠', description: 'Плитка Пенроуза', category: 'geometric' },
  { type: 'truchet', name: 'Трюше', icon: '⟁', description: 'Плитка Трюше', category: 'geometric' },

  // Tech
  { type: 'circuit', name: 'Микросхема', icon: '⚡', description: 'Электронная плата', category: 'tech' },
  { type: 'chipset', name: 'Чипы', icon: '▣', description: 'Процессоры и чипы', category: 'tech' },
  { type: 'datastream', name: 'Данные', icon: '≋', description: 'Поток данных', category: 'tech' },
  { type: 'barcode', name: 'Штрихкод', icon: '▮', description: 'Штрихкод и QR', category: 'tech' },
  { type: 'glitch', name: 'Глитч', icon: '▓', description: 'Цифровые помехи', category: 'tech' },
  { type: 'scanlines', name: 'Сканлайны', icon: '≡', description: 'Линии развёртки', category: 'tech' },
  { type: 'neural', name: 'Нейросеть', icon: '⊛', description: 'Нейронные связи', category: 'tech' },
  { type: 'dna', name: 'ДНК', icon: '⧬', description: 'Спираль ДНК', category: 'tech' },
  { type: 'carbon', name: 'Карбон', icon: '▥', description: 'Углеволокно', category: 'tech' },
  { type: 'motherboard', name: 'Материнка', icon: '⊡', description: 'Материнская плата', category: 'tech' },
  { type: 'processor', name: 'Процессор', icon: '⊞', description: 'CPU паттерн', category: 'tech' },
  { type: 'nanotech', name: 'Нанотех', icon: '⋮', description: 'Наноструктура', category: 'tech' },
  { type: 'quantum', name: 'Квантовый', icon: '⌬', description: 'Квантовые частицы', category: 'tech' },
  { type: 'hologram', name: 'Голограмма', icon: '◈', description: 'Голографический', category: 'tech' },
  { type: 'radar', name: 'Радар', icon: '◎', description: 'Радарная сетка', category: 'tech' },
  { type: 'oscilloscope', name: 'Осциллограф', icon: '∿', description: 'Сигнал осциллографа', category: 'tech' },
  { type: 'frequency', name: 'Частота', icon: '∼', description: 'Частотный спектр', category: 'tech' },
  { type: 'waveform', name: 'Волноформа', icon: '〜', description: 'Звуковая волна', category: 'tech' },

  // Organic
  { type: 'waves', name: 'Волны', icon: '〰', description: 'Волновой паттерн', category: 'organic' },
  { type: 'spiral', name: 'Спирали', icon: '◌', description: 'Спиральный узор', category: 'organic' },
  { type: 'flowfield', name: 'Поток', icon: '≈', description: 'Flow Field', category: 'organic' },
  { type: 'organic', name: 'Органика', icon: '❀', description: 'Органические формы', category: 'organic' },
  { type: 'scales', name: 'Чешуя', icon: '⌓', description: 'Чешуйчатый узор', category: 'organic' },
  { type: 'marble', name: 'Мрамор', icon: '◐', description: 'Мраморные прожилки', category: 'organic' },
  { type: 'wood', name: 'Дерево', icon: '⊚', description: 'Древесная текстура', category: 'organic' },
  { type: 'topographic', name: 'Топография', icon: '◠', description: 'Топографические линии', category: 'organic' },
  { type: 'crystal', name: 'Кристаллы', icon: '◆', description: 'Кристаллическая структура', category: 'organic' },
  { type: 'coral', name: 'Коралл', icon: '❋', description: 'Коралловый узор', category: 'organic' },
  { type: 'veins', name: 'Вены', icon: '⌥', description: 'Венозная сетка', category: 'organic' },
  { type: 'roots', name: 'Корни', icon: '⌥', description: 'Корневая система', category: 'organic' },
  { type: 'lightning', name: 'Молния', icon: '⚡', description: 'Электрический разряд', category: 'organic' },
  { type: 'cracks', name: 'Трещины', icon: '⋇', description: 'Сеть трещин', category: 'organic' },
  { type: 'erosion', name: 'Эрозия', icon: '≋', description: 'Следы эрозии', category: 'organic' },
  { type: 'terrazzo', name: 'Терраццо', icon: '⊕', description: 'Мозаичный пол', category: 'organic' },
  { type: 'agate', name: 'Агат', icon: '◎', description: 'Слои агата', category: 'organic' },
  { type: 'geode', name: 'Жеода', icon: '◉', description: 'Кристаллы жеоды', category: 'organic' },

  // Noise
  { type: 'noise', name: 'Шум', icon: '░', description: 'Процедурный шум', category: 'noise' },
  { type: 'voronoi', name: 'Вороной', icon: '⬟', description: 'Диаграмма Вороного', category: 'noise' },
  { type: 'plasma', name: 'Плазма', icon: '◕', description: 'Плазменный эффект', category: 'noise' },
  { type: 'fractal', name: 'Фрактал', icon: '✧', description: 'Фрактальный узор', category: 'noise' },
  { type: 'grunge', name: 'Гранж', icon: '▒', description: 'Грязь и потёртости', category: 'noise' },
  { type: 'reaction', name: 'Реакция', icon: '◎', description: 'Реакция-диффузия', category: 'noise' },
  { type: 'cellular', name: 'Клеточный', icon: '⊡', description: 'Клеточный автомат', category: 'noise' },
  { type: 'caustics', name: 'Каустика', icon: '◇', description: 'Каустики воды', category: 'noise' },
  { type: 'nebula', name: 'Туманность', icon: '☁', description: 'Космическая туманность', category: 'noise' },
  { type: 'galaxy', name: 'Галактика', icon: '✶', description: 'Спиральная галактика', category: 'noise' },

  // Camo
  { type: 'digicamo', name: 'Дижи-камо', icon: '▤', description: 'Цифровой камуфляж', category: 'camo' },
  { type: 'camo', name: 'Камуфляж', icon: '◩', description: 'Классический камуфляж', category: 'camo' },
  { type: 'splatter', name: 'Брызги', icon: '✱', description: 'Брызги краски', category: 'camo' },
  { type: 'sediment', name: 'Осадок', icon: '▨', description: 'Слои осадка', category: 'camo' },

  // Artistic
  { type: 'labyrinth', name: 'Лабиринт', icon: '⌘', description: 'Лабиринт', category: 'artistic' },
  { type: 'crosshatch', name: 'Штриховка', icon: '╳', description: 'Перекрёстная штриховка', category: 'artistic' },
  { type: 'celtic', name: 'Кельтский', icon: '⚜', description: 'Кельтский узор', category: 'artistic' },
  { type: 'mosaic', name: 'Мозаика', icon: '⊞', description: 'Мозаичный узор', category: 'artistic' },
  { type: 'plaid', name: 'Плед', icon: '▧', description: 'Шотландка', category: 'artistic' },
  { type: 'zigzag', name: 'Зигзаг', icon: '⌇', description: 'Зигзагообразный узор', category: 'artistic' },
  { type: 'halftone', name: 'Полутон', icon: '◔', description: 'Полутоновый растр', category: 'artistic' },
  { type: 'geometric', name: 'Геометрия', icon: '◇', description: 'Абстрактная геометрия', category: 'artistic' },
  { type: 'tech', name: 'Тех-узор', icon: '⎔', description: 'Технологический узор', category: 'artistic' },
  { type: 'guilloche', name: 'Гильош', icon: '◎', description: 'Защитный узор', category: 'artistic' },
  { type: 'moire', name: 'Муар', icon: '◌', description: 'Муаровый узор', category: 'artistic' },
  { type: 'interference', name: 'Интерференция', icon: '≋', description: 'Волновая интерференция', category: 'artistic' },
  { type: 'stippling', name: 'Стипплинг', icon: '⁘', description: 'Точечная графика', category: 'artistic' },
  { type: 'engraving', name: 'Гравюра', icon: '▤', description: 'Гравировка', category: 'artistic' },
  { type: 'lsystem', name: 'L-система', icon: '⌥', description: 'L-система Линденмайера', category: 'artistic' },

  // 3D Patterns
  { type: 'cubes3d', name: '3D Кубы', icon: '⬛', description: 'Изометрические кубы', category: '3d', supports3D: true },
  { type: 'pyramids3d', name: '3D Пирамиды', icon: '△', description: '3D пирамиды', category: '3d', supports3D: true },
  { type: 'spheres3d', name: '3D Сферы', icon: '●', description: 'Объёмные сферы', category: '3d', supports3D: true },
  { type: 'cylinders3d', name: '3D Цилиндры', icon: '▮', description: '3D цилиндры', category: '3d', supports3D: true },
  { type: 'terrain3d', name: '3D Рельеф', icon: '⛰', description: '3D ландшафт', category: '3d', supports3D: true },
  { type: 'parallax', name: 'Параллакс', icon: '◫', description: 'Параллакс слои', category: '3d', supports3D: true },
  { type: 'emboss', name: 'Тиснение', icon: '◧', description: 'Эффект тиснения', category: '3d', supports3D: true },
  { type: 'extruded', name: 'Экструзия', icon: '▣', description: 'Экструдированные формы', category: '3d', supports3D: true },
  { type: 'isometric', name: 'Изометрия', icon: '⬡', description: 'Изометрическая сетка', category: '3d', supports3D: true },
  { type: 'wireframe3d', name: 'Каркас', icon: '◇', description: '3D каркас', category: '3d', supports3D: true },
  { type: 'displacement', name: 'Дисплейсмент', icon: '≋', description: 'Карта смещения', category: '3d', supports3D: true },
  { type: 'heightfield', name: 'Высотная карта', icon: '▲', description: 'Поле высот', category: '3d', supports3D: true },
  { type: 'layered3d', name: 'Слоистый 3D', icon: '≡', description: 'Многослойная глубина', category: '3d', supports3D: true },
  { type: 'shadowbox', name: 'Тень-бокс', icon: '◰', description: 'Коробка с тенью', category: '3d', supports3D: true },
  { type: 'hatching3d', name: '3D Штриховка', icon: '▨', description: 'Объёмная штриховка', category: '3d', supports3D: true },

  // Advanced/Complex
  { type: 'metaballs', name: 'Метаболы', icon: '◎', description: 'Метаболы', category: 'advanced' },
  { type: 'subdivision', name: 'Subdivision', icon: '◫', description: 'Subdivision поверхность', category: 'advanced' },
  { type: 'delaunay', name: 'Делоне', icon: '△', description: 'Триангуляция Делоне', category: 'advanced' },
];

// ==================== DEFAULT VALUES ====================

export const DEFAULT_PATTERN_SETTINGS: PatternSettings = {
  seed: Date.now(),
  style: 'circuit',
  density: 150,
  elementSize: 50,
  elementSpacing: 30,
  lineWidth: 2,
  rotation: 0,
  colorScheme: 'cyan',
  glowIntensity: 8,
  noiseAmount: 10,
  seamless: true,
  complexity: 50,
  connectionDensity: 50,
  fillAmount: 30,
  strokeStyle: 'solid',
  cornerStyle: 'round',
  symmetry: 1,

  // 3D & Depth
  depthMode: 'none',
  depthIntensity: 50,
  depthLayers: 3,
  depthPerspective: 30,
  shadowIntensity: 40,
  shadowAngle: 45,
  shadowDistance: 5,
  ambientOcclusion: 30,
  bevelWidth: 2,
  bevelHeight: 50,
  extrudeDepth: 20,

  // Lighting
  lightingMode: 'directional',
  lightAngle: 45,
  lightElevation: 45,
  lightIntensity: 100,
  lightColor: '#ffffff',
  ambientIntensity: 30,
  specularIntensity: 50,
  specularPower: 32,

  // Advanced
  distortion: 0,
  turbulence: 0,
  warpStrength: 0,
  warpScale: 50,
  edgeWear: 0,
  edgeSharpness: 50,
  innerGlow: 0,
  outerGlow: 0,
  chromatic: 0,
  subsurface: 0,

  // Layers
  layerCount: 1,
  layerOffset: 10,
  layerOpacity: 50,
  layerBlend: 'normal',

  // Animation
  animated: false,
  animationSpeed: 1,
  animationPhase: 0,
};

export const DEFAULT_MASK_SETTINGS: MaskSettings = {
  redIntensity: 80,
  greenIntensity: 60,
  blueIntensity: 40,
  baseCoat: 20,
  invertMask: false,
  maskBlur: 0,
  maskContrast: 100,
  maskGamma: 100,
  channelSeparation: 0,
  gradientMask: false,
  gradientAngle: 0,
  gradientFalloff: 50,
  edgeMask: 0,
  noiseMask: 0,
};

export const DEFAULT_NORMAL_SETTINGS: NormalMapSettings = {
  strength: 50,
  bevelSize: 3,
  invertHeight: false,
  method: 'sobel',
  detailLevel: 50,
  blurRadius: 0,
  sharpen: 0,
  flipY: false,
  flipX: false,
  swizzle: 'opengl',
  heightSource: 'pattern',
  normalBlend: 100,
  curvatureStrength: 0,
};

export const DEFAULT_ROUGHNESS_SETTINGS: RoughnessSettings = {
  base: 30,
  variation: 40,
  invertRoughness: false,
  metallic: 0,
  metallicVariation: 0,
  microsurface: 50,
  anisotropy: 0,
  anisotropyAngle: 0,
  clearcoat: 0,
  clearcoatRoughness: 30,
  sheen: 0,
  sheenTint: 50,
};

export const DEFAULT_PEARL_SETTINGS: PearlescenceSettings = {
  intensity: 50,
  frequency: 1,
  colorShift: 0,
  followPattern: true,
  iridescenceScale: 1,
  iridescenceStrength: 50,
  rainbowSpread: 100,
  viewDependence: 50,
  specularTint: 0,
  filmThickness: 50,
};

export const DEFAULT_AO_SETTINGS: AOSettings = {
  strength: 50,
  radius: 10,
  contrast: 100,
  samples: 16,
  falloff: 50,
  bias: 0,
  selfOcclusion: true,
  groundPlane: false,
};

export const DEFAULT_HEIGHT_SETTINGS: HeightSettings = {
  scale: 100,
  invert: false,
  levels: 256,
  gamma: 100,
  blur: 0,
  contrast: 100,
  normalize: true,
  clampMin: 0,
  clampMax: 100,
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: 1024,
  format: 'png',
  bitDepth: 8,
  exportPattern: true,
  exportMask: true,
  exportNormal: true,
  exportRoughness: true,
  exportPearl: true,
  exportAO: false,
  exportHeight: false,
  exportCurvature: false,
  exportThickness: false,
  namingConvention: 'suffix',
  compression: 'lossless',
};
