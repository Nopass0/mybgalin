'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

// Node categories and types
const NODE_CATEGORIES = [
  {
    name: 'Input',
    icon: Circle,
    nodes: [
      { type: 'color-input', name: 'Color', description: 'Solid color input' },
      { type: 'texture-input', name: 'Texture', description: 'Image texture input' },
      { type: 'gradient-input', name: 'Gradient', description: 'Gradient input' },
      { type: 'noise-input', name: 'Noise', description: 'Procedural noise' },
      { type: 'uv-input', name: 'UV', description: 'UV coordinates' },
    ],
  },
  {
    name: 'Math',
    icon: Layers,
    nodes: [
      { type: 'math-add', name: 'Add', description: 'Add values' },
      { type: 'math-subtract', name: 'Subtract', description: 'Subtract values' },
      { type: 'math-multiply', name: 'Multiply', description: 'Multiply values' },
      { type: 'math-divide', name: 'Divide', description: 'Divide values' },
      { type: 'math-lerp', name: 'Lerp', description: 'Linear interpolation' },
      { type: 'math-clamp', name: 'Clamp', description: 'Clamp values' },
      { type: 'math-remap', name: 'Remap', description: 'Remap range' },
    ],
  },
  {
    name: 'Color',
    icon: Palette,
    nodes: [
      { type: 'color-mix', name: 'Mix', description: 'Mix two colors' },
      { type: 'color-hue-shift', name: 'Hue Shift', description: 'Shift hue' },
      { type: 'color-saturation', name: 'Saturation', description: 'Adjust saturation' },
      { type: 'color-brightness', name: 'Brightness', description: 'Adjust brightness' },
      { type: 'color-contrast', name: 'Contrast', description: 'Adjust contrast' },
      { type: 'color-invert', name: 'Invert', description: 'Invert colors' },
    ],
  },
  {
    name: 'Pattern',
    icon: Grid3X3,
    nodes: [
      { type: 'pattern-checker', name: 'Checker', description: 'Checkerboard pattern' },
      { type: 'pattern-stripes', name: 'Stripes', description: 'Stripe pattern' },
      { type: 'pattern-dots', name: 'Dots', description: 'Dot pattern' },
      { type: 'pattern-grid', name: 'Grid', description: 'Grid pattern' },
      { type: 'pattern-hexagon', name: 'Hexagon', description: 'Hexagonal pattern' },
      { type: 'pattern-voronoi', name: 'Voronoi', description: 'Voronoi cells' },
      { type: 'pattern-brick', name: 'Brick', description: 'Brick pattern' },
    ],
  },
  {
    name: 'Noise',
    icon: Waves,
    nodes: [
      { type: 'noise-perlin', name: 'Perlin', description: 'Perlin noise' },
      { type: 'noise-simplex', name: 'Simplex', description: 'Simplex noise' },
      { type: 'noise-worley', name: 'Worley', description: 'Worley/Cell noise' },
      { type: 'noise-fbm', name: 'FBM', description: 'Fractal Brownian Motion' },
      { type: 'noise-turbulence', name: 'Turbulence', description: 'Turbulence noise' },
    ],
  },
  {
    name: 'Filter',
    icon: Filter,
    nodes: [
      { type: 'filter-blur', name: 'Blur', description: 'Gaussian blur' },
      { type: 'filter-sharpen', name: 'Sharpen', description: 'Sharpen filter' },
      { type: 'filter-edge-detect', name: 'Edge Detect', description: 'Edge detection' },
      { type: 'filter-emboss', name: 'Emboss', description: 'Emboss effect' },
      { type: 'filter-distort', name: 'Distort', description: 'Distortion' },
    ],
  },
  {
    name: 'Transform',
    icon: Move,
    nodes: [
      { type: 'transform-scale', name: 'Scale', description: 'Scale UVs' },
      { type: 'transform-rotate', name: 'Rotate', description: 'Rotate UVs' },
      { type: 'transform-translate', name: 'Translate', description: 'Offset UVs' },
      { type: 'transform-tile', name: 'Tile', description: 'Tile/repeat' },
    ],
  },
  {
    name: 'Output',
    icon: Sparkles,
    nodes: [
      { type: 'output-color', name: 'Color Output', description: 'Final color output' },
      { type: 'output-normal', name: 'Normal Output', description: 'Normal map output' },
      { type: 'output-metalness', name: 'Metalness Output', description: 'Metalness output' },
      { type: 'output-roughness', name: 'Roughness Output', description: 'Roughness output' },
    ],
  },
];

// Generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Create default node based on type
const createNode = (type: MaterialNodeType, position: { x: number; y: number }): MaterialNode => {
  const baseNode: MaterialNode = {
    id: generateId(),
    type,
    position,
    inputs: [],
    outputs: [],
    parameters: [],
  };

  // Configure based on type
  switch (type) {
    case 'color-input':
      baseNode.outputs = [{ id: 'out', name: 'Color', type: 'color' }];
      baseNode.parameters = [{ id: 'color', name: 'Color', type: 'color', value: '#ff6600' }];
      break;
    case 'noise-perlin':
    case 'noise-simplex':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'out', name: 'Value', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 10, min: 0.1, max: 100 },
        { id: 'octaves', name: 'Octaves', type: 'int', value: 4, min: 1, max: 8 },
        { id: 'persistence', name: 'Persistence', type: 'float', value: 0.5, min: 0, max: 1 },
      ];
      break;
    case 'color-mix':
      baseNode.inputs = [
        { id: 'a', name: 'Color A', type: 'color' },
        { id: 'b', name: 'Color B', type: 'color' },
        { id: 'fac', name: 'Factor', type: 'float' },
      ];
      baseNode.outputs = [{ id: 'out', name: 'Color', type: 'color' }];
      baseNode.parameters = [{ id: 'factor', name: 'Factor', type: 'float', value: 0.5, min: 0, max: 1 }];
      break;
    case 'pattern-checker':
      baseNode.inputs = [{ id: 'uv', name: 'UV', type: 'vector2' }];
      baseNode.outputs = [{ id: 'out', name: 'Value', type: 'float' }];
      baseNode.parameters = [
        { id: 'scale', name: 'Scale', type: 'float', value: 8, min: 1, max: 64 },
      ];
      break;
    case 'output-color':
      baseNode.inputs = [{ id: 'color', name: 'Color', type: 'color' }];
      break;
    default:
      baseNode.inputs = [{ id: 'in', name: 'Input', type: 'color' }];
      baseNode.outputs = [{ id: 'out', name: 'Output', type: 'color' }];
  }

  return baseNode;
};

interface NodeEditorProps {
  material?: SmartMaterial;
  onSave?: (material: SmartMaterial) => void;
  onClose?: () => void;
  onChange?: (material: SmartMaterial) => void;
  className?: string;
}

export function NodeEditor({ material, onSave, onClose, onChange, className }: NodeEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<MaterialNode[]>(material?.nodes || []);
  const [connections, setConnections] = useState<NodeConnection[]>(material?.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; portId: string; isOutput: boolean } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [nodePickerPosition, setNodePickerPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [materialName, setMaterialName] = useState(material?.name || 'New Material');

  // Handle node drag
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button === 0) {
      setDraggedNode(nodeId);
      setSelectedNodeId(nodeId);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
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
  }, [draggedNode, zoom]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setConnecting(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle port click for connecting
  const handlePortClick = (nodeId: string, portId: string, isOutput: boolean) => {
    if (!connecting) {
      setConnecting({ nodeId, portId, isOutput });
    } else {
      // Create connection
      if (connecting.isOutput !== isOutput) {
        const newConnection: NodeConnection = {
          id: generateId(),
          fromNodeId: isOutput ? nodeId : connecting.nodeId,
          fromPortId: isOutput ? portId : connecting.portId,
          toNodeId: isOutput ? connecting.nodeId : nodeId,
          toPortId: isOutput ? connecting.portId : portId,
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setConnecting(null);
    }
  };

  // Add node from picker
  const addNode = (type: MaterialNodeType) => {
    const newNode = createNode(type, {
      x: (nodePickerPosition.x - pan.x) / zoom,
      y: (nodePickerPosition.y - pan.y) / zoom,
    });
    setNodes(prev => [...prev, newNode]);
    setShowNodePicker(false);
    setSearchQuery('');
  };

  // Delete selected node
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setConnections(prev => prev.filter(c =>
      c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
    ));
    setSelectedNodeId(null);
  };

  // Update node parameter
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

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setNodePickerPosition({ x: e.clientX, y: e.clientY });
    setShowNodePicker(true);
  };

  // Handle save
  const handleSave = () => {
    const outputNode = nodes.find(n => n.type.startsWith('output-'));
    const materialData: SmartMaterial = {
      id: material?.id || generateId(),
      name: materialName,
      category: 'Custom',
      nodes,
      connections,
      outputNodeId: outputNode?.id || '',
    };
    onSave?.(materialData);
    onChange?.(materialData);
  };

  // Get node color based on category
  const getNodeColor = (type: MaterialNodeType) => {
    if (type.startsWith('color-')) return '#e74c3c';
    if (type.startsWith('math-')) return '#3498db';
    if (type.startsWith('pattern-')) return '#9b59b6';
    if (type.startsWith('noise-')) return '#2ecc71';
    if (type.startsWith('filter-')) return '#f1c40f';
    if (type.startsWith('transform-')) return '#e67e22';
    if (type.startsWith('output-')) return '#1abc9c';
    return '#95a5a6';
  };

  // Get port position for drawing connections
  const getPortPosition = (nodeId: string, portId: string, isOutput: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const ports = isOutput ? node.outputs : node.inputs;
    const portIndex = ports.findIndex(p => p.id === portId);

    return {
      x: node.position.x + (isOutput ? 200 : 0),
      y: node.position.y + 40 + portIndex * 24,
    };
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className={cn('bg-[#0a0a0b] flex relative', className)}>
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#121214] border-b border-white/10 flex items-center justify-between px-4 z-10">
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
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={deleteSelectedNode} disabled={!selectedNodeId}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Play className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 mt-12 relative overflow-hidden"
        onContextMenu={handleContextMenu}
        style={{ cursor: draggedNode ? 'grabbing' : 'default' }}
      >
        {/* Grid background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
              <path
                d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" transform={`translate(${pan.x % (20 * zoom)}, ${pan.y % (20 * zoom)})`} />
        </svg>

        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          {connections.map(conn => {
            const from = getPortPosition(conn.fromNodeId, conn.fromPortId, true);
            const to = getPortPosition(conn.toNodeId, conn.toPortId, false);
            const midX = (from.x + to.x) / 2;

            return (
              <path
                key={conn.id}
                d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                fill="none"
                stroke="#ff6600"
                strokeWidth={2}
                opacity={0.8}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute w-[200px] bg-[#1a1a1c] rounded-lg border-2 ${
                selectedNodeId === node.id ? 'border-orange-500' : 'border-white/10'
              } shadow-xl`}
              style={{ left: node.position.x, top: node.position.y }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {/* Node header */}
              <div
                className="px-3 py-2 rounded-t-lg text-white text-sm font-medium"
                style={{ backgroundColor: getNodeColor(node.type) }}
              >
                {node.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </div>

              {/* Ports and parameters */}
              <div className="p-2">
                {/* Input ports */}
                {node.inputs.map((port, i) => (
                  <div key={port.id} className="flex items-center gap-2 py-1">
                    <div
                      className={`w-3 h-3 rounded-full border-2 cursor-pointer ${
                        connecting?.nodeId === node.id && connecting?.portId === port.id
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-transparent border-white/40 hover:border-orange-400'
                      }`}
                      style={{ marginLeft: -8 }}
                      onClick={() => handlePortClick(node.id, port.id, false)}
                    />
                    <span className="text-xs text-white/60">{port.name}</span>
                  </div>
                ))}

                {/* Parameters */}
                {node.parameters.map(param => (
                  <div key={param.id} className="py-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">{param.name}</span>
                      {param.type === 'float' && (
                        <span className="text-[10px] text-white/60">
                          {(param.value as number).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {param.type === 'color' && (
                      <input
                        type="color"
                        value={param.value as string}
                        onChange={(e) => updateNodeParameter(node.id, param.id, e.target.value)}
                        className="w-full h-6 rounded cursor-pointer"
                      />
                    )}
                    {param.type === 'float' && (
                      <Slider
                        value={[param.value as number]}
                        onValueChange={([v]) => updateNodeParameter(node.id, param.id, v)}
                        min={param.min || 0}
                        max={param.max || 1}
                        step={0.01}
                      />
                    )}
                    {param.type === 'int' && (
                      <Slider
                        value={[param.value as number]}
                        onValueChange={([v]) => updateNodeParameter(node.id, param.id, Math.round(v))}
                        min={param.min || 0}
                        max={param.max || 10}
                        step={1}
                      />
                    )}
                  </div>
                ))}

                {/* Output ports */}
                {node.outputs.map((port, i) => (
                  <div key={port.id} className="flex items-center justify-end gap-2 py-1">
                    <span className="text-xs text-white/60">{port.name}</span>
                    <div
                      className={`w-3 h-3 rounded-full border-2 cursor-pointer ${
                        connecting?.nodeId === node.id && connecting?.portId === port.id
                          ? 'bg-orange-500 border-orange-500'
                          : 'bg-transparent border-white/40 hover:border-orange-400'
                      }`}
                      style={{ marginRight: -8 }}
                      onClick={() => handlePortClick(node.id, port.id, true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Picker */}
      {showNodePicker && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bg-[#1a1a1c] border border-white/10 rounded-lg shadow-2xl w-72 max-h-96 overflow-hidden"
          style={{ left: nodePickerPosition.x, top: nodePickerPosition.y }}
        >
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
          <ScrollArea className="h-72">
            <div className="p-1">
              {NODE_CATEGORIES.map(category => {
                const filteredNodes = category.nodes.filter(n =>
                  n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.description.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filteredNodes.length === 0) return null;

                return (
                  <div key={category.name} className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-white/40 uppercase tracking-wider">
                      <category.icon className="w-3 h-3" />
                      {category.name}
                    </div>
                    {filteredNodes.map(node => (
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
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>
      )}

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-72 mt-12 bg-[#121214] border-l border-white/10 overflow-auto">
          <div className="p-3 border-b border-white/10">
            <h3 className="text-sm font-medium text-white">
              {selectedNode.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </h3>
          </div>
          <div className="p-3 space-y-4">
            {selectedNode.parameters.map(param => (
              <div key={param.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/40 uppercase tracking-wider">
                    {param.name}
                  </label>
                  {(param.type === 'float' || param.type === 'int') && (
                    <span className="text-[10px] text-white/60">
                      {param.type === 'float'
                        ? (param.value as number).toFixed(2)
                        : param.value as number
                      }
                    </span>
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
                {param.type === 'bool' && (
                  <Button
                    variant={param.value ? 'default' : 'ghost'}
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
  );
}
