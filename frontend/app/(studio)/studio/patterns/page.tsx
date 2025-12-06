'use client';

/**
 * CS2 Pattern Generator Page
 *
 * Professional procedural pattern generator for CS2 weapon skins.
 * Generates Pattern, RGB Mask, Normal, Roughness, Pearlescence, AO, Height maps.
 * Includes 3D depth simulation, lighting, and advanced effects.
 *
 * @module app/(studio)/studio/patterns/page
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Download,
  Settings,
  Palette,
  Sliders,
  Eye,
  ChevronRight,
  Shuffle,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap,
  Box,
  LayoutGrid,
  Sun,
  Moon,
  Lightbulb,
  Mountain,
  Waves,
  Cpu,
  Leaf,
  Grid3X3,
  Triangle,
  Circle,
  Square,
  Hexagon,
  Star,
  Droplets,
  Wind,
  Flame,
  Snowflake,
  CloudLightning,
  Binary,
  Scan,
  Radio,
  Fingerprint,
  Microscope,
  Atom,
  Orbit,
  Aperture,
  Focus,
  Contrast,
  SunDim,
  CloudFog,
  GalleryVerticalEnd,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatternCanvas } from '@/components/studio/pattern-generator/pattern-canvas';
import { PatternNodeEditor } from '@/components/studio/pattern-generator/pattern-node-editor';
import {
  PatternSettings,
  MaskSettings,
  NormalMapSettings,
  RoughnessSettings,
  PearlescenceSettings,
  AOSettings,
  HeightSettings,
  ExportSettings,
  TextureMapType,
  DepthMode,
  LightingMode,
  BlendMode,
  DEFAULT_PATTERN_SETTINGS,
  DEFAULT_MASK_SETTINGS,
  DEFAULT_NORMAL_SETTINGS,
  DEFAULT_ROUGHNESS_SETTINGS,
  DEFAULT_PEARL_SETTINGS,
  DEFAULT_AO_SETTINGS,
  DEFAULT_HEIGHT_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  PATTERN_DEFINITIONS,
  COLOR_SCHEMES,
  StrokeStyle,
} from '@/types/pattern-generator';

// ==================== SLIDER COMPONENT ====================

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  description?: string;
  color?: string;
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
  description,
  color = 'orange',
}: SliderProps) {
  const colorClasses: Record<string, string> = {
    orange: 'accent-orange-500',
    red: 'accent-red-500',
    green: 'accent-green-500',
    blue: 'accent-blue-500',
    purple: 'accent-purple-500',
    pink: 'accent-pink-500',
    yellow: 'accent-yellow-500',
    cyan: 'accent-cyan-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-zinc-400">{label}</label>
        <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
          {typeof value === 'number' ? (Number.isInteger(step) && step >= 1 ? Math.round(value) : value.toFixed(1)) : value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          'w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer',
          colorClasses[color] || colorClasses.orange,
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-current',
          '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-125'
        )}
      />
      {description && <p className="text-[9px] text-zinc-600">{description}</p>}
    </div>
  );
}

// ==================== TOGGLE COMPONENT ====================

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <label className="text-[11px] text-zinc-400">{label}</label>
        {description && <p className="text-[9px] text-zinc-600">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-8 h-4 rounded-full transition-colors',
          checked ? 'bg-orange-500' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform',
            checked ? 'left-4' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

// ==================== SELECT COMPONENT ====================

interface SelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

function Select<T extends string>({ label, value, onChange, options }: SelectProps<T>) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-white
                   focus:outline-none focus:border-orange-500/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ==================== SECTION COMPONENT ====================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
  badge?: string;
}

function Section({ title, icon, children, defaultOpen = true, accentColor = 'orange', badge }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses: Record<string, string> = {
    orange: 'border-orange-500/30 [&_.section-icon]:text-orange-400',
    red: 'border-red-500/30 [&_.section-icon]:text-red-400',
    green: 'border-green-500/30 [&_.section-icon]:text-green-400',
    blue: 'border-blue-500/30 [&_.section-icon]:text-blue-400',
    purple: 'border-purple-500/30 [&_.section-icon]:text-purple-400',
    pink: 'border-pink-500/30 [&_.section-icon]:text-pink-400',
    yellow: 'border-yellow-500/30 [&_.section-icon]:text-yellow-400',
    cyan: 'border-cyan-500/30 [&_.section-icon]:text-cyan-400',
    white: 'border-white/30 [&_.section-icon]:text-white',
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', colorClasses[accentColor] || colorClasses.orange)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="section-icon">{icon}</span>
          <span className="text-[11px] font-medium text-zinc-200">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight
          className={cn('w-3.5 h-3.5 text-zinc-500 transition-transform', isOpen && 'rotate-90')}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-2 bg-zinc-900/50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== TEXTURE TABS ====================

const TEXTURE_TABS: { id: TextureMapType; label: string; icon: string; color: string }[] = [
  { id: 'pattern', label: 'Паттерн', icon: '🎨', color: 'cyan' },
  { id: 'mask', label: 'RGB Маска', icon: '🎭', color: 'red' },
  { id: 'normal', label: 'Normal', icon: '🗺️', color: 'purple' },
  { id: 'roughness', label: 'Roughness', icon: '✨', color: 'yellow' },
  { id: 'pearlescence', label: 'Pearl', icon: '🦪', color: 'pink' },
  { id: 'ao', label: 'AO', icon: '🌑', color: 'white' },
  { id: 'height', label: 'Height', icon: '⛰️', color: 'green' },
];

// ==================== PATTERN CATEGORIES ====================

const PATTERN_CATEGORIES = [
  { id: 'geometric', name: 'Геометрия', icon: <Hexagon className="w-3.5 h-3.5" /> },
  { id: 'tech', name: 'Тех', icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: 'organic', name: 'Органика', icon: <Leaf className="w-3.5 h-3.5" /> },
  { id: 'noise', name: 'Шум', icon: <Waves className="w-3.5 h-3.5" /> },
  { id: 'camo', name: 'Камуфляж', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
  { id: 'artistic', name: 'Арт', icon: <Aperture className="w-3.5 h-3.5" /> },
  { id: '3d', name: '3D', icon: <Box className="w-3.5 h-3.5" /> },
  { id: 'advanced', name: 'Сложные', icon: <Atom className="w-3.5 h-3.5" /> },
];

// ==================== MAIN PAGE COMPONENT ====================

export default function PatternGeneratorPage() {
  // State
  const [patternSettings, setPatternSettings] = useState<PatternSettings>(DEFAULT_PATTERN_SETTINGS);
  const [maskSettings, setMaskSettings] = useState<MaskSettings>(DEFAULT_MASK_SETTINGS);
  const [normalSettings, setNormalSettings] = useState<NormalMapSettings>(DEFAULT_NORMAL_SETTINGS);
  const [roughnessSettings, setRoughnessSettings] = useState<RoughnessSettings>(DEFAULT_ROUGHNESS_SETTINGS);
  const [pearlSettings, setPearlSettings] = useState<PearlescenceSettings>(DEFAULT_PEARL_SETTINGS);
  const [aoSettings, setAoSettings] = useState<AOSettings>(DEFAULT_AO_SETTINGS);
  const [heightSettings, setHeightSettings] = useState<HeightSettings>(DEFAULT_HEIGHT_SETTINGS);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);

  const [activeTab, setActiveTab] = useState<TextureMapType>('pattern');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'basic' | '3d' | 'maps' | 'advanced'>('basic');

  // Canvases for export
  const [canvasRefs, setCanvasRefs] = useState<Record<TextureMapType, HTMLCanvasElement | null>>({
    pattern: null,
    mask: null,
    normal: null,
    roughness: null,
    pearlescence: null,
    ao: null,
    height: null,
    curvature: null,
    thickness: null,
  });

  // Update pattern settings
  const updatePatternSetting = useCallback(<K extends keyof PatternSettings>(
    key: K,
    value: PatternSettings[K]
  ) => {
    setPatternSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Update mask settings
  const updateMaskSetting = useCallback(<K extends keyof MaskSettings>(
    key: K,
    value: MaskSettings[K]
  ) => {
    setMaskSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Randomize seed
  const randomizeSeed = useCallback(() => {
    updatePatternSetting('seed', Date.now());
  }, [updatePatternSetting]);

  // Handle canvas refs
  const handleCanvasRef = useCallback((type: TextureMapType, canvas: HTMLCanvasElement | null) => {
    setCanvasRefs((prev) => ({ ...prev, [type]: canvas }));
  }, []);

  // Download single texture
  const downloadTexture = useCallback((type: TextureMapType) => {
    const canvas = canvasRefs[type];
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${type}_${patternSettings.seed}.${exportSettings.format}`;
    link.href = canvas.toDataURL(`image/${exportSettings.format === 'png' ? 'png' : 'png'}`);
    link.click();
  }, [canvasRefs, patternSettings.seed, exportSettings.format]);

  // Download all textures
  const downloadAllTextures = useCallback(() => {
    const types: TextureMapType[] = ['pattern', 'mask', 'normal', 'roughness', 'pearlescence', 'ao', 'height'];
    types.forEach((type, index) => {
      if (exportSettings[`export${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof ExportSettings]) {
        setTimeout(() => downloadTexture(type), index * 200);
      }
    });
  }, [downloadTexture, exportSettings]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredPatterns = selectedCategory
    ? PATTERN_DEFINITIONS.filter((p) => p.category === selectedCategory)
    : PATTERN_DEFINITIONS;

  return (
    <div className={cn('h-screen bg-[#0a0a0b] text-white flex flex-col', fullscreen && 'fixed inset-0 z-50')}>
      {/* Header */}
      <header className="h-11 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-xs">CS2 Pattern Generator</span>
            <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">PRO</span>
          </div>

          <div className="h-5 w-px bg-zinc-700 mx-1" />

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={cn(
                'p-1.5 rounded transition-colors',
                leftPanelOpen ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
              )}
              title="Паттерны"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn(
                'p-1.5 rounded transition-colors',
                rightPanelOpen ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
              )}
              title="Настройки"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setNodeEditorOpen(!nodeEditorOpen)}
              className={cn(
                'p-1.5 rounded transition-colors',
                nodeEditorOpen ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'
              )}
              title="Редактор нод"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={randomizeSeed}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] transition-colors"
          >
            <Shuffle className="w-3 h-3" />
            <span>Случайный</span>
          </button>

          <button
            onClick={downloadAllTextures}
            className="flex items-center gap-1 px-2.5 py-1 bg-orange-500 hover:bg-orange-600 rounded text-[10px] font-medium transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Скачать все</span>
          </button>

          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Patterns */}
        <AnimatePresence>
          {leftPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 overflow-hidden"
            >
              {/* Category Tabs */}
              <div className="p-1.5 border-b border-zinc-800">
                <div className="flex flex-wrap gap-0.5">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'px-1.5 py-1 rounded text-[10px] transition-colors',
                      !selectedCategory ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    )}
                  >
                    Все
                  </button>
                  {PATTERN_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'px-1.5 py-1 rounded text-[10px] transition-colors flex items-center gap-1',
                        selectedCategory === cat.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      )}
                    >
                      {cat.icon}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern Grid */}
              <div className="flex-1 overflow-auto p-1.5">
                <div className="grid grid-cols-4 gap-1">
                  {filteredPatterns.map((pattern) => (
                    <button
                      key={pattern.type}
                      onClick={() => updatePatternSetting('style', pattern.type)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all aspect-square',
                        patternSettings.style === pattern.type
                          ? 'bg-orange-500/20 border border-orange-500/50 ring-1 ring-orange-500/30'
                          : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                      )}
                      title={pattern.description}
                    >
                      <span className="text-lg">{pattern.icon}</span>
                      <span className="text-[8px] text-zinc-400 text-center truncate w-full leading-tight">
                        {pattern.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Schemes */}
              <div className="p-1.5 border-t border-zinc-800">
                <label className="text-[9px] text-zinc-500 mb-1 block">Цветовая схема</label>
                <div className="grid grid-cols-12 gap-0.5">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => updatePatternSetting('colorScheme', scheme.id)}
                      className={cn(
                        'w-full aspect-square rounded transition-all border',
                        patternSettings.colorScheme === scheme.id
                          ? 'border-white scale-110 z-10'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})` }}
                      title={scheme.name}
                    />
                  ))}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Texture Tabs */}
          <div className="flex items-center gap-0.5 p-1.5 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
            {TEXTURE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}

            <div className="flex-1" />

            <button
              onClick={() => downloadTexture(activeTab)}
              className="flex items-center gap-1 px-1.5 py-1 text-zinc-500 hover:text-white transition-colors"
              title="Скачать текущую карту"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-[#0a0a0b] p-3 overflow-auto">
            <PatternCanvas
              patternSettings={patternSettings}
              maskSettings={maskSettings}
              normalSettings={normalSettings}
              roughnessSettings={roughnessSettings}
              pearlSettings={pearlSettings}
              activeTab={activeTab}
              resolution={exportSettings.resolution}
              onCanvasRef={handleCanvasRef}
            />
          </div>

          {/* Node Editor */}
          <AnimatePresence>
            {nodeEditorOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: '40%' }}
                exit={{ height: 0 }}
                className="border-t border-zinc-800 bg-zinc-900/80 overflow-hidden"
              >
                <PatternNodeEditor
                  onClose={() => setNodeEditorOpen(false)}
                  onPatternGenerated={(settings) => setPatternSettings((prev) => ({ ...prev, ...settings }))}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Settings */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="border-l border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 overflow-hidden"
            >
              {/* Settings Tabs */}
              <div className="flex border-b border-zinc-800 shrink-0">
                {[
                  { id: 'basic', label: 'Основные', icon: <Settings className="w-3 h-3" /> },
                  { id: '3d', label: '3D/Глубина', icon: <Box className="w-3 h-3" /> },
                  { id: 'maps', label: 'Карты', icon: <Layers className="w-3 h-3" /> },
                  { id: 'advanced', label: 'Доп.', icon: <Sparkles className="w-3 h-3" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as typeof settingsTab)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[10px] transition-colors',
                      settingsTab === tab.id
                        ? 'text-orange-400 border-b-2 border-orange-400 bg-zinc-800/50'
                        : 'text-zinc-500 hover:text-white'
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-2 space-y-2">
                {/* Basic Settings Tab */}
                {settingsTab === 'basic' && (
                  <>
                    <Section
                      title="Основные"
                      icon={<Settings className="w-3.5 h-3.5" />}
                      accentColor="orange"
                    >
                      <Slider
                        label="Плотность"
                        value={patternSettings.density}
                        onChange={(v) => updatePatternSetting('density', v)}
                        min={10}
                        max={1000}
                        description="Количество элементов"
                      />
                      <Slider
                        label="Размер элементов"
                        value={patternSettings.elementSize}
                        onChange={(v) => updatePatternSetting('elementSize', v)}
                        min={5}
                        max={200}
                      />
                      <Slider
                        label="Расстояние"
                        value={patternSettings.elementSpacing}
                        onChange={(v) => updatePatternSetting('elementSpacing', v)}
                      />
                      <Slider
                        label="Толщина линий"
                        value={patternSettings.lineWidth}
                        onChange={(v) => updatePatternSetting('lineWidth', v)}
                        min={0.5}
                        max={10}
                        step={0.5}
                      />
                      <Slider
                        label="Сложность"
                        value={patternSettings.complexity}
                        onChange={(v) => updatePatternSetting('complexity', v)}
                      />
                      <Slider
                        label="Симметрия"
                        value={patternSettings.symmetry}
                        onChange={(v) => updatePatternSetting('symmetry', v)}
                        min={1}
                        max={12}
                        step={1}
                      />
                    </Section>

                    <Section
                      title="Стиль"
                      icon={<Palette className="w-3.5 h-3.5" />}
                      accentColor="cyan"
                    >
                      <Slider
                        label="Связи"
                        value={patternSettings.connectionDensity}
                        onChange={(v) => updatePatternSetting('connectionDensity', v)}
                      />
                      <Slider
                        label="Заливка"
                        value={patternSettings.fillAmount}
                        onChange={(v) => updatePatternSetting('fillAmount', v)}
                      />
                      <Slider
                        label="Свечение"
                        value={patternSettings.glowIntensity}
                        onChange={(v) => updatePatternSetting('glowIntensity', v)}
                        max={50}
                      />
                      <Slider
                        label="Шум"
                        value={patternSettings.noiseAmount}
                        onChange={(v) => updatePatternSetting('noiseAmount', v)}
                        max={50}
                      />
                      <Slider
                        label="Поворот"
                        value={patternSettings.rotation}
                        onChange={(v) => updatePatternSetting('rotation', v)}
                        max={360}
                        suffix="°"
                      />
                      <Select
                        label="Тип штриха"
                        value={patternSettings.strokeStyle}
                        onChange={(v) => updatePatternSetting('strokeStyle', v)}
                        options={[
                          { value: 'solid', label: 'Сплошной' },
                          { value: 'dashed', label: 'Пунктир' },
                          { value: 'dotted', label: 'Точки' },
                          { value: 'dashdot', label: 'Тире-точка' },
                          { value: 'gradient', label: 'Градиент' },
                        ]}
                      />
                      <Toggle
                        label="Seamless"
                        checked={patternSettings.seamless}
                        onChange={(v) => updatePatternSetting('seamless', v)}
                        description="Бесшовная текстура"
                      />
                    </Section>
                  </>
                )}

                {/* 3D & Depth Tab */}
                {settingsTab === '3d' && (
                  <>
                    <Section
                      title="Режим глубины"
                      icon={<Mountain className="w-3.5 h-3.5" />}
                      accentColor="blue"
                      badge="3D"
                    >
                      <Select
                        label="Тип эффекта"
                        value={patternSettings.depthMode}
                        onChange={(v) => updatePatternSetting('depthMode', v)}
                        options={[
                          { value: 'none', label: 'Без глубины' },
                          { value: 'emboss', label: 'Тиснение' },
                          { value: 'deboss', label: 'Вдавливание' },
                          { value: 'extrude', label: 'Экструзия' },
                          { value: 'bevel', label: 'Фаска' },
                          { value: 'parallax', label: 'Параллакс' },
                          { value: 'displacement', label: 'Дисплейсмент' },
                        ]}
                      />
                      <Slider
                        label="Интенсивность глубины"
                        value={patternSettings.depthIntensity}
                        onChange={(v) => updatePatternSetting('depthIntensity', v)}
                        color="blue"
                      />
                      <Slider
                        label="Слои глубины"
                        value={patternSettings.depthLayers}
                        onChange={(v) => updatePatternSetting('depthLayers', v)}
                        min={1}
                        max={10}
                        step={1}
                        color="blue"
                      />
                      <Slider
                        label="Перспектива"
                        value={patternSettings.depthPerspective}
                        onChange={(v) => updatePatternSetting('depthPerspective', v)}
                        color="blue"
                      />
                    </Section>

                    <Section
                      title="Фаска и экструзия"
                      icon={<Box className="w-3.5 h-3.5" />}
                      accentColor="purple"
                    >
                      <Slider
                        label="Ширина фаски"
                        value={patternSettings.bevelWidth}
                        onChange={(v) => updatePatternSetting('bevelWidth', v)}
                        min={0}
                        max={20}
                        color="purple"
                      />
                      <Slider
                        label="Высота фаски"
                        value={patternSettings.bevelHeight}
                        onChange={(v) => updatePatternSetting('bevelHeight', v)}
                        color="purple"
                      />
                      <Slider
                        label="Глубина экструзии"
                        value={patternSettings.extrudeDepth}
                        onChange={(v) => updatePatternSetting('extrudeDepth', v)}
                        color="purple"
                      />
                    </Section>

                    <Section
                      title="Освещение"
                      icon={<Sun className="w-3.5 h-3.5" />}
                      accentColor="yellow"
                    >
                      <Select
                        label="Режим освещения"
                        value={patternSettings.lightingMode}
                        onChange={(v) => updatePatternSetting('lightingMode', v)}
                        options={[
                          { value: 'none', label: 'Без освещения' },
                          { value: 'directional', label: 'Направленный' },
                          { value: 'point', label: 'Точечный' },
                          { value: 'ambient', label: 'Ambient' },
                          { value: 'hdri', label: 'HDRI' },
                        ]}
                      />
                      <Slider
                        label="Угол света"
                        value={patternSettings.lightAngle}
                        onChange={(v) => updatePatternSetting('lightAngle', v)}
                        max={360}
                        suffix="°"
                        color="yellow"
                      />
                      <Slider
                        label="Высота света"
                        value={patternSettings.lightElevation}
                        onChange={(v) => updatePatternSetting('lightElevation', v)}
                        max={90}
                        suffix="°"
                        color="yellow"
                      />
                      <Slider
                        label="Интенсивность"
                        value={patternSettings.lightIntensity}
                        onChange={(v) => updatePatternSetting('lightIntensity', v)}
                        max={200}
                        color="yellow"
                      />
                      <Slider
                        label="Ambient"
                        value={patternSettings.ambientIntensity}
                        onChange={(v) => updatePatternSetting('ambientIntensity', v)}
                        color="yellow"
                      />
                    </Section>

                    <Section
                      title="Тени и AO"
                      icon={<Moon className="w-3.5 h-3.5" />}
                      accentColor="white"
                    >
                      <Slider
                        label="Интенсивность тени"
                        value={patternSettings.shadowIntensity}
                        onChange={(v) => updatePatternSetting('shadowIntensity', v)}
                      />
                      <Slider
                        label="Угол тени"
                        value={patternSettings.shadowAngle}
                        onChange={(v) => updatePatternSetting('shadowAngle', v)}
                        max={360}
                        suffix="°"
                      />
                      <Slider
                        label="Расстояние тени"
                        value={patternSettings.shadowDistance}
                        onChange={(v) => updatePatternSetting('shadowDistance', v)}
                        max={50}
                      />
                      <Slider
                        label="Ambient Occlusion"
                        value={patternSettings.ambientOcclusion}
                        onChange={(v) => updatePatternSetting('ambientOcclusion', v)}
                      />
                    </Section>

                    <Section
                      title="Specular"
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      accentColor="cyan"
                    >
                      <Slider
                        label="Интенсивность блика"
                        value={patternSettings.specularIntensity}
                        onChange={(v) => updatePatternSetting('specularIntensity', v)}
                        color="cyan"
                      />
                      <Slider
                        label="Размер блика"
                        value={patternSettings.specularPower}
                        onChange={(v) => updatePatternSetting('specularPower', v)}
                        min={1}
                        max={128}
                        color="cyan"
                      />
                    </Section>
                  </>
                )}

                {/* Maps Tab */}
                {settingsTab === 'maps' && (
                  <>
                    <Section
                      title="RGB Маска CS2"
                      icon={<Box className="w-3.5 h-3.5" />}
                      accentColor="red"
                    >
                      <p className="text-[9px] text-zinc-600 mb-1">
                        R/G/B каналы = 3 цвета анодизации
                      </p>
                      <Slider
                        label="🔴 Red (Цвет 1)"
                        value={maskSettings.redIntensity}
                        onChange={(v) => updateMaskSetting('redIntensity', v)}
                        color="red"
                      />
                      <Slider
                        label="🟢 Green (Цвет 2)"
                        value={maskSettings.greenIntensity}
                        onChange={(v) => updateMaskSetting('greenIntensity', v)}
                        color="green"
                      />
                      <Slider
                        label="🔵 Blue (Цвет 3)"
                        value={maskSettings.blueIntensity}
                        onChange={(v) => updateMaskSetting('blueIntensity', v)}
                        color="blue"
                      />
                      <Slider
                        label="⬛ Base Coat"
                        value={maskSettings.baseCoat}
                        onChange={(v) => updateMaskSetting('baseCoat', v)}
                      />
                      <Slider
                        label="Контраст маски"
                        value={maskSettings.maskContrast}
                        onChange={(v) => updateMaskSetting('maskContrast', v)}
                        min={50}
                        max={200}
                      />
                      <Slider
                        label="Гамма маски"
                        value={maskSettings.maskGamma}
                        onChange={(v) => updateMaskSetting('maskGamma', v)}
                        min={50}
                        max={200}
                      />
                      <Slider
                        label="Разделение каналов"
                        value={maskSettings.channelSeparation}
                        onChange={(v) => updateMaskSetting('channelSeparation', v)}
                      />
                      <Toggle
                        label="Инвертировать"
                        checked={maskSettings.invertMask}
                        onChange={(v) => updateMaskSetting('invertMask', v)}
                      />
                      <Toggle
                        label="Градиентная маска"
                        checked={maskSettings.gradientMask}
                        onChange={(v) => updateMaskSetting('gradientMask', v)}
                      />
                    </Section>

                    <Section
                      title="Normal Map"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      accentColor="purple"
                    >
                      <Slider
                        label="Сила"
                        value={normalSettings.strength}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, strength: v }))}
                        color="purple"
                      />
                      <Slider
                        label="Bevel"
                        value={normalSettings.bevelSize}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, bevelSize: v }))}
                        min={1}
                        max={10}
                        color="purple"
                      />
                      <Slider
                        label="Детализация"
                        value={normalSettings.detailLevel}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, detailLevel: v }))}
                        color="purple"
                      />
                      <Slider
                        label="Размытие"
                        value={normalSettings.blurRadius}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, blurRadius: v }))}
                        max={20}
                        color="purple"
                      />
                      <Slider
                        label="Резкость"
                        value={normalSettings.sharpen}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, sharpen: v }))}
                        color="purple"
                      />
                      <Slider
                        label="Кривизна"
                        value={normalSettings.curvatureStrength}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, curvatureStrength: v }))}
                        color="purple"
                      />
                      <Select
                        label="Метод"
                        value={normalSettings.method}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, method: v }))}
                        options={[
                          { value: 'sobel', label: 'Sobel' },
                          { value: 'prewitt', label: 'Prewitt' },
                          { value: 'scharr', label: 'Scharr' },
                          { value: 'roberts', label: 'Roberts' },
                          { value: 'laplacian', label: 'Laplacian' },
                        ]}
                      />
                      <Select
                        label="Swizzle"
                        value={normalSettings.swizzle}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, swizzle: v }))}
                        options={[
                          { value: 'opengl', label: 'OpenGL (Y+)' },
                          { value: 'directx', label: 'DirectX (Y-)' },
                        ]}
                      />
                      <Toggle
                        label="Инвертировать высоту"
                        checked={normalSettings.invertHeight}
                        onChange={(v) => setNormalSettings((p) => ({ ...p, invertHeight: v }))}
                      />
                    </Section>

                    <Section
                      title="Roughness"
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      accentColor="yellow"
                    >
                      <Slider
                        label="База"
                        value={roughnessSettings.base}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, base: v }))}
                        color="yellow"
                      />
                      <Slider
                        label="Вариация"
                        value={roughnessSettings.variation}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, variation: v }))}
                        color="yellow"
                      />
                      <Slider
                        label="Металличность"
                        value={roughnessSettings.metallic}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, metallic: v }))}
                        color="yellow"
                      />
                      <Slider
                        label="Микроповерхность"
                        value={roughnessSettings.microsurface}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, microsurface: v }))}
                        color="yellow"
                      />
                      <Slider
                        label="Анизотропия"
                        value={roughnessSettings.anisotropy}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, anisotropy: v }))}
                        color="yellow"
                      />
                      <Slider
                        label="Clearcoat"
                        value={roughnessSettings.clearcoat}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, clearcoat: v }))}
                        color="yellow"
                      />
                      <Slider
                        label="Sheen"
                        value={roughnessSettings.sheen}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, sheen: v }))}
                        color="yellow"
                      />
                      <Toggle
                        label="Инвертировать"
                        checked={roughnessSettings.invertRoughness}
                        onChange={(v) => setRoughnessSettings((p) => ({ ...p, invertRoughness: v }))}
                      />
                    </Section>

                    <Section
                      title="Pearlescence"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      accentColor="pink"
                    >
                      <Slider
                        label="Интенсивность"
                        value={pearlSettings.intensity}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, intensity: v }))}
                        color="pink"
                      />
                      <Slider
                        label="Частота"
                        value={pearlSettings.frequency}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, frequency: v }))}
                        min={0.1}
                        max={5}
                        step={0.1}
                        color="pink"
                      />
                      <Slider
                        label="Цветовой сдвиг"
                        value={pearlSettings.colorShift}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, colorShift: v }))}
                        max={360}
                        color="pink"
                      />
                      <Slider
                        label="Иридесценция"
                        value={pearlSettings.iridescenceStrength}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, iridescenceStrength: v }))}
                        color="pink"
                      />
                      <Slider
                        label="Rainbow Spread"
                        value={pearlSettings.rainbowSpread}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, rainbowSpread: v }))}
                        color="pink"
                      />
                      <Slider
                        label="View Dependence"
                        value={pearlSettings.viewDependence}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, viewDependence: v }))}
                        color="pink"
                      />
                      <Slider
                        label="Толщина плёнки"
                        value={pearlSettings.filmThickness}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, filmThickness: v }))}
                        color="pink"
                      />
                      <Toggle
                        label="Следовать паттерну"
                        checked={pearlSettings.followPattern}
                        onChange={(v) => setPearlSettings((p) => ({ ...p, followPattern: v }))}
                      />
                    </Section>
                  </>
                )}

                {/* Advanced Tab */}
                {settingsTab === 'advanced' && (
                  <>
                    <Section
                      title="Искажения"
                      icon={<Waves className="w-3.5 h-3.5" />}
                      accentColor="cyan"
                    >
                      <Slider
                        label="Дисторшн"
                        value={patternSettings.distortion}
                        onChange={(v) => updatePatternSetting('distortion', v)}
                        color="cyan"
                      />
                      <Slider
                        label="Турбулентность"
                        value={patternSettings.turbulence}
                        onChange={(v) => updatePatternSetting('turbulence', v)}
                        color="cyan"
                      />
                      <Slider
                        label="Warp сила"
                        value={patternSettings.warpStrength}
                        onChange={(v) => updatePatternSetting('warpStrength', v)}
                        color="cyan"
                      />
                      <Slider
                        label="Warp масштаб"
                        value={patternSettings.warpScale}
                        onChange={(v) => updatePatternSetting('warpScale', v)}
                        color="cyan"
                      />
                    </Section>

                    <Section
                      title="Края и износ"
                      icon={<Focus className="w-3.5 h-3.5" />}
                      accentColor="orange"
                    >
                      <Slider
                        label="Износ краёв"
                        value={patternSettings.edgeWear}
                        onChange={(v) => updatePatternSetting('edgeWear', v)}
                      />
                      <Slider
                        label="Резкость краёв"
                        value={patternSettings.edgeSharpness}
                        onChange={(v) => updatePatternSetting('edgeSharpness', v)}
                      />
                    </Section>

                    <Section
                      title="Glow эффекты"
                      icon={<Lightbulb className="w-3.5 h-3.5" />}
                      accentColor="yellow"
                    >
                      <Slider
                        label="Внутреннее свечение"
                        value={patternSettings.innerGlow}
                        onChange={(v) => updatePatternSetting('innerGlow', v)}
                        color="yellow"
                      />
                      <Slider
                        label="Внешнее свечение"
                        value={patternSettings.outerGlow}
                        onChange={(v) => updatePatternSetting('outerGlow', v)}
                        color="yellow"
                      />
                    </Section>

                    <Section
                      title="Специальные эффекты"
                      icon={<Aperture className="w-3.5 h-3.5" />}
                      accentColor="purple"
                    >
                      <Slider
                        label="Хроматическая аберрация"
                        value={patternSettings.chromatic}
                        onChange={(v) => updatePatternSetting('chromatic', v)}
                        color="purple"
                      />
                      <Slider
                        label="Subsurface"
                        value={patternSettings.subsurface}
                        onChange={(v) => updatePatternSetting('subsurface', v)}
                        color="purple"
                      />
                    </Section>

                    <Section
                      title="Слои"
                      icon={<GalleryVerticalEnd className="w-3.5 h-3.5" />}
                      accentColor="green"
                    >
                      <Slider
                        label="Количество слоёв"
                        value={patternSettings.layerCount}
                        onChange={(v) => updatePatternSetting('layerCount', v)}
                        min={1}
                        max={10}
                        step={1}
                        color="green"
                      />
                      <Slider
                        label="Смещение слоёв"
                        value={patternSettings.layerOffset}
                        onChange={(v) => updatePatternSetting('layerOffset', v)}
                        max={50}
                        color="green"
                      />
                      <Slider
                        label="Прозрачность слоёв"
                        value={patternSettings.layerOpacity}
                        onChange={(v) => updatePatternSetting('layerOpacity', v)}
                        color="green"
                      />
                      <Select
                        label="Режим наложения"
                        value={patternSettings.layerBlend}
                        onChange={(v) => updatePatternSetting('layerBlend', v)}
                        options={[
                          { value: 'normal', label: 'Normal' },
                          { value: 'multiply', label: 'Multiply' },
                          { value: 'screen', label: 'Screen' },
                          { value: 'overlay', label: 'Overlay' },
                          { value: 'add', label: 'Add' },
                          { value: 'softLight', label: 'Soft Light' },
                          { value: 'hardLight', label: 'Hard Light' },
                        ]}
                      />
                    </Section>

                    <Section
                      title="Экспорт"
                      icon={<Download className="w-3.5 h-3.5" />}
                      accentColor="green"
                      defaultOpen={false}
                    >
                      <Select
                        label="Разрешение"
                        value={exportSettings.resolution.toString() as '256' | '512' | '1024' | '2048' | '4096' | '8192'}
                        onChange={(v) =>
                          setExportSettings((p) => ({ ...p, resolution: parseInt(v) as 256 | 512 | 1024 | 2048 | 4096 | 8192 }))
                        }
                        options={[
                          { value: '256', label: '256 x 256' },
                          { value: '512', label: '512 x 512' },
                          { value: '1024', label: '1024 x 1024' },
                          { value: '2048', label: '2048 x 2048' },
                          { value: '4096', label: '4096 x 4096' },
                          { value: '8192', label: '8192 x 8192' },
                        ]}
                      />
                      <Select
                        label="Формат"
                        value={exportSettings.format}
                        onChange={(v) => setExportSettings((p) => ({ ...p, format: v }))}
                        options={[
                          { value: 'png', label: 'PNG' },
                          { value: 'tga', label: 'TGA' },
                          { value: 'tiff', label: 'TIFF' },
                          { value: 'exr', label: 'EXR (HDR)' },
                        ]}
                      />
                      <Select
                        label="Bit Depth"
                        value={exportSettings.bitDepth.toString() as '8' | '16' | '32'}
                        onChange={(v) =>
                          setExportSettings((p) => ({ ...p, bitDepth: parseInt(v) as 8 | 16 | 32 }))
                        }
                        options={[
                          { value: '8', label: '8 bit' },
                          { value: '16', label: '16 bit' },
                          { value: '32', label: '32 bit (float)' },
                        ]}
                      />
                    </Section>
                  </>
                )}
              </div>

              {/* Seed Input */}
              <div className="p-2 border-t border-zinc-800 bg-zinc-900/80">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={patternSettings.seed}
                    onChange={(e) => updatePatternSetting('seed', parseInt(e.target.value) || 0)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] font-mono
                               focus:outline-none focus:border-orange-500/50"
                    placeholder="Seed"
                  />
                  <button
                    onClick={randomizeSeed}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    title="Случайный seed"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="h-7 border-t border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/80 text-[9px] text-zinc-500 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            {PATTERN_DEFINITIONS.find((p) => p.type === patternSettings.style)?.name} •
            Seed: {patternSettings.seed} •
            {exportSettings.resolution}px
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{PATTERN_DEFINITIONS.length} паттернов</span>
          <span>•</span>
          <span>CS2 Workshop Compatible</span>
        </div>
      </footer>
    </div>
  );
}
