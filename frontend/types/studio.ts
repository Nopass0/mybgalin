// CS2 Skin Studio Types

export interface SteamUser {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

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

export type StickerType =
  | 'paper'      // Бумажный стикер
  | 'glitter'    // Блестящий стикер
  | 'holo'       // Голографический стикер
  | 'foil'       // Фольгированный стикер
  | 'gold'       // Золотой стикер
  | 'lenticular' // Лентикулярный стикер (двигающийся)
  | 'champion';  // Чемпионский автограф

export interface ProjectData {
  width: number;
  height: number;
  layers: Layer[];
  brushes: CustomBrush[];
  activeLayerId: string | null;
  activeTool: ToolType;
  primaryColor: string;
  secondaryColor: string;
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  imageData?: string; // base64 encoded image data
  mask?: LayerMask;
  children?: Layer[]; // for group layers
  isExpanded?: boolean;
}

export type LayerType =
  | 'raster'     // Обычный растровый слой
  | 'vector'     // Векторный слой
  | 'group'      // Группа слоёв
  | 'adjustment' // Корректирующий слой
  | 'normal'     // Карта нормалей
  | 'metalness'  // Карта металличности
  | 'roughness'  // Карта шероховатости
  | 'ao';        // Ambient Occlusion

export interface LayerMask {
  enabled: boolean;
  linked: boolean;
  imageData?: string;
}

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
  | 'luminosity';

export type ToolType =
  | 'brush'
  | 'eraser'
  | 'selection-rect'
  | 'selection-lasso'
  | 'selection-magic'
  | 'fill'
  | 'gradient'
  | 'vector-pen'
  | 'vector-shape'
  | 'eyedropper'
  | 'move'
  | 'zoom'
  | 'hand';

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
  texture?: string; // base64 brush texture
  shape?: BrushShape;
}

export type BrushShape = 'round' | 'square' | 'custom';

export interface BrushStroke {
  points: StrokePoint[];
  brush: CustomBrush;
  color: string;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface Gradient {
  type: 'linear' | 'radial' | 'angle' | 'diamond';
  stops: GradientStop[];
  angle?: number;
}

export interface Selection {
  type: 'rect' | 'ellipse' | 'lasso' | 'magic';
  path?: Path2D;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Normal map specific
export interface NormalMapSettings {
  strength: number;
  blurRadius: number;
  invert: boolean;
}

// Export settings
export interface ExportSettings {
  format: 'png' | 'tga' | 'vtf';
  includeNormalMap: boolean;
  includeMetalness: boolean;
  includeRoughness: boolean;
  includeAO: boolean;
  generateMipmaps: boolean;
}

// Editor state
export interface EditorState {
  project: StudioProject | null;
  canvas: fabric.Canvas | null;
  zoom: number;
  panX: number;
  panY: number;
  history: HistoryState[];
  historyIndex: number;
  clipboard: Layer | null;
  isDrawing: boolean;
  lastPointerPosition: { x: number; y: number } | null;
}

export interface HistoryState {
  layers: Layer[];
  timestamp: number;
  description: string;
}

// API Types
export interface CreateProjectRequest {
  name: string;
  type: 'sticker';
  stickerType: StickerType;
}

export interface SaveProjectRequest {
  id: string;
  data: ProjectData;
  thumbnail?: string;
}
