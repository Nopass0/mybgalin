'use client';

/**
 * Pattern Presets Component
 *
 * Pre-configured pattern settings for quick application.
 *
 * @module components/studio/pattern-generator/pattern-presets
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Clock, Heart, Download, Upload, Trash2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PatternSettings,
  MaskSettings,
  NormalMapSettings,
  RoughnessSettings,
  PearlescenceSettings,
  PatternPreset,
  DEFAULT_PATTERN_SETTINGS,
  DEFAULT_MASK_SETTINGS,
  DEFAULT_NORMAL_SETTINGS,
  DEFAULT_ROUGHNESS_SETTINGS,
  DEFAULT_PEARL_SETTINGS,
} from '@/types/pattern-generator';

// ==================== BUILT-IN PRESETS ====================

const BUILT_IN_PRESETS: PatternPreset[] = [
  {
    id: 'cyber-circuit',
    name: 'Cyber Circuit',
    description: 'Киберпанк микросхема',
    icon: '⚡',
    category: 'tech',
    patternSettings: {
      style: 'circuit',
      colorScheme: 'cyan',
      density: 200,
      complexity: 70,
      connectionDensity: 60,
      glowIntensity: 15,
    },
    maskSettings: {
      redIntensity: 90,
      greenIntensity: 50,
      blueIntensity: 30,
    },
  },
  {
    id: 'neon-hex',
    name: 'Neon Hexagons',
    description: 'Неоновые гексагоны',
    icon: '⬡',
    category: 'geometric',
    patternSettings: {
      style: 'hexgrid',
      colorScheme: 'purple',
      density: 150,
      fillAmount: 40,
      glowIntensity: 20,
    },
    maskSettings: {
      redIntensity: 60,
      greenIntensity: 80,
      blueIntensity: 90,
    },
  },
  {
    id: 'military-digi',
    name: 'Digital Camo',
    description: 'Цифровой камуфляж',
    icon: '▤',
    category: 'camo',
    patternSettings: {
      style: 'digicamo',
      colorScheme: 'military',
      density: 300,
      elementSize: 30,
    },
    maskSettings: {
      redIntensity: 70,
      greenIntensity: 70,
      blueIntensity: 40,
      baseCoat: 30,
    },
  },
  {
    id: 'gold-geometric',
    name: 'Gold Geometry',
    description: 'Золотая геометрия',
    icon: '◇',
    category: 'artistic',
    patternSettings: {
      style: 'geometric',
      colorScheme: 'gold',
      complexity: 80,
      lineWidth: 1.5,
      glowIntensity: 10,
    },
    maskSettings: {
      redIntensity: 100,
      greenIntensity: 70,
      blueIntensity: 20,
    },
    roughnessSettings: {
      base: 20,
      variation: 30,
    },
    pearlSettings: {
      intensity: 70,
    },
  },
  {
    id: 'matrix-rain',
    name: 'Matrix Rain',
    description: 'Матричный дождь',
    icon: '░',
    category: 'tech',
    patternSettings: {
      style: 'datastream',
      colorScheme: 'matrix',
      density: 250,
      lineWidth: 1,
    },
    maskSettings: {
      redIntensity: 30,
      greenIntensity: 100,
      blueIntensity: 30,
    },
  },
  {
    id: 'fire-waves',
    name: 'Fire Waves',
    description: 'Огненные волны',
    icon: '〰',
    category: 'organic',
    patternSettings: {
      style: 'waves',
      colorScheme: 'lava',
      density: 180,
      complexity: 60,
      glowIntensity: 25,
    },
    maskSettings: {
      redIntensity: 100,
      greenIntensity: 50,
      blueIntensity: 20,
    },
  },
  {
    id: 'ice-crystal',
    name: 'Ice Crystal',
    description: 'Ледяные кристаллы',
    icon: '❄',
    category: 'organic',
    patternSettings: {
      style: 'voronoi',
      colorScheme: 'ice',
      density: 100,
      glowIntensity: 12,
    },
    maskSettings: {
      redIntensity: 60,
      greenIntensity: 80,
      blueIntensity: 100,
    },
    pearlSettings: {
      intensity: 80,
      frequency: 1.5,
    },
  },
  {
    id: 'toxic-splatter',
    name: 'Toxic Splatter',
    description: 'Токсичные брызги',
    icon: '☢',
    category: 'artistic',
    patternSettings: {
      style: 'mosaic',
      colorScheme: 'toxic',
      density: 200,
      fillAmount: 60,
    },
    maskSettings: {
      redIntensity: 50,
      greenIntensity: 100,
      blueIntensity: 30,
    },
  },
  {
    id: 'carbon-fiber',
    name: 'Carbon Fiber',
    description: 'Углеволокно',
    icon: '▥',
    category: 'tech',
    patternSettings: {
      style: 'crosshatch',
      colorScheme: 'white',
      density: 400,
      lineWidth: 0.8,
      noiseAmount: 5,
    },
    maskSettings: {
      redIntensity: 30,
      greenIntensity: 30,
      blueIntensity: 30,
    },
    roughnessSettings: {
      base: 15,
      variation: 10,
    },
  },
  {
    id: 'glitch-art',
    name: 'Glitch Art',
    description: 'Глитч арт',
    icon: '▓',
    category: 'tech',
    patternSettings: {
      style: 'glitch',
      colorScheme: 'pink',
      density: 350,
    },
    maskSettings: {
      redIntensity: 90,
      greenIntensity: 40,
      blueIntensity: 80,
    },
  },
  {
    id: 'zen-flow',
    name: 'Zen Flow',
    description: 'Дзен поток',
    icon: '≈',
    category: 'organic',
    patternSettings: {
      style: 'flowfield',
      colorScheme: 'teal',
      density: 120,
      complexity: 40,
      lineWidth: 1.2,
    },
    maskSettings: {
      redIntensity: 50,
      greenIntensity: 90,
      blueIntensity: 80,
    },
  },
  {
    id: 'star-field',
    name: 'Star Field',
    description: 'Звёздное поле',
    icon: '★',
    category: 'geometric',
    patternSettings: {
      style: 'stars',
      colorScheme: 'amber',
      density: 80,
      fillAmount: 70,
      glowIntensity: 18,
    },
    maskSettings: {
      redIntensity: 100,
      greenIntensity: 80,
      blueIntensity: 40,
    },
  },
];

// ==================== INTERFACE ====================

interface PatternPresetsProps {
  onApplyPreset: (
    patternSettings: Partial<PatternSettings>,
    maskSettings?: Partial<MaskSettings>,
    normalSettings?: Partial<NormalMapSettings>,
    roughnessSettings?: Partial<RoughnessSettings>,
    pearlSettings?: Partial<PearlescenceSettings>
  ) => void;
  currentSettings: PatternSettings;
  className?: string;
}

// ==================== COMPONENT ====================

export function PatternPresets({ onApplyPreset, currentSettings, className }: PatternPresetsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [customPresets, setCustomPresets] = useState<PatternPreset[]>([]);

  const categories = [
    { id: 'tech', name: 'Тех', icon: '⚡' },
    { id: 'geometric', name: 'Геометрия', icon: '◇' },
    { id: 'organic', name: 'Органика', icon: '≈' },
    { id: 'camo', name: 'Камуфляж', icon: '▤' },
    { id: 'artistic', name: 'Арт', icon: '✧' },
  ];

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const filteredPresets = allPresets.filter((preset) => {
    const matchesSearch =
      !searchQuery ||
      preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || preset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (presetId: string) => {
    setFavorites((prev) => (prev.includes(presetId) ? prev.filter((id) => id !== presetId) : [...prev, presetId]));
  };

  const saveCurrentAsPreset = () => {
    const name = prompt('Название пресета:');
    if (!name) return;

    const newPreset: PatternPreset = {
      id: `custom-${Date.now()}`,
      name,
      description: 'Пользовательский пресет',
      icon: '📦',
      category: 'artistic',
      patternSettings: { ...currentSettings },
    };

    setCustomPresets((prev) => [...prev, newPreset]);
  };

  const deleteCustomPreset = (presetId: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
  };

  const applyPreset = (preset: PatternPreset) => {
    onApplyPreset(
      preset.patternSettings,
      preset.maskSettings,
      preset.normalSettings,
      preset.roughnessSettings,
      preset.pearlSettings
    );
  };

  const favoritePresets = filteredPresets.filter((p) => favorites.includes(p.id));
  const otherPresets = filteredPresets.filter((p) => !favorites.includes(p.id));

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search */}
      <div className="p-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск пресетов..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded pl-7 pr-2 py-1.5 text-xs
                       focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1 p-2 border-b border-zinc-800 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-2 py-1 rounded text-xs transition-colors',
            !selectedCategory ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
          )}
        >
          Все
        </button>
        {categories.map((cat) => (
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

      {/* Save Button */}
      <div className="p-2 border-b border-zinc-800">
        <button
          onClick={saveCurrentAsPreset}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700
                     border border-zinc-700 rounded text-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Сохранить текущий</span>
        </button>
      </div>

      {/* Presets List */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {/* Favorites */}
        {favoritePresets.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span>Избранное</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {favoritePresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isFavorite={true}
                  isCustom={preset.id.startsWith('custom-')}
                  onApply={() => applyPreset(preset)}
                  onToggleFavorite={() => toggleFavorite(preset.id)}
                  onDelete={preset.id.startsWith('custom-') ? () => deleteCustomPreset(preset.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Presets */}
        <div>
          {favoritePresets.length > 0 && (
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Все пресеты</div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {otherPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isFavorite={false}
                isCustom={preset.id.startsWith('custom-')}
                onApply={() => applyPreset(preset)}
                onToggleFavorite={() => toggleFavorite(preset.id)}
                onDelete={preset.id.startsWith('custom-') ? () => deleteCustomPreset(preset.id) : undefined}
              />
            ))}
          </div>
        </div>

        {filteredPresets.length === 0 && (
          <div className="text-center text-zinc-500 text-xs py-8">Пресеты не найдены</div>
        )}
      </div>
    </div>
  );
}

// ==================== PRESET CARD ====================

interface PresetCardProps {
  preset: PatternPreset;
  isFavorite: boolean;
  isCustom: boolean;
  onApply: () => void;
  onToggleFavorite: () => void;
  onDelete?: () => void;
}

function PresetCard({ preset, isFavorite, isCustom, onApply, onToggleFavorite, onDelete }: PresetCardProps) {
  return (
    <div className="group relative bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden hover:border-orange-500/50 transition-colors">
      {/* Preview */}
      <button
        onClick={onApply}
        className="w-full aspect-square flex items-center justify-center bg-zinc-900 text-3xl"
      >
        {preset.icon}
      </button>

      {/* Info */}
      <div className="p-1.5">
        <div className="text-[10px] font-medium truncate">{preset.name}</div>
        <div className="text-[9px] text-zinc-500 truncate">{preset.description}</div>
      </div>

      {/* Actions */}
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-1 bg-zinc-800/80 rounded hover:bg-zinc-700 transition-colors"
        >
          <Star
            className={cn(
              'w-3 h-3',
              isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-400'
            )}
          />
        </button>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 bg-zinc-800/80 rounded hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-3 h-3 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Custom badge */}
      {isCustom && (
        <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-orange-500/20 rounded text-[8px] text-orange-400">
          Custom
        </div>
      )}
    </div>
  );
}
