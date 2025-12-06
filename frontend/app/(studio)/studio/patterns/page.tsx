'use client';

/**
 * CS2 Pattern Generator Page
 *
 * Professional procedural pattern generator for CS2 weapon skins.
 * Generates Pattern, RGB Mask, Normal, Roughness, Pearlescence maps.
 *
 * @module app/(studio)/studio/patterns/page
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Download,
  RefreshCw,
  Settings,
  Palette,
  Grid3X3,
  Sliders,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Save,
  FolderOpen,
  Maximize2,
  Minimize2,
  Info,
  Sparkles,
  Zap,
  Box,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatternCanvas } from '@/components/studio/pattern-generator/pattern-canvas';
import { PatternNodeEditor } from '@/components/studio/pattern-generator/pattern-node-editor';
import { PatternPresets } from '@/components/studio/pattern-generator/pattern-presets';
import {
  PatternSettings,
  MaskSettings,
  NormalMapSettings,
  RoughnessSettings,
  PearlescenceSettings,
  ExportSettings,
  TextureMapType,
  DEFAULT_PATTERN_SETTINGS,
  DEFAULT_MASK_SETTINGS,
  DEFAULT_NORMAL_SETTINGS,
  DEFAULT_ROUGHNESS_SETTINGS,
  DEFAULT_PEARL_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  PATTERN_DEFINITIONS,
  COLOR_SCHEMES,
  PatternType,
  StrokeStyle,
  CornerStyle,
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
}: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400">{label}</label>
        <span className="text-xs text-zinc-500 font-mono">
          {Math.round(value * 100) / 100}
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
        className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-orange-500
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500
                   [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                   [&::-webkit-slider-thumb]:hover:scale-125"
      />
      {description && <p className="text-[10px] text-zinc-600">{description}</p>}
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
    <div className="flex items-center justify-between py-1">
      <div>
        <label className="text-xs text-zinc-400">{label}</label>
        {description && <p className="text-[10px] text-zinc-600">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-orange-500' : 'bg-zinc-700'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
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
      <label className="text-xs text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white
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
}

function Section({ title, icon, children, defaultOpen = true, accentColor = 'orange' }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses: Record<string, string> = {
    orange: 'text-orange-400 border-orange-500/30',
    red: 'text-red-400 border-red-500/30',
    green: 'text-green-400 border-green-500/30',
    blue: 'text-blue-400 border-blue-500/30',
    purple: 'text-purple-400 border-purple-500/30',
    pink: 'text-pink-400 border-pink-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30',
    cyan: 'text-cyan-400 border-cyan-500/30',
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', colorClasses[accentColor] || colorClasses.orange)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-zinc-200">{title}</span>
        </div>
        <ChevronRight
          className={cn('w-4 h-4 text-zinc-500 transition-transform', isOpen && 'rotate-90')}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 bg-zinc-900/50">{children}</div>
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
];

// ==================== MAIN PAGE COMPONENT ====================

export default function PatternGeneratorPage() {
  // State
  const [patternSettings, setPatternSettings] = useState<PatternSettings>(DEFAULT_PATTERN_SETTINGS);
  const [maskSettings, setMaskSettings] = useState<MaskSettings>(DEFAULT_MASK_SETTINGS);
  const [normalSettings, setNormalSettings] = useState<NormalMapSettings>(DEFAULT_NORMAL_SETTINGS);
  const [roughnessSettings, setRoughnessSettings] = useState<RoughnessSettings>(DEFAULT_ROUGHNESS_SETTINGS);
  const [pearlSettings, setPearlSettings] = useState<PearlescenceSettings>(DEFAULT_PEARL_SETTINGS);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS);

  const [activeTab, setActiveTab] = useState<TextureMapType>('pattern');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Canvases for export
  const [canvasRefs, setCanvasRefs] = useState<Record<TextureMapType, HTMLCanvasElement | null>>({
    pattern: null,
    mask: null,
    normal: null,
    roughness: null,
    pearlescence: null,
    ao: null,
    height: null,
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
    const types: TextureMapType[] = ['pattern', 'mask', 'normal', 'roughness', 'pearlescence'];
    types.forEach((type, index) => {
      setTimeout(() => downloadTexture(type), index * 200);
    });
  }, [downloadTexture]);

  // Pattern categories
  const patternCategories = [
    { id: 'geometric', name: 'Геометрия', icon: '◇' },
    { id: 'tech', name: 'Тех', icon: '⚡' },
    { id: 'organic', name: 'Органика', icon: '◌' },
    { id: 'noise', name: 'Шум', icon: '░' },
    { id: 'camo', name: 'Камуфляж', icon: '▤' },
    { id: 'artistic', name: 'Арт', icon: '✧' },
  ];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredPatterns = selectedCategory
    ? PATTERN_DEFINITIONS.filter((p) => p.category === selectedCategory)
    : PATTERN_DEFINITIONS;

  return (
    <div className={cn('h-screen bg-[#0a0a0b] text-white flex flex-col', fullscreen && 'fixed inset-0 z-50')}>
      {/* Header */}
      <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">CS2 Pattern Generator</span>
          </div>

          <div className="h-6 w-px bg-zinc-700" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className={cn(
                'p-1.5 rounded transition-colors',
                leftPanelOpen ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
              )}
              title="Паттерны"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn(
                'p-1.5 rounded transition-colors',
                rightPanelOpen ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
              )}
              title="Настройки"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={() => setNodeEditorOpen(!nodeEditorOpen)}
              className={cn(
                'p-1.5 rounded transition-colors',
                nodeEditorOpen ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-white'
              )}
              title="Редактор нод"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={randomizeSeed}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Случайный</span>
          </button>

          <button
            onClick={downloadAllTextures}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать все</span>
          </button>

          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 overflow-hidden"
            >
              {/* Category Tabs */}
              <div className="p-2 border-b border-zinc-800">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'px-2 py-1 rounded text-xs transition-colors',
                      !selectedCategory ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    )}
                  >
                    Все
                  </button>
                  {patternCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors flex items-center gap-1',
                        selectedCategory === cat.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern Grid */}
              <div className="flex-1 overflow-auto p-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {filteredPatterns.map((pattern) => (
                    <button
                      key={pattern.type}
                      onClick={() => updatePatternSetting('style', pattern.type)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                        patternSettings.style === pattern.type
                          ? 'bg-orange-500/20 border border-orange-500/50 ring-1 ring-orange-500/30'
                          : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                      )}
                      title={pattern.description}
                    >
                      <span className="text-xl">{pattern.icon}</span>
                      <span className="text-[10px] text-zinc-400 text-center truncate w-full">
                        {pattern.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Schemes */}
              <div className="p-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-500 mb-2 block">Цветовая схема</label>
                <div className="grid grid-cols-8 gap-1">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => updatePatternSetting('colorScheme', scheme.id)}
                      className={cn(
                        'w-7 h-7 rounded-md transition-all border-2',
                        patternSettings.colorScheme === scheme.id
                          ? 'border-white scale-110'
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
          <div className="flex items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
            {TEXTURE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
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
              className="flex items-center gap-1.5 px-2 py-1 text-zinc-500 hover:text-white transition-colors"
              title="Скачать текущую карту"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-[#0a0a0b] p-4 overflow-auto">
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
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 overflow-hidden"
            >
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {/* Pattern Settings */}
                <Section
                  title="Основные настройки"
                  icon={<Settings className="w-4 h-4" />}
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
                </Section>

                <Section
                  title="Стиль"
                  icon={<Palette className="w-4 h-4" />}
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
                    ]}
                  />
                  <Toggle
                    label="Seamless"
                    checked={patternSettings.seamless}
                    onChange={(v) => updatePatternSetting('seamless', v)}
                    description="Бесшовная текстура"
                  />
                </Section>

                {/* RGB Mask Settings */}
                <Section
                  title="RGB Маска CS2"
                  icon={<Box className="w-4 h-4" />}
                  accentColor="red"
                  defaultOpen={activeTab === 'mask'}
                >
                  <p className="text-[10px] text-zinc-600 mb-2">
                    R/G/B каналы = 3 цвета анодизации
                  </p>
                  <Slider
                    label="🔴 Red (Цвет 1)"
                    value={maskSettings.redIntensity}
                    onChange={(v) => updateMaskSetting('redIntensity', v)}
                  />
                  <Slider
                    label="🟢 Green (Цвет 2)"
                    value={maskSettings.greenIntensity}
                    onChange={(v) => updateMaskSetting('greenIntensity', v)}
                  />
                  <Slider
                    label="🔵 Blue (Цвет 3)"
                    value={maskSettings.blueIntensity}
                    onChange={(v) => updateMaskSetting('blueIntensity', v)}
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
                  <Toggle
                    label="Инвертировать"
                    checked={maskSettings.invertMask}
                    onChange={(v) => updateMaskSetting('invertMask', v)}
                  />
                </Section>

                {/* Normal Map Settings */}
                <Section
                  title="Normal Map"
                  icon={<Layers className="w-4 h-4" />}
                  accentColor="purple"
                  defaultOpen={activeTab === 'normal'}
                >
                  <Slider
                    label="Сила"
                    value={normalSettings.strength}
                    onChange={(v) => setNormalSettings((p) => ({ ...p, strength: v }))}
                  />
                  <Slider
                    label="Bevel"
                    value={normalSettings.bevelSize}
                    onChange={(v) => setNormalSettings((p) => ({ ...p, bevelSize: v }))}
                    min={1}
                    max={10}
                  />
                  <Select
                    label="Метод"
                    value={normalSettings.method}
                    onChange={(v) => setNormalSettings((p) => ({ ...p, method: v }))}
                    options={[
                      { value: 'sobel', label: 'Sobel' },
                      { value: 'prewitt', label: 'Prewitt' },
                      { value: 'scharr', label: 'Scharr' },
                    ]}
                  />
                  <Toggle
                    label="Инвертировать высоту"
                    checked={normalSettings.invertHeight}
                    onChange={(v) => setNormalSettings((p) => ({ ...p, invertHeight: v }))}
                  />
                </Section>

                {/* Roughness Settings */}
                <Section
                  title="Roughness"
                  icon={<Sparkles className="w-4 h-4" />}
                  accentColor="yellow"
                  defaultOpen={activeTab === 'roughness'}
                >
                  <p className="text-[10px] text-zinc-600 mb-2">
                    Тёмный = глянец, Светлый = матовый
                  </p>
                  <Slider
                    label="База"
                    value={roughnessSettings.base}
                    onChange={(v) => setRoughnessSettings((p) => ({ ...p, base: v }))}
                  />
                  <Slider
                    label="Вариация"
                    value={roughnessSettings.variation}
                    onChange={(v) => setRoughnessSettings((p) => ({ ...p, variation: v }))}
                  />
                  <Slider
                    label="Металличность"
                    value={roughnessSettings.metallic}
                    onChange={(v) => setRoughnessSettings((p) => ({ ...p, metallic: v }))}
                  />
                  <Toggle
                    label="Инвертировать"
                    checked={roughnessSettings.invertRoughness}
                    onChange={(v) => setRoughnessSettings((p) => ({ ...p, invertRoughness: v }))}
                  />
                </Section>

                {/* Pearlescence Settings */}
                <Section
                  title="Pearlescence"
                  icon={<Eye className="w-4 h-4" />}
                  accentColor="pink"
                  defaultOpen={activeTab === 'pearlescence'}
                >
                  <Slider
                    label="Интенсивность"
                    value={pearlSettings.intensity}
                    onChange={(v) => setPearlSettings((p) => ({ ...p, intensity: v }))}
                  />
                  <Slider
                    label="Частота"
                    value={pearlSettings.frequency}
                    onChange={(v) => setPearlSettings((p) => ({ ...p, frequency: v }))}
                    min={0.1}
                    max={5}
                    step={0.1}
                  />
                  <Slider
                    label="Цветовой сдвиг"
                    value={pearlSettings.colorShift}
                    onChange={(v) => setPearlSettings((p) => ({ ...p, colorShift: v }))}
                    max={360}
                  />
                  <Toggle
                    label="Следовать паттерну"
                    checked={pearlSettings.followPattern}
                    onChange={(v) => setPearlSettings((p) => ({ ...p, followPattern: v }))}
                  />
                </Section>

                {/* Export Settings */}
                <Section
                  title="Экспорт"
                  icon={<Download className="w-4 h-4" />}
                  accentColor="green"
                  defaultOpen={false}
                >
                  <Select
                    label="Разрешение"
                    value={exportSettings.resolution.toString() as '256' | '512' | '1024' | '2048' | '4096'}
                    onChange={(v) =>
                      setExportSettings((p) => ({ ...p, resolution: parseInt(v) as 256 | 512 | 1024 | 2048 | 4096 }))
                    }
                    options={[
                      { value: '256', label: '256 x 256' },
                      { value: '512', label: '512 x 512' },
                      { value: '1024', label: '1024 x 1024' },
                      { value: '2048', label: '2048 x 2048' },
                      { value: '4096', label: '4096 x 4096' },
                    ]}
                  />
                  <Select
                    label="Формат"
                    value={exportSettings.format}
                    onChange={(v) => setExportSettings((p) => ({ ...p, format: v }))}
                    options={[
                      { value: 'png', label: 'PNG' },
                      { value: 'tga', label: 'TGA' },
                    ]}
                  />
                  <div className="pt-2 space-y-1">
                    <Toggle
                      label="Паттерн"
                      checked={exportSettings.exportPattern}
                      onChange={(v) => setExportSettings((p) => ({ ...p, exportPattern: v }))}
                    />
                    <Toggle
                      label="RGB Маска"
                      checked={exportSettings.exportMask}
                      onChange={(v) => setExportSettings((p) => ({ ...p, exportMask: v }))}
                    />
                    <Toggle
                      label="Normal Map"
                      checked={exportSettings.exportNormal}
                      onChange={(v) => setExportSettings((p) => ({ ...p, exportNormal: v }))}
                    />
                    <Toggle
                      label="Roughness"
                      checked={exportSettings.exportRoughness}
                      onChange={(v) => setExportSettings((p) => ({ ...p, exportRoughness: v }))}
                    />
                    <Toggle
                      label="Pearlescence"
                      checked={exportSettings.exportPearl}
                      onChange={(v) => setExportSettings((p) => ({ ...p, exportPearl: v }))}
                    />
                  </div>
                </Section>
              </div>

              {/* Seed Input */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/80">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={patternSettings.seed}
                    onChange={(e) => updatePatternSetting('seed', parseInt(e.target.value) || 0)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs font-mono
                               focus:outline-none focus:border-orange-500/50"
                    placeholder="Seed"
                  />
                  <button
                    onClick={randomizeSeed}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    title="Случайный seed"
                  >
                    <Shuffle className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="h-8 border-t border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/80 text-xs text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span>Паттерн: {PATTERN_DEFINITIONS.find((p) => p.type === patternSettings.style)?.name}</span>
          <span>•</span>
          <span>Seed: {patternSettings.seed}</span>
          <span>•</span>
          <span>Разрешение: {exportSettings.resolution}px</span>
        </div>
        <div className="flex items-center gap-2">
          <span>CS2 Workshop Tools Compatible</span>
        </div>
      </footer>
    </div>
  );
}
