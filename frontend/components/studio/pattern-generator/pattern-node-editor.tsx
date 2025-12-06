'use client';

/**
 * Pattern Node Editor Component
 *
 * Visual node-based editor for creating procedural patterns
 * Similar to Blender's shader nodes or Substance Designer.
 *
 * @module components/studio/pattern-generator/pattern-node-editor
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
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
  Link,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatternSettings, PatternNode, NodeConnection, NodeCategory, NodePort } from '@/types/pattern-generator';

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
    type: 'noise-turbulence',
    name: 'Turbulence',
    category: 'noise',
    description: 'Турбулентный шум',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    parameters: [
      { id: 'scale', name: 'Масштаб', type: 'float', value: 5, min: 0.1, max: 50 },
      { id: 'power', name: 'Сила', type: 'float', value: 1, min: 0.1, max: 5 },
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
    type: 'math-remap',
    name: 'Ремап',
    category: 'math',
    description: 'Пересопоставить диапазон',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'result', name: 'Результат', type: 'float' }],
    parameters: [
      { id: 'fromMin', name: 'От Min', type: 'float', value: 0, min: 0, max: 1 },
      { id: 'fromMax', name: 'От Max', type: 'float', value: 1, min: 0, max: 1 },
      { id: 'toMin', name: 'К Min', type: 'float', value: 0, min: 0, max: 1 },
      { id: 'toMax', name: 'К Max', type: 'float', value: 1, min: 0, max: 1 },
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
    type: 'color-brightness',
    name: 'Яркость',
    category: 'color',
    description: 'Настройка яркости',
    inputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [{ id: 'brightness', name: 'Яркость', type: 'float', value: 0, min: -1, max: 1 }],
  },
  {
    type: 'color-contrast',
    name: 'Контраст',
    category: 'color',
    description: 'Настройка контраста',
    inputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    outputs: [{ id: 'color', name: 'Цвет', type: 'color' }],
    parameters: [{ id: 'contrast', name: 'Контраст', type: 'float', value: 1, min: 0, max: 3 }],
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
    type: 'transform-tile',
    name: 'Тайлинг',
    category: 'transform',
    description: 'Повторить координаты',
    inputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    outputs: [{ id: 'uv', name: 'UV', type: 'vector2' }],
    parameters: [
      { id: 'tilesX', name: 'X', type: 'int', value: 2, min: 1, max: 20 },
      { id: 'tilesY', name: 'Y', type: 'int', value: 2, min: 1, max: 20 },
    ],
  },

  // Filter Nodes
  {
    type: 'filter-blur',
    name: 'Размытие',
    category: 'filter',
    description: 'Размыть значения',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    parameters: [{ id: 'radius', name: 'Радиус', type: 'float', value: 1, min: 0, max: 10 }],
  },
  {
    type: 'filter-sharpen',
    name: 'Резкость',
    category: 'filter',
    description: 'Увеличить резкость',
    inputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    outputs: [{ id: 'value', name: 'Значение', type: 'float' }],
    parameters: [{ id: 'amount', name: 'Сила', type: 'float', value: 1, min: 0, max: 5 }],
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

// ==================== NODE CATEGORIES ====================

const NODE_CATEGORIES: { id: NodeCategory; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'input', name: 'Входы', icon: <Circle className="w-4 h-4" />, color: 'blue' },
  { id: 'noise', name: 'Шум', icon: <Waves className="w-4 h-4" />, color: 'green' },
  { id: 'pattern', name: 'Паттерны', icon: <Grid3X3 className="w-4 h-4" />, color: 'purple' },
  { id: 'math', name: 'Математика', icon: <Layers className="w-4 h-4" />, color: 'yellow' },
  { id: 'color', name: 'Цвет', icon: <Palette className="w-4 h-4" />, color: 'pink' },
  { id: 'transform', name: 'Трансформ', icon: <Move className="w-4 h-4" />, color: 'cyan' },
  { id: 'filter', name: 'Фильтры', icon: <Filter className="w-4 h-4" />, color: 'orange' },
  { id: 'mask', name: 'Маски', icon: <Box className="w-4 h-4" />, color: 'red' },
  { id: 'output', name: 'Выходы', icon: <Sparkles className="w-4 h-4" />, color: 'white' },
];

// ==================== INTERFACE ====================

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

// ==================== COMPONENT ====================

export function PatternNodeEditor({ onClose, onPatternGenerated }: PatternNodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<EditorNode[]>([]);
  const [connections, setConnections] = useState<EditorConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ node: string; port: string; type: 'input' | 'output' } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodePickerPosition, setNodePickerPosition] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedCategory, setExpandedCategory] = useState<NodeCategory | null>('noise');

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add initial nodes
  useEffect(() => {
    if (nodes.length === 0) {
      const uvNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'uv-input')!,
        position: { x: 100, y: 200 },
        parameterValues: {},
      };

      const noiseNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'noise-perlin')!,
        position: { x: 350, y: 200 },
        parameterValues: { scale: 10, octaves: 4, persistence: 0.5, seed: 12345 },
      };

      const outputNode: EditorNode = {
        id: generateId(),
        definition: NODE_DEFINITIONS.find((d) => d.type === 'output-pattern')!,
        position: { x: 600, y: 200 },
        parameterValues: {},
      };

      setNodes([uvNode, noiseNode, outputNode]);

      // Connect UV to Noise
      setConnections([
        {
          id: generateId(),
          fromNode: uvNode.id,
          fromPort: 'uv',
          toNode: noiseNode.id,
          toPort: 'uv',
        },
      ]);
    }
  }, []);

  // Add node
  const addNode = useCallback(
    (definition: NodeDefinition) => {
      const newNode: EditorNode = {
        id: generateId(),
        definition,
        position: {
          x: (nodePickerPosition.x - pan.x) / zoom,
          y: (nodePickerPosition.y - pan.y) / zoom,
        },
        parameterValues: definition.parameters.reduce(
          (acc, p) => {
            acc[p.id] = p.value;
            return acc;
          },
          {} as Record<string, number | string>
        ),
      };
      setNodes((prev) => [...prev, newNode]);
      setShowNodePicker(false);
      setSelectedNode(newNode.id);
    },
    [nodePickerPosition, pan, zoom]
  );

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNode !== nodeId && c.toNode !== nodeId));
    setSelectedNode(null);
  }, []);

  // Handle node drag
  const handleNodeDrag = useCallback(
    (nodeId: string, dx: number, dy: number) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: {
                  x: n.position.x + dx / zoom,
                  y: n.position.y + dy / zoom,
                },
              }
            : n
        )
      );
    },
    [zoom]
  );

  // Update parameter
  const updateParameter = useCallback((nodeId: string, paramId: string, value: number | string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              parameterValues: { ...n.parameterValues, [paramId]: value },
            }
          : n
      )
    );
  }, []);

  // Handle connection
  const handlePortClick = useCallback(
    (nodeId: string, portId: string, isOutput: boolean) => {
      if (connectingFrom) {
        if (connectingFrom.node !== nodeId && connectingFrom.type !== (isOutput ? 'output' : 'input')) {
          const newConnection: EditorConnection = {
            id: generateId(),
            fromNode: isOutput ? nodeId : connectingFrom.node,
            fromPort: isOutput ? portId : connectingFrom.port,
            toNode: isOutput ? connectingFrom.node : nodeId,
            toPort: isOutput ? connectingFrom.port : portId,
          };

          // Remove existing connection to this input
          setConnections((prev) => [
            ...prev.filter((c) => !(c.toNode === newConnection.toNode && c.toPort === newConnection.toPort)),
            newConnection,
          ]);
        }
        setConnectingFrom(null);
      } else {
        setConnectingFrom({ node: nodeId, port: portId, type: isOutput ? 'output' : 'input' });
      }
    },
    [connectingFrom]
  );

  // Delete connection
  const deleteConnection = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, []);

  // Handle canvas right-click
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setNodePickerPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowNodePicker(true);
    }
  }, []);

  // Handle canvas pan
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [isDragging, dragStart]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.25, Math.min(2, prev * delta)));
  }, []);

  // Filtered nodes for picker
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return NODE_DEFINITIONS;
    const query = searchQuery.toLowerCase();
    return NODE_DEFINITIONS.filter(
      (n) => n.name.toLowerCase().includes(query) || n.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Get color for node category
  const getCategoryColor = (category: NodeCategory) => {
    const cat = NODE_CATEGORIES.find((c) => c.id === category);
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
    return colors[cat?.color || 'blue'] || colors.blue;
  };

  const getCategoryHeaderColor = (category: NodeCategory) => {
    const cat = NODE_CATEGORIES.find((c) => c.id === category);
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
    return colors[cat?.color || 'blue'] || colors.blue;
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Toolbar */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Node Editor</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              /* TODO: compile graph */
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3" />
            Compile
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
                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-7 pr-2 py-1.5 text-xs
                           focus:outline-none focus:border-orange-500/50"
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
                              className="w-full text-left px-2 py-1 text-[11px] text-zinc-500 hover:text-white
                                         hover:bg-zinc-800 rounded transition-colors"
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
          }}
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          onClick={() => {
            setShowNodePicker(false);
            setConnectingFrom(null);
          }}
        >
          {/* Connections SVG */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.fromNode);
              const toNode = nodes.find((n) => n.id === conn.toNode);
              if (!fromNode || !toNode) return null;

              const fromPortIndex = fromNode.definition.outputs.findIndex((p) => p.id === conn.fromPort);
              const toPortIndex = toNode.definition.inputs.findIndex((p) => p.id === conn.toPort);

              // Node width is 176px (w-44), header is 28px, port row is 24px
              const nodeWidth = 176;
              const headerHeight = 28;
              const portHeight = 24;
              const inputsCount = fromNode.definition.inputs.length;

              const x1 = fromNode.position.x + nodeWidth;
              const y1 = fromNode.position.y + headerHeight + (inputsCount > 0 ? inputsCount * portHeight : 0) + fromPortIndex * portHeight + 12;
              const x2 = toNode.position.x;
              const y2 = toNode.position.y + headerHeight + toPortIndex * portHeight + 12;

              const dx = Math.abs(x2 - x1);
              const curve = Math.max(50, dx * 0.5);

              return (
                <g key={conn.id}>
                  {/* Shadow/glow effect */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`}
                    stroke="#f9731640"
                    strokeWidth={6}
                    fill="none"
                  />
                  {/* Main connection line */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`}
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="none"
                    className="pointer-events-auto cursor-pointer hover:stroke-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConnection(conn.id);
                    }}
                  />
                  {/* End circles */}
                  <circle cx={x1} cy={y1} r={4} fill="#f97316" />
                  <circle cx={x2} cy={y2} r={4} fill="#f97316" />
                </g>
              );
            })}

            {/* Drawing connection line */}
            {connectingFrom && (
              <line
                x1={(() => {
                  const node = nodes.find(n => n.id === connectingFrom.node);
                  if (!node) return 0;
                  return connectingFrom.type === 'output'
                    ? node.position.x + 176
                    : node.position.x;
                })()}
                y1={(() => {
                  const node = nodes.find(n => n.id === connectingFrom.node);
                  if (!node) return 0;
                  const portIndex = connectingFrom.type === 'output'
                    ? node.definition.outputs.findIndex(p => p.id === connectingFrom.port)
                    : node.definition.inputs.findIndex(p => p.id === connectingFrom.port);
                  const inputsCount = node.definition.inputs.length;
                  return connectingFrom.type === 'output'
                    ? node.position.y + 28 + (inputsCount > 0 ? inputsCount * 24 : 0) + portIndex * 24 + 12
                    : node.position.y + 28 + portIndex * 24 + 12;
                })()}
                x2={(nodePickerPosition.x - pan.x) / zoom}
                y2={(nodePickerPosition.y - pan.y) / zoom}
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}
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
                onDrag={(dx, dy) => handleNodeDrag(node.id, dx, dy)}
                onDelete={() => deleteNode(node.id)}
                onPortClick={(portId, isOutput) => handlePortClick(node.id, portId, isOutput)}
                onParameterChange={(paramId, value) => updateParameter(node.id, paramId, value)}
                getCategoryColor={getCategoryColor}
                getCategoryHeaderColor={getCategoryHeaderColor}
                connectingFrom={connectingFrom}
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
                className="absolute bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden"
                style={{ left: nodePickerPosition.x, top: nodePickerPosition.y, width: 200 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск ноды..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs
                               focus:outline-none focus:border-orange-500/50"
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
          </div>

          {/* Zoom indicator */}
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
                                  : (Number(node.parameterValues[param.id] ?? param.value)).toFixed(2)}
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
  onDrag: (dx: number, dy: number) => void;
  onDelete: () => void;
  onPortClick: (portId: string, isOutput: boolean) => void;
  onParameterChange: (paramId: string, value: number | string) => void;
  getCategoryColor: (category: NodeCategory) => string;
  getCategoryHeaderColor: (category: NodeCategory) => string;
  connectingFrom: { node: string; port: string; type: 'input' | 'output' } | null;
}

function NodeComponent({
  node,
  isSelected,
  onSelect,
  onDrag,
  onDelete,
  onPortClick,
  onParameterChange,
  getCategoryColor,
  getCategoryHeaderColor,
  connectingFrom,
}: NodeComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('node-header')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      onDrag(dx, dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        onDrag(dx, dy);
        setDragStart({ x: e.clientX, y: e.clientY });
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, onDrag]);

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
          {node.definition.inputs.map((input, idx) => (
            <div key={input.id} className="relative flex items-center h-6 px-3">
              {/* Input port - positioned at left edge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPortClick(input.id, false);
                }}
                className={cn(
                  'absolute -left-2 w-4 h-4 rounded-full border-2 bg-zinc-900 z-10',
                  'hover:scale-125 hover:border-orange-500 hover:bg-orange-500/30 transition-all',
                  connectingFrom?.type === 'output' ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-500'
                )}
                title={`${input.name} (${input.type})`}
              />
              <span className="text-[10px] text-zinc-400 ml-2">{input.name}</span>
              <span className="text-[8px] text-zinc-600 ml-auto">{input.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Outputs */}
      {node.definition.outputs.length > 0 && (
        <div className="py-1">
          {node.definition.outputs.map((output, idx) => (
            <div key={output.id} className="relative flex items-center justify-end h-6 px-3">
              <span className="text-[8px] text-zinc-600 mr-auto">{output.type}</span>
              <span className="text-[10px] text-zinc-400 mr-2">{output.name}</span>
              {/* Output port - positioned at right edge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPortClick(output.id, true);
                }}
                className={cn(
                  'absolute -right-2 w-4 h-4 rounded-full border-2 bg-zinc-900 z-10',
                  'hover:scale-125 hover:border-orange-500 hover:bg-orange-500/30 transition-all',
                  connectingFrom?.type === 'input' ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-500'
                )}
                title={`${output.name} (${output.type})`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-1" />
    </div>
  );
}
