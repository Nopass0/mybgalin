'use client';

/**
 * Pattern Node Editor Component
 *
 * Visual node-based editor for creating procedural patterns
 * Similar to Blender's shader nodes or Substance Designer.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Play,
  Search,
  Palette,
  Waves,
  Grid3X3,
  Layers,
  Filter,
  Move,
  Circle,
  Sparkles,
  Zap,
  Box,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatternSettings, NodeCategory, NodePort } from '@/types/pattern-generator';

// ==================== NODE DEFINITIONS ====================

interface NodeDefinition {
  type: string;
  name: string;
  category: NodeCategory;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  parameters: { id: string; name: string; type: string; value: number | string; min?: number; max?: number }[];
}

const NODE_DEFINITIONS: NodeDefinition[] = [
  // Input Nodes
  {
    type: 'uv-input',
    name: 'UV Координаты',
    category: 'input',
    description: 'Текстурные координаты',
    inputs: [],
    outputs: [
      { id: 'uv', name: 'UV', type: 'vector2' },
      { id: 'x', name: 'X', type: 'float' },
      { id: 'y', name: 'Y', type: 'float' },
    ],
    parameters: [],
  },
  {
    type: 'value-input',
    name: 'Значение',
    category: 'input',
    description: 'Числовое значение',
    inputs: [],
    outputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    parameters: [{ id: 'value', name: 'Значение', type: 'float', value: 0.5, min: 0, max: 1 }],
  },
  {
    type: 'color-input',
    name: 'Цвет',
    category: 'input',
    description: 'Цветовое значение',
    inputs: [],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [{ id: 'color', name: 'Цвет', type: 'color', value: '#ff6600' }],
  },
  {
    type: 'time-input',
    name: 'Время',
    category: 'input',
    description: 'Анимационное время (0-1)',
    inputs: [],
    outputs: [{ id: 'time', name: 'Время', type: 'float' }],
    parameters: [{ id: 'speed', name: 'Скорость', type: 'float', value: 1, min: 0.1, max: 10 }],
  },

  // Noise Nodes
  {
    type: 'noise-perlin',
    name: 'Perlin Noise',
    category: 'noise',
    description: 'Классический шум Перлина',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [
      { id: 'value', name: 'Значение', type: 'float' },
      { id: 'color', name: 'Цвет', type: 'color' },
    ],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 10, min: 0.1, max: 100 },
      { id: 'octaves', name: 'Октавы', type: 'int', value: 4, min: 1, max: 16 },
      { id: 'persistence', name: 'Стойкость', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
    ],
  },
  {
    type: 'noise-voronoi',
    name: 'Voronoi',
    category: 'noise',
    description: 'Диаграмма Вороного',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [
      { id: 'distance', name: 'Расстояние', type: 'float' },
      { id: 'cell', name: 'Ячейка', type: 'float' },
    ],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.1, max: 50 },
      { id: 'randomness', name: 'Случайность', type: 'float', value: 1, min: 0, max: 1 },
      { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
    ],
  },
  {
    type: 'noise-fbm',
    name: 'FBM',
    category: 'noise',
    description: 'Fractal Brownian Motion',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.1, max: 50 },
      { id: 'octaves', name: 'Октавы', type: 'int', value: 6, min: 1, max: 16 },
      { id: 'lacunarity', name: 'Лакунарность', type: 'float', value: 2, min: 1, max: 4 },
      { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
    ],
  },
  {
    type: 'noise-worley',
    name: 'Worley Noise',
    category: 'noise',
    description: 'Клеточный шум',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [
      { id: 'f1', name: 'F1', type: 'float' },
      { id: 'f2', name: 'F2', type: 'float' },
      { id: 'edge', name: 'Грани', type: 'float' },
    ],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.1, max: 30 },
      { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
    ],
  },
  {
    type: 'noise-simplex',
    name: 'Simplex Noise',
    category: 'noise',
    description: 'Улучшенный шум',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.1, max: 50 },
      { id: 'seed', name: 'Seed', type: 'int', value: 0, min: 0, max: 9999 },
    ],
  },

  // Pattern Nodes
  {
    type: 'pattern-checker',
    name: 'Шахматка',
    category: 'pattern',
    description: 'Шахматный паттерн',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [{ id: 'scale', name: 'Масштаб', type: 'float', value: 8, min: 1, max: 64 }],
  },
  {
    type: 'pattern-stripes',
    name: 'Полосы',
    category: 'pattern',
    description: 'Полосатый паттерн',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 10, min: 1, max: 100 },
      { id: 'angle', name: 'Угол', type: 'float', value: 0, min: 0, max: 360 },
    ],
  },
  {
    type: 'pattern-dots',
    name: 'Точки',
    category: 'pattern',
    description: 'Точечный паттерн',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 10, min: 1, max: 50 },
      { id: 'radius', name: 'Радиус', type: 'float', value: 0.3, min: 0.1, max: 0.9 },
    ],
  },
  {
    type: 'pattern-hexagon',
    name: 'Гексагоны',
    category: 'pattern',
    description: 'Гексагональная сетка',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [
      { id: 'fac', name: 'Фактор', type: 'float' },
      { id: 'cell', name: 'Ячейка', type: 'float' },
    ],
    parameters: [{ id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 1, max: 30 }],
  },
  {
    type: 'pattern-wave',
    name: 'Волна',
    category: 'pattern',
    description: 'Волновой паттерн',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.5, max: 20 },
      { id: 'distortion', name: 'Искажение', type: 'float', value: 0, min: 0, max: 10 },
    ],
  },
  {
    type: 'pattern-brick',
    name: 'Кирпич',
    category: 'pattern',
    description: 'Кирпичная кладка',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [
      { id: 'fac', name: 'Фактор', type: 'float' },
      { id: 'mortar', name: 'Шов', type: 'float' },
    ],
    parameters: [
      { id: 'scaleX', name: 'Масштаб X', type: 'float', value: 4, min: 1, max: 20 },
      { id: 'scaleY', name: 'Масштаб Y', type: 'float', value: 8, min: 1, max: 40 },
      { id: 'offset', name: 'Смещение', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'mortarSize', name: 'Толщина шва', type: 'float', value: 0.05, min: 0, max: 0.2 },
    ],
  },
  {
    type: 'pattern-rings',
    name: 'Кольца',
    category: 'pattern',
    description: 'Концентрические кольца',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 10, min: 1, max: 50 },
      { id: 'centerX', name: 'Центр X', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'centerY', name: 'Центр Y', type: 'float', value: 0.5, min: 0, max: 1 },
    ],
  },
  {
    type: 'pattern-spiral',
    name: 'Спираль',
    category: 'pattern',
    description: 'Спиральный паттерн',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [
      { id: 'arms', name: 'Лучи', type: 'int', value: 4, min: 1, max: 16 },
      { id: 'twist', name: 'Закрутка', type: 'float', value: 2, min: 0.1, max: 10 },
    ],
  },
  {
    type: 'pattern-grid',
    name: 'Сетка',
    category: 'pattern',
    description: 'Линейная сетка',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 10, min: 1, max: 50 },
      { id: 'thickness', name: 'Толщина', type: 'float', value: 0.1, min: 0.01, max: 0.5 },
    ],
  },
  {
    type: 'pattern-triangle',
    name: 'Треугольники',
    category: 'pattern',
    description: 'Треугольная сетка',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [
      { id: 'fac', name: 'Фактор', type: 'float' },
      { id: 'cell', name: 'Ячейка', type: 'float' },
    ],
    parameters: [{ id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 1, max: 30 }],
  },

  // Math Nodes
  {
    type: 'math-add',
    name: 'Сложение',
    category: 'math',
    description: 'A + B',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-subtract',
    name: 'Вычитание',
    category: 'math',
    description: 'A - B',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-multiply',
    name: 'Умножение',
    category: 'math',
    description: 'A × B',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-divide',
    name: 'Деление',
    category: 'math',
    description: 'A ÷ B',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-power',
    name: 'Степень',
    category: 'math',
    description: 'A^B',
    inputs: [
      { id: 'base', name: 'Основание', type: 'float' },
      { id: 'exp', name: 'Степень', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-mix',
    name: 'Смешивание',
    category: 'math',
    description: 'Lerp между A и B',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
      { id: 'fac', name: 'Фактор', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-clamp',
    name: 'Ограничение',
    category: 'math',
    description: 'Ограничить между min и max',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [
      { id: 'min', name: 'Min', type: 'float', value: 0, min: 0, max: 1 },
      { id: 'max', name: 'Max', type: 'float', value: 1, min: 0, max: 1 },
    ],
  },
  {
    type: 'math-abs',
    name: 'Модуль',
    category: 'math',
    description: '|A|',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-step',
    name: 'Step',
    category: 'math',
    description: '0 если < edge, иначе 1',
    inputs: [
      { id: 'value', name: 'Значение', type: 'float' },
      { id: 'edge', name: 'Граница', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-smoothstep',
    name: 'Smoothstep',
    category: 'math',
    description: 'Плавный переход',
    inputs: [
      { id: 'value', name: 'Значение', type: 'float' },
      { id: 'edge0', name: 'Край 0', type: 'float' },
      { id: 'edge1', name: 'Край 1', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-sine',
    name: 'Синус',
    category: 'math',
    description: 'sin(A)',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-cosine',
    name: 'Косинус',
    category: 'math',
    description: 'cos(A)',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-fract',
    name: 'Дробная часть',
    category: 'math',
    description: 'fract(A)',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-mod',
    name: 'Остаток',
    category: 'math',
    description: 'A mod B',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-min',
    name: 'Минимум',
    category: 'math',
    description: 'min(A, B)',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-max',
    name: 'Максимум',
    category: 'math',
    description: 'max(A, B)',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [],
  },
  {
    type: 'math-distance',
    name: 'Расстояние',
    category: 'math',
    description: 'Расстояние от центра',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [
      { id: 'centerX', name: 'Центр X', type: 'float', value: 0.5, min: 0, max: 1 },
      { id: 'centerY', name: 'Центр Y', type: 'float', value: 0.5, min: 0, max: 1 },
    ],
  },

  // Color Nodes
  {
    type: 'color-mix',
    name: 'Смешать цвета',
    category: 'color',
    description: 'Смешать два цвета',
    inputs: [
      { id: 'a', name: 'Цвет A', type: 'color' },
      { id: 'b', name: 'Цвет B', type: 'color' },
      { id: 'fac', name: 'Фактор', type: 'float' },
    ],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [],
  },
  {
    type: 'color-gradient',
    name: 'Градиент',
    category: 'color',
    description: 'Градиент по значению',
    inputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [
      { id: 'color1', name: 'Цвет 1', type: 'color', value: '#000000' },
      { id: 'color2', name: 'Цвет 2', type: 'color', value: '#ffffff' },
    ],
  },
  {
    type: 'color-ramp',
    name: 'Цветовая рампа',
    category: 'color',
    description: '3-цветный градиент',
    inputs: [{ id: 'fac', name: 'Фактор', type: 'float' }],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [
      { id: 'color1', name: 'Цвет 1', type: 'color', value: '#1a1a2e' },
      { id: 'color2', name: 'Цвет 2', type: 'color', value: '#ff6b35' },
      { id: 'color3', name: 'Цвет 3', type: 'color', value: '#ffffff' },
      { id: 'pos2', name: 'Позиция 2', type: 'float', value: 0.5, min: 0, max: 1 },
    ],
  },
  {
    type: 'color-hsv',
    name: 'HSV в RGB',
    category: 'color',
    description: 'Преобразование из HSV',
    inputs: [
      { id: 'h', name: 'H', type: 'float' },
      { id: 's', name: 'S', type: 'float' },
      { id: 'v', name: 'V', type: 'float' },
    ],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [],
  },
  {
    type: 'color-brightness',
    name: 'Яркость/Контраст',
    category: 'color',
    description: 'Настройка яркости',
    inputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [
      { id: 'brightness', name: 'Яркость', type: 'float', value: 0, min: -1, max: 1 },
      { id: 'contrast', name: 'Контраст', type: 'float', value: 0, min: -1, max: 1 },
    ],
  },
  {
    type: 'color-invert',
    name: 'Инверсия цвета',
    category: 'color',
    description: 'Инвертировать цвет',
    inputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [{ id: 'fac', name: 'Сила', type: 'float', value: 1, min: 0, max: 1 }],
  },
  {
    type: 'color-separate',
    name: 'Разделить RGB',
    category: 'color',
    description: 'Разделить на каналы',
    inputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    outputs: [
      { id: 'r', name: 'R', type: 'float' },
      { id: 'g', name: 'G', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    parameters: [],
  },
  {
    type: 'color-combine',
    name: 'Объединить RGB',
    category: 'color',
    description: 'Собрать из каналов',
    inputs: [
      { id: 'r', name: 'R', type: 'float' },
      { id: 'g', name: 'G', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [],
  },

  // Transform Nodes
  {
    type: 'transform-scale',
    name: 'Масштаб UV',
    category: 'transform',
    description: 'Масштабировать координаты',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [
      { id: 'scaleX', name: 'X', type: 'float', value: 1, min: 0.1, max: 10 },
      { id: 'scaleY', name: 'Y', type: 'float', value: 1, min: 0.1, max: 10 },
    ],
  },
  {
    type: 'transform-rotate',
    name: 'Поворот UV',
    category: 'transform',
    description: 'Повернуть координаты',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [{ id: 'angle', name: 'Угол', type: 'float', value: 0, min: 0, max: 360 }],
  },
  {
    type: 'transform-translate',
    name: 'Смещение UV',
    category: 'transform',
    description: 'Сместить координаты',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [
      { id: 'offsetX', name: 'X', type: 'float', value: 0, min: -1, max: 1 },
      { id: 'offsetY', name: 'Y', type: 'float', value: 0, min: -1, max: 1 },
    ],
  },
  {
    type: 'transform-tile',
    name: 'Тайлинг',
    category: 'transform',
    description: 'Повторить координаты',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [
      { id: 'tilesX', name: 'Тайлы X', type: 'int', value: 2, min: 1, max: 10 },
      { id: 'tilesY', name: 'Тайлы Y', type: 'int', value: 2, min: 1, max: 10 },
    ],
  },
  {
    type: 'transform-mirror',
    name: 'Зеркало',
    category: 'transform',
    description: 'Зеркалить координаты',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [
      { id: 'mirrorX', name: 'Зеркало X', type: 'int', value: 0, min: 0, max: 1 },
      { id: 'mirrorY', name: 'Зеркало Y', type: 'int', value: 0, min: 0, max: 1 },
    ],
  },
  {
    type: 'transform-distort',
    name: 'Искажение',
    category: 'transform',
    description: 'Искажение шумом',
    inputs: [
      { id: 'uv', name: 'UV', type: 'vector2' },
      { id: 'amount', name: 'Сила', type: 'float' },
    ],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.1, max: 20 },
      { id: 'strength', name: 'Сила', type: 'float', value: 0.1, min: 0, max: 0.5 },
    ],
  },

  // Mask Nodes
  {
    type: 'mask-threshold',
    name: 'Порог',
    category: 'mask',
    description: 'Бинарная маска по порогу',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'mask', name: 'Маска', type: 'float' }],
    parameters: [{ id: 'threshold', name: 'Порог', type: 'float', value: 0.5, min: 0, max: 1 }],
  },
  {
    type: 'mask-invert',
    name: 'Инверсия',
    category: 'mask',
    description: 'Инвертировать маску',
    inputs: [{ id: 'mask', name: 'Маска', type: 'float' }],
    outputs: [{ id: 'mask', name: 'Маска', type: 'float' }],
    parameters: [],
  },
  {
    type: 'mask-blend',
    name: 'Смешать маски',
    category: 'mask',
    description: 'Blend mode',
    inputs: [
      { id: 'a', name: 'A', type: 'float' },
      { id: 'b', name: 'B', type: 'float' },
    ],
    outputs: [{ id: 'mask', name: 'Маска', type: 'float' }],
    parameters: [{ id: 'mode', name: 'Режим', type: 'int', value: 0, min: 0, max: 5 }],
  },
  {
    type: 'mask-edge',
    name: 'Края',
    category: 'mask',
    description: 'Выделить края',
    inputs: [{ id: 'mask', name: 'Маска', type: 'float' }],
    outputs: [{ id: 'mask', name: 'Маска', type: 'float' }],
    parameters: [{ id: 'width', name: 'Ширина', type: 'float', value: 0.1, min: 0.01, max: 0.5 }],
  },

  // Output Nodes
  {
    type: 'output-pattern',
    name: 'Выход паттерна',
    category: 'output',
    description: 'Финальный паттерн',
    inputs: [
      { id: 'color', name: 'Цвет', type: 'color' },
      { id: 'mask', name: 'Маска', type: 'float' },
    ],
    outputs: [],
    parameters: [],
  },
];

const NODE_CATEGORIES: { id: NodeCategory; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'input', name: 'Входы', icon: <Circle className="w-4 h-4" />, color: 'blue' },
  { id: 'noise', name: 'Шум', icon: <Waves className="w-4 h-4" />, color: 'green' },
  { id: 'pattern', name: 'Паттерны', icon: <Grid3X3 className="w-4 h-4" />, color: 'purple' },
  { id: 'math', name: 'Математика', icon: <Layers className="w-4 h-4" />, color: 'yellow' },
  { id: 'color', name: 'Цвет', icon: <Palette className="w-4 h-4" />, color: 'pink' },
  { id: 'transform', name: 'Трансформ', icon: <Move className="w-4 h-4" />, color: 'cyan' },
  { id: 'mask', name: 'Маски', icon: <Box className="w-4 h-4" />, color: 'red' },
  { id: 'output', name: 'Выходы', icon: <Sparkles className="w-4 h-4" />, color: 'white' },
];

// ==================== INTERFACES ====================

interface PatternNodeEditorProps {
  onClose: () => void;
  onPatternGenerated: (settings: Partial<PatternSettings>) => void;
}

interface EditorNode {
  id: string;
  definition: NodeDefinition;
  position: { x: number; y: number };
  parameterValues: Record<string, number | string>;
}

interface EditorConnection {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
}

// ==================== MAIN COMPONENT ====================

export function PatternNodeEditor({ onClose, onPatternGenerated }: PatternNodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [connections, setConnections] = useState<EditorConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ node: string; port: string; type: 'input' | 'output' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodePickerPosition, setNodePickerPosition] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [expandedCategory, setExpandedCategory] = useState<NodeCategory | null>('noise');
  const [previewCanvas, setPreviewCanvas] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Initialize with default nodes
  useEffect(() => {
    if (nodes.length === 0) {
      const uvNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'uv-input')!,
        position: { x: 100, y: 150 },
        parameterValues: {},
      };

      const noiseNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'noise-perlin')!,
        position: { x: 350, y: 150 },
        parameterValues: { scale: 10, octaves: 4, persistence: 0.5, seed: 12345 },
      };

      const gradientNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'color-gradient')!,
        position: { x: 600, y: 150 },
        parameterValues: { color1: '#1a1a2e', color2: '#ff6b35' },
      };

      const outputNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'output-pattern')!,
        position: { x: 850, y: 150 },
        parameterValues: {},
      };

      setNodes([uvNode, noiseNode, gradientNode, outputNode]);

      // Create initial connections
      setConnections([
        {
          id: generateId(),
          fromNode: uvNode.id,
          fromPort: 'uv',
          toNode: noiseNode.id,
          toPort: 'uv',
        },
        {
          id: generateId(),
          fromNode: noiseNode.id,
          fromPort: 'value',
          toNode: gradientNode.id,
          toPort: 'fac',
        },
        {
          id: generateId(),
          fromNode: gradientNode.id,
          fromPort: 'color',
          toNode: outputNode.id,
          toPort: 'color',
        },
      ]);
    }
  }, []);

  // Track mouse position for connection preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [pan, zoom]);

  // Cancel connection on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
        setShowNodePicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addNode = useCallback((definition: NodeDefinition) => {
    const newNode: EditorNode = {
      id: generateId(),
      definition,
      position: {
        x: (nodePickerPosition.x - pan.x) / zoom,
        y: (nodePickerPosition.y - pan.y) / zoom,
      },
      parameterValues: definition.parameters.reduce((acc, p) => {
        acc[p.id] = p.value;
        return acc;
      }, {} as Record<string, number | string>),
    };
    setNodes((prev) => [...prev, newNode]);
    setShowNodePicker(false);
    setSelectedNode(newNode.id);
  }, [nodePickerPosition, pan, zoom]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId));
    setSelectedNode(null);
  }, []);

  const handleNodeDrag = useCallback((nodeId: string, dx: number, dy: number) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, position: { x: n.position.x + dx / zoom, y: n.position.y + dy / zoom } }
          : n
      )
    );
  }, [zoom]);

  const updateParameter = useCallback((nodeId: string, paramId: string, value: number | string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, parameterValues: { ...n.parameterValues, [paramId]: value } }
          : n
      )
    );
  }, []);

  // Handle port click for connections
  const handlePortClick = useCallback((nodeId: string, portId: string, isOutput: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    if (connectingFrom) {
      // Trying to complete a connection
      if (connectingFrom.node === nodeId) {
        // Can't connect to same node
        setConnectingFrom(null);
        return;
      }

      if (connectingFrom.type === (isOutput ? 'output' : 'input')) {
        // Can't connect output to output or input to input
        setConnectingFrom(null);
        return;
      }

      // Create new connection
      const newConnection: EditorConnection = {
        id: generateId(),
        fromNode: isOutput ? nodeId : connectingFrom.node,
        fromPort: isOutput ? portId : connectingFrom.port,
        toNode: isOutput ? connectingFrom.node : nodeId,
        toPort: isOutput ? connectingFrom.port : portId,
      };

      // Remove existing connection to this input (inputs can only have one connection)
      setConnections((prev) => [
        ...prev.filter((c) => !(c.toNode === newConnection.toNode && c.toPort === newConnection.toPort)),
        newConnection,
      ]);

      setConnectingFrom(null);
    } else {
      // Start a new connection
      setConnectingFrom({ node: nodeId, port: portId, type: isOutput ? 'output' : 'input' });
    }
  }, [connectingFrom]);

  const deleteConnection = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, []);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setNodePickerPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowNodePicker(true);
    }
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0) {
      setConnectingFrom(null);
      setShowNodePicker(false);
    }
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.25, Math.min(2, prev * delta)));
  }, []);

  // Compile and preview the node graph
  const compileGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // ==================== NOISE UTILITIES ====================

    // Simple seeded random
    const createRandom = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
    };

    // Generate permutation table for noise
    const createPermTable = (seed: number) => {
      const random = createRandom(seed);
      const perm: number[] = [];
      for (let i = 0; i < 256; i++) perm[i] = i;
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
      }
      for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
      return perm;
    };

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const grad = (hash: number, x: number, y: number) => {
      const h = hash & 3;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    const perlin = (perm: number[], x: number, y: number) => {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      const u = fade(x);
      const v = fade(y);
      const A = perm[X] + Y;
      const B = perm[X + 1] + Y;
      return lerp(
        lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
        lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
        v
      );
    };

    // Voronoi distance
    const voronoi = (seed: number, x: number, y: number, randomness: number) => {
      const random = createRandom(seed);
      const cellX = Math.floor(x);
      const cellY = Math.floor(y);
      let minDist = 1e10;
      let cellValue = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = cellX + dx;
          const cy = cellY + dy;
          const hashSeed = (cx * 374761393 + cy * 668265263) ^ seed;
          const cellRandom = createRandom(hashSeed);
          const px = cx + lerp(0.5, cellRandom(), randomness);
          const py = cy + lerp(0.5, cellRandom(), randomness);
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (dist < minDist) {
            minDist = dist;
            cellValue = cellRandom();
          }
        }
      }
      return { distance: Math.min(1, minDist), cell: cellValue };
    };

    // ==================== COLOR UTILITIES ====================

    const parseColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return { r, g, b };
    };

    // ==================== NODE VALUE TYPES ====================

    type NodeValue = {
      float?: number;
      vector2?: { x: number; y: number };
      color?: { r: number; g: number; b: number };
    };

    // ==================== TOPOLOGICAL SORT ====================

    const sortNodes = () => {
      const nodeIds = new Set(nodes.map(n => n.id));
      const inDegree = new Map<string, number>();
      const adjacency = new Map<string, string[]>();

      // Initialize
      nodes.forEach(n => {
        inDegree.set(n.id, 0);
        adjacency.set(n.id, []);
      });

      // Build graph
      connections.forEach(c => {
        if (nodeIds.has(c.fromNode) && nodeIds.has(c.toNode)) {
          adjacency.get(c.fromNode)?.push(c.toNode);
          inDegree.set(c.toNode, (inDegree.get(c.toNode) || 0) + 1);
        }
      });

      // Kahn's algorithm
      const queue = nodes.filter(n => inDegree.get(n.id) === 0);
      const sorted: EditorNode[] = [];

      while (queue.length > 0) {
        const node = queue.shift()!;
        sorted.push(node);
        adjacency.get(node.id)?.forEach(neighborId => {
          const deg = (inDegree.get(neighborId) || 0) - 1;
          inDegree.set(neighborId, deg);
          if (deg === 0) {
            const neighbor = nodes.find(n => n.id === neighborId);
            if (neighbor) queue.push(neighbor);
          }
        });
      }

      return sorted;
    };

    // ==================== EVALUATE NODE ====================

    const evaluateNode = (
      node: EditorNode,
      x: number,
      y: number,
      nodeOutputs: Map<string, Map<string, NodeValue>>,
      permTable: number[]
    ): Map<string, NodeValue> => {
      const outputs = new Map<string, NodeValue>();
      const params = node.parameterValues;

      // Get input value from connected node
      const getInput = (inputId: string): NodeValue => {
        const conn = connections.find(c => c.toNode === node.id && c.toPort === inputId);
        if (conn) {
          const sourceOutputs = nodeOutputs.get(conn.fromNode);
          if (sourceOutputs) {
            return sourceOutputs.get(conn.fromPort) || {};
          }
        }
        return {};
      };

      switch (node.definition.type) {
        // ===== INPUT NODES =====
        case 'uv-input': {
          outputs.set('uv', { vector2: { x, y } });
          outputs.set('x', { float: x });
          outputs.set('y', { float: y });
          break;
        }
        case 'value-input': {
          outputs.set('value', { float: Number(params.value) || 0.5 });
          break;
        }
        case 'color-input': {
          outputs.set('color', { color: parseColor(String(params.color) || '#ff6600') });
          break;
        }

        // ===== NOISE NODES =====
        case 'noise-perlin': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 10;
          const octaves = Number(params.octaves) || 4;
          const persistence = Number(params.persistence) || 0.5;

          let noiseVal = 0;
          let amplitude = 1;
          let frequency = 1;
          let maxValue = 0;

          for (let o = 0; o < octaves; o++) {
            noiseVal += perlin(permTable, uv.x * scale * frequency, uv.y * scale * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
          }

          const value = (noiseVal / maxValue + 1) / 2;
          outputs.set('value', { float: value });
          outputs.set('color', { color: { r: value, g: value, b: value } });
          break;
        }
        case 'noise-voronoi': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;
          const randomness = Number(params.randomness) || 1;
          const seed = Number(params.seed) || 0;

          const result = voronoi(seed, uv.x * scale, uv.y * scale, randomness);
          outputs.set('distance', { float: result.distance });
          outputs.set('cell', { float: result.cell });
          break;
        }
        case 'noise-fbm': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;
          const octaves = Number(params.octaves) || 6;
          const lacunarity = Number(params.lacunarity) || 2;

          let noiseVal = 0;
          let amplitude = 1;
          let frequency = 1;
          let maxValue = 0;

          for (let o = 0; o < octaves; o++) {
            noiseVal += perlin(permTable, uv.x * scale * frequency, uv.y * scale * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= lacunarity;
          }

          outputs.set('value', { float: (noiseVal / maxValue + 1) / 2 });
          break;
        }
        case 'noise-worley': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;
          const seed = Number(params.seed) || 0;

          const cellX = Math.floor(uv.x * scale);
          const cellY = Math.floor(uv.y * scale);
          const fx = (uv.x * scale) % 1;
          const fy = (uv.y * scale) % 1;

          let f1 = 1e10, f2 = 1e10;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const cx = cellX + dx;
              const cy = cellY + dy;
              const hashSeed = (cx * 374761393 + cy * 668265263) ^ seed;
              const cellRandom = createRandom(hashSeed);
              const px = dx + cellRandom() - fx;
              const py = dy + cellRandom() - fy;
              const dist = Math.sqrt(px * px + py * py);
              if (dist < f1) { f2 = f1; f1 = dist; }
              else if (dist < f2) { f2 = dist; }
            }
          }

          outputs.set('f1', { float: Math.min(1, f1) });
          outputs.set('f2', { float: Math.min(1, f2) });
          outputs.set('edge', { float: Math.min(1, f2 - f1) });
          break;
        }
        case 'noise-simplex': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;
          // Simplified simplex using perlin as base
          const sx = uv.x * scale;
          const sy = uv.y * scale;
          const value = (perlin(permTable, sx, sy) + perlin(permTable, sx * 1.5 + 100, sy * 1.5 + 100) * 0.5) / 1.5;
          outputs.set('value', { float: (value + 1) / 2 });
          break;
        }
        case 'time-input': {
          // Static for now (would need animation frame for real time)
          outputs.set('time', { float: 0.5 });
          break;
        }

        // ===== PATTERN NODES =====
        case 'pattern-checker': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 8;
          const cx = Math.floor(uv.x * scale);
          const cy = Math.floor(uv.y * scale);
          outputs.set('fac', { float: (cx + cy) % 2 === 0 ? 1 : 0 });
          break;
        }
        case 'pattern-stripes': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 10;
          const angle = (Number(params.angle) || 0) * Math.PI / 180;
          const rotatedX = uv.x * Math.cos(angle) - uv.y * Math.sin(angle);
          outputs.set('fac', { float: (Math.sin(rotatedX * scale * Math.PI * 2) + 1) / 2 });
          break;
        }
        case 'pattern-dots': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 10;
          const radius = Number(params.radius) || 0.3;
          const px = (uv.x * scale) % 1;
          const py = (uv.y * scale) % 1;
          const dist = Math.sqrt((px - 0.5) ** 2 + (py - 0.5) ** 2);
          outputs.set('fac', { float: dist < radius ? 1 : 0 });
          break;
        }
        case 'pattern-hexagon': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;
          const sx = uv.x * scale;
          const sy = uv.y * scale * 0.866;
          const row = Math.floor(sy);
          const offsetX = row % 2 === 0 ? 0 : 0.5;
          const col = Math.floor(sx + offsetX);
          const cellRandom = createRandom(row * 1000 + col);
          outputs.set('fac', { float: (Math.sin(sx * 3) + Math.cos(sy * 3) + 2) / 4 });
          outputs.set('cell', { float: cellRandom() });
          break;
        }
        case 'pattern-wave': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;
          const distortion = Number(params.distortion) || 0;
          let wave = Math.sin(uv.x * scale * Math.PI * 2);
          if (distortion > 0) {
            wave += Math.sin(uv.y * scale * distortion) * 0.5;
          }
          outputs.set('fac', { float: (wave + 1) / 2 });
          break;
        }
        case 'pattern-brick': {
          const uv = getInput('uv').vector2 || { x, y };
          const scaleX = Number(params.scaleX) || 4;
          const scaleY = Number(params.scaleY) || 8;
          const offset = Number(params.offset) || 0.5;
          const mortarSize = Number(params.mortarSize) || 0.05;

          const row = Math.floor(uv.y * scaleY);
          const brickX = (uv.x + (row % 2) * offset) * scaleX;
          const brickY = uv.y * scaleY;
          const fx = brickX % 1;
          const fy = brickY % 1;

          const isMortar = fx < mortarSize || fx > 1 - mortarSize || fy < mortarSize || fy > 1 - mortarSize;
          outputs.set('fac', { float: isMortar ? 0 : 1 });
          outputs.set('mortar', { float: isMortar ? 1 : 0 });
          break;
        }
        case 'pattern-rings': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 10;
          const centerX = Number(params.centerX) || 0.5;
          const centerY = Number(params.centerY) || 0.5;

          const dx = uv.x - centerX;
          const dy = uv.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          outputs.set('fac', { float: (Math.sin(dist * scale * Math.PI * 2) + 1) / 2 });
          break;
        }
        case 'pattern-spiral': {
          const uv = getInput('uv').vector2 || { x, y };
          const arms = Number(params.arms) || 4;
          const twist = Number(params.twist) || 2;

          const dx = uv.x - 0.5;
          const dy = uv.y - 0.5;
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const spiral = (angle / Math.PI / 2 + dist * twist) * arms;
          outputs.set('fac', { float: (Math.sin(spiral * Math.PI * 2) + 1) / 2 });
          break;
        }
        case 'pattern-grid': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 10;
          const thickness = Number(params.thickness) || 0.1;

          const fx = (uv.x * scale) % 1;
          const fy = (uv.y * scale) % 1;
          const isLine = fx < thickness || fy < thickness;
          outputs.set('fac', { float: isLine ? 1 : 0 });
          break;
        }
        case 'pattern-triangle': {
          const uv = getInput('uv').vector2 || { x, y };
          const scale = Number(params.scale) || 5;

          const sx = uv.x * scale;
          const sy = uv.y * scale * 0.866;
          const row = Math.floor(sy);
          const col = Math.floor(sx + (row % 2) * 0.5);
          const fx = (sx + (row % 2) * 0.5) % 1;
          const fy = sy % 1;

          const inTriangle = row % 2 === 0 ? (fx + fy < 1) : (fx > fy);
          const cellRandom = createRandom(row * 1000 + col);
          outputs.set('fac', { float: inTriangle ? 1 : 0 });
          outputs.set('cell', { float: cellRandom() });
          break;
        }

        // ===== MATH NODES =====
        case 'math-add': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 0;
          outputs.set('result', { float: a + b });
          break;
        }
        case 'math-multiply': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 1;
          outputs.set('result', { float: a * b });
          break;
        }
        case 'math-mix': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 1;
          const fac = getInput('fac').float ?? 0.5;
          outputs.set('result', { float: lerp(a, b, fac) });
          break;
        }
        case 'math-clamp': {
          const value = getInput('value').float ?? 0.5;
          const min = Number(params.min) ?? 0;
          const max = Number(params.max) ?? 1;
          outputs.set('result', { float: Math.max(min, Math.min(max, value)) });
          break;
        }
        case 'math-subtract': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 0;
          outputs.set('result', { float: a - b });
          break;
        }
        case 'math-divide': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 1;
          outputs.set('result', { float: b !== 0 ? a / b : 0 });
          break;
        }
        case 'math-power': {
          const base = getInput('base').float ?? 0;
          const exp = getInput('exp').float ?? 1;
          outputs.set('result', { float: Math.pow(Math.abs(base), exp) });
          break;
        }
        case 'math-abs': {
          const value = getInput('value').float ?? 0;
          outputs.set('result', { float: Math.abs(value) });
          break;
        }
        case 'math-step': {
          const value = getInput('value').float ?? 0;
          const edge = getInput('edge').float ?? 0.5;
          outputs.set('result', { float: value < edge ? 0 : 1 });
          break;
        }
        case 'math-smoothstep': {
          const value = getInput('value').float ?? 0;
          const edge0 = getInput('edge0').float ?? 0;
          const edge1 = getInput('edge1').float ?? 1;
          const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
          outputs.set('result', { float: t * t * (3 - 2 * t) });
          break;
        }
        case 'math-sine': {
          const value = getInput('value').float ?? 0;
          outputs.set('result', { float: (Math.sin(value * Math.PI * 2) + 1) / 2 });
          break;
        }
        case 'math-cosine': {
          const value = getInput('value').float ?? 0;
          outputs.set('result', { float: (Math.cos(value * Math.PI * 2) + 1) / 2 });
          break;
        }
        case 'math-fract': {
          const value = getInput('value').float ?? 0;
          outputs.set('result', { float: value - Math.floor(value) });
          break;
        }
        case 'math-mod': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 1;
          outputs.set('result', { float: b !== 0 ? ((a % b) + b) % b : 0 });
          break;
        }
        case 'math-min': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 0;
          outputs.set('result', { float: Math.min(a, b) });
          break;
        }
        case 'math-max': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 0;
          outputs.set('result', { float: Math.max(a, b) });
          break;
        }
        case 'math-distance': {
          const uv = getInput('uv').vector2 || { x, y };
          const centerX = Number(params.centerX) || 0.5;
          const centerY = Number(params.centerY) || 0.5;
          const dx = uv.x - centerX;
          const dy = uv.y - centerY;
          outputs.set('result', { float: Math.sqrt(dx * dx + dy * dy) * Math.SQRT2 });
          break;
        }

        // ===== COLOR NODES =====
        case 'color-mix': {
          const a = getInput('a').color || { r: 0, g: 0, b: 0 };
          const b = getInput('b').color || { r: 1, g: 1, b: 1 };
          const fac = getInput('fac').float ?? 0.5;
          outputs.set('color', {
            color: {
              r: lerp(a.r, b.r, fac),
              g: lerp(a.g, b.g, fac),
              b: lerp(a.b, b.b, fac),
            },
          });
          break;
        }
        case 'color-gradient': {
          const fac = getInput('fac').float ?? 0.5;
          const c1 = parseColor(String(params.color1) || '#000000');
          const c2 = parseColor(String(params.color2) || '#ffffff');
          outputs.set('color', {
            color: {
              r: lerp(c1.r, c2.r, fac),
              g: lerp(c1.g, c2.g, fac),
              b: lerp(c1.b, c2.b, fac),
            },
          });
          break;
        }
        case 'color-ramp': {
          const fac = getInput('fac').float ?? 0.5;
          const c1 = parseColor(String(params.color1) || '#1a1a2e');
          const c2 = parseColor(String(params.color2) || '#ff6b35');
          const c3 = parseColor(String(params.color3) || '#ffffff');
          const pos2 = Number(params.pos2) || 0.5;

          let color;
          if (fac < pos2) {
            const t = fac / pos2;
            color = { r: lerp(c1.r, c2.r, t), g: lerp(c1.g, c2.g, t), b: lerp(c1.b, c2.b, t) };
          } else {
            const t = (fac - pos2) / (1 - pos2);
            color = { r: lerp(c2.r, c3.r, t), g: lerp(c2.g, c3.g, t), b: lerp(c2.b, c3.b, t) };
          }
          outputs.set('color', { color });
          break;
        }
        case 'color-hsv': {
          const h = getInput('h').float ?? 0;
          const s = getInput('s').float ?? 1;
          const v = getInput('v').float ?? 1;

          // HSV to RGB conversion
          const i = Math.floor(h * 6);
          const f = h * 6 - i;
          const p = v * (1 - s);
          const q = v * (1 - f * s);
          const t = v * (1 - (1 - f) * s);

          let r, g, b;
          switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
            default: r = g = b = 0;
          }
          outputs.set('color', { color: { r, g, b } });
          break;
        }
        case 'color-brightness': {
          const color = getInput('color').color || { r: 0.5, g: 0.5, b: 0.5 };
          const brightness = Number(params.brightness) || 0;
          const contrast = Number(params.contrast) || 0;

          const adjustContrast = (c: number) => (c - 0.5) * (1 + contrast) + 0.5;
          outputs.set('color', {
            color: {
              r: Math.max(0, Math.min(1, adjustContrast(color.r) + brightness)),
              g: Math.max(0, Math.min(1, adjustContrast(color.g) + brightness)),
              b: Math.max(0, Math.min(1, adjustContrast(color.b) + brightness)),
            },
          });
          break;
        }
        case 'color-invert': {
          const color = getInput('color').color || { r: 0.5, g: 0.5, b: 0.5 };
          const fac = Number(params.fac) || 1;
          outputs.set('color', {
            color: {
              r: lerp(color.r, 1 - color.r, fac),
              g: lerp(color.g, 1 - color.g, fac),
              b: lerp(color.b, 1 - color.b, fac),
            },
          });
          break;
        }
        case 'color-separate': {
          const color = getInput('color').color || { r: 0, g: 0, b: 0 };
          outputs.set('r', { float: color.r });
          outputs.set('g', { float: color.g });
          outputs.set('b', { float: color.b });
          break;
        }
        case 'color-combine': {
          const r = getInput('r').float ?? 0;
          const g = getInput('g').float ?? 0;
          const b = getInput('b').float ?? 0;
          outputs.set('color', { color: { r, g, b } });
          break;
        }

        // ===== TRANSFORM NODES =====
        case 'transform-scale': {
          const uv = getInput('uv').vector2 || { x, y };
          const scaleX = Number(params.scaleX) || 1;
          const scaleY = Number(params.scaleY) || 1;
          outputs.set('uv', { vector2: { x: uv.x * scaleX, y: uv.y * scaleY } });
          break;
        }
        case 'transform-rotate': {
          const uv = getInput('uv').vector2 || { x, y };
          const angle = (Number(params.angle) || 0) * Math.PI / 180;
          const cx = 0.5, cy = 0.5;
          const dx = uv.x - cx, dy = uv.y - cy;
          outputs.set('uv', {
            vector2: {
              x: dx * Math.cos(angle) - dy * Math.sin(angle) + cx,
              y: dx * Math.sin(angle) + dy * Math.cos(angle) + cy,
            },
          });
          break;
        }
        case 'transform-translate': {
          const uv = getInput('uv').vector2 || { x, y };
          const offsetX = Number(params.offsetX) || 0;
          const offsetY = Number(params.offsetY) || 0;
          outputs.set('uv', { vector2: { x: uv.x + offsetX, y: uv.y + offsetY } });
          break;
        }
        case 'transform-tile': {
          const uv = getInput('uv').vector2 || { x, y };
          const tilesX = Number(params.tilesX) || 2;
          const tilesY = Number(params.tilesY) || 2;
          outputs.set('uv', {
            vector2: {
              x: ((uv.x * tilesX) % 1 + 1) % 1,
              y: ((uv.y * tilesY) % 1 + 1) % 1,
            },
          });
          break;
        }
        case 'transform-mirror': {
          const uv = getInput('uv').vector2 || { x, y };
          const mirrorX = Number(params.mirrorX) || 0;
          const mirrorY = Number(params.mirrorY) || 0;

          let mx = uv.x;
          let my = uv.y;
          if (mirrorX && uv.x > 0.5) mx = 1 - uv.x;
          if (mirrorY && uv.y > 0.5) my = 1 - uv.y;
          outputs.set('uv', { vector2: { x: mx, y: my } });
          break;
        }
        case 'transform-distort': {
          const uv = getInput('uv').vector2 || { x, y };
          const amount = getInput('amount').float ?? (Number(params.strength) || 0.1);
          const scale = Number(params.scale) || 5;

          const noiseX = perlin(permTable, uv.x * scale, uv.y * scale);
          const noiseY = perlin(permTable, uv.x * scale + 100, uv.y * scale + 100);
          outputs.set('uv', {
            vector2: {
              x: uv.x + noiseX * amount,
              y: uv.y + noiseY * amount,
            },
          });
          break;
        }

        // ===== MASK NODES =====
        case 'mask-threshold': {
          const value = getInput('value').float ?? 0.5;
          const threshold = Number(params.threshold) || 0.5;
          outputs.set('mask', { float: value > threshold ? 1 : 0 });
          break;
        }
        case 'mask-invert': {
          const mask = getInput('mask').float ?? 0;
          outputs.set('mask', { float: 1 - mask });
          break;
        }
        case 'mask-blend': {
          const a = getInput('a').float ?? 0;
          const b = getInput('b').float ?? 0;
          const mode = Number(params.mode) || 0;

          let result;
          switch (mode) {
            case 0: result = a + b; break; // Add
            case 1: result = a * b; break; // Multiply
            case 2: result = Math.max(a, b); break; // Max (Lighten)
            case 3: result = Math.min(a, b); break; // Min (Darken)
            case 4: result = 1 - (1 - a) * (1 - b); break; // Screen
            case 5: result = a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b); break; // Overlay
            default: result = a + b;
          }
          outputs.set('mask', { float: Math.max(0, Math.min(1, result)) });
          break;
        }
        case 'mask-edge': {
          // Edge detection approximation using gradient
          const mask = getInput('mask').float ?? 0;
          const width = Number(params.width) || 0.1;
          // This is a simplified edge - true edge would need neighboring pixel access
          const edge = Math.abs(mask - 0.5) < width ? 1 : 0;
          outputs.set('mask', { float: edge });
          break;
        }

        // ===== OUTPUT NODES =====
        case 'output-pattern': {
          const color = getInput('color').color || { r: 0.5, g: 0.5, b: 0.5 };
          const mask = getInput('mask').float ?? 1;
          outputs.set('final', {
            color: {
              r: color.r * mask,
              g: color.g * mask,
              b: color.b * mask,
            },
          });
          break;
        }
      }

      return outputs;
    };

    // ==================== RENDER ====================

    // Find output node
    const outputNode = nodes.find(n => n.definition.type === 'output-pattern');
    if (!outputNode) return;

    // Create perm table
    const noiseSeed = nodes.find(n => n.definition.type.startsWith('noise-'))?.parameterValues.seed as number || 12345;
    const permTable = createPermTable(noiseSeed);

    // Sort nodes topologically
    const sortedNodes = sortNodes();

    // Render
    const imageData = ctx.createImageData(size, size);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = px / size;
        const y = py / size;

        // Evaluate all nodes
        const nodeOutputs = new Map<string, Map<string, NodeValue>>();

        for (const node of sortedNodes) {
          const outputs = evaluateNode(node, x, y, nodeOutputs, permTable);
          nodeOutputs.set(node.id, outputs);
        }

        // Get final color from output node
        const outputValues = nodeOutputs.get(outputNode.id);
        const finalColor = outputValues?.get('final')?.color || { r: 0.5, g: 0.5, b: 0.5 };

        const idx = (py * size + px) * 4;
        imageData.data[idx] = Math.floor(Math.max(0, Math.min(1, finalColor.r)) * 255);
        imageData.data[idx + 1] = Math.floor(Math.max(0, Math.min(1, finalColor.g)) * 255);
        imageData.data[idx + 2] = Math.floor(Math.max(0, Math.min(1, finalColor.b)) * 255);
        imageData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setPreviewCanvas(canvas.toDataURL());
  }, [nodes, connections]);

  // Auto-compile on changes
  useEffect(() => {
    const timeout = setTimeout(compileGraph, 100);
    return () => clearTimeout(timeout);
  }, [nodes, connections, compileGraph]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return NODE_DEFINITIONS;
    const query = searchQuery.toLowerCase();
    return NODE_DEFINITIONS.filter(
      (n) => n.name.toLowerCase().includes(query) || n.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const getCategoryColor = (category: NodeCategory) => {
    const colors: Record<string, string> = {
      blue: 'border-blue-500 bg-blue-500/10',
      green: 'border-green-500 bg-green-500/10',
      purple: 'border-purple-500 bg-purple-500/10',
      yellow: 'border-yellow-500 bg-yellow-500/10',
      pink: 'border-pink-500 bg-pink-500/10',
      cyan: 'border-cyan-500 bg-cyan-500/10',
      orange: 'border-orange-500 bg-orange-500/10',
      red: 'border-red-500 bg-red-500/10',
      white: 'border-white bg-white/10',
    };
    const cat = NODE_CATEGORIES.find((c) => c.id === category);
    return colors[cat?.color || 'blue'] || colors.blue;
  };

  const getCategoryHeaderColor = (category: NodeCategory) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      yellow: 'bg-yellow-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      white: 'bg-white',
    };
    const cat = NODE_CATEGORIES.find((c) => c.id === category);
    return colors[cat?.color || 'blue'] || colors.blue;
  };

  // Calculate port position
  const getPortPosition = (node: EditorNode, portId: string, isOutput: boolean) => {
    const nodeWidth = 176;
    const headerHeight = 28;
    const portHeight = 24;

    if (isOutput) {
      const inputsCount = node.definition.inputs.length;
      const portIndex = node.definition.outputs.findIndex((p) => p.id === portId);
      return {
        x: node.position.x + nodeWidth,
        y: node.position.y + headerHeight + (inputsCount > 0 ? inputsCount * portHeight + 4 : 0) + portIndex * portHeight + 12,
      };
    } else {
      const portIndex = node.definition.inputs.findIndex((p) => p.id === portId);
      return {
        x: node.position.x,
        y: node.position.y + headerHeight + portIndex * portHeight + 12,
      };
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Toolbar */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Node Editor</span>
          {connectingFrom && (
            <span className="text-xs text-orange-400 ml-2">
              Кликните на порт для соединения (Esc для отмены)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={compileGraph}
            className="flex items-center gap-1.5 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3" />
            Compile
          </button>

          <button
            onClick={() => {
              // Export settings based on graph
              const noiseNode = nodes.find(n => n.definition.type.startsWith('noise-'));
              onPatternGenerated({
                complexity: (noiseNode?.parameterValues.scale as number) || 50,
                seed: (noiseNode?.parameterValues.seed as number) || Math.floor(Math.random() * 10000),
              });
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs font-medium transition-colors"
          >
            <Download className="w-3 h-3" />
            Apply
          </button>

          <button
            onClick={() => setPan({ x: 0, y: 0 })}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            title="Сбросить вид"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node List */}
        <div className="w-48 border-r border-zinc-800 bg-zinc-900/50 overflow-auto shrink-0">
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          <div className="px-2 pb-2 space-y-1">
            {NODE_CATEGORIES.map((category) => {
              const categoryNodes = filteredNodes.filter((n) => n.category === category.id);
              if (categoryNodes.length === 0) return null;

              return (
                <div key={category.id}>
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                    className="w-full flex items-center justify-between p-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      {category.icon}
                      <span>{category.name}</span>
                    </div>
                    {expandedCategory === category.id ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedCategory === category.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 space-y-0.5">
                          {categoryNodes.map((node) => (
                            <button
                              key={node.type}
                              onClick={() => {
                                const rect = containerRef.current?.getBoundingClientRect();
                                if (rect) {
                                  setNodePickerPosition({ x: rect.width / 2, y: rect.height / 2 });
                                }
                                addNode(node);
                              }}
                              className="w-full text-left px-2 py-1 text-[11px] text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                              title={node.description}
                            >
                              {node.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Preview */}
          {previewCanvas && (
            <div className="p-2 border-t border-zinc-800">
              <div className="text-[10px] text-zinc-500 mb-1">Превью:</div>
              <img src={previewCanvas} alt="Preview" className="w-full rounded border border-zinc-700" />
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#1a1a1c]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default',
          }}
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          {/* Hidden canvas for preview */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Connections SVG */}
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Existing connections */}
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.fromNode);
              const toNode = nodes.find((n) => n.id === conn.toNode);
              if (!fromNode || !toNode) return null;

              const start = getPortPosition(fromNode, conn.fromPort, true);
              const end = getPortPosition(toNode, conn.toPort, false);
              const dx = Math.abs(end.x - start.x);
              const curve = Math.max(50, dx * 0.4);

              return (
                <g key={conn.id} className="pointer-events-auto">
                  {/* Glow */}
                  <path
                    d={`M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`}
                    stroke="#f9731630"
                    strokeWidth={8}
                    fill="none"
                  />
                  {/* Main line */}
                  <path
                    d={`M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`}
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="none"
                    className="cursor-pointer hover:stroke-red-500 transition-colors"
                    onClick={() => deleteConnection(conn.id)}
                  />
                  <circle cx={start.x} cy={start.y} r={4} fill="#f97316" />
                  <circle cx={end.x} cy={end.y} r={4} fill="#f97316" />
                </g>
              );
            })}

            {/* Connection being drawn */}
            {connectingFrom && (() => {
              const node = nodes.find((n) => n.id === connectingFrom.node);
              if (!node) return null;

              const start = getPortPosition(node, connectingFrom.port, connectingFrom.type === 'output');
              const end = mousePos;
              const dx = Math.abs(end.x - start.x);
              const curve = Math.max(30, dx * 0.3);

              return (
                <path
                  d={`M ${start.x} ${start.y} C ${start.x + (connectingFrom.type === 'output' ? curve : -curve)} ${start.y}, ${end.x + (connectingFrom.type === 'output' ? -curve : curve)} ${end.y}, ${end.x} ${end.y}`}
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  fill="none"
                  className="animate-pulse"
                />
              );
            })()}
          </svg>

          {/* Nodes */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {nodes.map((node) => (
              <NodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNode === node.id}
                onSelect={() => setSelectedNode(node.id)}
                onDrag={handleNodeDrag}
                onDelete={() => deleteNode(node.id)}
                onPortClick={handlePortClick}
                onParameterChange={(paramId, value) => updateParameter(node.id, paramId, value)}
                getCategoryColor={getCategoryColor}
                getCategoryHeaderColor={getCategoryHeaderColor}
                connectingFrom={connectingFrom}
                connections={connections}
              />
            ))}
          </div>

          {/* Node Picker */}
          <AnimatePresence>
            {showNodePicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50"
                style={{ left: nodePickerPosition.x, top: nodePickerPosition.y, width: 200 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск ноды..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500/50"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-auto">
                  {NODE_CATEGORIES.map((category) => {
                    const categoryNodes = filteredNodes.filter((n) => n.category === category.id);
                    if (categoryNodes.length === 0) return null;

                    return (
                      <div key={category.id}>
                        <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900/50">
                          {category.name}
                        </div>
                        {categoryNodes.map((nodeDef) => (
                          <button
                            key={nodeDef.type}
                            onClick={() => addNode(nodeDef)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 transition-colors"
                          >
                            {nodeDef.name}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions */}
          <div className="absolute bottom-3 left-3 text-[10px] text-zinc-600">
            <p>ПКМ — добавить ноду</p>
            <p>Alt + ЛКМ — перемещение</p>
            <p>Колесо — масштаб</p>
            <p>Клик на порт — соединение</p>
          </div>

          <div className="absolute bottom-3 right-3 text-[10px] text-zinc-600">{Math.round(zoom * 100)}%</div>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-56 border-l border-zinc-800 bg-zinc-900/50 overflow-auto shrink-0">
            {(() => {
              const node = nodes.find((n) => n.id === selectedNode);
              if (!node) return null;

              return (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">{node.definition.name}</h3>
                    <button
                      onClick={() => deleteNode(node.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-500 mb-3">{node.definition.description}</p>

                  {node.definition.parameters.length > 0 && (
                    <div className="space-y-3">
                      {node.definition.parameters.map((param) => (
                        <div key={param.id}>
                          <label className="text-[10px] text-zinc-400 mb-1 block">{param.name}</label>
                          {param.type === 'color' ? (
                            <input
                              type="color"
                              value={String(node.parameterValues[param.id] || param.value)}
                              onChange={(e) => updateParameter(node.id, param.id, e.target.value)}
                              className="w-full h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                            />
                          ) : param.type === 'float' || param.type === 'int' ? (
                            <div className="space-y-1">
                              <input
                                type="range"
                                min={param.min || 0}
                                max={param.max || 100}
                                step={param.type === 'int' ? 1 : 0.01}
                                value={Number(node.parameterValues[param.id] ?? param.value)}
                                onChange={(e) =>
                                  updateParameter(
                                    node.id,
                                    param.id,
                                    param.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value)
                                  )
                                }
                                className="w-full h-1.5 bg-zinc-700 rounded appearance-none cursor-pointer accent-orange-500"
                              />
                              <div className="text-right text-[10px] text-zinc-500 font-mono">
                                {param.type === 'int'
                                  ? node.parameterValues[param.id] ?? param.value
                                  : Number(node.parameterValues[param.id] ?? param.value).toFixed(2)}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== NODE COMPONENT ====================

interface NodeComponentProps {
  node: EditorNode;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (nodeId: string, dx: number, dy: number) => void;
  onDelete: () => void;
  onPortClick: (nodeId: string, portId: string, isOutput: boolean, e: React.MouseEvent) => void;
  onParameterChange: (paramId: string, value: number | string) => void;
  getCategoryColor: (category: NodeCategory) => string;
  getCategoryHeaderColor: (category: NodeCategory) => string;
  connectingFrom: { node: string; port: string; type: 'input' | 'output' } | null;
  connections: EditorConnection[];
}

function NodeComponent({
  node,
  isSelected,
  onSelect,
  onDrag,
  onDelete,
  onPortClick,
  getCategoryColor,
  getCategoryHeaderColor,
  connectingFrom,
  connections,
}: NodeComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.port-button')) return;

    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onDrag(node.id, dx, dy);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, node.id, onDrag]);

  // Check if port has connection
  const hasConnection = (portId: string, isOutput: boolean) => {
    if (isOutput) {
      return connections.some(c => c.fromNode === node.id && c.fromPort === portId);
    } else {
      return connections.some(c => c.toNode === node.id && c.toPort === portId);
    }
  };

  return (
    <div
      className={cn(
        'absolute w-44 bg-zinc-800 rounded-lg border-2 shadow-lg select-none',
        isSelected ? 'border-orange-500 shadow-orange-500/20' : getCategoryColor(node.definition.category),
        isDragging && 'cursor-grabbing'
      )}
      style={{ left: node.position.x, top: node.position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className={cn('node-header px-3 py-1.5 text-xs font-medium cursor-grab rounded-t-md', getCategoryHeaderColor(node.definition.category))}
      >
        <span className="text-black/80">{node.definition.name}</span>
      </div>

      {/* Inputs */}
      {node.definition.inputs.length > 0 && (
        <div className="py-1">
          {node.definition.inputs.map((input) => {
            const connected = hasConnection(input.id, false);
            const isConnecting = connectingFrom?.type === 'output';

            return (
              <div key={input.id} className="relative flex items-center h-6 px-3">
                <button
                  className={cn(
                    'port-button absolute -left-2 w-4 h-4 rounded-full border-2 z-10 transition-all',
                    connected ? 'bg-orange-500 border-orange-400' : 'bg-zinc-900 border-zinc-500',
                    isConnecting && 'border-orange-400 scale-125 bg-orange-500/30',
                    'hover:scale-125 hover:border-orange-500'
                  )}
                  onClick={(e) => onPortClick(node.id, input.id, false, e)}
                  title={`${input.name} (${input.type})`}
                />
                <span className="text-[10px] text-zinc-400 ml-2">{input.name}</span>
                <span className="text-[8px] text-zinc-600 ml-auto">{input.type}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Outputs */}
      {node.definition.outputs.length > 0 && (
        <div className="py-1">
          {node.definition.outputs.map((output) => {
            const connected = hasConnection(output.id, true);
            const isConnecting = connectingFrom?.type === 'input';

            return (
              <div key={output.id} className="relative flex items-center justify-end h-6 px-3">
                <span className="text-[8px] text-zinc-600 mr-auto">{output.type}</span>
                <span className="text-[10px] text-zinc-400 mr-2">{output.name}</span>
                <button
                  className={cn(
                    'port-button absolute -right-2 w-4 h-4 rounded-full border-2 z-10 transition-all',
                    connected ? 'bg-orange-500 border-orange-400' : 'bg-zinc-900 border-zinc-500',
                    isConnecting && 'border-orange-400 scale-125 bg-orange-500/30',
                    'hover:scale-125 hover:border-orange-500'
                  )}
                  onClick={(e) => onPortClick(node.id, output.id, true, e)}
                  title={`${output.name} (${output.type})`}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="h-1" />
    </div>
  );
}
