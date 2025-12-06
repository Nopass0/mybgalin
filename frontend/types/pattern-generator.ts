/**
 * CS2 Pattern Generator Types
 *
 * Type definitions for the procedural pattern generation system
 * compatible with CS2 Workshop Tools.
 */

// ==================== PATTERN TYPES ====================

export type PatternType =
  | 'circuit' | 'hexgrid' | 'triangles' | 'grid' | 'dots' | 'waves'
  | 'glitch' | 'digicamo' | 'barcode' | 'labyrinth' | 'crosshatch'
  | 'chipset' | 'geometric' | 'datastream' | 'circles' | 'stars'
  | 'spiral' | 'noise' | 'voronoi' | 'flowfield' | 'plaid' | 'diamonds'
  | 'zigzag' | 'mosaic' | 'celtic' | 'fractal' | 'organic' | 'tech'
  | 'scales' | 'honeycomb' | 'mandala' | 'topographic' | 'dna'
  | 'neural' | 'crystal' | 'plasma' | 'marble' | 'wood' | 'carbon'
  | 'camo' | 'splatter' | 'grunge' | 'halftone' | 'scanlines';

export type NoiseType =
  | 'perlin' | 'simplex' | 'worley' | 'fbm' | 'turbulence'
  | 'ridged' | 'billow' | 'voronoi' | 'value' | 'white' | 'blue';

export type BlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'add'
  | 'subtract' | 'difference' | 'exclusion' | 'hardLight' | 'softLight';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot';

export type CornerStyle = 'round' | 'square' | 'bevel';

export type TextureMapType = 'pattern' | 'mask' | 'normal' | 'roughness' | 'pearlescence' | 'ao' | 'height';

// ==================== COLOR SCHEMES ====================

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: 'cyan', name: 'Кибер', primary: '#00ffff', secondary: '#0088aa', background: '#0a0a12', accent: '#00ff88' },
  { id: 'orange', name: 'Оранж', primary: '#ff6600', secondary: '#ff3300', background: '#0f0a05', accent: '#ffaa00' },
  { id: 'green', name: 'Матрица', primary: '#00ff00', secondary: '#008800', background: '#050f05', accent: '#88ff00' },
  { id: 'purple', name: 'Неон', primary: '#aa00ff', secondary: '#6600aa', background: '#0a050f', accent: '#ff00aa' },
  { id: 'white', name: 'Моно', primary: '#ffffff', secondary: '#888888', background: '#080808', accent: '#cccccc' },
  { id: 'matrix', name: 'Хакер', primary: '#00ff41', secondary: '#003300', background: '#000000', accent: '#00aa00' },
  { id: 'gold', name: 'Золото', primary: '#ffd700', secondary: '#b8860b', background: '#0a0805', accent: '#ffec8b' },
  { id: 'red', name: 'Огонь', primary: '#ff0040', secondary: '#aa0020', background: '#0f0505', accent: '#ff4080' },
  { id: 'blue', name: 'Океан', primary: '#0080ff', secondary: '#0040aa', background: '#050510', accent: '#40a0ff' },
  { id: 'pink', name: 'Розовый', primary: '#ff69b4', secondary: '#ff1493', background: '#0f050a', accent: '#ffb6c1' },
  { id: 'teal', name: 'Бирюза', primary: '#20b2aa', secondary: '#008080', background: '#050a0a', accent: '#40e0d0' },
  { id: 'amber', name: 'Янтарь', primary: '#ffbf00', secondary: '#ff8c00', background: '#0a0800', accent: '#ffd700' },
  { id: 'military', name: 'Военный', primary: '#556b2f', secondary: '#6b8e23', background: '#1a1a0a', accent: '#9acd32' },
  { id: 'ice', name: 'Лёд', primary: '#e0ffff', secondary: '#b0e0e6', background: '#0a0f12', accent: '#87ceeb' },
  { id: 'lava', name: 'Лава', primary: '#ff4500', secondary: '#8b0000', background: '#0f0500', accent: '#ff6347' },
  { id: 'toxic', name: 'Токсик', primary: '#7fff00', secondary: '#32cd32', background: '#050a00', accent: '#adff2f' },
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

  // Animation (optional)
  animated: boolean;
  animationSpeed: number;
}

export interface MaskSettings {
  redIntensity: number;
  greenIntensity: number;
  blueIntensity: number;
  baseCoat: number;
  invertMask: boolean;
  maskBlur: number;
  maskContrast: number;
}

export interface NormalMapSettings {
  strength: number;
  bevelSize: number;
  invertHeight: boolean;
  method: 'sobel' | 'prewitt' | 'scharr';
}

export interface RoughnessSettings {
  base: number;
  variation: number;
  invertRoughness: boolean;
  metallic: number;
}

export interface PearlescenceSettings {
  intensity: number;
  frequency: number;
  colorShift: number;
  followPattern: boolean;
}

export interface AOSettings {
  strength: number;
  radius: number;
  contrast: number;
}

export interface HeightSettings {
  scale: number;
  invert: boolean;
  levels: number;
}

// ==================== NODE SYSTEM ====================

export type NodeCategory =
  | 'input' | 'noise' | 'pattern' | 'math' | 'color'
  | 'filter' | 'transform' | 'mask' | 'output';

export interface NodePort {
  id: string;
  name: string;
  type: 'float' | 'vector2' | 'vector3' | 'color' | 'texture';
  value?: number | number[] | string;
}

export interface NodeParameter {
  id: string;
  name: string;
  type: 'float' | 'int' | 'bool' | 'color' | 'enum' | 'texture';
  value: number | boolean | string;
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
  thumbnail?: string;
}

// ==================== EXPORT SETTINGS ====================

export interface ExportSettings {
  resolution: 256 | 512 | 1024 | 2048 | 4096;
  format: 'png' | 'tga' | 'vtf';
  exportPattern: boolean;
  exportMask: boolean;
  exportNormal: boolean;
  exportRoughness: boolean;
  exportPearl: boolean;
  exportAO: boolean;
  exportHeight: boolean;
  namingConvention: 'suffix' | 'folder';
}

// ==================== PATTERN DEFINITION ====================

export interface PatternDefinition {
  type: PatternType;
  name: string;
  icon: string;
  description: string;
  category: 'geometric' | 'tech' | 'organic' | 'noise' | 'camo' | 'artistic';
  defaultSettings?: Partial<PatternSettings>;
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

  // Noise
  { type: 'noise', name: 'Шум', icon: '░', description: 'Процедурный шум', category: 'noise' },
  { type: 'voronoi', name: 'Вороной', icon: '⬟', description: 'Диаграмма Вороного', category: 'noise' },
  { type: 'plasma', name: 'Плазма', icon: '◕', description: 'Плазменный эффект', category: 'noise' },
  { type: 'fractal', name: 'Фрактал', icon: '✧', description: 'Фрактальный узор', category: 'noise' },
  { type: 'grunge', name: 'Гранж', icon: '▒', description: 'Грязь и потёртости', category: 'noise' },

  // Camo
  { type: 'digicamo', name: 'Дижи-камо', icon: '▤', description: 'Цифровой камуфляж', category: 'camo' },
  { type: 'camo', name: 'Камуфляж', icon: '◩', description: 'Классический камуфляж', category: 'camo' },
  { type: 'splatter', name: 'Брызги', icon: '✱', description: 'Брызги краски', category: 'camo' },

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
  animated: false,
  animationSpeed: 1,
};

export const DEFAULT_MASK_SETTINGS: MaskSettings = {
  redIntensity: 80,
  greenIntensity: 60,
  blueIntensity: 40,
  baseCoat: 20,
  invertMask: false,
  maskBlur: 0,
  maskContrast: 100,
};

export const DEFAULT_NORMAL_SETTINGS: NormalMapSettings = {
  strength: 50,
  bevelSize: 3,
  invertHeight: false,
  method: 'sobel',
};

export const DEFAULT_ROUGHNESS_SETTINGS: RoughnessSettings = {
  base: 30,
  variation: 40,
  invertRoughness: false,
  metallic: 0,
};

export const DEFAULT_PEARL_SETTINGS: PearlescenceSettings = {
  intensity: 50,
  frequency: 1,
  colorShift: 0,
  followPattern: true,
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: 1024,
  format: 'png',
  exportPattern: true,
  exportMask: true,
  exportNormal: true,
  exportRoughness: true,
  exportPearl: true,
  exportAO: false,
  exportHeight: false,
  namingConvention: 'suffix',
};
